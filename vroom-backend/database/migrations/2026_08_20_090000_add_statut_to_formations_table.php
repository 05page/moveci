<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            // Distinct de `statut_validation` (modération) : `statut` gère la visibilité
            // publique après validation, même logique que `Vehicules::statut`.
            $table->string('statut', 20)->default('disponible')->after('statut_validation');
        });
    }

    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn('statut');
        });
    }
};
