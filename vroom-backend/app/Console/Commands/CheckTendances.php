<?php

namespace App\Console\Commands;

use App\Models\AlerteTendance;
use App\Models\Formation;
use App\Models\InscriptionFormation;
use App\Models\Notifications;
use App\Models\VehiculeVue;
use App\Models\Vehicules;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Commande artisan qui tourne toutes les heures via le scheduler.
 *
 * Elle détecte les pics d'activité et notifie les propriétaires
 * quand un seuil (tranche) est franchi pour la première fois
 * sur la période en cours (jour ou semaine).
 *
 * Seuils véhicules :
 *   - Quotidien  : 20 / 50 / 100 vues
 *   - Hebdomadaire : 100 / 300 / 500 vues
 *
 * Seuils formations (préinscriptions) :
 *   - Quotidien  : 5 / 10 / 20
 *   - Hebdomadaire : 15 / 30 / 50
 */
class CheckTendances extends Command
{
    protected $signature   = 'tendances:check';
    protected $description = 'Vérifie les pics de vues et préinscriptions et notifie les propriétaires';

    // ── Seuils ────────────────────────────────────────────────────────────────

    private const TRANCHES_VEHICULE = [
        'quotidien'     => [20, 50, 100],
        'hebdomadaire'  => [100, 300, 500],
    ];

    private const TRANCHES_FORMATION = [
        'quotidien'     => [5, 10, 20],
        'hebdomadaire'  => [15, 30, 50],
    ];

    // ── Point d'entrée ───────────────────────────────────────────────────────

    public function handle(): void
    {
        $this->checkVehicules();
        $this->checkFormations();

        $this->info('Tendances vérifiées à ' . now()->format('d/m/Y H:i'));
    }

    // ── Véhicules ─────────────────────────────────────────────────────────────

    private function checkVehicules(): void
    {
        // On ne travaille que sur les véhicules actifs et validés
        $vehicules = Vehicules::where('status_validation', 'validee')
            ->where('statut', 'disponible')
            ->pluck('created_by', 'id'); // [vehicule_id => user_id]

        foreach ($vehicules as $vehiculeId => $ownerId) {
            foreach (['quotidien', 'hebdomadaire'] as $periode) {
                [$debut, $fin] = $this->plage($periode);

                $nbVues = VehiculeVue::where('vehicule_id', $vehiculeId)
                    ->whereBetween('created_at', [$debut, $fin])
                    ->count();

                foreach (self::TRANCHES_VEHICULE[$periode] as $tranche) {
                    if ($nbVues >= $tranche && ! $this->dejaNotifia($vehiculeId, null, $periode, $tranche)) {
                        $this->notifierVehicule($vehiculeId, $ownerId, $nbVues, $tranche, $periode);
                    }
                }
            }
        }
    }

    // ── Formations ───────────────────────────────────────────────────────────

    private function checkFormations(): void
    {
        // Formations validées uniquement
        $formations = Formation::where('statut_validation', 'validé')
            ->pluck('auto_ecole_id', 'id'); // [formation_id => auto_ecole_id]

        foreach ($formations as $formationId => $ownerId) {
            foreach (['quotidien', 'hebdomadaire'] as $periode) {
                [$debut, $fin] = $this->plage($periode);

                $nbInscrits = InscriptionFormation::where('formation_id', $formationId)
                    ->whereBetween('created_at', [$debut, $fin])
                    ->count();

                foreach (self::TRANCHES_FORMATION[$periode] as $tranche) {
                    if ($nbInscrits >= $tranche && ! $this->dejaNotifia(null, $formationId, $periode, $tranche)) {
                        $this->notifierFormation($formationId, $ownerId, $nbInscrits, $tranche, $periode);
                    }
                }
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Retourne le début et la fin de la plage temporelle selon la période.
     * - quotidien    : depuis minuit aujourd'hui jusqu'à maintenant
     * - hebdomadaire : depuis lundi 00:00 de la semaine courante jusqu'à maintenant
     *
     * @return array{Carbon, Carbon}
     */
    private function plage(string $periode): array
    {
        $fin = now();

        $debut = $periode === 'quotidien'
            ? now()->startOfDay()
            : now()->startOfWeek(Carbon::MONDAY);

        return [$debut, $fin];
    }

    /**
     * Vérifie si on a déjà notifié cette tranche pour ce véhicule/formation
     * sur la période en cours (depuis le dernier reset).
     */
    private function dejaNotifia(
        ?string $vehiculeId,
        ?string $formationId,
        string  $periode,
        int     $tranche
    ): bool {
        [$debutPeriode] = $this->plage($periode);

        $query = AlerteTendance::where('periode', $periode)
            ->where('tranche', $tranche)
            ->where('notified_at', '>=', $debutPeriode);

        if ($vehiculeId) {
            $query->where('vehicule_id', $vehiculeId);
        } else {
            $query->where('formation_id', $formationId);
        }

        return $query->exists();
    }

    /**
     * Enregistre la notification et l'entrée anti-spam pour un véhicule.
     */
    private function notifierVehicule(
        string $vehiculeId,
        string $ownerId,
        int    $nbVues,
        int    $tranche,
        string $periode
    ): void {
        $label = $periode === 'quotidien' ? "aujourd'hui" : 'cette semaine';

        Notifications::create([
            'user_id' => $ownerId,
            'type'    => Notifications::TYPE_TENDANCE,
            'level'   => 'info',
            'title'   => "Votre annonce cartonne !",
            'message' => "Votre annonce a atteint {$nbVues} vues {$label} (seuil {$tranche} franchi). Elle attire beaucoup d'acheteurs potentiels.",
            'data'    => ['vehicule_id' => $vehiculeId, 'nb_vues' => $nbVues, 'tranche' => $tranche, 'periode' => $periode],
        ]);

        AlerteTendance::create([
            'vehicule_id' => $vehiculeId,
            'type'        => 'vehicule',
            'periode'     => $periode,
            'tranche'     => $tranche,
            'notified_at' => now(),
        ]);
    }

    /**
     * Enregistre la notification et l'entrée anti-spam pour une formation.
     */
    private function notifierFormation(
        string $formationId,
        string $ownerId,
        int    $nbInscrits,
        int    $tranche,
        string $periode
    ): void {
        $label = $periode === 'quotidien' ? "aujourd'hui" : 'cette semaine';

        Notifications::create([
            'user_id' => $ownerId,
            'type'    => Notifications::TYPE_TENDANCE,
            'level'   => 'info',
            'title'   => "Affluence sur votre formation !",
            'message' => "{$nbInscrits} préinscriptions enregistrées {$label} (seuil {$tranche} franchi). Votre formation suscite un fort intérêt.",
            'data'    => ['formation_id' => $formationId, 'nb_inscrits' => $nbInscrits, 'tranche' => $tranche, 'periode' => $periode],
        ]);

        AlerteTendance::create([
            'formation_id' => $formationId,
            'type'         => 'formation',
            'periode'      => $periode,
            'tranche'      => $tranche,
            'notified_at'  => now(),
        ]);
    }
}
