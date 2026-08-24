/**
 * Racine : authentification Sanctum, puis écran de chargement et navigation.
 */
import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { DataProvider, useData } from './context/DataContext.jsx';
import Layout from './components/Layout.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Hours from './pages/Hours.jsx';
import Payslips from './pages/Payslips.jsx';
import Archive from './pages/Archive.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <SplashScreen ready={false} />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <DataProvider>
      <AuthenticatedApp />
    </DataProvider>
  );
}

function AuthenticatedApp() {
  const { loading, error, reload } = useData();
  const [splashDone, setSplashDone] = useState(false);
  const showSplash = !splashDone || loading || !!error;

  return (
    <>
      {showSplash && (
        <SplashScreen
          ready={!loading && !error}
          error={error}
          onRetry={reload}
          onDone={() => setSplashDone(true)}
        />
      )}
      {!loading && !error && (
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/employes" element={<Employees />} />
              <Route path="/heures" element={<Hours />} />
              <Route path="/fiche-salariale" element={<Payslips />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/parametres" element={<Settings />} />
            </Route>
          </Routes>
        </HashRouter>
      )}
    </>
  );
}
