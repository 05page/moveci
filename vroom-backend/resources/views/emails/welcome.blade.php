<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue sur MoveCi</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; color: #18181b; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #18181b; padding: 32px 40px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
        .header span { color: #efbf04; }
        .body { padding: 40px; }
        .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
        .text { font-size: 15px; line-height: 1.7; color: #52525b; margin-bottom: 24px; }
        .role-badge { display: inline-block; padding: 4px 14px; border-radius: 99px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
        .role-client      { background: #fff7ed; color: #ea580c; }
        .role-vendeur     { background: #f0fdf4; color: #16a34a; }
        .role-pro         { background: #eff6ff; color: #2563eb; }
        .cta { display: block; width: fit-content; margin: 0 auto 32px; padding: 14px 32px; background: #efbf04; color: #18181b; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; }
        .divider { border: none; border-top: 1px solid #f4f4f5; margin: 32px 0; }
        .features { display: grid; gap: 16px; margin-bottom: 32px; }
        .feature { display: flex; gap: 12px; align-items: flex-start; }
        .feature-icon { font-size: 20px; flex-shrink: 0; }
        .feature-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
        .feature-desc { font-size: 13px; color: #71717a; }
        .footer { background: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #f4f4f5; }
        .footer p { font-size: 12px; color: #a1a1aa; line-height: 1.6; }
        .footer a { color: #71717a; text-decoration: none; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>Move<span>Ci</span></h1>
        </div>

        <div class="body">
            <p class="greeting">Bonjour {{ $user->fullname }} </p>

            @php
                $roleLabel = match($user->role) {
                    'vendeur'          => 'Vendeur',
                    'concessionnaire'  => 'Concessionnaire',
                    'auto_ecole'       => 'Auto-école',
                    default            => 'Client',
                };
                $roleClass = match($user->role) {
                    'vendeur'                        => 'role-vendeur',
                    'concessionnaire', 'auto_ecole'  => 'role-pro',
                    default                          => 'role-client',
                };
            @endphp

            <span class="role-badge {{ $roleClass }}">{{ $roleLabel }}</span>

            <p class="text">
                Bienvenue sur <strong>MoveCi</strong>, la marketplace automobile ivoirienne.
                Votre compte est maintenant actif et prêt à l'emploi.
            </p>

            @if($user->role === 'vendeur')
                <p class="text">
                    En tant que vendeur, vous pouvez dès maintenant publier vos annonces et gérer vos rendez-vous depuis votre tableau de bord.
                </p>
            @elseif(in_array($user->role, ['concessionnaire', 'auto_ecole']))
                <p class="text">
                    Votre compte professionnel est en cours de validation par notre équipe. Vous recevrez un email dès qu'il sera activé.
                </p>
            @else
                <p class="text">
                    Explorez des milliers de véhicules, sauvegardez vos favoris et prenez rendez-vous directement avec les vendeurs.
                </p>
            @endif

            <a href="{{ config('app.frontend_url') }}" class="cta" style="color: #18181b;">
                Accéder à MoveCi →
            </a>

            <hr class="divider">

            <div class="features">
                <div class="feature">
                    <span class="feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#efbf04" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></span>
                    <div>
                        <p class="feature-title">Catalogue complet</p>
                        <p class="feature-desc">Des milliers de véhicules disponibles à l'achat et à la location.</p>
                    </div>
                </div>
                <div class="feature">
                    <span class="feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#efbf04" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
                    <div>
                        <p class="feature-title">Rendez-vous en ligne</p>
                        <p class="feature-desc">Planifiez vos essais directement sur la plateforme.</p>
                    </div>
                </div>
                <div class="feature">
                    <span class="feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#efbf04" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></span>
                    <div>
                        <p class="feature-title">Annonces vérifiées</p>
                        <p class="feature-desc">Chaque véhicule est analysé par notre IA avant publication.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>
                Vous recevez cet email car vous venez de créer un compte sur MoveCi.<br>
                Des questions ? <a href="mailto:support@moveci.tech">support@moveci.tech</a>
            </p>
            <p style="margin-top: 8px;">© {{ date('Y') }} MoveCi · moveci.tech</p>
        </div>
    </div>
</body>
</html>
