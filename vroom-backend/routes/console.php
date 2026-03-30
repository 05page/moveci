<?php

use App\Jobs\ExpireReservations;
use App\Jobs\SendReservationReminders;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Vérifie toutes les heures les pics de vues (véhicules) et de préinscriptions (formations).
 * Notifie le propriétaire quand un seuil fixe est franchi pour la première fois
 * sur la journée (reset à minuit) ou la semaine (reset le lundi).
 */
Schedule::command('tendances:check')->hourly();

/*
 * Traite les transactions expirées toutes les heures :
 * déverrouille les véhicules bloqués et pénalise les vendeurs qui n'ont pas confirmé.
 */
Schedule::command('transactions:expirer')->hourly();
Schedule::command('sanctum:pruned-expired --hours=168')->daily();
Schedule::job(new ExpireReservations())->daily();
Schedule::job(new SendReservationReminders())->daily();