-- SafePay — schéma MySQL (base safecheck_pay)
-- À exécuter une fois (phpMyAdmin ou client mysql). Les INSERT de settings sont idempotents.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Effectif : identité, mode de perception, salaire de base actuel, RIB.
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(32) NOT NULL,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  perception VARCHAR(20) NOT NULL DEFAULT 'VB',
  salaire_initial DECIMAL(12,2) NOT NULL DEFAULT 0,
  compte_bancaire VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Barème : un salaire s'applique à partir de from_mois jusqu'au suivant.
CREATE TABLE IF NOT EXISTS salary_history (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id VARCHAR(32) NOT NULL,
  from_mois VARCHAR(20) NOT NULL,
  salaire DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_employee_from_mois (employee_id, from_mois),
  CONSTRAINT fk_salary_history_employee
    FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pointage mensuel (heures_prestees NULL = non renseigné).
CREATE TABLE IF NOT EXISTS hours (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id VARCHAR(32) NOT NULL,
  mois VARCHAR(20) NOT NULL,
  heures_prestees DECIMAL(8,2) NULL,
  bonus_horaire DECIMAL(8,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_employee_mois (employee_id, mois),
  CONSTRAINT fk_hours_employee
    FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Instantané figé d'un mois (le suivi ne recalcule pas à la volée).
CREATE TABLE IF NOT EXISTS archives (
  id VARCHAR(64) NOT NULL,
  mois VARCHAR(20) NOT NULL,
  employee_id VARCHAR(32) NOT NULL,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  perception VARCHAR(20) NOT NULL,
  heures_prestees DECIMAL(8,2) NULL,
  heures_theoriques DECIMAL(8,2) NULL,
  delta DECIMAL(8,2) NULL,
  salaire DECIMAL(12,2) NOT NULL DEFAULT 0,
  montant_bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
  salaire_plus_bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
  retenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  en_retard TINYINT(1) NOT NULL DEFAULT 0,
  archived_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_archives_mois (mois),
  KEY idx_archives_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Une seule ligne (id = 1) : règles de calcul et mois courant.
CREATE TABLE IF NOT EXISTS settings (
  id TINYINT UNSIGNED NOT NULL,
  threshold DECIMAL(8,2) NOT NULL DEFAULT 0,
  perceptions JSON NOT NULL,
  month_hours JSON NOT NULL,
  current_month VARCHAR(20) NOT NULL DEFAULT 'Juillet',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Valeurs d'usine : seuil 0, VB/CASH, 186 h / 179,2 h selon la longueur du mois.
INSERT INTO settings (id, threshold, perceptions, month_hours, current_month)
VALUES (
  1,
  0,
  JSON_ARRAY('VB', 'CASH'),
  JSON_OBJECT(
    'Janvier', 186, 'Février', 179.2, 'Mars', 186, 'Avril', 179.2,
    'Mai', 186, 'Juin', 179.2, 'Juillet', 186, 'Août', 186,
    'Septembre', 179.2, 'Octobre', 186, 'Novembre', 179.2, 'Décembre', 186
  ),
  'Juillet'
)
ON DUPLICATE KEY UPDATE id = id;

SET FOREIGN_KEY_CHECKS = 1;
