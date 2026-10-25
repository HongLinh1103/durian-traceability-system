import { Field, GmpRecord, GMP_GRADES, REGISTERS, Values } from './processing-gmp';
import type { OtherState } from './other-processing';
import type { MonitorState } from './other-monitoring';
import { dryingInput, formatDryingTime } from './drying-time';
import { materialSourcesForRecord, otherMaterialSources, OtherRegisterRow, receivingPreprocessingRows } from './other-register-data';

export const OTHER_REGISTER_KEYS = ['preprocessing', 'ripening', 'quick-freezing', 'peeling', 'deseeding', 'packing', 'warehouse', 'sales-monitoring'] as const;
export type OtherRegisterKey = typeof OTHER_REGISTER_KEYS[number];
export type OtherRegisterColumn = Field & { unit?: string };
type Register = { title: string; code: string; fields: OtherRegisterColumn[]; dateKey: string };
const field = (key: string, label: string, type?: Field['type'], extra: Partial<OtherRegisterColumn> = {}): OtherRegisterColumn => ({ key, label, type, ...extra });
const lot = field('lotCode', 'Mã lô NL');
const correction = field('correction', 'Hành động sửa chữa');
const people = [field('receiver', 'Người tiếp nhận'), field('supervisor', 'Người giám sát')];
const quality = field('productOk', 'Tình trạng sản phẩm (Đ/K)', 'check');
const monitoringFields = [lot, field('monitoredAt', 'Thời gian giám sát', 'datetime-local'), field('equipmentOk', 'Tình trạng vệ sinh thiết bị'), quality, correction, ...people];

// Presentation only. Do not change the existing write schemas or infer new grade allocations.
const freshPreprocessingColumns: OtherRegisterColumn[] = [
 field('date', 'Ngày', 'date'), field('lotCode', 'Mã lô NL'),
 ...GMP_GRADES.map(g => field('inputWeight' + g.key, g.label, 'number', { group: 'KL tiếp nhận (kg)' })),
 field('supplierOk', 'Nhà cung cấp (Đ/K)', 'check'), field('transportOk', 'Vận chuyển sạch (Đ/K)', 'check'),
 field('materialOk', 'Chủng loại, cảm quan, chất lượng nguyên liệu (Đ/K)', 'check'),
 ...REGISTERS.preprocessing.fields.filter(f => ['brushOk', 'airOk', 'dryStart', 'dryEnd', 'dryOk'].includes(f.key)),
 field('qualityOk', 'CL sau sơ chế (Đ/K)', 'check'),
 ...GMP_GRADES.map(g => field('outputWeight' + g.key, g.label, 'number', { group: 'KL sau sơ chế (kg)' })),
 field('correction', 'Hành động khắc phục'), field('supervisor', 'Người giám sát'),
];

export const OTHER_REGISTERS: Record<OtherRegisterKey, Register> = {
 preprocessing: { title: REGISTERS.preprocessing.title, code: 'SẢN XUẤT', dateKey: 'date', fields: freshPreprocessingColumns },
 ripening: { title: 'SỔ THEO DÕI Ủ CHÍN', code: 'BM-GMP.04', dateKey: 'startDate', fields: [lot, field('startDate', 'Ngày bắt đầu', 'datetime-local'), field('endDate', 'Ngày kết thúc', 'datetime-local'), field('processOk', 'Đánh giá công đoạn (Đ/K)', 'check'), correction, ...people] },
 'quick-freezing': { title: 'SỔ THEO DÕI CẤP ĐÔNG NHANH', code: 'BM-GMP.05', dateKey: 'startAt', fields: [lot, field('warehouse', 'Kho/IQF'), field('startAt', 'Thời gian bắt đầu', 'datetime-local'), field('endAt', 'Thời gian kết thúc', 'datetime-local'), ...['1', '2', '3'].map(i => field('temperature' + i, 'Lần ' + i, 'number', { group: 'Nhiệt độ tâm sản phẩm (°C)' })), quality, correction, ...people] },
 peeling: { title: 'SỔ THEO DÕI TÁCH MÚI', code: 'BM-GMP.06', dateKey: 'monitoredAt', fields: monitoringFields },
 deseeding: { title: 'SỔ THEO DÕI BỎ HẠT', code: 'BM-GMP.07', dateKey: 'monitoredAt', fields: monitoringFields },
 packing: { title: 'SỔ THEO DÕI ĐÓNG GÓI', code: 'Bộ cột tạm thời – chờ mẫu GMP chính thức', dateKey: 'packedAt', fields: [field('packedAt', 'Ngày giờ đóng gói', 'datetime-local'), lot, field('product', 'Tên sản phẩm'), field('packaging', 'Quy cách đóng gói'), field('quantity', 'Số lượng đóng gói', 'number'), field('weight', 'Khối lượng đóng gói (kg)', 'number'), field('toolsOk', 'Tình trạng vệ sinh dụng cụ, thiết bị (Đ/K)', 'check'), field('labelsOk', 'Tình trạng bao bì, tem nhãn (Đ/K)', 'check'), quality, correction, field('operator', 'Người thực hiện'), field('supervisor', 'Người giám sát')] },
 warehouse: { title: 'SỔ GIÁM SÁT NHẬP KHO TP', code: 'BM-GMP-09', dateKey: 'recordedAt', fields: [field('recordedAt', 'Thời gian', 'datetime-local'), lot, field('product', 'Sản phẩm'), field('quantityWeight', 'Số lượng/khối lượng'), field('appearanceOk', 'Đánh giá cảm quan'), field('storageTemperature', 'Nhiệt độ kho lạnh', 'number', { unit: '°C' }), field('operator', 'Người thực hiện')] },
 'sales-monitoring': { title: 'SỔ GIÁM SÁT XUẤT BÁN', code: 'Sổ Theo dõi Nhập xuất kho Thành phẩm', dateKey: 'recordedAt', fields: [field('date', 'Ngày, tháng, năm', 'date'), field('recordedAt', 'Thời gian', 'datetime-local'), lot, field('product', 'Sản phẩm'), field('quantityWeight', 'Số lượng/khối lượng'), field('appearanceOk', 'Đánh giá cảm quan'), field('customer', 'Tên, địa chỉ KH'), field('transportOk', 'Đánh giá điều kiện vệ sinh phương tiện vận chuyển (Đ/K)', 'check'), field('operator', 'Người thực hiện')] },
};

