<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserStatut
{
    /**
     * Bloque toutes les requêtes des utilisateurs suspendus ou bannis.
     * Ce middleware doit être appliqué après auth:sanctum.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->isSuspendu()) {
            return response()->json([
                'success' => false,
                'statut'  => 'suspendu',
                'message' => 'Votre compte est suspendu. Contactez le support.',
            ], 403);
        }

        if ($user?->isBanni()) {
            return response()->json([
                'success' => false,
                'statut'  => 'banni',
                'message' => 'Votre compte a été banni définitivement.',
            ], 403);
        }

        return $next($request);
    }
}
