<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fusionne descriptions_formation (relation 1:1) dans formations.
 *
 *   titre  → formations.titre
 *   texte  → formations.description
 *   langue → abandonné (le multilingue est retiré du périmètre)
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Colonnes ajoutées en nullable : MySQL refuse une colonne NOT NULL
        //    sans défaut sur une table qui contient déjà des lignes.
        Schema::table('formations', function (Blueprint $table) {
            $table->string('titre', 255)->nullable()->after('auto_ecole_id');
            $table->text('description')->nullable()->after('titre');
        });

        // 2. Rapatriement des données AVANT toute suppression.
        DB::statement('
            UPDATE formations f
            JOIN descriptions_formation d ON d.formation_id = f.id
            SET f.titre = d.titre, f.description = d.texte
        ');

        // 3. Filet : une formation orpheline de description ne doit pas
        //    rester sans titre, sinon l'affichage front casse.
        DB::table('formations')->whereNull('titre')->update([
            'titre' => DB::raw("CONCAT('Formation permis ', type_permis)"),
        ]);

        Schema::dropIfExists('descriptions_formation');
    }

    public function down(): void
    {
        // Recréation à l'identique de la table d'origine…
        Schema::create('descriptions_formation', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('formation_id')->unique()->constrained('formations')->onDelete('cascade');
            $table->string('titre', 255);
            $table->text('texte');
            $table->string('langue', 10)->default('fr');
            $table->timestamps();
            $table->softDeletes();
        });

        // … puis renvoi des données : un down() qui recrée une table vide
        // n'est pas une annulation, c'est une perte de données déguisée.
        DB::statement("
            INSERT INTO descriptions_formation (id, formation_id, titre, texte, langue, created_at, updated_at)
            SELECT UUID(), f.id, COALESCE(f.titre, ''), COALESCE(f.description, ''), 'fr', NOW(), NOW()
            FROM formations f
        ");

        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn(['titre', 'description']);
        });
    }
};
