<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('formation_id')->constrained('formations')->onDelete('cascade');
            $table->string('code', 50)->unique();
            $table->enum('type_remise', ['pourcentage', 'montant_fixe']);
            $table->decimal('valeur', 10, 2);
            $table->date('date_debut')->nullable();
            $table->date('date_fin')->nullable();

            // Quota d'utilisation : usage_max null = illimité.
            // usage_count est incrémenté à chaque inscription qui consomme le code.
            $table->unsignedInteger('usage_max')->nullable();
            $table->unsignedInteger('usage_count')->default(0);

            $table->boolean('is_active')->default(true);
            $table->timestamps(); 
            $table->softDeletes();
            $table->index(['formation_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
