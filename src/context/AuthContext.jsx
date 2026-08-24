/**
 * Session Sanctum : cookie httpOnly + utilisateur connecté.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

try {
  localStorage.removeItem('safecheck-pay-token');
} catch {
  /* stockage indisponible */
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setLoading(false));

    const onLost = () => clearSession();
    window.addEventListener('safecheck-auth-lost', onLost);
    return () => window.removeEventListener('safecheck-auth-lost', onLost);
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // On ferme la session locale même si l'API est injoignable.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
