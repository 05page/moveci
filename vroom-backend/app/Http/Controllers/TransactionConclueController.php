<?php

namespace App\Http\Controllers;

use App\Models\Notifications;
use App\Models\RendezVous;
use App\Models\Signalement;
use App\Models\TransactionConclue;
use App\Models\User;
use App\Models\Vehicules;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TransactionConclueController extends Controller
{

    public function confirmerClient(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();

        $transaction = TransactionConclue::where('id', $id)
            ->where('client_id', $user->id)
            ->where('statut', TransactionConclue::STATUT_EN_ATTENTE)
            ->firstOrFail();

        if (!$transaction->isCodeValide()) {
            $transaction->update(['statut' => TransactionConclue::STATUT_EXPIRE]);
            return response()->json(['success' => false, 'message' => 'Le code a expiré'], 422);
        }

        $validated = $request->validate([
            'code' => 'required|string|size:6',
            'date_debut_location' => 'required_if:type,location|nullable|date',
            'date_fin_location'  => 'required_if:type,location|nullable|date|after:date_debut_location',
        ]);

        if ($validated['code'] !== $transaction->code_confirmation) {
            return response()->json(['success' => false, 'message' => 'Code incorrect'], 422);
        }

        DB::beginTransaction();
        try {
            $updateData = [
                'confirme_par_client'  => true,
                'confirme_par_vendeur' => true,
            ];

            // Sauvegarde les dates fournies par le client pour une location
            if ($transaction->type === 'location') {
                $updateData['date_debut_location'] = $validated['date_debut_location'] ?? null;
                $updateData['date_fin_location']   = $validated['date_fin_location'] ?? null;
            }

            $transaction->update($updateData);
            $this->finaliser($transaction);

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Confirmation enregistrée',
                'data'    => $transaction->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, 'Erreur lors de la confirmation client. Réessayez dans quelques instants.');
        }
    }

    /**
     * Client refuse la transaction.
     * POST /transactions-conclues/{id}/refuser
     */
    public function refuserClient(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();

        $transaction = TransactionConclue::where('id', $id)
            ->where('client_id', $user->id)
            ->where('statut', TransactionConclue::STATUT_EN_ATTENTE)
            ->firstOrFail();

        $motif = $request->validate(['motif' => 'nullable|string|max:500'])['motif'] ?? null;

        $transaction->update(['statut' => TransactionConclue::STATUT_REFUSE]);

        // Déverrouille le véhicule — le client a refusé, deal annulé
        Vehicules::where('id', $transaction->vehicule_id)
            ->update(['statut' => Vehicules::STATUS_DISPONIBLE]);

        $message = $transaction->client->fullname . ' a refusé de confirmer la transaction. Votre annonce est de nouveau disponible.';
        if ($motif) {
            $message .= ' Motif : ' . $motif;
        }

        Notifications::create([
            'user_id'    => $transaction->vendeur_id,
            'type'       => Notifications::TYPE_TRANSACTION,
            'level'      => 'error',
            'title'      => 'Transaction refusée par le client',
            'message'    => $message,
            'data'       => ['transaction_id' => $transaction->id],
            'date_envoi' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Transaction refusée']);
    }

    /**
     * Vendeur refuse explicitement de confirmer la transaction.
     * POST /transactions-conclues/{id}/refuser-vendeur
     *
     * Conséquences :
     *  - Transaction → statut refusé
     *  - Véhicule → disponible (déverrouillé)
     *  - Signalement automatique créé sur le vendeur (visible admin)
     *  - Client notifié
     */
    public function refuserVendeur(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();

        $transaction = TransactionConclue::where('id', $id)
            ->where('vendeur_id', $user->id)
            ->where('statut', TransactionConclue::STATUT_EN_ATTENTE)
            ->firstOrFail();

        $motif = $request->validate(['motif' => 'nullable|string|max:500'])['motif'] ?? null;

        DB::beginTransaction();
        try {
            $transaction->update(['statut' => TransactionConclue::STATUT_REFUSE]);

            // Déverrouille le véhicule
            Vehicules::where('id', $transaction->vehicule_id)
                ->update(['statut' => Vehicules::STATUS_DISPONIBLE]);

            // Signalement automatique sur le vendeur — visible par l'admin
            Signalement::create([
                'client_id'        => null, // signalement système, pas un utilisateur
                'cible_user_id'    => $user->id,
                'motif'            => 'transaction_non_confirmee',
                'description'      => 'Le vendeur ' . $user->fullname . ' a refusé de confirmer une transaction (transaction #' . $transaction->id . '). Le véhicule est revenu disponible sans être marqué comme vendu.',
                'statut'           => Signalement::STATUT_EN_ATTENTE,
                'date_signalement' => now(),
            ]);

            // Notifie le client
            $message = 'Le vendeur a refusé de confirmer la transaction. Si vous avez effectué un paiement, contactez le support.';
            if ($motif) {
                $message .= ' Motif : ' . $motif;
            }

            Notifications::create([
                'user_id'    => $transaction->client_id,
                'type'       => Notifications::TYPE_TRANSACTION,
                'level'      => 'error',
                'title'      => 'Transaction annulée par le vendeur',
                'message'    => $message,
                'data'       => ['transaction_id' => $transaction->id],
                'date_envoi' => now(),
            ]);

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Transaction refusée']);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, 'Erreur lors du refus de la transaction. Réessayez dans quelques instants.');
        }
    }

    /**
     * Retourne les transactions en attente du client connecté.
     * GET /transactions-conclues/mes-demandes
     */
    public function mesDemandes(): JsonResponse
    {
        $user = Auth::user();

        $transactions = TransactionConclue::with([
            'vendeur:id,fullname,avatar',
            'vehicule.description',
            'vehicule.photos',
        ])
            ->where('client_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Le client ne doit jamais lire le code dans la réponse elle-même — sinon la
        // présence exigée par le scan QR (voir CarteTransaction.tsx) ne sert à rien,
        // le code serait visible dans l'onglet réseau sans même passer par une notif.
        // C'est le VENDEUR qui détient le code ici (l'inverse de la première version) :
        // le client doit scanner le QR du vendeur pour l'obtenir.
        $transactions->each->makeHidden(['code_confirmation', 'code_restitution']);

        return response()->json(['success' => true, 'data' => $transactions]);
    }

    /**
     * Retourne les transactions du vendeur connecté.
     * GET /transactions-conclues/mes-transactions
     */
    public function mesTransactions(): JsonResponse
    {
        $user = Auth::user();

        $transactions = TransactionConclue::with([
            'client:id,fullname,avatar',
            'vehicule.description',
            'vehicule.photos',
        ])
            ->where('vendeur_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $transactions]);
    }

    /**
     * Client scanne le QR de restitution du vendeur et confirme — finalise seul la
     * restitution (même principe que confirmerClient(), plus de second clic vendeur).
     * POST /transactions-conclues/{id}/restituer-client
     *
     * `code_restitution` est généré par la commande planifiée transactions:generer-codes-restitution
     * à l'approche de date_fin_location — tant qu'elle n'est pas encore passée, cette route ne trouve
     * aucune transaction éligible (le champ est encore null).
     */
    public function restituerClient(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();

        $transaction = TransactionConclue::where('id', $id)
            ->where('client_id', $user->id)
            ->where('type', 'location')
            ->where('statut', TransactionConclue::STATUT_CONFIRME)
            ->where('restitue_par_client', false)
            ->firstOrFail();

        if (!$transaction->code_restitution) {
            return response()->json([
                'success' => false,
                'message' => 'La restitution n\'est pas encore ouverte pour cette location.',
            ], 422);
        }

        if (!$transaction->isCodeRestitutionValide()) {
            return response()->json(['success' => false, 'message' => 'Le code a expiré'], 422);
        }

        $validated = $request->validate(['code' => 'required|string|size:6']);

        if ($validated['code'] !== $transaction->code_restitution) {
            return response()->json(['success' => false, 'message' => 'Code incorrect'], 422);
        }

        DB::beginTransaction();
        try {
            $transaction->update([
                'restitue_par_client'  => true,
                'restitue_par_vendeur' => true,
            ]);
            $this->finaliserRestitution($transaction);

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Restitution confirmée',
                'data'    => $transaction->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, 'Erreur lors de la confirmation de restitution. Réessayez dans quelques instants.');
        }
    }

    /**
     * Finalise la restitution une fois les deux confirmations reçues : redonne le véhicule
     * disponible (il était `loué` depuis finaliser()) et notifie les deux parties.
     * N'y touche PAS à `statut` de la transaction — le deal reste `confirmé`, la restitution
     * n'est qu'un détail de suivi supplémentaire pour une location.
     */
    private function finaliserRestitution(TransactionConclue $transaction): void
    {
        Vehicules::where('id', $transaction->vehicule_id)
            ->update(['statut' => Vehicules::STATUS_DISPONIBLE]);

        foreach ([$transaction->vendeur_id, $transaction->client_id] as $userId) {
            Notifications::create([
                'user_id'    => $userId,
                'type'       => Notifications::TYPE_TRANSACTION,
                'level'      => 'success',
                'title'      => 'Restitution confirmée ✓',
                'message'    => 'Le véhicule loué a été restitué avec succès des deux côtés.',
                'data'       => ['transaction_id' => $transaction->id],
                'date_envoi' => now(),
            ]);
        }
    }

    /**
     * Finalise la transaction une fois les deux confirmations reçues.
     * Méthode privée appelée après chaque confirmation.
     */
    private function finaliser(TransactionConclue $transaction): void
    {
        $transaction->update(['statut' => TransactionConclue::STATUT_CONFIRME]);

        // Met à jour le statut du véhicule
        $nouveauStatut = $transaction->type === 'vente'
            ? Vehicules::STATUS_VENDU
            : Vehicules::STATUS_LOUE;

        Vehicules::where('id', $transaction->vehicule_id)
            ->update(['statut' => $nouveauStatut]);

        // Notifie vendeur et client
        $messageVendeur = $transaction->type === 'vente'
            ? 'Vente confirmée ! Le véhicule est marqué comme vendu.'
            : 'Location confirmée ! Le véhicule est marqué comme loué.';

        $messageClient = $transaction->type === 'vente'
            ? 'Votre achat a été confirmé avec succès.'
            : 'Votre location a été confirmée avec succès.';

        foreach (
            [
                [$transaction->vendeur_id, $messageVendeur],
                [$transaction->client_id,  $messageClient],
            ] as [$userId, $message]
        ) {
            Notifications::create([
                'user_id'    => $userId,
                'type'       => Notifications::TYPE_TRANSACTION,
                'level'      => 'success',
                'title'      => 'Transaction confirmée ✓',
                'message'    => $message,
                'data'       => ['transaction_id' => $transaction->id],
                'date_envoi' => now(),
            ]);
        }
    }
}
