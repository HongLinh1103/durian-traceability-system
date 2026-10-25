import assert from 'node:assert/strict';
import { createDemoState, saveRecord } from '../src/lib/processing-gmp';
import { sameStoredJson, canRebaseSalesEdit } from '../src/lib/processing-gmp-concurrency';

const state = createDemoState();
const sale = state.records.sales[0];
const base = structuredClone(sale);
const url = '/api/processing/gmp/certificates/12345678-1234-1234-1234-123456789abc.png';
// Documents may be supplemented after accounting or aftersales without changing
// any source, quantity, price, payment or downstream record.
state.payments.push({ id: 'locked-sale', recordId: sale.id, direction: 'IN', date: '2026-09-12', amount: 100, method: 'Chuyển khoản' });
state.records.aftersales.push({ id: 'downstream', sourceId: sale.id, lotCode: sale.lotCode, season: sale.season, values: {} });
const next = saveRecord(state, 'sales', {id: sale.id, values: {...sale.values, testCertificate: url}}, sale.id);
const saved = next.records.sales.find(r => r.id === sale.id)!;
assert.equal(saved.values.testCertificate, url);
assert.deepEqual(saved, {...base, values: {...base.values, testCertificate: url}});
assert.deepEqual(next.payments, state.payments);
assert.deepEqual(next.records.aftersales, state.records.aftersales);
assert.equal(state.records.sales[0].values.testCertificate, base.values.testCertificate);
const removed = saveRecord(next, 'sales', {id: sale.id, values: {...saved.values, testCertificate: ''}}, sale.id);
assert.equal(removed.records.sales.find(r => r.id === sale.id)!.values.testCertificate, '');
assert.throws(() => saveRecord(state, 'sales', {id: sale.id, values: {...sale.values, testCertificate: 'javascript:alert(1)'}}, sale.id), /kiểm nghiệm/);
const contactCorrected = saveRecord(state, 'sales', {id: sale.id, values: {...sale.values, testCertificate: url, customer: 'Nguyễn Văn B', customerInfo: '+84 912 345 678'}}, sale.id);
assert.equal(contactCorrected.records.sales[0].values.customerInfo, '+84912345678');
assert.deepEqual(contactCorrected.payments, state.payments);
assert.throws(() => saveRecord(state, 'sales', {id: sale.id, values: {...sale.values, testCertificate: url, weight_kg: Number(sale.values.weight_kg) + 1}}, sale.id), /thanh toán/);

// Simulate JSONB returning objects with a different key order.
function reorder(value: unknown): unknown {
 if (Array.isArray(value)) return value.map(reorder);
 if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reorder(child)]));
 return value;
}
assert.notEqual(JSON.stringify(state), JSON.stringify(reorder(state)));
assert(sameStoredJson(state, reorder(state)));
assert(sameStoredJson({a: undefined, b: 1}, {b: 1}));
assert(!sameStoredJson({a: 1}, {a: 2}));
assert(!sameStoredJson([1, 2], [2, 1]));

// A change elsewhere in the workspace does not invalidate an unchanged sale.
const concurrent = structuredClone(state);
concurrent.records.receiving[0].values.notes = 'Cập nhật ở sổ khác';
assert(canRebaseSalesEdit(concurrent, sale.id, reorder(base)));
concurrent.records.sales[0].values.customer = 'Người khác đã sửa';
assert(!canRebaseSalesEdit(concurrent, sale.id, base));
assert(!canRebaseSalesEdit(next, sale.id, base), 'Do not overwrite a newer certificate');
assert(!canRebaseSalesEdit(state, sale.id, undefined));
assert(!canRebaseSalesEdit(state, 'missing', base));
console.log('PASS: certificate save/removal on locked sales, unchanged business data, JSONB equality, safe revision rebase and real conflict rejection');
