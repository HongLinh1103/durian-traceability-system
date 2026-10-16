import assert from 'node:assert/strict';
import { GmpRecord, GmpState, GMP_GRADES, Values, gradeTotal } from '../src/lib/processing-gmp';
import { reconcileProcessingGrades } from '../src/lib/processing-grade-reconciliation';

const record = (id: string, sourceId: string, values: Values): GmpRecord => ({ id, sourceId, values, lotCode: 'LH-2026-1310', season: '2026-2027' });
const state: GmpState = { records: { purchases: [], receiving: [], preprocessing: [], packaging: [], inspection: [], sales: [], aftersales: [] }, payments: [], demo: false };
state.records.purchases = [record('purchase', '', { weight: 1000, price: 10000, total: 10000000 })];
state.records.receiving = [record('receive', 'purchase', { grade1: 600, grade2: 250, grade3: 100, gradeOther: 50, rejected: 0 })];
state.records.preprocessing = [record('prep', 'receive', { inputWeight: 1000, outputWeight: 950, qualityOk: 'Đ' })];
state.records.packaging = [record('pack', 'prep', { inputWeight: 950, weight_kg: 900, quantity_boxes: 50 })];
state.records.inspection = [record('failed', 'pack', { mealybug: 'Có', quantity_boxes: 0, weight_kg: 0 }), record('pass', 'pack', { mealybug: 'Không', quantity_boxes: 48, weight_kg: 870 })];
state.records.sales = [record('sale', 'pass', { quantity_boxes: 48, weight_kg: 870, price: 10000, total: 8700000 })];
state.records.aftersales = [record('after', 'sale', { weight_kg: 870 })];
const original = JSON.stringify(state);
const result = reconcileProcessingGrades(state);
assert.equal(JSON.stringify(state), original, 'Planning must not mutate the input.');
assert.deepEqual(result.state.records.receiving, state.records.receiving);
const prep = result.state.records.preprocessing[0].values;
assert.equal(gradeTotal(prep, 'outputWeight'), 950);
const pack = result.state.records.packaging[0].values;
assert.equal(gradeTotal(pack, 'quantity_boxes'), 50);
assert.equal(gradeTotal(pack, 'weight_kg'), 900);
const passed = result.state.records.inspection[1].values;
assert.equal(gradeTotal(passed, 'quantity_boxes'), 48);
assert.equal(gradeTotal(passed, 'weight_kg'), 870);
for (const { key } of GMP_GRADES) {
    assert(Number(prep['outputWeight' + key]) <= Number(prep['inputWeight' + key]));
    assert(Number(pack['weight_kg' + key]) <= Number(pack['inputWeight' + key]));
    assert(Number.isInteger(Number(pack['quantity_boxes' + key])));
    assert.equal(passed['sample' + key], Math.ceil(Number(pack['quantity_boxes' + key]) * 0.02));
    assert(Number(passed['quantity_boxes' + key]) <= Number(passed['inputBoxes' + key]));
    assert.equal(result.state.records.inspection[0].values['quantity_boxes' + key], 0);
    assert.equal(result.state.records.sales[0].values['weight_kg' + key], passed['weight_kg' + key]);
}
assert.equal(result.state.records.sales[0].values.total, 8700000);
assert.equal(reconcileProcessingGrades(result.state).changes.length, 0, 'Second run must be a no-op.');
const whole = reconcileProcessingGrades(result.state, { wholeKg: true });
assert.equal(whole.state.records.preprocessing[0].values.outputWeight, 950);
assert.equal(whole.state.records.packaging[0].values.weight_kg, 900);
assert.equal(whole.state.records.inspection[1].values.weight_kg, 870);
for (const stage of ['preprocessing', 'packaging', 'inspection', 'sales', 'aftersales'] as const)
    for (const r of whole.state.records[stage]) for (const [key, value] of Object.entries(r.values))
        if (/^(inputWeight|outputWeight|weight_kg)\d|^(inputWeight|outputWeight|weight_kg)Other/.test(key)) assert(Number.isInteger(value), key);
assert.equal(reconcileProcessingGrades(whole.state, { wholeKg: true }).changes.length, 0);
const bad = structuredClone(state); delete bad.records.receiving[0].values.gradeOther;
assert.throws(() => reconcileProcessingGrades(bad), /incomplete/);
const exceeded = structuredClone(state); exceeded.records.preprocessing[0].values.outputWeight = 1100;
assert.equal(reconcileProcessingGrades(exceeded).state.records.preprocessing[0].values.outputWeight, 1000);
const paid = structuredClone(state); paid.records.sales[0].values.weight_kg = 1000;
paid.payments.push({ id: 'payment', recordId: 'sale', date: '2026-10-13', direction: 'IN', amount: 9000000, method: 'cash' });
assert.throws(() => reconcileProcessingGrades(paid), /collected payments/);
console.log('PASS: receiving authority, proportional allocation, rounding, mass balance, integer cartons, 2% samples, failed lots, sales inheritance, payment protection and idempotence.');
