import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { tidyOtherRegisters } from '../src/lib/other-register-cleanup';
import { otherRegisterColumnLayout } from '../src/lib/other-register-layout';
import { adoptOtherRegisterPreview } from '../src/lib/other-register-import';
import { actualOtherRegisterRows, OTHER_REGISTERS, OTHER_REGISTER_KEYS, OtherRegisterState, otherRegisterExport } from '../src/lib/other-registers';
import { GMP_REGISTER_COLUMN_WIDTHS } from '../src/components/processing/processing-gmp-column-widths';
import { OtherRegisterView } from '../src/components/processing/other-register-view';

const fixture: OtherRegisterState = { demo: false, payments: [], records: { purchases: [], receiving: [{ id: 'receipt', sourceId: 'harvest', lotCode: 'LH-001', season: '2026', values: { date: '2026-10-20', classificationComplete: '1', sourceEligible: '1', cbLotCodes: 'CB-001', otherProcessing: 100, otherGrade1: 40, otherGrade2: 30, otherGrade3: 20, otherGradeOther: 10, receiver: 'Trần Văn Hưng', variety: 'Ri6', harvestRecordId: 'harvest' } }], preprocessing: [{ id: 'fresh', sourceId: 'receipt', lotCode: 'DG-001', season: '2026', values: { supervisor: 'Lê Văn Hùng' } }], packaging: [], inspection: [], sales: [], aftersales: [] } };
let index = 0;
const imported = adoptOtherRegisterPreview(fixture, 'owner', () => 'record-' + index++).state;
const before = JSON.stringify(imported);
const cleaned = tidyOtherRegisters(imported, 'owner');
assert.equal(cleaned.changed.length, 8);
assert.equal(JSON.stringify(imported), before);
assert.deepEqual(cleaned.state.records, imported.records);
assert.equal(tidyOtherRegisters(cleaned.state, 'owner').changed.length, 0);
for (const record of [...cleaned.state.otherProcessing!, ...cleaned.state.otherMonitoring!]) {
 const old = [...imported.otherProcessing!, ...imported.otherMonitoring!].find(r => r.id === record.id)!;
 assert.equal(record.lotCode, old.lotCode);
 assert.equal(record.sourceId, old.sourceId);
 assert.equal(record.values.correction, '');
 if (record.values.receiver !== undefined) assert.equal(record.values.receiver, 'Trần Văn Hưng');
 if (record.values.operator !== undefined) assert.equal(record.values.operator, 'Trần Văn Hưng');
 if (record.values.supervisor !== undefined) assert.equal(record.values.supervisor, 'Lê Văn Hùng');
 for (const [key, value] of Object.entries(old.values)) if (typeof value === 'number' || /At$|Date$|^dryStart$|^dryEnd$/.test(key)) assert.equal(record.values[key], value);
 assert.equal(record.history.length, old.history.length + 1);
 assert.deepEqual(record.history[0], old.history[0], 'Keep original provenance');
}
assert.equal(cleaned.state.otherMonitoring!.find(r => r.book === 'quick-freezing')!.values.warehouse, 'IQF-01');
assert(!OTHER_REGISTERS['quick-freezing'].fields.some(f => f.key === 'serial'));
const freshWidths = GMP_REGISTER_COLUMN_WIDTHS.preprocessing!;
const preLayout = otherRegisterColumnLayout('preprocessing', actualOtherRegisterRows(cleaned.state, 'preprocessing'));
assert.deepEqual([...preLayout.widths, preLayout.actionWidth], freshWidths);
for (const book of OTHER_REGISTER_KEYS) {
 const rows = actualOtherRegisterRows(cleaned.state, book);
 const layout = otherRegisterColumnLayout(book, rows);
 assert.equal(layout.widths.length, OTHER_REGISTERS[book].fields.length);
 assert(layout.widths.every(w => w >= 45 && w <= 240));
 const html = renderToStaticMarkup(createElement(OtherRegisterView, { book, initialState: cleaned.state }));
 assert(!html.includes('Bản ghi được lưu trong cơ sở dữ liệu'));
 assert(!html.includes('Bản ghi khởi tạo'));
 assert(!html.includes('Không phát sinh (mẫu)'));
 assert(!html.includes('Nhân viên tiếp nhận (mẫu)'));
 const filterStart = html.indexOf('aria-label="Bộ lọc sổ"');
 const filter = html.slice(filterStart, html.indexOf('</section>', filterStart));
 assert(filter.includes('Mã lô NL từ Sổ Nhập hàng') && filter.includes('xl:grid-cols-5'));
 const output = otherRegisterExport(book, rows, false);
 assert(!output.rows.flat().some(v => String(v).includes('(mẫu)')));
 assert.equal(output.filename, OTHER_REGISTERS[book].title);
}
console.log('PASS: matched receiving/fresh staff, placeholder cleanup, immutable provenance/quantities, exact fresh preprocessing widths, compact tables, one filter row and matching export');
