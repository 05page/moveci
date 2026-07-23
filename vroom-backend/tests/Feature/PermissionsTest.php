<?php

use App\Models\User;

// ── Non authentifié ─────────────────────────────────────────

test('un visiteur non connecté ne peut pas accéder à une route protégée par rôle', function () {
    $response = $this->getJson('/api/crm/clients');

    $response->assertStatus(401);
});

// ── role:vendeur,concessionnaire,auto_ecole (CRM) ───────────

test('un client ne peut pas accéder aux routes CRM réservées aux vendeurs', function () {
    $client = User::factory()->client()->create();

    $response = $this->actingAs($client)->getJson('/api/crm/clients');

    $response->assertStatus(403)
             ->assertJsonPath('success', false);
});

test('un vendeur peut accéder aux routes CRM', function () {
    $vendeur = User::factory()->vendeur()->create();

    $response = $this->actingAs($vendeur)->getJson('/api/crm/clients');

    $response->assertStatus(200)
             ->assertJsonPath('success', true);
});

test('un concessionnaire peut aussi accéder aux routes CRM', function () {
    $concessionnaire = User::factory()->concessionnaire()->create();

    $response = $this->actingAs($concessionnaire)->getJson('/api/crm/clients');

    $response->assertStatus(200)
             ->assertJsonPath('success', true);
});

// ── role:auto_ecole (formations) ─────────────────────────────

test('un vendeur ne peut pas créer de formation (route réservée aux auto-écoles)', function () {
    $vendeur = User::factory()->vendeur()->create();

    $response = $this->actingAs($vendeur)->postJson('/api/formations', [
        'type_permis'  => 'B',
        'prix'         => 150000,
        'duree_heures' => 20,
        'titre'        => 'Permis B accéléré',
        'texte'        => 'Formation intensive pour le permis B.',
    ]);

    $response->assertStatus(403);
});

test('une auto-école peut créer une formation', function () {
    $autoEcole = User::factory()->autoEcole()->create();

    $response = $this->actingAs($autoEcole)->postJson('/api/formations', [
        'type_permis'  => 'B',
        'prix'         => 150000,
        'duree_heures' => 20,
        'titre'        => 'Permis B accéléré',
        'texte'        => 'Formation intensive pour le permis B.',
    ]);

    $response->assertStatus(201)
             ->assertJsonPath('success', true);

    $this->assertDatabaseHas('formations', [
        'auto_ecole_id' => $autoEcole->id,
        'type_permis'   => 'B',
    ]);
});
