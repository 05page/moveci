<?php

namespace App\Console\Commands;

use App\Models\Notifications;
use App\Models\Signalement;
use App\Models\TransactionConclue;
use App\Models\User;
use App\Models\Vehicules;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Traite toutes les transactions expirées (expires_at dépassé, statut en_attente).
 *
 * Pour chaque transaction expirée où le vendeur n'a PAS confirmé :
 *  - Transaction → statut expiré
 *  - Véhicule → disponible (déverrouillé)
 *  - Signalement automatique créé sur le vendeur
 *  - Compteur nb_refus_transaction incrémenté
 *  - Client et vendeur notifiés
 *
 * Si le vendeur avait déjà confirmé mais pas le client → expiration neutre
 * (le deal était engagé, le client n'a pas donné suite — pas de pénalité vendeur).
 */
class CheckTransactionsExpirees extends Command
{
    protected $signature   = 'transactions:expirer';
    protected $description = 'Traite les transactions expirées et déverrouille les véhicules bloqués';

    public function handle(): void
    {
        $expirees = TransactionConclue::where('statut', TransactionConclue::STATUT_EN_ATTENTE)
            ->where('expires_at', '<', now())
            ->get();

        foreach ($expirees as $transaction) {
            DB::beginTransaction();
            try {
                $transaction->update(['statut' => TransactionConclue::STATUT_EXPIRE]);

                // Déverrouille le véhicule dans tous les cas
                Vehicules::where('id', $transaction->vehicule_id)
                    ->update(['statut' => Vehicules::STATUS_DISPONIBLE]);

                if (! $transaction->confirme_par_vendeur) {
                    // Le vendeur n'a pas confirmé → pénalité réputation
                    $this->penaliserVendeur($transaction);
                } else {
                    // Le vendeur avait confirmé, le client ne l'a pas fait → expiration neutre
                    $this->notifierExpirationNeutre($transaction);
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                $this->error('Erreur transaction ' . $transaction->id . ' : ' . $e->getMessage());
            }
        }

        $this->info($expirees->count() . ' transaction(s) expirée(s) traitée(s) à ' . now()->format('d/m/Y H:i'));
    }

    /**
     * Le vendeur n'a pas confirmé dans les 48h → signalement + compteur + notifs.
     */
    private function penaliserVendeur(TransactionConclue $transaction): void
    {
        $vendeur = User::find($transaction->vendeur_id);

        // Signalement automatique système
        Signalement::create([
            'client_id'        => null,
            'cible_user_id'    => $transaction->vendeur_id,
            'motif'            => 'transaction_non_confirmee',
            'description'      => 'La transaction #' . $transaction->id . ' a expiré sans confirmation du vendeur ' .
                                  ($vendeur?->fullname ?? $transaction->vendeur_id) .
                                  '. Le véhicule a été remis disponible automatiquement.',
            'statut'           => Signalement::STATUT_EN_ATTENTE,
            'date_signalement' => now(),
        ]);

        // Incrémente le compteur de réputation
        User::where('id', $transaction->vendeur_id)->increment('nb_refus_transaction');

        // Notifie le vendeur
        Notifications::create([
            'user_id'    => $transaction->vendeur_id,
            'type'       => Notifications::TYPE_TRANSACTION,
            'level'      => 'warning',
            'title'      => 'Transaction expirée — avertissement',
            'message'    => 'Vous n\'avez pas confirmé la transaction dans les délais impartis (48h). Votre annonce est redevenue disponible. Un avertissement a été enregistré sur votre profil.',
            'data'       => ['transaction_id' => $transaction->id],
            'date_envoi' => now(),
        ]);

        // Notifie le client
        Notifications::create([
            'user_id'    => $transaction->client_id,
            'type'       => Notifications::TYPE_TRANSACTION,
            'level'      => 'warning',
            'title'      => 'Transaction expirée',
            'message'    => 'La transaction a expiré car le vendeur n\'a pas confirmé dans les délais. Si vous avez effectué un paiement, contactez le support.',
            'data'       => ['transaction_id' => $transaction->id],
            'date_envoi' => now(),
        ]);
    }

    /**
     * Le vendeur avait confirmé mais le client n'a pas répondu → expiration neutre.
     */
    private function notifierExpirationNeutre(TransactionConclue $transaction): void
    {
        Notifications::create([
            'user_id'    => $transaction->vendeur_id,
            'type'       => Notifications::TYPE_TRANSACTION,
            'level'      => 'warning',
            'title'      => 'Transaction expirée',
            'message'    => 'La transaction a expiré car le client n\'a pas confirmé dans les délais. Votre annonce est de nouveau disponible.',
            'data'       => ['transaction_id' => $transaction->id],
            'date_envoi' => now(),
        ]);

        Notifications::create([
            'user_id'    => $transaction->client_id,
            'type'       => Notifications::TYPE_TRANSACTION,
            'level'      => 'warning',
            'title'      => 'Transaction expirée',
            'message'    => 'Vous n\'avez pas confirmé la transaction dans les délais impartis (48h). Elle a été annulée automatiquement.',
            'data'       => ['transaction_id' => $transaction->id],
            'date_envoi' => now(),
        ]);
    }
}
