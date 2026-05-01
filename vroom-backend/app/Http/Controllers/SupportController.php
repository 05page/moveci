<?php

namespace App\Http\Controllers;

use App\Models\Notifications;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Contrôleur du système de support par tickets.
 *
 * - Côté utilisateur : créer un ticket, voir ses tickets
 * - Côté admin : lister tous les tickets, répondre
 */
class SupportController extends Controller
{
    /**
     * POST /support — Créer un nouveau ticket de support.
     * Accessible à tous les utilisateurs authentifiés.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'sujet'    => 'required|string|max:150',
                'message'  => 'required|string|max:2000',
                'priorite' => 'sometimes|in:basse,normale,haute,urgente',
            ]);

            $ticket = SupportTicket::create([
                'user_id'  => Auth::id(),
                'sujet'    => $validated['sujet'],
                'message'  => $validated['message'],
                'priorite' => $validated['priorite'] ?? 'normale',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Ticket créé avec succès.',
                'data'    => $ticket,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi de votre ticket',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /support/mes-tickets — Tickets de l'utilisateur connecté.
     * Retourne les tickets triés du plus récent au plus ancien.
     */
    public function mesTickets(): JsonResponse
    {
        try {
            $tickets = SupportTicket::where('user_id', Auth::id())
                ->latest()
                ->get();

            return response()->json(['success' => true, 'data' => $tickets]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de vos tickets',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /admin/support — Liste tous les tickets (admin).
     * Filtre optionnel par statut via query param : ?statut=ouvert
     */
    public function index(Request $request): JsonResponse
    {
        $query = SupportTicket::with('user:id,fullname,email,role');

        // Filtre par statut si le query param est présent
        if ($request->has('statut') && $request->statut !== 'all') {
            $query->where('statut', $request->statut);
        }

        $tickets = $query->latest()->get();

        return response()->json(['success' => true, 'data' => $tickets]);
    }

    /**
     * POST /admin/support/{id}/repondre — Répondre à un ticket (admin).
     * Met à jour la réponse, le statut, et notifie l'utilisateur.
     */
    public function repondre(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reponse' => 'required|string',
            'statut'  => 'sometimes|in:ouvert,en_cours,résolu,fermé',
        ]);

        $ticket = SupportTicket::findOrFail($id);

        $ticket->update([
            'reponse_admin' => $validated['reponse'],
            'statut'        => $validated['statut'] ?? SupportTicket::STATUT_EN_COURS,
            'admin_id'      => Auth::id(),
            'repondu_at'    => now(),
        ]);

        // Notifie l'utilisateur qu'il a reçu une réponse
        Notifications::create([
            'user_id'    => $ticket->user_id,
            'type'       => Notifications::TYPE_SUPPORT,
            'title'      => 'Réponse à votre ticket',
            'message'    => "Votre ticket « {$ticket->sujet} » a reçu une réponse.",
            'data'       => ['ticket_id' => $ticket->id],
            'date_envoi' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Réponse envoyée.',
            'data'    => $ticket->fresh(),
        ]);
    }
}
