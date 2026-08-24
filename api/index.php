<?php
/**
 * Routeur REST de Safecheck Pay.
 * Sert aussi de script router pour `php -S 127.0.0.1:8010 index.php`.
 * Chaque mutation répond avec l'état complet (get_state).
 */

require __DIR__ . '/lib.php';

cors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
// Vite proxye /api/... ; le serveur PHP peut aussi recevoir le préfixe.
$path = preg_replace('#^/api#', '', $path) ?? $path;
$path = rtrim($path, '/') ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

try {
    $pdo = db();

    if ($method === 'GET' && $path === '/state') {
        send_json(get_state($pdo));
    }

    // Création d'un employé (id généré si absent).
    if ($method === 'POST' && $path === '/employees') {
        $body = json_input();
        $id = $body['id'] ?? ('e' . round(microtime(true) * 1000));
        $pdo->prepare(
            'INSERT INTO employees (id, nom, prenom, perception, salaire_initial, compte_bancaire)
             VALUES (:id, :nom, :prenom, :perception, :salaire, :compte)'
        )->execute([
            ':id' => $id,
            ':nom' => trim((string) ($body['nom'] ?? '')),
            ':prenom' => trim((string) ($body['prenom'] ?? '')),
            ':perception' => $body['perception'] ?? 'VB',
            ':salaire' => num($body['salaireInitial'] ?? 0),
            ':compte' => trim((string) ($body['compteBancaire'] ?? '')) ?: null,
        ]);
        send_json(get_state($pdo));
    }

    // Mise à jour + remplacement éventuel de l'historique salarial.
    if ($method === 'PUT' && preg_match('#^/employees/([^/]+)$#', $path, $m)) {
        $id = urldecode($m[1]);
        $body = json_input();
        $pdo->prepare(
            'UPDATE employees SET nom = :nom, prenom = :prenom, perception = :perception,
             salaire_initial = :salaire, compte_bancaire = :compte WHERE id = :id'
        )->execute([
            ':id' => $id,
            ':nom' => trim((string) ($body['nom'] ?? '')),
            ':prenom' => trim((string) ($body['prenom'] ?? '')),
            ':perception' => $body['perception'] ?? 'VB',
            ':salaire' => num($body['salaireInitial'] ?? 0),
            ':compte' => trim((string) ($body['compteBancaire'] ?? '')) ?: null,
        ]);
        if (array_key_exists('salaireHistory', $body)) {
            replace_salary_history($pdo, $id, is_array($body['salaireHistory']) ? $body['salaireHistory'] : []);
        }
        send_json(get_state($pdo));
    }

    if ($method === 'DELETE' && preg_match('#^/employees/([^/]+)$#', $path, $m)) {
        $id = urldecode($m[1]);
        $pdo->prepare('DELETE FROM employees WHERE id = :id')->execute([':id' => $id]);
        send_json(get_state($pdo));
    }

    // Heures prestées d'un employé pour un mois (upsert).
    if ($method === 'PUT' && $path === '/hours') {
        $body = json_input();
        $mois = (string) ($body['mois'] ?? '');
        $employeeId = (string) ($body['employeeId'] ?? '');
        if ($mois === '' || $employeeId === '') {
            send_error('Mois et employé requis');
        }
        $heures = $body['heuresPrestees'] ?? '';
        $bonus = $body['bonusHoraire'] ?? 0;
        $heuresVal = ($heures === '' || $heures === null) ? null : num($heures);
        $bonusVal = ($bonus === '' || $bonus === null) ? 0 : num($bonus);
        $pdo->prepare(
            'INSERT INTO hours (employee_id, mois, heures_prestees, bonus_horaire)
             VALUES (:employee_id, :mois, :heures, :bonus)
             ON DUPLICATE KEY UPDATE heures_prestees = VALUES(heures_prestees), bonus_horaire = VALUES(bonus_horaire)'
        )->execute([
            ':employee_id' => $employeeId,
            ':mois' => $mois,
            ':heures' => $heuresVal,
            ':bonus' => $bonusVal,
        ]);
        send_json(get_state($pdo));
    }

    // Paramètres de calcul (seuil, perceptions, heures théoriques).
    if ($method === 'PUT' && $path === '/settings') {
        $body = json_input();
        $current = load_settings($pdo);
        $threshold = array_key_exists('threshold', $body) ? num($body['threshold']) : $current['threshold'];
        $perceptions = $body['perceptions'] ?? $current['perceptions'];
        $monthHours = $body['monthHours'] ?? $current['monthHours'];
        $pdo->prepare(
            'UPDATE settings SET threshold = :threshold, perceptions = :perceptions, month_hours = :month_hours WHERE id = 1'
        )->execute([
            ':threshold' => $threshold,
            ':perceptions' => json_encode($perceptions, JSON_UNESCAPED_UNICODE),
            ':month_hours' => json_encode($monthHours, JSON_UNESCAPED_UNICODE),
        ]);
        send_json(get_state($pdo));
    }

    // Mois de travail mémorisé (sélecteur du tableau de bord / heures / fiches).
    if ($method === 'PUT' && $path === '/current-month') {
        $body = json_input();
        $mois = (string) ($body['mois'] ?? '');
        if ($mois === '') {
            send_error('Mois requis');
        }
        $pdo->prepare('UPDATE settings SET current_month = :mois WHERE id = 1')->execute([':mois' => $mois]);
        send_json(get_state($pdo));
    }

    // Recalcule et fige toutes les fiches du mois (remplace l'archive existante).
    if ($method === 'POST' && $path === '/archive') {
        $body = json_input();
        $mois = (string) ($body['mois'] ?? '');
        if ($mois === '') {
            send_error('Mois requis');
        }
        $settings = load_settings($pdo);
        $employees = load_employees($pdo);
        $hoursByMonth = load_hours($pdo);
        $byEmp = $hoursByMonth[$mois] ?? [];
        $pdo->prepare('DELETE FROM archives WHERE mois = :mois')->execute([':mois' => $mois]);
        $ins = $pdo->prepare(
            'INSERT INTO archives (
                id, mois, employee_id, nom, prenom, perception, heures_prestees,
                heures_theoriques, delta, salaire, montant_bonus, salaire_plus_bonus,
                retenue, en_retard, archived_at
             ) VALUES (
                :id, :mois, :employee_id, :nom, :prenom, :perception, :heures_prestees,
                :heures_theoriques, :delta, :salaire, :montant_bonus, :salaire_plus_bonus,
                :retenue, :en_retard, :archived_at
             )'
        );
        $now = date('Y-m-d H:i:s');
        foreach ($employees as $emp) {
            $hours = $byEmp[$emp['id']] ?? ['heuresPrestees' => '', 'bonusHoraire' => 0];
            $payslip = compute_payslip([
                'salaireInitial' => salaire_for_month($emp, $mois, $MONTHS),
                'heuresPrestees' => $hours['heuresPrestees'],
                'bonusHoraire' => $hours['bonusHoraire'] ?? 0,
                'mois' => $mois,
                'settings' => $settings,
            ]);
            $heures = $hours['heuresPrestees'] === '' ? null : $hours['heuresPrestees'];
            $ins->execute([
                ':id' => $mois . '-' . $emp['id'],
                ':mois' => $mois,
                ':employee_id' => $emp['id'],
                ':nom' => $emp['nom'],
                ':prenom' => $emp['prenom'],
                ':perception' => $emp['perception'],
                ':heures_prestees' => $heures,
                ':heures_theoriques' => $payslip['heuresTheoriques'],
                ':delta' => $payslip['delta'],
                ':salaire' => $payslip['salaire'],
                ':montant_bonus' => $payslip['montantBonus'],
                ':salaire_plus_bonus' => $payslip['salairePlusBonus'],
                ':retenue' => $payslip['retenue'],
                ':en_retard' => $payslip['enRetard'] ? 1 : 0,
                ':archived_at' => $now,
            ]);
        }
        send_json(get_state($pdo));
    }

    if ($method === 'DELETE' && preg_match('#^/archive/([^/]+)$#', $path, $m)) {
        // Les heures encodées ne sont pas touchées, seulement l'instantané.
        $mois = urldecode($m[1]);
        $pdo->prepare('DELETE FROM archives WHERE mois = :mois')->execute([':mois' => $mois]);
        send_json(get_state($pdo));
    }

    if ($method === 'POST' && $path === '/reset') {
        // Restaure l'effectif Excel et l'archive de juillet.
        seed_database($pdo);
        send_json(get_state($pdo));
    }

    send_error('Route introuvable', 404);
} catch (Throwable $e) {
    send_error($e->getMessage(), 500);
}
