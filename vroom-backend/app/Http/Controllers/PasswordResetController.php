<?php

namespace App\Http\Controllers;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Auth\Passwords\PasswordBroker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

class PasswordResetController extends Controller
{
    /**
     * Étape 1 — L'utilisateur fournit son email.
     * On génère un token, on stocke son hash dans password_reset_tokens,
     * et on envoie un email avec un lien vers le frontend.
     *
     * Note sécurité : la réponse est identique qu'un compte existe ou non
     * pour ne pas révéler quelles adresses sont enregistrées.
     */
    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Compte inexistant → réponse neutre (anti-énumération)
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'Si cet email est enregistré, vous recevrez un lien dans quelques minutes.',
            ]);
        }

        // Les comptes Google n'ont pas de mot de passe local
        if ($user->auth_provider === 'google') {
            return response()->json([
                'success' => false,
                'message' => 'Ce compte utilise Google. Connectez-vous via le bouton Google.',
            ], 422);
        }

        /** @var PasswordBroker $broker */
        $broker = Password::broker();

        // Crée (ou renouvelle) le token dans password_reset_tokens
        $token = $broker->createToken($user);

        // Construit l'URL frontend : /auth/reset-password?token=xxx&email=xxx
        $resetUrl = config('app.frontend_url') . '/auth/reset-password?'
            . http_build_query(['token' => $token, 'email' => $user->email]);

        // queue() = asynchrone via le worker cron — ne bloque pas la réponse
        // même si SMTP est lent. Pattern identique aux autres mails du projet.
        try {
            Mail::to($user->email)->queue(new ResetPasswordMail($user, $resetUrl));
        } catch (\Exception $e) {
            Log::warning('ResetPasswordMail queue échoué : ' . $e->getMessage());
            // On laisse passer : le token est créé, l'utilisateur peut réessayer
        }

        return response()->json([
            'success' => true,
            'message' => 'Si cet email est enregistré, vous recevrez un lien dans quelques minutes.',
        ]);
    }

    /**
     * Étape 2 — L'utilisateur soumet son nouveau mot de passe avec le token reçu par email.
     * On vérifie le token (validité + expiration), on met à jour le mot de passe,
     * on supprime le token, et on révoque tous les tokens Sanctum (force re-login).
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'                 => 'required|string',
            'email'                 => 'required|email',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)->first();

        /** @var PasswordBroker $broker */
        $broker = Password::broker();

        // Token invalide ou expiré (expire après 60 min par défaut dans config/auth.php)
        if (!$user || !$broker->tokenExists($user, $request->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Lien invalide ou expiré. Faites une nouvelle demande.',
            ], 422);
        }

        // Met à jour le mot de passe
        $user->update(['password' => Hash::make($request->password)]);

        // Supprime le token de réinitialisation
        $broker->deleteToken($user);

        // Révoque tous les tokens API Sanctum (force re-login sur tous les appareils)
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.',
        ]);
    }
}
