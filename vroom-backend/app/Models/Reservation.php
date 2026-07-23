<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    use HasUuids;

    protected $fillable = [
        'vehicule_id',
        'client_id',
        'active_key',
        'statut',
        'expires_at',
        'annulations_count',
        'cancelled_at',
    ];

    protected $casts = [
        'expires_at'        => 'datetime',
        'cancelled_at'      => 'datetime',
        'annulations_count' => 'integer',
    ];

    // Statuts
    const EN_ATTENTE = 'en_attente';
    const CONFIRMEE  = 'confirmee';
    const ANNULEE    = 'annulee';
    const EXPIREE    = 'expiree';

    // Nombre max d'annulations avant blocage du client sur ce véhicule
    const MAX_ANNULATIONS = 2;

    // Jours de grâce après date_disponibilite avant expiration automatique
    const JOURS_GRACE = 5;

    // ── Relations ────────────────────────────────────────────────────────────

    /** Le véhicule concerné par la réservation */
    public function vehicule(): BelongsTo
    {
        return $this->belongsTo(Vehicules::class, 'vehicule_id');
    }

    /** Le client qui a réservé */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Vérifie si la réservation est encore active */
    public function isActive(): bool
    {
        return $this->statut === self::EN_ATTENTE;
    }

    /**
     * Vérifie si le client est bloqué pour ce véhicule
     * (a déjà annulé 2 fois ou plus)
     */
    public function clientEstBloque(): bool
    {
        return $this->annulations_count >= self::MAX_ANNULATIONS;
    }
}
