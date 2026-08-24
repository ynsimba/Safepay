<?php

namespace App\Http\Requests;

use App\Services\PayrollService;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $monthHourRules = [];
        foreach (PayrollService::MOIS as $mois) {
            $monthHourRules['monthHours.'.$mois] = ['sometimes', 'numeric', 'min:0', 'max:744'];
        }

        return array_merge([
            'threshold' => ['required', 'numeric', 'min:0', 'max:744'],
            'perceptions' => ['required', 'array', 'min:1', 'max:20'],
            'perceptions.*' => ['required', 'string', 'max:40'],
            'monthHours' => ['required', 'array'],
        ], $monthHourRules);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $hours = $this->input('monthHours', []);
            if (! is_array($hours)) {
                return;
            }
            foreach (array_keys($hours) as $key) {
                if (! in_array($key, PayrollService::MOIS, true)) {
                    $validator->errors()->add('monthHours', 'Mois inconnu.');
                    break;
                }
            }
        });
    }
}
