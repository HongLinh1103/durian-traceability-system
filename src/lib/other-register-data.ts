import { GMP_GRADES, GmpRecord, Values } from './processing-gmp';
import type { OtherRegisterKey, OtherRegisterState } from './other-registers';

export type MaterialSource = {
 id: string;
 code: string;
 receivingIds: string[];
 date: string;
 weight?: number;
 grades: Values;
 variety: string;
 blocked?: boolean;
};
export type OtherRegisterRow = GmpRecord & { sample?: boolean; sourceOnly?: boolean; sourceBlocked?:boolean };
const cbCode = (value: unknown) => /^CB-[^\s,]+$/i.test(String(value || ''));
const validWeight = (value: unknown): value is number | string => value !== '' && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0;
const round = (value: number) => Math.round(value * 1000) / 1000;

/** Only read codes explicitly stored by receiving/allocation. Never mint a code or rename DG. */
export function otherMaterialSources(state: OtherRegisterState): MaterialSource[] {
 const receiving = state.records.receiving.filter(r => !r.draft && (r.values.classificationComplete === '1' || !r.values.harvestRecordId && !r.values.sampleSourceId) && Number(r.values.otherProcessing) > 0);
 const result = new Map<string, MaterialSource>();
 const assigned = new Set<string>();
 for (const lot of state.productionLots || []) {
  if (lot.route !== 'CB' || !cbCode(lot.code)) continue;
  const active = lot.allocations.filter(a => a.active);
  if (!active.length || active.some(a => !receiving.some(r => r.id === a.receivingId))) continue;
  const parents = active.map(a => receiving.find(r => r.id === a.receivingId)!);
  const grades: Values = {};
  for (const grade of GMP_GRADES) {
   const values = active.map(a => {
    const explicit = a.grades['otherGrade' + grade.key];
    if (validWeight(explicit)) return Number(explicit);
    const parent = receiving.find(r => r.id === a.receivingId)!;
    const allocations = (state.productionLots || []).filter(l => l.route === 'CB').flatMap(l => l.allocations).filter(x => x.active && x.receivingId === parent.id);
    // A full, unsplit allocation can inherit the actual receiving breakdown; partial allocations cannot.
    const inherited = parent.values['otherGrade' + grade.key];
    return allocations.length === 1 && Math.abs(a.weight - Number(parent.values.otherProcessing)) < .001 && validWeight(inherited) ? Number(inherited) : undefined;
   });
   if (values.every(v => v !== undefined)) grades['inputWeight' + grade.key] = round(values.reduce<number>((sum, v) => sum + v!, 0));
  }
  parents.forEach(r => assigned.add(r.id));
  result.set(lot.code, { id: lot.id, code: lot.code, receivingIds: [...new Set(parents.map(r => r.id))], date: parents.map(r => String(r.values.date || '')).sort().at(-1) || '', weight: round(active.reduce((sum, a) => sum + a.weight, 0)), grades, variety: lot.variety, blocked:parents.some(r=>r.values.sourceConflict === '1' || r.values.sourceEligible === '0') });
 }
 for (const r of receiving) {
  if (assigned.has(r.id)) continue;
  const codes = [...new Set(String(r.values.cbLotCodes || '').split(/[\n,]/).map(s => s.trim()).filter(cbCode))];
  // Multiple legacy codes without allocations have no defensible per-lot quantity.
  for (const code of codes) {
   const prior = result.get(code);
   const weight = codes.length === 1 ? Number(r.values.otherProcessing) : undefined;
   const grades: Values = {};
   for (const grade of GMP_GRADES) {
    const raw = r.values['otherGrade' + grade.key];
    const key = 'inputWeight' + grade.key;
    if (codes.length === 1 && validWeight(raw) && (!prior || validWeight(prior.grades[key]))) grades[key] = round(Number(raw) + Number(prior?.grades[key] || 0));
   }
   result.set(code, { id: prior?.id || r.id, code, receivingIds: [...(prior?.receivingIds || []), r.id], date: [prior?.date || '', String(r.values.date || '')].sort().at(-1) || '', weight: weight === undefined || prior && prior.weight === undefined ? undefined : round(weight + (prior?.weight || 0)), grades, variety: String(r.values.variety || ''), blocked:prior?.blocked || r.values.sourceConflict === '1' || r.values.sourceEligible === '0' });
  }
 }
 return [...result.values()];
}

