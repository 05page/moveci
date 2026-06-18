<?php

namespace App\Http\Controllers;

use App\Mail\ReservationAnnuleeMail;
use App\Models\Reservation;
use App\Models\Vehicules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\JsonResponse;

class ReservationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $validated = $request->validate([
            'vehicule_id' => 'required|uuid|exists:vehicules,id',
        ]);
        $vehiculeId = $validated['vehicule_id'];

        try {
            $vehicule = Vehicules::findOrFail($vehiculeId);

            if (strtolower($vehicule->statut) !== Vehicules::STATUS_A_VENIR) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce véhicule n\'est pas disponible à la réservation.'
                ], 422);
            }

            // La réservation n'est possible que si le véhicule n'est pas encore disponible
            if ($vehicule->date_disponibilite === null || $vehicule->date_disponibilite < now()) { // now() = helper Laravel (Carbon)
                return response()->json([
                    'success' => false,
                    'message' => 'impossible de réserver ce véhicule car il est déjà disponible'
                ], 422);
            }

            // Vérifie si un autre client a déjà une réservation active sur ce véhicule
            $vehiculeDejaReserve = Reservation::where('vehicule_id', $vehiculeId)
                ->where('statut', Reservation::EN_ATTENTE)
                ->exists();

            if ($vehiculeDejaReserve) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce véhicule est déjà réservé par un autre client.'
                ], 422);
            }

            // Vérifie si ce client a déjà une réservation active sur ce véhicule
            $dejaReserve = Reservation::where('vehicule_id', $vehiculeId)
                ->where('client_id', $user->id)
                ->where('statut', Reservation::EN_ATTENTE)
                ->exists();

            if ($dejaReserve) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez déjà une réservation active sur ce véhicule.'
                ], 422);
            }

            if ($user->id === $vehicule->created_by) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous ne pouvez pas réserver votre propre véhicule.'
                ], 403);
            }

            // expires_at = date_disponibilite du véhicule + 5 jours de grâce
            $expiresAt = $vehicule->date_disponibilite
                ->addDays(Reservation::JOURS_GRACE);

            // Transaction DB : on crée la réservation ET on met le véhicule en "réservé" atomiquement
            $reservation = DB::transaction(function () use ($vehicule, $vehiculeId, $user, $expiresAt) {
                $vehicule->update(['statut' => Vehicules::STATUS_RESERVE]);

                return Reservation::create([
                    'vehicule_id' => $vehiculeId,
                    'client_id'   => $user->id,
                    'statut'      => Reservation::EN_ATTENTE,
                    'expires_at'  => $expiresAt,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Véhicule réservé avec succès.',
                'data'    => $reservation
            ], 201);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors de la réservation. Réessayez dans quelques instants.');
        }
    }

    /**
     * Retourne le détail d'une réservation appartenant au client connecté.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $reservation = Reservation::where('id', $id)
                ->where('client_id', Auth::id())
                ->with([
                    'vehicule:id,catalogue_id,post_type,statut,prix,date_disponibilite',
                    'vehicule.catalogue:id,marque,modele,annee',
                    'client:id,fullname,email,telephone',
                ])
                ->firstOrFail();

            return response()->json([
                'success' => true,
                'data'    => $reservation
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Réservation introuvable.'
            ], 404);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du chargement de la réservation. Réessayez dans quelques instants.');
        }
    }

    /**
     * Liste toutes les réservations du client connecté,
     * avec les infos du véhicule associé.
     */
    public function index(): JsonResponse
    {
        try {
            $reservations = Reservation::where('client_id', Auth::id())
                ->with([
                    'vehicule:id,catalogue_id,post_type,statut,prix,date_disponibilite',
                    'vehicule.catalogue:id,marque,modele,annee',
                    'client:id,fullname,email,telephone',
                ])
                ->orderByDesc('created_at')
                ->get();

            return response()->json([
                'success' => true,
                'data'    => $reservations
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du chargement des réservations. Réessayez dans quelques instants.');
        }
    }

    /**
     * Annule une réservation active du client connecté.
     * Incrémente le compteur d'annulations — après 2, le client est bloqué sur ce véhicule.
     * Remet le véhicule en "disponible".
     */
    public function cancel(string $id): JsonResponse
    {
        try {
            $reservation = Reservation::where('id', $id)
                ->where('client_id', Auth::id())
                ->firstOrFail();

            // Impossible d'annuler une réservation déjà terminée
            if ($reservation->statut !== Reservation::EN_ATTENTE) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette réservation ne peut plus être annulée.'
                ], 422);
            }

            // Vérifie si le client est déjà bloqué sur ce véhicule
            if ($reservation->clientEstBloque()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez atteint le nombre maximum d\'annulations sur ce véhicule.'
                ], 403);
            }

            // Transaction DB : on annule la réservation ET on remet le véhicule disponible atomiquement
            DB::transaction(function () use ($reservation) {
                $nouvellesAnnulations = $reservation->annulations_count + 1;

                $reservation->update([
                    'statut'            => Reservation::ANNULEE,
                    'cancelled_at'      => now(),
                    'annulations_count' => $nouvellesAnnulations,
                ]);

                // Remet le véhicule disponible seulement si pas bloqué définitivement
                $reservation->vehicule->update(['statut' => Vehicules::STATUS_DISPONIBLE]);
            });

            // Email de confirmation d'annulation
            $reservation->load(['client', 'vehicule.catalogue', 'vehicule.photos']);
            if ($reservation->client?->email) {
                Mail::to($reservation->client->email)
                    ->send(new ReservationAnnuleeMail($reservation));
            }

            return response()->json([
                'success' => true,
                'message' => 'Réservation annulée avec succès.'
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Réservation introuvable.'
            ], 404);
        } catch (\Exception $e) {
            return $this->serverError($e, "Erreur lors de l'annulation de la réservation. Réessayez dans quelques instants.");
        }
    }
}
