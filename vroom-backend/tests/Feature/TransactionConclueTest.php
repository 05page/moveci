<?php

use App\Models\RendezVous;
use App\Models\Signalement;
use App\Models\TransactionConclue;
use App\Models\User;
use App\Models\Vehicules;

// ── Double confirmation ──────────────────────────────────────

test('le client peut confirmer avec le bon code, la transaction reste en attente du vendeur', function () {
    $vendeur  = User::factory()->vendeur()->create();
    $client   = User::factory()->client()->create();
    $vehicule = Vehicules::factory()->vente()->create(['created_by' => $vendeur->id]);
    $rdv      = RendezVous::factory()->confirme()->create([
        'vendeur_id'  => $vendeur->id,
        'client_id'   => $client->id,
        'vehicule_id' => $vehicule->id,
    ]);
    $this->actingAs($vendeur)->postJson("/api/rdv/{$rdv->id}/terminer")->assertStatus(200);
    $transaction = TransactionConclue::where('rendez_vous_id', $rdv->id)->first();

    $response = $this->actingAs($client)->postJson(
        "/api/transactions-conclues/{$transaction->id}/confirmer-client",
        ['code' => $transaction->code_confirmation]
    );

    $response->assertStatus(200)->assertJsonPath('success', true);

    $this->assertDatabaseHas('transactions_conclues', [
        'id'                   => $transaction->id,
        'confirme_par_client'  => true,
        'confirme_par_vendeur' => false,
        'statut'               => TransactionConclue::STATUT_EN_ATTENTE,
    ]);
});

test('le vendeur ne peut pas confirmer avant que le client ait confirmé', function () {
    $vendeur  = User::factory()->vendeur()->create();
    $client   = User::factory()->client()->create();
    $vehicule = Vehicules::factory()->vente()->create(['created_by' => $vendeur->id]);
    $rdv      = RendezVous::factory()->confirme()->create([
        'vendeur_id'  => $vendeur->id,
        'client_id'   => $client->id,
        'vehicule_id' => $vehicule->id,
    ]);
    $this->actingAs($vendeur)->postJson("/api/rdv/{$rdv->id}/terminer")->assertStatus(200);
    $transaction = TransactionConclue::where('rendez_vous_id', $rdv->id)->first();

    $response = $this->actingAs($vendeur)->postJson(
        "/api/transactions-conclues/{$transaction->id}/confirmer-vendeur",
        ['code' => $transaction->code_confirmation]
    );

    $response->assertStatus(422);
});

test('un mauvais code est rejeté', function () {
    $vendeur  = User::factory()->vendeur()->create();
    $client   = User::factory()->client()->create();
    $vehicule = Vehicules::factory()->vente()->create(['created_by' => $vendeur->id]);
    $rdv      = RendezVous::factory()->confirme()->create([
        'vendeur_id'  => $vendeur->id,
        'client_id'   => $client->id,
        'vehicule_id' => $vehicule->id,
    ]);
    $this->actingAs($vendeur)->postJson("/api/rdv/{$rdv->id}/terminer")->assertStatus(200);
    $transaction = TransactionConclue::where('rendez_vous_id', $rdv->id)->first();

    $response = $this->actingAs($client)->postJson(
        "/api/transactions-conclues/{$transaction->id}/confirmer-client",
        ['code' => '000001'] // code volontairement faux (le vrai code généré diffère de manière écrasement probable)
    );

    $response->assertStatus(422);

    $this->assertDatabaseHas('transactions_conclues', [
        'id'                  => $transaction->id,
        'confirme_par_client' => false,
    ]);
});

