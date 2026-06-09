<?php

namespace App\Jobs;

use App\Mail\ReservationRappelMail;
use App\Models\Notifications;
use App\Models\Reservation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendReservationReminders implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $reservations = Reservation::where('statut', Reservation::EN_ATTENTE)
            ->where('expires_at', '>', now())
            ->with(['client', 'vehicule.catalogue', 'vehicule.photos'])
            ->get();

        foreach ($reservations as $reservation) {
            $joursRestants = (int) now()->diffInDays($reservation->expires_at);

            if ($joursRestants % 5 !== 0) {
                continue;
            }

            $vehicule  = $reservation->vehicule;
            $catalogue = $vehicule?->catalogue;
            $nom       = $catalogue
                ? "{$catalogue->marque} {$catalogue->modele} ({$catalogue->annee})"
                : "le véhicule réservé";

            // Notification en base
            Notifications::create([
                'user_id'    => $reservation->client_id,
                'type'       => Notifications::TYPE_RESERVATION,
                'level'      => 'warning',
                'title'      => 'Rappel de réservation',
                'message'    => $joursRestants > 0
                    ? "Votre réservation pour {$nom} expire dans {$joursRestants} jour(s). Finalisez votre achat avant qu'elle n'expire."
                    : "Votre réservation pour {$nom} expire aujourd'hui. Dernière chance de finaliser votre achat.",
                'data'       => [
                    'reservation_id' => $reservation->id,
                    'vehicule_id'    => $vehicule?->id,
                    'expires_at'     => $reservation->expires_at->toISOString(),
                    'jours_restants' => $joursRestants,
                ],
                'date_envoi' => now(),
                'lu'         => false,
            ]);

            // Email de rappel
            if ($reservation->client?->email) {
                Mail::to($reservation->client->email)
                    ->send(new ReservationRappelMail($reservation, $joursRestants));
            }
        }
    }
}
