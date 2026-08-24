<?php
/**
 * Couche d'accès MySQL et miroir PHP des calculs de paie (src/utils/payroll.js).
 */

/**
 * Connexion PDO unique (MAMP : port 8889).
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $cfg = require __DIR__ . '/config.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $cfg['host'],
        $cfg['port'],
        $cfg['name'],
        $cfg['charset']
    );
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

/** En-têtes CORS pour le front Vite (origine locale). */
function cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
}

/** Corps JSON de la requête, ou tableau vide. */
function json_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Réponse JSON puis arrêt du script. */
function send_json($data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function send_error(string $message, int $code = 400): never
{
    send_json(['error' => $message], $code);
}

/** Cast sûr vers float (DECIMAL MySQL arrive souvent en chaîne). */
function num($value): float
{
    return (float) $value;
}

/** Heures théoriques du mois, 186 h par défaut. */
function heures_theoriques(string $mois, array $settings): float
{
    $table = $settings['monthHours'] ?? [];
    return isset($table[$mois]) ? (float) $table[$mois] : 186.0;
}

/** Salaire de base en vigueur pour un mois, d'après l'historique. */
function salaire_for_month(array $employee, string $mois, array $monthOrder): float
{
    $history = $employee['salaireHistory'] ?? [];
    if (!$history) {
        return num($employee['salaireInitial'] ?? 0);
    }
    $idx = array_search($mois, $monthOrder, true);
    if ($idx === false) {
        return num($employee['salaireInitial'] ?? 0);
    }
    $applicable = [];
    foreach ($history as $row) {
        $hIdx = array_search($row['fromMois'], $monthOrder, true);
        if ($hIdx !== false && $hIdx <= $idx) {
            $applicable[] = [$hIdx, $row];
        }
    }
    if (!$applicable) {
        return num($employee['salaireInitial'] ?? 0);
    }
    usort($applicable, fn ($a, $b) => $a[0] <=> $b[0]);
    $last = end($applicable);
    return num($last[1]['salaire']);
}

/** Même formule que computePayslip() côté JavaScript. */
function compute_payslip(array $args): array
{
    $salaireInitial = num($args['salaireInitial']);
    $heuresPrestees = $args['heuresPrestees'];
    $bonusHoraire = num($args['bonusHoraire'] ?? 0);
    $mois = $args['mois'];
    $settings = $args['settings'];
    $theo = heures_theoriques($mois, $settings);
    $threshold = num($settings['threshold'] ?? 0);
    $hasHours = $heuresPrestees !== '' && $heuresPrestees !== null && (float) $heuresPrestees !== 0.0;

    if (!$hasHours || !$theo) {
        return [
            'heuresTheoriques' => $theo,
            'delta' => null,
            'salaire' => 0,
            'montantBonus' => 0,
            'salairePlusBonus' => 0,
            'retenue' => 0,
            'enRetard' => false,
        ];
    }

    $hp = (float) $heuresPrestees;
    $delta = $hp - $theo;
    $ratio = $delta / $theo;
    $salaire = $delta >= $threshold ? $salaireInitial : $salaireInitial * (1 + $ratio);
    $montantBonus = $bonusHoraire ? $salaireInitial * ($bonusHoraire / $theo) : 0;
    $retenue = $delta < $threshold ? abs($salaireInitial * $ratio) : 0;

    return [
        'heuresTheoriques' => $theo,
        'delta' => $delta,
        'salaire' => $salaire,
        'montantBonus' => $montantBonus,
        'salairePlusBonus' => $salaire + $montantBonus,
        'retenue' => $retenue,
        'enRetard' => $delta < 0,
    ];
}

/** Décode une colonne JSON MySQL (déjà tableau ou chaîne). */
function decode_json_field($value): array
{
    if (is_array($value)) {
        return $value;
    }
    if (!is_string($value) || $value === '') {
        return [];
    }
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}

/** Paramètres globaux (ligne unique id = 1). */
function load_settings(PDO $pdo): array
{
    $row = $pdo->query('SELECT threshold, perceptions, month_hours, current_month FROM settings WHERE id = 1')->fetch();
    if (!$row) {
        return [
            'threshold' => 0,
            'perceptions' => ['VB', 'CASH'],
            'monthHours' => [],
            'currentMonth' => 'Juillet',
        ];
    }
    return [
        'threshold' => num($row['threshold']),
        'perceptions' => decode_json_field($row['perceptions']),
        'monthHours' => decode_json_field($row['month_hours']),
        'currentMonth' => $row['current_month'],
    ];
}

/** Employés + historique salarial, clés camelCase pour le front. */
function load_employees(PDO $pdo): array
{
    $employees = [];
    $rows = $pdo->query('SELECT id, nom, prenom, perception, salaire_initial, compte_bancaire FROM employees ORDER BY nom, prenom')->fetchAll();
    $histStmt = $pdo->query('SELECT employee_id, from_mois, salaire FROM salary_history ORDER BY id');
    $historyByEmp = [];
    foreach ($histStmt as $h) {
        $historyByEmp[$h['employee_id']][] = [
            'fromMois' => $h['from_mois'],
            'salaire' => num($h['salaire']),
        ];
    }
    foreach ($rows as $row) {
        $employees[] = [
            'id' => $row['id'],
            'nom' => $row['nom'],
            'prenom' => $row['prenom'],
            'perception' => $row['perception'],
            'salaireInitial' => num($row['salaire_initial']),
            'compteBancaire' => $row['compte_bancaire'] ?? '',
            'salaireHistory' => $historyByEmp[$row['id']] ?? [],
        ];
    }
    return $employees;
}

/** Heures groupées par mois puis par employé. */
function load_hours(PDO $pdo): array
{
    $hoursByMonth = [];
    $rows = $pdo->query('SELECT employee_id, mois, heures_prestees, bonus_horaire FROM hours')->fetchAll();
    foreach ($rows as $row) {
        $hoursByMonth[$row['mois']][$row['employee_id']] = [
            'heuresPrestees' => $row['heures_prestees'] === null ? '' : num($row['heures_prestees']),
            'bonusHoraire' => num($row['bonus_horaire']),
        ];
    }
    return $hoursByMonth;
}

/** Lignes du suivi mensuel, déjà au format front. */
function load_archive(PDO $pdo): array
{
    $rows = $pdo->query('SELECT * FROM archives ORDER BY mois, nom, prenom')->fetchAll();
    $archive = [];
    foreach ($rows as $row) {
        $archive[] = [
            'id' => $row['id'],
            'mois' => $row['mois'],
            'employeeId' => $row['employee_id'],
            'nom' => $row['nom'],
            'prenom' => $row['prenom'],
            'perception' => $row['perception'],
            'heuresPrestees' => $row['heures_prestees'] === null ? '' : num($row['heures_prestees']),
            'heuresTheoriques' => $row['heures_theoriques'] === null ? null : num($row['heures_theoriques']),
            'delta' => $row['delta'] === null ? null : num($row['delta']),
            'salaire' => num($row['salaire']),
            'montantBonus' => num($row['montant_bonus']),
            'salairePlusBonus' => num($row['salaire_plus_bonus']),
            'retenue' => num($row['retenue']),
            'enRetard' => (bool) $row['en_retard'],
            'archivedAt' => date('c', strtotime($row['archived_at'])),
        ];
    }
    return $archive;
}

/** Instantané complet consommé par DataContext. */
function get_state(PDO $pdo): array
{
    maybe_seed($pdo);
    $settingsRow = load_settings($pdo);
    $currentMonth = $settingsRow['currentMonth'];
    unset($settingsRow['currentMonth']);
    return [
        'employees' => load_employees($pdo),
        'hoursByMonth' => load_hours($pdo),
        'archive' => load_archive($pdo),
        'settings' => $settingsRow,
        'currentMonth' => $currentMonth,
    ];
}

/** Premier lancement : peuple la base si aucun employé. */
function maybe_seed(PDO $pdo): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM employees')->fetchColumn();
    if ($count > 0) {
        return;
    }
    seed_database($pdo);
}

