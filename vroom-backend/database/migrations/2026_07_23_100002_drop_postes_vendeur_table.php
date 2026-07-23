<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('postes_vendeur');
    }

    public function down(): void
    {
        Schema::create('postes_vendeur', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('abonnement_id')->constrained('abonnements')->onDelete('cascade');
            $table->foreignUuid('vendeur_id')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('nom_poste', 100);
            $table->string('email_poste', 255)->unique();
            $table->enum('role_poste', ['gestionnaire', 'commercial', 'comptable']);
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }
};
