<?php

namespace App\Http\Controllers;

use App\Services\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Endpoints métier de paie. Chaque mutation renvoie l'état complet. */
class PayrollController extends Controller
{
    public function __construct(private PayrollService $payroll) {}

    public function state(): JsonResponse
    {
        return response()->json($this->payroll->getState());
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        return response()->json($this->payroll->addEmployee($request->all()));
    }

    public function updateEmployee(Request $request, string $id): JsonResponse
    {
        return response()->json($this->payroll->updateEmployee($id, $request->all()));
    }

    public function destroyEmployee(string $id): JsonResponse
    {
        return response()->json($this->payroll->deleteEmployee($id));
    }

    public function upsertHours(Request $request): JsonResponse
    {
        return response()->json($this->payroll->setHours($request->all()));
    }

    public function updateSettings(Request $request): JsonResponse
    {
        return response()->json($this->payroll->updateSettings($request->all()));
    }

    public function setCurrentMonth(Request $request): JsonResponse
    {
        return response()->json($this->payroll->setCurrentMonth((string) $request->input('mois', '')));
    }

    public function archive(Request $request): JsonResponse
    {
        return response()->json($this->payroll->archiveMonth((string) $request->input('mois', '')));
    }

    public function destroyArchive(string $mois): JsonResponse
    {
        return response()->json($this->payroll->deleteArchiveMonth($mois));
    }

    public function reset(): JsonResponse
    {
        return response()->json($this->payroll->resetAllData());
    }
}
