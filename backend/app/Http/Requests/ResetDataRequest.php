<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'confirm' => ['required', 'in:RESET'],
        ];
    }

    public function messages(): array
    {
        return [
            'confirm.in' => 'Confirmation invalide. Envoyez confirm=RESET.',
        ];
    }
}
