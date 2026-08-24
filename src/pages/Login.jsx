/**
 * Écran de connexion Sanctum (e-mail + mot de passe).
 * La soumission lit le DOM (FormData) pour rester compatible avec l'autofill du navigateur.
 */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sp-login">
      <form className="sp-login-card" onSubmit={handleSubmit} autoComplete="on">
        <img src="/icons.png" alt="SafePay" className="sp-login-logo" />
        <h1 className="sp-login-title">Connexion</h1>
        <p className="sp-login-sub">Accédez à la gestion salariale SafePay.</p>

        {error && (
          <div className="alert alert-danger py-2" role="alert">{error}</div>
        )}

        <label className="form-label small fw-semibold" htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          name="email"
          type="email"
          className="form-control mb-3"
          autoComplete="username"
          required
        />

        <label className="form-label small fw-semibold" htmlFor="login-password">Mot de passe</label>
        <input
          id="login-password"
          name="password"
          type="password"
          className="form-control mb-2"
          autoComplete="current-password"
          required
        />

        <button type="submit" className="btn btn-primary w-100 mt-4" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
