<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réservation annulée</title>
</head>

<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                    {{-- Header --}}
                    <tr>
                        <td style="background:#18181b;padding:28px 40px;text-align:center;">
                            <span style="font-size:26px;font-weight:800;color:#efbf04;letter-spacing:-0.5px;">VROOM</span>
                        </td>
                    </tr>

                    {{-- Bandeau statut --}}
                    <tr>
                        <td style="background:#fef2f2;padding:12px 40px;text-align:center;border-bottom:1px solid #fecaca;">
                            <span style="font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">
                                Réservation annulée
                            </span>
                        </td>
                    </tr>

                    {{-- Photo du véhicule --}}
                    @php
                    $photo = $reservation->vehicule?->photos?->firstWhere('is_primary', true)
                    ?? $reservation->vehicule?->photos?->first();
                    $photoUrl = $photo
                    ? (str_starts_with($photo->path, 'http') ? $photo->path : config('app.url') . '/storage/' . $photo->path)
                    : null;
                    $catalogue = $reservation->vehicule?->catalogue;
                    $nomVehicule = $catalogue
                    ? "{$catalogue->marque} {$catalogue->modele} {$catalogue->annee}"
                    : 'le véhicule réservé';
                    $annulationsRestantes = \App\Models\Reservation::MAX_ANNULATIONS - $reservation->annulations_count;
                    @endphp

                    @if($photoUrl)
                    <tr>
                        <td style="padding:0;">
                            <img src="{{ $photoUrl }}" alt="{{ $nomVehicule }}"
                                style="width:100%;height:240px;object-fit:cover;display:block;filter:grayscale(20%);">
                        </td>
                    </tr>
                    @endif

                    {{-- Corps --}}
                    <tr>
                        <td style="padding:36px 40px;">
                            <p style="margin:0 0 6px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Bonjour,</p>
                            <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;">
                                {{ $reservation->client?->fullname ?? 'Client' }}
                            </h1>

                            <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
                                Votre réservation pour <strong>{{ $nomVehicule }}</strong> a bien été annulée.
                            </p>

                            {{-- Bloc infos --}}
                            <table width="100%" cellpadding="0" cellspacing="0"
                                style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
                                <tr>
                                    <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Véhicule</td>
                                    <td style="font-size:13px;font-weight:600;color:#18181b;text-align:right;padding-bottom:8px;">{{ $nomVehicule }}</td>
                                </tr>
                                <tr>
                                    <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Annulée le</td>
                                    <td style="font-size:13px;font-weight:600;color:#18181b;text-align:right;padding-bottom:8px;">
                                        {{ $reservation->cancelled_at?->format('d/m/Y à H:i') ?? now()->format('d/m/Y à H:i') }}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="font-size:13px;color:#71717a;">Annulations restantes</td>
                                    <td style="font-size:13px;font-weight:600;text-align:right;@if($annulationsRestantes === 0) color:#dc2626; @else color:#18181b; @endif">
                                        {{ $annulationsRestantes }} / {{ \App\Models\Reservation::MAX_ANNULATIONS }}
                                    </td>
                                </tr>
                            </table>
                            
                            {{-- Avertissement si proche du blocage --}}
                            @if($annulationsRestantes === 0)
                            <table width="100%" cellpadding="0" cellspacing="0"
                                style="background:#fef2f2;border-radius:8px;padding:16px 20px;margin-bottom:28px;border-left:3px solid #dc2626;">
                                <tr>
                                    <td style="font-size:13px;color:#dc2626;line-height:1.5;">
                                        <strong>Attention :</strong> vous avez atteint le nombre maximum d'annulations sur ce véhicule.
                                        Toute nouvelle tentative de réservation sera bloquée.
                                    </td>
                                </tr>
                            </table>
                            @elseif($annulationsRestantes === 1)
                            <table width="100%" cellpadding="0" cellspacing="0"
                                style="background:#fffbeb;border-radius:8px;padding:16px 20px;margin-bottom:28px;border-left:3px solid #f59e0b;">
                                <tr>
                                    <td style="font-size:13px;color:#92400e;line-height:1.5;">
                                        <strong>Attention :</strong> il ne vous reste qu'une annulation possible sur ce véhicule.
                                    </td>
                                </tr>
                            </table>
                            @endif

                            {{-- CTA --}}
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="{{ config('app.frontend_url') }}/vehicles"
                                            style="display:inline-block;background:#efbf04;color:#000;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                                            Parcourir les véhicules
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background:#f4f4f5;padding:24px 40px;text-align:center;border-top:1px solid #e4e4e7;">
                            <p style="margin:0;font-size:12px;color:#a1a1aa;">
                                © {{ date('Y') }} Vroom — Tous droits réservés.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>

</html>