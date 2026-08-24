<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Instantané figé d'une fiche salariale (suivi mensuel). */
class Archive extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $table = 'archives';

    protected $fillable = [
        'id', 'mois', 'annee', 'employee_id', 'nom', 'prenom', 'perception',
        'heures_prestees', 'heures_theoriques', 'delta', 'salaire',
        'montant_bonus', 'salaire_plus_bonus', 'retenue', 'en_retard', 'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'heures_prestees' => 'float',
            'heures_theoriques' => 'float',
            'delta' => 'float',
            'salaire' => 'float',
            'montant_bonus' => 'float',
            'salaire_plus_bonus' => 'float',
            'retenue' => 'float',
            'en_retard' => 'boolean',
            'archived_at' => 'datetime',
            'annee' => 'integer',
        ];
    }

    public function toFront(): array
    {
        return [
            'id' => $this->id,
            'mois' => $this->mois,
            'annee' => (int) $this->annee,
            'employeeId' => $this->employee_id,
            'nom' => $this->nom,
            'prenom' => $this->prenom,
            'perception' => $this->perception,
            'heuresPrestees' => $this->heures_prestees === null ? '' : (float) $this->heures_prestees,
            'heuresTheoriques' => $this->heures_theoriques === null ? null : (float) $this->heures_theoriques,
            'delta' => $this->delta === null ? null : (float) $this->delta,
            'salaire' => (float) $this->salaire,
            'montantBonus' => (float) $this->montant_bonus,
            'salairePlusBonus' => (float) $this->salaire_plus_bonus,
            'retenue' => (float) $this->retenue,
            'enRetard' => (bool) $this->en_retard,
            'archivedAt' => optional($this->archived_at)?->toIso8601String(),
        ];
    }
}
