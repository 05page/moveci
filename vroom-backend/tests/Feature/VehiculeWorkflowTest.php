<?php

use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicules;

// ── status_validation (modération admin) ───────────────────

test('un admin peut valider un véhicule en attente', function () {
    $admin    = User::factory()->admin()->create();
    $vehicule = Vehicules::factory()->enAttente()->create();

    $response = $this->actingAs($admin)->postJson("/api/admin/vehicules/{$vehicule->id}/valider");

    $response->assertStatus(200)
             ->assertJsonPath('success', true);

    $this->assertDatabaseHas('vehicules', [
        'id'                => $vehicule->id,
        'status_validation' => Vehicules::STATUS_VALIDATED,
    ]);
});

test('un admin peut rejeter un véhicule avec un motif', function () {
    $admin    = User::factory()->admin()->create();
    $vehicule = Vehicules::factory()->enAttente()->create();

    $response = $this->actingAs($admin)->postJson("/api/admin/vehicules/{$vehicule->id}/rejeter", [
        'details' => 'Photos ne correspondent pas au véhicule déclaré',
    ]);

    $response->assertStatus(200)
             ->assertJsonPath('success', true);

    $this->assertDatabaseHas('vehicules', [
        'id'                     => $vehicule->id,
        'status_validation'      => Vehicules::STATUS_REJETEE,
        'description_validation' => 'Photos ne correspondent pas au véhicule déclaré',
    ]);
});

test('rejeter un véhicule sans motif est refusé', function () {
    $admin    = User::factory()->admin()->create();
    $vehicule = Vehicules::factory()->enAttente()->create();

    $response = $this->actingAs($admin)->postJson("/api/admin/vehicules/{$vehicule->id}/rejeter", []);

    $response->assertStatus(422);
});

test('un vendeur ne peut pas valider un véhicule (route réservée aux admins)', function () {
    $vendeur  = User::factory()->vendeur()->create();
    $vehicule = Vehicules::factory()->enAttente()->create();

    $response = $this->actingAs($vendeur)->postJson("/api/admin/vehicules/{$vehicule->id}/valider");

    $response->assertStatus(403);
});

// ── statut (disponibilité) — non-régression réservation ────

test('un véhicule réservé redevient disponible après annulation, et peut être re-réservé', function () {
    $client   = User::factory()->client()->create();
    $vehicule = Vehicules::factory()->create([
        'statut'             => Vehicules::STATUS_A_VENIR,
        'date_disponibilite' => now()->addDay(),
    ]);

    // Première réservation
    $reponse1 = $this->actingAs($client)->postJson('/api/reservations', [
        'vehicule_id' => $vehicule->id,
    ]);
    $reponse1->assertStatus(201);

    $this->assertDatabaseHas('vehicules', ['id' => $vehicule->id, 'statut' => Vehicules::STATUS_RESERVE]);

    $reservation = Reservation::where('vehicule_id', $vehicule->id)->first();

    // Annulation
    $this->actingAs($client)->postJson("/api/reservations/{$reservation->id}/cancel")
        ->assertStatus(200);

    $this->assertDatabaseHas('vehicules', ['id' => $vehicule->id, 'statut' => Vehicules::STATUS_A_VENIR]);

    // Re-réservation par le même client — c'est précisément le bug corrigé le 2026-07-23
    // (UNIQUE(vehicule_id, client_id) bloquait ça après une seule annulation)
    $reponse2 = $this->actingAs($client)->postJson('/api/reservations', [
        'vehicule_id' => $vehicule->id,
    ]);
    $reponse2->assertStatus(201);
});
