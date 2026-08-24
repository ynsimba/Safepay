/**
 * Gestion de l'effectif : création, modification (salaire avec mois d'effet) et suppression.
 */
import { useMemo, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useData } from '../context/DataContext.jsx';
import { formatCurrency, applySalaryChange, formatPeriod, availableYears } from '../utils/payroll';
import { nextSort, sortRows } from '../utils/tableSort.js';
import { PerceptionBadge } from '../components/Badges.jsx';
import MonthSelect from '../components/MonthSelect.jsx';
import YearSelect from '../components/YearSelect.jsx';
import SortTh from '../components/SortTh.jsx';
import SearchBar, { matchesSearch } from '../components/SearchBar.jsx';
import { api } from '../api';

const EMPTY_FORM = { nom: '', prenom: '', telephone: '', perception: 'VB', salaireInitial: '', compteBancaire: '', salaireFromMois: '', salaireFromAnnee: '' };

const SORT_COLUMNS = [
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prénom' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'perception', label: 'Perception' },
  { key: 'salaire', label: 'Salaire initial' },
  { key: 'compte', label: 'Compte bancaire' },
];

function employeeSortValue(emp, key) {
  switch (key) {
    case 'nom':
      return emp.nom || '';
    case 'prenom':
      return emp.prenom || '';
    case 'telephone':
      return emp.telephone || '';
    case 'perception':
      return emp.perception || '';
    case 'salaire':
      return Number(emp.salaireInitial || 0);
    case 'compte':
      return emp.compteBancaire || '';
    default:
      return '';
  }
}

