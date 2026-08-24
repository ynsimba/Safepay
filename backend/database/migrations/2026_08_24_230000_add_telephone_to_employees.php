<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employees') && ! Schema::hasColumn('employees', 'telephone')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->string('telephone', 32)->nullable()->after('prenom');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'telephone')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropColumn('telephone');
            });
        }
    }
};
