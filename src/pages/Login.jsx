/**
 * Écran de connexion Sanctum (e-mail + mot de passe).
 * La soumission lit le DOM (FormData) pour rester compatible avec l'autofill du navigateur.
 */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  MOIS, DEFAULT_SETTINGS, heuresTheoriques, computePayslip, formatHours,
} from '../utils/payroll';

const HUB_URL = 'https://hub.safecheckrdc.com';

const amount = (v) => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} $`;

/** Employés d'exemple : écart d'heures par rapport au mois théorique et bonus horaire. */
const SAMPLE_EMPLOYEES = [
  { nom: 'Grâce Mbuyi', base: 850, ecart: 0, bonus: 6, perception: 'VB' },
  { nom: 'Patrick Kabongo', base: 720, ecart: -4, bonus: 0, perception: 'CASH' },
  { nom: 'Sarah Ilunga', base: 1100, ecart: 0, bonus: 0, perception: 'VB' },
  { nom: 'Jonathan Tshibangu', base: 640, ecart: 4, bonus: 2, perception: 'VB' },
  { nom: 'Ruth Mukendi', base: 780, ecart: -8, bonus: 0, perception: 'CASH' },
];

/** Fiche salariale du mois en cours, calculée avec la vraie formule de paie. */
function buildSamplePayroll() {
  const now = new Date();
  const mois = MOIS[now.getMonth()];
  const theo = heuresTheoriques(mois, DEFAULT_SETTINGS);
  const rows = SAMPLE_EMPLOYEES.map((e) => {
    const heures = theo + e.ecart;
    const p = computePayslip({ salaireInitial: e.base, heuresPrestees: heures, bonusHoraire: e.bonus, mois, settings: DEFAULT_SETTINGS });
    return { ...e, heures, net: p.salairePlusBonus, enRetard: p.enRetard };
  });
  return {
    periode: `${mois} ${now.getFullYear()}`,
    rows,
    total: rows.reduce((sum, r) => sum + r.net, 0),
  };
}

const SAMPLE = buildSamplePayroll();

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const remember = form.get('remember') === 'on';
    try {
      await login(email, password, remember);
    } catch (err) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sp-login">
      <div className="sp-login-card">
        <aside className="sp-login-hero">
          <div className="sp-login-hero-copy">
            <h2 className="sp-login-headline">La paie de vos équipes, sans erreur de calcul.</h2>
            <p className="sp-login-lead">
              Heures prestées, prorata, bonus et retenues : chaque fiche salariale est calculée et archivée au mois.
            </p>
          </div>

          <div className="sp-preview" data-ui aria-hidden="true">
            <div className="sp-preview-bar">
              <strong>Fiche salariale</strong>
              <span className="sp-preview-period"><i className="bi bi-calendar3" /> {SAMPLE.periode}</span>
            </div>
            <table className="sp-preview-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Heures</th>
                  <th>Paiement</th>
                  <th>Net à payer</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE.rows.map((r, i) => (
                  <tr key={r.nom} style={{ '--i': i }}>
                    <td>{r.nom}</td>
                    <td className={r.enRetard ? 'is-short' : undefined}>{formatHours(r.heures)}</td>
                    <td><span className={`sp-preview-badge is-${r.perception.toLowerCase()}`}>{r.perception}</span></td>
                    <td>{amount(r.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Masse salariale</td>
                  <td>{amount(SAMPLE.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="sp-login-trust">
            <i className="bi bi-shield-lock" />
            Accès réservé aux administrateurs. Comptes bancaires chiffrés, chaque action est journalisée.
          </p>
        </aside>

        <form className="sp-login-form" onSubmit={handleSubmit} autoComplete="on">
          <div className="sp-login-brand">
            <img src="/icons.png" alt="SafePay" className="sp-login-logo" />
            <h1 className="sp-login-form-title">Connexion</h1>
            <p className="sp-login-form-sub">Accédez à votre espace de gestion salariale.</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">{error}</div>
          )}

          <label className="sp-login-label" htmlFor="login-email">Adresse e-mail</label>
          <div className="sp-login-field">
            <i className="bi bi-envelope" />
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="nom@safecheckrdc.com"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <label className="sp-login-label" htmlFor="login-password">Mot de passe</label>
          <div className="sp-login-field">
            <i className="bi bi-lock" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="sp-login-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
            </button>
          </div>

          <div className="sp-login-row">
            <label className="sp-login-remember">
              <input type="checkbox" name="remember" defaultChecked />
              Se souvenir de moi
            </label>
            <button type="button" className="sp-login-forgot" onClick={() => setShowForgot((v) => !v)}>
              Mot de passe oublié ?
            </button>
          </div>

          {showForgot && (
            <p className="sp-login-forgot-note" role="status">
              Contactez un administrateur : il peut réinitialiser votre mot de passe depuis la page Utilisateurs.
            </p>
          )}

          <button type="submit" className="sp-login-submit" disabled={submitting}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>

          <a className="sp-login-back" href={HUB_URL}>
            <i className="bi bi-arrow-left" /> Retourner sur Safecheck-Hub
          </a>
        </form>
      </div>
    </div>
  );
}
