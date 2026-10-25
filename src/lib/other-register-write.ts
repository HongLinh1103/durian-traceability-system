import { z } from 'zod';
import { GMP_GRADES, Values } from './processing-gmp';
import { dryingInput, dryingTimestamp } from './drying-time';
import { materialSourcesForRecord, otherMaterialSources } from './other-register-data';
import { OTHER_REGISTERS, OTHER_REGISTER_KEYS, OtherRegisterColumn, OtherRegisterKey, OtherRegisterState } from './other-registers';

export const otherRegisterInput = z.object({
 book: z.enum(OTHER_REGISTER_KEYS), id: z.string().optional(), materialCode: z.string().min(1).max(300), confirmed: z.boolean(),
 values: z.record(z.union([z.string().max(4000), z.number().finite()])),
});
export type OtherRegisterInput = z.infer<typeof otherRegisterInput>;

export function otherRegisterFormFields(book: OtherRegisterKey): OtherRegisterColumn[] {
 return OTHER_REGISTERS[book].fields.flatMap(field => {
  if (field.key === 'serial' || field.key === 'lotCode') return [];
  if (field.key === 'quantityWeight') return [{ key: 'quantity', label: 'Số lượng', type: 'number' as const }, { key: 'weight', label: 'Khối lượng (kg)', type: 'number' as const }];
  if (field.key === 'appearanceOk') return [{ ...field, type: 'check' as const }];
  return [field];
 });
}

const filled = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';
const day = (value: unknown) => dryingInput(value).slice(0, 10) || (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : '');
const units = (value: unknown) => Math.round(Number(value || 0) * 1000);
const kg = (value: number) => Math.round(value * 1000) / 1000;
const time = (value: unknown) => {
 const stamp = dryingTimestamp(value) || (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? dryingTimestamp(`${value}T00:00`) : '');
 return stamp ? Date.parse(stamp) : NaN;
};

