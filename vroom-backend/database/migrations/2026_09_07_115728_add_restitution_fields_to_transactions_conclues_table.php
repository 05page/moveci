<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transactions_conclues', function (Blueprint $table) {
            // Même principe que code_confirmation/expires_at, mais pour la restitution du véhicule
            // en fin de location — cycle distinct, généré plus tard (à l'approche de date_fin_location),
            // jamais réutilisé depuis code_confirmation.
            $table->string('code_restitution', 6)->nullable()->after('code_confirmation');
            $table->timestamp('restitution_expires_at')->nullable()->after('expires_at');
            $table->boolean('restitue_par_vendeur')->default(false)->after('confirme_par_client');
            $table->boolean('restitue_par_client')->default(false)->after('restitue_par_vendeur');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions_conclues', function (Blueprint $table) {
            $table->dropColumn([
                'code_restitution',
                'restitution_expires_at',
                'restitue_par_vendeur',
                'restitue_par_client',
            ]);
        });
    }
};
