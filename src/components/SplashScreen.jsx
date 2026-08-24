/**
 * Écran de démarrage (logo + barre lime).
 * Reste affiché au moins 1,4 s, puis fond en 420 ms une fois les données prêtes.
 */
import { useEffect, useRef, useState } from 'react';

const MIN_VISIBLE_MS = 1400;

export default function SplashScreen({ ready = false, error = null, onRetry, onDone }) {
  const [leaving, setLeaving] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const startedAt = useRef(Date.now());

  useEffect(() => {
    // En cas d'erreur MySQL, on reste sur le splash avec le bouton « Réessayer ».
    if (error || !ready) return undefined;
    let done = false;
    const timers = [];

    function finish() {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
      timers.push(window.setTimeout(() => {
        setLeaving(true);
        // Durée alignée sur la transition CSS `.sp-splash.is-leaving`.
        timers.push(window.setTimeout(() => onDoneRef.current?.(), 420));
      }, wait));
    }

    finish();
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [ready, error]);

  return (
    <div className={`sp-splash ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite" aria-label="Chargement">
      <img src="/icons.png" alt="Safecheck Pay" className="sp-splash-logo" />
      {error ? (
        <div className="sp-splash-error">
          <p className="mb-2">{error}</p>
          {onRetry && (
            <button type="button" className="btn btn-sm btn-dark" onClick={onRetry}>
              Réessayer
            </button>
          )}
        </div>
      ) : (
        <div className="sp-splash-bar" aria-hidden="true" />
      )}
    </div>
  );
}
