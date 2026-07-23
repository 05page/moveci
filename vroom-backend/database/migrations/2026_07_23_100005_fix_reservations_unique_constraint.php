<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * L'ancienne contrainte UNIQUE(vehicule_id, client_id) était permanente :
 * après une seule annulation, le client ne pouvait plus jamais re-réserver
 * ce véhicule (violation de contrainte SQL au lieu du blocage voulu après
 * 2 annulations). On la remplace par UNIQUE(vehicule_id, active_key), où
 * active_key = client_id uniquement pendant que la réservation est active
 * (en_attente) — NULL sinon. NULL n'est jamais un doublon pour une
 * contrainte UNIQUE, donc le client peut re-réserver après annulation/expiration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->uuid('active_key')->nullable()->after('client_id');
        });

        DB::table('reservations')
            ->where('statut', 'en_attente')
            ->update(['active_key' => DB::raw('client_id')]);

        Schema::table('reservations', function (Blueprint $table) {
            // L'index composite (vehicule_id, client_id) sert de support à la FK
            // sur vehicule_id : il faut un index de remplacement avant de le dropper.
            $table->index('vehicule_id');
            $table->dropUnique(['vehicule_id', 'client_id']);
            $table->unique(['vehicule_id', 'active_key']);
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropUnique(['vehicule_id', 'active_key']);
            $table->unique(['vehicule_id', 'client_id']);
            $table->dropIndex(['vehicule_id']);
            $table->dropColumn('active_key');
        });
    }
};