/** Vide puis réinsère l'effectif, les heures de juillet et l'archive correspondante. */
function seed_database(PDO $pdo): void
{
    $seed = require __DIR__ . '/seed-data.php';
    $pdo->beginTransaction();
    try {
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        $pdo->exec('DELETE FROM archives');
        $pdo->exec('DELETE FROM hours');
        $pdo->exec('DELETE FROM salary_history');
        $pdo->exec('DELETE FROM employees');
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

        $insEmp = $pdo->prepare(
            'INSERT INTO employees (id, nom, prenom, perception, salaire_initial, compte_bancaire)
             VALUES (:id, :nom, :prenom, :perception, :salaire, :compte)'
        );
        foreach ($seed['employees'] as $emp) {
            $insEmp->execute([
                ':id' => $emp['id'],
                ':nom' => $emp['nom'],
                ':prenom' => $emp['prenom'],
                ':perception' => $emp['perception'],
                ':salaire' => $emp['salaireInitial'],
                ':compte' => $emp['compteBancaire'] ?: null,
            ]);
        }

        $insHours = $pdo->prepare(
            'INSERT INTO hours (employee_id, mois, heures_prestees, bonus_horaire)
             VALUES (:employee_id, :mois, :heures, :bonus)'
        );
        foreach ($seed['juilletHours'] as $id => $h) {
            $insHours->execute([
                ':employee_id' => $id,
                ':mois' => 'Juillet',
                ':heures' => $h['heuresPrestees'],
                ':bonus' => $h['bonusHoraire'],
            ]);
        }

        $settings = load_settings($pdo);
        $insArch = $pdo->prepare(
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
        foreach ($seed['employees'] as $emp) {
            $hours = $seed['juilletHours'][$emp['id']];
            $payslip = compute_payslip([
                'salaireInitial' => $emp['salaireInitial'],
                'heuresPrestees' => $hours['heuresPrestees'],
                'bonusHoraire' => $hours['bonusHoraire'],
                'mois' => 'Juillet',
                'settings' => $settings,
            ]);
            $insArch->execute([
                ':id' => 'Juillet-' . $emp['id'],
                ':mois' => 'Juillet',
                ':employee_id' => $emp['id'],
                ':nom' => $emp['nom'],
                ':prenom' => $emp['prenom'],
                ':perception' => $emp['perception'],
                ':heures_prestees' => $hours['heuresPrestees'],
                ':heures_theoriques' => $payslip['heuresTheoriques'],
                ':delta' => $payslip['delta'],
                ':salaire' => $payslip['salaire'],
                ':montant_bonus' => $payslip['montantBonus'],
                ':salaire_plus_bonus' => $payslip['salairePlusBonus'],
                ':retenue' => $payslip['retenue'],
                ':en_retard' => $payslip['enRetard'] ? 1 : 0,
                ':archived_at' => '2026-07-31 00:00:00',
            ]);
        }

        $pdo->prepare('UPDATE settings SET current_month = :mois WHERE id = 1')->execute([':mois' => 'Juillet']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/** Remplace tout l'historique salarial d'un employé. */
function replace_salary_history(PDO $pdo, string $employeeId, array $history): void
{
    $pdo->prepare('DELETE FROM salary_history WHERE employee_id = :id')->execute([':id' => $employeeId]);
    if (!$history) {
        return;
    }
    $stmt = $pdo->prepare(
        'INSERT INTO salary_history (employee_id, from_mois, salaire) VALUES (:employee_id, :from_mois, :salaire)'
    );
    foreach ($history as $row) {
        $stmt->execute([
            ':employee_id' => $employeeId,
            ':from_mois' => $row['fromMois'],
            ':salaire' => num($row['salaire']),
        ]);
    }
}
