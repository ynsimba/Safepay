/**
 * Tableau de bord : KPI du mois archivé, évolution annuelle, détail par employé.
 */
import { useMemo, useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ComposedChart, Bar, Line,
} from 'recharts';
import { useData } from '../context/DataContext.jsx';
import { MOIS, heuresTheoriques, formatCurrency, computePayslip, salaireForMonth } from '../utils/payroll';
import MonthSelect from '../components/MonthSelect.jsx';
import { DeltaBadge } from '../components/Badges.jsx';
import SortTh from '../components/SortTh.jsx';
import { nextSort, sortRows } from '../utils/tableSort.js';
import SearchBar, { matchesSearch } from '../components/SearchBar.jsx';

const COLORS = ['#3457d5', '#17c3a2', '#f5a524', '#e5484d'];

/** Libellés courts de l'axe X (Jun/Jul distincts, contrairement à « Jui »). */
const MOIS_COURT = {
  Janvier: 'Jan', Février: 'Fév', Mars: 'Mar', Avril: 'Avr',
  Mai: 'Mai', Juin: 'Jun', Juillet: 'Jul', Août: 'Aoû',
  Septembre: 'Sep', Octobre: 'Oct', Novembre: 'Nov', Décembre: 'Déc',
};

const EVOLUTION_SERIES = [
  { key: 'masseSalariale', name: 'Masse salariale', color: '#3457d5' },
  { key: 'bonus', name: 'Bonus', color: '#12b89a' },
  { key: 'retenue', name: 'Retenue', color: '#e5484d' },
];

/** Compacte les grands montants (12 800 $ → 12,8 k$) pour l'axe Y. */
function formatAxisCurrency(value) {
  if (value == null) return '';
  if (value === 0) return '0 $';
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: k >= 10 ? 0 : 1,
    }).format(k);
    return `${formatted} k$`;
  }
  return formatCurrency(value);
}

/** True si des heures prestées ont vraiment été saisies (0 et vide = absent). */
function hasEncodedHours(hours) {
  const v = hours?.heuresPrestees;
  return v !== '' && v != null && Number(v) !== 0;
}

/** Agrège un mois déjà figé dans le suivi mensuel. */
function monthTotalsFromArchive(rows) {
  return {
    masseSalariale: rows.reduce((s, r) => s + Number(r.salairePlusBonus || 0), 0),
    bonus: rows.reduce((s, r) => s + Number(r.montantBonus || 0), 0),
    retenue: rows.reduce((s, r) => s + Number(r.retenue || 0), 0),
  };
}

