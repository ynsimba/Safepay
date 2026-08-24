<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;

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
            'password' => ['required', 'string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $password = (string) $this->input('password', '');
            if ($password === '') {
                return;
            }
            $user = $this->user();
            if (! $user || ! Hash::check($password, $user->getAuthPassword())) {
                $validator->errors()->add('password', 'Mot de passe incorrect.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'confirm.in' => 'Confirmation invalide. Envoyez confirm=RESET.',
            'password.required' => 'Le mot de passe est requis pour confirmer.',
        ];
    }
}
