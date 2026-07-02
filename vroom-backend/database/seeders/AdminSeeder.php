<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('ADMIN_PASSWORD') ?? Str::random(20);

        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'moveci@moveci.tech')],
            [
                'fullname'               => 'Admin MoveCi',
                'password'               => Hash::make($password),
                'role'                   => 'admin',
                'niveau_acces'           => 1,
                'onboarding_completed_at'=> now(),
            ]
        );

        if (!env('ADMIN_PASSWORD')) {
            $this->command?->warn("ADMIN_PASSWORD non défini — mot de passe généré : {$password}");
        }
    }
}
