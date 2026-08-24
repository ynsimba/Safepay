<?php

namespace App\Http\Requests;

use App\Services\PayrollService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertHoursRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('heuresPrestees') === '') {
            $this->merge(['heuresPrestees' => null]);
        }
        if ($this->input('bonusHoraire') === '') {
            $this->merge(['bonusHoraire' => 0]);
        }
    }

    public function rules(): array
    {
        return [
            'mois' => ['required', 'string', Rule::in(PayrollService::MOIS)],
            'annee' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
            'employeeId' => ['required', 'string', 'max:64', 'exists:employees,id'],
            'heuresPrestees' => ['nullable', 'numeric', 'min:0', 'max:744'],
            'bonusHoraire' => ['nullable', 'numeric', 'min:0', 'max:744'],
        ];
    }
}
