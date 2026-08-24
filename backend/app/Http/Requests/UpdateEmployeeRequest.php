<?php

namespace App\Http\Requests;

use App\Services\PayrollService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom' => ['required', 'string', 'max:100'],
            'prenom' => ['required', 'string', 'max:100'],
            'telephone' => ['nullable', 'string', 'max:32'],
            'perception' => ['required', 'string', 'max:40'],
            'salaireInitial' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'compteBancaire' => ['nullable', 'string', 'max:64'],
            'salaireHistory' => ['sometimes', 'array', 'max:24'],
            'salaireHistory.*.fromMois' => ['required', 'string', Rule::in(PayrollService::MOIS)],
            'salaireHistory.*.fromAnnee' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
            'salaireHistory.*.salaire' => ['required', 'numeric', 'min:0', 'max:10000000'],
        ];
    }
}