test('la double confirmation (client puis vendeur) finalise la transaction et marque le véhicule vendu', function () {
    $vendeur  = User::factory()->vendeur()->create();
    $client   = User::factory()->client()->create();
    $vehicule = Vehicules::factory()->vente()->create(['created_by' => $vendeur->id]);
    $rdv      = RendezVous::factory()->confirme()->create([
        'vendeur_id'  => $vendeur->id,
        'client_id'   => $client->id,
        'vehicule_id' => $vehicule->id,
    ]);
    $this->actingAs($vendeur)->postJson("/api/rdv/{$rdv->id}/terminer")->assertStatus(200);
    $transaction = TransactionConclue::where('rendez_vous_id', $rdv->id)->first();

    $this->actingAs($client)->postJson(
        "/api/transactions-conclues/{$transaction->id}/confirmer-client",
        ['code' => $transaction->code_confirmation]
    )->assertStatus(200);

    $response = $this->actingAs($vendeur)->postJson(
        "/api/transactions-conclues/{$transaction->id}/confirmer-vendeur",
        ['code' => $transaction->code_confirmation]
    );

    $response->assertStatus(200)->assertJsonPath('success', true);

    $this->assertDatabaseHas('transactions_conclues', [
        'id'     => $transaction->id,
        'statut' => TransactionConclue::STATUT_CONFIRME,
    ]);

    $this->assertDatabaseHas('vehicules', [
        'id'     => $vehicule->id,
        'statut' => Vehicules::STATUS_VENDU,
    ]);
});

// ── Refus ─────────────────────────────────────────────────────

test('le client peut refuser une transaction, le véhicule redevient disponible', function () {
    $vendeur  = User::factory()->vendeur()->create();
    $client   = User::factory()->client()->create();
    $vehicule = Vehicules::factory()->vente()->create(['created_by' => $vendeur->id]);
    $rdv      = RendezVous::factory()->confirme()->create([
        'vendeur_id'  => $vendeur->id,
        'client_id'   => $client->id,
        'vehicule_id' => $vehicule->id,
    ]);
    $this->actingAs($vendeur)->postJson("/api/rdv/{$rdv->id}/terminer")->assertStatus(200);
    $transaction = TransactionConclue::where('rendez_vous_id', $rdv->id)->first();

    $response = $this->actingAs($client)->postJson("/api/transactions-conclues/{$transaction->id}/refuser");

    $response->assertStatus(200)->assertJsonPath('success', true);

    $this->assertDatabaseHas('transactions_conclues', [
        'id'     => $transaction->id,
        'statut' => TransactionConclue::STATUT_REFUSE,
    ]);
    $this->assertDatabaseHas('vehicules', [
        'id'     => $vehicule->id,
        'statut' => Vehicules::STATUS_DISPONIBLE,
    ]);
});

test('le vendeur qui refuse une transaction est pénalisé (signalement auto + compteur incrémenté)', function () {
    $vendeur  = User::factory()->vendeur()->create();
    $client   = User::factory()->client()->create();
    $vehicule = Vehicules::factory()->vente()->create(['created_by' => $vendeur->id]);
    $rdv      = RendezVous::factory()->confirme()->create([
        'vendeur_id'  => $vendeur->id,
        'client_id'   => $client->id,
        'vehicule_id' => $vehicule->id,
    ]);
    $this->actingAs($vendeur)->postJson("/api/rdv/{$rdv->id}/terminer")->assertStatus(200);
    $transaction = TransactionConclue::where('rendez_vous_id', $rdv->id)->first();

    $response = $this->actingAs($vendeur)->postJson("/api/transactions-conclues/{$transaction->id}/refuser-vendeur");

    $response->assertStatus(200)->assertJsonPath('success', true);

    $this->assertDatabaseHas('transactions_conclues', [
        'id'     => $transaction->id,
        'statut' => TransactionConclue::STATUT_REFUSE,
    ]);
    $this->assertDatabaseHas('vehicules', [
        'id'     => $vehicule->id,
        'statut' => Vehicules::STATUS_DISPONIBLE,
    ]);
    $this->assertDatabaseHas('signalements', [
        'cible_user_id' => $vendeur->id,
        'motif'         => 'transaction_non_confirmee',
    ]);

    expect($vendeur->fresh()->nb_refus_transaction)->toBe(1);
});
