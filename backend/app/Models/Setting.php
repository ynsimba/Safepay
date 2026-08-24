<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Paramètres globaux (une seule ligne, id = 1). */
class Setting extends Model
{
    public $incrementing = false;

    public const CREATED_AT = null;

    protected $keyType = 'int';

    protected $fillable = ['id', 'threshold', 'perceptions', 'month_hours', 'current_month', 'current_year'];

    protected function casts(): array
    {
        return [
            'threshold' => 'float',
            'perceptions' => 'array',
            'month_hours' => 'array',
        ];
    }

    public static function current(): self
    {
        return static::query()->findOrFail(1);
    }

    public function toFront(): array
    {
        return [
            'threshold' => (float) $this->threshold,
            'perceptions' => $this->perceptions ?: ['VB', 'CASH'],
            'monthHours' => $this->month_hours ?: [],
        ];
    }
}
