<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{
    /**
     * Crée le compte administrateur de la plateforme.
     *
     * Le mot de passe vient de ADMIN_PASSWORD (.env) ; à défaut il est généré
     * aléatoirement et affiché une seule fois dans la console.
     * `?:` et non `??` : une variable d'env déclarée mais vide (ADMIN_PASSWORD=)
     * renvoie une chaîne vide, que `??` laisserait passer comme mot de passe.
     */
    public function run(): void
    {
        $password = env('ADMIN_PASSWORD') ?: Str::random(20);

        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'moveci@moveci.tech')],
            [
                'fullname'                => 'Admin MoveCi',
                'telephone'               => '0102030406',
                'adresse'                 => 'Plateau, Abidjan',
                'password'                => Hash::make($password),
                'role'                    => 'admin',
                'statut'                  => 'actif',
                'email_verified_at'       => now(),
                'onboarding_completed_at' => now(),
            ]
        );

        if (!env('ADMIN_PASSWORD')) {
            $this->command?->warn("ADMIN_PASSWORD non défini — mot de passe généré : {$password}");
        }
    }
}
