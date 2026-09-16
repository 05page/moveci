<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AutoEcoleSeeder extends Seeder
{
    /**
     * Crée une auto-école de test.
     *
     * Structurellement identique au ConcessionnaireSeeder : seul `role` change.
     * Aucune colonne du schéma ne distingue une auto-école d'un concessionnaire.
     * C'est ce compte qui doit servir à tester les formations (FormationController).
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'autoecole@moveci.tech'],
            [
                'fullname'                => 'Aya Marie',
                'raison_sociale'          => 'Auto-École La Réussite',
                'telephone'               => '0505060708',
                'adresse'                 => 'Rue des Jardins, Cocody II Plateaux, Abidjan',
                'latitude'                => 5.3833,
                'longitude'               => -3.9989,
                'password'                => Hash::make('password_123'),
                'role'                    => 'auto_ecole',
                'statut'                  => 'actif',
                'email_verified_at'       => now(),
                'onboarding_completed_at' => now(),
            ]
        );
    }
}
