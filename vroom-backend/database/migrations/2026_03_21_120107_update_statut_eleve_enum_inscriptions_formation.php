<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MODIFY COLUMN est une syntaxe MySQL — SQLite (tests) ne la supporte pas ;
        // la liste finale est déjà présente dans la migration de création — on ignore.
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE inscriptions_formation MODIFY COLUMN statut_eleve ENUM('préinscrit', 'paiement_en_cours', 'inscrit', 'en_cours', 'examen_passe', 'terminé', 'abandonné') DEFAULT 'préinscrit'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE inscriptions_formation MODIFY COLUMN statut_eleve ENUM('inscrit', 'en_cours', 'examen_passe', 'terminé', 'abandonné') DEFAULT 'inscrit'");
    }
};
