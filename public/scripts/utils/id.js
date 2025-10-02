let seq = 0;
export function newId(prefix='id') {
  seq += 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}
