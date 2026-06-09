<?php

namespace App\Http\Controllers;

use App\Events\DataRefresh;
use App\Http\Requests\StoreRendezVousRequest;
use App\Models\Avis;
use App\Models\Notifications;
use App\Models\RendezVous;
use App\Models\TransactionConclue;
use App\Models\Vehicules;
use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RendezVousController extends Controller
{
    // ── Client : ses RDV (demandés par lui) ───────────────
    public function mesRdv(): JsonResponse
    {
        try {
            $user = Auth::user();

            $rdvs = RendezVous::with(['vendeur:id,fullname,avatar', 'vehicule.description'])
                ->where('client_id', $user->id)
                ->orderBy('date_heure', 'desc')
                ->get();

            // Indique si le client a déjà laissé un avis pour chaque vendeur,
            // afin d'afficher "Avis envoyé" plutôt que "Laisser un avis" même après rechargement.
            $vendeurIdsAvecAvis = Avis::where('client_id', $user->id)
                ->whereIn('vendeur_id', $rdvs->pluck('vendeur_id')->unique())
                ->pluck('vendeur_id')
                ->flip(); // flip() pour O(1) lookup au lieu de in_array

            $rdvs->each(function ($rdv) use ($vendeurIdsAvecAvis) {
                $rdv->has_avis = isset($vendeurIdsAvecAvis[$rdv->vendeur_id]);
            });

            return response()->json(['success' => true, 'data' => $rdvs], 200);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du chargement de vos rendez-vous. Réessayez dans quelques instants.');
        }
    }

    // ── Vendeur : les RDV reçus ────────────────────────────
    public function nosRdv(): JsonResponse
    {
        try {
            $user = Auth::user();

            $rdvs = RendezVous::with(['client:id,fullname,avatar', 'vehicule.description'])
                ->where('vendeur_id', $user->id)
                ->orderBy('date_heure', 'desc')
                ->get();

            return response()->json(['success' => true, 'data' => $rdvs], 200);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du chargement des rendez-vous reçus. Réessayez dans quelques instants.');
        }
    }

    // ── Créer un RDV (client → auteur du post véhicule) ───
    public function store(StoreRendezVousRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            DB::beginTransaction();

            $user = Auth::user();

            // Le vendeur est l'auteur du post, pas un champ libre du client
            $vehicule = Vehicules::findOrFail($validated['vehicule_id']);

            if ($vehicule->created_by === $user->id) {
                DB::rollBack(); // transaction ouverte sans données — on annule proprement
                return response()->json([
                    'success' => false,
                    'message' => 'Vous ne pouvez pas prendre rendez-vous sur votre propre annonce',
                ], 422);
            }

            $rdv = RendezVous::create([
                'client_id'   => $user->id,
                'vendeur_id'  => $vehicule->created_by,
                'vehicule_id' => $vehicule->id,
                'date_heure'  => $validated['date_heure'],
                'type'        => $validated['type'],
                'statut'      => RendezVous::STATUT_EN_ATTENTE,
                'motif'       => $validated['motif'] ?? null,
                'lieu'        => $validated['lieu'] ?? null,
                'notes'       => $validated['notes'] ?? null,
            ]);

            // Notifier le vendeur
            Notifications::create([
                'user_id' => $vehicule->created_by,
                'type'    => Notifications::TYPE_RDV,
                'level'   => 'info',
                'title'   => 'Nouvelle demande de rendez-vous',
                'message' => $user->fullname . ' souhaite un rendez-vous le ' . \Carbon\Carbon::parse($validated['date_heure'])->format('d/m/Y à H:i'),
                'data'    => ['rdv_id' => $rdv->id],
            ]);

            DB::commit();

            // Temps réel — le vendeur voit la nouvelle demande sans F5
            event(new DataRefresh($vehicule->created_by, 'rdv'));

            return response()->json([
                'success' => true,
                'message' => 'Demande de rendez-vous envoyée',
                'data'    => $rdv->load(['client:id,fullname', 'vendeur:id,fullname']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, "Erreur lors de l'envoi de la demande de rendez-vous. Réessayez dans quelques instants.");
        }
    }

    // ── Vendeur confirme ───────────────────────────────────
    public function confirmer($id): JsonResponse
    {
        try {
            $user = Auth::user();
            $rdv  = RendezVous::where('id', $id)->where('vendeur_id', $user->id)->firstOrFail();

            DB::beginTransaction();

            $rdv->confirmer();

            // Créer l'événement Google Calendar si le vendeur est connecté
            if (GoogleCalendarService::isUserConnected($user)) {
                try {
                    $rdv->load('client');
                    $start    = $rdv->date_heure->toDateTime();
                    $end      = $rdv->date_heure->copy()->addHour()->toDateTime();
                    $summary  = 'Rendez-vous Vroom — ' . ucfirst($rdv->type);
                    $desc     = $rdv->motif ?? $rdv->notes ?? '';

                    $calendar      = new GoogleCalendarService($user);
                    $googleEventId = $calendar->createEvent($summary, $desc, $start, $end, $rdv->client->email);

                    if ($googleEventId) {
                        $rdv->update(['google_event_id' => $googleEventId]);
                    }
                } catch (\Exception $e) {
                    // L'échec Calendar ne bloque pas la confirmation
                }
            }

            Notifications::create([
                'user_id' => $rdv->client_id,
                'type'    => Notifications::TYPE_RDV,
                'level'   => 'success',
                'title'   => 'Rendez-vous confirmé',
                'message' => 'Votre rendez-vous du ' . $rdv->date_heure->format('d/m/Y à H:i') . ' a été confirmé.',
                'data'    => ['rdv_id' => $rdv->id],
            ]);

            DB::commit();

            // Temps réel — le client voit la confirmation sans F5
            event(new DataRefresh($rdv->client_id, 'rdv'));

            return response()->json(['success' => true, 'message' => 'Rendez-vous confirmé', 'data' => $rdv], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Rendez-vous introuvable'], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, 'Erreur lors de la confirmation du rendez-vous. Réessayez dans quelques instants.');
        }
    }

    //Proprietaire refuse
    public function refuser(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $rdv  = RendezVous::where('id', $id)->where('vendeur_id', $user->id)->firstOrFail();

            $rdv->refuser();

            Notifications::create([
                'user_id' => $rdv->client_id,
                'type'    => Notifications::TYPE_RDV,
                'level'   => 'error',
                'title'   => 'Rendez-vous refusé',
                'message' => 'Votre rendez-vous du ' . $rdv->date_heure->format('d/m/Y à H:i') . ' a été refusé.',
                'data'    => ['rdv_id' => $rdv->id],
            ]);

            // Temps réel — le client voit le refus sans F5
            event(new DataRefresh($rdv->client_id, 'rdv'));

            return response()->json(['success' => true, 'message' => 'Rendez-vous refusé'], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Rendez-vous introuvable'], 404);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du refus du rendez-vous. Réessayez dans quelques instants.');
        }
    }

    // ── Client ou vendeur annule ───────────────────────────
    public function annuler($id): JsonResponse
    {
        try {
            $user = Auth::user();

            $rdv = RendezVous::where('id', $id)
                ->where(function ($q) use ($user) {
                    $q->where('client_id', $user->id)
                      ->orWhere('vendeur_id', $user->id);
                })->firstOrFail();

            if ($rdv->statut === RendezVous::STATUT_TERMINE) {
                return response()->json(['success' => false, 'message' => 'Impossible d\'annuler un RDV terminé'], 422);
            }

            DB::beginTransaction();

            $rdv->annuler();

            // Notifier l'autre partie
            $destinataire = $user->id === $rdv->client_id ? $rdv->vendeur_id : $rdv->client_id;

            Notifications::create([
                'user_id' => $destinataire,
                'type'    => Notifications::TYPE_RDV,
                'level'   => 'error',
                'title'   => 'Rendez-vous annulé',
                'message' => 'Le rendez-vous du ' . $rdv->date_heure->format('d/m/Y à H:i') . ' a été annulé.',
                'data'    => ['rdv_id' => $rdv->id],
            ]);

            DB::commit();

            // Temps réel — les deux parties voient l'annulation sans F5
            event(new DataRefresh($rdv->client_id, 'rdv'));
            event(new DataRefresh($rdv->vendeur_id, 'rdv'));

            return response()->json(['success' => true, 'message' => 'Rendez-vous annulé'], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Rendez-vous introuvable'], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, "Erreur lors de l'annulation du rendez-vous. Réessayez dans quelques instants.");
        }
    }

    // ── Vendeur termine ────────────────────────────────────
    public function terminer($id): JsonResponse
    {
        try {
            $user = Auth::user();
            $rdv  = RendezVous::where('id', $id)->where('vendeur_id', $user->id)->with('vehicule')->firstOrFail();

            DB::beginTransaction();

            $rdv->terminer();

            // Verrouille le véhicule le temps de la confirmation double
            // → plus visible dans le catalogue, plus de nouveaux RDV possibles
            $rdv->vehicule->update(['statut' => Vehicules::STATUS_EN_TRANSACTION]);

            // Génère le code de confirmation et crée la TransactionConclue
            $code = TransactionConclue::genererCode();

            $transaction = TransactionConclue::create([
                'rendez_vous_id'    => $rdv->id,
                'vehicule_id'       => $rdv->vehicule_id,
                'vendeur_id'        => $rdv->vendeur_id,
                'client_id'         => $rdv->client_id,
                'type'              => $rdv->vehicule->post_type, // 'vente' ou 'location'
                'code_confirmation' => $code,
                'expires_at'        => now()->addHours(48),
                'statut'         => TransactionConclue::STATUT_EN_ATTENTE,
            ]);

            // Notifie le vendeur avec le code (pour qu'il puisse le saisir)
            Notifications::create([
                'user_id'    => $rdv->vendeur_id,
                'type'       => Notifications::TYPE_TRANSACTION,
                'level'      => 'info',
                'title'      => 'RDV terminé — confirmez la transaction',
                'message'    => 'Rendez-vous du ' . $rdv->date_heure->format('d/m/Y') . ' terminé. Code de confirmation : ' . $code . '. Renseignez les détails du deal sur votre dashboard.',
                'data'       => ['transaction_id' => $transaction->id, 'code' => $code],
                'date_envoi' => now(),
            ]);

            // Notifie le client avec le code (pour qu'il puisse confirmer)
            Notifications::create([
                'user_id'    => $rdv->client_id,
                'type'       => Notifications::TYPE_TRANSACTION,
                'level'      => 'info',
                'title'      => 'Confirmation de transaction requise',
                'message'    => 'Votre rendez-vous du ' . $rdv->date_heure->format('d/m/Y') . ' est terminé. Code de confirmation : ' . $code . '. Confirmez la transaction sur votre dashboard.',
                'data'       => ['transaction_id' => $transaction->id, 'code' => $code],
                'date_envoi' => now(),
            ]);

            DB::commit();

            // Temps réel — les deux parties voient le RDV terminé + la transaction créée
            event(new DataRefresh($rdv->client_id, 'rdv'));
            event(new DataRefresh($rdv->vendeur_id, 'rdv'));
            event(new DataRefresh($rdv->client_id, 'transaction'));
            event(new DataRefresh($rdv->vendeur_id, 'transaction'));

            return response()->json([
                'success' => true,
                'message' => 'Rendez-vous terminé. Codes de confirmation envoyés.',
                'data'    => ['rdv' => $rdv, 'transaction_id' => $transaction->id],
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Rendez-vous introuvable'], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, 'Erreur lors de la finalisation du rendez-vous. Réessayez dans quelques instants.');
        }
    }
}
