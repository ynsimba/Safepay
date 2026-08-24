<?php

namespace App\Services;

use App\Models\Archive;
use App\Models\Employee;
use App\Models\Hour;
use App\Models\SalaryHistory;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;

/**
 * Calculs de paie et état métier, miroir de src/utils/payroll.js.
 */
class PayrollService
{
    public const MOIS = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];

    public function getState(): array
    {
        $this->maybeSeed();
        $setting = Setting::current();

        return [
            'employees' => Employee::query()->with('salaryHistory')->orderBy('nom')->orderBy('prenom')->get()->map->toFront()->values()->all(),
            'hoursByMonth' => $this->hoursByMonth(),
            'archive' => Archive::query()->orderBy('mois')->orderBy('nom')->orderBy('prenom')->get()->map->toFront()->values()->all(),
            'settings' => $setting->toFront(),
            'currentMonth' => $setting->current_month,
        ];
    }

    public function heuresTheoriques(string $mois, array $settings): float
    {
        $table = $settings['monthHours'] ?? [];

        return isset($table[$mois]) ? (float) $table[$mois] : 186.0;
    }

    public function salaireForMonth(array $employee, string $mois): float
    {
        $history = $employee['salaireHistory'] ?? [];
        if (! $history) {
            return (float) ($employee['salaireInitial'] ?? 0);
        }
        $idx = array_search($mois, self::MOIS, true);
        if ($idx === false) {
            return (float) ($employee['salaireInitial'] ?? 0);
        }
        $applicable = [];
        foreach ($history as $row) {
            $hIdx = array_search($row['fromMois'], self::MOIS, true);
            if ($hIdx !== false && $hIdx <= $idx) {
                $applicable[] = [$hIdx, $row];
            }
        }
        if (! $applicable) {
            return (float) ($employee['salaireInitial'] ?? 0);
        }
        usort($applicable, fn ($a, $b) => $a[0] <=> $b[0]);
        $last = end($applicable);

        return (float) $last[1]['salaire'];
    }

    public function computePayslip(array $args): array
    {
        $salaireInitial = (float) $args['salaireInitial'];
        $heuresPrestees = $args['heuresPrestees'];
        $bonusHoraire = (float) ($args['bonusHoraire'] ?? 0);
        $mois = $args['mois'];
        $settings = $args['settings'];
        $theo = $this->heuresTheoriques($mois, $settings);
        $threshold = (float) ($settings['threshold'] ?? 0);
        $hasHours = $heuresPrestees !== '' && $heuresPrestees !== null && (float) $heuresPrestees !== 0.0;

        if (! $hasHours || ! $theo) {
            return [
                'heuresTheoriques' => $theo,
                'delta' => null,
                'salaire' => 0,
                'montantBonus' => 0,
                'salairePlusBonus' => 0,
                'retenue' => 0,
                'enRetard' => false,
            ];
        }

        $hp = (float) $heuresPrestees;
        $delta = $hp - $theo;
        $ratio = $delta / $theo;
        $salaire = $delta >= $threshold ? $salaireInitial : $salaireInitial * (1 + $ratio);
        $montantBonus = $bonusHoraire ? $salaireInitial * ($bonusHoraire / $theo) : 0;
        $retenue = $delta < $threshold ? abs($salaireInitial * $ratio) : 0;

        return [
            'heuresTheoriques' => $theo,
            'delta' => $delta,
            'salaire' => $salaire,
            'montantBonus' => $montantBonus,
            'salairePlusBonus' => $salaire + $montantBonus,
            'retenue' => $retenue,
            'enRetard' => $delta < 0,
        ];
    }

    public function addEmployee(array $body): array
    {
        $id = $body['id'] ?? ('e'.(string) round(microtime(true) * 1000));
        Employee::query()->create([
            'id' => $id,
            'nom' => trim((string) ($body['nom'] ?? '')),
            'prenom' => trim((string) ($body['prenom'] ?? '')),
            'perception' => $body['perception'] ?? 'VB',
            'salaire_initial' => (float) ($body['salaireInitial'] ?? 0),
            'compte_bancaire' => trim((string) ($body['compteBancaire'] ?? '')) ?: null,
        ]);

        return $this->getState();
    }

    public function updateEmployee(string $id, array $body): array
    {
        $employee = Employee::query()->findOrFail($id);
        $employee->update([
            'nom' => trim((string) ($body['nom'] ?? $employee->nom)),
            'prenom' => trim((string) ($body['prenom'] ?? $employee->prenom)),
            'perception' => $body['perception'] ?? $employee->perception,
            'salaire_initial' => (float) ($body['salaireInitial'] ?? $employee->salaire_initial),
            'compte_bancaire' => array_key_exists('compteBancaire', $body)
                ? (trim((string) $body['compteBancaire']) ?: null)
                : $employee->compte_bancaire,
        ]);
        if (array_key_exists('salaireHistory', $body)) {
            $this->replaceSalaryHistory($id, is_array($body['salaireHistory']) ? $body['salaireHistory'] : []);
        }

        return $this->getState();
    }

    public function deleteEmployee(string $id): array
    {
        Employee::query()->where('id', $id)->delete();

        return $this->getState();
    }

    public function setHours(array $body): array
    {
        $mois = (string) ($body['mois'] ?? '');
        $employeeId = (string) ($body['employeeId'] ?? '');
        if ($mois === '' || $employeeId === '') {
            abort(response()->json(['error' => 'Mois et employé requis'], 422));
        }
        $heures = $body['heuresPrestees'] ?? '';
        $bonus = $body['bonusHoraire'] ?? 0;
        Hour::query()->updateOrCreate(
            ['employee_id' => $employeeId, 'mois' => $mois],
            [
                'heures_prestees' => ($heures === '' || $heures === null) ? null : (float) $heures,
                'bonus_horaire' => ($bonus === '' || $bonus === null) ? 0 : (float) $bonus,
            ]
        );

        return $this->getState();
    }

    public function updateSettings(array $body): array
    {
        $setting = Setting::current();
        $setting->update([
            'threshold' => array_key_exists('threshold', $body) ? (float) $body['threshold'] : $setting->threshold,
            'perceptions' => $body['perceptions'] ?? $setting->perceptions,
            'month_hours' => $body['monthHours'] ?? $setting->month_hours,
        ]);

        return $this->getState();
    }

    public function setCurrentMonth(string $mois): array
    {
        if ($mois === '') {
            abort(response()->json(['error' => 'Mois requis'], 422));
        }
        Setting::current()->update(['current_month' => $mois]);

        return $this->getState();
    }

    public function archiveMonth(string $mois): array
    {
        if ($mois === '') {
            abort(response()->json(['error' => 'Mois requis'], 422));
        }
        $state = $this->getState();
        $settings = $state['settings'];
        $byEmp = $state['hoursByMonth'][$mois] ?? [];
        $now = now();

        DB::transaction(function () use ($mois, $state, $settings, $byEmp, $now) {
            Archive::query()->where('mois', $mois)->delete();
            foreach ($state['employees'] as $emp) {
                $hours = $byEmp[$emp['id']] ?? ['heuresPrestees' => '', 'bonusHoraire' => 0];
                $payslip = $this->computePayslip([
                    'salaireInitial' => $this->salaireForMonth($emp, $mois),
                    'heuresPrestees' => $hours['heuresPrestees'],
                    'bonusHoraire' => $hours['bonusHoraire'] ?? 0,
                    'mois' => $mois,
                    'settings' => $settings,
                ]);
                Archive::query()->create([
                    'id' => $mois.'-'.$emp['id'],
                    'mois' => $mois,
                    'employee_id' => $emp['id'],
                    'nom' => $emp['nom'],
                    'prenom' => $emp['prenom'],
                    'perception' => $emp['perception'],
                    'heures_prestees' => $hours['heuresPrestees'] === '' ? null : $hours['heuresPrestees'],
                    'heures_theoriques' => $payslip['heuresTheoriques'],
                    'delta' => $payslip['delta'],
                    'salaire' => $payslip['salaire'],
                    'montant_bonus' => $payslip['montantBonus'],
                    'salaire_plus_bonus' => $payslip['salairePlusBonus'],
                    'retenue' => $payslip['retenue'],
                    'en_retard' => $payslip['enRetard'] ? 1 : 0,
                    'archived_at' => $now,
                ]);
            }
        });

        return $this->getState();
    }

    public function deleteArchiveMonth(string $mois): array
    {
        Archive::query()->where('mois', $mois)->delete();

        return $this->getState();
    }

    public function resetAllData(): array
    {
        $this->seedDatabase();

        return $this->getState();
    }

    public function maybeSeed(): void
    {
        if (Employee::query()->exists()) {
            return;
        }
        $this->seedDatabase();
    }

    public function seedDatabase(): void
    {
        $seed = require database_path('data/payroll-seed.php');

        DB::transaction(function () use ($seed) {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0');
            Archive::query()->delete();
            Hour::query()->delete();
            SalaryHistory::query()->delete();
            Employee::query()->delete();
            DB::statement('SET FOREIGN_KEY_CHECKS = 1');

            foreach ($seed['employees'] as $emp) {
                Employee::query()->create([
                    'id' => $emp['id'],
                    'nom' => $emp['nom'],
                    'prenom' => $emp['prenom'],
                    'perception' => $emp['perception'],
                    'salaire_initial' => $emp['salaireInitial'],
                    'compte_bancaire' => $emp['compteBancaire'] ?: null,
                ]);
            }

            foreach ($seed['juilletHours'] as $id => $h) {
                Hour::query()->create([
                    'employee_id' => $id,
                    'mois' => 'Juillet',
                    'heures_prestees' => $h['heuresPrestees'],
                    'bonus_horaire' => $h['bonusHoraire'],
                ]);
            }

            $settings = Setting::current()->toFront();
            foreach ($seed['employees'] as $emp) {
                $hours = $seed['juilletHours'][$emp['id']];
                $payslip = $this->computePayslip([
                    'salaireInitial' => $emp['salaireInitial'],
                    'heuresPrestees' => $hours['heuresPrestees'],
                    'bonusHoraire' => $hours['bonusHoraire'],
                    'mois' => 'Juillet',
                    'settings' => $settings,
                ]);
                Archive::query()->create([
                    'id' => 'Juillet-'.$emp['id'],
                    'mois' => 'Juillet',
                    'employee_id' => $emp['id'],
                    'nom' => $emp['nom'],
                    'prenom' => $emp['prenom'],
                    'perception' => $emp['perception'],
                    'heures_prestees' => $hours['heuresPrestees'],
                    'heures_theoriques' => $payslip['heuresTheoriques'],
                    'delta' => $payslip['delta'],
                    'salaire' => $payslip['salaire'],
                    'montant_bonus' => $payslip['montantBonus'],
                    'salaire_plus_bonus' => $payslip['salairePlusBonus'],
                    'retenue' => $payslip['retenue'],
                    'en_retard' => $payslip['enRetard'] ? 1 : 0,
                    'archived_at' => '2026-07-31 00:00:00',
                ]);
            }

            Setting::current()->update(['current_month' => 'Juillet']);
        });
    }

    private function hoursByMonth(): array
    {
        $hoursByMonth = [];
        foreach (Hour::query()->get() as $row) {
            $hoursByMonth[$row->mois][$row->employee_id] = [
                'heuresPrestees' => $row->heures_prestees === null ? '' : (float) $row->heures_prestees,
                'bonusHoraire' => (float) $row->bonus_horaire,
            ];
        }

        return $hoursByMonth;
    }

    private function replaceSalaryHistory(string $employeeId, array $history): void
    {
        SalaryHistory::query()->where('employee_id', $employeeId)->delete();
        foreach ($history as $row) {
            SalaryHistory::query()->create([
                'employee_id' => $employeeId,
                'from_mois' => $row['fromMois'],
                'salaire' => (float) $row['salaire'],
            ]);
        }
    }
}
