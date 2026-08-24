<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Trace d'une action sensible (auth, paie, reset). Jamais de mot de passe ni d'IBAN. */
class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'user_email', 'action', 'entity', 'entity_id',
        'ip', 'user_agent', 'meta', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function toFront(): array
    {
        return [
            'id' => $this->id,
            'userEmail' => $this->user_email,
            'action' => $this->action,
            'entity' => $this->entity,
            'entityId' => $this->entity_id,
            'ip' => $this->ip,
            'meta' => $this->meta ?: new \stdClass(),
            'createdAt' => optional($this->created_at)?->toIso8601String(),
        ];
    }
}
