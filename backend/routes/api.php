<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PayrollController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('admin')->group(function () {
        Route::get('/state', [PayrollController::class, 'state']);
        Route::get('/employees/{id}', [PayrollController::class, 'showEmployee']);
        Route::post('/employees', [PayrollController::class, 'storeEmployee']);
        Route::put('/employees/{id}', [PayrollController::class, 'updateEmployee']);
        Route::delete('/employees/{id}', [PayrollController::class, 'destroyEmployee']);
        Route::put('/hours', [PayrollController::class, 'upsertHours']);
        Route::put('/settings', [PayrollController::class, 'updateSettings']);
        Route::put('/current-month', [PayrollController::class, 'setCurrentMonth']);
        Route::post('/archive', [PayrollController::class, 'archive']);
        Route::delete('/archive/{annee}/{mois}', [PayrollController::class, 'destroyArchive']);
        Route::get('/audit', [PayrollController::class, 'audit']);
        Route::post('/reset', [PayrollController::class, 'reset'])->middleware('throttle:3,10');
    });
});
