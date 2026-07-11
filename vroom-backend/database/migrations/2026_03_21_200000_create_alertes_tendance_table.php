<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alertes_tendance', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('vehicule_id')->nullable();
            $table->uuid('formation_id')->nullable();
            $table->string('type'); // 'vehicule' | 'formation'
            $table->string('periode'); // 'quotidien' | 'hebdomadaire'
            $table->integer('tranche'); // seuil atteint (ex: 20, 50, 100 pour vues / 5, 10, 20 pour préinscriptions)
            $table->timestamp('notified_at')->useCurrent();

            $table->foreign('vehicule_id')->references('id')->on('vehicules')->cascadeOnDelete();
            $table->foreign('formation_id')->references('id')->on('formations')->cascadeOnDelete();
        });

        // Contrainte CHECK PostgreSQL — SQLite (tests) ne supporte pas ALTER ... ADD CONSTRAINT ;
        // les colonnes restent des strings libres, la validation vit dans l'application.
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE alertes_tendance ADD CONSTRAINT alertes_tendance_type_check CHECK (type IN ('vehicule', 'formation'))");
            DB::statement("ALTER TABLE alertes_tendance ADD CONSTRAINT alertes_tendance_periode_check CHECK (periode IN ('quotidien', 'hebdomadaire'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('alertes_tendance');
    }
};
