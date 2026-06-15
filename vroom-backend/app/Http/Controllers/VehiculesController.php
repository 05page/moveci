<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Favori;
use App\Models\Notifications;
use App\Models\Vehicules;
use App\Models\VehiculesDescription;
use App\Models\VehiculesPhotos;
use App\Jobs\ValidateVehiculeWithGemini;
use App\Services\GeminiService;
use Carbon\Carbon;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;


class VehiculesController extends Controller
{
    //Fonctions pour gérer les véhicules
    public function index(): JsonResponse
    {
        try {
            $query = Vehicules::with([
                'creator:id,fullname,email,role',
                'description',
                'photos',
            ])->whereIn('status_validation', ['validee', 'restauree'])
                ->whereIn('statut', ['disponible', 'a_venir'])
                ->get();

            if ($query->count() == 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Aucun véhicule trouvé',
                    'data' => [],
                ], 200);
            }

            $vehiculeStats = [
                'total_vehicules' => Vehicules::validee()->count(),
                'en_vente' => Vehicules::validee()->vente()->count(),
                'en_location' => Vehicules::validee()->location()->count()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Véhicules récupérés avec succès',
                'data' => [
                    'vehicules' => $query,
                    'statsVehicules' => $vehiculeStats
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des véhicules. Réessayez dans quelques instants.',
            ], 500);
        }
    }

    /** Retourne les 3 véhicules validés les plus consultés (page d'accueil). */
    public function populaires(): JsonResponse
    {
        try {
            $vehicules = Vehicules::with(['creator:id,fullname,adresse', 'description', 'photos'])
                ->whereIn('status_validation', ['validee', 'restauree'])
                ->whereIn('statut', ['disponible', 'a_venir'])
                ->orderByDesc('views_count')
                ->limit(3)
                ->get();

            return response()->json(['success' => true, 'data' => $vehicules], 200);
        } catch (\Exception $e) {
            Log::error('populaires: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Erreur serveur.'], 500);
        }
    }

    public function vehicule($id): JsonResponse
    {
        try {
            $user = Auth::user();

            $vehicule = Vehicules::with([
                'creator:id,fullname,email',
                'description',
                'photos',
            ])->whereIn('status_validation', ['validee', 'restauree'])
                ->whereIn('statut', ['disponible', 'a_venir'])
                ->findOrFail($id);

            $vehicule->registerView($user, request()->ip());

            return response()->json([
                'success' => true,
                'data'    => $vehicule,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Véhicule introuvable',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du véhicule',
            ], 500);
        }
    }

    public function mesVehicules(): JsonResponse
    {
        try {
            $user = Auth::user();

            $vehicules = Vehicules::with([
                'creator:id,fullname,email',
                'description',
                'photos',
            ])
                ->where('created_by', $user->id)
                ->whereIn('status_validation', ['validee', 'restauree', 'en_attente', 'rejetee'])
                ->whereIn('statut', ['disponible', 'a_venir', 'vendu', 'loué'])
                ->get();

            $stats = [
                'total_vehicule' => Vehicules::disponible()->where('created_by', $user->id)->count(),
                'total_vehicule_vendu' => Vehicules::vendu()->where('created_by', $user->id)->count(),
                'total_vehicule_loue' => Vehicules::loue()->where('created_by', $user->id)->count(),
                'total_vues' => Vehicules::where('created_by', $user->id)->sum('views_count'),
                'total_revenus' => Vehicules::vendu()->where('created_by', $user->id)->whereMonth('created_at', Carbon::now()->month)->sum('prix'),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Véhicules récupérés avec succès',
                'data' => [
                    'vehicules' => $vehicules,
                    'stats' => $stats
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des véhicules',
            ], 500);
        }
    }

    public function monVehicule($id): JsonResponse
    {
        try {
            $user = Auth::user();
            $monVehicule = Vehicules::with([
                'creator:id,fullname,email',
                'description',
                'photos',
            ])->where('created_by', $user->id)
                ->findOrFail($id);
            return response()->json([
                'success' => true,
                'data'    => $monVehicule,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Véhicule introuvable'], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des véhicules',
            ], 500);
        }
    }

    public function postVehicules(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            //Créer un nouveau véhicule (Ajoutons les descriptions et photos)
            $validatedData = $request->validate([
                'post_type' => ['required', Rule::in([
                    Vehicules::POST_TYPE_VENTE,
                    Vehicules::POST_TYPE_LOCATION
                ])],
                'type' => ['required', Rule::in([
                    Vehicules::VEHICLE_TYPE_NEUF,
                    Vehicules::VEHICLE_TYPE_OCCASION
                ])],
                'prix' => 'required|numeric',
                'date_disponibilite' => 'nullable|date',
                'negociable' => 'sometimes|boolean',
                'marque' => 'required|string|max:500',
                'modele' => 'required|string|max:500',
                'annee' => 'nullable|digits:4|integer',
                'carburant' => 'nullable|string|max:100',
                'transmission' => 'nullable|string|max:100',
                'kilometrage' => 'nullable|integer',
                'couleur' => 'nullable|string|max:100',
                'nombre_portes' => 'nullable|integer',
                'nombre_places' => 'nullable|integer',
                'visite_technique' => ['nullable', Rule::in([
                    'à_jour',
                    'expirée',
                    'non_concerné'
                ])],
                'date_visite_technique' => 'nullable|date',
                'carte_grise' => ['nullable', Rule::in([
                    'à_jour',
                    'expirée',
                    'non_concerné'
                ])],
                'date_carte_grise' => 'nullable|date',
                'assurance' => ['nullable', Rule::in([
                    'à_jour',
                    'expirée',
                    'non_concerné'
                ])],
                'historique_accidents' => ['nullable', Rule::in([
                    'aucun',
                    'quelques_accidents',
                    'nombreux_accidents'
                ])],
                'equipements' => 'nullable|array',

                'photos' => 'nullable|array',
                'photos.*' => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            ]);

            if (!$validatedData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                ], 400);
            }

            $dateDisponibilite = isset($validatedData['date_disponibilite'])
                ? Carbon::parse($validatedData['date_disponibilite'])->startOfDay()
                : now()->startOfDay();

            $statut = $dateDisponibilite->isFuture()
                ? Vehicules::STATUS_A_VENIR
                : Vehicules::STATUS_DISPONIBLE;

            // Le véhicule est sauvegardé immédiatement — la validation Gemini
            // se fait en arrière-plan via le job ValidateVehiculeWithGemini
            DB::beginTransaction();
            $vehicule = Vehicules::create([
                'created_by'         => $user->id,
                'post_type'          => $validatedData['post_type'],
                'type'               => $validatedData['type'],
                'statut'             => $statut,
                'status_validation'  => Vehicules::STATUS_PENDING, // en_attente jusqu'à validation Gemini
                'prix'               => $validatedData['prix'],
                'negociable'         => $request->boolean('negociable'),
                'date_disponibilite' => $dateDisponibilite,
            ]);

            $vehiculeDescription = VehiculesDescription::create([
                'vehicule_id' => $vehicule->id,
                'marque' => $validatedData['marque'],
                'modele' => $validatedData['modele'],
                'annee' => $validatedData['annee'] ?? null,
                'carburant' => $validatedData['carburant'] ?? null,
                'transmission' => $validatedData['transmission'] ?? null,
                'kilometrage' => $validatedData['kilometrage'] ?? null,
                'couleur' => $validatedData['couleur'] ?? null,
                'nombre_portes' => $validatedData['nombre_portes'] ?? null,
                'nombre_places' => $validatedData['nombre_places'] ?? null,
                'visite_technique' => $validatedData['visite_technique'] ?? null,
                'date_visite_technique' => $validatedData['date_visite_technique'] ?? null,
                'carte_grise' => $validatedData['carte_grise'] ?? null,
                'date_carte_grise' => $validatedData['date_carte_grise'] ?? null,
                'assurance' => $validatedData['assurance'] ?? null,
                'historique_accidents' => $validatedData['historique_accidents'] ?? null,
                'equipements' => $validatedData['equipements'] ?? null,
            ]);

            // Uploader les photos sur le disque public Laravel
            // et sauvegarder le chemin relatif en base.
            if ($request->hasFile('photos')) {
                foreach ($request->file('photos') as $index => $photo) {
                    $storagePath = $photo->store('vehicules', 'public');

                    if (!$storagePath) {
                        Log::error('Local storage upload failed', [
                            'vehicule_id' => $vehicule->id,
                            'index'       => $index,
                            'filename'    => $photo->getClientOriginalName(),
                        ]);
                        // On lève une exception pour que le catch extérieur appelle DB::rollBack()
                        // Un return direct ici court-circuiterait la transaction sans la défaire
                        throw new \RuntimeException("Échec de l'upload de la photo : " . $photo->getClientOriginalName());
                    }

                    VehiculesPhotos::create([
                        'vehicule_id' => $vehicule->id,
                        'path'        => $storagePath,
                        'is_primary'  => $index === 0,
                        'position'    => $index + 1,
                    ]);
                }
            }

            Notifications::create([
                'user_id'    => $user->id,
                'type'       => Notifications::TYPE_MODERATION,
                'level'      => 'success',
                'title'      => 'Annonce soumise avec succès',
                'message'    => 'Votre annonce ' . $vehiculeDescription->marque . ' ' . $vehiculeDescription->modele . ' est en cours de validation. Vous serez notifié du résultat.',
                'data'       => ['vehicule_id' => $vehicule->id],
                'lu'         => false,
                'date_envoi' => now(),
            ]);

            Notifications::notifyAdmins(
                Notifications::TYPE_MODERATION,
                'Nouvelle annonce à modérer',
                $vehiculeDescription->marque . ' ' . $vehiculeDescription->modele . ' — soumis par ' . $user->fullname,
                ['vehicule_id' => $vehicule->id]
            );

            DB::commit();

            // Dispatcher le job de validation Gemini en arrière-plan
            // Le véhicule sera rejeté automatiquement si Gemini détecte des incohérences
            ValidateVehiculeWithGemini::dispatch($vehicule);

            return response()->json([
                'success' => true,
                'message' => 'Annonce soumise avec succès',
                'data'    => [
                    'vehicule'    => $vehicule,
                    'description' => $vehicule->description,
                    'photos'      => $vehicule->photos,
                ],
            ], 201);
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de la création du véhicule', [
                'user_id' => Auth::id(),
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => "Impossible de publier l'annonce pour le moment. Réessayez dans quelques instants.",
            ], 500);
        }
    }

    public function updateVehicule(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $vehicule = Vehicules::findOrFail($id);
            $vehiculeDescription = VehiculesDescription::where('vehicule_id', $id)->first();

            // Mettre à jour les informations du véhicule
            $this->authorize('update', $vehicule);
            $validatedData = $request->validate([
                'post_type' => ['sometimes', 'required', Rule::in([
                    Vehicules::POST_TYPE_VENTE,
                    Vehicules::POST_TYPE_LOCATION
                ])],
                'type' => ['sometimes', 'required', Rule::in([
                    Vehicules::VEHICLE_TYPE_NEUF,
                    Vehicules::VEHICLE_TYPE_OCCASION
                ])],
                'prix' => 'sometimes|required|numeric',
                'date_disponibilite' => 'sometimes|date',
                'negociable' => 'sometimes|boolean',
                'marque' => 'sometimes|required|string|max:500',
                'modele' => 'sometimes|required|string|max:500',
                'annee' => 'sometimes|digits:4|integer',
                'carburant' => 'sometimes|string|max:100',
                'transmission' => 'sometimes|string|max:100',
                'kilometrage' => 'sometimes|integer',
                'couleur' => 'sometimes|string|max:100',
                'nombre_portes' => 'sometimes|integer',
                'nombre_places' => 'sometimes|integer',
                'visite_technique' => ['sometimes', Rule::in([
                    'à_jour',
                    'expirée',
                    'non_concerné'
                ])],
                'date_visite_technique' => 'nullable|date',
                'carte_grise' => ['sometimes', Rule::in([
                    'à_jour',
                    'expirée',
                    'non_concerné'
                ])],
                'date_carte_grise' => 'nullable|date',
                'assurance' => ['sometimes', Rule::in([
                    'à_jour',
                    'expirée',
                    'non_concerné'
                ])],
                'historique_accidents' => ['sometimes', Rule::in([
                    'aucun',
                    'quelques_accidents',
                    'nombreux_accidents'
                ])],
                'equipements' => 'sometimes|array',

                // Photos
                'photos' => 'nullable|array',
                'photos.*' => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            ]);

            // Validation avec Gemini pour vérifier la cohérence des données
            DB::beginTransaction();
            $dateDisponibilite = isset($validatedData['date_disponibilite'])
                ? Carbon::parse($validatedData['date_disponibilite'])->startOfDay()
                : $vehicule->date_disponibilite;

            $statut = $dateDisponibilite->isFuture()
                ? Vehicules::STATUS_A_VENIR
                : Vehicules::STATUS_DISPONIBLE;
            $vehicule->update([
                'created_by' => $user->id,
                'post_type' => $validatedData['post_type'] ?? $vehicule->post_type,
                'type' => $validatedData['type'] ?? $vehicule->type,
                'statut' => $statut,
                'status_validation' => Vehicules::STATUS_PENDING,
                'prix' => $validatedData['prix'] ?? $vehicule->prix,
                'negociable'         => $request->has('negociable') ? $request->boolean('negociable') : $vehicule->negociable,
                'date_disponibilite' => $dateDisponibilite,
            ]);

            VehiculesDescription::updateOrCreate(
                ['vehicule_id' => $vehicule->id],
                [
                    'marque'                => $validatedData['marque'] ?? $vehiculeDescription->marque,
                    'modele'                => $validatedData['modele'] ?? $vehiculeDescription->modele,
                    'annee'                 => $validatedData['annee'] ?? null,
                    'carburant'             => $validatedData['carburant'] ?? null,
                    'transmission'          => $validatedData['transmission'] ?? null,
                    'kilometrage'           => $validatedData['kilometrage'] ?? null,
                    'couleur'               => $validatedData['couleur'] ?? null,
                    'nombre_portes'         => $validatedData['nombre_portes'] ?? null,
                    'nombre_places'         => $validatedData['nombre_places'] ?? null,
                    'visite_technique'      => $validatedData['visite_technique'] ?? null,
                    'date_visite_technique' => $validatedData['date_visite_technique'] ?? null,
                    'carte_grise'           => $validatedData['carte_grise'] ?? null,
                    'date_carte_grise'      => $validatedData['date_carte_grise'] ?? null,
                    'assurance'             => $validatedData['assurance'] ?? null,
                    'historique_accidents'  => $validatedData['historique_accidents'] ?? null,
                    'equipements'           => $validatedData['equipements'] ?? null,
                ]
            );

            if ($request->hasFile('photos')) {
                $existingPhotosCount = $vehicule->photos()->count();
                foreach ($request->file('photos') as $index => $photo) {
                    $storagePath = $photo->store('vehicules', 'public');

                    if (!$storagePath) {
                        Log::error('Local storage upload failed', [
                            'vehicule_id' => $vehicule->id,
                            'index'       => $index,
                            'filename'    => $photo->getClientOriginalName(),
                        ]);
                        // On lève une exception pour que le catch extérieur appelle DB::rollBack()
                        // Un return direct ici court-circuiterait la transaction sans la défaire
                        throw new \RuntimeException("Échec de l'upload de la photo : " . $photo->getClientOriginalName());
                    }

                    VehiculesPhotos::create([
                        'vehicule_id' => $vehicule->id,
                        'path'        => $storagePath,
                        'is_primary'  => false,
                        'position' => $existingPhotosCount + $index + 1
                    ]);
                }
            }
            Notifications::create([
                'user_id' => $user->id,
                'type'    => Notifications::TYPE_MODERATION,
                'level'   => 'success',
                'title'   => 'Véhicule modifié avec succès',
                'message' => 'Votre véhicule ' . $vehiculeDescription->marque . ' ' . $vehiculeDescription->modele . ' a été modifié avec succès.',
                'data'    => ['vehicule_id' => $vehicule->id],
            ]);

            DB::commit();
            ValidateVehiculeWithGemini::dispatch($vehicule);
            return response()->json([
                'success' => true,
                'message' => 'Véhicule modifié avec succès',
                'data' => [
                    'vehicule' => $vehicule,
                    'description' => $vehicule->description,
                    'photos' => $vehicule->photos
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de la modification du véhicule', [
                'user_id' => Auth::id(),
                'vehicule_id' => $id,
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => "Impossible de modifier le véhicule pour le moment. Réessayez dans quelques instants.",
            ], 500);
        }
    }
    public function deleteVehicule($id)
    {
        try {
            $user     = Auth::user();
            $vehicule = Vehicules::findOrFail($id);

            // Seul le propriétaire du véhicule peut le supprimer
            if ($vehicule->created_by !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            $vehicule->delete();

            return response()->json([
                'success' => true,
                'message' => 'Véhicule supprimé avec succès',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du véhicule',
            ], 500);
        }
    }

    /**
     * GET /vehicules/suggestions — Suggestions de véhicules basées sur les favoris.
     *
     * Algorithme :
     * 1. Récupère les favoris de l'utilisateur
     * 2. Extrait les préférences dominantes (marques, carburant, post_type)
     * 3. Cherche des véhicules similaires non déjà en favoris
     * 4. Si pas assez de résultats, complète avec les plus vus
     * 5. Si aucun favori → retourne les 8 véhicules les plus populaires
     */
    public function suggestions(): JsonResponse
    {
        $userId = Auth::id();

        // Récupère les favoris avec les descriptions des véhicules
        $favoris = Favori::where('user_id', $userId)
            ->with('vehicule.description')
            ->get();

        if ($favoris->isEmpty()) {
            // Pas de favoris → fallback sur les véhicules les plus vus
            $vehicules = Vehicules::with(['description', 'photos'])
                ->where('status_validation', 'validee')
                ->whereIn('statut', ['disponible', 'a_venir'])
                ->orderByDesc('views_count')
                ->limit(8)
                ->get();

            return response()->json(['success' => true, 'data' => $vehicules, 'source' => 'populaire']);
        }

        // Extrait les préférences dominantes depuis les favoris
        $marques   = $favoris->pluck('vehicule.description.marque')->filter()->countBy()->sortDesc()->keys()->take(3)->toArray();
        $carburant = $favoris->pluck('vehicule.description.carburant')->filter()->countBy()->sortDesc()->keys()->first();
        $postType  = $favoris->pluck('vehicule.post_type')->filter()->countBy()->sortDesc()->keys()->first();

        $favoriIds = $favoris->pluck('vehicule_id')->toArray();

        // Cherche des véhicules similaires (même marque ou carburant) non déjà en favoris
        $suggestions = Vehicules::with(['description', 'photos'])
            ->join('vehicules_description', 'vehicules.id', '=', 'vehicules_description.vehicule_id')
            ->where('vehicules.status_validation', 'validee')
            ->whereIn('vehicules.statut', ['disponible', 'a_venir'])
            ->whereNotIn('vehicules.id', $favoriIds)
            ->where(function ($q) use ($marques, $carburant) {
                $q->whereIn('vehicules_description.marque', $marques);
                if ($carburant) {
                    $q->orWhere('vehicules_description.carburant', $carburant);
                }
            })
            ->select('vehicules.*')
            ->orderByDesc('vehicules.views_count')
            ->limit(8)
            ->get();

        // Si pas assez de résultats, complète avec les plus vus
        if ($suggestions->count() < 4) {
            $extra = Vehicules::with(['description', 'photos'])
                ->where('status_validation', 'validee')
                ->whereIn('statut', ['disponible', 'a_venir'])
                ->whereNotIn('id', array_merge($favoriIds, $suggestions->pluck('id')->toArray()))
                ->orderByDesc('views_count')
                ->limit(8 - $suggestions->count())
                ->get();
            $suggestions = $suggestions->concat($extra);
        }

        return response()->json(['success' => true, 'data' => $suggestions, 'source' => 'favoris']);
    }
}
