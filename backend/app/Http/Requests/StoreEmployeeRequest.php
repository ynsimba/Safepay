<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
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
            'perception' => ['required', 'string', 'max:40'],
            'salaireInitial' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'compteBancaire' => ['nullable', 'string', 'max:64'],
        ];
    }
}
