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
            ->with(['client', 'vehicule.catalogue', 'vehicule.photos'])
            ->get();

        foreach ($reservations as $rs) {
            $rs->update(['statut' => Reservation::EXPIREE]);
            $rs->vehicule->update(['statut' => Vehicules::STATUS_DISPONIBLE]);

            // Email d'expiration
            if ($rs->client?->email) {
                Mail::to($rs->client->email)
                    ->send(new ReservationExpireeMail($rs));
            }
        }
    }
}
