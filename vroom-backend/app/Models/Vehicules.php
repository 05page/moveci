<?php

namespace App\Models;

use App\Events\VehiculeValidated;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vehicules extends Model
{
    use HasUuids, HasFactory, SoftDeletes;

    protected $table = 'vehicules';

    protected $fillable = [
        'created_by',
        'post_type',
        'type',
        'statut',
        'prix',
        'prix_suggere',
        'negociable',
        'date_disponibilite',
        'status_validation',
        'description_validation',
        'withdraw_by',
        'views_count',
        'deleted_by',
    ];

    protected $casts = [
        'negociable'         => 'boolean',
        'prix'               => 'decimal:2',
        'prix_suggere'       => 'decimal:2',
        'date_disponibilite' => 'date',
    ];

    const POST_TYPE_VENTE    = 'vente';
    const POST_TYPE_LOCATION = 'location';
    const VEHICLE_TYPE_NEUF     = 'neuf';
    const VEHICLE_TYPE_OCCASION = 'occasion';
    const STATUS_DISPONIBLE     = 'disponible';
    const STATUS_A_VENIR        = 'a_venir';
    const STATUS_RESERVE        = 'réservé';
    const STATUS_VENDU          = 'vendu';
    const STATUS_LOUE           = 'loué';
    const STATUS_SUSPENDU       = 'suspendu';
    const STATUS_BANNI          = 'banni';
    // Véhicule temporairement verrouillé le temps qu'une transaction soit confirmée.
    // Empêche de nouveaux RDV et masque l'annonce du catalogue.
    const STATUS_EN_TRANSACTION = 'en_transaction';
    const STATUS_VALIDATED  = 'validee';
    const STATUS_REJETEE    = 'rejetee';
    const STATUS_PENDING    = 'en_attente';
    const STATUS_RESTAURER  = 'restauree';

    /**
     * Boot du modèle : accroche les événements du cycle de vie Eloquent.
     */
    protected static function boot(): void
    {
        parent::boot();

        // Se déclenche après chaque mise à jour d'un véhicule en base
        static::updated(function (Vehicules $vehicule) {
            // wasChanged() vérifie si la colonne a changé lors de ce save()
            // On broadcast seulement quand la validation passe à 'validee' ou 'restauree'
            if ($vehicule->wasChanged('status_validation') &&
                in_array($vehicule->status_validation, ['validee', 'restauree'])) {
                VehiculeValidated::dispatch($vehicule);
            }
        });
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    public function description()
    {
        return $this->hasOne(VehiculesDescription::class, 'vehicule_id');
    }
    public function photos()
    {
        return $this->hasMany(VehiculesPhotos::class, 'vehicule_id');
    }
    public function favoris()
    {
        return $this->hasMany(Favori::class, 'vehicule_id');
    }
    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class, 'vehicule_id');
    }
    public function signalements()
    {
        return $this->hasMany(Signalement::class, 'cible_vehicule_id');
    }
    public function vues()
    {
        return $this->hasMany(VehiculeVue::class, 'vehicule_id');
    }

    public function scopeDisponible($query)
    {
        return $query->where('statut', 'disponible');
    }

    public function scopeAVenir($query)
    {
        return $query->where('statut', 'a_venir');
    }

    public function scopeNeuf($query)
    {
        return $query->where('type', 'neuf');
    }
    public function scopeOccasion($query)
    {
        return $query->where('type', 'occasion');
    }
    public function scopeVente($query)
    {
        return $query->where('post_type', 'vente');
    }
    public function scopeLocation($query)
    {
        return $query->where('post_type', 'location');
    }
    public function scopeValidee($query)
    {
        return $query->where('status_validation', 'validee');
    }
    public function scopeEnAttente($query)
    {
        return $query->where('status_validation', 'en_attente');
    }
    public function scopeRejetee($query)
    {
        return $query->where('status_validation', 'rejetee');
    }

    public function suspendre(): void
    {
        $this->status_validation = self::STATUS_SUSPENDU;
        $this->save();
    }
    public function restaurer(): void
    {
        $this->status_validation = self::STATUS_RESTAURER;
        $this->save();
    }
    public function rejeter(): void
    {
        $this->status_validation = self::STATUS_REJETEE;
        $this->save();
    }
    public function isSuspendu(): bool
    {
        return $this->status_validation === self::STATUS_SUSPENDU;
    }

    public function registerView(?User $user, string $ip = null): void
    {
        // Le propriétaire du véhicule ne génère pas de vue
        if ($user && $this->created_by === $user->id) {
            return;
        }

        // Évite de compter plusieurs vues du même user dans la même heure
        $dejaVu = $this->vues()
            ->where('user_id', $user?->id)
            ->where('created_at', '>=', now()->subHour())
            ->exists();

        if (!$dejaVu) {
            $this->vues()->create([
                'user_id'    => $user?->id,
                'ip_address' => $ip,
            ]);
            $this->increment('views_count');
        }
    }

    public function scopeVendu($query)
    {
        return $query->where('statut', 'vendu');
    }
    public function scopeLoue($query)
    {
        return $query->where('statut', 'loué');
    }

    public function setPrixAttribute($value)
    {
        $this->attributes['prix']        = round($value, 2);
    }
    public function setPrixSuggereAttribute($value)
    {
        $this->attributes['prix_suggere'] = round($value, 2);
    }
    public function getPrixAttribute($value)
    {
        return number_format($value, 2, '.', '');
    }
    public function getPrixSuggereAttribute($value)
    {
        return number_format($value, 2, '.', '');
    }
}
