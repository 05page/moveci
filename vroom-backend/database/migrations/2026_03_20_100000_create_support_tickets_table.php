<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('sujet');
            $table->text('message');
            $table->enum('statut', ['ouvert', 'en_cours', 'résolu', 'fermé'])->default('ouvert');
            // Liste alignée sur l'état final du CHECK (cf. migration add_basse) :
            // indispensable pour SQLite (tests) qui ne peut pas modifier un CHECK après coup
            $table->enum('priorite', ['basse', 'normale', 'haute', 'urgente'])->default('normale');
            $table->text('reponse_admin')->nullable();
            $table->foreignUuid('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('repondu_at')->nullable();
            $table->timestamps();
        });
    }

    /** Rollback — supprime la table support_tickets */
    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
