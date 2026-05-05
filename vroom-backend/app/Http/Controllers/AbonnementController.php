<?php

namespace App\Http\Controllers;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Abonnement;
use App\Models\PaiementAbonnement;
use App\Models\PlanAbonnement;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AbonnementController extends Controller
{
    public function __construct(private readonly PaymentGatewayInterface $payment) {}

    /**
     * Retourne les plans disponibles filtrés par rôle de l'utilisateur connecté.
     * GET /abonnements/plans
     */
    public function plans(): JsonResponse
    {
        $user = Auth::user();

        $query = PlanAbonnement::actif();

        // Filtre les plans selon le rôle : un vendeur ne voit pas les plans concessionnaire
        match ($user->role) {
            'vendeur'         => $query->pourVendeur(),
            'concessionnaire' => $query->pourConcessionnaire(),
            'auto_ecole'      => $query->pourAutoEcole(),
            default           => null,
        };

        return response()->json([
            'success' => true,
            'data'    => $query->get(),
        ]);
    }

    /**
     * Retourne l'abonnement actif de l'utilisateur connecté (avec son plan).
     * GET /abonnements/mon-abonnement
     */
    public function monAbonnement(): JsonResponse
    {
        $user = Auth::user();

        $abonnement = Abonnement::with('plan')
            ->where('user_id', $user->id)
            ->actif()
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'data'    => $abonnement, // null si aucun abonnement actif
        ]);
    }

    /**
     * Souscrit à un plan (déclenche le paiement simulé, crée l'abonnement).
     * POST /abonnements/souscrire
     *
     * Body: { plan_id, periodicite: "mensuel"|"annuel" }
     */
    public function souscrire(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'plan_id'     => 'required|uuid|exists:plans_abonnement,id',
            'periodicite' => 'required|in:mensuel,annuel',
        ]);

        $plan = PlanAbonnement::findOrFail($validated['plan_id']);

        // Vérifie que le plan correspond au rôle de l'utilisateur
        if ($plan->cible !== $user->role) {
            return response()->json([
                'success' => false,
                'message' => 'Ce plan n\'est pas disponible pour votre profil',
            ], 403);
        }

        // Calcule le montant et la durée selon la périodicité
        $montant   = $validated['periodicite'] === 'annuel' ? $plan->prix_annuel : $plan->prix_mensuel;
        $dateFin   = $validated['periodicite'] === 'annuel'
            ? Carbon::now()->addYear()
            : Carbon::now()->addMonth();

        // Référence interne unique pour cette transaction
        $reference = 'ABN-' . strtoupper(substr((string) $plan->id, 0, 8));

        DB::beginTransaction();
        try {
            // Initie le paiement via le gateway injecté (simulation ou Stripe plus tard)
            $paiementResult = $this->payment->initiate($montant, $reference, [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
            ]);

            if (!$paiementResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Échec du paiement : ' . $paiementResult['message'],
                ], 402);
            }

            // Résilie l'éventuel abonnement actif avant d'en créer un nouveau
            Abonnement::where('user_id', $user->id)
                ->actif()
                ->update(['statut' => Abonnement::STATUT_RESILIE]);

            // Crée le nouvel abonnement
            $abonnement = Abonnement::create([
                'plan_id'             => $plan->id,
                'user_id'             => $user->id,
                'date_debut'          => Carbon::now(),
                'date_fin'            => $dateFin,
                'statut'              => Abonnement::STATUT_ACTIF,
                'periodicite'         => $validated['periodicite'],
                'renouvellement_auto' => false,
            ]);

            // Trace le paiement (historique comptable)
            PaiementAbonnement::create([
                'abonnement_id'     => $abonnement->id,
                'date_paiement'     => Carbon::now(),
                'montant'           => $montant,
                'methode'           => $this->payment->getName() === 'simulation' ? 'carte' : $this->payment->getName(),
                'statut'            => 'réussi',
                'reference_externe' => $paiementResult['transaction_ref'],
            ]);

            DB::commit();

            return response()->json([
                'success'     => true,
                'message'     => 'Abonnement activé avec succès',
                'data'        => $abonnement->load('plan'),
                'gateway'     => $this->payment->getName(),
                'transaction' => $paiementResult['transaction_ref'],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la souscription',
            ], 500);
        }
    }

    /**
     * Résilie l'abonnement actif de l'utilisateur.
     * POST /abonnements/resilier
     */
    public function resilier(): JsonResponse
    {
        $user = Auth::user();

        $abonnement = Abonnement::where('user_id', $user->id)->actif()->latest()->first();

        if (!$abonnement) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun abonnement actif à résilier',
            ], 404);
        }

        $abonnement->update(['statut' => Abonnement::STATUT_RESILIE]);

        return response()->json([
            'success' => true,
            'message' => 'Abonnement résilié',
        ]);
    }
}
