<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite (tests) ne supporte pas ALTER ... DROP CONSTRAINT ; la liste finale
        // est déjà présente dans la migration de création — on ignore.
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE vehicules DROP CONSTRAINT IF EXISTS vehicules_statut_check");
        DB::statement("ALTER TABLE vehicules ADD CONSTRAINT vehicules_statut_check
            CHECK (statut IN ('disponible', 'vendu', 'loué', 'a_venir', 'réservé', 'suspendu', 'banni', 'en_transaction'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE vehicules DROP CONSTRAINT IF EXISTS vehicules_statut_check");
        DB::statement("ALTER TABLE vehicules ADD CONSTRAINT vehicules_statut_check
            CHECK (statut IN ('disponible', 'vendu', 'loué', 'a_venir', 'suspendu', 'banni', 'en_transaction'))");
    }
};
