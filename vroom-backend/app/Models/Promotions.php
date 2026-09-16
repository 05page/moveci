<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Promotions extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'formation_id',
        'code',
        'type_remise',
        'valeur',
        'date_debut',
        'date_fin',
        'usage_max',
        'usage_count',
        'is_active',
    ];

    protected $casts = [
        'valeur'      => 'decimal:2',
        'date_debut'  => 'date',
        'date_fin'    => 'date',
        'usage_max'   => 'integer',
        'usage_count' => 'integer',
        'is_active'   => 'boolean',
    ];

    /**
     * Mêmes valeurs par défaut que la migration.
     * Sans ça, l'objet rendu par create() a is_active à null alors que la
     * ligne en base vaut 1 — et estValide() renvoie false à tort.
     */
    protected $attributes = [
        'is_active'   => true,
        'usage_count' => 0,
    ];

    const TYPE_POURCENTAGE  = 'pourcentage';
    const TYPE_MONTANT_FIXE = 'montant_fixe';

    /** La formation sur laquelle ce code de réduction s'applique. */
    public function formation()
    {
        return $this->belongsTo(Formation::class, 'formation_id');
    }

    /** Ne remonte que les promotions activées par l'auto-école. */
    public function scopeActives(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Retrouve une promotion par son code, insensible à la casse.
     * Un utilisateur saisit "ETE2026" ou "ete2026" indifféremment.
     */
    public function scopePourCode(Builder $query, string $code): Builder
    {
        return $query->whereRaw('LOWER(code) = ?', [mb_strtolower(trim($code))]);
    }

    /**
     * Ne remonte que les promos utilisables aujourd'hui : actives, dans leur
     * fenêtre de dates, et qui n'ont pas atteint leur quota d'utilisation.
     *
     * À utiliser pour filtrer une liste :
     *   Promotions::utilisables()->where('formation_id', $id)->get();
     *
     * Une date ou un quota à NULL veut dire "pas de limite", donc valide.
     */
    public function scopeUtilisables(Builder $query): Builder
    {
        return $query->actives()
            ->where(fn($q) => $q->whereNull('date_debut')->orWhere('date_debut', '<=', now()))
            ->where(fn($q) => $q->whereNull('date_fin')->orWhere('date_fin', '>=', now()))
            ->where(fn($q) => $q->whereNull('usage_max')->orWhereColumn('usage_count', '<', 'usage_max'));
    }

    /**
     * Cette promo est-elle utilisable aujourd'hui ? true / false.
     *
     * Même règle que scopeUtilisables(), mais sur une promo déjà chargée :
     *   $promo = Promotions::pourCode('ETE2026')->first();
     *   if (! $promo->estValide()) { ... }
     *
     * Si tu ajoutes une condition de validité ici, ajoute-la aussi dans
     * scopeUtilisables(), sinon les deux ne diront plus la même chose.
     */
    public function estValide(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        // Une borne nulle signifie "pas de limite de ce côté", pas "invalide".
        if ($this->date_debut && $this->date_debut->isFuture()) {
            return false;
        }

        if ($this->date_fin && $this->date_fin->isPast()) {
            return false;
        }

        if ($this->usage_max !== null && $this->usage_count >= $this->usage_max) {
            return false;
        }

        return true;
    }

    /**
     * Calcule le montant de la remise à déduire du prix de la formation.
     *
     * Exemple : prix 150 000, type_remise 'pourcentage', valeur 10 → retourne 15 000.
     *
     * @param  float $prixInitial Prix de la formation avant remise.
     * @return float Montant à déduire (jamais supérieur à $prixInitial).
     */
    public function calculerRemise(float $prixInitial): float
    {
        if ($this->type_remise === self::TYPE_POURCENTAGE) {
            $remise = $prixInitial * $this->valeur / 100;
        } else {
            $remise = $this->valeur;
        }
        // Une valeur mal saisie (150 % ou un montant supérieur au prix)
        // ne doit jamais produire un prix final négatif.
        $remise = min($remise, $prixInitial);

        $remise = round($remise);

        return $remise;
    }

    /**
     * Prix final à payer = prix initial - remise.
     *
     * Exemple : prix 150 000, promo -10 % → retourne 135 000.
     * Appelle calculerRemise() au lieu de refaire le calcul, pour que les
     * deux méthodes donnent toujours le même résultat.
     */
    public function prixApresRemise(float $prixInitial): float
    {
        return $prixInitial - $this->calculerRemise($prixInitial);
    }
}
