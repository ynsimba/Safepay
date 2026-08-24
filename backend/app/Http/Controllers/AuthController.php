<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuthCookie;
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

        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if (! $user || ! Hash::check($password, $user->getAuthPassword())) {
            return response()->json(['error' => 'Identifiants incorrects.'], 401);
        }

        $minutes = AuthCookie::minutes();
        $user->tokens()->where('name', 'safecheck-pay')->delete();
        $token = $user->createToken('safecheck-pay', ['*'], now()->addMinutes($minutes))->plainTextToken;

        return response()->json([
            'user' => $this->publicUser($user),
        ])->withCookie(AuthCookie::make($token, $request));
    }

    public function logout(Request $request): JsonResponse
    {
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
