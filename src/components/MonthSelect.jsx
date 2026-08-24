/**
 * Sélecteur de mois : déclencheur type champ, liste en grille 3×4.
 * Les mois de `highlight` (archivés) portent une coche, sans élargir le champ fermé.
 * Le panneau est porté sur document.body pour ne pas être coupé par les modales.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MOIS } from '../utils/payroll';

export default function MonthSelect({ value, onChange, className = '', highlight = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const rootRef = useRef(null);
  const listId = useId();
  const archived = new Set(highlight);
  const label = value || placeholder || 'Mois';

  useEffect(() => {
    if (!open) return undefined;

    function place() {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.max(r.width, 312);
      const approxHeight = placeholder ? 248 : 212;
      const flip = window.innerHeight - r.bottom < approxHeight && r.top > approxHeight;
      setCoords({
        top: flip ? r.top - 4 - approxHeight : r.bottom + 4,
        left: Math.min(r.left, window.innerWidth - width - 8),
        width,
      });
    }

    function onPointer(e) {
      const node = e.target?.nodeType === 3 ? e.target.parentElement : e.target;
      if (!node) return;
      if (!rootRef.current?.contains(node) && !node.closest?.('.sp-month-panel')) {
        setOpen(false);
      }
    }

    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    place();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, placeholder]);

  function pick(mois) {
    onChange(mois);
    setOpen(false);
  }

  return (
    <div className={`sp-month ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className={`sp-month-trigger ${open ? 'is-open' : ''} ${!value && placeholder ? 'is-placeholder' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sp-month-label">{label}</span>
        {value && archived.has(value) && (
          <i className="bi bi-check2 sp-month-mark" title="Mois archivé" aria-hidden="true" />
        )}
        <i className={`bi bi-chevron-down sp-month-caret ${open ? 'is-open' : ''}`} aria-hidden="true" />
      </button>

      {open && coords && createPortal(
        <div
          className="sp-month-panel"
          id={listId}
          role="listbox"
          aria-label="Choisir un mois"
          style={{ top: coords.top, left: coords.left, minWidth: coords.width }}
        >
          {placeholder && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={`sp-month-empty ${!value ? 'is-selected' : ''}`}
              onClick={() => pick('')}
            >
              {placeholder}
            </button>
          )}
          <div className="sp-month-grid">
            {MOIS.map((m) => {
              const selected = m === value;
              const isArchived = archived.has(m);
              return (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`sp-month-option ${selected ? 'is-selected' : ''} ${isArchived ? 'is-archived' : ''}`}
                  onClick={() => pick(m)}
                >
                  <span>{m}</span>
                  {isArchived && <i className="bi bi-check2" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
