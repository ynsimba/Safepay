<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('salary_history')) {
            return;
        }

        if (! Schema::hasColumn('salary_history', 'from_annee')) {
            Schema::table('salary_history', function (Blueprint $table) {
                $table->unsignedSmallInteger('from_annee')->default(2026)->after('from_mois');
            });
        }

        $indexes = collect(DB::select('SHOW INDEX FROM salary_history'))->pluck('Key_name')->unique();
        $oldUnique = $indexes->contains('uniq_employee_from_mois')
            ? 'uniq_employee_from_mois'
            : ($indexes->contains('salary_history_employee_id_from_mois_unique')
                ? 'salary_history_employee_id_from_mois_unique'
                : null);

        if ($oldUnique) {
            Schema::table('salary_history', function (Blueprint $table) {
                $table->dropForeign('fk_salary_history_employee');
            });
            Schema::table('salary_history', function (Blueprint $table) use ($oldUnique) {
                $table->dropUnique($oldUnique);
            });
            Schema::table('salary_history', function (Blueprint $table) {
                $table->unique(['employee_id', 'from_mois', 'from_annee'], 'uniq_employee_from_mois_annee');
                $table->foreign('employee_id', 'fk_salary_history_employee')
                    ->references('id')->on('employees')->cascadeOnDelete();
            });

            return;
        }

        $indexes = collect(DB::select('SHOW INDEX FROM salary_history'))->pluck('Key_name')->unique();
        if (! $indexes->contains('uniq_employee_from_mois_annee')) {
            Schema::table('salary_history', function (Blueprint $table) {
                $table->unique(['employee_id', 'from_mois', 'from_annee'], 'uniq_employee_from_mois_annee');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('salary_history')) {
            return;
        }

        $indexes = collect(DB::select('SHOW INDEX FROM salary_history'))->pluck('Key_name')->unique();
        if ($indexes->contains('uniq_employee_from_mois_annee')) {
            Schema::table('salary_history', function (Blueprint $table) {
                $table->dropForeign('fk_salary_history_employee');
            });
            Schema::table('salary_history', function (Blueprint $table) {
                $table->dropUnique('uniq_employee_from_mois_annee');
            });
            Schema::table('salary_history', function (Blueprint $table) {
                $table->unique(['employee_id', 'from_mois'], 'uniq_employee_from_mois');
                $table->foreign('employee_id', 'fk_salary_history_employee')
                    ->references('id')->on('employees')->cascadeOnDelete();
            });
        }

        if (Schema::hasColumn('salary_history', 'from_annee')) {
            Schema::table('salary_history', function (Blueprint $table) {
                $table->dropColumn('from_annee');
            });
        }
    }
};
