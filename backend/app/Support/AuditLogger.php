<?php

namespace App\Support;

use App\Models\AuditLog;
use Throwable;

/** Enregistre une action sans jamais bloquer le métier. */
final class AuditLogger
{
    public static function record(string $action, ?string $entity = null, ?string $entityId = null, array $meta = []): void
    {
        try {
            $request = request();
            $user = $request?->user();

            AuditLog::query()->create([
                'user_id' => $user?->id,
                'user_email' => $user?->email,
                'action' => $action,
                'entity' => $entity,
                'entity_id' => $entityId,
                'ip' => $request?->ip(),
                'user_agent' => substr((string) $request?->userAgent(), 0, 255) ?: null,
                'meta' => $meta ?: null,
                'created_at' => now(),
            ]);
        } catch (Throwable) {
            // Le journal ne doit pas faire échouer une saisie de paie.
        }
    }
}
