<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

/** Cookie httpOnly du jeton Sanctum (jamais exposé à JavaScript). */
final class AuthCookie
{
    public const NAME = 'safepay_token';

    public static function minutes(): int
    {
        return max(1, (int) config('sanctum.expiration', 480));
    }

    public static function make(string $plainTextToken, Request $request): Cookie
    {
        return cookie(
            self::NAME,
            $plainTextToken,
            self::minutes(),
            '/',
            null,
            $request->secure() || app()->environment('production'),
            true,
            false,
            'lax',
        );
    }

    public static function forget(Request $request): Cookie
    {
        return cookie(
            self::NAME,
            '',
            -60,
            '/',
            null,
            $request->secure() || app()->environment('production'),
            true,
            false,
            'lax',
        );
    }
}
