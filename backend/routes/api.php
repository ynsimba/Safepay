<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PayrollController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/state', [PayrollController::class, 'state']);
    Route::post('/employees', [PayrollController::class, 'storeEmployee']);
    Route::put('/employees/{id}', [PayrollController::class, 'updateEmployee']);
    Route::delete('/employees/{id}', [PayrollController::class, 'destroyEmployee']);
    Route::put('/hours', [PayrollController::class, 'upsertHours']);
    Route::put('/settings', [PayrollController::class, 'updateSettings']);
    Route::put('/current-month', [PayrollController::class, 'setCurrentMonth']);
    Route::post('/archive', [PayrollController::class, 'archive']);
    Route::delete('/archive/{mois}', [PayrollController::class, 'destroyArchive']);
    Route::post('/reset', [PayrollController::class, 'reset']);
});
