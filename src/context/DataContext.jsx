/**
 * État métier partagé : lit/écrit MySQL via l'API Laravel Sanctum.
 * Les pages consomment ce contexte avec `useData()`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { DEFAULT_SETTINGS, MOIS, archiveYear, computePayslip, salaireForMonth } from '../utils/payroll';

/** État vide affiché le temps du premier GET /state. */
const EMPTY_STATE = {
  employees: [],
  hoursByMonth: {},
  archive: [],
  settings: DEFAULT_SETTINGS,
  currentMonth: 'Juillet',
  currentYear: new Date().getFullYear(),
};

/** Délai avant d'envoyer une saisie d'heures (évite une requête à chaque frappe). */
const HOURS_DEBOUNCE_MS = 400;

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [state, setState] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const hoursTimers = useRef({});
  const hoursDraft = useRef({});
  const yearRef = useRef(state.currentYear);
  yearRef.current = state.currentYear;

  /** Remplace l'état local par la réponse serveur (forme camelCase du front). */
  const applyState = useCallback((next) => {
    setState({ ...EMPTY_STATE, ...next, settings: { ...DEFAULT_SETTINGS, ...(next.settings || {}) } });
    setSaveError(null);
  }, []);

  /** Charge (ou recharge) tout l'état depuis MySQL. */
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyState(await api.getState());
    } catch (e) {
      setError(e.message || 'Impossible de joindre la base de données.');
    } finally {
      setLoading(false);
    }
  }, [applyState]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const timers = hoursTimers.current;
    return () => {
      Object.values(timers).forEach((id) => window.clearTimeout(id));
    };
  }, []);

  /** Exécute une mutation API puis synchronise l'état. */
  const run = useCallback(async (fn) => {
    try {
      applyState(await fn());
    } catch (e) {
      setSaveError(e.message || 'Erreur lors de l\'enregistrement.');
      throw e;
    }
  }, [applyState]);

  const addEmployee = useCallback((emp) => run(() => api.addEmployee(emp)), [run]);

  const updateEmployee = useCallback((id, patch) => run(() => api.updateEmployee(id, patch)), [run]);

  const deleteEmployee = useCallback((id) => run(() => api.deleteEmployee(id)), [run]);

  /**
   * Mise à jour optimiste des heures, puis enregistrement différé.
   * Si l'utilisateur retape pendant l'aller-retour, on conserve la saisie locale.
   */
  const setHours = useCallback((mois, employeeId, patch) => {
    const key = `${mois}:${employeeId}`;
    setState((s) => {
      const current = {
        heuresPrestees: '',
        bonusHoraire: 0,
        ...(s.hoursByMonth[mois]?.[employeeId] || {}),
        ...patch,
      };
      hoursDraft.current[key] = current;
      return {
        ...s,
        hoursByMonth: {
          ...s.hoursByMonth,
          [mois]: {
            ...(s.hoursByMonth[mois] || {}),
            [employeeId]: current,
          },
        },
      };
    });

    window.clearTimeout(hoursTimers.current[key]);
    hoursTimers.current[key] = window.setTimeout(() => {
      delete hoursTimers.current[key];
      const snapshot = hoursDraft.current[key] || {};
      api.setHours({
        mois,
        employeeId,
        annee: yearRef.current,
        heuresPrestees: snapshot.heuresPrestees,
        bonusHoraire: snapshot.bonusHoraire === '' || snapshot.bonusHoraire == null ? 0 : snapshot.bonusHoraire,
      }).then((next) => {
        setState((s) => {
          if (hoursTimers.current[key]) {
            // Une nouvelle frappe est en attente : ne pas écraser le brouillon.
            return {
              ...EMPTY_STATE,
              ...next,
              settings: { ...DEFAULT_SETTINGS, ...(next.settings || {}) },
              hoursByMonth: {
                ...next.hoursByMonth,
                [mois]: {
                  ...(next.hoursByMonth[mois] || {}),
                  [employeeId]: s.hoursByMonth[mois]?.[employeeId] ?? next.hoursByMonth[mois]?.[employeeId],
                },
              },
            };
          }
          return { ...EMPTY_STATE, ...next, settings: { ...DEFAULT_SETTINGS, ...(next.settings || {}) } };
        });
        setSaveError(null);
      }).catch((e) => {
        setSaveError(e.message || 'Impossible d\'enregistrer les heures.');
      });
    }, HOURS_DEBOUNCE_MS);
  }, []);

  const setCurrentMonth = useCallback((mois, annee) => {
    const year = annee ?? yearRef.current;
    setState((s) => ({
      ...s,
      currentMonth: mois,
      currentYear: year ?? s.currentYear,
    }));
    run(() => api.setCurrentMonth(mois, year)).catch(() => {});
  }, [run]);

  const updateSettings = useCallback((patch) => run(() => api.updateSettings(patch)), [run]);

  /** Fiches du mois : un calcul par employé (salaire en vigueur × heures). */
  const getPayslips = useCallback(
    (mois, annee) => {
      const year = annee ?? state.currentYear;
      const byEmp = state.hoursByMonth[mois] || {};
      return state.employees.map((emp) => {
        const hours = byEmp[emp.id] || { heuresPrestees: '', bonusHoraire: 0 };
        const payslip = computePayslip({
          salaireInitial: salaireForMonth(emp, mois, year),
          heuresPrestees: hours.heuresPrestees,
          bonusHoraire: hours.bonusHoraire,
          mois,
          settings: state.settings,
        });
        return { employee: emp, hours, payslip };
      });
    },
    [state.employees, state.hoursByMonth, state.settings, state.currentYear]
  );

  const archiveMonth = useCallback((mois, annee) => run(() => api.archiveMonth(mois, annee)), [run]);

  const deleteArchiveMonth = useCallback((mois, annee) => run(() => api.deleteArchiveMonth(mois, annee)), [run]);

  const archivedMonths = useMemo(() => {
    const year = Number(state.currentYear);
    const set = new Set(
      state.archive.filter((a) => archiveYear(a) === year).map((a) => a.mois)
    );
    return MOIS.filter((m) => set.has(m));
  }, [state.archive, state.currentYear]);

  const resetAllData = useCallback((password) => run(() => api.resetAllData(password)), [run]);

  const value = useMemo(
    () => ({
      ...state,
      loading,
      error,
      saveError,
      reload,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      setHours,
      setCurrentMonth,
      updateSettings,
      getPayslips,
      archiveMonth,
      deleteArchiveMonth,
      archivedMonths,
      resetAllData,
    }),
    [state, loading, error, saveError, reload, addEmployee, updateEmployee, deleteEmployee, setHours, setCurrentMonth, updateSettings, getPayslips, archiveMonth, deleteArchiveMonth, archivedMonths, resetAllData]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/** Accès au contexte métier ; à n'appeler que sous `<DataProvider>`. */
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
