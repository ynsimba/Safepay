<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserPasswordRequest;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Gestion des comptes par un administrateur : création et changement de mot de passe. */
class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'users' => User::query()->orderBy('name')->get()->map(fn (User $u) => $this->toFront($u))->values()->all(),
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = new User();
        $user->forceFill([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            // Toute l'application est réservée aux administrateurs.
            'role' => 'admin',
        ])->save();

        AuditLogger::record('user.create', 'user', (string) $user->id, ['email' => $user->email]);

        return response()->json(['user' => $this->toFront($user)], 201);
    }

    public function updatePassword(UpdateUserPasswordRequest $request, int $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);
        $user->forceFill(['password' => $request->validated('password')])->save();

        // Déconnecte les autres sessions du compte ; l'admin garde la sienne s'il change son propre mot de passe.
        $currentTokenId = $request->user()?->currentAccessToken()?->id;
        $user->tokens()->when($currentTokenId, fn ($q) => $q->where('id', '!=', $currentTokenId))->delete();

        AuditLogger::record('user.password', 'user', (string) $user->id, ['email' => $user->email]);

        return response()->json(['ok' => true]);
    }

    private function toFront(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'createdAt' => optional($user->created_at)?->toIso8601String(),
        ];
    }
}
