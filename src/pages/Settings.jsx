/**
 * Paramètres de calcul : heures théoriques, seuil de prorata, modes de perception.
 */
import { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useData } from '../context/DataContext.jsx';
import { api } from '../api';
import { MOIS, DEFAULT_MONTH_HOURS } from '../utils/payroll';

const AUDIT_LABELS = {
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'auth.login_failed': 'Échec de connexion',
  'auth.lockout': 'Compte verrouillé',
  'employee.create': 'Employé créé',
  'employee.update': 'Employé modifié',
  'employee.delete': 'Employé supprimé',
  'employee.bank_view': 'IBAN consulté',
  'hours.upsert': 'Heures encodées',
  'settings.update': 'Paramètres enregistrés',
  'archive.create': 'Mois archivé',
  'archive.delete': 'Archive supprimée',
  'payroll.reset': 'Réinitialisation des données',
};

function formatAuditWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function auditDetail(entry) {
  const meta = entry.meta && typeof entry.meta === 'object' ? entry.meta : {};
  if (entry.action === 'hours.upsert' && meta.mois) {
    return `${meta.mois} ${meta.annee || ''}`.trim();
  }
  if ((entry.action === 'archive.create' || entry.action === 'archive.delete') && meta.mois) {
    return `${meta.mois} ${meta.annee || ''}`.trim();
  }
  if (entry.action === 'employee.delete' && meta.nom) return meta.nom;
  if (entry.action === 'employee.create' && (meta.nom || meta.prenom)) {
    return `${meta.nom || ''} ${meta.prenom || ''}`.trim();
  }
  if (meta.iban_changed) return 'IBAN modifié';
  if (meta.salary_changed) return 'Salaire modifié';
  return entry.entityId || '—';
}

