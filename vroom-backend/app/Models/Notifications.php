<?php

namespace App\Models;

use App\Events\NotificationBroadcast;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Notifications extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'lu',
        'lu_at',
        'date_envoi',
    ];

    // Expose "is_read" dans le JSON — le frontend ne doit pas connaître le nom de colonne interne "lu"
    protected $appends = ['is_read'];

    protected $casts = [
        'data'      => 'array',
        'lu'        => 'boolean',
        'lu_at'     => 'datetime',
        'date_envoi' => 'datetime',
    ];

    const TYPE_RDV             = 'rdv';
    const TYPE_FORMATION       = 'formation';
    const TYPE_ALERTE_VEHICULE = 'alerte_vehicule';
    const TYPE_ABONNEMENT      = 'abonnement';
    const TYPE_MODERATION      = 'moderation';
    const TYPE_TRANSACTION     = 'transaction';
    const TYPE_SUPPORT         = 'support';
    const TYPE_TENDANCE        = 'tendance';
    const TYPE_RESERVATION     = 'reservation';

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeUnread($query)
    {
        return $query->where('lu', false);
    }
    public function scopeRead($query)
    {
        return $query->where('lu', true);
    }
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }
    public function scopeRecent($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    public function markAsRead(): void
    {
        $this->lu    = true;
        $this->lu_at = now();
        $this->save();
    }

    public function markAsUnread(): void
    {
        $this->lu    = false;
        $this->lu_at = null;
        $this->save();
    }

    public function getIsReadAttribute(): bool
    {
        return (bool) $this->lu;
    }

    public function isRead(): bool
    {
        return $this->lu;
    }
    public function isUnread(): bool
    {
        return !$this->lu;
    }

    /**
     * Envoie une notification à tous les admins.
     * Utilisé pour alerter l'équipe de modération des événements nécessitant une action.
     * Absorbe les erreurs pour ne jamais bloquer l'opération métier appelante.
     */
    public static function notifyAdmins(string $type, string $title, string $message, array $data = []): void
    {
        try {
            $adminIds = \App\Models\User::where('role', 'admin')->pluck('id');
            foreach ($adminIds as $adminId) {
                static::create([
                    'user_id'    => $adminId,
                    'type'       => $type,
                    'title'      => $title,
                    'message'    => $message,
                    'data'       => $data,
                    'lu'         => false,
                    'date_envoi' => now(),
                ]);
            }
        } catch (\Exception $e) {
            \Log::warning('notifyAdmins échoué : ' . $e->getMessage());
        }
    }

    protected static function boot(): void
    {
        parent::boot();

        static::created(function (Notifications $notification) {
            // Reverb peut ne pas être lancé en dev — on absorbe l'erreur pour
            // ne pas faire échouer l'opération métier qui a créé la notification
            try {
                NotificationBroadcast::dispatch($notification);
            } catch (\Exception $e) {
                \Log::warning('Broadcast notification échoué : ' . $e->getMessage());
            }
        });
    }
}
