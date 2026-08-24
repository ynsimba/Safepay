<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Crée les tables métier si elles n'existent pas encore (phpMyAdmin / schéma SQL). */
    public function up(): void
    {
        if (! Schema::hasTable('employees')) {
            Schema::create('employees', function (Blueprint $table) {
                $table->string('id', 32)->primary();
                $table->string('nom', 120);
                $table->string('prenom', 120);
                $table->string('telephone', 32)->nullable();
                $table->string('perception', 20)->default('VB');
                $table->decimal('salaire_initial', 12, 2)->default(0);
                $table->text('compte_bancaire')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('salary_history')) {
            Schema::create('salary_history', function (Blueprint $table) {
                $table->increments('id');
                $table->string('employee_id', 32);
                $table->string('from_mois', 20);
                $table->unsignedSmallInteger('from_annee')->default(2026);
                $table->decimal('salaire', 12, 2);
                $table->timestamp('created_at')->useCurrent();
                $table->unique(['employee_id', 'from_mois', 'from_annee'], 'uniq_employee_from_mois_annee');
                $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('hours')) {
            Schema::create('hours', function (Blueprint $table) {
                $table->increments('id');
                $table->string('employee_id', 32);
                $table->string('mois', 20);
                $table->decimal('heures_prestees', 8, 2)->nullable();
                $table->decimal('bonus_horaire', 8, 2)->default(0);
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
                $table->unique(['employee_id', 'mois']);
                $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('archives')) {
            Schema::create('archives', function (Blueprint $table) {
                $table->string('id', 64)->primary();
                $table->string('mois', 20);
                $table->string('employee_id', 32);
                $table->string('nom', 120);
                $table->string('prenom', 120);
                $table->string('perception', 20);
                $table->decimal('heures_prestees', 8, 2)->nullable();
                $table->decimal('heures_theoriques', 8, 2)->nullable();
                $table->decimal('delta', 8, 2)->nullable();
                $table->decimal('salaire', 12, 2)->default(0);
                $table->decimal('montant_bonus', 12, 2)->default(0);
                $table->decimal('salaire_plus_bonus', 12, 2)->default(0);
                $table->decimal('retenue', 12, 2)->default(0);
                $table->boolean('en_retard')->default(false);
                $table->dateTime('archived_at');
                $table->index('mois');
                $table->index('employee_id');
            });
        }

        if (! Schema::hasTable('settings')) {
            Schema::create('settings', function (Blueprint $table) {
                $table->unsignedTinyInteger('id')->primary();
                $table->decimal('threshold', 8, 2)->default(0);
                $table->json('perceptions');
                $table->json('month_hours');
                $table->string('current_month', 20)->default('Juillet');
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            });
        }

        if (! DB::table('settings')->where('id', 1)->exists()) {
            DB::table('settings')->insert([
                'id' => 1,
                'threshold' => 0,
                'perceptions' => json_encode(['VB', 'CASH']),
                'month_hours' => json_encode([
                    'Janvier' => 186, 'Février' => 179.2, 'Mars' => 186, 'Avril' => 179.2,
                    'Mai' => 186, 'Juin' => 179.2, 'Juillet' => 186, 'Août' => 186,
                    'Septembre' => 179.2, 'Octobre' => 186, 'Novembre' => 179.2, 'Décembre' => 186,
                ]),
                'current_month' => 'Juillet',
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('archives');
        Schema::dropIfExists('hours');
        Schema::dropIfExists('salary_history');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('settings');
    }
};
