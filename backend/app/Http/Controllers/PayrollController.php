<?php

namespace App\Http\Controllers;

use App\Http\Requests\MonthRequest;
use App\Http\Requests\ResetDataRequest;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Requests\UpdateSettingsRequest;
use App\Http\Requests\UpsertHoursRequest;
use App\Models\AuditLog;
use App\Services\PayrollService;
use Illuminate\Http\JsonResponse;

/** Endpoints métier de paie. Chaque mutation renvoie l'état complet. */
class PayrollController extends Controller
{
    public function __construct(private PayrollService $payroll) {}

    public function state(): JsonResponse
    {
        return response()->json($this->payroll->getState());
    }

    public function showEmployee(string $id): JsonResponse
    {
        return response()->json($this->payroll->showEmployee($id));
    }

    public function storeEmployee(StoreEmployeeRequest $request): JsonResponse
    {
        return response()->json($this->payroll->addEmployee($request->validated()));
    }

    public function updateEmployee(UpdateEmployeeRequest $request, string $id): JsonResponse
    {
        return response()->json($this->payroll->updateEmployee($id, $request->validated()));
    }

    public function destroyEmployee(string $id): JsonResponse
    {
        return response()->json($this->payroll->deleteEmployee($id));
    }

    public function upsertHours(UpsertHoursRequest $request): JsonResponse
    {
        return response()->json($this->payroll->setHours($request->validated()));
    }

    public function updateSettings(UpdateSettingsRequest $request): JsonResponse
    {
        return response()->json($this->payroll->updateSettings($request->validated()));
    }

    public function setCurrentMonth(MonthRequest $request): JsonResponse
    {
        $annee = $request->validated('annee');

        return response()->json($this->payroll->setCurrentMonth(
            (string) $request->validated('mois'),
            $annee !== null ? (int) $annee : null
        ));
    }

    public function archive(MonthRequest $request): JsonResponse
    {
        $annee = $request->validated('annee');

        return response()->json($this->payroll->archiveMonth(
            (string) $request->validated('mois'),
            $annee !== null ? (int) $annee : null
        ));
    }

    public function destroyArchive(string $annee, string $mois): JsonResponse
    {
        if (! ctype_digit($annee) || ! in_array($mois, PayrollService::MOIS, true)) {
            abort(404);
        }

        return response()->json($this->payroll->deleteArchiveMonth($mois, (int) $annee));
    }

    public function reset(ResetDataRequest $request): JsonResponse
    {
        return response()->json($this->payroll->resetAllData());
    }

    public function audit(): JsonResponse
    {
        return response()->json([
            'entries' => AuditLog::query()
                ->orderByDesc('id')
                ->limit(80)
                ->get()
                ->map->toFront()
                ->values()
                ->all(),
        ]);
    }
}
