<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('statistiques_vendeur');
    }

    public function down(): void
    {
        Schema::create('statistiques_vendeur', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('nb_vues_total')->default(0);
            $table->integer('nb_rdv_total')->default(0);
            $table->integer('nb_rdv_confirmes')->default(0);
            $table->integer('nb_annonces_actives')->default(0);
            $table->date('periode_debut');
            $table->date('periode_fin');
            $table->dateTime('calcule_at');
            $table->timestamps();
        });
    }
};