export function materialSourcesForRecord(state: OtherRegisterState, record: { id: string; sourceId: string; lotCode: string; values: Values }, sources = otherMaterialSources(state), seen = new Set<string>()): MaterialSource[] {
 if (seen.has(record.id)) return [];
 seen.add(record.id);
 const direct = sources.filter(s => s.id === record.sourceId || s.code === record.lotCode || s.code === record.values.sourceLot || s.code === record.values.materialLotCode);
 if (direct.length) return direct;
 const parent = state.otherProcessing?.find(r => r.id === record.sourceId);
 if (parent) return materialSourcesForRecord(state, parent, sources, seen);
 return sources.filter(s => s.receivingIds.includes(record.sourceId));
}

export function receivingPreprocessingRows(state: OtherRegisterState): OtherRegisterRow[] {
 return otherMaterialSources(state).map(source => ({ id: `receiving:${source.code}`, sourceId: source.id, lotCode: source.code, season: '', draft: true, sourceOnly: true, sourceBlocked:source.blocked, values: { date: source.date, variety: source.variety, ...source.grades, ...(source.weight !== undefined ? { inputWeight: source.weight } : {}) } }));
}

/** Ephemeral preview only: every lot code and input weight comes from this facility's receiving data. */
export function sampleOtherRegisterRows(state: OtherRegisterState, book: OtherRegisterKey): OtherRegisterRow[] {
 return otherMaterialSources(state).filter(s => !s.blocked && s.weight !== undefined && s.weight > 0 && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && Number.isFinite(Date.parse(s.date))).map(source => {
  const day = (offset: number) => new Date(Date.parse(source.date + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
  const at = (offset: number, time: string) => `${day(offset)}T${time}:00+07:00`;
  const packedWeight = round(source.weight! * .65);
  const quantity = Math.max(1, Math.ceil(packedWeight / 5));
  const soldQuantity = Math.max(1, Math.floor(quantity * .6));
  const soldWeight = round(packedWeight * soldQuantity / quantity);
  const people = { receiver: 'Nhân viên tiếp nhận (mẫu)', supervisor: 'Người giám sát (mẫu)', operator: 'Nhân viên sản xuất (mẫu)' };
  let values: Values = { ...people, correction: 'Không phát sinh (mẫu)', materialLotCode: source.code };
  if (book === 'preprocessing') {
   values = { ...values, date: source.date, ...source.grades, supplierOk: 'Đ', transportOk: 'Đ', materialOk: 'Đ', brushOk: 'Đ', airOk: 'Đ', dryStart: at(0, '08:00'), dryEnd: at(1, '06:00'), dryOk: 'Đ', qualityOk: 'Đ' };
   for (const grade of GMP_GRADES) {
    const input = source.grades['inputWeight' + grade.key];
    if (validWeight(input)) values['outputWeight' + grade.key] = round(Number(input) * .98);
   }
  }
  if (book === 'ripening') Object.assign(values, { startDate: at(1, '08:00'), endDate: at(3, '08:00'), processOk: 'Đ' });
  if (book === 'quick-freezing') Object.assign(values, { warehouse: 'IQF-01 (mẫu)', startAt: at(3, '09:00'), endAt: at(3, '14:00'), temperature1: -12, temperature2: -18, temperature3: -20, productOk: 'Đ' });
  if (book === 'peeling' || book === 'deseeding') Object.assign(values, { monitoredAt: at(3, book === 'peeling' ? '15:00' : '16:00'), equipmentOk: 'Đ', productOk: 'Đ' });
  const product = `Sầu riêng ${source.variety || ''} tách hạt đông lạnh (mẫu)`.replace(/\s+/g, ' ');
  if (book === 'packing') Object.assign(values, { packedAt: at(4, '08:00'), product, packaging: `${quantity} túi / ${packedWeight.toLocaleString('vi-VN')} kg (mẫu)`, quantity, weight: packedWeight, toolsOk: 'Đ', labelsOk: 'Đ', productOk: 'Đ' });
  if (book === 'warehouse') Object.assign(values, { recordedAt: at(4, '10:00'), product, quantity, weight: packedWeight, appearanceOk: 'Đ', storageTemperature: -20 });
  if (book === 'sales-monitoring') Object.assign(values, { date: day(5), recordedAt: at(5, '09:30'), product, quantity: soldQuantity, weight: soldWeight, total:0, appearanceOk: 'Đ', customerName:'Khách hàng mẫu',customerAddress:'Địa chỉ minh họa', customer: 'Khách hàng mẫu · Địa chỉ minh họa', transportOk: 'Đ' });
  return { id: `sample:${book}:${source.code}`, sourceId: source.id, lotCode: source.code, season: '', values, sample: true, draft: true };
 });
}
