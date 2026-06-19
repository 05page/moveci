<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE inscriptions_formation MODIFY COLUMN statut_eleve ENUM('préinscrit', 'paiement_en_cours', 'inscrit', 'en_cours', 'examen_passe', 'terminé', 'abandonné') DEFAULT 'préinscrit'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE inscriptions_formation MODIFY COLUMN statut_eleve ENUM('inscrit', 'en_cours', 'examen_passe', 'terminé', 'abandonné') DEFAULT 'inscrit'");
    }
};
