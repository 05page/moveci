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

        // PostgreSQL : ajoute 'basse' à l'enum priorite
        DB::statement("ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priorite_check");
        DB::statement("ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_priorite_check CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priorite_check");
        DB::statement("ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_priorite_check CHECK (priorite IN ('normale', 'haute', 'urgente'))");
    }
};