export function saveOtherRegister(state: OtherRegisterState, raw: unknown, id: string, actor: string, now = new Date().toISOString(), origin = 'MANUAL'): OtherRegisterState {
 const input = otherRegisterInput.parse(raw);
 const source = otherMaterialSources(state).find(s => s.code === input.materialCode);
 if (!source) throw Error('Chọn mã CB đã được xác nhận tại Sổ Nhập hàng của cơ sở.');
 const existing = input.book === 'preprocessing' ? state.otherProcessing || [] : state.otherMonitoring || [];
 const old = input.id ? existing.find(r => r.id === input.id && r.book === input.book) : undefined;
 if (input.id && !old) throw Error('Không tìm thấy bản ghi trong sổ này.');
 if (old && old.lotCode !== source.code) throw Error('Không được đổi mã lô NL của bản ghi đã lưu.');
 if (old?.confirmed && !input.confirmed) throw Error('Không được chuyển bản ghi đã xác nhận về bản nháp.');
 const values: Values = {};
 const fields = otherRegisterFormFields(input.book);
 for (const field of fields) {
  const inherited = input.book === 'preprocessing' && field.key.startsWith('inputWeight');
  const value = inherited && filled(source.grades[field.key]) ? source.grades[field.key] : input.values[field.key];
  const optional = field.key === 'correction' || field.key === 'dryEnd' || inherited && !filled(source.grades[field.key]);
  if (!filled(value)) {
   if (input.confirmed && !optional) throw Error(`Vui lòng nhập ${field.label}.`);
   values[field.key] = ''; continue;
  }
  if (field.type === 'number') {
   const n = Number(value);
   const negative = field.key.startsWith('temperature') || field.key === 'storageTemperature';
   if (!Number.isFinite(n) || (!negative && n < 0) || Math.abs(n) > 1e11) throw Error(`${field.label}: số liệu không hợp lệ.`);
   if (field.key === 'quantity' && !Number.isInteger(n)) throw Error('Số lượng phải là số nguyên.');
   if (Math.abs(n * 1000 - Math.round(n * 1000)) > 0.00001) throw Error(`${field.label}: tối đa 3 chữ số thập phân.`);
   values[field.key] = n;
  } else if (field.type === 'check') {
   if (!['Đ', 'K'].includes(String(value))) throw Error(`${field.label}: chọn Đạt hoặc Không đạt.`);
   values[field.key] = String(value);
  } else if (field.type === 'datetime-local') {
   const stamp = dryingTimestamp(value);
   if (!stamp) throw Error(`${field.label}: nhập đầy đủ ngày giờ hợp lệ.`);
   values[field.key] = stamp;
  } else if (field.type === 'date') {
   const text = String(value);
   if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text) throw Error(`${field.label}: ngày không hợp lệ.`);
   values[field.key] = text;
  } else values[field.key] = String(value).trim();
 }
 for (const [start, end] of [['dryStart', 'dryEnd'], ['startDate', 'endDate'], ['startAt', 'endAt']]) {
  if (filled(values[start]) && filled(values[end]) && time(values[end]) <= time(values[start])) throw Error('Ngày giờ kết thúc phải sau ngày giờ bắt đầu.');
 }
 const event = values[OTHER_REGISTERS[input.book].dateKey];
 if (filled(event) && day(event) < source.date.slice(0, 10)) throw Error('Ngày thực hiện không được trước ngày tiếp nhận nguyên liệu.');
 if (input.book === 'sales-monitoring' && filled(values.date) && filled(values.recordedAt) && day(values.date) !== day(values.recordedAt)) throw Error('Ngày xuất bán phải trùng với ngày của thời điểm xuất bán.');
 if (input.confirmed && fields.some(f => f.type === 'check' && values[f.key] === 'K') && !String(values.correction || input.values.correction || '').trim()) throw Error('Ghi rõ hành động sửa chữa khi có đánh giá Không đạt.');
 if (filled(input.values.correction)) values.correction = String(input.values.correction).trim();
 Object.assign(values, { materialLotCode: source.code, sourceLot: source.code, sourceReceivingIds: JSON.stringify(source.receivingIds), dataOrigin: old?.values.dataOrigin || origin });

 const own = (r: { id: string; sourceId: string; lotCode: string; values: Values }) => materialSourcesForRecord(state, r).some(s => s.code === source.code);
 if (input.book === 'preprocessing') {
  const duplicates = (state.otherProcessing || []).filter(r => r.book === 'preprocessing' && r.id !== old?.id && own(r));
  if (duplicates.length) throw Error('Mã lô CB đã có bản ghi Tiếp nhận & Sơ chế. Hãy mở bản ghi hiện có để chỉnh sửa.');
  const knownInput = source.weight;
  const outputs = GMP_GRADES.map(g => values['outputWeight' + g.key]);
  const inputs = GMP_GRADES.map(g => values['inputWeight' + g.key]);
  const sum = (list: (string | number)[]) => kg(list.reduce<number>((n, v) => n + Number(v || 0), 0));
  if (knownInput !== undefined && inputs.every(filled) && Math.abs(units(sum(inputs)) - units(knownInput)) > 1) throw Error('Tổng khối lượng tiếp nhận theo loại phải bằng lượng CB tại Sổ Nhập hàng.');
  const output = sum(outputs);
  if (knownInput === undefined && input.confirmed) throw Error('Lô có nhiều mã CB nhưng chưa xác định khối lượng phân bổ. Cần hoàn thiện phân bổ tại Sổ Nhập hàng.');
  if (knownInput !== undefined && units(output) > units(knownInput)) throw Error('Khối lượng sau sơ chế vượt nguyên liệu CB tiếp nhận.');
  for (const g of GMP_GRADES) if (filled(values['inputWeight' + g.key]) && units(values['outputWeight' + g.key]) > units(values['inputWeight' + g.key])) throw Error(`Khối lượng sau sơ chế ${g.label} vượt lượng tiếp nhận cùng loại.`);
  if (input.confirmed && values.qualityOk === 'Đ' && output <= 0) throw Error('Lô đạt phải có khối lượng sau sơ chế lớn hơn 0.');
  Object.assign(values, { input: knownInput ?? '', output, removed: knownInput !== undefined ? kg(knownInput - output) : '' });
 }
 const eventAt = time(event);
 if (input.confirmed && input.book !== 'preprocessing') {
  const pre = (state.otherProcessing || []).find(r => r.book === 'preprocessing' && r.confirmed && r.values.qualityOk === 'Đ' && own(r));
  if (!pre || !dryingTimestamp(pre.values.dryEnd)) throw Error('Cần xác nhận sơ chế đạt và hoàn tất ngày giờ hong khô cho mã CB trước.');
  if (Number.isFinite(eventAt) && eventAt < time(pre.values.dryEnd)) throw Error('Công đoạn không được thực hiện trước khi kết thúc sơ chế.');
 }
 if (input.confirmed && ['packing', 'warehouse', 'sales-monitoring'].includes(input.book) && (Number(values.quantity) <= 0 || Number(values.weight) <= 0)) throw Error('Số lượng và khối lượng phải lớn hơn 0.');
 if (input.confirmed && input.book === 'sales-monitoring' && (values.appearanceOk !== 'Đ' || values.transportOk !== 'Đ')) throw Error('Chỉ xuất bán khi cảm quan sản phẩm và phương tiện vận chuyển đều đạt.');
 const auditEvent = { actor, at: now, values: { ...values }, confirmed: input.confirmed, action: old ? 'UPDATE' : 'CREATE', origin, ...(origin === 'IMPORTED_PREVIEW' ? { note: 'Nhập bộ dữ liệu khởi tạo theo yêu cầu; nguồn ban đầu là dữ liệu minh họa, chưa xác minh phép đo thực tế.' } : {}) };
 const record = { id: old?.id || id, book: input.book, sourceId: source.id, lotCode: source.code, confirmed: input.confirmed, values };
 const next: OtherRegisterState = input.book === 'preprocessing'
  ? { ...state, otherProcessing: [...(state.otherProcessing || []).filter(r => r.id !== record.id), { ...record, book: 'preprocessing', history: [...(state.otherProcessing?.find(r => r.id === old?.id)?.history || []), auditEvent] }] }
  : { ...state, otherMonitoring: [...(state.otherMonitoring || []).filter(r => r.id !== record.id), { ...record, book: input.book, history: [...(state.otherMonitoring?.find(r => r.id === old?.id)?.history || []), auditEvent] }] };
 validateOtherRegisterStock(next, source.code);
 return next;
}

