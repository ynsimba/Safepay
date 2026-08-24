/**
 * Mesure synchrone de la taille d'un élément (getBoundingClientRect),
 * puis suivi via ResizeObserver. Utile pour dimensionner un graphique.
 */
import { useLayoutEffect, useRef, useState } from 'react';

export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Évite un re-render si rien n'a changé.
      setSize((prev) => (prev.width === rect.width && prev.height === rect.height ? prev : { width: rect.width, height: rect.height }));
    };

    measure();
    const raf = requestAnimationFrame(measure);

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(el);
    }
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return [ref, size];
}
