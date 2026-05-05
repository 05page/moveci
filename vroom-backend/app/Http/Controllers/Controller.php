<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

abstract class Controller
{
    use AuthorizesRequests;

    protected function serverError(
        Throwable $exception,
        string $message = 'Une erreur est survenue. Réessayez dans quelques instants.',
        array $context = []
    ): JsonResponse {
        Log::error($message, array_merge($context, [
            'user_id' => Auth::id(),
            'exception' => $exception,
        ]));

        return response()->json([
            'success' => false,
            'message' => $message,
        ], 500);
    }
}
