<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\TendancesController;
use App\Http\Controllers\CrmController;
use App\Http\Controllers\FormationController;
use App\Http\Controllers\InscriptionFormationController;
use App\Http\Controllers\TransactionConclueController;
use App\Http\Controllers\AlerteController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AvisController;
use App\Http\Controllers\FavoriController;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\PromotionsController;
use App\Http\Controllers\RendezVousController;
use App\Http\Controllers\SignalementController;
use App\Http\Controllers\VehiculesController;
use App\Http\Controllers\VendeurStatsController;
use App\Http\Controllers\VersementInscriptionController;
use App\Http\Controllers\ReservationController;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────
Route::get('/auth/{provider}/redirect',  [AuthController::class, 'redirect']);
Route::get('/auth/{provider}/callback',  [AuthController::class, 'callback']);
Route::post('/auth/exchange',            [AuthController::class, 'exchangeCode']);
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/forgot-password', [\App\Http\Controllers\PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password',  [\App\Http\Controllers\PasswordResetController::class, 'resetPassword']);

// Avis vendeur (public — visible sans connexion)
Route::get('/avis/vendeur/{id}', [AvisController::class, 'avisVendeur']);

// Profil public vendeur/concessionnaire/auto-école — visible sans connexion
Route::get('/users/{id}/profil', [VendeurStatsController::class, 'profil']);

// Vendeurs vedettes de l'accueil — public (app/page.tsx)
Route::get('/vendeurs/vedettes', [VendeurStatsController::class, 'vedettes']);

// Inscription newsletter — public (app/page.tsx, section bas de page)
Route::post('/newsletter', [NewsletterController::class, 'store']);

// Catalogue véhicules (public — visiteurs non connectés)
// ->where() contraint {id} à n'accepter que des UUIDs valides,
// évitant que "mes-vehicules" soit capturé par cette route publique
Route::prefix('vehicules')->group(function () {
    Route::get('/',            [VehiculesController::class, 'index']);
    Route::get('/populaires',  [VehiculesController::class, 'populaires']);
    Route::get('/{id}', [VehiculesController::class, 'vehicule'])
        ->where('id', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');
});

// ── Authentifié ───────────────────────────────────────────
// /me sans check.statut — un user banni doit quand même récupérer son statut
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'getInfoUser']);
});

