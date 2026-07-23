<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'fullname' => fake()->name(),
            'email'    => fake()->unique()->safeEmail(),
            'role'     => User::CLIENT,
            'statut'   => User::ACTIF,
            'password' => Hash::make('password'),
        ];
    }

    // ── States par rôle ──────────────────────────────────────

    /** Crée un user avec le rôle client */
    public function client(): static
    {
        return $this->state(fn () => [
            'role'      => User::CLIENT,
            'telephone' => fake()->phoneNumber(),
            'adresse'   => fake()->address(),
            'latitude'  => fake()->latitude(),
            'longitude' => fake()->longitude(),
        ]);
    }

    /** Crée un user avec le rôle vendeur */
    public function vendeur(): static
    {
        return $this->state(fn () => [
            'role'         => User::VENDEUR,
            'rccm'         => fake()->numerify('RCCM-####'),
            'note_moyenne' => fake()->randomFloat(1, 0, 5),
            'nb_avis'      => fake()->numberBetween(0, 100),
            'telephone'    => fake()->phoneNumber(),
            'adresse'      => fake()->address(),
            'latitude'     => fake()->latitude(),
            'longitude'    => fake()->longitude(),
        ]);
    }

    /** Crée un user avec le rôle concessionnaire */
    public function concessionnaire(): static
    {
        return $this->state(fn () => [
            'role'             => User::CONCESSIONNAIRE,
            'raison_sociale'   => fake()->company(),
            'badge_officiel'   => fake()->boolean(),
            'adresse_showroom' => fake()->address(),
            'telephone'        => fake()->phoneNumber(),
            'latitude'         => fake()->latitude(),
            'longitude'        => fake()->longitude(),
        ]);
    }

    /** Crée un user avec le rôle auto_ecole */
    public function autoEcole(): static
    {
        return $this->state(fn () => [
            'role'             => User::AUTO_ECOLE,
            'raison_sociale'   => fake()->company(),
            'taux_reussite'    => fake()->numberBetween(50, 100),
            'numero_agrement'  => fake()->numerify('AGR-####'),
            'adresse_showroom' => fake()->address(),
            'telephone'        => fake()->phoneNumber(),
        ]);
    }

    /** Crée un user admin */
    public function admin(): static
    {
        return $this->state(fn () => [
            'role'         => User::ADMIN,
            'niveau_acces' => 'standard',
        ]);
    }

    /** Crée un user suspendu */
    public function suspendu(): static
    {
        return $this->state(fn () => ['statut' => User::SUSPENDU]);
    }
}
