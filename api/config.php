<?php
/**
 * Accès MySQL (MAMP par défaut : 127.0.0.1:8889).
 * Surcharge possible via SAFECHECK_DB_HOST, _PORT, _NAME, _USER, _PASS.
 */

return [
    'host' => getenv('SAFECHECK_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('SAFECHECK_DB_PORT') ?: '8889',
    'name' => getenv('SAFECHECK_DB_NAME') ?: 'safecheck_pay',
    'user' => getenv('SAFECHECK_DB_USER') ?: 'root',
    'pass' => getenv('SAFECHECK_DB_PASS') !== false ? getenv('SAFECHECK_DB_PASS') : 'root',
    'charset' => 'utf8mb4',
];
