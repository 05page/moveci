<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VerificationIdentite extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'verifications_identite';

    protected $fillable = [
        'user_id',
        'type_piece',
        'photo_piece',
        'statut',
        'motif_rejet',
        'verifie_par',
        'verifie_le',
    ];

    /**
     * Le chemin ne sort JAMAIS dans une réponse JSON : il désigne un fichier du
     * disque privé, et seule la route admin dédiée doit servir cette image.
     */
    protected $hidden = ['photo_piece'];

    protected $casts = ['verifie_le' => 'datetime'];

    const STATUT_EN_ATTENTE = 'en_attente';
    const STATUT_VALIDEE    = 'validee';
    const STATUT_REJETEE    = 'rejetee';

    const TYPE_CNI       = 'cni';
    const TYPE_PASSEPORT = 'passeport';

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function verificateur()
    {
        return $this->belongsTo(User::class, 'verifie_par');
    }
}
