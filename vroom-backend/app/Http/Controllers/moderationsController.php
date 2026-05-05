<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Interactions;
use App\Models\Moderations;
use App\Models\Notifications;
use App\Models\User;
use App\Models\Vehicules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class moderationsController extends Controller
{
    //
    public function getAllModerations(): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }
            $moderations = Moderations::with([
                'moderator:id,fullname,email',
                'moderatable'
            ])->where('status', 'en_cours')
                ->orderBy('created_at', 'desc')
                ->paginate(15);
            // Statistiques
            $stats = [
                'total' => Moderations::count(),
                'en_cours' => Moderations::enCours()->count(),
                'decision_finale' => Moderations::decisionFinale()->count(),
                'par_action' => [
                    'validation' => Moderations::actionValidation()->count(),
                    'retrait' => Moderations::actionRetrait()->count(),
                    'rejet' => Moderations::actionRejet()->count(),
                    'suspension' => Moderations::actionSuspension()->count(),
                    'bannissement' => Moderations::actionBanissement()->count(),
                ]
            ];

            $moderations->each(function ($moderation) {
                if ($moderation->moderable_type === Vehicules::class) {
                    $moderation->alertes_associes = Interactions::where('post_id', $moderation->moderable_id)
                        ->where('type', 'alerte')->where('status_alerte', Interactions::STATUT_EN_ATTENTE)
                        ->with('user:id,fullname,email')
                        ->get();
                }
            });

            if (count($stats['par_action']) === 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Aucun véhicule trouvé',
                    'data' => [],
                ], 200);
            }

            if ($moderations->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => "Aucune modération trouvée",
                    'data' => []
                ], 200);
            }
            return response()->json([
                'success' => true,
                'data' => $moderations->items(),
                'stats' => $stats,
                'total' => $moderations->count(),
                'pagination' => [
                    'total' => $moderations->total(),
                    'current_page' => $moderations->currentPage(),
                    'last_page' => $moderations->lastPage(),
                    'per_page' => $moderations->perPage(),
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des modérations',
            ], 500);
        }
    }

    public function getDetailModeration($id): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }

            $moderation = Moderations::with([
                'moderator:id,fullname,email',
                'moderatable'
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $moderation
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des modérations',
            ], 500);
        }
    }

    public function suspendrePost(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }

            $data = $request->validate([
                'moderation_id' => 'required|exists:moderations,id',
                'motif' => 'nullable|string',
                'description' => 'nullable|string',
                'expire_at' => 'nullable|date|after:now'
            ]);

            DB::beginTransaction();
            $moderation = Moderations::with('moderatable')->findOrFail($data['moderation_id']);
            if ($moderation->moderatable_type !== Vehicules::class) {
                return response()->json([
                    'success' => false,
                    'message' => "Seuls les véhicules peuvent être suspendus"
                ], 400);
            }

            $vehicule = $moderation->moderatable;

            $moderation->markAsSuspension(
                $data['motif'] ?? $moderation->motif,
                $data['description'] ?? $moderation->description,
                $data['expire_at'] ?? null
            );

            $vehicule->suspendre();

            Interactions::where('post_id', $vehicule->id)
                ->where('type', 'alerte')->where('status_alerte', Interactions::STATUT_EN_ATTENTE)
                ->update(['status_alerte' => Interactions::STATUT_EXAMINEE]);

            Notifications::create([
                'recever_id' => $vehicule->created_by,
                'type' => Notifications::TYPE_WARNING,
                'title' => 'Véhicule suspendu',
                'message' => "Votre véhicule a été suspendu. Motif : {$moderation->motif}",
                'data' => json_encode(['vehicule_id' => $vehicule->id]),
            ]);

            //Envoi de mail

            //Notifie les users qui ont signalé
            $signaleurs = Interactions::where('post_id', $vehicule->id)
                ->where('type', 'alerte')
                ->pluck('user_id')
                ->unique();

            foreach ($signaleurs as $userId) {
                Notifications::create([
                    'recever_id' => $userId,
                    'type' => Notifications::TYPE_INFO,
                    'title' => 'Signalement traité',
                    'message' => 'Le véhicule que vous avez signalé a été suspendu.',
                    'data' => json_encode(['vehicule_id' => $vehicule->id]),
                ]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Post suspendu avec succès',
                'data' => $moderation
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suspension du post',
            ], 500);
        }
    }

    public function Restauration(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }

            $data = $request->validate([
                'moderation_id' => 'required|exists:moderations,id',
                'description' => 'nullable|string'
            ]);

            DB::beginTransaction();
            $moderation = Moderations::with('moderatable')->findOrFail($data['moderation_id']);
            if ($moderation->moderatable_type !== Vehicules::class) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seuls les véhicules peuvent être restaurés'
                ], 400);
            }

            $vehicule = $moderation->moderatable;
            if (!$vehicule->isSuspendu()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce véhicule n\'est ni suspendu ni banni'
                ], 400);
            }

            $vehicule->restaurer();
            $moderation->markAsRestauration(
                'non_conformite',
                $data['description'] ?? 'Véhicule restauré après vérification'
            );

            Notifications::create([
                'recever_id' => $vehicule->created_by,
                'type' => Notifications::TYPE_SUCCESS,
                'title' => 'Véhicule restauré',
                'message' => 'Votre véhicule a été restauré et est de nouveau visible.',
                'data' => json_encode(['vehicule_id' => $vehicule->id])
            ]);

            Interactions::where('post_id', $vehicule->id)
                ->where('type', 'alerte')
                ->where('status_alerte', Interactions::STATUT_EN_ATTENTE)
                ->update(['status_alerte' => Interactions::STATUT_REJETEE]);

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Véhicule restauré avec succès',
                'data' => [
                    'vehicule' => $vehicule->only(['id', 'statut']),
                    'moderation' => $moderation
                ]
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la restauration',
            ], 500);
        }
    }

    public function Retrait(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }

            $data = $request->validate([
                'moderation_id' => 'required|exists:moderations,id',
                'motif' => 'required|string',
                'description' => 'required|string'
            ]);

            DB::beginTransaction();
            $moderation = Moderations::with('moderatable')->findOrFail($data['moderation_id']);
            if ($moderation->moderatable_type !== Vehicules::class) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seuls les véhicules peuvent être bannis'
                ], 400);
            }

            $vehicule = $moderation->moderatable;
            $moderation->markAsRetrait(
                $data['motif'] ?? $moderation->motif,
                $data['description'] ?? $moderation->description,
            );

            $vehicule->rejete();
            Interactions::where('post_id', $vehicule->id)
                ->where('type', 'alerte')->where('status_alerte', Interactions::STATUT_EN_ATTENTE)
                ->update(['status_alerte' => Interactions::STATUT_EXAMINEE]);

            Notifications::create([
                'recever_id' => $vehicule->created_by,
                'type' => Notifications::TYPE_WARNING,
                'title' => 'Véhicule retiré',
                'message' => "Votre véhicule a finalement été retiré. Motif : {$moderation->motif}",
                'data' => json_encode(['vehicule_id' => $vehicule->id]),
            ]);

            //Notifie les users qui ont signalé
            $signaleurs = Interactions::where('post_id', $vehicule->id)
                ->where('type', 'alerte')
                ->pluck('user_id')
                ->unique();

            foreach ($signaleurs as $userId) {
                Notifications::create([
                    'recever_id' => $userId,
                    'type' => Notifications::TYPE_INFO,
                    'title' => 'Signalement traité',
                    'message' => 'Le véhicule que vous avez signalé a été suspendu.',
                    'data' => json_encode(['vehicule_id' => $vehicule->id]),
                ]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Post suspendu avec succès',
                'data' => $moderation
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la restauration',
            ], 500);
        }
    }

    public function suspendreCompte(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if ($user->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès réservé aux administrateurs'
                ], 403);
            }

            $data = $request->validate([
                'moderation_id' => 'required|exists:moderations,id',
                'motif' => 'required|string',
                'description' => 'required|string',
                'expire_at' => 'nullable|date|after:now'
            ]);

            DB::beginTransaction();

            $moderation = Moderations::with('moderatable')->findOrFail($data['moderation_id']);

            if ($moderation->moderatable_type !== User::class) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seuls les comptes utilisateurs peuvent être suspendus'
                ], 400);
            }

            $userCible = $moderation->moderatable;

            if ($userCible->isSuspendu()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce compte est déjà suspendu'
                ], 400);
            }

            // Suspendre le compte
            $userCible->suspendre();

            // Mettre à jour la modération
            $moderation->markAsSuspension(
                $data['motif'],
                $data['description'],
                $data['expire_at'] ?? null
            );

            // Notifier l'utilisateur
            Notifications::create([
                'recever_id' => $userCible->id,
                'type' => Notifications::TYPE_WARNING,
                'title' => 'Compte suspendu',
                'message' => "Votre compte a été suspendu. Motif : {$data['motif']}. {$data['description']}",
            ]);

            // Marquer les signalements comme examinés
            Interactions::where('user_signale_id', $userCible->id)
                ->where('type', Interactions::TYPE_SIGNALEMENT_USER)
                ->where('status_alerte', Interactions::STATUT_EN_ATTENTE)
                ->update(['status_alerte' => Interactions::STATUT_EXAMINEE]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Compte suspendu avec succès',
                'data' => [
                    'user' => $userCible->only(['id', 'fullname', 'account_status']),
                    'moderation' => $moderation
                ]
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suspension',
            ], 500);
        }
    }

    public function bannirCompte(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if ($user->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès réservé aux administrateurs'
                ], 403);
            }

            $data = $request->validate([
                'moderation_id' => 'required|exists:moderations,id',
                'motif' => 'required|string',
                'description' => 'required|string'
            ]);

            DB::beginTransaction();

            $moderation = Moderations::with('moderatable')->findOrFail($data['moderation_id']);

            if ($moderation->moderatable_type !== User::class) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seuls les comptes utilisateurs peuvent être bannis'
                ], 400);
            }

            $userCible = $moderation->moderatable;

            if ($userCible->isBanni()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce compte est déjà banni'
                ], 400);
            }

            // Bannir le compte
            $userCible->bannir();

            // Bannir tous ses véhicules
            Vehicules::where('created_by', $userCible->id)
                ->update(['statut' => Vehicules::STATUS_BANNI]);

            // Mettre à jour la modération
            $moderation->markAsBannissement(
                $data['motif'],
                $data['description']
            );

            // Notifier l'utilisateur
            Notifications::create([
                'recever_id' => $userCible->id,
                'type' => Notifications::TYPE_ERROR,
                'title' => 'Compte banni définitivement',
                'message' => "Votre compte a été banni de manière définitive. Motif : {$data['motif']}",
            ]);

            // Marquer tous les signalements comme examinés
            Interactions::where('user_signale_id', $userCible->id)
                ->where('type', Interactions::TYPE_SIGNALEMENT_USER)
                ->whereIn('status_alerte', [Interactions::STATUT_EN_ATTENTE, Interactions::STATUT_EXAMINEE])
                ->update(['status_alerte' => Interactions::STATUT_EXAMINEE]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Compte banni définitivement',
                'data' => [
                    'user' => $userCible->only(['id', 'fullname', 'account_status']),
                    'moderation' => $moderation
                ]
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du bannissement',
            ], 500);
        }
    }
}
