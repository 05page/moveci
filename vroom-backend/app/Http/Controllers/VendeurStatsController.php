<?php

namespace App\Http\Controllers;

use App\Models\Avis;
use App\Models\Formation;
use App\Models\RendezVous;
use App\Models\User;
use App\Models\Vehicules;
use App\Models\VehiculeVue;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VendeurStatsController extends Controller
{
    //
    public function mesStats()
    {
        try {
            $user = Auth::user();

            $stats = [
                // Correction 1 : count au lieu de count (manquait les parenthèses)
                'total_vehicule' => Vehicules::disponible()->where('created_by', $user->id)->count(),
                'total_vehicule_vendu' => Vehicules::vendu()->where('created_by', $user->id)->count(),
                'total_vehicule_loue' => Vehicules::loue()->where('created_by', $user->id)->count(),
                //'total_vehicule_vente' => Vehicules::vente()->where('created_by', $user->id)->count(),
                //'total_vehicule_location' => Vehicules::location()->where('created_by', $user->id)->count(),
                'total_vues' => Vehicules::where('created_by', $user->id)->sum('views_count'),
                'total_vues_mois' => Vehicules::where('created_by', $user->id)->whereMonth('created_at', Carbon::now()->month)->sum('views_count'),
                'total_vues_jour' => VehiculeVue::whereHas('vehicule', function ($q) use ($user) {
                    $q->where('created_by', $user->id);
                })->whereDate('created_at', Carbon::today())->count(),
                // updated_at = date à laquelle le statut est passé à "vendu"
                'total_revenus' => Vehicules::vendu()->where('created_by', $user->id)->whereMonth('updated_at', Carbon::now()->month)->whereYear('updated_at', Carbon::now()->year)->sum('prix'),
            ];
            $statsMensuel = [];
            for ($mois = 1; $mois <= 12; $mois++) {
                $statsMensuel[] = [
                    'mois' => $mois,
                    'nom_mois' => Carbon::create()->month($mois)->locale('fr')->translatedFormat('F'),
                    'ventes' => Vehicules::vendu()
                        ->where('created_by', $user->id)
                        ->whereMonth('created_at', $mois)
                        ->whereYear('created_at', Carbon::now()->year)
                        ->count(),
                    'vues' => VehiculeVue::whereHas('vehicule', function ($q) use ($user) {
                        $q->where('created_by', $user->id);
                    })
                        ->whereMonth('created_at', $mois)
                        ->whereYear('created_at', Carbon::now()->year)
                        ->count(),
                    'locations' => Vehicules::loue()
                        ->whereMonth('created_at', $mois)
                        ->whereYear('created_at', Carbon::now()->year)
                        ->count()
                ];
            }

            $statsSemaine = [];
            $debutSemaine = Carbon::now()->startOfWeek();
            for ($i = 0; $i < 7; $i++) {
                $jour = $debutSemaine->copy()->addDays($i);
                $statsSemaine[] = [
                    'jour' => $jour->format('Y-m-d'),
                    'nom_jour' => $jour->locale('fr')->translatedFormat('D'),
                    'ventes' => Vehicules::vendu()
                        ->where('created_by', $user->id)
                        ->whereDate('created_at', $jour)
                        ->count(),
                    'vues' => VehiculeVue::whereHas('vehicule', function ($q) use ($user) {
                        $q->where('created_by', $user->id);
                    })
                        ->whereDate('created_at', $jour)
                        ->count(),
                    'locations' => Vehicules::loue()
                        ->where('created_by', $user->id)
                        ->whereDate('created_at', $jour)
                        ->count(),
                ];
            }
            if ($stats == [] && $statsMensuel == []) {
                return response()->json([
                    'success' => false,
                    'message' => "Aucune stats disponible"
                ]);
            }
            $mostVuesVehicle = [
                //liste des 5 véhicules les plus vus
                'my_top_vehicle_most_vues' => Vehicules::with(['description', 'photos'])->where('created_by', $user->id)
                    ->orderByDesc('views_count')
                    ->limit(5)
                    ->get(['id', 'post_type', 'prix', 'statut', 'views_count']),

                'my_recent_vehicle' => Vehicules::with('description')->where('created_by', $user->id)
                    ->limit(5)
                    ->get()
            ];

            $mesRdv = [
                'rdv_recents' => RendezVous::with([
                    'vehicule.description',
                    'vehicule.photos',
                    'client:id,fullname,email,telephone,adresse',
                    'proprietaire:id,fullname,email,telephone,adresse'
                ])->confirme()
                    ->where(function ($query) use ($user) {
                        $query->where('client_id', $user->id)
                            ->orWhere('vendeur_id', $user->id);
                    })
                    ->whereHas('vehicule', function ($query) {
                        $query->whereIn('statut', [Vehicules::STATUS_VENDU, Vehicules::STATUS_LOUE]);
                    })
                    ->latest()
                    ->take(5)
                    ->get()
                    ->map(function ($transaction) {
                        $transaction->post_type = $transaction->type_finalisation;
                        return $transaction;
                    }),
                'total_rdv' => RendezVous::where('vendeur_id', $user->id)->confirme()->count()
            ];
            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'stats_mensuel' => $statsMensuel,
                    'stats_semaine' => $statsSemaine,
                    'top_vehicule_vues' => $mostVuesVehicle,
                    'rdv' => $mesRdv,
                ]
            ], 200);
        } catch (\Exception $e) {
        }
        return response()->json([
            'success' => false,
            'message' => "Erreur survenue",
        ]);
    }

    /**
     * Retourne le profil public d'un vendeur ou concessionnaire.
     * Accessible uniquement aux utilisateurs connectés (auth:sanctum).
     * Contient : infos de base, véhicules disponibles, avis clients.
     */
    public function profil(string $id)
    {
        try {
            $user = User::findOrFail($id);

            // Profil client — données réduites, pas de véhicules ni d'avis
            if ($user->role === 'client') {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'vendeur'   => [
                            'id'           => $user->id,
                            'fullname'     => $user->fullname,
                            'avatar'       => $user->avatar,
                            'role'         => $user->role,
                            'membre_since' => $user->created_at,
                            'note_moyenne' => 0,
                            'nb_avis'      => 0,
                        ],
                        'vehicules'  => [],
                        'formations' => [],
                        'avis'       => [],
                    ]
                ]);
            }

            // Profil vendeur / concessionnaire / auto_ecole — données complètes
            $vehicules = Vehicules::with(['description', 'photos'])
                ->where('created_by', $user->id)
                ->where('statut', Vehicules::STATUS_DISPONIBLE)
                ->whereIn('status_validation', ['validee', 'restauree'])
                ->latest()
                ->get();

            // Seul un auto_ecole publie des formations (les autres rôles ne créent jamais de ligne
            // `formations.auto_ecole_id` les concernant) — inutile de lancer la requête pour les autres.
            // `with('autoEcole')` obligatoire : le front (CarteFormationCatalogue) lit `formation.auto_ecole.*`
            // sans filet, même contrat que FormationController::index().
            $formations = $user->role === 'auto_ecole'
                ? Formation::with(['autoEcole' => fn ($q) => $q->select('id', 'fullname', 'avatar')
                        ->withAvg('avisVendeur as note_moyenne', 'note')])
                    ->where('auto_ecole_id', $user->id)
                    ->where('statut_validation', Formation::STATUT_VALIDE)
                    ->where('statut', Formation::STATUT_DISPONIBLE)
                    ->withCount('inscriptions')
                    ->latest()
                    ->get()
                : [];

            $avis = Avis::with('client:id,fullname')
                ->where('vendeur_id', $user->id)
                ->latest()
                ->take(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'vendeur' => [
                        'id'           => $user->id,
                        'fullname'     => $user->fullname,
                        'avatar'       => $user->avatar,
                        'adresse'      => $user->adresse,
                        'telephone'    => $user->telephone,
                        'role'         => $user->role,
                        'membre_since' => $user->created_at,
                        // Moyenne calculée sur TOUS les avis du vendeur (et non sur les 10 chargés ci-dessus)
                        'note_moyenne' => round((float) Avis::where('vendeur_id', $user->id)->avg('note'), 1),
                        'nb_avis'      => $avis->count(),
                    ],
                    'vehicules'  => $vehicules,
                    'formations' => $formations,
                    'avis'       => $avis,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur introuvable',
            ], 404);
        }
    }

    /**
     * Vendeurs vedettes de l'accueil : 2 concessionnaires + 1 vendeur particulier,
     * les mieux notés d'abord. Public, appelée par app/page.tsx (front).
     */
    public function vedettes()
    {
        // withAvg/withCount ajoutent chacun UNE colonne calculée par une sous-requête
        // SQL, sans charger les lignes de la relation en mémoire — contrairement à
        // ->with('avisVendeur')->avg(...) qui chargerait tous les avis pour les
        // moyenner en PHP. Le nom de la colonne générée suit un format fixe :
        // withAvg('avisVendeur', 'note') => 'avis_vendeur_avg_note'.
        $selectionner = fn (string $role, int $limite) => User::where('role', $role)
            ->withAvg('avisVendeur', 'note')
            ->withCount(['vehicules' => fn ($requete) => $requete->where('statut', Vehicules::STATUS_DISPONIBLE)])
            ->orderByDesc('avis_vendeur_avg_note')
            ->limit($limite)
            ->get();

        // merge() met bout à bout deux Collections déjà récupérées séparément —
        // deux requêtes SQL (une par rôle), pas une seule mêlant les deux critères.
        $vendeurs = $selectionner('concessionnaire', 2)->merge($selectionner('vendeur', 1));

        $data = $vendeurs->map(fn (User $user) => [
            'id' => $user->id,
            'fullname' => $user->fullname,
            'avatar' => $user->avatar,
            'role' => $user->role,
            // avis_vendeur_avg_note vaut `null` (pas 0) si le vendeur n'a aucun avis —
            // round(null, 1) plante, d'où le `?? 0` avant de caster/arrondir.
            'note_moyenne' => round((float) ($user->avis_vendeur_avg_note ?? 0), 1),
            'nb_avis' => $user->avisVendeur()->count(),
            'nb_vehicules' => $user->vehicules_count,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }
}
