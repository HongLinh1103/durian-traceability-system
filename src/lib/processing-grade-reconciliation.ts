import { GmpState, GMP_GRADES, GmpRecord, Stage, Values, gradeTotal, hasGradeBreakdown, isFailed } from './processing-gmp';

const keys = GMP_GRADES.map(g => g.key);
const number = (value: unknown) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new Error('Invalid negative or non-finite quantity.');
    return n;
};
const split = (v: Values, prefix: string) => keys.map(key => number(v[prefix + key]));
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const put = (v: Values, prefix: string, values: number[]) => keys.forEach((key, i) => { v[prefix + key] = values[i]; });

// Largest remainder rounding preserves the total and each grade's capacity.
function distribute(target: number, capacities: number[], precision: number): number[] {
    const caps = capacities.map(n => Math.round(n * precision));
    const total = sum(caps);
    const units = Math.min(Math.round(number(target) * precision), total);
    if (!total) return caps.map(() => 0);
    const raw = caps.map(cap => units * cap / total);
    const result = raw.map(Math.floor);
    let remaining = units - sum(result);
    const order = raw.map((n, i) => i).sort((a, b) => (raw[b] - result[b]) - (raw[a] - result[a]) || a - b);
    for (const i of order) if (remaining && result[i] < caps[i]) { result[i]++; remaining--; }
    if (remaining) throw new Error('Cannot balance grade allocation.');
    return result.map(n => n / precision);
}