export function validateOtherRegisterStock(state: OtherRegisterState, code: string) {
 const sources = otherMaterialSources(state);
 const own = (r: { id: string; sourceId: string; lotCode: string; values: Values }) => materialSourcesForRecord(state, r, sources).some(s => s.code === code);
 const pre = (state.otherProcessing || []).filter(r => r.book === 'preprocessing' && r.confirmed && r.values.qualityOk === 'Đ' && own(r));
 const records = (state.otherMonitoring || []).filter(r => r.confirmed && own(r));
 const packing = records.filter(r => r.book === 'packing' && r.values.productOk === 'Đ');
 const warehouse = records.filter(r => r.book === 'warehouse' && r.values.appearanceOk === 'Đ');
 const sales = records.filter(r => r.book === 'sales-monitoring');
 const sum = (rows: { values: Values }[], key: string) => rows.reduce((n, r) => n + units(r.values[key]), 0);
 const preWeight = pre.reduce((n, r) => n + units(r.values.output ?? GMP_GRADES.reduce((s, g) => s + Number(r.values['outputWeight' + g.key] || 0), 0)), 0);
 if (sum(packing, 'weight') > preWeight) throw Error('Khối lượng đóng gói vượt lượng đã sơ chế đạt.');
 if (sum(warehouse, 'quantity') > sum(packing, 'quantity') || sum(warehouse, 'weight') > sum(packing, 'weight')) throw Error('Nhập kho vượt lượng thành phẩm đã đóng gói đạt.');
 if (sum(sales, 'quantity') > sum(warehouse, 'quantity') || sum(sales, 'weight') > sum(warehouse, 'weight')) throw Error('Xuất bán vượt tồn kho thành phẩm khả dụng.');
 const events = [
  ...packing.map(r => ({ at: time(r.values.packedAt), kind: 0, quantity: units(r.values.quantity), weight: units(r.values.weight) })),
  ...warehouse.map(r => ({ at: time(r.values.recordedAt), kind: 1, quantity: units(r.values.quantity), weight: units(r.values.weight) })),
  ...sales.map(r => ({ at: time(r.values.recordedAt), kind: 2, quantity: units(r.values.quantity), weight: units(r.values.weight) })),
 ].sort((a, b) => a.at - b.at || a.kind - b.kind);
 let packedQuantity = 0, packedWeight = 0, stockQuantity = 0, stockWeight = 0;
 for (const e of events) {
  if (e.kind === 0) { packedQuantity += e.quantity; packedWeight += e.weight; }
  if (e.kind === 1) { packedQuantity -= e.quantity; packedWeight -= e.weight; stockQuantity += e.quantity; stockWeight += e.weight; }
  if (e.kind === 2) { stockQuantity -= e.quantity; stockWeight -= e.weight; }
  if (packedQuantity < 0 || packedWeight < 0 || stockQuantity < 0 || stockWeight < 0) throw Error('Không đủ thành phẩm tại thời điểm nhập kho hoặc xuất bán.');
 }
}
