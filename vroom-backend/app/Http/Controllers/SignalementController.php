<?php

namespace App\Http\Controllers;

use App\Models\Notifications;
use App\Models\Signalement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SignalementController extends Controller
{
    // Client — signaler un user ou un véhicule
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cible_user_id'     => 'nullable|uuid|exists:users,id',
            'cible_vehicule_id' => 'nullable|uuid|exists:vehicules,id',
            'motif'             => 'required|string|max:255',
            'description'       => 'nullable|string|max:1000',
        ]);

        if (empty($validated['cible_user_id']) && empty($validated['cible_vehicule_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Vous devez cibler un utilisateur ou un véhicule',
            ], 422);
        }

        // Empêcher de se signaler soi-même
        if (isset($validated['cible_user_id']) && $validated['cible_user_id'] === Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Vous ne pouvez pas vous signaler vous-même'], 422);
        }

        $signalement = Signalement::create([
            'client_id'         => Auth::id(),
            'cible_user_id'     => $validated['cible_user_id'] ?? null,
            'cible_vehicule_id' => $validated['cible_vehicule_id'] ?? null,
            'motif'             => $validated['motif'],
            'description'       => $validated['description'] ?? null,
        ]);

        $cible = isset($validated['cible_vehicule_id']) ? 'un véhicule' : 'un utilisateur';
        Notifications::notifyAdmins(
            Notifications::TYPE_MODERATION,
            'Nouveau signalement',
            Auth::user()->fullname . ' a signalé ' . $cible . ' — motif : ' . $validated['motif'],
            ['signalement_id' => $signalement->id]
        );

        return response()->json([
            'success' => true,
            'message' => 'Signalement envoyé, il sera traité par notre équipe',
            'data'    => $signalement,
        ], 201);
    }

    // Client — ses signalements
    public function mesSignalements(): JsonResponse
    {
        $signalements = Signalement::with(['cibleUser:id,fullname', 'cibleVehicule.description'])
            ->where('client_id', Auth::id())
            ->orderBy('date_signalement', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $signalements], 200);
    }
}
