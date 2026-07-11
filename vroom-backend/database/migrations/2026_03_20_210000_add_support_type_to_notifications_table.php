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

        DB::statement("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
        DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('rdv','formation','alerte_vehicule','abonnement','moderation','transaction','support'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
        DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('rdv','formation','alerte_vehicule','abonnement','moderation','transaction'))");
    }
};
