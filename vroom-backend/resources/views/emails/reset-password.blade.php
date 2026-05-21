<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation de votre mot de passe</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; color: #18181b; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #18181b; padding: 32px 40px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
        .header span { color: #f97316; }
        .body { padding: 40px; }
        .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
        .text { font-size: 15px; line-height: 1.7; color: #52525b; margin-bottom: 24px; }
        .cta { display: block; width: fit-content; margin: 0 auto 32px; padding: 14px 32px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; }
        .cta:hover { background: #f97316; }
        .divider { border: none; border-top: 1px solid #f4f4f5; margin: 32px 0; }
        .url-fallback { font-size: 12px; color: #a1a1aa; word-break: break-all; line-height: 1.6; }
        .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
        .warning p { font-size: 13px; color: #92400e; }
        .footer { background: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #f4f4f5; }
        .footer p { font-size: 12px; color: #a1a1aa; line-height: 1.6; }
        .footer a { color: #71717a; text-decoration: none; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>M<span>ove</span> CI</h1>
        </div>

        <div class="body">
            <p class="greeting">Bonjour {{ $user->fullname }} 👋</p>

            <p class="text">
                Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte
                <strong>{{ $user->email }}</strong>.
            </p>

            <p class="text">
                Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
                Ce lien est valable <strong>60 minutes</strong>.
            </p>

            <a href="{{ $resetUrl }}" class="cta">
                Réinitialiser mon mot de passe →
            </a>

            <div class="warning">
                <p>🔒 Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne sera pas modifié.</p>
            </div>

            <hr class="divider">

            <p class="url-fallback">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
                {{ $resetUrl }}
            </p>
        </div>

        <div class="footer">
            <p>
                Vous recevez cet email car une demande de réinitialisation a été effectuée sur MoveCi.<br>
                Des questions ? <a href="mailto:support@moveci.tech">support@moveci.tech</a>
            </p>
            <p style="margin-top: 8px;">© {{ date('Y') }} MoveCi · moveci.tech</p>
        </div>
    </div>
</body>
</html>
