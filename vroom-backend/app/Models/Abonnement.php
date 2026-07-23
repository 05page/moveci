<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Abonnement extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'plan_id', 'user_id', 'date_debut', 'date_fin',
        'statut', 'periodicite', 'renouvellement_auto',
    ];

    protected $casts = [
        'date_debut'          => 'datetime',
        'date_fin'            => 'datetime',
        'renouvellement_auto' => 'boolean',
    ];

    const STATUT_ACTIF    = 'actif';
    const STATUT_EXPIRE   = 'expiré';
    const STATUT_SUSPENDU = 'suspendu';
    const STATUT_RESILIE  = 'résilié';

    public function plan()     { return $this->belongsTo(PlanAbonnement::class, 'plan_id'); }
    public function user()     { return $this->belongsTo(User::class, 'user_id'); }
    public function paiements() { return $this->hasMany(PaiementAbonnement::class, 'abonnement_id'); }

    public function scopeActif($query)   { return $query->where('statut', self::STATUT_ACTIF); }
    public function isActif(): bool      { return $this->statut === self::STATUT_ACTIF; }
    public function isExpire(): bool     { return $this->statut === self::STATUT_EXPIRE; }
}
