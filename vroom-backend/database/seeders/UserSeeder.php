<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;


class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //

        User::updateOrCreate(
            ['email' => 'jd@gmail.com'],
            [
                'fullname'               => 'John Doe',
                'telephone'             => "0710121416",
                'adresse'             => "yopougon, selmer",
                'password'               => Hash::make('password_123'),
                'role'                   => 'client',
                'onboarding_completed_at' => now(),
                'email_verified_at' => now(),
            ]
        );
    }
}