Route::middleware(['auth:sanctum', 'check.statut'])->group(function () {

    Route::put('/me/update',               [AuthController::class, 'update']);
    Route::post('/me/avatar', [AuthController::class, 'avatarProfile']);
    Route::post('/me/cover-photo', [AuthController::class, 'coverProfile']);
    Route::put('/me/contact',              [AuthController::class, 'updatePhoneAndAddress']);
    Route::put('/me/change-password',      [AuthController::class, 'changePassword']);
    Route::post('/auth/complete-onboarding', [AuthController::class, 'completeOnboarding']);
    Route::post('/logout',                 [AuthController::class, 'logout']);

    // Véhicules — suggestions basées sur les favoris (avant les routes dynamiques)
    Route::get('/vehicules/suggestions', [VehiculesController::class, 'suggestions']);

    // Tendances — agrégats platform-wide ou auto-école
    Route::get('/tendances', [TendancesController::class, 'index']);

    // Véhicules — écriture (vendeurs et partenaires)
    Route::prefix('vehicules')->group(function () {
        Route::middleware('role:vendeur,concessionnaire,auto_ecole')->group(function () {
            Route::get('/mes-vehicules',  [VehiculesController::class, 'mesVehicules']);
            Route::post('/post-vehicule', [VehiculesController::class, 'postVehicules']);
            Route::get('/mon-vehicule/{id}',   [VehiculesController::class, 'monVehicule']);
            Route::put('/{id}',          [VehiculesController::class, 'updateVehicule']);
            Route::delete('/{id}',       [VehiculesController::class, 'deleteVehicule']);
        });
    });

    // Stats vendeur
    Route::middleware('role:vendeur,concessionnaire,auto_ecole')->group(function () {
        Route::get('/stats/mes-stats', [VendeurStatsController::class, 'mesStats']);
    });


    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/mes-notifs',            [NotificationsController::class, 'index']);
        Route::post('/{id}/read',  [NotificationsController::class, 'markAsRead']);
        Route::post('/read-all',   [NotificationsController::class, 'markAsAllRead']);
    });

    // Favoris
    Route::prefix('favoris')->group(function () {
        Route::get('/',                      [FavoriController::class, 'index']);
        Route::post('/{vehiculeId}',         [FavoriController::class, 'store']);
        Route::delete('/{vehiculeId}',       [FavoriController::class, 'destroy']);
    });

    // Alertes
    Route::prefix('alertes')->group(function () {
        Route::get('/',      [AlerteController::class, 'index']);
        Route::post('/',     [AlerteController::class, 'store']);
        Route::put('/{id}',  [AlerteController::class, 'update']);
        Route::delete('/{id}', [AlerteController::class, 'destroy']);
    });

    // Signalements
    Route::prefix('signalements')->group(function () {
        Route::post('/',               [SignalementController::class, 'store']);
        Route::get('/mes-signalements', [SignalementController::class, 'mesSignalements']);
    });

    // Rendez-vous
    Route::prefix('rdv')->group(function () {
        Route::get('/mes-rdv',       [RendezVousController::class, 'mesRdv']);
        Route::post('/',             [RendezVousController::class, 'store']);
        Route::post('/{id}/annuler', [RendezVousController::class, 'annuler']);
        Route::middleware('role:vendeur,concessionnaire,auto_ecole')->group(function () {
            Route::get('/nos-rdv',         [RendezVousController::class, 'nosRdv']);
            Route::post('/{id}/confirmer', [RendezVousController::class, 'confirmer']);
            Route::post('/{id}/refuser',   [RendezVousController::class, 'refuser']);
            Route::post('/{id}/terminer',  [RendezVousController::class, 'terminer']);
        });
    });

    // Transactions (confirmation double)
    // Route::prefix('transactions')->group(function () {
    //     Route::get('/rdv/{rdvId}',       [TransactionController::class, 'parRdv']);
    //     Route::post('/{id}/confirmer',   [TransactionController::class, 'confirmer']);
    // });

    // Avis (écriture — authentifié)
    Route::post('/avis', [AvisController::class, 'store']);

    // ── Messagerie ─────────────────────────────────────────────────────────────
    Route::prefix('conversations')->group(function () {
        Route::get('/unread-count',       [ConversationController::class, 'unreadCount']);
        Route::get('/',                   [ConversationController::class, 'index']);
        Route::post('/',                  [ConversationController::class, 'findOrCreate']);
        Route::get('/{id}/messages',      [ConversationController::class, 'messages']);
        Route::post('/{id}/messages',     [ConversationController::class, 'send']);
        Route::post('/{id}/read',         [ConversationController::class, 'markAsRead']);
        Route::delete('/{id}/messages/{messageId}', [ConversationController::class, 'destroyMessage']);
    });

    // ── Routes à activer une fois les contrôleurs créés ──

    // Formations (auto-école)
    Route::prefix('formations')->group(function () {
        Route::get('/',                    [FormationController::class, 'index']);
        Route::get('/mes-inscriptions',    [InscriptionFormationController::class, 'mesInscriptions']);
        // Routes statiques avant /{id} pour éviter que Laravel capture "mes-formations" comme UUID
        Route::middleware('role:auto_ecole')->group(function () {
            Route::get('/mes-formations',  [FormationController::class, 'mesFormations']);
            Route::get('/mes-inscrits',    [FormationController::class, 'mesInscrits']);
            Route::get('/mes-stats',       [FormationController::class, 'mesStats']);
            Route::post('/',               [FormationController::class, 'store']);
            Route::put('/{id}',            [FormationController::class, 'update']);
            Route::delete('/{id}',         [FormationController::class, 'destroy']);
            Route::get('/{id}/inscrits',   [FormationController::class, 'inscrits']);
            Route::get('/{id}/stats',      [FormationController::class, 'stats']);
            Route::put('/{formationId}/inscrits/{inscriptionId}', [FormationController::class, 'updateInscrit']);
            // Versements d'un élève inscrit
            Route::get('/{formationId}/inscrits/{inscriptionId}/versements',             [VersementInscriptionController::class, 'index']);
            Route::post('/{formationId}/inscrits/{inscriptionId}/versements',            [VersementInscriptionController::class, 'store']);
            Route::delete('/{formationId}/inscrits/{inscriptionId}/versements/{versId}', [VersementInscriptionController::class, 'destroy']);
            // Codes promo — gestion réservée à l'auto-école propriétaire de la formation
            Route::get('/{formationId}/promotions',                  [PromotionsController::class, 'index']);
            Route::post('/{formationId}/promotions',                 [PromotionsController::class, 'store']);
            Route::put('/{formationId}/promotions/{promotionId}',    [PromotionsController::class, 'update']);
            Route::delete('/{formationId}/promotions/{promotionId}', [PromotionsController::class, 'destroy']);
        });
        // Validation d'un code promo : accessible au client qui veut s'inscrire,
        // donc hors du groupe role:auto_ecole. Déclarée avant /{id} car "promotions"
        // et "valider" sont des segments statiques.
        Route::post('/{formationId}/promotions/valider', [PromotionsController::class, 'valider']);

        // Routes dynamiques après les routes statiques pour éviter les conflits UUID
        Route::get('/{id}',                [FormationController::class, 'show']);
        Route::post('/{id}/inscrire',      [InscriptionFormationController::class, 'store']);
        Route::delete('/{id}/inscrire',    [InscriptionFormationController::class, 'destroy']);
    });

    // CRM vendeur
    Route::middleware('role:vendeur,concessionnaire,auto_ecole')->prefix('crm')->group(function () {
        Route::get('/clients',                         [CrmController::class, 'clients']);
        Route::get('/clients/{clientId}',              [CrmController::class, 'clientDetail']);
        Route::post('/clients/{clientId}/notes',       [CrmController::class, 'storeNote']);
        Route::put('/notes/{noteId}',                  [CrmController::class, 'updateNote']);
        Route::delete('/notes/{noteId}',               [CrmController::class, 'destroyNote']);
    });

    // Réservations
    Route::prefix('reservations')->group(function () {
        Route::get('/',          [ReservationController::class, 'index']);
        Route::post('/',         [ReservationController::class, 'store']);
        Route::get('/{id}',      [ReservationController::class, 'show']);
        Route::post('/{id}/cancel', [ReservationController::class, 'cancel']);
    });

    // Transactions conclues
    Route::prefix('transactions-conclues')->group(function () {
        Route::get('/mes-demandes',    [TransactionConclueController::class, 'mesDemandes']);
        Route::post('/{id}/confirmer-client',  [TransactionConclueController::class, 'confirmerClient']);
        Route::post('/{id}/refuser',           [TransactionConclueController::class, 'refuserClient']);
        Route::post('/{id}/restituer-client',  [TransactionConclueController::class, 'restituerClient']);
        // Le vendeur ne confirme plus séparément (confirmer-vendeur/restituer-vendeur supprimées,
        // voir docs/transaction.md §1.3/§2.1) — un seul scan client, via confirmer-client/
        // restituer-client, finalise tout. refuser-vendeur reste : le vendeur garde le droit
        // de refuser explicitement, ce n'est pas une confirmation.
        Route::middleware('role:vendeur,concessionnaire,auto_ecole')->group(function () {
            Route::get('/mes-transactions',        [TransactionConclueController::class, 'mesTransactions']);
            Route::post('/{id}/refuser-vendeur',   [TransactionConclueController::class, 'refuserVendeur']);
        });
    });

    // ── Support — tous les users authentifiés ──────────────
    Route::prefix('support')->group(function () {
        Route::get('/mes-tickets', [SupportController::class, 'mesTickets']);
        Route::post('/post-tickets', [SupportController::class, 'store']);
    });

    // ── Admin ─────────────────────────────────────────────
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/users',                      [AdminController::class, 'users']);
        Route::post('/users/{id}/suspendre',      [AdminController::class, 'suspendre']);
        Route::post('/users/{id}/bannir',         [AdminController::class, 'bannir']);
        Route::post('/users/{id}/restaurer',      [AdminController::class, 'restaurer']);
        Route::post('/users/{id}/valider',        [AdminController::class, 'validerCompte']);
        Route::get('/vehicules',                  [AdminController::class, 'vehicules']);
        Route::get('/vehicules/en-attente',       [AdminController::class, 'vehiculesEnAttente']);
        Route::post('/vehicules/{id}/valider',    [AdminController::class, 'validerVehicule']);
        Route::post('/vehicules/{id}/rejeter',    [AdminController::class, 'rejeterVehicule']);
        Route::post('/vehicules/{id}/suspendre',  [AdminController::class, 'suspendreVehicule']);
        Route::delete('/vehicules/{id}',          [AdminController::class, 'supprimerVehicule']);
        Route::post('/vehicules/{id}/restaurer',    [AdminController::class, 'restaurerVehicule']);
        Route::get('/signalements',               [AdminController::class, 'signalements']);
        Route::post('/signalements/{id}/traiter', [AdminController::class, 'traiterSignalement']);
        Route::get('/stats',                      [AdminController::class, 'stats']);
        Route::get('/stats/marche',               [AdminController::class, 'statsMarche']);
        Route::get('/activity-log',                [AdminController::class, 'activityLog']);
        Route::get('/transactions',               [AdminController::class, 'transactions']);
        Route::get('/formations',                 [AdminController::class, 'formations']);
        Route::get('/formations/{id}',            [AdminController::class, 'formation']);
        Route::post('/formations/{id}/valider',   [AdminController::class, 'validerFormation']);
        Route::post('/formations/{id}/rejeter',   [AdminController::class, 'rejeterFormation']);
        Route::post('/formations/{id}/retirer',   [AdminController::class, 'retirerFormation']);
        Route::post('/formations/{id}/restaurer', [AdminController::class, 'restaurerFormation']);
        Route::get('/support',                     [SupportController::class, 'index']);
        Route::post('/support/{id}/repondre',      [SupportController::class, 'repondre']);
    });
});
