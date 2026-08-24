<?php

namespace App\Http\Requests;

use App\Services\PayrollService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MonthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mois' => ['required', 'string', Rule::in(PayrollService::MOIS)],
        ];
    }
}
