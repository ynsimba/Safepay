<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Ajoute l'année civile aux heures, archives et période courante. */
    public function up(): void
    {
        if (Schema::hasTable('hours')) {
            if (! Schema::hasColumn('hours', 'annee')) {
                Schema::table('hours', function (Blueprint $table) {
                    $table->unsignedSmallInteger('annee')->default(2026)->after('mois');
                });
            }

            $hoursIndexes = collect(DB::select('SHOW INDEX FROM hours'))->pluck('Key_name')->unique();
            if ($hoursIndexes->contains('uniq_employee_mois')) {
                Schema::table('hours', function (Blueprint $table) {
                    $table->dropForeign('fk_hours_employee');
                });
                Schema::table('hours', function (Blueprint $table) {
                    $table->dropUnique('uniq_employee_mois');
                });
                Schema::table('hours', function (Blueprint $table) {
                    $table->unique(['employee_id', 'mois', 'annee'], 'uniq_employee_mois_annee');
                    $table->foreign('employee_id', 'fk_hours_employee')
                        ->references('id')->on('employees')->cascadeOnDelete();
                });
            } elseif (! $hoursIndexes->contains('uniq_employee_mois_annee')) {
                Schema::table('hours', function (Blueprint $table) {
                    $table->unique(['employee_id', 'mois', 'annee'], 'uniq_employee_mois_annee');
                });
            }
        }

        if (Schema::hasTable('archives') && ! Schema::hasColumn('archives', 'annee')) {
            Schema::table('archives', function (Blueprint $table) {
                $table->unsignedSmallInteger('annee')->default(2026)->after('mois');
            });
            foreach (DB::table('archives')->get() as $row) {
                $year = 2026;
                if (! empty($row->archived_at)) {
                    $year = (int) date('Y', strtotime((string) $row->archived_at)) ?: 2026;
                }
                $newId = $year.'-'.$row->mois.'-'.$row->employee_id;
                DB::table('archives')->where('id', $row->id)->update([
                    'annee' => $year,
                    'id' => $newId,
                ]);
            }
            Schema::table('archives', function (Blueprint $table) {
                $table->index(['annee', 'mois'], 'idx_archives_annee_mois');
            });
        }

        if (Schema::hasTable('settings') && ! Schema::hasColumn('settings', 'current_year')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->unsignedSmallInteger('current_year')->default(2026)->after('current_month');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('archives') && Schema::hasColumn('archives', 'annee')) {
            Schema::table('archives', function (Blueprint $table) {
                $table->dropIndex('idx_archives_annee_mois');
                $table->dropColumn('annee');
            });
        }
        if (Schema::hasTable('hours') && Schema::hasColumn('hours', 'annee')) {
            $this->dropIndexIfExists('hours', ['uniq_employee_mois_annee']);
            Schema::table('hours', function (Blueprint $table) {
                $table->dropColumn('annee');
                $table->unique(['employee_id', 'mois']);
            });
        }
        if (Schema::hasTable('settings') && Schema::hasColumn('settings', 'current_year')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->dropColumn('current_year');
            });
        }
    }

    /** @param  list<string>  $names */
    private function dropIndexIfExists(string $table, array $names): void
    {
        $existing = collect(DB::select("SHOW INDEX FROM {$table}"))
            ->pluck('Key_name')
            ->unique()
            ->all();
        foreach ($names as $name) {
            if (in_array($name, $existing, true)) {
                Schema::table($table, function (Blueprint $blueprint) use ($name) {
                    $blueprint->dropUnique($name);
                });
            }
        }
    }
};
