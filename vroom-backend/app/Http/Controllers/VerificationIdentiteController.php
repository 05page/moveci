<?php

namespace App\Http\Controllers;

use App\Models\LogModeration;
use App\Models\Notifications;
use App\Models\User;
use App\Models\VerificationIdentite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class VerificationIdentiteController extends Controller
{
    /** Le disque privé : hors storage/app/public, donc jamais servi par le serveur web. */
    private const DISQUE = 'local';

    /**
     * POST /api/verification-identite — le vendeur envoie la photo de sa pièce.
     */
    public function store(Request $request): JsonResponse
    {
        // Validée hors du try/catch : une ValidationException doit remonter en 422,
        // pas être avalée par le catch(\Exception) et transformée en 500.
        $valide = $request->validate([
            'type_piece'  => 'required|in:cni,passeport',
            'photo_piece' => 'required|image|mimes:jpeg,png,jpg|max:4096',
        ]);

        $user = $request->user();

        if ($user->role !== User::VENDEUR) {
            return response()->json([
                'success' => false,
                'message' => "Seuls les vendeurs particuliers doivent fournir une pièce d'identité.",
            ], 403);
        }

        if ($user->identite_verifiee_le !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Votre identité est déjà vérifiée.',
            ], 422);
        }

        $enCours = VerificationIdentite::where('user_id', $user->id)
            ->where('statut', VerificationIdentite::STATUT_EN_ATTENTE)
            ->exists();

        if ($enCours) {
            return response()->json([
                'success' => false,
                'message' => 'Une demande est déjà en cours d\'examen. Vous serez notifié sous 48 h.',
            ], 422);
        }

        // Écrit AVANT la transaction : le disque n'est pas transactionnel, il faut
        // donc pouvoir nettoyer nous-mêmes si l'insert échoue derrière.
        $chemin = $request->file('photo_piece')->store('identites', self::DISQUE);

        try {
            DB::beginTransaction();

            $verification = VerificationIdentite::create([
                'user_id'     => $user->id,
                'type_piece'  => $valide['type_piece'],
                'photo_piece' => $chemin,
                'statut'      => VerificationIdentite::STATUT_EN_ATTENTE,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pièce reçue. Elle sera examinée sous 48 h ouvrées.',
                'data'    => $verification,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            // Sans ce delete, un échec d'insert laisse une pièce d'identité
            // orpheline sur le disque, que plus rien ne référence.
            Storage::disk(self::DISQUE)->delete($chemin);

            return $this->serverError($e, "Erreur lors de l'envoi de votre pièce. Réessayez dans quelques instants.");
        }
    }

    /**
     * GET /api/verification-identite/moi — l'état de MA demande.
     */
    public function mienne(Request $request): JsonResponse
    {
        $user = $request->user();

        // latest() et non get() : après un rejet suivi d'un nouveau dépôt,
        // seule la demande la plus récente décrit l'état courant.
        $verification = VerificationIdentite::where('user_id', $user->id)
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'verification'         => $verification,
                'identite_verifiee_le' => $user->identite_verifiee_le,
            ],
        ], 200);
    }

    /**
     * GET /api/admin/verifications-identite — la file d'attente de modération.
     */
    public function index(Request $request): JsonResponse
    {
        $valide = $request->validate([
            'statut' => 'sometimes|in:en_attente,validee,rejetee',
        ]);

        $verifications = VerificationIdentite::query()
            ->where('statut', $valide['statut'] ?? VerificationIdentite::STATUT_EN_ATTENTE)
            // L'admin recoupe le nom du compte avec celui lu sur la photo ; sans ce
            // with, chaque ligne déclencherait sa propre requête utilisateur (N+1).
            ->with('user:id,fullname,email,telephone,role')
            ->orderBy('created_at', 'asc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $verifications], 200);
    }

    /**
     * GET /api/admin/verifications-identite/{id}/photo — sert l'image à l'admin.
     */
    public function photo(string $id)
    {
        $verification = VerificationIdentite::findOrFail($id);

        // Storage::disk() est typé Filesystem (l'interface), qui ne déclare pas
        // response(). Cette annotation dit à l'IDE ce que la fabrique rend vraiment.
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disque */
        $disque = Storage::disk(self::DISQUE);

        if (!$disque->exists($verification->photo_piece)) {
            return response()->json([
                'success' => false,
                'message' => 'Le fichier a été supprimé après traitement de la demande.',
            ], 404);
        }

        // Qui a regardé la pièce de qui, et quand : c'est la première chose
        // qu'un contrôle de conformité demandera.
        $this->journaliser('VIEW_IDENTITY_DOCUMENT', $verification->id, "Consultation de la pièce de {$verification->user_id}");

        // ->response() fait streamer le fichier par PHP : il n'est jamais exposé
        // par le serveur web, contrairement à une URL sur le disque public.
        // no-store empêche l'image de rester dans le cache disque du navigateur.
        return $disque->response(
            $verification->photo_piece,
            null,
            ['Cache-Control' => 'no-store, no-cache, must-revalidate']
        );
    }

    /**
     * POST /api/admin/verifications-identite/{id}/valider
     */
    public function valider(Request $request, string $id): JsonResponse
    {
        $verification = VerificationIdentite::findOrFail($id);

        if ($verification->statut !== VerificationIdentite::STATUT_EN_ATTENTE) {
            return response()->json([
                'success' => false,
                'message' => "Cette demande a déjà été traitée.",
            ], 422);
        }

        try {
            DB::beginTransaction();

            $verification->update([
                'statut'      => VerificationIdentite::STATUT_VALIDEE,
                'motif_rejet' => null,
                'verifie_par' => $request->user()->id,
                'verifie_le'  => now(),
            ]);

            // Les deux écritures vont ensemble : une demande validée sans ce champ
            // laisserait le vendeur bloqué à la publication sans qu'il comprenne.
            $verification->user->update(['identite_verifiee_le' => now()]);

            Notifications::create([
                'user_id'    => $verification->user_id,
                'type'       => Notifications::TYPE_MODERATION,
                'level'      => 'success',
                'title'      => 'Votre identité est vérifiée',
                'message'    => 'Vous pouvez désormais publier vos annonces sur Move CI.',
                'data'       => ['verification_id' => $verification->id],
                'lu'         => false,
                'date_envoi' => now(),
            ]);

            DB::commit();

            // Hors transaction : une suppression de fichier ne se rollback pas.
            // Le compte est vérifié, l'image n'a plus d'utilité — seule la trace compte.
            Storage::disk(self::DISQUE)->delete($verification->photo_piece);

            $this->journaliser('VALIDATE_IDENTITY', $verification->id, "Identité validée pour {$verification->user_id}");

            return response()->json(['success' => true, 'message' => 'Identité validée'], 200);
        } catch (\Exception $e) {
            DB::rollBack();

            return $this->serverError($e, 'Erreur lors de la validation. Réessayez dans quelques instants.');
        }
    }

    /**
     * POST /api/admin/verifications-identite/{id}/rejeter
     */
    public function rejeter(Request $request, string $id): JsonResponse
    {
        // Même exigence que rejeterVehicule : un rejet sans motif est ingérable
        // côté support, et le vendeur ne sait pas quoi corriger.
        $valide = $request->validate([
            'motif_rejet' => 'required|string|max:500',
        ]);

        $verification = VerificationIdentite::findOrFail($id);

        if ($verification->statut !== VerificationIdentite::STATUT_EN_ATTENTE) {
            return response()->json([
                'success' => false,
                'message' => 'Cette demande a déjà été traitée.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            // identite_verifiee_le n'est pas touché : il vaut déjà null.
            $verification->update([
                'statut'      => VerificationIdentite::STATUT_REJETEE,
                'motif_rejet' => $valide['motif_rejet'],
                'verifie_par' => $request->user()->id,
                'verifie_le'  => now(),
            ]);

            Notifications::create([
                'user_id'    => $verification->user_id,
                'type'       => Notifications::TYPE_MODERATION,
                'level'      => 'warning',
                'title'      => "Votre pièce d'identité a été refusée",
                'message'    => $valide['motif_rejet'] . ' Vous pouvez envoyer une nouvelle photo.',
                'data'       => ['verification_id' => $verification->id],
                'lu'         => false,
                'date_envoi' => now(),
            ]);

            DB::commit();

            // Une pièce refusée n'a aucune raison de rester sur le disque.
            Storage::disk(self::DISQUE)->delete($verification->photo_piece);

            $this->journaliser('REJECT_IDENTITY', $verification->id, $valide['motif_rejet']);

            return response()->json(['success' => true, 'message' => 'Demande rejetée'], 200);
        } catch (\Exception $e) {
            DB::rollBack();

            return $this->serverError($e, 'Erreur lors du rejet. Réessayez dans quelques instants.');
        }
    }

    /** Écrit une ligne dans le journal d'audit, comme AdminController::logAction. */
    private function journaliser(string $action, string $idCible, ?string $details): void
    {
        LogModeration::create([
            'admin_id'   => Auth::id(),
            'action'     => $action,
            'cible_type' => 'verification_identite',
            'id_cible'   => $idCible,
            'details'    => $details,
        ]);
    }
}