export default function Settings() {
  const { settings, updateSettings, resetAllData } = useData();
  const [monthHours, setMonthHours] = useState(settings.monthHours);
  const [threshold, setThreshold] = useState(settings.threshold);
  const [perceptions, setPerceptions] = useState(settings.perceptions || ['VB', 'CASH']);
  const [newPerception, setNewPerception] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetPhrase, setResetPhrase] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [audit, setAudit] = useState([]);
  const [auditError, setAuditError] = useState('');

  useEffect(() => {
    // Resynchronise le formulaire après un reset ou un rechargement MySQL.
    setMonthHours(settings.monthHours);
    setThreshold(settings.threshold);
    setPerceptions(settings.perceptions || ['VB', 'CASH']);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    api.getAudit()
      .then((data) => {
        if (!cancelled) setAudit(Array.isArray(data.entries) ? data.entries : []);
      })
      .catch((err) => {
        if (!cancelled) setAuditError(err.message || 'Journal indisponible.');
      });
    return () => { cancelled = true; };
  }, [settings]);

  function handleHourChange(mois, value) {
    setMonthHours((mh) => ({ ...mh, [mois]: value === '' ? '' : Number(value) }));
    setSaved(false);
  }

  function handleSave() {
    updateSettings({ monthHours, threshold: Number(threshold), perceptions });
    setSaved(true);
  }

  function handleResetHours() {
    // Remet les heures théoriques à 186 / 179,2 sans enregistrer tout de suite.
    setMonthHours({ ...DEFAULT_MONTH_HOURS });
    setSaved(false);
  }

  function addPerception() {
    const v = newPerception.trim().toUpperCase();
    if (!v || perceptions.includes(v)) return;
    setPerceptions([...perceptions, v]);
    setNewPerception('');
    setSaved(false);
  }

  function removePerception(p) {
    setPerceptions(perceptions.filter((x) => x !== p));
    setSaved(false);
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="sp-cta-bar">
        {saved && (
          <span className="sp-cta-bar-status">
            <i className="bi bi-check-circle-fill" /> Enregistré
          </span>
        )}
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          <i className="bi bi-save me-1" /> Enregistrer
        </button>
      </div>

      <div className="sp-card p-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h6 className="fw-bold mb-0">Heures théoriques par mois</h6>
          <button className="btn btn-sm btn-outline-secondary" onClick={handleResetHours}>
            <i className="bi bi-arrow-counterclockwise me-1" /> Valeurs par défaut
          </button>
        </div>
        <p className="text-muted small mb-3">
          Nombre d'heures théoriques utilisé pour calculer le delta et proratiser le salaire de chaque employé.
        </p>
        <div className="row g-2">
          {MOIS.map((m) => (
            <div className="col-6 col-md-4 col-lg-3" key={m}>
              <label className="form-label small mb-1">{m}</label>
              <div className="input-group input-group-sm">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={monthHours[m] ?? ''}
                  onChange={(e) => handleHourChange(m, e.target.value)}
                />
                <span className="input-group-text">h</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sp-card p-3">
        <h6 className="fw-bold mb-1">Seuil de proratisation</h6>
        <p className="text-muted small mb-3">
          Si le delta d'heures est supérieur ou égal à ce seuil, le salaire de base est versé intégralement (sans majoration). En dessous, le salaire est réduit proportionnellement.
        </p>
        <div className="input-group" style={{ maxWidth: 220 }}>
          <input type="number" step="0.01" className="form-control" value={threshold} onChange={(e) => { setThreshold(e.target.value); setSaved(false); }} />
          <span className="input-group-text">h</span>
        </div>
      </div>

      <div className="sp-card p-3">
        <h6 className="fw-bold mb-1">Moyens de perception</h6>
        <p className="text-muted small mb-3">Liste des modes de paiement disponibles pour les employés (ex : VB = virement bancaire, CASH = espèces).</p>
        <div className="d-flex flex-wrap gap-2 mb-3">
          {perceptions.map((p) => (
            <span key={p} className="badge bg-light text-dark border d-flex align-items-center gap-2 px-3 py-2">
              {p}
              <i className="bi bi-x-lg" role="button" onClick={() => removePerception(p)} style={{ cursor: 'pointer' }} />
            </span>
          ))}
        </div>
        <div className="input-group" style={{ maxWidth: 280 }}>
          <input className="form-control" placeholder="Nouveau mode (ex: MOBILE MONEY)" value={newPerception} onChange={(e) => setNewPerception(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPerception()} />
          <Button variant="outline-secondary" onClick={addPerception}><i className="bi bi-plus-lg" /></Button>
        </div>
      </div>

      <div className="sp-card p-3">
        <h6 className="fw-bold mb-1">Journal d'activité</h6>
        <p className="text-muted small mb-3">
          Dernières actions sensibles (connexion, employés, heures, archives, reset). Les mots de passe et IBAN ne sont jamais enregistrés.
        </p>
        {auditError && <div className="alert alert-danger py-2">{auditError}</div>}
        <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table className="table sp-table mb-0">
            <thead>
              <tr>
                <th>Quand</th>
                <th>Action</th>
                <th>Compte</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && !auditError && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">Aucune entrée pour le moment</td>
                </tr>
              )}
              {audit.map((entry) => (
                <tr key={entry.id}>
                  <td className="text-muted small">{formatAuditWhen(entry.createdAt)}</td>
                  <td>{AUDIT_LABELS[entry.action] || entry.action}</td>
                  <td className="small">{entry.userEmail || '—'}</td>
                  <td className="small text-muted">{auditDetail(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sp-card p-3 border-danger-subtle">
        <h6 className="fw-bold text-danger mb-1">Zone de danger</h6>
        <p className="text-muted small mb-3">Réinitialise toutes les données (employés, heures, archives, paramètres) aux valeurs d'origine du fichier importé.</p>
        <Button variant="outline-danger" onClick={() => setConfirmReset(true)}>
          <i className="bi bi-exclamation-triangle me-1" /> Réinitialiser toutes les données
        </Button>
      </div>

      <Modal
        show={confirmReset}
        onHide={() => { setConfirmReset(false); setResetPhrase(''); setResetPassword(''); setResetError(''); }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">Réinitialiser toutes les données</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            Cette action est irréversible : tous les employés ajoutés, heures encodées et archives seront supprimés et remplacés par les données d&apos;origine.
          </p>
          <label className="form-label small fw-semibold" htmlFor="reset-confirm">
            Tapez RESET pour confirmer
          </label>
          <input
            id="reset-confirm"
            className="form-control mb-3"
            value={resetPhrase}
            onChange={(e) => setResetPhrase(e.target.value)}
            autoComplete="off"
          />
          <label className="form-label small fw-semibold" htmlFor="reset-password">
            Mot de passe du compte
          </label>
          <input
            id="reset-password"
            type="password"
            className={`form-control ${resetError ? 'is-invalid' : ''}`}
            value={resetPassword}
            onChange={(e) => { setResetPassword(e.target.value); setResetError(''); }}
            autoComplete="current-password"
          />
          {resetError && <div className="invalid-feedback d-block">{resetError}</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => { setConfirmReset(false); setResetPhrase(''); setResetPassword(''); setResetError(''); }}>Annuler</Button>
          <Button
            variant="danger"
            disabled={resetPhrase !== 'RESET' || !resetPassword || resetting}
            onClick={async () => {
              setResetting(true);
              setResetError('');
              try {
                await resetAllData(resetPassword);
                setConfirmReset(false);
                setResetPhrase('');
                setResetPassword('');
              } catch (err) {
                setResetError(err.message || 'Réinitialisation impossible.');
              } finally {
                setResetting(false);
              }
            }}
          >
            Tout réinitialiser
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
