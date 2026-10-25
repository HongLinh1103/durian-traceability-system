import type { GmpState } from './processing-gmp';
import { dryingTimestamp } from './drying-time';

// The register date is the date source explicitly requested for these old records.
// Retain the original hours and the source so this conversion remains auditable.
export function upgradeLegacyDryingDates(state: GmpState): GmpState {
  let changed = false;
  const records = (state.records.preprocessing || []).map(record => {
    const values = { ...record.values };
    let updated = false;
    const date = String(values.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return record;
    const start = /^\d{2}:\d{2}$/.test(String(values.dryStart || '')) ? dryingTimestamp(`${date}T${values.dryStart}`) : dryingTimestamp(values.dryStart);
    const end = /^\d{2}:\d{2}$/.test(String(values.dryEnd || '')) ? dryingTimestamp(`${date}T${values.dryEnd}`) : dryingTimestamp(values.dryEnd);
    // An end earlier than the start cannot safely be assigned to the same day.
    if (start && end && Date.parse(end) <= Date.parse(start)) return record;
    for (const key of ['dryStart', 'dryEnd'] as const) {
      if (!/^\d{2}:\d{2}$/.test(String(values[key] || ''))) continue;
      const stamp = key === 'dryStart' ? start : end;
      if (!stamp) continue;
      values[`${key}LegacyTime`] = values[key];
      values[key] = stamp;
      updated = true;
    }
    if (!updated) return record;
    values.dryingDateSource = 'register-date-user-confirmed';
    changed = true;
    return { ...record, values };
  });
  return changed ? { ...state, records: { ...state.records, preprocessing: records } } : state;
}
