// Logique métier reproduite depuis le classeur Excel "Salaire_Juillet_Correction.xlsm"
// (onglets Outils / Heures prestées / Fiche Salariale / Cle / Suivi Mensuel)

export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// Heures théoriques par défaut : 186h pour les mois de 31 jours, 179.2h sinon.
// Entièrement modifiable dans Paramètres.
export const DEFAULT_MONTH_HOURS = {
  Janvier: 186, Février: 179.2, Mars: 186, Avril: 179.2, Mai: 186, Juin: 179.2,
  Juillet: 186, Août: 186, Septembre: 179.2, Octobre: 186, Novembre: 179.2, Décembre: 186,
};

export const PERCEPTIONS = ['VB', 'CASH'];

/** Paramètres de calcul par défaut (surchargés par la table MySQL `settings`). */
export const DEFAULT_SETTINGS = {
  monthHours: { ...DEFAULT_MONTH_HOURS },
  // Seuil de delta (en heures) à partir duquel le salaire n'est plus proratisé à la baisse.
  threshold: 0,
  perceptions: [...PERCEPTIONS],
};

/** Heures théoriques du mois, ou 186 h si le mois n'est pas dans la table. */
export function heuresTheoriques(mois, settings) {
  const table = settings?.monthHours || DEFAULT_MONTH_HOURS;
  return table[mois] ?? 186;
}

/** Position du mois dans l'année civile (0 = janvier), ou -1 si inconnu. */
function monthIndex(mois) {
  return MOIS.indexOf(mois);
}

/**
 * Salaire de base en vigueur pour un mois donné, d'après l'historique
 * des modifications (chaque entrée s'applique jusqu'à la suivante).
 */
export function salaireForMonth(employee, mois) {
  const history = employee?.salaireHistory;
  if (!Array.isArray(history) || history.length === 0) {
    return Number(employee?.salaireInitial) || 0;
  }

  const idx = monthIndex(mois);
  const applicable = history
    .filter((h) => monthIndex(h.fromMois) !== -1 && monthIndex(h.fromMois) <= idx)
    .sort((a, b) => monthIndex(a.fromMois) - monthIndex(b.fromMois));

  if (!applicable.length) return Number(employee?.salaireInitial) || 0;
  return Number(applicable[applicable.length - 1].salaire) || 0;
}

/**
 * Enregistre un nouveau salaire à partir d'un mois : les mois antérieurs
 * conservent l'ancien montant, les mois suivants (y compris le mois d'effet)
 * utilisent le nouveau.
 */
export function applySalaryChange(employee, newSalaire, fromMois) {
  const fromIdx = monthIndex(fromMois);
  const oldSalaire = Number(employee.salaireInitial);
  const amount = Number(newSalaire);
  let history = Array.isArray(employee.salaireHistory) ? [...employee.salaireHistory] : [];

  if (history.length === 0) {
    history = [{ fromMois: 'Janvier', salaire: oldSalaire }];
  }

  history = history.filter((h) => monthIndex(h.fromMois) < fromIdx);

  if (fromIdx > 0 && history.length === 0) {
    history = [{ fromMois: 'Janvier', salaire: oldSalaire }];
  }

  history.push({ fromMois, salaire: amount });
  history.sort((a, b) => monthIndex(a.fromMois) - monthIndex(b.fromMois));

  return {
    salaireInitial: amount,
    salaireHistory: history,
  };
}

/**
 * Calcule la fiche salariale d'un employé pour un mois donné, à partir du
 * salaire de base, des heures prestées et d'un éventuel bonus horaire.
 * Reproduit fidèlement les formules F/G/H/I de l'onglet "Fiche Salariale".
 */
export function computePayslip({ salaireInitial, heuresPrestees, bonusHoraire, mois, settings }) {
  const theo = heuresTheoriques(mois, settings);
  const threshold = settings?.threshold ?? 0;

  const hasHours = heuresPrestees !== '' && heuresPrestees !== null && heuresPrestees !== undefined && Number(heuresPrestees) !== 0;

  // Sans heures encodées, on n'invente pas de salaire (delta restera « non renseigné »).
  if (!hasHours || !theo) {
    return {
      heuresTheoriques: theo,
      delta: null,
      salaire: 0,
      montantBonus: 0,
      salairePlusBonus: 0,
      retenue: 0,
      enRetard: false,
    };
  }

  const hp = Number(heuresPrestees);
  const bonus = Number(bonusHoraire) || 0;
  const delta = hp - theo;
  const ratio = delta / theo;

  // Au-dessus du seuil : salaire plein. En dessous : prorata (1 + delta/théorique).
  const salaire = delta >= threshold ? salaireInitial : salaireInitial * (1 + ratio);
  // Bonus = fraction du salaire de base correspondant aux heures de bonus.
  const montantBonus = bonus ? salaireInitial * (bonus / theo) : 0;
  const salairePlusBonus = salaire + montantBonus;
  const retenue = delta < threshold ? Math.abs(salaireInitial * ratio) : 0;

  return {
    heuresTheoriques: theo,
    delta,
    salaire,
    montantBonus,
    salairePlusBonus,
    retenue,
    enRetard: delta < 0,
  };
}

/** Montant en dollars, format français (ex. 1 230,50 $). */
export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' $';
}

/** Durée en heures, format français (ex. 184,45 h). */
export function formatHours(value) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value) + ' h';
}
