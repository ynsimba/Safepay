/**
 * Fiche salariale du mois : calculs live, impression et archivage vers le suivi.
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useData } from '../context/DataContext.jsx';
import { formatCurrency, formatHours, heuresTheoriques, salaireForMonth, availableYears, formatPeriod } from '../utils/payroll';
import { nextSort, sortRows } from '../utils/tableSort.js';
import MonthSelect from '../components/MonthSelect.jsx';
import YearSelect from '../components/YearSelect.jsx';
import { PerceptionBadge, DeltaBadge } from '../components/Badges.jsx';
import SortTh from '../components/SortTh.jsx';
import SearchBar, { matchesSearch } from '../components/SearchBar.jsx';

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

function sortValue(row, key) {
  switch (key) {
    case 'nom':
      return row.employee.nom || '';
    case 'prenom':
      return row.employee.prenom || '';
    case 'perception':
      return row.employee.perception || '';
    case 'heures':
      return row.hours.heuresPrestees === '' || row.hours.heuresPrestees == null
        ? null
        : Number(row.hours.heuresPrestees);
    case 'delta':
      return row.payslip.delta == null ? null : Number(row.payslip.delta);
    case 'salaire':
      return Number(row.payslip.salaire || 0);
    case 'bonus':
      return Number(row.payslip.montantBonus || 0);
    case 'retenue':
      return Number(row.payslip.retenue || 0);
    case 'net':
      return Number(row.payslip.salairePlusBonus || 0);
    default:
      return '';
  }
}

export default function Payslips() {
  const { getPayslips, archiveMonth, currentMonth, currentYear, setCurrentMonth, archivedMonths, settings, archive } = useData();
  const [mois, setMois] = useState(currentMonth);
  const [annee, setAnnee] = useState(currentYear);
  const [periodTouched, setPeriodTouched] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState({ key: 'nom', dir: 'asc' });
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
    setArchived(false);
  }

  function selectYear(y) {
    setPeriodTouched(true);
    setAnnee(y);
    setCurrentMonth(mois, y);
    setArchived(false);
  }

  const list = getPayslips(mois);

  const sortedList = useMemo(() => {
    const filtered = list.filter((r) =>
      matchesSearch(`${r.employee.nom} ${r.employee.prenom} ${r.employee.perception}`, search)
    );
    return sortRows(filtered, sort, sortValue);
  }, [list, sort, search]);

  function handleSort(key) {
    setSort((current) => nextSort(current, key));
  }

  const totals = useMemo(
    () =>
      list.reduce(
        (acc, r) => ({
          salaire: acc.salaire + (r.payslip.salaire || 0),
          bonus: acc.bonus + (r.payslip.montantBonus || 0),
          net: acc.net + (r.payslip.salairePlusBonus || 0),
          retenue: acc.retenue + (r.payslip.retenue || 0),
        }),
        { salaire: 0, bonus: 0, net: 0, retenue: 0 }
      ),
    [list]
  );

  useEffect(() => {
    // Cache le reste de l'app à l'impression d'une fiche individuelle.
    document.body.classList.toggle('print-modal-open', !!selected);
  }, [selected]);

  function handleArchive() {
    archiveMonth(mois, annee);
    setConfirmArchive(false);
    setArchived(true);
  }

  const isArchived = archivedMonths.includes(mois);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 no-print">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted small">Période :</span>
          <YearSelect value={annee} onChange={selectYear} years={years} className="w-auto" />
          <MonthSelect value={mois} onChange={selectMonth} className="w-auto" highlight={archivedMonths} />
          {isArchived && <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle"><i className="bi bi-archive me-1" />Déjà archivé</span>}
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={() => window.print()}>
            <i className="bi bi-printer me-1" /> Imprimer le mois
          </Button>
          <Button variant="primary" onClick={() => setConfirmArchive(true)}>
            <i className="bi bi-archive me-1" /> Archiver ce mois
          </Button>
        </div>
      </div>

      {archived && (
        <div className="alert alert-success py-2 no-print">
          <i className="bi bi-check-circle me-1" /> {formatPeriod(mois, annee)} a été archivé dans le Suivi mensuel.
        </div>
      )}

      <div className="sp-card p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0">Fiche salariale — {formatPeriod(mois, annee)}</h6>
          <span className="text-muted small">Heures théoriques : {formatHours(heuresTheoriques(mois, settings))}</span>
        </div>
        <div className="table-responsive">
          <table className="table sp-table mb-0 align-middle">
            <thead>
              <tr>
                {SORT_COLUMNS.map((column) => (
                  <SortTh key={column.key} column={column} sort={sort} onSort={handleSort} />
                ))}
                <th className="text-end no-print">Fiche</th>
              </tr>
            </thead>
            <tbody>
              {sortedList.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted py-4">Aucun employé trouvé</td></tr>
              )}
              {sortedList.map(({ employee, hours, payslip }) => (
                <tr key={employee.id}>
                  <td className="fw-semibold">{employee.nom}</td>
                  <td>{employee.prenom}</td>
                  <td><PerceptionBadge value={employee.perception} /></td>
                  <td>{hours.heuresPrestees ? formatHours(hours.heuresPrestees) : '—'}</td>
                  <td><DeltaBadge delta={payslip.delta} /></td>
                  <td>{payslip.salaire ? formatCurrency(payslip.salaire) : '—'}</td>
                  <td>{payslip.montantBonus ? formatCurrency(payslip.montantBonus) : '—'}</td>
                  <td>{payslip.retenue ? <span className="text-danger">{formatCurrency(payslip.retenue)}</span> : '—'}</td>
                  <td className="fw-bold">{payslip.salairePlusBonus ? formatCurrency(payslip.salairePlusBonus) : '—'}</td>
                  <td className="text-end no-print">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setSelected({ employee, hours, payslip })}>
                      <i className="bi bi-eye" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fw-bold">
                <td colSpan={5}>Totaux</td>
                <td>{formatCurrency(totals.salaire)}</td>
                <td>{formatCurrency(totals.bonus)}</td>
                <td className="text-danger">{formatCurrency(totals.retenue)}</td>
                <td>{formatCurrency(totals.net)}</td>
                <td className="no-print" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Modal show={!!selected} onHide={() => setSelected(null)} centered size="lg">
        {selected && (
          <>
            <Modal.Header closeButton className="no-print">
              <Modal.Title className="fs-6 fw-bold">Fiche salariale individuelle</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <PayslipDetail data={selected} mois={mois} annee={annee} settings={settings} />
            </Modal.Body>
            <Modal.Footer className="no-print">
              <Button variant="light" onClick={() => setSelected(null)}>Fermer</Button>
              <Button onClick={() => window.print()}><i className="bi bi-printer me-1" /> Imprimer</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      <Modal show={confirmArchive} onHide={() => setConfirmArchive(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">Archiver {formatPeriod(mois, annee)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Cette action enregistre un instantané de la fiche salariale de <strong>{formatPeriod(mois, annee)}</strong> dans le Suivi mensuel
          {isArchived ? ' et remplace l\'archive existante pour cette période.' : '.'} Les indicateurs du tableau de bord se basent uniquement sur les mois archivés.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setConfirmArchive(false)}>Annuler</Button>
          <Button onClick={handleArchive}>Confirmer l'archivage</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

/** Mise en page imprimable d'une fiche individuelle. */
function PayslipDetail({ data, mois, annee, settings }) {
  const { employee, hours, payslip } = data;
  return (
    <div className="print-payslip p-4 border rounded-3">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h4 className="fw-bold mb-0">SafePay</h4>
          <div className="text-muted small">Fiche de paie — {formatPeriod(mois, annee)}</div>
        </div>
        <div className="text-end">
          <div className="fw-bold">{employee.nom} {employee.prenom}</div>
          <PerceptionBadge value={employee.perception} />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6">
          <div className="text-muted small">Compte bancaire</div>
          <div className="fw-semibold">{employee.compteBancaire || '—'}</div>
        </div>
        <div className="col-6">
          <div className="text-muted small">Heures théoriques du mois</div>
          <div className="fw-semibold">{formatHours(heuresTheoriques(mois, settings))}</div>
        </div>
        <div className="col-6">
          <div className="text-muted small">Heures prestées</div>
          <div className="fw-semibold">{hours.heuresPrestees ? formatHours(hours.heuresPrestees) : 'Non renseigné'}</div>
        </div>
        <div className="col-6">
          <div className="text-muted small">Delta</div>
          <div className="fw-semibold"><DeltaBadge delta={payslip.delta} /></div>
        </div>
      </div>

      <table className="table table-sm mb-0">
        <tbody>
          <tr>
            <td>Salaire initial (barème)</td>
            <td className="text-end">{formatCurrency(salaireForMonth(employee, mois))}</td>
          </tr>
          <tr>
            <td>Retenue pour heures manquantes</td>
            <td className="text-end text-danger">{payslip.retenue ? `− ${formatCurrency(payslip.retenue)}` : '—'}</td>
          </tr>
          <tr className="border-top">
            <td className="fw-semibold">Salaire ajusté</td>
            <td className="text-end fw-semibold">{formatCurrency(payslip.salaire)}</td>
          </tr>
          <tr>
            <td>Bonus</td>
            <td className="text-end text-success">{payslip.montantBonus ? `+ ${formatCurrency(payslip.montantBonus)}` : '—'}</td>
          </tr>
          <tr className="border-top">
            <td className="fw-bold fs-6">Net à payer</td>
            <td className="text-end fw-bold fs-6">{formatCurrency(payslip.salairePlusBonus)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
