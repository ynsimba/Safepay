/**
 * Client HTTP vers l'API Laravel (proxy Vite : /api → Laravel).
 * Le jeton Sanctum est un cookie httpOnly : jamais lu par JavaScript.
 */
const BASE = '/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/** Envoie une requête JSON et lève une erreur si le serveur répond hors 2xx. */
async function request(path, options = {}) {
  const { headers: extraHeaders, skipAuth = false, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...rest,
    headers: { ...authHeaders(), ...extraHeaders },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    if (!skipAuth) {
      window.dispatchEvent(new Event('safecheck-auth-lost'));
    }
    throw new Error(data.error || data.message || 'Non authentifié.');
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || `Erreur API (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/user'),
  getState: () => request('/state'),
  getEmployee: (id) => request(`/employees/${encodeURIComponent(id)}`),
  addEmployee: (body) => request('/employees', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id, body) => request(`/employees/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEmployee: (id) => request(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setHours: (body) => request('/hours', { method: 'PUT', body: JSON.stringify(body) }),
  updateSettings: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  setCurrentMonth: (mois, annee) => request('/current-month', {
    method: 'PUT',
    body: JSON.stringify(annee != null ? { mois, annee } : { mois }),
  }),
  archiveMonth: (mois, annee) => request('/archive', {
    method: 'POST',
    body: JSON.stringify(annee != null ? { mois, annee } : { mois }),
  }),
  deleteArchiveMonth: (mois, annee) => request(`/archive/${annee}/${encodeURIComponent(mois)}`, { method: 'DELETE' }),
  resetAllData: (password) => request('/reset', { method: 'POST', body: JSON.stringify({ confirm: 'RESET', password }) }),
  getAudit: () => request('/audit'),
};
