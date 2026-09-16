<?php

namespace App\Console\Commands;

use App\Models\Notifications;
use App\Models\TransactionConclue;
use Illuminate\Console\Command;

/**
 * Ouvre la restitution des locations arrivées à échéance : pour chaque transaction
 * `confirmé`, de type `location`, dont `date_fin_location` est atteinte et qui n'a pas
 * encore de code de restitution, génère ce code et notifie les deux parties — même
 * principe que le code de confirmation généré à la fin du rendez-vous (RendezVousController::terminer()),
 * mais pour la restitution, à la date de fin de location plutôt qu'à la fin du RDV.
 */
class GenererCodesRestitution extends Command
{
    protected $signature   = 'transactions:generer-codes-restitution';
    protected $description = 'Génère le code de restitution des locations dont la date de fin est atteinte';

    public function handle(): void
    {
        $aTraiter = TransactionConclue::where('type', 'location')
            ->where('statut', TransactionConclue::STATUT_CONFIRME)
            ->whereNull('code_restitution')
            ->whereDate('date_fin_location', '<=', now()->toDateString())
            ->get();

        foreach ($aTraiter as $transaction) {
            $code = TransactionConclue::genererCode();

            $transaction->update([
                'code_restitution'       => $code,
                'restitution_expires_at' => now()->addHours(48),
            ]);

            // Le code ne part QUE vers le vendeur — le client ne doit l'obtenir qu'en
            // scannant le QR du vendeur en personne, sinon la présence n'est plus exigée.
            Notifications::create([
                'user_id'    => $transaction->vendeur_id,
                'type'       => Notifications::TYPE_TRANSACTION,
                'level'      => 'info',
                'title'      => 'Restitution du véhicule à confirmer',
                'message'    => 'La location arrive à échéance. Code de restitution : ' . $code . '. Montrez le QR de votre dashboard au client pour qu\'il scanne et confirme.',
                'data'       => ['transaction_id' => $transaction->id, 'code' => $code],
                'date_envoi' => now(),
            ]);

            Notifications::create([
                'user_id'    => $transaction->client_id,
                'type'       => Notifications::TYPE_TRANSACTION,
                'level'      => 'info',
                'title'      => 'Restitution du véhicule à confirmer',
                'message'    => 'La location arrive à échéance. Scannez le QR affiché par le vendeur pour confirmer la restitution.',
                'data'       => ['transaction_id' => $transaction->id],
                'date_envoi' => now(),
            ]);
        }

        $this->info($aTraiter->count() . ' restitution(s) ouverte(s) à ' . now()->format('d/m/Y H:i'));
    }
}
