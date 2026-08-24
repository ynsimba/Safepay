/**
 * Liste d'années civiles (période de paie).
 */
export default function YearSelect({
  value,
  onChange,
  years,
  allowAll = false,
  allLabel = 'Toutes les années',
  className = '',
}) {
  return (
    <select
      className={`form-select sp-year-select ${className}`.trim()}
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next === 'all' ? 'all' : Number(next));
      }}
      aria-label="Année"
    >
      {allowAll && <option value="all">{allLabel}</option>}
      {years.map((year) => (
        <option key={year} value={year}>{year}</option>
      ))}
    </select>
  );
}
