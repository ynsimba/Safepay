/**
 * Coquille de l'application : barre latérale Safecheck, en-tête de page et zone de contenu.
 */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const SIDEBAR_STORAGE_KEY = 'sp-sidebar-open';
const MOBILE_MQ = '(max-width: 991px)';

function isMobileViewport() {
  return window.matchMedia(MOBILE_MQ).matches;
}

function readDesktopSidebarPref() {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === '0') return false;
    if (stored === '1') return true;
  } catch {
    /* stockage indisponible */
  }
  return true;
}

function writeDesktopSidebarPref(open) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? '1' : '0');
  } catch {
    /* stockage indisponible */
  }
}

/** Entrées du menu, regroupées par section. */
const NAV_ITEMS = [
  { section: 'Vue d\'ensemble', items: [
    { to: '/', label: 'Tableau de bord', icon: 'bi-speedometer2', end: true },
  ]},
  { section: 'Gestion de la paie', items: [
    { to: '/heures', label: 'Heures prestées', icon: 'bi-clock-history' },
    { to: '/fiche-salariale', label: 'Fiche salariale', icon: 'bi-receipt' },
    { to: '/archive', label: 'Suivi mensuel', icon: 'bi-archive' },
  ]},
  { section: 'Configuration', items: [
    { to: '/employes', label: 'Employés', icon: 'bi-people' },
    { to: '/parametres', label: 'Paramètres', icon: 'bi-sliders' },
  ]},
];

/** Titre et sous-titre affichés dans la barre supérieure selon l'URL. */
const PAGE_META = {
  '/': { title: 'Tableau de bord', sub: 'Vue d\'ensemble de la masse salariale et des indicateurs clés' },
  '/heures': { title: 'Heures prestées', sub: 'Encodage mensuel des heures et bonus par employé' },
  '/fiche-salariale': { title: 'Fiche salariale', sub: 'Calcul automatique des salaires, bonus et retenues' },
  '/archive': { title: 'Suivi mensuel', sub: 'Historique archivé de tous les mois traités' },
  '/employes': { title: 'Employés', sub: 'Gestion de l\'effectif et des informations bancaires' },
  '/parametres': { title: 'Paramètres', sub: 'Règles de calcul, journal d\'activité et zone de danger' },
};

export default function Layout() {
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [open, setOpen] = useState(() => (isMobileViewport() ? false : readDesktopSidebarPref()));
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'SafePay', sub: '' };
  const { saveError } = useData();
  const { user, logout } = useAuth();

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MQ);
    const onChange = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      setOpen(mobile ? false : readDesktopSidebarPref());
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleSidebar = () => {
    setOpen((current) => {
      const next = !current;
      if (!isMobile) writeDesktopSidebarPref(next);
      return next;
    });
  };

  const closeIfMobile = () => {
    if (isMobile) setOpen(false);
  };

  return (
    <div className={`app-shell ${!open ? 'sidebar-collapsed' : ''}`}>
      {/* Overlay mobile : ferme le menu au clic à l'extérieur. */}
      <div className={`sp-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sp-sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="sp-brand">
          <img src="/icons.png" alt="SafePay" className="sp-brand-logo" />
        </div>
        <nav className="sp-nav">
          {NAV_ITEMS.map((group) => (
            <div key={group.section}>
              <div className="sp-nav-section">{group.section}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sp-nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeIfMobile}
                >
                  <i className={`bi ${item.icon}`} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sp-sidebar-footer">
          <div className="sp-sidebar-user">{user?.name || user?.email}</div>
          <button type="button" className="btn btn-sm btn-outline-secondary w-100" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="sp-main">
        <header className="sp-topbar">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-light sp-menu-toggle"
              onClick={toggleSidebar}
              aria-expanded={open}
              aria-label={open ? 'Masquer le menu' : 'Afficher le menu'}
              title={open ? 'Masquer le menu' : 'Afficher le menu'}
            >
              <i className={`bi ${open ? 'bi-layout-sidebar-inset' : 'bi-list'}`} />
            </button>
            <div>
              <h1>{meta.title}</h1>
              <p className="sp-topbar-sub">{meta.sub}</p>
            </div>
          </div>
        </header>
        <main className="sp-content">
          {/* Erreur d'enregistrement (heures, employés, etc.) sans bloquer tout l'écran. */}
          {saveError && (
            <div className="alert alert-danger py-2 mb-3" role="alert">
              {saveError}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
