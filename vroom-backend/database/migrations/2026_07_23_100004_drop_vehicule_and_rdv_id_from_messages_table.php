<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['vehicule_id']);
            $table->dropIndex(['rdv_id']);
            $table->dropForeign(['vehicule_id']);
            $table->dropForeign(['rdv_id']);
            $table->dropColumn(['vehicule_id', 'rdv_id']);
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->foreignUuid('vehicule_id')->nullable()->constrained('vehicules')->onDelete('cascade');
            $table->foreignUuid('rdv_id')->nullable()->constrained('rendez_vous')->onDelete('cascade');
            $table->index('vehicule_id');
            $table->index('rdv_id');
        });
    }
};
