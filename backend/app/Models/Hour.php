<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Pointage mensuel (heures prestées + bonus horaire). */
class Hour extends Model
{
    public $timestamps = false;

    protected $fillable = ['employee_id', 'mois', 'annee', 'heures_prestees', 'bonus_horaire'];

    protected function casts(): array
    {
        return [
            'heures_prestees' => 'float',
            'bonus_horaire' => 'float',
            'annee' => 'integer',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
