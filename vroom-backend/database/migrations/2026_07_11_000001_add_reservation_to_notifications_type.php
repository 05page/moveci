<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute 'reservation' au CHECK notifications_type_check.
 * Le job SendReservationReminders crée des notifications de ce type
 * mais aucune migration ne l'avait ajouté à la contrainte → violation en prod.
 */
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
        DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
            CHECK (type IN ('rdv', 'formation', 'alerte_vehicule', 'abonnement', 'moderation', 'transaction', 'support', 'tendance', 'reservation'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
        DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
            CHECK (type IN ('rdv', 'formation', 'alerte_vehicule', 'abonnement', 'moderation', 'transaction', 'support', 'tendance'))");
    }
};
