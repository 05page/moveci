<?php

namespace App\Events;

use App\Models\Messages;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event broadcast en temps reel quand un message est envoye.
 *
 * Canal : private-conversation.{conversation_id}
 * Nom :   message.sent
 *
 * Le frontend ecoute cet event via Reverb pour afficher
 * le message instantanement chez le destinataire.
 */
class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Messages $message)
    {
        //
    }

    /**
     * Broadcast sur deux canaux :
     * - conversation.{id} : pour afficher le message en temps réel dans le chat
     * - user.{receiver_id} : pour incrémenter le badge "messages non lus" dans le header
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->message->conversation_id),
            new PrivateChannel('user.' . $this->message->receiver_id),
        ];
    }

    /**
     * Payload envoye au frontend via WebSocket.
     * Inclut le sender (id, fullname, avatar, role) pour
     * afficher le message sans appel API supplementaire.
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message->toArray(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
