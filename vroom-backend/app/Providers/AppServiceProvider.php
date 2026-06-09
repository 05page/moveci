<?php

namespace App\Providers;

use App\Database\NeonPostgresConnector;
use App\Models\Vehicules;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use App\Policies\VehiculePolicy;
class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind('db.connector.pgsql', NeonPostgresConnector::class);

        // Bind du gateway de paiement — remplacer SimulationPaymentService
        // par StripePaymentService ou CinetPayPaymentService pour le vrai paiement
        $this->app->bind(
            \App\Contracts\PaymentGatewayInterface::class,
            \App\Services\SimulationPaymentService::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Vehicules::class, VehiculePolicy::class);
        // Chargement manuel des canaux Broadcast.
        // On ne passe pas "channels:" à withRouting() dans bootstrap/app.php car
        // cette méthode appelle Broadcast::routes() avec le middleware "web" (session/CSRF)
        // avant de charger channels.php. Le middleware web rejette les tokens Bearer → 403.
        // En chargeant channels.php ici, c'est Broadcast::routes(['middleware' => ['auth:sanctum']])
        // dans channels.php qui s'enregistre en premier, acceptant correctement les tokens Bearer.
        require base_path('routes/channels.php');
    }
}
