import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ProcessingGmpRegisterTable } from '../src/components/processing/processing-gmp-register-table';
import { OTHER_REGISTER_KEYS, OTHER_REGISTERS, OtherRegisterState, actualOtherRegisterRows, filterOtherRegisterRows, otherRegisterExport, otherRegisterRows, otherRegisterValue } from '../src/lib/other-registers';
import { otherMaterialSources, receivingPreprocessingRows, sampleOtherRegisterRows } from '../src/lib/other-register-data';
import { OtherRegisterView } from '../src/components/processing/other-register-view';
import { otherBooks, freshBooks } from '../src/lib/processing-navigation';
import { monitoringWorkbook } from '../src/lib/other-monitoring-export';

async function main() {
 const state: OtherRegisterState = {
  demo: false, payments: [], records: { purchases: [], receiving: [], preprocessing: [], packaging: [], inspection: [], sales: [], aftersales: [] },
  otherProcessing: [
   { id: 'cb', sourceId: 'source', book: 'preprocessing', lotCode: 'CB-2026-001', confirmed: true, history: [], values: { date: '2026-10-25', input: 100, output: 90, start: '23:00', end: '02:00', qualityOk: 'Đ' } },
   { id: 'dg', sourceId: 'source', book: 'preprocessing', lotCode: 'DG-2026-001', confirmed: true, history: [], values: { date: '2026-10-25', inputWeight1: 50 } },
  ],
  otherMonitoring: [
   { id: 'freeze', sourceId: 'source', book: 'quick-freezing', lotCode: 'CB-2026-001', confirmed: true, history: [], values: { startAt: '2026-10-24T18:00:00.000Z', endAt: '2026-10-27T02:30:00.000Z', temperature1: -18.5, productOk: 'Đ' } },
   { id: 'ripening', sourceId: 'source', book: 'ripening', lotCode: 'CB-2026-001', confirmed: true, history: [], values: { startDate: '2026-10-25', endDate: '2026-10-27' } },
  ],
 };
 const before = JSON.stringify(state);
 const preprocessing = otherRegisterRows(state, 'preprocessing');
 assert.equal(preprocessing.length, 1, 'DG records must never be shown as CB');
 assert.equal(preprocessing[0].lotCode, 'CB-2026-001');
 assert.equal(preprocessing[0].values.inputWeight1, undefined, 'Do not invent grade allocations from a total');
 assert.equal(preprocessing[0].values.outputWeight1, undefined);
 assert.equal(preprocessing[0].values.dryStart, '', 'HH:mm cannot silently become a dated timestamp');
 assert.equal(preprocessing[0].values.dryEnd, '');
 const freezing = otherRegisterRows(state, 'quick-freezing');
 const start = OTHER_REGISTERS['quick-freezing'].fields.find(f => f.key === 'startAt')!;
 const end = OTHER_REGISTERS['quick-freezing'].fields.find(f => f.key === 'endAt')!;
 assert.equal(otherRegisterValue(start, freezing[0], 0), '25/10/2026 01:00');
 assert.equal(otherRegisterValue(end, freezing[0], 0), '27/10/2026 09:30');
 assert.equal(filterOtherRegisterRows(freezing, 'quick-freezing', { month: '2026-10', from: '2026-10-25', to: '2026-10-25', query: 'CB-2026' }).length, 1, 'Filter by Vietnam calendar day');
 assert.equal(filterOtherRegisterRows(freezing, 'quick-freezing', { month: '', from: '', to: '2026-10-24', query: '' }).length, 0);
 const ripening = otherRegisterRows(state, 'ripening');
 assert.equal(otherRegisterValue(OTHER_REGISTERS.ripening.fields[1], ripening[0], 0), '25/10/2026 · Chưa ghi nhận giờ');
 assert.equal(otherRegisterRows(state, 'packing').length, 0, 'Do not automatically migrate legacy packaging records');
 assert.deepEqual(otherBooks.map(b => b.key), [...OTHER_REGISTER_KEYS]);
 assert.deepEqual(freshBooks.map(b => b.key), ['preprocessing', 'packaging', 'inspection', 'sales', 'aftersales']);
 assert.equal(OTHER_REGISTERS.warehouse.fields.length, 6);
 assert.equal(OTHER_REGISTERS['sales-monitoring'].fields.length, 8);
 assert.equal(OTHER_REGISTERS.packing.fields.length, 12);
 assert.equal(OTHER_REGISTERS.preprocessing.fields.find(f => f.key === 'lotCode')!.label, 'Mã lô NL');
 const receivingState = structuredClone(state);
 receivingState.otherProcessing = [];
 receivingState.otherMonitoring = [];
 receivingState.records.receiving = [{ id: 'receipt', sourceId: 'harvest', lotCode: 'LH-EXISTING', season: '2026', values: { date: '2026-10-20', classificationComplete: '1', sourceEligible: '1', cbLotCodes: 'CB-EXISTING-007', otherProcessing: 100, otherGrade1: 40, otherGrade2: 30, otherGrade3: 20, otherGradeOther: 10, variety: 'Ri6', harvestRecordId: 'harvest' } }];
 const receivingBefore = JSON.stringify(receivingState);
 const source = otherMaterialSources(receivingState)[0];
 assert.equal(source.code, 'CB-EXISTING-007', 'Use the exact stored receiving code');
 const pending = receivingPreprocessingRows(receivingState)[0];
 assert.equal(pending.lotCode, source.code); assert.equal(pending.values.inputWeight1, 40);
 assert.equal(pending.values.dryStart, undefined, 'Do not invent real production outcomes');
 assert(pending.sourceOnly);
 assert.equal(actualOtherRegisterRows(receivingState, 'preprocessing').length, 1);
 for (const book of OTHER_REGISTER_KEYS) {
  const examples = sampleOtherRegisterRows(receivingState, book);
  assert.equal(examples.length, 1, book + ': preview rows available');
  assert.equal(examples[0].lotCode, source.code, book + ': preserve receiving CB identity');
  assert.equal(examples[0].sourceId, 'receipt'); assert.equal(examples[0].sample, true);
  const previewHtml = renderToStaticMarkup(createElement(OtherRegisterView, { book, initialState: receivingState }));
  assert(!previewHtml.includes('DỮ LIỆU MẪU'), 'Production UI must not silently generate preview records');
  assert(previewHtml.includes('CB-EXISTING-007'), 'All eight pages offer existing receiving CB codes');
  const exported = otherRegisterExport(book, examples, true);
  assert(exported.title.startsWith('DỮ LIỆU MẪU'));
  assert.equal(exported.filename, OTHER_REGISTERS[book].title);
  assert(exported.code.includes('KHÔNG PHẢI HỒ SƠ SẢN XUẤT THỰC TẾ'));
  assert(exported.rows[0].some(v => String(v).includes(source.code)), 'Exports must retain material lot linkage even when the template has no lot column');
  if (book === 'packing') assert(Number(examples[0].values.weight) <= source.weight!);
  if (book === 'warehouse') {
   const sale = sampleOtherRegisterRows(receivingState, 'sales-monitoring')[0];
   assert(Number(sale.values.weight) <= Number(examples[0].values.weight));
   assert(Number(sale.values.quantity) <= Number(examples[0].values.quantity));
  }
 }
 assert.equal(JSON.stringify(receivingState), receivingBefore, 'Preview generation must never modify receiving or production data');
 const noCode = structuredClone(receivingState);
 delete noCode.records.receiving[0].values.cbLotCodes;
 assert.equal(otherMaterialSources(noCode).length, 0, 'Never generate a CB code from a date or LH/DG lot');
 assert.equal(sampleOtherRegisterRows(noCode, 'preprocessing').length, 0);
 const ambiguous = structuredClone(receivingState);
 ambiguous.records.receiving[0].values.cbLotCodes = 'CB-EXISTING-007,CB-EXISTING-008';
 assert(otherMaterialSources(ambiguous).every(s => s.weight === undefined && !Object.keys(s.grades).length), 'Do not distribute a receipt across ambiguous legacy codes');
 assert.equal(sampleOtherRegisterRows(ambiguous, 'packing').length, 0);
 const chain = structuredClone(receivingState);
 chain.otherProcessing = [{ id: 'prep', sourceId: 'receipt', book: 'preprocessing', lotCode: source.code, confirmed: true, history: [], values: {} }, { id: 'process', sourceId: 'prep', book: 'processing', lotCode: 'CB-PROCESSING-INTERNAL', confirmed: true, history: [], values: {} }];
 chain.otherMonitoring = [{ id: 'monitor', sourceId: 'process', lotCode: 'CB-MONITOR-INTERNAL', book: 'packing', confirmed: true, values: {}, history: [] }];
 assert.equal(otherRegisterRows(chain, 'packing')[0].lotCode, source.code, 'Resolve material identity through existing production stages');
 assert.equal(actualOtherRegisterRows(chain, 'preprocessing').length, 1, 'Saved preprocessing replaces the waiting source row');
 for (const key of OTHER_REGISTER_KEYS) {
  const config = OTHER_REGISTERS[key];
  const rows = otherRegisterRows(state, key);
  const html = renderToStaticMarkup(createElement(ProcessingGmpRegisterTable, { stage: 'preprocessing', rows, presentation: { ...config, emptyMessage: 'Empty', renderValue: (column, record, i) => otherRegisterValue(column, record, i) } }));
  assert(html.includes('<table'));
  for (const header of html.match(/<th\b[^>]*>/g) || []) assert(header.includes('!whitespace-normal'), 'Both header levels must wrap inside their column');
  assert(!html.includes('Thao tác'), 'No speculative editing controls');
  if (key === 'quick-freezing') assert(html.includes('colSpan="3"'), 'Temperature header spans all three readings');
  if (key === 'warehouse' || key === 'sales-monitoring') assert(!html.includes('Mã lô NL'), 'Keep warehouse/sales headers exactly within their templates');
  const workbook = monitoringWorkbook(config.title, config.code, config.fields, rows.map((r, i) => config.fields.map(c => otherRegisterValue(c, r, i))));
  const bytes = await workbook.xlsx.writeBuffer();
  assert(bytes.byteLength > 0);
  if (key === 'quick-freezing') {
   const sheet = workbook.worksheets[0];
   assert.equal(sheet.getCell(5, 5).value, -18.5, 'Excel keeps negative temperatures numeric');
   assert.equal(sheet.getCell(5, 3).value, '25/10/2026 01:00');
  }
 }
 assert.equal(JSON.stringify(state), before, 'Displaying/filtering/exporting cannot modify source state');
 console.log('PASS: CB/DG isolation, unchanged state and legacy data, Vietnam dates across multiple days, filters, all eight tables and Excel exports');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