export function reconcileProcessingGrades(original: GmpState, options: { wholeKg?: boolean } = {}) {
    const state = structuredClone(original);
    const changes: { stage: Stage; id: string; lotCode: string; before: Values; after: Values }[] = [];
    const source = (stage: Stage, r: GmpRecord) => {
        const found = state.records[stage].find(item => item.id === r.sourceId);
        if (!found || found.draft) throw new Error(`${r.lotCode}: missing completed ${stage} source (${r.sourceId}).`);
        return found;
    };
    const total = (v: Values, key: string, fallback: number) => v[key] === undefined || v[key] === '' ? fallback : number(v[key]);
    const output = (v: Values, prefix: string, capacity: number[], target: number) => {
        const existing = hasGradeBreakdown(v, prefix) ? split(v, prefix) : null;
        if (options.wholeKg && (!Number.isInteger(target) || capacity.some(n => !Number.isInteger(n))))
            throw new Error('Whole-kg allocation requires integer source weights and totals.');
        const valid = existing && existing.every((n, i) => n <= capacity[i] && (!options.wholeKg || Number.isInteger(n))) && Math.abs(sum(existing) - target) < 0.005;
        const values = valid ? existing : distribute(target, capacity, options.wholeKg ? 1 : 100);
        put(v, prefix, values);
        v[prefix] = Math.round(sum(values) * 100) / 100;
        return values;
    };

    // Receiving is the authority: never infer or modify its grade measurements.
    for (const r of state.records.receiving.filter(r => !r.draft)) {
        const initialWeight = r.values.harvestRecordId
            ? number(r.values.initialWeight) + Number(r.values.weightAdjustment || 0)
            : number(source('purchases', r).values.weight);
        const otherProcessing = number(r.values.otherProcessing || 0);
        // Old registers had only three grades. Recover zero Other only when
        // those three measurements and rejected weight already balance exactly.
        if ((r.values.gradeOther === undefined || r.values.gradeOther === '') &&
            ['1', '2', '3'].every(key => r.values['grade' + key] !== undefined && r.values['grade' + key] !== '') &&
            Math.abs(gradeTotal(r.values, 'grade') + otherProcessing + number(r.values.rejected || 0) - initialWeight) < 0.005) {
            const before = structuredClone(r.values);
            r.values.gradeOther = 0;
            changes.push({ stage: 'receiving', id: r.id, lotCode: r.lotCode, before, after: structuredClone(r.values) });
        }
        if (!hasGradeBreakdown(r.values, 'grade')) throw new Error(`${r.lotCode}: receiving grade measurements are incomplete.`);
        if (Math.abs(gradeTotal(r.values, 'grade') + otherProcessing + number(r.values.rejected || 0) - initialWeight) > 0.01)
            throw new Error(`${r.lotCode}: receiving grades plus rejected weight do not match purchase weight.`);
    }
    for (const stage of ['preprocessing', 'packaging', 'inspection', 'sales', 'aftersales'] as const) {
        for (const r of state.records[stage]) {
            if (r.draft) continue;
            const before = structuredClone(r.values);
            const v = r.values;
            if (stage === 'preprocessing') {
                const input = split(source('receiving', r).values, 'grade');
                put(v, 'inputWeight', input); v.inputWeight = Math.round(sum(input) * 100) / 100;
                output(v, 'outputWeight', input, total(v, 'outputWeight', Number(v.inputWeight)));
            } else if (stage === 'packaging') {
                const input = split(source('preprocessing', r).values, 'outputWeight');
                put(v, 'inputWeight', input); v.inputWeight = Math.round(sum(input) * 100) / 100;
                const weight = output(v, 'weight_kg', input, total(v, 'weight_kg', Number(v.inputWeight)));
                const boxes = total(v, 'quantity_boxes', 0);
                if (!Number.isInteger(boxes) || !boxes || !sum(weight)) throw new Error(`${r.lotCode}: a positive integer carton total is required; no carton size is assumed.`);
                const existing = hasGradeBreakdown(v, 'quantity_boxes') ? split(v, 'quantity_boxes') : null;
                let allocated = existing && sum(existing) === boxes && existing.every((n, i) => Number.isInteger(n) && (n > 0) === (weight[i] > 0)) ? existing : null;
                if (!allocated) {
                    // Allocate by the historical average kg/carton, keeping at least one carton per non-empty grade.
                    const active = weight.map(n => n > 0 ? 1 : 0);
                    if (boxes < sum(active)) throw new Error(`${r.lotCode}: carton total is too small for the non-empty grades.`);
                    const extra = distribute(boxes - sum(active), weight.map(n => n * boxes), 1);
                    allocated = extra.map((n, i) => n + active[i]);
                }
                put(v, 'quantity_boxes', allocated); v.quantity_boxes = sum(allocated);
            } else if (stage === 'inspection') {
                const pack = source('packaging', r).values;
                const weights = split(pack, 'weight_kg'), boxes = split(pack, 'quantity_boxes');
                put(v, 'inputWeight', weights); put(v, 'inputBoxes', boxes);
                put(v, 'sample', boxes.map(n => Math.ceil(n * 0.02)));
                v.inputWeight = pack.weight_kg; v.inputBoxes = pack.quantity_boxes;
                const failed = isFailed(stage, v);
                const outBoxes = distribute(failed ? 0 : total(v, 'quantity_boxes', sum(boxes)), boxes, 1);
                const allowedWeights = weights.map((n, i) => outBoxes[i] ? n : 0);
                const outWeights = output(v, 'weight_kg', allowedWeights, failed ? 0 : total(v, 'weight_kg', sum(weights)));
                if (outBoxes.some((n, i) => (n > 0) !== (outWeights[i] > 0))) throw new Error(`${r.lotCode}: carton and weight allocations are inconsistent.`);
                put(v, 'quantity_boxes', outBoxes); v.quantity_boxes = sum(outBoxes);
                if (!failed && (!sum(outBoxes) || !sum(outWeights))) throw new Error(`${r.lotCode}: passed inspection has no saleable output.`);
            } else {
                const previous = source(stage === 'sales' ? 'inspection' : 'sales', r);
                if (stage === 'sales' && isFailed('inspection', previous.values)) throw new Error(`${r.lotCode}: sale refers to failed inspection.`);
                for (const prefix of ['quantity_boxes', 'weight_kg']) {
                    put(v, prefix, split(previous.values, prefix)); v[prefix] = previous.values[prefix];
                }
                if (stage === 'sales' && Number(before.weight_kg) !== Number(v.weight_kg)) {
                    if (v.price === undefined || v.price === '') throw new Error(`${r.lotCode}: price required to adjust sale value.`);
                    v.total = Math.round(number(v.weight_kg) * number(v.price));
                    const paid = sum(state.payments.filter(p => p.recordId === r.id && p.direction === 'IN').map(p => p.amount));
                    if (paid > Number(v.total)) throw new Error(`${r.lotCode}: adjusted sale value is below collected payments.`);
                }
            }
            if (JSON.stringify(before) !== JSON.stringify(v)) changes.push({ stage, id: r.id, lotCode: r.lotCode, before, after: structuredClone(v) });
        }
    }
    return { state, changes };
}
