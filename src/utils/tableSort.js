/**
 * Tri de tableaux : comparaison FR, valeurs vides en bas, bascule asc/desc.
 */

export function compareValues(va, vb, dir) {
  const emptyA = va === null || va === '' || va === undefined;
  const emptyB = vb === null || vb === '' || vb === undefined;
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  const factor = dir === 'asc' ? 1 : -1;
  if (typeof va === 'string' || typeof vb === 'string') {
    return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' }) * factor;
  }
  return (Number(va) - Number(vb)) * factor;
}

export function sortRows(rows, sort, getValue) {
  return [...rows].sort((a, b) => compareValues(getValue(a, sort.key), getValue(b, sort.key), sort.dir));
}

export function nextSort(current, key) {
  return current.key === key
    ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: 'asc' };
}
