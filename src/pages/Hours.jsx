/**
 * Encodage mensuel des heures prestées et du bonus horaire, par employé.
 */
import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { heuresTheoriques, formatHours } from '../utils/payroll';
import MonthSelect from '../components/MonthSelect.jsx';
import { DeltaBadge } from '../components/Badges.jsx';

export default function Hours() {
  const { employees, hoursByMonth, setHours, currentMonth, setCurrentMonth, settings, archivedMonths } = useData();
  const [mois, setMois] = useState(currentMonth);

  function selectMonth(m) {
    setMois(m);
    // Persiste le mois choisi pour les autres écrans (fiche, tableau de bord).
    setCurrentMonth(m);
  }

  const theo = heuresTheoriques(mois, settings);
  const byEmp = hoursByMonth[mois] || {};

  const rows = useMemo(
    () =>
      employees.map((emp) => {
        const h = byEmp[emp.id] || { heuresPrestees: '', bonusHoraire: '' };
        const hasHours = h.heuresPrestees !== '' && h.heuresPrestees !== null && Number(h.heuresPrestees) !== 0;
        const delta = hasHours ? Number(h.heuresPrestees) - theo : null;
        return { emp, h, delta };
      }),
    [employees, byEmp, theo]
  );

  const totals = useMemo(() => {
    const filled = rows.filter((r) => r.delta !== null);
    const presteesSum = filled.reduce((s, r) => s + Number(r.h.heuresPrestees), 0);
    return { count: filled.length, presteesSum, theoSum: filled.length * theo };
  }, [rows, theo]);

  const isArchived = archivedMonths.includes(mois);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Mois d'encodage :</span>
          <MonthSelect value={mois} onChange={selectMonth} className="w-auto" highlight={archivedMonths} />
          <span className="badge bg-light text-dark border">Heures théoriques : {formatHours(theo)}</span>
        </div>
        {isArchived && (
          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-3 py-2">
            <i className="bi bi-archive me-1" /> Ce mois est déjà archivé — modifier les heures puis réarchiver pour mettre à jour le Suivi mensuel.
          </span>
        )}
      </div>

      <div className="sp-card p-3">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h6 className="fw-bold mb-0">Heures théorique vs prestées — {mois}</h6>
          <span className="text-muted small">
            {totals.count} employé(s) pointé(s) · Total prestées {formatHours(totals.presteesSum)} / {formatHours(totals.theoSum)}
          </span>
        </div>
        <div className="table-responsive">
          <table className="table sp-table mb-0 align-middle">
            <thead>
              <tr>
                <th>Employé</th>
                <th style={{ width: 160 }}>Heures prestées</th>
                <th style={{ width: 130 }}>Heures théoriques</th>
                <th style={{ width: 150 }}>Delta</th>
                <th style={{ width: 160 }}>Bonus horaire</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ emp, h, delta }) => (
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
                  <td className="text-muted">{formatHours(theo)}</td>
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
