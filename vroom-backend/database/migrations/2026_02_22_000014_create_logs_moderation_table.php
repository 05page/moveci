<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs_moderation', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('admin_id')->constrained('users')->onDelete('cascade');
            $table->string('action', 100); // ex: SUSPEND_USER, REJECT_VEHICLE
            $table->enum('cible_type', ['utilisateur', 'vehicule', 'formation', 'signalement', 'abonnement']);
            $table->string('id_cible'); // UUID ou bigint selon la cible
            $table->text('details')->nullable();
            $table->timestamp('date_action')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs_moderation');
    }
};
