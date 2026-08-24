/**
 * Badges visuels réutilisés dans les tableaux (perception, écart d'heures).
 */

/** VB = virement bancaire (bleu), autres modes = espèces / cash (ambre). */
export function PerceptionBadge({ value }) {
  const isVB = String(value).toUpperCase() === 'VB';
  return (
    <span className={`badge rounded-pill ${isVB ? 'badge-vb' : 'badge-cash'} px-2 py-1`}>
      <i className={`bi ${isVB ? 'bi-bank2' : 'bi-cash-coin'} me-1`} />
      {value || '—'}
    </span>
  );
}

/** Écart heures prestées − heures théoriques : négatif = retard (rouge). */
export function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) {
    return <span className="badge rounded-pill bg-light text-muted border px-2 py-1">Non renseigné</span>;
  }
  const late = delta < 0;
  return (
    <span className={`badge rounded-pill ${late ? 'badge-retard' : 'badge-ok'} px-2 py-1`}>
      <i className={`bi ${late ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-1`} />
      {delta > 0 ? '+' : ''}
      {delta.toFixed(2)} h
    </span>
  );
}
