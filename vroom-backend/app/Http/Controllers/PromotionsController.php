<?php

namespace App\Http\Controllers;

use App\Models\Formation;
use App\Models\Promotions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Codes de réduction sur les formations.
 *
 * L'auto-école gère ses propres codes (CRUD), le client en valide un
 * avant de s'inscrire pour connaître le prix réel qu'il va payer.
 */
class PromotionsController extends Controller
{
    /**
     * Liste les promotions d'une formation de l'auto-école connectée.
     * GET /formations/{formationId}/promotions
     */
    public function index(string $formationId): JsonResponse
    {
        // 1. Récupérer l'utilisateur connecté avec Auth::user()
        $user = Auth::user();

        // 2. Vérifier que la formation lui appartient :
        Formation::where('id', $formationId)->where('auto_ecole_id', $user->id)->firstOrFail();
        //    firstOrFail() renvoie un 404 automatiquement si ce n'est pas le cas.

        // 3. Récupérer les promotions de cette formation, les plus récentes d'abord :
        $promotions = Promotions::where('formation_id', $formationId)->latest()->get();

        return response()->json(['success' => true, 'data' => $promotions]);
    }

    /**
     * Crée une promotion sur une formation de l'auto-école connectée.
     * POST /formations/{formationId}/promotions
     *
     * Body: { code, type_remise, valeur, date_debut?, date_fin?, usage_max? }
     */
    public function store(Request $request, string $formationId): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'code'         => 'required|string|max:50|unique:promotions,code',
            'type_remise'  => ['required', Rule::in([Promotions::TYPE_POURCENTAGE, Promotions::TYPE_MONTANT_FIXE])],
            'valeur'       => 'required|numeric|min:0',
            'date_debut'   => 'nullable|date',
            'date_fin'     => 'nullable|date|after_or_equal:date_debut',
            'usage_max'    => 'nullable|integer|min:1',
        ]);

        Formation::where('id', $formationId)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail();

        $promotion = Promotions::create([
            'formation_id' => $formationId,
            'code'         => $validated['code'],
            'type_remise'  => $validated['type_remise'],
            'valeur'       => $validated['valeur'],
            'date_debut'   => $validated['date_debut'] ?? null,
            'date_fin'     => $validated['date_fin'] ?? null,
            'usage_max'    => $validated['usage_max'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Promotion créée avec succès',
            'data'    => $promotion,
        ], 201);
    }

    /**
     * Modifie une promotion.
     * PUT /formations/{formationId}/promotions/{promotionId}
     */
    public function update(Request $request, string $formationId, string $promotionId): JsonResponse
    {
        $user = Auth::user();

        $promotion = Promotions::where('id', $promotionId)
            ->where('formation_id', $formationId)
            ->whereHas('formation', fn($q) => $q->where('auto_ecole_id', $user->id))
            ->firstOrFail();

        $validated = $request->validate([
            'code'        => ['sometimes', 'string', 'max:50', Rule::unique('promotions', 'code')->ignore($promotion->id)],
            'type_remise' => ['sometimes', Rule::in([Promotions::TYPE_POURCENTAGE, Promotions::TYPE_MONTANT_FIXE])],
            'valeur'      => 'sometimes|numeric|min:0',
            'date_debut'  => 'sometimes|nullable|date',
            'date_fin'    => 'sometimes|nullable|date|after_or_equal:date_debut',
            'usage_max'   => 'sometimes|nullable|integer|min:1',
            'is_active'   => 'sometimes|boolean',
        ]);

        try {
            $promotion->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Promotion mise à jour',
                'data'    => $promotion,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors de la mise à jour de la promotion.');
        }
    }

    /**
     * Supprime une promotion (soft delete).
     * DELETE /formations/{formationId}/promotions/{promotionId}
     */
    public function destroy(string $formationId, string $promotionId): JsonResponse
    {
        // 1. Même recherche sécurisée qu'en update() (whereHas sur formation)*
        $user = Auth::user();

        $promotion = Promotions::where('id', $promotionId)
            ->where('formation_id', $formationId)
            ->whereHas('formation', fn($q) => $q->where('auto_ecole_id', $user->id))
            ->firstOrFail();

        // 2. Appeler ->delete() : le trait SoftDeletes remplit deleted_at
        $promotion->delete();
        //    au lieu de supprimer la ligne, l'historique est conservé.

        // 3. Retourner un message de confirmation
        return response()->json([
            'success' => true,
            'message' => 'Promotion supprimée'
        ]);
    }

    /**
     * Le client valide un code avant de s'inscrire, pour connaître le prix réel.
     * POST /formations/{formationId}/promotions/valider
     *
     * Body: { code }
     * Réponse: { code, remise, prix_initial, prix_final }
     */
    public function valider(Request $request, string $formationId): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string'
        ]);

        $formation = Formation::findOrFail($formationId);

        // 3. Chercher la promotion avec les scopes du modèle :
        $promotion =   Promotions::where('formation_id', $formationId)
            ->pourCode($validated['code'])
            ->first();

        // 4. Si aucune promotion trouvée → retourner un 404 avec
        if (!$promotion) {
            return response()->json(['success' => false, 'message' => 'Code promo introuvable'], 404);
        }

        // 5. Si $promotion->estValide() est faux → retourner un 422 avec
        if ($promotion->estValide() === false) {
            return response()->json([
                'success' => false,
                'message' => "Ce code promo n'est plus valable"
            ], 422);
        }
        //    (on distingue les deux cas : "n'existe pas" et "existe mais expiré"
        //     ne sont pas la même information pour l'utilisateur)

        $remise = $promotion->calculerRemise($formation->prix);
        $prixFinal = $promotion->prixApresRemise($formation->prix);

        // 7. Retourner les quatre valeurs en JSON.
        return response()->json([
            'success' => true,
            'data' => [
                'code'         => $promotion->code,
                'prix_initial' => $formation->prix,
                'remise'       => $remise,
                'prix_final'   => $prixFinal,
            ]

        ]);
        //    Ne PAS incrémenter usage_count ici : valider n'est pas consommer.
        //    Le compteur s'incrémente au moment de l'inscription effective.
    }
}
