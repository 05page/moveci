<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Supprime la fonctionnalité d'abonnement (backend complet sans aucune
 * interface : src/actions/abonnements.actions.ts n'était importé nulle part).
 *
 * Chaîne de dépendance :
 *   paiements_abonnement → abonnements → plans_abonnement
 * On supprime de l'enfant vers le parent, on recrée dans l'ordre inverse.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('paiements_abonnement');
        Schema::dropIfExists('abonnements');
        Schema::dropIfExists('plans_abonnement');
    }

    public function down(): void
    {
        // Le parent d'abord : une FK ne peut pointer que sur une table existante.
        Schema::create('plans_abonnement', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nom', 100)->unique();
            $table->text('description')->nullable();
            $table->enum('cible', ['vendeur', 'concessionnaire', 'auto_ecole']);
            $table->decimal('prix_mensuel', 10, 2);
            $table->decimal('prix_annuel', 10, 2);
            $table->integer('nb_postes_max')->default(1);
            $table->integer('nb_annonces_max');
            $table->integer('nb_photos_max');
            $table->boolean('stats_avancees')->default(false);
            $table->boolean('badge_premium')->default(false);
            $table->boolean('boost_annonces')->default(false);
            $table->boolean('acces_leads')->default(false);
            $table->boolean('support_prioritaire')->default(false);
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('abonnements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('plan_id')->constrained('plans_abonnement')->onDelete('restrict');
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->dateTime('date_debut');
            $table->dateTime('date_fin');
            $table->enum('statut', ['actif', 'expiré', 'suspendu', 'résilié']);
            $table->enum('periodicite', ['mensuel', 'annuel']);
            $table->boolean('renouvellement_auto')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('paiements_abonnement', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('abonnement_id')->constrained('abonnements')->onDelete('restrict');
            $table->dateTime('date_paiement');
            $table->decimal('montant', 10, 2);
            $table->enum('methode', ['carte', 'virement', 'mobile_money']);
            $table->enum('statut', ['réussi', 'échoué', 'remboursé', 'en_attente']);
            $table->string('reference_externe', 255)->unique();
            $table->timestamps();
        });

        // Note : down() ne restaure que la structure, pas les données —
        // une suppression de fonctionnalité n'est pas réversible sur ce point.
    }
};
