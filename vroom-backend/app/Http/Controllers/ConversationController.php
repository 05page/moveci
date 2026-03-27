<?php

namespace App\Http\Controllers;

use App\Events\MessageDeleted;
use App\Events\MessageSent;
use App\Http\Requests\FindOrCreateConversationRequest;
use App\Http\Requests\SendMessageRequest;
use App\Models\Conversation;
use App\Models\Messages;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ConversationController extends Controller
{
    // ── Helpers prives ───────────────────────────────────────

    /**
     * Recupere une conversation en verifiant que l'user en est participant.
     *
     * Utilise le scope forUser() du modele Conversation pour garantir
     * qu'on ne peut acceder qu'a ses propres conversations.
     * Lance une 404 (findOrFail) si la conversation n'existe pas
     * ou si l'user n'est pas participant.
     */
    private function getConversationForUser(string $id, string $userId): Conversation
    {
        return Conversation::forUser($userId)->findOrFail($id);
    }

    /**
     * Determine l'ID de l'autre participant dans une conversation.
     *
     * Compare participant_1_id avec l'userId passe :
     * si c'est le meme, retourne participant_2_id, et inversement.
     */
    private function getOtherParticipantId(Conversation $conversation, string $userId): string
    {
        return $conversation->participant_1_id === $userId
            ? $conversation->participant_2_id
            : $conversation->participant_1_id;
    }

    // ── Endpoints ────────────────────────────────────────────

    /**
     * GET /conversations
     *
     * Liste toutes les conversations de l'user authentifie.
     * Pour chaque conversation on retourne :
     * - le vehicule concerne (titre + photo principale)
     * - l'autre participant (id, fullname, avatar, role)
     * - le dernier message
     * - le nombre de messages non lus
     */
    public function index(): JsonResponse
    {
        $userId = Auth::id();

        $conversations = Conversation::forUser($userId)
            ->with(['vehicule.description', 'vehicule.photos'])
            // Compte les messages recus non lus (read_at IS NULL et sender != moi)
            ->withCount(['messages as unread_count' => function ($query) use ($userId) {
                $query->where('sender_id', '!=', $userId)
                      ->whereNull('read_at');
            }])
            ->orderByDesc('last_message_at')
            ->get();

        // Enrichir chaque conversation avec other_participant et last_message
        $conversations->each(function ($conversation) use ($userId) {
            $otherId = $this->getOtherParticipantId($conversation, $userId);
            $conversation->other_participant = User::select('id', 'fullname', 'avatar', 'role')
                ->find($otherId);

            $conversation->last_message = $conversation->messages()
                ->select('content', 'created_at', 'sender_id')
                ->orderByDesc('created_at')
                ->first();
        });

        return response()->json([
            'success'       => true,
            'conversations' => $conversations,
        ]);
    }

    /**
     * GET /conversations/unread-count
     *
     * Retourne le nombre total de messages non lus pour l'user connecté,
     * toutes conversations confondues. Utilisé par le badge du header.
     */
    public function unreadCount(): JsonResponse
    {
        $userId = Auth::id();

        $count = Messages::whereHas('conversation', function ($q) use ($userId) {
                $q->where('participant_1_id', $userId)
                  ->orWhere('participant_2_id', $userId);
            })
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    /**
     * POST /conversations
     *
     * Cree ou recupere une conversation existante entre deux users
     * pour un vehicule donne.
     *
     * L'ordre canonique (p1 = min, p2 = max) garantit qu'on ne cree
     * pas de doublon quelle que soit la direction du contact.
     * La contrainte UNIQUE en base (p1, p2, vehicule_id) est le filet
     * de securite en cas de race condition.
     */
    public function findOrCreate(FindOrCreateConversationRequest $request): JsonResponse
    {
        $userId  = Auth::id();
        $otherId = $request->other_user_id;

        // Interdire de se parler a soi-meme
        if ($userId === $otherId) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas demarrer une conversation avec vous-meme.',
            ], 422);
        }

        // Ordre canonique : p1 < p2 (comparaison string UUID)
        // Cela garantit que la meme paire d'users + vehicule
        // produit toujours les memes valeurs p1/p2
        $p1 = min($userId, $otherId);
        $p2 = max($userId, $otherId);

        $conversation = Conversation::firstOrCreate([
            'participant_1_id' => $p1,
            'participant_2_id' => $p2,
            'vehicule_id'      => $request->vehicule_id,
        ]);

        // Charger les relations pour le retour
        $conversation->load(['vehicule.description', 'vehicule.photos']);
        $conversation->other_participant = User::select('id', 'fullname', 'avatar', 'role')
            ->find($otherId);
        $conversation->unread_count = 0;

        return response()->json([
            'success'      => true,
            'conversation' => $conversation,
        ], 201);
    }

    /**
     * GET /conversations/{id}/messages
     *
     * Charge tous les messages d'une conversation.
     * Marque automatiquement les messages recus comme lus
     * (ceux ou sender_id != userId et read_at IS NULL).
     */
    public function messages(string $id): JsonResponse
    {
        $userId       = Auth::id();
        $conversation = $this->getConversationForUser($id, $userId);

        // Marquer les messages recus non lus comme lus
        $conversation->messages()
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        $messages = $conversation->messages()
            ->with('sender:id,fullname,avatar,role')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'success'  => true,
            'messages' => $messages,
        ]);
    }

    /**
     * POST /conversations/{id}/messages
     *
     * Envoie un message dans une conversation.
     * - Cree le message en base
     * - Met a jour last_message_at sur la conversation
     * - Broadcast l'event MessageSent via Reverb
     *   (toOthers() exclut l'emetteur du broadcast)
     */
    public function send(SendMessageRequest $request, string $id): JsonResponse
    {
        $userId       = Auth::id();
        $conversation = $this->getConversationForUser($id, $userId);
        $otherId      = $this->getOtherParticipantId($conversation, $userId);

        $message = Messages::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $userId,
            'receiver_id'     => $otherId,
            'content'         => $request->content,
        ]);

        // Mettre a jour le timestamp pour le tri des conversations
        $conversation->update(['last_message_at' => now()]);

        // Charger le sender pour le broadcast (le frontend en a besoin
        // pour afficher le nom + avatar sans appel supplementaire)
        $message->load('sender:id,fullname,avatar,role');

        // Broadcast en temps reel via Reverb
        // toOthers() : l'emetteur ne recoit pas son propre message via WS
        broadcast(new MessageSent($message))->toOthers();

        return response()->json([
            'success' => true,
            'message' => $message,
        ], 201);
    }

    /**
     * DELETE /conversations/{id}/messages/{messageId}
     *
     * Supprime un message.
     * Seul l'expediteur peut supprimer son propre message.
     * Verifie que le message appartient bien a cette conversation
     * et que l'user est participant.
     */
    public function destroyMessage(string $id, string $messageId): JsonResponse
    {
        $userId       = Auth::id();
        $conversation = $this->getConversationForUser($id, $userId);

        $message = $conversation->messages()->findOrFail($messageId);

        if ($message->sender_id !== $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez supprimer que vos propres messages.',
            ], 403);
        }

        $conversationId = $message->conversation_id;
        $message->delete();

        // Notifie l'autre participant en temps reel via Reverb
        broadcast(new MessageDeleted($conversationId, $messageId))->toOthers();

        return response()->json(['success' => true]);
    }

    /**
     * POST /conversations/{id}/read
     *
     * Marque tous les messages recus non lus comme lus.
     * Utile quand l'user ouvre une conversation sans charger
     * tous les messages (ex: vue liste des conversations).
     */
    public function markAsRead(string $id): JsonResponse
    {
        $userId       = Auth::id();
        $conversation = $this->getConversationForUser($id, $userId);

        $conversation->messages()
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json(['success' => true]);
    }
}
