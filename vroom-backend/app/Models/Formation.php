<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Formation extends Model
{
    use HasUuids, SoftDeletes, LogsActivity;

    protected $fillable = [
        'auto_ecole_id',
        'titre',
        'description',
        'type_permis',
        'prix',
        'duree_heures',
        'lieu',
        'nombre_places',
        'deroulement',
        'statut_validation',
        'statut',
    ];

    protected $casts = ['prix' => 'decimal:2'];

    // ÉTAPE. Ajoute getActivitylogOptions(): LogOptions, sur le modèle de User::getActivitylogOptions().
    // Champs candidats dans $fillable ci-dessus : titre, prix, statut_validation...
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['titre', 'prix', 'statut_validation', 'statut'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    const STATUT_EN_ATTENTE = 'en_attente';
    const STATUT_VALIDE     = 'validé';
    const STATUT_REJETE     = 'rejeté';

    /** Distinct de STATUT_VALIDE ci-dessus : `statut` gère la visibilité publique APRÈS validation, pas la modération. */
    const STATUT_DISPONIBLE = 'disponible';
    const STATUT_RETIREE    = 'retiree';

    public function autoEcole()
    {
        return $this->belongsTo(User::class, 'auto_ecole_id');
    }
    public function inscriptions()
    {
        return $this->hasMany(InscriptionFormation::class, 'formation_id');
    }
}
