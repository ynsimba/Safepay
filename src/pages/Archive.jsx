/**
 * Suivi mensuel : instantanés archivés, filtrables par année et par mois.
 */
import { useMemo, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useData } from '../context/DataContext.jsx';
import { MOIS, formatCurrency, formatHours, formatPeriod, availableYears, archiveYear } from '../utils/payroll';
import { nextSort, sortRows } from '../utils/tableSort.js';
import { PerceptionBadge, DeltaBadge } from '../components/Badges.jsx';
import SortTh from '../components/SortTh.jsx';
import SearchBar, { matchesSearch } from '../components/SearchBar.jsx';
import MonthSelect from '../components/MonthSelect.jsx';
import YearSelect from '../components/YearSelect.jsx';

const SORT_COLUMNS = [
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prénom' },
  { key: 'perception', label: 'Perception' },
  { key: 'heures', label: 'Heures prestées' },
  { key: 'delta', label: 'Delta' },
  { key: 'salaire', label: 'Salaire' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'retenue', label: 'Retenue' },
  { key: 'net', label: 'Salaire + bonus' },
];

function archiveSortValue(row, key) {
  switch (key) {
    case 'nom':
      return row.nom || '';
    case 'prenom':
      return row.prenom || '';
    case 'perception':
      return row.perception || '';
    case 'heures':
      return row.heuresPrestees === '' || row.heuresPrestees == null ? null : Number(row.heuresPrestees);
    case 'delta':
      return row.delta == null ? null : Number(row.delta);
    case 'salaire':
      return Number(row.salaire || 0);
    case 'bonus':
      return Number(row.montantBonus || 0);
    case 'retenue':
      return Number(row.retenue || 0);
    case 'net':
      return Number(row.salairePlusBonus || 0);
    default:
      return '';
  }
}

export default function Archive() {
  const { archive, currentYear, deleteArchiveMonth } = useData();
  const [yearFilter, setYearFilter] = useState(currentYear || 'all');
  const [monthFilter, setMonthFilter] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [sort, setSort] = useState({ key: 'nom', dir: 'asc' });
  const [search, setSearch] = useState('');

  const years = useMemo(() => availableYears(archive, currentYear), [archive, currentYear]);

  const highlightedMonths = useMemo(() => {
    const rows = yearFilter === 'all'
      ? archive
      : archive.filter((a) => archiveYear(a) === Number(yearFilter));
    return MOIS.filter((m) => rows.some((a) => a.mois === m));
  }, [archive, yearFilter]);

  const groups = useMemo(() => {
    const byPeriod = {};
    archive.forEach((row) => {
      const year = archiveYear(row);
      if (!year) return;
      if (yearFilter !== 'all' && year !== Number(yearFilter)) return;
      if (monthFilter && row.mois !== monthFilter) return;
      const key = `${year}-${row.mois}`;
      if (!byPeriod[key]) byPeriod[key] = [];
      byPeriod[key].push(row);
    });

    const orderedKeys = Object.keys(byPeriod).sort((a, b) => {
      const [yearA, moisA] = [Number(a.slice(0, 4)), a.slice(5)];
      const [yearB, moisB] = [Number(b.slice(0, 4)), b.slice(5)];
      if (yearA !== yearB) return yearB - yearA;
      return MOIS.indexOf(moisA) - MOIS.indexOf(moisB);
    });

    return orderedKeys
      .map((key) => {
        const allRows = byPeriod[key];
        const year = archiveYear(allRows[0]);
        const mois = allRows[0].mois;
        const filtered = allRows.filter((r) =>
          matchesSearch(`${r.nom} ${r.prenom} ${r.perception} ${mois} ${year}`, search)
        );
        return {
          key,
          mois,
          annee: year,
          rows: sortRows(filtered, sort, archiveSortValue),
          total: allRows.reduce((s, r) => s + (r.salairePlusBonus || 0), 0),
          archivedAt: allRows[0]?.archivedAt,
        };
      })
      .filter((g) => !search.trim() || g.rows.length > 0);
  }, [archive, yearFilter, monthFilter, sort, search]);

  const periodCount = useMemo(() => {
    const keys = new Set(archive.map((a) => `${archiveYear(a)}-${a.mois}`));
    return keys.size;
  }, [archive]);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted small">Filtrer :</span>
          <YearSelect
            value={yearFilter}
            onChange={setYearFilter}
            years={years}
            allowAll
            className="w-auto"
          />
          <MonthSelect
            value={monthFilter}
            onChange={setMonthFilter}
            className="w-auto"
            highlight={highlightedMonths}
            placeholder="Tous les mois"
          />
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <span className="text-muted small">{periodCount} période(s) archivée(s)</span>
      </div>

      {groups.length === 0 && (
        <div className="sp-card p-5 text-center text-muted">
          <i className={`bi ${search.trim() || yearFilter !== 'all' || monthFilter ? 'bi-search' : 'bi-archive'} fs-1 d-block mb-2`} />
          {search.trim() || yearFilter !== 'all' || monthFilter
            ? 'Aucun résultat pour ces filtres'
            : 'Aucun mois archivé pour le moment. Rendez-vous sur la Fiche salariale pour archiver un mois.'}
        </div>
      )}

      {groups.map((g) => (
        <div className="sp-card p-3" key={g.key}>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h6 className="fw-bold mb-0">{formatPeriod(g.mois, g.annee)}</h6>
              <span className="text-muted small">
                Archivé le {g.archivedAt ? new Date(g.archivedAt).toLocaleDateString('fr-FR') : '—'} · Masse salariale : <strong>{formatCurrency(g.total)}</strong>
              </span>
            </div>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setToDelete({ mois: g.mois, annee: g.annee })}>
              <i className="bi bi-trash me-1" /> Supprimer l'archive
            </button>
          </div>
          <div className="table-responsive">
            <table className="table sp-table mb-0">
              <thead>
                <tr>
                  {SORT_COLUMNS.map((column) => (
                    <SortTh
                      key={column.key}
                      column={column}
                      sort={sort}
                      onSort={(key) => setSort((s) => nextSort(s, key))}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold">{r.nom}</td>
                    <td>{r.prenom}</td>
                    <td><PerceptionBadge value={r.perception} /></td>
                    <td>{r.heuresPrestees ? formatHours(r.heuresPrestees) : '—'}</td>
                    <td><DeltaBadge delta={r.delta} /></td>
                    <td>{r.salaire ? formatCurrency(r.salaire) : '—'}</td>
                    <td>{r.montantBonus ? formatCurrency(r.montantBonus) : '—'}</td>
                    <td>{r.retenue ? <span className="text-danger">{formatCurrency(r.retenue)}</span> : '—'}</td>
                    <td className="fw-bold">{r.salairePlusBonus ? formatCurrency(r.salairePlusBonus) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Modal show={!!toDelete} onHide={() => setToDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">
            Supprimer l'archive de {toDelete ? formatPeriod(toDelete.mois, toDelete.annee) : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Cette action supprime définitivement l'instantané archivé de{' '}
          <strong>{toDelete ? formatPeriod(toDelete.mois, toDelete.annee) : ''}</strong> du Suivi mensuel.
          Les données d'heures prestées encodées ne sont pas affectées.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setToDelete(null)}>Annuler</Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteArchiveMonth(toDelete.mois, toDelete.annee);
              setToDelete(null);
            }}
          >
            Supprimer
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
