<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\GeocodingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Mail\WelcomeMail;
use Illuminate\Support\Facades\Mail;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function redirect(string $provider)
    {
        if ($provider !== 'google') {
            return response()->json(['error' => 'Unsupported provider'], 400);
        }

        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    public function callback(string $provider)
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');

        // L'utilisateur a cliqué "Annuler" sur l'écran Google → on le renvoie sur /auth
        if (request()->has('error')) {
            return redirect($frontendUrl . '/auth');
        }

        try {
            $socialUser = Socialite::driver('google')->stateless()->user();
            $user = User::updateOrCreate(
                ['google_id' => $socialUser->id],
                [
                    'fullname'          => $socialUser->name,
                    'email'             => $socialUser->email,
                    'avatar'            => $socialUser->avatar,
                    'auth_provider'     => 'google',
                    'password'          => Hash::make(Str::random(24)),
                    'email_verified_at' => now(),
                ]
            );

            // Nouveau user Google = pas encore de rôle → onboarding requis
            $needsOnboarding = $user->wasRecentlyCreated || $user->role === null;

            // Mail de bienvenue uniquement pour les nouveaux comptes Google
            // Le try/catch isole l'envoi — un échec SMTP ne bloque pas la connexion
            if ($user->wasRecentlyCreated) {
                try {
                    Mail::to($user->email)->queue(new WelcomeMail($user));
                } catch (\Exception) {}
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            // Rediriger vers Next.js avec le token pour stockage en cookie httpOnly
            $redirectUrl = config('app.frontend_url', 'http://localhost:3000') . "/api/auth/callback?" . http_build_query([
                'token'            => $token,
                'data'             => $user,
                'role'             => $user->role ?? 'client',
                'statut'           => $user->statut ?? 'actif',
                'needs_onboarding' => $needsOnboarding ? '1' : '0',
            ]);

            return redirect($redirectUrl);
        } catch (\Exception) {
            return redirect($frontendUrl . '/auth?error=auth_failed');
        }
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            if (!Auth::attempt($request->only('email', 'password'))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email ou mot de passe incorrect',
                ], 401);
            }

            /** @var \App\Models\User $user */
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur introuvable.',
                ], 404);
            }

            if (!$user->isActif()) {
                Auth::logout();
                return response()->json([
                    'success' => false,
                    'message' => match ($user->statut) {
                        User::EN_ATTENTE => 'Votre compte est en attente de validation par notre équipe.',
                        User::SUSPENDU   => 'Votre compte a été suspendu.',
                        User::BANNI      => 'Votre compte a été banni.',
                        default          => 'Accès refusé.',
                    },
                ], 403);
            }

            $token = $user->createToken('auth_token')->plainTextToken;
            return response()->json([
                'success' => true,
                'token'   => $token,
                'role'    => $user->role,
                'user'    => $user,
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors de la connexion. Réessayez dans quelques instants.');
        }
    }

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'fullname'      => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:8|confirmed',
            'role'          => 'required|in:client,vendeur,concessionnaire,auto_ecole',
            'telephone'     => 'sometimes|string|max:20',
            'adresse'       => 'sometimes|string|max:500',
            // champs concessionnaire / auto_ecole
            'raison_sociale'  => 'required_if:role,concessionnaire,auto_ecole|string|max:255',
            'rccm'            => 'required_if:role,concessionnaire|string|max:14',
            'numero_agrement' => 'required_if:role,auto_ecole|string|max:50',
        ]);

        $isProfessionnel = in_array($request->role, ['concessionnaire', 'auto_ecole']);

        $user = User::create([
            'fullname'        => $request->fullname,
            'email'           => $request->email,
            'password'        => Hash::make($request->password),
            'role'            => $request->role,
            'statut'          => $isProfessionnel ? User::EN_ATTENTE : User::ACTIF,
            'telephone'       => $request->telephone,
            'adresse'         => $request->adresse,
            'raison_sociale'  => $request->raison_sociale,
            'rccm'            => $request->rccm,
            'numero_agrement' => $request->numero_agrement,
            'onboarding_completed_at'=> now()
        ]);

        try {
            Mail::to($user->email)->queue(new WelcomeMail($user));
        } catch (\Exception) {}

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'role'    => $user->role,
            'user'    => $user,
        ], 201);
    }

    public function updatePhoneAndAddress(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Utilisateur non authentifié'], 401);
            }

            $validatedData = $request->validate([
                'telephone' => 'sometimes|string|max:20',
                'adresse'   => 'sometimes|string|max:500',
            ]);

            DB::beginTransaction();

            $user->update($validatedData);

            // Si l'adresse a changé, on recalcule les coordonnées GPS
            if ($request->filled('adresse') && $request->adresse !== $user->getOriginal('adresse')) {
                $coords = (new GeocodingService())->geocode($request->adresse);
                if ($coords) {
                    $user->update($coords);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Informations utilisateur mises à jour avec succès',
                'user' => $user
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, 'Erreur lors de la mise à jour. Réessayez dans quelques instants.');
        }
    }

    public function completeOnboarding(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Validation conditionnelle — auto_ecole a des champs différents de vendeur/concessionnaire
            if ($user->role === 'auto_ecole') {
                $validated = $request->validate([
                    'raison_sociale'  => 'required|string|max:255',
                    'numero_agrement' => 'required|string|max:50',
                ]);
            } else {
                $validated = $request->validate([
                    'telephone' => 'required|string|max:20',
                    'adresse'   => 'required|string|max:500',
                ]);
            }

            DB::beginTransaction();

            $user->update($validated);

            // Géocoder uniquement si le rôle envoie une adresse (pas auto_ecole)
            if (isset($validated['adresse'])) {
                $coords = (new GeocodingService())->geocode($validated['adresse']);
                if ($coords) {
                    $user->update($coords);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'user'    => $user,
                    'role'    => $user->role,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e, 'Erreur lors de la complétion du profil. Réessayez dans quelques instants.');
        }
    }

    /**
     * Marque l'onboarding comme terminé pour un vendeur ou partenaire.
     * Appelé depuis le wizard frontend sur la dernière étape.
     */
    public function finishOnboarding(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->update(['onboarding_completed_at' => now()]);

        return response()->json([
            'success' => true,
            'data'    => ["user"=> $user->fresh()],
        ]);
    }

    public function getInfoUser(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['success' => false, 'error' => 'Utilisateur non authentifié'], 401);
            }

            return response()->json([
                'success' => true,
                'data' => $user
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des informations utilisateur'
            ], 500);
        }
    }

    public function update(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user || $user->id != Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié ou non autorisé',
                ], 401);
            }

            $data = $request->validate([
                'fullname' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $user->id,
                'telephone' => 'sometimes|string|max:10',
                'adresse' => 'sometimes|string|max:500',
            ]);

            $user->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Utilisateur mis à jour avec succès',
                'data' => $user,
            ], 200);
        } catch (\Exception $e) {
            return $this->serverError($e, "Erreur lors de la mise à jour de l'utilisateur. Réessayez dans quelques instants.");
        }
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Successfully logged out']);
    }
}
