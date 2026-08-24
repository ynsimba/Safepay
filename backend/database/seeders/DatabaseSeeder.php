<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@safecheck.local')],
            [
                'name' => env('ADMIN_NAME', 'Administrateur'),
                'password' => env('ADMIN_PASSWORD', 'Safecheck2026!'),
            ]
        );
    }
}
