import { isDeepStrictEqual } from 'node:util';
import type { GmpRecord, GmpState } from './processing-gmp';

// PostgreSQL JSONB does not retain object key order. Compare persisted values,
// including JSON's omission of undefined properties, rather than serialization order.
export function sameStoredJson(a: unknown, b: unknown): boolean {
  return isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
}

export function canRebaseSalesEdit(state: GmpState, recordId: unknown, baseRecord: unknown): boolean {
  if (typeof recordId !== 'string' || !baseRecord || typeof baseRecord !== 'object') return false;
  const base = baseRecord as GmpRecord;
  const current = state.records.sales.find(r => r.id === recordId);
  return !!current && base.id === recordId && sameStoredJson(current, base);
}