export type OtherRegisterState = OtherState & MonitorState;
export function isOtherRegisterKey(value: string): value is OtherRegisterKey {
 return (OTHER_REGISTER_KEYS as readonly string[]).includes(value);
}

export function otherRegisterRows(state: OtherRegisterState, book: OtherRegisterKey): OtherRegisterRow[] {
 const records = book === 'preprocessing' ? (state.otherProcessing || []).filter(r => r.book === book) : (state.otherMonitoring || []).filter(r => r.book === book);
 const sources = otherMaterialSources(state);
 return records.filter(r => !/^DG-/i.test(r.lotCode) && (/^CB-/i.test(r.lotCode) || materialSourcesForRecord(state, r, sources).length > 0)).map(r => {
  const values: Values = { ...r.values };
  const materialSources = materialSourcesForRecord(state, r, sources);
  const lotCode = materialSources.length ? materialSources.map(s => s.code).join(' / ') : r.lotCode;
  if (book === 'preprocessing') {
   // Older CB records only have a total and HH:mm values. Keep unknown grades and dates empty.
   values.dryStart = values.dryStart || (dryingInput(values.start) ? values.start : '');
   values.dryEnd = values.dryEnd || (dryingInput(values.end) ? values.end : '');
  }
  return { id: r.id, sourceId: r.sourceId, lotCode, season: '', values, draft: !r.confirmed, sample: 'sample' in r && r.sample === true };
 });
}

export function actualOtherRegisterRows(state: OtherRegisterState, book: OtherRegisterKey): OtherRegisterRow[] {
 const saved = otherRegisterRows(state, book).filter(r => !r.sample);
 if (book !== 'preprocessing') return saved;
 const usedCodes = new Set(saved.flatMap(r => r.lotCode.split(' / ')));
 return [...saved, ...receivingPreprocessingRows(state).filter(r => !usedCodes.has(r.lotCode))];
}

const hasValue = (v: unknown) => v !== undefined && v !== null && v !== '';
export function otherRegisterDate(record: GmpRecord, book: OtherRegisterKey): string {
 const value = record.values[OTHER_REGISTERS[book].dateKey];
 return dryingInput(value).slice(0, 10) || (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : '');
}
export function filterOtherRegisterRows(rows: GmpRecord[], book: OtherRegisterKey, filter: { month: string; from: string; to: string; query: string }): GmpRecord[] {
 const query = filter.query.trim().toLocaleLowerCase('vi');
 return rows.filter(r => {
  const day = otherRegisterDate(r, book);
  return (!filter.month || day.startsWith(filter.month)) && (!filter.from || day >= filter.from) && (!filter.to || !!day && day <= filter.to) && (!query || `${r.lotCode} ${Object.values(r.values).join(' ')}`.toLocaleLowerCase('vi').includes(query));
 });
}

export function otherRegisterValue(column: OtherRegisterColumn, record: GmpRecord, index: number): string | number {
 if (column.key === 'serial') return index + 1;
 if (column.key === 'lotCode') return record.lotCode;
 if (column.key === 'quantityWeight') {
  if (hasValue(record.values.quantityWeight)) return String(record.values.quantityWeight);
  return [hasValue(record.values.quantity) ? Number(record.values.quantity).toLocaleString('vi-VN') : '', hasValue(record.values.weight) ? `${Number(record.values.weight).toLocaleString('vi-VN')} kg` : ''].filter(Boolean).join(' / ') || '—';
 }
 const value = record.values[column.key];
 if (!hasValue(value)) return '—';
 if (column.type === 'datetime-local') {
  if (dryingInput(value)) return formatDryingTime(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return `${String(value).split('-').reverse().join('/')} · Chưa ghi nhận giờ`;
  return `${value} · Cần bổ sung ngày giờ`;
 }
 if (column.type === 'date') {
  const day = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.split('-').reverse().join('/') : String(value);
 }
 if (column.type === 'number' && Number.isFinite(Number(value))) return column.unit ? `${Number(value).toLocaleString('vi-VN')} ${column.unit}` : Number(value);
 return String(value);
}

export function otherRegisterExport(book: OtherRegisterKey, rows: GmpRecord[], sample: boolean) {
 const config = OTHER_REGISTERS[book];
 return {
  title: `${sample ? 'DỮ LIỆU MẪU — ' : ''}${config.title}`,
  code: sample ? `${config.code} · CHỈ MINH HỌA, KHÔNG PHẢI HỒ SƠ SẢN XUẤT THỰC TẾ` : config.code,
  filename: config.title,
  columns: config.fields,
  rows: rows.map((record, index) => config.fields.map(column => otherRegisterValue(column, record, index))),
 };
}
