<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verifications_identite', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');

            $table->enum('type_piece', ['cni', 'passeport']);
            $table->string('photo_piece', 255);

            // Même machine à états que vehicules.status_validation
            $table->enum('statut', ['en_attente', 'validee', 'rejetee'])->default('en_attente');
            $table->text('motif_rejet')->nullable();

            $table->foreignUuid('verifie_par')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('verifie_le')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // La file d'attente admin filtre sur statut ; le blocage de publication sur user_id.
            $table->index(['statut', 'created_at']);
            $table->index('user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            // Champ dérivé : évite une jointure à chaque POST /vehicules. null = non vérifié.
            $table->dateTime('identite_verifiee_le')->nullable()->after('onboarding_completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('identite_verifiee_le');
        });

        Schema::dropIfExists('verifications_identite');
    }
};
