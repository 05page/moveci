<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class VendeurSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //

        User::updateOrCreate(
            ['email' => 'js@gmail.com'],
            [
                'fullname'               => 'John seller',
                'telephone'             => "0708091012",
                'adresse'             => "yopougon, maroc",
                'password'               => Hash::make('password_123'),
                'role'                   => 'vendeur',
                'onboarding_completed_at' => now(),
                'email_verified_at' => now(),
            ]
        );
    }
}
