<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicules', function (Blueprint $table) {
            $table->dropForeign(['catalogue_id']);
            $table->dropColumn('catalogue_id');
        });

        Schema::dropIfExists('catalogues');
    }

    public function down(): void
    {
        Schema::create('catalogues', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('nom_catalogue', 255);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('vehicules', function (Blueprint $table) {
            $table->foreignUuid('catalogue_id')->nullable()->after('created_by')
                  ->constrained('catalogues')->onDelete('set null');
        });
    }
};
