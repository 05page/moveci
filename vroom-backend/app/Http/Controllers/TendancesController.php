<?php

namespace App\Http\Controllers;

use App\Models\Formation;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Contrôleur des tendances — agrège les données statistiques
 * pour la page "Tendances" selon le rôle de l'utilisateur.
 *
 * - auto_ecole  → stats formations/inscriptions de l'utilisateur
 * - autres      → agrégats platform-wide des véhicules validés
 */
class TendancesController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();

        // Si l'utilisateur est une auto-école, on retourne ses données formation
        if ($user->role === 'auto_ecole') {
            return $this->tendancesAutoEcole($user->id);
        }

        // Sinon (concessionnaire, vendeur, client...) → données véhicules platform-wide
        return $this->tendancesVehicules();
    }

    /**
     * Agrégats platform-wide des véhicules validés :
     * - Top 6 marques les plus annoncées
     * - Répartition par type de carburant
     * - Distribution par tranches de prix (FCFA)
     */
    private function tendancesVehicules(): JsonResponse
    {
        // Top 6 marques les plus annoncées parmi les véhicules validés
        $marques = DB::table('vehicules')
            ->join('vehicules_description', 'vehicules.id', '=', 'vehicules_description.vehicule_id')
            ->where('vehicules.status_validation', 'validee')
            ->select('vehicules_description.marque', DB::raw('count(*) as annonces'))
            ->groupBy('vehicules_description.marque')
            ->orderByDesc('annonces')
            ->limit(6)
            ->get();

        // Répartition par carburant (essence, diesel, hybride, électrique...)
        $carburant = DB::table('vehicules')
            ->join('vehicules_description', 'vehicules.id', '=', 'vehicules_description.vehicule_id')
            ->where('vehicules.status_validation', 'validee')
            ->whereNotNull('vehicules_description.carburant')
            ->select('vehicules_description.carburant as name', DB::raw('count(*) as value'))
            ->groupBy('vehicules_description.carburant')
            ->orderByDesc('value')
            ->get();

        // Tranches de prix en FCFA
        $prix = [
            '< 10M'  => DB::table('vehicules')->where('status_validation', 'validee')->where('prix', '<', 10_000_000)->count(),
            '10–20M' => DB::table('vehicules')->where('status_validation', 'validee')->whereBetween('prix', [10_000_000, 20_000_000])->count(),
            '20–35M' => DB::table('vehicules')->where('status_validation', 'validee')->whereBetween('prix', [20_000_000, 35_000_000])->count(),
            '35–50M' => DB::table('vehicules')->where('status_validation', 'validee')->whereBetween('prix', [35_000_000, 50_000_000])->count(),
            '> 50M'  => DB::table('vehicules')->where('status_validation', 'validee')->where('prix', '>', 50_000_000)->count(),
        ];

        $prixData = collect($prix)->map(fn($v, $k) => ['tranche' => $k, 'demande' => $v])->values();

        return response()->json([
            'success'   => true,
            'marques'   => $marques,
            'carburant' => $carburant,
            'prix'      => $prixData,
        ]);
    }

    /**
     * Données tendances pour une auto-école :
     * - Répartition des types de permis proposés
     * - Inscriptions par mois (année en cours, 12 mois complets)
     */
    private function tendancesAutoEcole(string $userId): JsonResponse
    {
        // Distribution des types de permis pour les formations de cet utilisateur
        $permis = Formation::where('auto_ecole_id', $userId)
            ->select('type_permis', DB::raw('count(*) as demandes'))
            ->groupBy('type_permis')
            ->orderByDesc('demandes')
            ->get();

        // Inscriptions par mois — EXTRACT(MONTH FROM ...) compatible PostgreSQL
        $inscriptions = DB::table('inscriptions_formation')
            ->join('formations', 'inscriptions_formation.formation_id', '=', 'formations.id')
            ->where('formations.auto_ecole_id', $userId)
            ->whereYear('inscriptions_formation.date_inscription', now()->year)
            ->select(
                DB::raw('MONTH(inscriptions_formation.date_inscription) as mois'),
                DB::raw('count(*) as inscrits')
            )
            ->groupBy('mois')
            ->orderBy('mois')
            ->get()
            ->keyBy('mois');

        // Complète les 12 mois (mois sans inscription = 0)
        $moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        $inscriptionsMois = collect(range(1, 12))->map(fn($m) => [
            'mois'     => $moisLabels[$m - 1],
            'inscrits' => $inscriptions->get($m)?->inscrits ?? 0,
        ])->values();

        return response()->json([
            'success'           => true,
            'permis'            => $permis,
            'inscriptions_mois' => $inscriptionsMois,
        ]);
    }
}
