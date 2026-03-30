<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReservationAnnuleeMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param Reservation $reservation La réservation annulée par le client
     */
    public function __construct(
        public readonly Reservation $reservation,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre réservation a été annulée',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reservation.annulee',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