/** Infobulle du graphique d'évolution (masse, bonus, retenue). */
function EvolutionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const full = payload[0]?.payload?.moisFull;
  const source = payload[0]?.payload?.source;
  const rows = payload.filter((p) => p.value != null);
  if (!rows.length) return null;
  return (
    <div className="sp-chart-tooltip">
      <div className="sp-chart-tooltip-title">
        {full}
        {source === 'live' && <span className="sp-chart-tooltip-hint"> · heures encodées</span>}
        {source === 'archive' && <span className="sp-chart-tooltip-hint"> · archivé</span>}
      </div>
      {rows.map((p) => (
        <div key={p.dataKey} className="sp-chart-tooltip-row">
          <span className="sp-chart-tooltip-dot" style={{ background: p.color || p.fill || p.stroke }} />
          <span>{p.name}</span>
          <strong>{formatCurrency(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

/** Carte indicateur colorée (masse, bonus, retenues, etc.). */
function Kpi({ icon, tone, label, value, sub, col = 'col-12 col-sm-6 col-xl-4' }) {
  return (
    <div className={col}>
      <div className={`sp-widget sp-widget-${tone}`}>
        <div className="sp-widget-top">
          <span className="sp-widget-icon">
            <i className={`bi ${icon}`} />
          </span>
          <span className="sp-widget-label">{label}</span>
        </div>
        <div className="sp-widget-value">{value}</div>
        {sub && <div className="sp-widget-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { employees, archive, hoursByMonth, settings, currentMonth, archivedMonths } = useData();
  const [mois, setMois] = useState(currentMonth);
  const [empSort, setEmpSort] = useState({ key: 'delta', dir: 'asc' });
  const [search, setSearch] = useState('');

  // KPI et camembert : uniquement le mois archivé sélectionné.
  const rows = useMemo(() => archive.filter((a) => a.mois === mois), [archive, mois]);

  const kpis = useMemo(() => {
    const masseSalariale = rows.reduce((s, r) => s + (r.salairePlusBonus || 0), 0);
    const totalBonus = rows.reduce((s, r) => s + (r.montantBonus || 0), 0);
    const totalRetenues = rows.reduce((s, r) => s + (r.retenue || 0), 0);
    const enRetard = rows.filter((r) => r.delta !== null && r.delta < 0).length;
    const totalPointes = rows.filter((r) => r.delta !== null).length;
    const pctRetard = totalPointes ? enRetard / totalPointes : 0;
    const impactNet = Math.abs(totalBonus - totalRetenues);
    return { masseSalariale, totalBonus, totalRetenues, enRetard, pctRetard, impactNet };
  }, [rows]);

  const tauxRealisation = useMemo(() => {
    const byEmp = hoursByMonth[mois] || {};
    let presteesSum = 0;
    let theoSum = 0;
    employees.forEach((emp) => {
      const h = byEmp[emp.id];
      if (h && h.heuresPrestees !== '' && h.heuresPrestees !== null && Number(h.heuresPrestees) !== 0) {
        presteesSum += Number(h.heuresPrestees);
        theoSum += heuresTheoriques(mois, settings);
      }
    });
    return theoSum ? presteesSum / theoSum : null;
  }, [hoursByMonth, mois, employees, settings]);

  const evolution = useMemo(() => {
    return MOIS.map((m) => {
      const archivedRows = archive.filter((a) => a.mois === m);
      // Priorité à l'instantané archivé (chiffres officiels du suivi).
      if (archivedRows.length > 0) {
        return { mois: MOIS_COURT[m], moisFull: m, source: 'archive', ...monthTotalsFromArchive(archivedRows) };
      }

      const byEmp = hoursByMonth[m] || {};
      let masseSalariale = 0;
      let bonus = 0;
      let retenue = 0;
      let pointed = 0;
      employees.forEach((emp) => {
        const hours = byEmp[emp.id];
        if (!hasEncodedHours(hours)) return;
        const payslip = computePayslip({
          salaireInitial: salaireForMonth(emp, m),
          heuresPrestees: hours.heuresPrestees,
          bonusHoraire: hours.bonusHoraire,
          mois: m,
          settings,
        });
        pointed += 1;
        masseSalariale += payslip.salairePlusBonus || 0;
        bonus += payslip.montantBonus || 0;
        retenue += payslip.retenue || 0;
      });

      if (!pointed) {
        // Mois sans heures : pas de barre à 0 $ (évite une fausse chute).
        return { mois: MOIS_COURT[m], moisFull: m, source: null, masseSalariale: null, bonus: null, retenue: null };
      }
      return { mois: MOIS_COURT[m], moisFull: m, source: 'live', masseSalariale, bonus, retenue };
    });
  }, [archive, hoursByMonth, employees, settings]);

  const evolutionHasData = useMemo(
    () => evolution.some((row) => row.masseSalariale != null),
    [evolution]
  );

  const parEmploye = useMemo(
    () =>
      rows.map((r) => ({ nom: `${r.nom} ${r.prenom}`, delta: r.delta ?? 0, retenue: r.retenue || 0, raw: r })),
    [rows]
  );

  const parEmployeSorted = useMemo(() => {
    const filtered = parEmploye.filter((row) =>
      matchesSearch(`${row.nom} ${row.raw.perception || ''}`, search)
    );
    return sortRows(filtered, empSort, (row, key) => {
      if (key === 'nom') return row.nom;
      if (key === 'delta') return row.raw.delta == null ? null : Number(row.raw.delta);
      return Number(row.retenue || 0);
    });
  }, [parEmploye, empSort, search]);

  const parPerception = useMemo(() => {
    const groups = {};
    rows.forEach((r) => {
      const key = (r.perception || 'Autre').toUpperCase();
      groups[key] = (groups[key] || 0) + (r.salairePlusBonus || 0);
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const isArchived = archivedMonths.includes(mois);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Mois sélectionné (KPI et graphiques par employé) :</span>
          <MonthSelect value={mois} onChange={setMois} className="w-auto" highlight={archivedMonths} />
        </div>
        {!isArchived && (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2">
            <i className="bi bi-info-circle me-1" />
            Ce mois n'a pas encore été archivé — les indicateurs sont à 0. Utilisez « Archiver ce mois » depuis la Fiche salariale.
          </span>
        )}
      </div>

      <div className="row g-3">
        <Kpi
          icon="bi-cash-stack"
          tone="blue"
          label="Masse salariale (mois)"
          value={formatCurrency(kpis.masseSalariale)}
          sub={`${rows.length} employés`}
        />
        <Kpi
          icon="bi-gift"
          tone="mint"
          label="Total bonus versé"
          value={formatCurrency(kpis.totalBonus)}
        />
        <Kpi
          icon="bi-dash-circle"
          tone="amber"
          label="Total retenues"
          value={formatCurrency(kpis.totalRetenues)}
        />
        <Kpi
          icon="bi-exclamation-triangle"
          tone="rose"
          label="Employés en retard"
          value={kpis.enRetard}
          sub={`${(kpis.pctRetard * 100).toFixed(1)}% de l'effectif pointé`}
        />
        <Kpi
          icon="bi-graph-up-arrow"
          tone="indigo"
          label="Taux de réalisation du temps de travail"
          value={tauxRealisation !== null ? `${(tauxRealisation * 100).toFixed(1)}%` : '—'}
          sub={`Heures prestées / heures théoriques (${mois})`}
        />
        <Kpi
          icon="bi-arrow-left-right"
          tone="violet"
          label="Impact net ajustement"
          value={formatCurrency(kpis.impactNet)}
          sub="|Total bonus − Total retenues|"
        />
      </div>

      <div className="sp-card p-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <h6 className="fw-bold mb-0">Évolution mensuelle</h6>
          <div className="sp-chart-legend">
            {EVOLUTION_SERIES.map((s) => (
              <span key={s.key} className="sp-chart-legend-item">
                <span className="sp-chart-legend-swatch" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
        <div className="sp-chart-frame">
          {!evolutionHasData ? (
            <div className="sp-chart-empty">
              Encodez des heures ou archivez un mois pour voir l'évolution salariale.
            </div>
          ) : (
            <ComposedChart
              responsive
              data={evolution}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ebf2" vertical={false} />
              <XAxis
                dataKey="mois"
                interval={0}
                tick={{ fontSize: 11, fill: '#6b7488', fontFamily: 'Poppins, sans-serif' }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                yAxisId="masse"
                tickFormatter={formatAxisCurrency}
                width={52}
                tick={{ fontSize: 11, fill: '#6b7488', fontFamily: 'Poppins, sans-serif' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="ajust"
                orientation="right"
                tickFormatter={formatAxisCurrency}
                width={52}
                tick={{ fontSize: 11, fill: '#6b7488', fontFamily: 'Poppins, sans-serif' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<EvolutionTooltip />} cursor={{ fill: 'rgba(52, 87, 213, 0.06)' }} />
              <Bar
                yAxisId="masse"
                dataKey="masseSalariale"
                name="Masse salariale"
                fill="#3457d5"
                maxBarSize={36}
                isAnimationActive={false}
              />
              <Line
                yAxisId="ajust"
                type="monotone"
                dataKey="bonus"
                name="Bonus"
                stroke="#12b89a"
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
                dot={{ r: 3.5, strokeWidth: 2, fill: '#fff', stroke: '#12b89a' }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="ajust"
                type="monotone"
                dataKey="retenue"
                name="Retenue"
                stroke="#e5484d"
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
                dot={{ r: 3.5, strokeWidth: 2, fill: '#fff', stroke: '#e5484d' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          )}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="sp-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h6 className="fw-bold mb-0">Par employé ({mois}) — delta d'heures</h6>
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <div className="table-responsive" style={{ maxHeight: 340, overflowY: 'auto' }}>
              <table className="table sp-table mb-0">
                <thead>
                  <tr>
                    <SortTh column={{ key: 'nom', label: 'Employé' }} sort={empSort} onSort={(key) => setEmpSort((s) => nextSort(s, key))} />
                    <SortTh column={{ key: 'delta', label: 'Delta heures' }} sort={empSort} onSort={(key) => setEmpSort((s) => nextSort(s, key))} />
                    <SortTh column={{ key: 'retenue', label: 'Retenue' }} sort={empSort} onSort={(key) => setEmpSort((s) => nextSort(s, key))} />
                  </tr>
                </thead>
                <tbody>
                  {parEmployeSorted.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-4">
                        {search.trim() ? 'Aucun employé trouvé' : 'Aucune donnée pour ce mois'}
                      </td>
                    </tr>
                  )}
                  {parEmployeSorted.map((r) => (
                    <tr key={r.nom}>
                      <td>{r.nom}</td>
                      <td><DeltaBadge delta={r.raw.delta} /></td>
                      <td>{r.retenue ? formatCurrency(r.retenue) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <div className="sp-card p-3 h-100">
            <h6 className="fw-bold mb-3">Moyen de perception ({mois})</h6>
            <div className="sp-chart-frame sp-chart-frame-sm">
              {parPerception.length === 0 ? (
                <div className="sp-chart-empty">Aucune donnée pour ce mois</div>
              ) : (
                <PieChart responsive>
                  <Pie data={parPerception} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(d) => `${d.name} — ${formatCurrency(d.value)}`}>
                    {parPerception.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
