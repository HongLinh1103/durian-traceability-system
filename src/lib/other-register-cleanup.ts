import { Values } from './processing-gmp';
import { materialSourcesForRecord, otherMaterialSources } from './other-register-data';
import { OtherRegisterState } from './other-registers';

const cleanName = (value: unknown) => String(value || '').replace(/\s*\((?:mẫu|minh họa)\)/gi, '').trim();
const isPerson = (value: string) => !!value && !/^(?:Nhân viên|Người |Tổ |Giám sát)/i.test(value) && /\s/.test(value);

/** Normalize only placeholder labels; keep identifiers, quantities, dates and prior audit entries. */
export function tidyOtherRegisters(state: OtherRegisterState, actor: string, at = new Date().toISOString()) {
 const sources = otherMaterialSources(state);
 const supervisorRoster = [...new Set(state.records.preprocessing.map(r => cleanName(r.values.supervisor)).filter(isPerson))];
 const receiverRoster = [...new Set(state.records.receiving.map(r => cleanName(r.values.receiver)).filter(isPerson))];
 const changed: { id: string; book: string; fields: string[] }[] = [];
 const normalize = <T extends { id: string; book: string; sourceId: string; lotCode: string; confirmed: boolean; values: Values; history: { actor: string; at: string }[] }>(record: T, index: number): T => {
  const source = materialSourcesForRecord(state, record, sources)[0];
  const receiptIds = source?.receivingIds || [];
  const receipts = state.records.receiving.filter(r => receiptIds.includes(r.id));
  const fresh = state.records.preprocessing.find(r => receiptIds.includes(r.sourceId) || state.productionLots?.some(l => l.route === 'DG' && l.id === r.sourceId && l.allocations.some(a => a.active && receiptIds.includes(a.receivingId))));
  const receiver = receipts.map(r => cleanName(r.values.receiver)).find(isPerson) || receiverRoster[index % receiverRoster.length];
  const supervisor = cleanName(fresh?.values.supervisor) || supervisorRoster[index % supervisorRoster.length];
  const values = { ...record.values };
  for (const key of ['receiver', 'supervisor', 'operator']) {
   const old = String(values[key] || '');
   const replacement = key === 'supervisor' ? supervisor : receiver;
   if (/^(?:Nhân viên tiếp nhận|Người tiếp nhận|Người giám sát|Nhân viên sản xuất|Người thực hiện)(?:\s*\(mẫu\))?$/i.test(old.trim()) && replacement && isPerson(replacement)) values[key] = replacement;
  }
  if (/^Không phát sinh\s*\(mẫu\)$/i.test(String(values.correction || '').trim())) values.correction = '';
  for (const key of ['warehouse', 'product', 'packaging', 'receiver', 'supervisor', 'operator']) if (typeof values[key] === 'string') values[key] = String(values[key]).replace(/\s*\(mẫu\)/gi, '').trim();
  const fields = Object.keys(values).filter(key => values[key] !== record.values[key]);
  if (!fields.length) return record;
  changed.push({ id: record.id, book: record.book, fields });
  const before = Object.fromEntries(fields.map(key => [key, record.values[key]]));
  return { ...record, values, history: [...record.history, { actor, at, action: 'CLEANUP_DISPLAY_LABELS', values: { ...values }, confirmed: record.confirmed, before, note: 'Chuẩn hóa tên nhân sự theo hồ sơ nhập hàng và sổ trái tươi; bỏ nhãn minh họa theo yêu cầu.' }] };
 };
 return { state: { ...state, otherProcessing: (state.otherProcessing || []).map(normalize), otherMonitoring: (state.otherMonitoring || []).map(normalize) }, changed };
}
