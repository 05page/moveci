<?php

use App\Http\Controllers\AbonnementController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\TendancesController;
use App\Http\Controllers\CrmController;
use App\Http\Controllers\GeolocalisationController;
use App\Http\Controllers\FormationController;
use App\Http\Controllers\InscriptionFormationController;
use App\Http\Controllers\TransactionConclueController;
use App\Http\Controllers\AlerteController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AvisController;
use App\Http\Controllers\FavoriController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\RendezVousController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\SignalementController;
use App\Http\Controllers\VehiculesController;
use App\Http\Controllers\VendeurStatsController;
use App\Http\Controllers\VersementInscriptionController;
use App\Http\Controllers\ReservationController;
// À créer :
// use App\Http\Controllers\CatalogueController;
// use App\Http\Controllers\FormationController;
// use App\Http\Controllers\InscriptionFormationController;
// use App\Http\Controllers\AbonnementController;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────
// Géolocalisation — accessible sans connexion (visiteurs + clients)
Route::get('/geo/proches', [GeolocalisationController::class, 'proches']);

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

// Catalogue véhicules (public — visiteurs non connectés)
// ->where() contraint {id} à n'accepter que des UUIDs valides,
// évitant que "mes-vehicules" soit capturé par cette route publique
Route::prefix('vehicules')->group(function () {
    Route::get('/',     [VehiculesController::class, 'index']);
    Route::get('/{id}', [VehiculesController::class, 'vehicule'])
        ->where('id', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');
});

// ── Authentifié ───────────────────────────────────────────
// /me sans check.statut — un user banni doit quand même récupérer son statut
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'getInfoUser']);
});

Route::middleware(['auth:sanctum', 'check.statut'])->group(function () {

    // Géolocalisation — mise à jour position (authentifié)
    Route::post('/geo/position',  [GeolocalisationController::class, 'updatePosition']);
    Route::post('/geo/geocode',   [GeolocalisationController::class, 'geocodeAdresse']);
    Route::put('/me/update',               [AuthController::class, 'update']);
    Route::put('/me/contact',              [AuthController::class, 'updatePhoneAndAddress']);
    Route::post('/auth/complete-onboarding', [AuthController::class, 'completeOnboarding']);
    Route::post('/auth/finish-onboarding',   [AuthController::class, 'finishOnboarding']);
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
        });
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
        Route::middleware('role:vendeur,concessionnaire,auto_ecole')->group(function () {
            Route::get('/mes-transactions',        [TransactionConclueController::class, 'mesTransactions']);
            Route::post('/{id}/confirmer-vendeur', [TransactionConclueController::class, 'confirmerVendeur']);
            Route::post('/{id}/refuser-vendeur',   [TransactionConclueController::class, 'refuserVendeur']);
        });
    });

    // Abonnements
    Route::middleware('role:vendeur,concessionnaire,auto_ecole')->prefix('abonnements')->group(function () {
        Route::get('/plans',          [AbonnementController::class, 'plans']);
        Route::get('/mon-abonnement', [AbonnementController::class, 'monAbonnement']);
        Route::post('/souscrire',     [AbonnementController::class, 'souscrire']);
        Route::post('/resilier',      [AbonnementController::class, 'resilier']);
    });

    // ── Support — tous les users authentifiés ──────────────
    Route::prefix('support')->group(function () {
        Route::get('/mes-tickets', [SupportController::class, 'mesTickets']);
        Route::post('/post-tickets', [SupportController::class, 'store']);
    });

    // ── Admin ─────────────────────────────────────────────
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/admins',                     [AdminController::class, 'admins']);
        Route::post('/admins',                    [AdminController::class, 'createAdmin']);
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
        Route::get('/vehicules/corbeille',          [AdminController::class, 'corbeille']);
        Route::post('/vehicules/{id}/restaurer',    [AdminController::class, 'restaurerVehicule']);
        Route::delete('/vehicules/{id}/forcer',     [AdminController::class, 'forcerSupprimerVehicule']);
        Route::get('/signalements',               [AdminController::class, 'signalements']);
        Route::post('/signalements/{id}/traiter', [AdminController::class, 'traiterSignalement']);
        Route::get('/stats',                      [AdminController::class, 'stats']);
        Route::get('/stats/marche',               [AdminController::class, 'statsMarche']);
        Route::get('/stats/geographie',           [AdminController::class, 'statsGeographie']);
        Route::get('/logs',                       [AdminController::class, 'logs']);
        Route::get('/transactions',               [AdminController::class, 'transactions']);
        Route::get('/formations',                 [AdminController::class, 'formations']);
        Route::post('/formations/{id}/valider',   [AdminController::class, 'validerFormation']);
        Route::post('/formations/{id}/rejeter',   [AdminController::class, 'rejeterFormation']);
        Route::get('/support',                     [SupportController::class, 'index']);
        Route::post('/support/{id}/repondre',      [SupportController::class, 'repondre']);
    });
});
