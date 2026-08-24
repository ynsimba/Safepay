/**
 * Champ de recherche commun aux tableaux (employé, nom, perception).
 */
export default function SearchBar({ value, onChange, placeholder = 'Rechercher un employé...' }) {
  return (
    <div className="input-group sp-search">
      <span className="input-group-text bg-white border-end-0">
        <i className="bi bi-search text-muted" />
      </span>
      <input
        type="search"
        className="form-control border-start-0"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}

/** Vrai si la chaîne contient la requête (insensible à la casse). */
export function matchesSearch(haystack, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return String(haystack || '').toLowerCase().includes(q);
}
