<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Sur MySQL/MariaDB, enum() crée un type ENUM natif que les migrations
 * "ADD CONSTRAINT CHECK" (syntaxe PostgreSQL) n'ont jamais élargi :
 * les valeurs ajoutées après coup (réservé, suspendu, support, basse...)
 * étaient refusées par le type natif. Cette migration aligne les ENUM
 * natifs sur les listes finales attendues par l'application.
 */
return new class extends Migration
{
    public function up(): void
    {
        // SQLite (tests) : les listes finales sont dans les migrations de création.
        // PostgreSQL : les CHECK des migrations précédentes suffisent.
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'])) {
            return;
        }

        DB::statement("ALTER TABLE vehicules MODIFY COLUMN statut
            ENUM('disponible', 'vendu', 'loué', 'a_venir', 'réservé', 'suspendu', 'banni', 'en_transaction') NOT NULL");

        DB::statement("ALTER TABLE notifications MODIFY COLUMN type
            ENUM('rdv', 'formation', 'alerte_vehicule', 'abonnement', 'moderation', 'transaction', 'support', 'tendance', 'reservation') NOT NULL");

        DB::statement("ALTER TABLE support_tickets MODIFY COLUMN priorite
            ENUM('basse', 'normale', 'haute', 'urgente') NOT NULL DEFAULT 'normale'");
    }

    public function down(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'])) {
            return;
        }

        // Restaure les listes d'origine des migrations de création
        DB::statement("ALTER TABLE vehicules MODIFY COLUMN statut
            ENUM('disponible', 'vendu', 'loué', 'a_venir') NOT NULL");

        DB::statement("ALTER TABLE notifications MODIFY COLUMN type
            ENUM('rdv', 'formation', 'alerte_vehicule', 'abonnement', 'moderation', 'transaction') NOT NULL");

        DB::statement("ALTER TABLE support_tickets MODIFY COLUMN priorite
            ENUM('normale', 'haute', 'urgente') NOT NULL DEFAULT 'normale'");
    }
};
