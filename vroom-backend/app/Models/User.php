<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids, SoftDeletes;

    protected $fillable = [
        'fullname',
        'email',
        'password',
        'auth_provider',
        'google_id',
        'google_access_token',
        'google_refresh_token',
        'google_token_expires_at',
        'avatar',
        'role',
        'statut',
        // client
        'telephone',
        'adresse',
        'latitude',
        'longitude',
        // vendeur
        'rccm',
        'note_moyenne',
        'nb_avis',
        // concessionnaire / auto_ecole
        'raison_sociale',
        'badge_officiel',
        'adresse_showroom',
        'taux_reussite',
        'numero_agrement',
        // admin
        'niveau_acces',
        // onboarding
        'onboarding_completed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'google_access_token',
        'google_refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'password'                 => 'hashed',
            'badge_officiel'           => 'boolean',
            'google_access_token'      => 'array',
            'google_token_expires_at'  => 'datetime',
            'onboarding_completed_at'  => 'datetime',
        ];
    }

    // Constantes rôles
    const CLIENT         = 'client';
    const VENDEUR        = 'vendeur';
    const CONCESSIONNAIRE = 'concessionnaire';
    const AUTO_ECOLE     = 'auto_ecole';
    const ADMIN          = 'admin';

    // Constantes statut
    const ACTIF    = 'actif';
    const SUSPENDU = 'suspendu';
    const BANNI    = 'banni';
    const EN_ATTENTE    = 'en_attente';

    // ── Relations
    public function vehicules()
    {
        return $this->hasMany(Vehicules::class, 'created_by');
    }

    public function favoris()
    {
        return $this->hasMany(Favori::class, 'user_id');
    }

    public function alertes()
    {
        return $this->hasMany(Alerte::class, 'user_id');
    }

    public function avisClient()
    {
        return $this->hasMany(Avis::class, 'client_id');
    }

    public function avisVendeur()
    {
        return $this->hasMany(Avis::class, 'vendeur_id');
    }

    public function rendezVousClient()
    {
        return $this->hasMany(RendezVous::class, 'client_id');
    }

    public function rendezVousVendeur()
    {
        return $this->hasMany(RendezVous::class, 'vendeur_id');
    }

    public function formations()
    {
        return $this->hasMany(Formation::class, 'auto_ecole_id');
    }

    public function inscriptions()
    {
        return $this->hasMany(InscriptionFormation::class, 'client_id');
    }

    public function abonnements()
    {
        return $this->hasMany(Abonnement::class, 'user_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notifications::class, 'user_id');
    }

    public function signalements()
    {
        return $this->hasMany(Signalement::class, 'client_id');
    }

    public function logsModeration()
    {
        return $this->hasMany(LogModeration::class, 'admin_id');
    }

    // ── Helpers rôle 
    public function isClient(): bool
    {
        return $this->role === self::CLIENT;
    }
    public function isVendeur(): bool
    {
        return $this->role === self::VENDEUR;
    }
    public function isConcessionnaire(): bool
    {
        return $this->role === self::CONCESSIONNAIRE;
    }
    public function isAutoEcole(): bool
    {
        return $this->role === self::AUTO_ECOLE;
    }
    public function isAdmin(): bool
    {
        return $this->role === self::ADMIN;
    }

    // ── Helpers statut 
    public function suspendre(): void
    {
        $this->statut = self::SUSPENDU;
        $this->save();
    }
    public function bannir(): void
    {
        $this->statut = self::BANNI;
        $this->save();
    }
    public function restaurer(): void
    {
        $this->statut = self::ACTIF;
        $this->save();
    }
    public function enAttente(): void
    {
        $this->statut = self::EN_ATTENTE;
        $this->save();
    }

    public function isSuspendu(): bool
    {
        return $this->statut === self::SUSPENDU;
    }
    public function isBanni(): bool
    {
        return $this->statut === self::BANNI;
    }
    public function isActif(): bool
    {
        return $this->statut === self::ACTIF;
    }
    public function isAttente(): bool
    {
        return $this->statut === self::EN_ATTENTE;
    }

    // ── Scopes rôles
    public function scopeClients($query)
    {
        return $query->where('role', self::CLIENT);
    }
    public function scopeVendeurs($query)
    {
        return $query->where('role', self::VENDEUR);
    }
    public function scopeConcessionnaires($query)
    {
        return $query->where('role', self::CONCESSIONNAIRE);
    }
    public function scopeAutoEcoles($query)
    {
        return $query->where('role', self::AUTO_ECOLE);
    }
    public function scopeAdmins($query)
    {
        return $query->where('role', self::ADMIN);
    }

    // ── Scopes statut
    public function scopeActifs($query)
    {
        return $query->where('statut', self::ACTIF);
    }
    public function scopeSuspendus($query)
    {
        return $query->where('statut', self::SUSPENDU);
    }
    public function scopeBannis($query)
    {
        return $query->where('statut', self::BANNI);
    }
    public function scopeEnAttentes($query)
    {
        return $query->where('statut', self::EN_ATTENTE);
    }
}
