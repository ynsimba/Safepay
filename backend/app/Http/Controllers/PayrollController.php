<?php

namespace App\Http\Controllers;

use App\Http\Requests\MonthRequest;
use App\Http\Requests\ResetDataRequest;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Requests\UpdateSettingsRequest;
use App\Http\Requests\UpsertHoursRequest;
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
        return response()->json($this->payroll->setCurrentMonth((string) $request->validated('mois')));
    }

    public function archive(MonthRequest $request): JsonResponse
    {
        return response()->json($this->payroll->archiveMonth((string) $request->validated('mois')));
    }

    public function destroyArchive(string $mois): JsonResponse
    {
        if (! in_array($mois, PayrollService::MOIS, true)) {
            abort(404);
        }

        return response()->json($this->payroll->deleteArchiveMonth($mois));
    }

    public function reset(ResetDataRequest $request): JsonResponse
    {
        return response()->json($this->payroll->resetAllData());
    }
}
