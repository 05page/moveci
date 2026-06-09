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

class InteractionController extends Controller
{
    //
    public function Favoirites(): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $favorites = Interactions::with(['post', 'post.description'])
                ->where('user_id', $user->id)
                ->where('type', 'favori')
                ->get();

            if ($favorites->count() === 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Aucun favori trouvé pour cet utilisateur',
                    'data' => [],
                ], 200);
            }

            return response()->json([
                'success' => true,
                'data' => $favorites,
            ], 200);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du chargement des favoris. Réessayez dans quelques instants.');
        }
    }

    public function Alerts(): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $alerts = Interactions::with('post')
                ->where('user_id', $user->id)
                ->where('type', 'alerte')
                ->get();

            if ($alerts->count() === 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Aucune alerte trouvée pour cet utilisateur',
                    'data' => [],
                ], 200);
            }

            // Grouper les alertes par statut
            $groupedAlerts = [
                'en_attente' => $alerts->where('status_alerte', Interactions::STATUT_EN_ATTENTE)->values(),
                'examinee' => $alerts->where('status_alerte', Interactions::STATUT_EXAMINEE)->values(),
                'rejetee' => $alerts->where('status_alerte', Interactions::STATUT_REJETEE)->values(),
            ];

            return response()->json([
                'success' => true,
                'data' => $groupedAlerts,
            ], 200);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du chargement des alertes. Réessayez dans quelques instants.');
        }
    }

    public function detailAlerte($id): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => "Utilisateur non authentifié"
                ], 401);
            }

            if (!is_numeric($id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Identifiant invalide',
                ], 400);
            }

            $detailAlerte = Interactions::alerts()->findOrFail($id);
            return response()->json([
                'success' => true,
                'data'    => $detailAlerte,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Alerte introuvable',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l’alerte',
            ], 500);
        }
    }

    public function StoreAlert(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $data = $request->validate([
                'post_id' => 'required|integer|exists:vehicules,id',
                'justification_alerte' => 'required|string',
                'description_alerte' => 'nullable|string',
            ]);

            //VÉRIFICATION : L'user a-t-il déjà signalé ce véhicule ?
            $existingAlert = Interactions::where('user_id', $user->id)
                ->where('post_id', $data['post_id'])
                ->where('type', 'alerte')
                ->first();

            if ($existingAlert) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez déjà signalé ce véhicule',
                    'data' => [
                        'alerte_existante' => $existingAlert,
                        'statut' => $existingAlert->status_alerte
                    ]
                ], 409);
            }

            DB::beginTransaction();

            // Créer l'alerte
            $alert = Interactions::create([
                'user_id' => $user->id,
                'post_id' => $data['post_id'],
                'type' => 'alerte',
                'justification_alerte' => $data['justification_alerte'],
                'description_alerte' => $data['description_alerte'] ?? null,
                'status_alerte' => Interactions::STATUT_EN_ATTENTE,
            ]);

            $description = $data['description_alerte'] ?? null;
            // Vérifier si modération existe
            $existingModeration = Moderations::where('moderatable_type', Vehicules::class)
                ->where('moderable_id', $data['post_id'])
                ->where('status', 'en_cours')
                ->first();

            if (!$existingModeration) {
                Moderations::create([
                    'moderatable_type' => Vehicules::class,
                    'moderable_id' => $data['post_id'],
                    'admin_id' => 1, // ✅ Mets un admin système, pas le user
                    'motif' => $data['justification_alerte'],
                    'description' => $description
                        ? "Signalement : {$description}" : 'Signalement sans description',
                    'status' => 'en_cours',
                ]);
            }

            // Notifier l'user
            Notifications::create([
                'recever_id' => $user->id,
                'title' => 'Signalement enregistré',
                'type' => Notifications::TYPE_ALERT,
                'level' => 'info',
                'message' => 'Votre signalement a été enregistré et sera examiné par notre équipe.',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Signalement créé avec succès',
                'data' => $alert,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'alerte',
            ], 500);
        }
    }

    public function storeFavorite(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $data = $request->validate([
                'post_id' => 'required|integer|exists:vehicules,id',
            ]);

            // Vérifier si le favori existe déjà
            $existingFavorite = Interactions::where('user_id', $user->id)
                ->where('post_id', $data['post_id'])
                ->where('type', 'favori')
                ->first();

            if ($existingFavorite) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce post est déjà dans les favoris',
                ], 409);
            }

            $favorite = Interactions::create([
                'user_id' => $user->id,
                'post_id' => $data['post_id'],
                'type' => 'favori',
            ]);

            return response()->json([
                'success' => true,
                'data' => $favorite,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'ajout au favori',
            ], 500);
        }
    }

    public function deleteFavorite(Request $request, $postId): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $favorite = Interactions::where('user_id', $user->id)
                ->where('post_id', $postId)
                ->where('type', 'favori')
                ->first();

            if (!$favorite) {
                return response()->json([
                    'success' => false,
                    'message' => 'Favori non trouvé',
                ], 404);
            }

            $favorite->delete();

            return response()->json([
                'success' => true,
                'message' => 'Favori supprimé avec succès',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du favori',
            ], 500);
        }
    }

    public function signalerUser(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $data = $request->validate([
                'user_signale_id' => 'required|exists:users,id',
                'justification_alerte' => 'required|in:faux_profil,harcelement,comportement_suspect,spam,autre',
                'description_alerte' => 'required|string|min:10',
            ]);

            //Empêcher de se signaler soi-même
            if ($user->id === $data['user_signale_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous ne pouvez pas vous signaler vous-même',
                ], 400);
            }

            //Vérifier si déjà signalé
            $existingSignalement = Interactions::where('user_id', $user->id)
                ->where('user_signale_id', $data['user_signale_id'])
                ->where('type', Interactions::TYPE_SIGNALEMENT_USER)
                ->first();

            if ($existingSignalement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez déjà signalé cet utilisateur',
                    'data' => $existingSignalement
                ], 409);
            }

            DB::beginTransaction();

            // Créer le signalement
            $signalement = Interactions::create([
                'user_id' => $user->id,
                'user_signale_id' => $data['user_signale_id'],
                'type' => Interactions::TYPE_SIGNALEMENT_USER,
                'justification_alerte' => $data['justification_alerte'],
                'description_alerte' => $data['description_alerte'],
                'status_alerte' => Interactions::STATUT_EN_ATTENTE,
            ]);

            // ✅ Vérifier si modération existe pour cet user
            $existingModeration = Moderations::where('moderatable_type', User::class)
                ->where('moderable_id', $data['user_signale_id'])
                ->where('status', 'en_cours')
                ->first();

            if (!$existingModeration) {
                Moderations::create([
                    'moderatable_type' => User::class,
                    'moderable_id' => $data['user_signale_id'],
                    'admin_id' => 1, // Admin système
                    'motif' => $data['justification_alerte'],
                    'description' => "Signalement utilisateur : {$data['description_alerte']}",
                    'status' => 'en_cours',
                ]);
            }

            // Notifier l'user qui signale
            Notifications::create([
                'recever_id' => $user->id,
                'title' => 'Signalement enregistré',
                'type' => Notifications::TYPE_ALERT,
                'level' => 'info',
                'message' => 'Votre signalement a été enregistré et sera examiné par notre équipe.',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Utilisateur signalé avec succès',
                'data' => $signalement,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du signalement',
            ], 500);
        }
    }

    public function bloquerUser(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $data = $request->validate([
                'user_signale_id' => 'required|exists:users,id',
            ]);

            // ✅ Empêcher de se bloquer soi-même
            if ($user->id === $data['user_signale_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous ne pouvez pas vous bloquer vous-même',
                ], 400);
            }

            // ✅ Vérifier si déjà bloqué
            $existingBlocage = Interactions::where('user_id', $user->id)
                ->where('user_signale_id', $data['user_signale_id'])
                ->where('type', Interactions::TYPE_BLOCAGE_USER)
                ->first();

            if ($existingBlocage) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez déjà bloqué cet utilisateur',
                ], 409);
            }

            // Créer le blocage
            $blocage = Interactions::create([
                'user_id' => $user->id,
                'user_signale_id' => $data['user_signale_id'],
                'type' => Interactions::TYPE_BLOCAGE_USER,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Utilisateur bloqué avec succès',
                'data' => $blocage,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du blocage',
            ], 500);
        }
    }

    public function debloquerUser(Request $request, $userId): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $blocage = Interactions::where('user_id', $user->id)
                ->where('user_signale_id', $userId)
                ->where('type', Interactions::TYPE_BLOCAGE_USER)
                ->first();

            if (!$blocage) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun blocage trouvé pour cet utilisateur',
                ], 404);
            }

            $blocage->delete();

            return response()->json([
                'success' => true,
                'message' => 'Utilisateur débloqué avec succès',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du déblocage',
            ], 500);
        }
    }

    public function mesUtilisateursBloques(): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                ], 401);
            }

            $usersBloque = Interactions::with('userSignale:id,fullname,email,avatar')
                ->where('user_id', $user->id)
                ->where('type', Interactions::TYPE_BLOCAGE_USER)
                ->get()
                ->map(function ($interaction) {
                    return [
                        'blocage_id' => $interaction->id,
                        'user' => $interaction->userSignale,
                        'bloque_le' => $interaction->created_at
                    ];
                });

                if($usersBloque->isEmpty()){
                    return response()->json([
                        'success'=> true,
                        'message'=> "Aucun utilisateur bloqué",
                        'data'=> []
                    ], 200);
                }

            return response()->json([
                'success' => true,
                'data' => $usersBloque,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération',
            ], 500);
        }
    }
}