/** Page Employés : liste, recherche, formulaire modal. */
export default function Employees() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, settings, currentYear, archive } = useData();
  const perceptionOptions = settings.perceptions?.length ? settings.perceptions : ['VB', 'CASH'];
  const years = useMemo(() => availableYears(archive, currentYear), [archive, currentYear]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [originalSalaire, setOriginalSalaire] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const [sort, setSort] = useState({ key: 'nom', dir: 'asc' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      matchesSearch(`${e.nom} ${e.prenom} ${e.telephone || ''} ${e.perception}`, q)
    );
  }, [employees, search]);

  const sorted = useMemo(
    () => sortRows(filtered, sort, employeeSortValue),
    [filtered, sort]
  );

  const total = useMemo(() => employees.reduce((s, e) => s + Number(e.salaireInitial || 0), 0), [employees]);
  const editingEmployee = editingId ? employees.find((e) => e.id === editingId) : null;
  const salaryChanged = editingId != null && Number(form.salaireInitial) !== Number(originalSalaire);

  function openAdd() {
    setEditingId(null);
    setOriginalSalaire(null);
    setForm({ ...EMPTY_FORM, salaireFromAnnee: currentYear });
    setErrors({});
    setShowModal(true);
  }

  async function openEdit(emp) {
    setEditingId(emp.id);
    setOriginalSalaire(emp.salaireInitial);
    setForm({
      nom: emp.nom,
      prenom: emp.prenom,
      telephone: emp.telephone || '',
      perception: emp.perception,
      salaireInitial: emp.salaireInitial,
      compteBancaire: '',
      salaireFromMois: '',
      salaireFromAnnee: currentYear,
    });
    setErrors({});
    setShowModal(true);
    try {
      const full = await api.getEmployee(emp.id);
      setForm((current) => ({ ...current, compteBancaire: full.compteBancaire || '' }));
    } catch {
      /* Le masque de la liste ne doit pas être renvoyé comme IBAN. */
    }
  }

  function validate() {
    const errs = {};
    if (!form.nom.trim()) errs.nom = 'Le nom est requis';
    if (!form.prenom.trim()) errs.prenom = 'Le prénom est requis';
    if (form.salaireInitial === '' || Number(form.salaireInitial) <= 0) errs.salaireInitial = 'Salaire invalide';
    if (salaryChanged && !form.salaireFromMois) {
      errs.salaireFromMois = 'Indiquez le mois à partir duquel le nouveau salaire s\'applique';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const payload = {
      nom: form.nom.trim().toUpperCase(),
      prenom: form.prenom.trim().toUpperCase(),
      telephone: form.telephone.trim(),
      perception: form.perception,
      salaireInitial: Number(form.salaireInitial),
      compteBancaire: form.compteBancaire.trim(),
    };
    const persist = editingId
      ? (salaryChanged
          // Changement de salaire : on historise l'ancien montant jusqu'au mois d'effet.
          ? updateEmployee(editingId, { ...payload, ...applySalaryChange(editingEmployee, payload.salaireInitial, form.salaireFromMois, form.salaireFromAnnee || currentYear) })
          : updateEmployee(editingId, payload))
      : addEmployee(payload);
    Promise.resolve(persist).then(() => setShowModal(false)).catch(() => {});
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <SearchBar value={search} onChange={setSearch} />
        <Button onClick={openAdd}><i className="bi bi-plus-lg me-1" /> Ajouter un employé</Button>
      </div>

      <div className="sp-card p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0">Effectif ({employees.length})</h6>
          <span className="text-muted small">Masse salariale de base : <strong>{formatCurrency(total)}</strong></span>
        </div>
        <div className="table-responsive">
          <table className="table sp-table mb-0">
            <thead>
              <tr>
                {SORT_COLUMNS.map((column) => (
                  <SortTh key={column.key} column={column} sort={sort} onSort={(key) => setSort((s) => nextSort(s, key))} />
                ))}
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted py-4">Aucun employé trouvé</td></tr>
              )}
              {sorted.map((emp) => (
                <tr key={emp.id}>
                  <td className="fw-semibold">{emp.nom}</td>
                  <td>{emp.prenom}</td>
                  <td className="text-muted small">{emp.telephone || '—'}</td>
                  <td><PerceptionBadge value={emp.perception} /></td>
                  <td>
                    {formatCurrency(emp.salaireInitial)}
                    {emp.salaireHistory?.length > 1 && (
                      <div className="text-muted small">
                        depuis {formatPeriod(
                          emp.salaireHistory[emp.salaireHistory.length - 1].fromMois,
                          emp.salaireHistory[emp.salaireHistory.length - 1].fromAnnee || currentYear
                        )}
                      </div>
                    )}
                  </td>
                  <td className="text-muted small">{emp.compteBancaire || '—'}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-secondary rounded-0 border-0 me-1" onClick={() => openEdit(emp)}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-outline-danger rounded-0 border-0" onClick={() => setConfirmDelete(emp)}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">{editingId ? 'Modifier l\'employé' : 'Nouvel employé'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label small fw-semibold">Nom</label>
              <input className={`form-control ${errors.nom ? 'is-invalid' : ''}`} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              {errors.nom && <div className="invalid-feedback">{errors.nom}</div>}
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Prénom</label>
              <input className={`form-control ${errors.prenom ? 'is-invalid' : ''}`} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              {errors.prenom && <div className="invalid-feedback">{errors.prenom}</div>}
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Téléphone (optionnel)</label>
              <input
                className="form-control"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="ex: +243 810 000 000"
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Moyen de perception</label>
              <select className="form-select" value={form.perception} onChange={(e) => setForm({ ...form, perception: e.target.value })}>
                {perceptionOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Salaire initial ($)</label>
              <input type="number" min="0" step="0.01" className={`form-control ${errors.salaireInitial ? 'is-invalid' : ''}`} value={form.salaireInitial} onChange={(e) => setForm({ ...form, salaireInitial: e.target.value })} />
              {errors.salaireInitial && <div className="invalid-feedback">{errors.salaireInitial}</div>}
            </div>
            {salaryChanged && (
              <div className="col-12">
                <label className="form-label small fw-semibold">Prend effet à partir de <span className="text-danger">*</span></label>
                <div className="d-flex align-items-center gap-2">
                  <YearSelect
                    value={form.salaireFromAnnee || currentYear}
                    onChange={(y) => setForm({ ...form, salaireFromAnnee: y })}
                    years={years}
                    className="w-auto"
                  />
                  <MonthSelect
                    value={form.salaireFromMois}
                    onChange={(m) => setForm({ ...form, salaireFromMois: m })}
                    className={errors.salaireFromMois ? 'is-invalid' : ''}
                    placeholder="Choisir le mois d'effet"
                  />
                </div>
                {errors.salaireFromMois && <div className="invalid-feedback d-block">{errors.salaireFromMois}</div>}
                {form.salaireFromMois && (
                  <div className="form-text">
                    Le nouveau salaire ({formatCurrency(Number(form.salaireInitial))}) s&apos;applique à partir de {formatPeriod(form.salaireFromMois, form.salaireFromAnnee || currentYear)}.
                    {form.salaireFromMois !== 'Janvier' && ' Les mois antérieurs conservent le salaire alors en vigueur.'}
                  </div>
                )}
              </div>
            )}
            {editingEmployee?.salaireHistory?.length > 1 && !salaryChanged && (
              <div className="col-12">
                <div className="form-text mb-0">
                  Historique : {editingEmployee.salaireHistory.map((h) => `${formatPeriod(h.fromMois, h.fromAnnee || currentYear)} → ${formatCurrency(h.salaire)}`).join(' · ')}
                </div>
              </div>
            )}
            <div className="col-12">
              <label className="form-label small fw-semibold">Compte bancaire (optionnel)</label>
              <input className="form-control" value={form.compteBancaire} onChange={(e) => setForm({ ...form, compteBancaire: e.target.value })} placeholder="ex: 00000-00000000000-00" />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">Supprimer l'employé</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Confirmer la suppression de <strong>{confirmDelete?.nom} {confirmDelete?.prenom}</strong> ? Ses heures encodées seront également supprimées. Cette action est irréversible.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={() => { deleteEmployee(confirmDelete.id); setConfirmDelete(null); }}>Supprimer</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
