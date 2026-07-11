<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inscriptions_formation', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('client_id')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('formation_id')->constrained('formations')->onDelete('cascade');
            $table->timestamp('date_inscription')->useCurrent();
            // Liste alignée sur l'état final (cf. migration update_statut_eleve_enum) :
            // indispensable pour SQLite (tests) qui ne peut pas modifier un CHECK après coup
            $table->enum('statut_eleve', ['préinscrit', 'paiement_en_cours', 'inscrit', 'en_cours', 'examen_passe', 'terminé', 'abandonné'])->default('préinscrit');
            $table->date('date_examen')->nullable();
            $table->boolean('reussite')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['client_id', 'formation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscriptions_formation');
    }
};
