<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class RendezVous extends Model
{
    use HasUuids, HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'rendez_vous';

    protected $fillable = [
        'client_id',
        'vendeur_id',
        'vehicule_id',
        'date_heure',
        'type',
        'statut',
        'motif',
        'lieu',
        'notes',
        'google_event_id',
    ];

    protected $casts = ['date_heure' => 'datetime'];

    // ÉTAPE. Ajoute getActivitylogOptions(): LogOptions, sur le modèle de User::getActivitylogOptions().
    // Champs candidats dans $fillable ci-dessus : date_heure, type, statut, motif, lieu...
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['date_heure', 'type', 'statut', 'motif', 'lieu'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    const TYPE_VISITE             = 'visite';
    const TYPE_ESSAI_ROUTIER      = 'essai_routier';
    const TYPE_PREMIERE_RENCONTRE = 'premiere_rencontre';

    const STATUT_EN_ATTENTE = 'en_attente';
    const STATUT_CONFIRME   = 'confirmé';
    const STATUT_REFUSE     = 'refusé';
    const STATUT_ANNULE     = 'annulé';
    const STATUT_TERMINE    = 'terminé';

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }
    public function vendeur()
    {
        return $this->belongsTo(User::class, 'vendeur_id');
    }
    public function vehicule()
    {
        return $this->belongsTo(Vehicules::class, 'vehicule_id');
    }
    public function messages()
    {
        return $this->hasMany(Messages::class, 'rdv_id');
    }

    public function scopeEnAttente($query)
    {
        return $query->where('statut', self::STATUT_EN_ATTENTE);
    }
    public function scopeConfirme($query)
    {
        return $query->where('statut', self::STATUT_CONFIRME);
    }
    public function scopeTermine($query)
    {
        return $query->where('statut', self::STATUT_TERMINE);
    }

    public function confirmer(): void
    {
        $this->statut = self::STATUT_CONFIRME;
        $this->save();
    }
    public function refuser(): void
    {
        $this->statut = self::STATUT_REFUSE;
        $this->save();
    }
    public function annuler(): void
    {
        $this->statut = self::STATUT_ANNULE;
        $this->save();
    }
    public function terminer(): void
    {
        $this->statut = self::STATUT_TERMINE;
        $this->save();
    }
}
