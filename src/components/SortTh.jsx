/**
 * En-tête de colonne cliquable pour trier un tableau.
 */
export default function SortTh({ column, sort, onSort, style }) {
  const active = sort.key === column.key;
  const icon = !active ? 'bi-arrow-down-up' : sort.dir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
  return (
    <th
      style={style}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`sp-th-sort ${active ? 'is-active' : ''}`}
        onClick={() => onSort(column.key)}
      >
        {column.label}
        <i className={`bi ${icon}`} aria-hidden="true" />
      </button>
    </th>
  );
}
