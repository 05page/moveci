<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Convertit une adresse texte en coordonnées GPS via l'API Nominatim (OpenStreetMap).
 * Gratuit, sans clé API — respecter le rate limit : 1 requête/seconde max.
 */
class GeocodingService
{
    private const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

    /**
     * Retourne ['latitude' => float, 'longitude' => float] ou null si échec.
     */
    public function geocode(string $adresse): ?array
    {
        try {
            $response = Http::withHeaders([
                // Nominatim exige un User-Agent identifiant l'application
                'User-Agent' => 'Move Ci/1.0 (contact@vroomci.com)',
                'Accept-Language' => 'fr',
            ])->get(self::NOMINATIM_URL, [
                'q'              => $adresse,
                'format'         => 'json',
                'limit'          => 1,
                'countrycodes'   => 'ci', // Côte d'Ivoire en priorité
            ]);

            $results = $response->json();

            if (empty($results)) return null;

            return [
                'latitude'  => (float) $results[0]['lat'],
                'longitude' => (float) $results[0]['lon'],
            ];
        } catch (\Throwable $e) {
            Log::warning('GeocodingService: échec géocodage', [
                'adresse' => $adresse,
                'error'   => $e->getMessage(),
            ]);
            return null;
        }
    }
}
