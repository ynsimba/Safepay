<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Employé de l'effectif (clé string, ex. e1). */
class Employee extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'nom', 'prenom', 'perception', 'salaire_initial', 'compte_bancaire',
    ];

    protected function casts(): array
    {
        return [
            'salaire_initial' => 'float',
        ];
    }

    public function salaryHistory(): HasMany
    {
        return $this->hasMany(SalaryHistory::class, 'employee_id')->orderBy('id');
    }

    public function hours(): HasMany
    {
        return $this->hasMany(Hour::class, 'employee_id');
    }

    /** Représentation camelCase attendue par le front. */
    public function toFront(): array
    {
        return [
            'id' => $this->id,
            'nom' => $this->nom,
            'prenom' => $this->prenom,
            'perception' => $this->perception,
            'salaireInitial' => (float) $this->salaire_initial,
            'compteBancaire' => $this->compte_bancaire ?? '',
            'salaireHistory' => $this->salaryHistory->map(fn (SalaryHistory $h) => [
                'fromMois' => $h->from_mois,
                'salaire' => (float) $h->salaire,
            ])->values()->all(),
        ];
    }
}
