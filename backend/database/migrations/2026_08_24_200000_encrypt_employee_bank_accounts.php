<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Agrandit la colonne pour le ciphertext et chiffre les IBAN déjà stockés. */
    public function up(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        DB::statement('ALTER TABLE employees MODIFY compte_bancaire TEXT NULL');

        foreach (DB::table('employees')->select('id', 'compte_bancaire')->get() as $row) {
            $plain = $row->compte_bancaire;
            if (! is_string($plain) || $plain === '') {
                continue;
            }
            try {
                Crypt::decryptString($plain);
                continue;
            } catch (\Throwable) {
                DB::table('employees')->where('id', $row->id)->update([
                    'compte_bancaire' => Crypt::encryptString($plain),
                ]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        foreach (DB::table('employees')->select('id', 'compte_bancaire')->get() as $row) {
            $stored = $row->compte_bancaire;
            if (! is_string($stored) || $stored === '') {
                continue;
            }
            try {
                DB::table('employees')->where('id', $row->id)->update([
                    'compte_bancaire' => Crypt::decryptString($stored),
                ]);
            } catch (\Throwable) {
                // Déjà en clair.
            }
        }

        DB::statement('ALTER TABLE employees MODIFY compte_bancaire VARCHAR(80) NULL');
    }
};
