<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/** Compte les échecs de login et verrouille l'identifiant après trop de tentatives. */
final class LoginGuard
{
    public const MAX_ATTEMPTS = 8;

    public const LOCK_MINUTES = 15;

    public static function lockedUntil(string $email): ?Carbon
    {
        $payload = Cache::get(self::key($email));
        if (! is_array($payload) || empty($payload['locked_until'])) {
            return null;
        }

        $until = Carbon::parse($payload['locked_until']);

        return $until->isFuture() ? $until : null;
    }

    public static function hit(string $email): void
    {
        $key = self::key($email);
        $payload = Cache::get($key, ['count' => 0]);
        $count = (int) ($payload['count'] ?? 0) + 1;
        $data = ['count' => $count];
        if ($count >= self::MAX_ATTEMPTS) {
            $data['locked_until'] = now()->addMinutes(self::LOCK_MINUTES)->toIso8601String();
        }
        Cache::put($key, $data, now()->addMinutes(self::LOCK_MINUTES));
    }

    public static function clear(string $email): void
    {
        Cache::forget(self::key($email));
    }

    private static function key(string $email): string
    {
        return 'login:fail:'.hash('sha256', strtolower(trim($email)));
    }
}
