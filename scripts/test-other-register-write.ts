import assert from 'node:assert/strict';
import { adoptOtherRegisterPreview } from '../src/lib/other-register-import';
import { OTHER_REGISTER_KEYS, OTHER_REGISTERS, OtherRegisterState, actualOtherRegisterRows, otherRegisterExport } from '../src/lib/other-registers';
import { otherRegisterFormFields, saveOtherRegister } from '../src/lib/other-register-write';

export function registerWriteFixture(): OtherRegisterState {
 return { demo: false, records: { purchases: [], receiving: [{ id: 'receipt', sourceId: 'harvest', lotCode: 'LH-REAL', season: '2026', values: { date: '2026-10-20', classificationComplete: '1', sourceEligible: '1', cbLotCodes: 'CB-REAL-001', otherProcessing: 100, otherGrade1: 40, otherGrade2: 30, otherGrade3: 20, otherGradeOther: 10, variety: 'Ri6', harvestRecordId: 'harvest' } }], preprocessing: [], packaging: [], inspection: [], sales: [], aftersales: [] }, payments: [], otherProcessing: [], otherMonitoring: [] };
}

let sequence = 0;
const nextId = () => `written-${++sequence}`;
const before = registerWriteFixture();
const beforeJson = JSON.stringify(before);
const adopted = adoptOtherRegisterPreview(before, 'operator', nextId);
assert.equal(adopted.imported.length, 8);
assert.equal(JSON.stringify(before), beforeJson, 'Adoption must not mutate its input');
assert.equal(adoptOtherRegisterPreview(adopted.state, 'operator', nextId).imported.length, 0, 'Adoption is idempotent');
for (const book of OTHER_REGISTER_KEYS) {
 const rows = actualOtherRegisterRows(adopted.state, book);
 assert.equal(rows.length, 1); assert.equal(rows[0].sourceOnly, undefined);
 assert.equal(rows[0].values.dataOrigin, 'IMPORTED_PREVIEW');
 assert.equal(rows[0].lotCode, 'CB-REAL-001');
 assert.equal(otherRegisterExport(book, rows, false).filename, OTHER_REGISTERS[book].title);
 assert(otherRegisterFormFields(book).length > 0);
 assert(!otherRegisterFormFields(book).some(f => ['serial', 'lotCode', 'quantityWeight'].includes(f.key)));
}
const pre = adopted.state.otherProcessing![0];
assert.equal(pre.history[0].actor, 'operator');
assert.equal(pre.values.output, 98);
const freeze = adopted.state.otherMonitoring!.find(r => r.book === 'quick-freezing')!;
const corrected = saveOtherRegister(adopted.state, { book: freeze.book, id: freeze.id, materialCode: freeze.lotCode, confirmed: true, values: { ...freeze.values, temperature1: -25 } }, nextId(), 'operator-2');
assert.equal(corrected.otherMonitoring!.find(r => r.id === freeze.id)!.values.temperature1, -25);
assert.equal(corrected.otherMonitoring!.find(r => r.id === freeze.id)!.history.length, 2);
assert.throws(() => saveOtherRegister(adopted.state, { book: freeze.book, id: freeze.id, materialCode: freeze.lotCode, confirmed: false, values: freeze.values }, nextId(), 'actor'), /bản nháp/);
assert.throws(() => saveOtherRegister(adopted.state, { book: freeze.book, id: freeze.id, materialCode: 'CB-OTHER-TENANT', confirmed: true, values: freeze.values }, nextId(), 'actor'), /Sổ Nhập hàng/);
assert.throws(() => saveOtherRegister(adopted.state, { book: freeze.book, id: freeze.id, materialCode: freeze.lotCode, confirmed: true, values: { ...freeze.values, endAt: '2026-10-21T01:00' } }, nextId(), 'actor'), /kết thúc/);
const sale = adopted.state.otherMonitoring!.find(r => r.book === 'sales-monitoring')!;
assert.throws(() => saveOtherRegister(adopted.state, { book: sale.book, materialCode: sale.lotCode, confirmed: true, values: { ...sale.values, quantity: 100, weight: 100 } }, nextId(), 'actor'), /vượt tồn kho/);
assert.throws(() => saveOtherRegister(adopted.state, { book: sale.book, materialCode: sale.lotCode, confirmed: true, values: { ...sale.values, quantity: 1, weight: 1, recordedAt: '2026-10-22T01:00', date: '2026-10-22' } }, nextId(), 'actor'), /thời điểm/);
assert.throws(() => saveOtherRegister(adopted.state, { book: 'preprocessing', id: pre.id, materialCode: pre.lotCode, confirmed: true, values: { ...pre.values, outputWeight1: 90 } }, nextId(), 'actor'), /vượt nguyên liệu|cùng loại/);
assert.throws(() => saveOtherRegister(adopted.state, { book: 'preprocessing', id: pre.id, materialCode: pre.lotCode, confirmed: true, values: { ...pre.values, outputWeight1: 0, outputWeight2: 0, outputWeight3: 0, outputWeightOther: 1 } }, nextId(), 'actor'), /đóng gói vượt/);
assert.throws(() => saveOtherRegister(before, { book: 'ripening', materialCode: 'CB-REAL-001', confirmed: true, values: { startDate: '2026-10-21T01:00', endDate: '2026-10-22T01:00', processOk: 'Đ', receiver: 'A', supervisor: 'B' } }, nextId(), 'actor'), /xác nhận sơ chế/);
const draft = saveOtherRegister(before, { book: 'preprocessing', materialCode: 'CB-REAL-001', confirmed: false, values: {} }, nextId(), 'actor');
assert.equal(draft.otherProcessing![0].confirmed, false);
assert.equal(draft.otherProcessing![0].values.inputWeight1, 40);
assert.equal(JSON.stringify(before), beforeJson);
console.log('PASS: all eight write forms, idempotent adoption, provenance, draft/confirm/edit history, CB ownership, negative temperatures, date and stock validation');
