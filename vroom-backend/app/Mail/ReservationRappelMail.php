<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReservationRappelMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param Reservation $reservation   La réservation concernée
     * @param int         $joursRestants Nombre de jours avant expiration
     */
    public function __construct(
        public readonly Reservation $reservation,
        public readonly int $joursRestants,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Rappel : votre réservation expire dans {$this->joursRestants} jour(s)",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reservation.rappel',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
