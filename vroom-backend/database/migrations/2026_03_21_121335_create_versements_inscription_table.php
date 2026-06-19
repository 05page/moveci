<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('versements_inscription', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
            $table->foreignUuid('inscription_id')
                  ->constrained('inscriptions_formation')
                  ->cascadeOnDelete();
            $table->decimal('montant', 10, 2);
            $table->date('date_versement')->default(DB::raw('(CURDATE())'));
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('versements_inscription');
    }
};
