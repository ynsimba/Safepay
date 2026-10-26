<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'string', 'min:12', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.required' => 'Le nouveau mot de passe est requis.',
            'password.min' => 'Le mot de passe doit contenir au moins 12 caractères.',
        ];
    }
}
