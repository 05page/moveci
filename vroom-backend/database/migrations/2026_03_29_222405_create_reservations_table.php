<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('vehicule_id')
                  ->constrained('vehicules')
                  ->cascadeOnDelete();

            $table->foreignUuid('client_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            // Statuts possibles d'une réservation
            $table->enum('statut', ['en_attente', 'confirmee', 'annulee', 'expiree'])
                  ->default('en_attente');

            // expires_at = date_disponibilite du véhicule + 5 jours
            // Passé cette date sans transaction → réservation expirée automatiquement
            $table->timestamp('expires_at');

            // Nombre d'annulations du client sur CE véhicule
            // Si >= 2, le client ne peut plus réserver ce véhicule
            $table->unsignedTinyInteger('annulations_count')->default(0);

            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();

            // Un client ne peut avoir qu'une réservation active par véhicule à la fois
            $table->unique(['vehicule_id', 'client_id']);
        });

        // Ajout du statut "réservé" sur la table véhicules
        DB::statement("ALTER TABLE vehicules DROP CONSTRAINT IF EXISTS vehicules_statut_check");
        DB::statement("ALTER TABLE vehicules ADD CONSTRAINT vehicules_statut_check
            CHECK (statut IN ('disponible', 'vendu', 'loué', 'suspendu', 'banni', 'en_transaction', 'réservé'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');

        // Restaure le statut sans "réservé"
        DB::statement("ALTER TABLE vehicules DROP CONSTRAINT IF EXISTS vehicules_statut_check");
        DB::statement("ALTER TABLE vehicules ADD CONSTRAINT vehicules_statut_check
            CHECK (statut IN ('disponible', 'vendu', 'loué', 'suspendu', 'banni', 'en_transaction'))");
    }
};
