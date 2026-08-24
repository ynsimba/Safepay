/**
 * Client HTTP vers l'API Laravel Sanctum (proxy Vite : /api → :8000/api).
 * Le jeton Bearer est stocké dans localStorage.
 */
const BASE = '/api';
const TOKEN_KEY = 'safecheck-pay-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders({ skipAuth = false } = {}) {
  const token = skipAuth ? null : getToken();
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Envoie une requête JSON et lève une erreur si le serveur répond hors 2xx. */
async function request(path, options = {}) {
  const { headers: extraHeaders, skipAuth = false, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { ...authHeaders({ skipAuth }), ...extraHeaders },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    if (!skipAuth) {
      setToken(null);
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
  addEmployee: (body) => request('/employees', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id, body) => request(`/employees/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEmployee: (id) => request(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setHours: (body) => request('/hours', { method: 'PUT', body: JSON.stringify(body) }),
  updateSettings: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  setCurrentMonth: (mois) => request('/current-month', { method: 'PUT', body: JSON.stringify({ mois }) }),
  archiveMonth: (mois) => request('/archive', { method: 'POST', body: JSON.stringify({ mois }) }),
  deleteArchiveMonth: (mois) => request(`/archive/${encodeURIComponent(mois)}`, { method: 'DELETE' }),
  resetAllData: () => request('/reset', { method: 'POST' }),
};
