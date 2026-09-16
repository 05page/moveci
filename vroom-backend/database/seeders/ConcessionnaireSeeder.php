<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ConcessionnaireSeeder extends Seeder
{
    /**
     * Crée un concessionnaire de test.
     *
     * `raison_sociale` est le seul champ métier propre aux partenaires
     * (concessionnaire / auto_ecole) — cf. migration create_users_table.
     * Les coordonnées sont mises en dur pour que le partenaire apparaisse
     * immédiatement sur /vendeurs-proches sans dépendre du GeocodingService.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'concession@moveci.tech'],
            [
                'fullname'                => 'Kouassi Bertrand',
                'raison_sociale'          => 'Ivoire Auto Distribution',
                'telephone'               => '0102030405',
                'adresse'                 => 'Boulevard Valéry Giscard d\'Estaing, Marcory, Abidjan',
                'latitude'                => 5.2933,
                'longitude'               => -3.9926,
                'password'                => Hash::make('password_123'),
                'role'                    => 'concessionnaire',
                'statut'                  => 'actif',
                'email_verified_at'       => now(),
                'onboarding_completed_at' => now(),
            ]
        );
    }
}
