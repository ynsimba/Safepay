/**
 * Comptes utilisateurs : création par l'administrateur et changement de mot de passe.
 */
import { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { api } from '../api';
import { useAuth } from '../context/AuthContext.jsx';

const MIN_PASSWORD = 12;
const EMPTY_FORM = { name: '', email: '', password: '', confirm: '' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' });
}

/** Message d'erreur de saisie local, ou chaîne vide si le mot de passe est valide. */
function passwordError(password, confirm) {
  if (password.length < MIN_PASSWORD) return `Au moins ${MIN_PASSWORD} caractères.`;
  if (password !== confirm) return 'Les deux mots de passe ne correspondent pas.';
  return '';
}

function PasswordField({ id, label, value, onChange, autoComplete = 'new-password' }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <label className="form-label small fw-semibold" htmlFor={id}>{label}</label>
      <div className="input-group mb-3">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="form-control"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          title={visible ? 'Masquer' : 'Afficher'}
        >
          <i className={`bi ${visible ? 'bi-eye-slash' : 'bi-eye'}`} />
        </button>
      </div>
    </>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [target, setTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getUsers()
      .then((data) => {
        if (!cancelled) setUsers(Array.isArray(data.users) ? data.users : []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Liste des comptes indisponible.');
      });
    return () => { cancelled = true; };
  }, []);

  function closeCreate() {
    setShowCreate(false);
    setForm(EMPTY_FORM);
    setCreateError('');
  }

  function closePassword() {
    setTarget(null);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErr('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    const localError = passwordError(form.password, form.confirm);
    if (localError) {
      setCreateError(localError);
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const data = await api.createUser({ name: form.name, email: form.email, password: form.password });
      setUsers((list) => [...list, data.user].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      setNotice(`Compte créé pour ${data.user.email}.`);
      closeCreate();
    } catch (err) {
      setCreateError(err.message || 'Création impossible.');
    } finally {
      setCreating(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    const localError = passwordError(newPassword, confirmPassword);
    if (localError) {
      setPasswordErr(localError);
      return;
    }
    setSavingPassword(true);
    setPasswordErr('');
    try {
      await api.setUserPassword(target.id, newPassword);
      setNotice(`Mot de passe modifié pour ${target.email}.`);
      closePassword();
    } catch (err) {
      setPasswordErr(err.message || 'Modification impossible.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="sp-cta-bar">
        {notice && (
          <span className="sp-cta-bar-status">
            <i className="bi bi-check-circle-fill" /> {notice}
          </span>
        )}
        <button type="button" className="btn btn-primary" onClick={() => { setNotice(''); setShowCreate(true); }}>
          <i className="bi bi-person-plus me-1" /> Nouvel utilisateur
        </button>
      </div>

      <div className="sp-card p-3">
        <h6 className="fw-bold mb-1">Comptes</h6>
        <p className="text-muted small mb-3">
          Chaque compte a accès à toute l&apos;application. Changer un mot de passe déconnecte les autres sessions de ce compte.
        </p>
        {loadError && <div className="alert alert-danger py-2">{loadError}</div>}
        <div className="table-responsive">
          <table className="table sp-table mb-0">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Créé le</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loadError && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">Aucun compte</td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    {me?.id === u.id && <span className="badge bg-light text-dark border ms-2">Vous</span>}
                  </td>
                  <td className="small">{u.email}</td>
                  <td className="small text-muted">{formatDate(u.createdAt)}</td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => { setNotice(''); setTarget(u); }}
                    >
                      <i className="bi bi-key me-1" /> Mot de passe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showCreate} onHide={closeCreate} centered>
        <form onSubmit={handleCreate}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-6 fw-bold">Nouvel utilisateur</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <label className="form-label small fw-semibold" htmlFor="user-name">Nom</label>
            <input
              id="user-name"
              className="form-control mb-3"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="off"
              required
            />
            <label className="form-label small fw-semibold" htmlFor="user-email">E-mail</label>
            <input
              id="user-email"
              type="email"
              className="form-control mb-3"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="off"
              required
            />
            <PasswordField
              id="user-password"
              label={`Mot de passe (${MIN_PASSWORD} caractères minimum)`}
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            />
            <PasswordField
              id="user-confirm"
              label="Confirmer le mot de passe"
              value={form.confirm}
              onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
            />
            {createError && <div className="alert alert-danger py-2 mb-0">{createError}</div>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={closeCreate}>Annuler</Button>
            <Button type="submit" variant="primary" disabled={creating || !form.name || !form.email || !form.password}>
              Créer le compte
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={!!target} onHide={closePassword} centered>
        <form onSubmit={handlePassword}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-6 fw-bold">Changer le mot de passe</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted small mb-3">
              Compte : <strong>{target?.email}</strong>
            </p>
            <PasswordField
              id="new-password"
              label={`Nouveau mot de passe (${MIN_PASSWORD} caractères minimum)`}
              value={newPassword}
              onChange={setNewPassword}
            />
            <PasswordField
              id="confirm-password"
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            {passwordErr && <div className="alert alert-danger py-2 mb-0">{passwordErr}</div>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={closePassword}>Annuler</Button>
            <Button type="submit" variant="primary" disabled={savingPassword || !newPassword}>
              Enregistrer
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
