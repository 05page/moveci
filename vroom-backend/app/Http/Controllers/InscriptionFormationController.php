<?php

namespace App\Http\Controllers;

use App\Events\DataRefresh;
use App\Models\Formation;
use App\Models\InscriptionFormation;
use App\Models\Notifications;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InscriptionFormationController extends Controller
{
    /**
     * Client s'inscrit à une formation.
     * POST /formations/{id}/inscrire
     */
    public function store(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();

        $formation = Formation::where('statut_validation', Formation::STATUT_VALIDE)
            ->findOrFail($id);

        // Empêche l'auto-école de s'inscrire à sa propre formation
        if ($formation->auto_ecole_id === $user->id) {
            return response()->json(['success' => false, 'message' => 'Action non autorisée'], 403);
        }

        // Vérifie si une inscription active existe déjà
        $existante = InscriptionFormation::where('client_id', $user->id)
            ->where('formation_id', $id)
            ->first();

        if ($existante) {
            return response()->json(['success' => false, 'message' => 'Vous êtes déjà inscrit à cette formation'], 422);
        }

        // Vérifie si une inscription soft-deletée existe (annulation précédente)
        // Dans ce cas on la restaure plutôt que d'en créer une nouvelle (contrainte unique)
        $supprimee = InscriptionFormation::withTrashed()
            ->where('client_id', $user->id)
            ->where('formation_id', $id)
            ->whereNotNull('deleted_at')
            ->first();

        if ($supprimee) {
            $supprimee->restore();
            $supprimee->update(['statut_eleve' => InscriptionFormation::STATUT_PREINSCRIT]);
            $inscription = $supprimee->fresh();
        } else {
            try {
                $inscription = InscriptionFormation::create([
                    'client_id'    => $user->id,
                    'formation_id' => $id,
                    'statut_eleve' => InscriptionFormation::STATUT_PREINSCRIT,
                ]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                // Race condition : deux requêtes simultanées ont toutes les deux passé
                // le check $existante avant qu'une insertion soit faite → on retourne
                // proprement "déjà inscrit" sans laisser remonter l'erreur PostgreSQL.
                return response()->json(['success' => false, 'message' => 'Vous êtes déjà inscrit à cette formation'], 422);
            }
        }

        // Notifie l'auto-école de la nouvelle préinscription
        Notifications::create([
            'user_id'    => $formation->auto_ecole_id,
            'type'       => Notifications::TYPE_FORMATION,
            'level'      => 'info',
            'title'      => 'Nouvelle préinscription',
            'message'    => $user->fullname . ' vient de se préinscrire à votre formation ' . ($formation->description->titre ?? 'Permis ' . $formation->type_permis),
            'data'       => ['inscription_id' => $inscription->id, 'formation_id' => $id],
            'date_envoi' => now(),
        ]);

        // Temps réel — l'auto-école voit la nouvelle préinscription sans F5
        event(new DataRefresh($formation->auto_ecole_id, 'formation'));

        return response()->json([
            'success' => true,
            'message' => 'Préinscription confirmée',
            'data'    => $inscription,
        ], 201);
    }

    /**
     * Client consulte ses inscriptions.
     * GET /formations/mes-inscriptions
     */
    public function mesInscriptions(): JsonResponse
    {
        $user = Auth::user();

        $inscriptions = InscriptionFormation::with([
            'formation.description',
            'formation.autoEcole:id,fullname,avatar,taux_reussite',
        ])
            ->where('client_id', $user->id)
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $inscriptions]);
    }

    /**
     * Client annule son inscription (uniquement si statut = inscrit).
     * DELETE /formations/{id}/inscrire
     */
    public function destroy(string $id): JsonResponse
    {
        $user = Auth::user();

        $inscription = InscriptionFormation::where('client_id', $user->id)
            ->where('formation_id', $id)
            ->firstOrFail();

        // Annulation bloquée dès que l'auto-école a commencé à traiter le dossier
        if ($inscription->annulationBloquee()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'annuler : votre dossier est déjà en cours de traitement par l\'auto-école.',
            ], 422);
        }

        // Charge la formation avant suppression pour pouvoir notifier l'auto-école
        $formation = Formation::with('description')->find($id);

        $inscription->delete();

        // Notifie l'auto-école de l'annulation de préinscription
        if ($formation) {
            Notifications::create([
                'user_id'    => $formation->auto_ecole_id,
                'type'       => Notifications::TYPE_FORMATION,
                'level'      => 'error',
                'title'      => 'Préinscription annulée',
                'message'    => $user->fullname . ' a annulé sa préinscription à "' .
                                ($formation->description->titre ?? 'Permis ' . $formation->type_permis) . '".',
                'data'       => ['formation_id' => $id],
                'date_envoi' => now(),
            ]);
        }

        // Temps réel — l'auto-école voit l'annulation sans F5
        if ($formation) {
            event(new DataRefresh($formation->auto_ecole_id, 'formation'));
        }

        return response()->json(['success' => true, 'message' => 'Préinscription annulée']);
    }
}
