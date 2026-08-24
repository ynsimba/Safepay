<?php

namespace App\Models;

use App\Support\BankAccount;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

/** Employé de l'effectif (clé string, ex. e1). */
class Employee extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'nom', 'prenom', 'telephone', 'perception', 'salaire_initial', 'compte_bancaire',
    ];

    protected function casts(): array
    {
        return [
            'salaire_initial' => 'float',
        ];
    }

    /** IBAN chiffré au repos (APP_KEY). */
    protected function compteBancaire(): Attribute
    {
        return Attribute::make(
            get: function (?string $value) {
                if ($value === null || $value === '') {
                    return null;
                }
                try {
                    return Crypt::decryptString($value);
                } catch (\Throwable) {
                    return $value;
                }
            },
            set: function (?string $value) {
                $trimmed = trim((string) $value);
                if ($trimmed === '') {
                    return null;
                }

                return Crypt::encryptString($trimmed);
            },
        );
    }

    public function salaryHistory(): HasMany
    {
        return $this->hasMany(SalaryHistory::class, 'employee_id')->orderBy('from_annee')->orderBy('id');
    }

    public function hours(): HasMany
    {
        return $this->hasMany(Hour::class, 'employee_id');
    }

    /**
     * Représentation camelCase attendue par le front.
     * L'IBAN complet n'est inclus que sur GET /employees/{id}.
     */
    public function toFront(bool $includeFullBankAccount = false): array
    {
        $iban = $this->compte_bancaire ?? '';

        return [
            'id' => $this->id,
            'nom' => $this->nom,
            'prenom' => $this->prenom,
            'telephone' => $this->telephone ?? '',
            'perception' => $this->perception,
            'salaireInitial' => (float) $this->salaire_initial,
            'compteBancaire' => $includeFullBankAccount ? $iban : BankAccount::mask($iban),
            'salaireHistory' => $this->salaryHistory->map(fn (SalaryHistory $h) => [
                'fromMois' => $h->from_mois,
                'fromAnnee' => (int) ($h->from_annee ?: 2026),
                'salaire' => (float) $h->salaire,
            ])->values()->all(),
        ];
    }
}
