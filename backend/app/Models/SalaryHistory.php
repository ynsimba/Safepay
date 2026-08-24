<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Barème salarial : un montant s'applique à partir d'un mois donné. */
class SalaryHistory extends Model
{
    public $timestamps = false;

    protected $table = 'salary_history';

    protected $fillable = ['employee_id', 'from_mois', 'salaire'];

    protected function casts(): array
    {
        return ['salaire' => 'float'];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
