/**
 * Encodage mensuel des heures prestées et du bonus horaire, par employé.
 */
import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { heuresTheoriques, formatHours, availableYears, formatPeriod } from '../utils/payroll';
import { nextSort, sortRows } from '../utils/tableSort.js';
import MonthSelect from '../components/MonthSelect.jsx';
import YearSelect from '../components/YearSelect.jsx';
import { DeltaBadge } from '../components/Badges.jsx';
import SortTh from '../components/SortTh.jsx';
import SearchBar, { matchesSearch } from '../components/SearchBar.jsx';

const SORT_COLUMNS = [
  { key: 'employe', label: 'Employé' },
  { key: 'heures', label: 'Heures prestées', style: { width: 160 } },
  { key: 'theo', label: 'Heures théoriques', style: { width: 130 } },
  { key: 'delta', label: 'Delta', style: { width: 150 } },
  { key: 'bonus', label: 'Bonus horaire', style: { width: 160 } },
];

function hoursSortValue(row, key) {
  switch (key) {
    case 'employe':
      return `${row.emp.nom} ${row.emp.prenom}`;
    case 'heures':
      return row.h.heuresPrestees === '' || row.h.heuresPrestees == null ? null : Number(row.h.heuresPrestees);
    case 'theo':
      return Number(row.theo);
    case 'delta':
      return row.delta == null ? null : Number(row.delta);
    case 'bonus':
      return row.h.bonusHoraire === '' || row.h.bonusHoraire == null ? null : Number(row.h.bonusHoraire);
    default:
      return '';
  }
}

export default function Hours() {
  const { employees, hoursByMonth, setHours, currentMonth, currentYear, setCurrentMonth, settings, archivedMonths, archive } = useData();
  const [mois, setMois] = useState(currentMonth);
  const [annee, setAnnee] = useState(currentYear);
  const [periodTouched, setPeriodTouched] = useState(false);
  const [sort, setSort] = useState({ key: 'employe', dir: 'asc' });
  const [search, setSearch] = useState('');
  const years = useMemo(() => availableYears(archive, currentYear), [archive, currentYear]);

  useEffect(() => {
    if (periodTouched) return;
    setMois(currentMonth);
    setAnnee(currentYear);
  }, [currentMonth, currentYear, periodTouched]);

  function selectMonth(m) {
    setPeriodTouched(true);
    setMois(m);
    setCurrentMonth(m, annee);
  }

  function selectYear(y) {
    setPeriodTouched(true);
    setAnnee(y);
    setCurrentMonth(mois, y);
  }

  const theo = heuresTheoriques(mois, settings);
  const byEmp = hoursByMonth[mois] || {};

  const rows = useMemo(
    () =>
      employees.map((emp) => {
        const h = byEmp[emp.id] || { heuresPrestees: '', bonusHoraire: '' };
        const hasHours = h.heuresPrestees !== '' && h.heuresPrestees !== null && Number(h.heuresPrestees) !== 0;
        const delta = hasHours ? Number(h.heuresPrestees) - theo : null;
        return { emp, h, delta, theo };
      }),
    [employees, byEmp, theo]
  );

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((r) =>
      matchesSearch(`${r.emp.nom} ${r.emp.prenom} ${r.emp.perception}`, search)
    );
    return sortRows(filtered, sort, hoursSortValue);
  }, [rows, sort, search]);

  const totals = useMemo(() => {
    const filled = rows.filter((r) => r.delta !== null);
    const presteesSum = filled.reduce((s, r) => s + Number(r.h.heuresPrestees), 0);
    return { count: filled.length, presteesSum, theoSum: filled.length * theo };
  }, [rows, theo]);

  const isArchived = archivedMonths.includes(mois);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted small">Période :</span>
          <YearSelect value={annee} onChange={selectYear} years={years} className="w-auto" />
          <MonthSelect value={mois} onChange={selectMonth} className="w-auto" highlight={archivedMonths} />
          <span className="badge bg-light text-dark border">Heures théoriques : {formatHours(theo)}</span>
          <SearchBar value={search} onChange={setSearch} />
        </div>
        {isArchived && (
          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-3 py-2">
            <i className="bi bi-archive me-1" /> Ce mois est déjà archivé — modifier les heures puis réarchiver pour mettre à jour le Suivi mensuel.
          </span>
        )}
      </div>

      <div className="sp-card p-3">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h6 className="fw-bold mb-0">Heures théorique vs prestées — {formatPeriod(mois, annee)}</h6>
          <span className="text-muted small">
            {totals.count} employé(s) pointé(s) · Total prestées {formatHours(totals.presteesSum)} / {formatHours(totals.theoSum)}
          </span>
        </div>
        <div className="table-responsive">
          <table className="table sp-table mb-0 align-middle">
            <thead>
              <tr>
                {SORT_COLUMNS.map((column) => (
                  <SortTh
                    key={column.key}
                    column={column}
                    sort={sort}
                    onSort={(key) => setSort((s) => nextSort(s, key))}
                    style={column.style}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted py-4">Aucun employé trouvé</td></tr>
              )}
              {visibleRows.map(({ emp, h, delta, theo: rowTheo }) => (
                <tr key={emp.id}>
                  <td className="fw-semibold">{emp.nom} {emp.prenom}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control form-control-sm"
                      value={h.heuresPrestees ?? ''}
                      placeholder="—"
                      onChange={(e) => setHours(mois, emp.id, { heuresPrestees: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </td>
                  <td className="text-muted">{formatHours(rowTheo)}</td>
                  <td><DeltaBadge delta={delta} /></td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control form-control-sm"
                      value={h.bonusHoraire ?? ''}
                      placeholder="0"
                      onChange={(e) => setHours(mois, emp.id, { bonusHoraire: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="alert alert-light border small mb-0">
        <i className="bi bi-lightbulb me-1" /> Le <strong>bonus horaire</strong> représente un nombre d'heures supplémentaires accordées en bonus ; il est converti en montant proportionnellement au salaire de base sur la Fiche salariale.
      </div>
    </div>
  );
}
