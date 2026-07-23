<?php

namespace App\Jobs;

use App\Mail\ReservationExpireeMail;
use App\Models\Reservation;
use App\Models\Vehicules;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class ExpireReservations implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $reservations = Reservation::where('statut', Reservation::EN_ATTENTE)
            ->where('expires_at', '<', now())
            ->with(['client', 'vehicule.description', 'vehicule.photos'])
            ->get();

        foreach ($reservations as $rs) {
            $rs->update(['statut' => Reservation::EXPIREE, 'active_key' => null]);

            // Même logique que ReservationController::cancel() : ne pas afficher
            // le véhicule comme "disponible" avant sa date de disponibilité annoncée
            $nouveauStatut = $rs->vehicule->date_disponibilite?->isFuture()
                ? Vehicules::STATUS_A_VENIR
                : Vehicules::STATUS_DISPONIBLE;

            $rs->vehicule->update(['statut' => $nouveauStatut]);

            // Email d'expiration
            if ($rs->client?->email) {
                Mail::to($rs->client->email)
                    ->send(new ReservationExpireeMail($rs));
            }
        }
    }
}
