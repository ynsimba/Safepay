<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\AuthCookie;
use App\Support\LoginGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/** Connexion / déconnexion Sanctum (jeton dans un cookie httpOnly). */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $email = strtolower(trim($data['email']));
        $password = (string) $data['password'];

        if (LoginGuard::lockedUntil($email)) {
            AuditLogger::record('auth.lockout', 'user', null, ['email' => $email]);

            return response()->json(['error' => 'Trop de tentatives. Réessayez dans 15 minutes.'], 429);
        }

        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if (! $user || ! Hash::check($password, $user->getAuthPassword())) {
            LoginGuard::hit($email);
            AuditLogger::record('auth.login_failed', 'user', $user?->id ? (string) $user->id : null, ['email' => $email]);

            return response()->json(['error' => 'Identifiants incorrects.'], 401);
        }

        LoginGuard::clear($email);
        $minutes = AuthCookie::minutes();
        $user->tokens()->where('name', 'safecheck-pay')->delete();
        $token = $user->createToken('safecheck-pay', ['*'], now()->addMinutes($minutes))->plainTextToken;
        AuditLogger::record('auth.login', 'user', (string) $user->id);

        return response()->json([
            'user' => $this->publicUser($user),
        ])->withCookie(AuthCookie::make($token, $request));
    }

    public function logout(Request $request): JsonResponse
    {
        AuditLogger::record('auth.logout', 'user', $request->user()?->id ? (string) $request->user()->id : null);
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['ok' => true])->withCookie(AuthCookie::forget($request));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->publicUser($request->user()));
    }

    private function publicUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}
