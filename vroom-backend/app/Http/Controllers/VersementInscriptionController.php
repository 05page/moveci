<?php

namespace App\Http\Controllers;

use App\Events\DataRefresh;
use App\Models\Formation;
use App\Models\InscriptionFormation;
use App\Models\Notifications;
use App\Models\VersementInscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VersementInscriptionController extends Controller
{
    /**
     * Liste les versements d'une inscription + montant total payé.
     * GET /formations/{formationId}/inscrits/{inscriptionId}/versements
     */
    public function index(string $formationId, string $inscriptionId): JsonResponse
    {
        $user = Auth::user();

        // Vérifie que la formation appartient à cette auto-école
        $formation = Formation::where('id', $formationId)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail();

        $inscription = InscriptionFormation::where('id', $inscriptionId)
            ->where('formation_id', $formationId)
            ->with('versements')
            ->firstOrFail();

        return response()->json([
            'success'       => true,
            'data'          => [
                'versements'    => $inscription->versements()->orderBy('date_versement', 'desc')->get(),
                'montant_paye'  => $inscription->montant_paye,
                'montant_total' => (float) $formation->prix,
                'reste_a_payer' => max(0, (float) $formation->prix - $inscription->montant_paye),
            ],
        ]);
    }

    /**
     * Enregistre un nouveau versement pour une inscription.
     * POST /formations/{formationId}/inscrits/{inscriptionId}/versements
     */
    public function store(Request $request, string $formationId, string $inscriptionId): JsonResponse
    {
        $user = Auth::user();

        $formation = Formation::where('id', $formationId)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail();

        $inscription = InscriptionFormation::where('id', $inscriptionId)
            ->where('formation_id', $formationId)
            ->firstOrFail();

        $validated = $request->validate([
            'montant'        => 'required|numeric|min:1',
            'date_versement' => 'nullable|date',
            'note'           => 'nullable|string|max:255',
        ]);

        // Vérifie que le total ne dépasse pas le prix de la formation
        $dejaVerseé  = $inscription->montant_paye;
        $montantTotal = (float) $formation->prix;
        $reste        = $montantTotal - $dejaVerseé;

        if ($validated['montant'] > $reste) {
            return response()->json([
                'success' => false,
                'message' => 'Ce versement dépasse le montant restant à payer (' . number_format($reste, 0, ',', ' ') . ' FCFA).',
            ], 422);
        }

        $versement = VersementInscription::create([
            'inscription_id' => $inscription->id,
            'montant'        => $validated['montant'],
            'date_versement' => $validated['date_versement'] ?? now()->toDateString(),
            'note'           => $validated['note'] ?? null,
        ]);

        $montantPaye  = $inscription->fresh()->montant_paye;
        $montantTotal = (float) $formation->prix;

        // Notifie le client du versement enregistré
        Notifications::create([
            'user_id'    => $inscription->client_id,
            'type'       => Notifications::TYPE_FORMATION,
            'level'      => 'info',
            'title'      => 'Versement enregistré',
            'message'    => 'Un versement de ' . number_format($validated['montant'], 0, ',', ' ') . ' FCFA a été enregistré pour votre formation. Total payé : ' . number_format($montantPaye, 0, ',', ' ') . ' / ' . number_format($montantTotal, 0, ',', ' ') . ' FCFA.',
            'data'       => ['inscription_id' => $inscription->id, 'formation_id' => $formationId],
            'date_envoi' => now(),
        ]);

        // Temps réel — le client voit le nouveau versement sans F5
        event(new DataRefresh($inscription->client_id, 'formation'));

        return response()->json([
            'success'      => true,
            'data'         => [
                'versement'    => $versement,
                'montant_paye' => $montantPaye,
                'reste'        => max(0, $montantTotal - $montantPaye),
            ],
        ], 201);
    }

    /**
     * Supprime un versement.
     * DELETE /formations/{formationId}/inscrits/{inscriptionId}/versements/{versementId}
     */
    public function destroy(string $formationId, string $inscriptionId, string $versementId): JsonResponse
    {
        $user = Auth::user();

        Formation::where('id', $formationId)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail();

        $versement = VersementInscription::where('id', $versementId)
            ->where('inscription_id', $inscriptionId)
            ->with('inscription:id,client_id')
            ->firstOrFail();

        $clientId = $versement->inscription->client_id;

        $versement->delete();

        // Temps réel — le client voit la suppression du versement sans F5
        event(new DataRefresh($clientId, 'formation'));

        return response()->json(['success' => true, 'message' => 'Versement supprimé']);
    }
}
