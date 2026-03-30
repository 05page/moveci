<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReservationExpireeMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param Reservation $reservation La réservation qui vient d'expirer
     */
    public function __construct(
        public readonly Reservation $reservation,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre réservation a expiré',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reservation.expiree',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
