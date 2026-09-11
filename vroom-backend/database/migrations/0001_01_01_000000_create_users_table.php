<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('fullname', 500);
            $table->string('email', 255)->unique();
            $table->string('telephone', 20)->nullable();
            $table->string('adresse', 255)->nullable();
            $table->string('password', 255)->nullable(); // NULL si OAuth
            $table->enum('auth_provider', ['local', 'google'])->default('local');
            $table->string('google_id')->nullable()->unique();
            $table->text('google_access_token')->nullable();
            $table->text('google_refresh_token')->nullable();
            $table->timestamp('google_token_expires_at')->nullable();
            $table->string('avatar')->nullable();
            $table->enum('role', ['client', 'vendeur', 'concessionnaire', 'auto_ecole', 'admin'])->default('client');
            $table->enum('statut', ['actif', 'suspendu', 'banni', 'en_attente'])->default('actif');

            // Champs concessionnaire / auto_ecole
            $table->string('raison_sociale', 255)->nullable();

            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->uuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
