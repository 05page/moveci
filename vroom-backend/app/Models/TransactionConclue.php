<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TransactionConclue extends Model
{
    use HasUuids, LogsActivity;

    protected $table = 'transactions_conclues';

    protected $fillable = [
        'rendez_vous_id',
        'vehicule_id',
        'vendeur_id',
        'client_id',
        'type',
        'prix_final',
        'date_debut_location',
        'date_fin_location',
        'code_confirmation',
        'expires_at',
        'confirme_par_vendeur',
        'confirme_par_client',
        'statut',
        'code_restitution',
        'restitution_expires_at',
        'restitue_par_vendeur',
        'restitue_par_client',
    ];

    protected $casts = [
        'expires_at'              => 'datetime',
        'confirme_par_vendeur'    => 'boolean',
        'confirme_par_client'     => 'boolean',
        'date_debut_location'     => 'date',
        'date_fin_location'       => 'date',
        'restitution_expires_at'  => 'datetime',
        'restitue_par_vendeur'    => 'boolean',
        'restitue_par_client'     => 'boolean',
    ];

    // ÉTAPE. Ajoute getActivitylogOptions(): LogOptions, sur le modèle de User::getActivitylogOptions().
    // Champs candidats dans $fillable ci-dessus : type, prix_final, statut, confirme_par_vendeur, confirme_par_client...
    // 'code_confirmation' est un code de confirmation à usage unique entre client/vendeur — vaut-il vraiment
    // sa place dans un journal d'audit consultable par les admins, comme les tokens Google exclus sur User ?

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['type', 'prix_final', 'statut', 'confirme_par_vendeur', 'confirme_par_client'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
    const STATUT_EN_ATTENTE = 'en_attente';
    const STATUT_CONFIRME   = 'confirmé';
    const STATUT_EXPIRE     = 'expiré';
    const STATUT_REFUSE     = 'refusé';

    // ── Relations ─────────────────────────────────────────
    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class, 'rendez_vous_id');
    }
    public function vehicule()
    {
        return $this->belongsTo(Vehicules::class, 'vehicule_id');
    }
    public function vendeur()
    {
        return $this->belongsTo(User::class, 'vendeur_id');
    }
    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    // ── Scopes ────────────────────────────────────────────
    public function scopeEnAttente($query)
    {
        return $query->where('statut', self::STATUT_EN_ATTENTE);
    }
    public function scopeConfirme($query)
    {
        return $query->where('statut', self::STATUT_CONFIRME);
    }

    // ── Helpers ───────────────────────────────────────────

    /** Génère un code numérique à 6 chiffres. */
    public static function genererCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /** Vérifie si le code est encore valide (non expiré). */
    public function isCodeValide(): bool
    {
        return Carbon::now()->lt($this->expires_at);
    }

    /** Vérifie si les deux parties ont confirmé. */
    public function isDoubleConfirme(): bool
    {
        return $this->confirme_par_vendeur && $this->confirme_par_client;
    }

    /** Vérifie si le code de RESTITUTION est encore valide (non expiré). Distinct de isCodeValide(). */
    public function isCodeRestitutionValide(): bool
    {
        return $this->restitution_expires_at !== null && Carbon::now()->lt($this->restitution_expires_at);
    }

    /** Vérifie si les deux parties ont confirmé la restitution du véhicule. */
    public function isDoubleRestitue(): bool
    {
        return $this->restitue_par_vendeur && $this->restitue_par_client;
    }
}
