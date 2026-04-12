<?php

namespace App\Console\Commands;

use App\Models\Vehicules;
use Illuminate\Console\Command;

class PasserVehiculesDisponibles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:passer-vehicules-disponibles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Passe les véhicules a_venir en disponible si leur date est atteinte';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        //
        $count = Vehicules::where('statut', 'a_venir')
            ->where('date_disponibilite', '<=', now())->update(['statut' => 'disponible']);
    }
}
