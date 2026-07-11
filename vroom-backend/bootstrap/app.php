<?php

use App\Http\Middleware\CheckUserStatut;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->alias([
            'role'         => RoleMiddleware::class,
            'check.statut' => CheckUserStatut::class,
        ]);
        $middleware->append(HandleCors::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! $request->expectsJson() && ! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof ValidationException) {
                return null;
            }

            // Ce callback court-circuite les conversions natives de Laravel :
            // il faut mapper explicitement les exceptions qui ne portent pas de status HTTP
            $status = match (true) {
                $e instanceof HttpExceptionInterface  => $e->getStatusCode(),
                $e instanceof AuthenticationException => 401,
                $e instanceof AuthorizationException  => 403,
                $e instanceof ModelNotFoundException  => 404,
                default => 500,
            };

            if ($status >= 500) {
                Log::error('Unhandled API exception', [
                    'path' => $request->path(),
                    'method' => $request->method(),
                    'user_id' => optional($request->user())->id,
                    'exception' => $e,
                ]);
            }

            $message = match ($status) {
                401 => 'Votre session a expiré. Connectez-vous à nouveau.',
                403 => "Vous n'êtes pas autorisé à effectuer cette action.",
                404 => 'La ressource demandée est introuvable.',
                409 => "Cette action entre en conflit avec l'état actuel des données.",
                422 => 'Certaines informations sont invalides. Vérifiez le formulaire.',
                429 => 'Trop de tentatives. Réessayez dans quelques instants.',
                default => $status >= 500
                    ? 'Une erreur est survenue. Réessayez dans quelques instants.'
                    : 'Impossible de terminer cette action. Réessayez.',
            };

            return response()->json([
                'success' => false,
                'message' => $message,
            ], $status);
        });
    })->create();
