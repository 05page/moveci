<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

test('un client peut se connecter avec des identifiants valides', function () {
    $user = User::factory()->client()->create();
    $response = $this->postJson('api/login',[
        'email' => $user->email,
        'password' =>'password'
    ]);
    $response->assertStatus(200)
             ->assertJsonPath('success', true);
});

test('un client suspendu ne peut pas se connecter', function () {
    $user = User::factory()->client()->suspendu()->create();

    $response = $this->postJson('/api/login', [
        'email'    => $user->email,
        'password' => 'password',
    ]);

    $response->assertStatus(403)
             ->assertJsonPath('success', false);
});

// TODO (à toi) : 'un client ne peut pas se connecter avec un mauvais mot de passe' → 401

test('un client ne peut pas se connecter avec un mauvais mot de passe', function () {
    $user = User::factory()->client()->create();
    $response = $this->postJson('api/login',[
        'email' => $user->email,
        'password' =>'mercon'
    ]);
    $response->assertStatus(401)
             ->assertJsonPath('success', false);
});

test('un client peut s inscrire avec des données valides', function () {
    $response = $this->postJson('/api/register', [
        'fullname'              => 'Jean Testeur',
        'email'                 => 'jean.testeur@example.com',
        'password'              => 'password',
        'password_confirmation' => 'password',
        'role'                  => 'client',
    ]);

    $response->assertStatus(201)
             ->assertJsonPath('success', true)
             ->assertJsonPath('role', 'client');

    $this->assertDatabaseHas('users', [
        'email'  => 'jean.testeur@example.com',
        'role'   => 'client',
        'statut' => User::ACTIF,
    ]);
});

test('l\'onboarding met à jour le role et onboarding_completed_at ensemble', function () {
    Http::fake(); // GeocodingService appelle Nominatim en vrai sinon

    $user = User::factory()->create([
        'role'                    => 'client',
        'onboarding_completed_at' => null,
    ]);

    $response = $this->actingAs($user)->postJson('/api/auth/complete-onboarding', [
        'telephone' => '0102030405',
        'adresse'   => 'Cocody, Abidjan',
        'role'      => 'vendeur',
    ]);

    $response->assertStatus(200);

    $this->assertDatabaseHas('users', [
        'id'   => $user->id,
        'role' => 'vendeur',
    ]);
    $this->assertNotNull($user->fresh()->onboarding_completed_at);
});

test('l\'onboarding échoue si le role n\'est pas client ou vendeur', function () {
    Http::fake();

    $user = User::factory()->create(['onboarding_completed_at' => null]);

    $response = $this->actingAs($user)->postJson('/api/auth/complete-onboarding', [
        'telephone' => '0102030405',
        'adresse'   => 'Cocody, Abidjan',
        'role'      => 'admin',
    ]);

    $response->assertStatus(422);
    $this->assertNull($user->fresh()->onboarding_completed_at);
});