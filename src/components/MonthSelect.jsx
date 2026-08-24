/**
 * Liste déroulante des 12 mois.
 * Les mois présents dans `highlight` (ex. mois archivés) reçoivent une coche.
 */
import { MOIS } from '../utils/payroll';

export default function MonthSelect({ value, onChange, className = '', highlight = [], placeholder }) {
  return (
    <select
      className={`form-select ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {MOIS.map((m) => (
        <option key={m} value={m}>
          {m}{highlight.includes(m) ? ' ✓' : ''}
        </option>
      ))}
    </select>
  );
}
