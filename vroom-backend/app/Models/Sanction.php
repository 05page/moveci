<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Sanction extends Model
{
    use HasUuids;

    protected $table = 'sanctions';

    protected $fillable = [
        'user_id',
        'admin_id',
        'type',
        'reason_code',
        'details',
        'expires_at',
        'revoked_at',
        'revoked_by',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user(){
        return $this->belongsTo(User::class);
    }

    public function admin(){
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function revokedBy(){
        return $this->belongsTo(User::class, 'revoked_by');
    }
}
