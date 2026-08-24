<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = (string) env('ADMIN_PASSWORD', '');
        if (strlen($password) < 12) {
            throw new RuntimeException(
                'Définissez ADMIN_PASSWORD (12 caractères minimum) dans backend/.env avant de lancer le seeder.'
            );
        }

        $user = User::query()->firstOrNew(['email' => env('ADMIN_EMAIL', 'admin@safecheck.local')]);
        $user->forceFill([
            'name' => env('ADMIN_NAME', 'Administrateur'),
            'password' => $password,
            'role' => 'admin',
        ])->save();
    }
}
