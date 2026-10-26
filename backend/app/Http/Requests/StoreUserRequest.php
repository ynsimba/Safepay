<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name', '')),
            'email' => strtolower(trim((string) $this->input('email', ''))),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:12', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom est requis.',
            'email.required' => "L'e-mail est requis.",
            'email.email' => "L'e-mail est invalide.",
            'email.unique' => 'Un compte existe déjà avec cet e-mail.',
            'password.required' => 'Le mot de passe est requis.',
            'password.min' => 'Le mot de passe doit contenir au moins 12 caractères.',
        ];
    }
}
