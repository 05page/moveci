<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->string('lieu', 255)->nullable()->after('duree_heures');
            $table->unsignedInteger('nombre_places')->nullable()->after('lieu');
            $table->text('deroulement')->nullable()->after('nombre_places');
        });
    }

    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn(['lieu', 'nombre_places', 'deroulement']);
        });
    }
};
