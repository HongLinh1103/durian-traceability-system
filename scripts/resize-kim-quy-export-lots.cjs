const fs = require('node:fs');
const assert = require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ownerId = 'cmsogs6vi000314g3yuvld36x';
    const row = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId } });
    assert.equal(row.data.demo, true);
    const data = structuredClone(row.data);
    const fields = ['weight', 'weight_kg', 'grade1', 'grade2', 'grade3', 'rejected', 'inputWeight', 'outputWeight', 'quantity_boxes', 'inputBoxes', 'fruitCount'];
    const changes = [];
    const modified = new Set();
    for (const sale of data.records.sales) {
        const factor = Math.ceil(10000 / Number(sale.values.weight_kg));
        assert(Number.isFinite(factor) && factor > 0);
        if (factor <= 1) continue;
        const receiving = data.records.receiving.filter(r => r.lotCode === sale.lotCode);
        assert.equal(receiving.length, 1);
        const purchase = data.records.purchases.find(r => r.id === receiving[0].sourceId);
        assert(purchase);
        const chain = Object.entries(data.records).flatMap(([stage, records]) => records.filter(r => r.lotCode === sale.lotCode || r.id === purchase.id).map(record => ({ stage, record })));
        for (const { stage, record } of chain) {
            assert(!modified.has(record.id), 'Shared source needs separate allocation');
            modified.add(record.id);
            const values = record.values;
            for (const field of fields) if (values[field] !== undefined) {
                assert(Number.isFinite(Number(values[field])));
                values[field] = Number(values[field]) * factor;
            }
            if (stage === 'purchases' || stage === 'sales') {
                values.total = Math.round(Number(values[stage === 'purchases' ? 'weight' : 'weight_kg']) * Number(values.price));
            }
            if (stage === 'inspection') {
                const sample = Math.ceil(Number(values.inputBoxes) * 0.02);
                const previousTotal = Number(values.sample1 || 0) + Number(values.sample2 || 0) + Number(values.sample3 || 0);
                values.sample2 = previousTotal ? Math.floor(sample * Number(values.sample2 || 0) / previousTotal) : 0;
                values.sample3 = previousTotal ? Math.floor(sample * Number(values.sample3 || 0) / previousTotal) : 0;
                values.sample1 = sample - values.sample2 - values.sample3;
            }
            const note = `Dữ liệu minh họa điều chỉnh khối lượng gấp ${factor} lần để lô xuất khẩu đạt tối thiểu 10 tấn; không phải số cân thực tế.`;
            values.notes = [values.notes, note].filter(Boolean).join('\n');
        }
        const received = receiving[0].values;
        assert.equal(received.grade1 + received.grade2 + received.grade3 + received.rejected, purchase.values.weight);
        const preprocess = data.records.preprocessing.find(r => r.lotCode === sale.lotCode);
        const pack = data.records.packaging.find(r => r.lotCode === sale.lotCode);
        const inspection = data.records.inspection.find(r => r.id === sale.sourceId);
        assert.equal(preprocess.values.inputWeight, received.grade1 + received.grade2 + received.grade3);
        assert(preprocess.values.outputWeight <= preprocess.values.inputWeight);
        assert.equal(pack.values.inputWeight, preprocess.values.outputWeight);
        assert(pack.values.weight_kg <= pack.values.inputWeight);
        assert.equal(inspection.values.inputWeight, pack.values.weight_kg);
        assert.equal(inspection.values.weight_kg, sale.values.weight_kg);
        assert(sale.values.weight_kg >= 10000);
        changes.push({ lot: sale.lotCode, factor, purchaseKg: purchase.values.weight, exportKg: sale.values.weight_kg, purchaseTotal: purchase.values.total, salesTotal: sale.values.total });
    }
    if (!changes.length) { console.log('All export lots already meet 10 tonnes.'); return; }
    assert.deepEqual(data.payments, row.data.payments);
    assert.deepEqual(data.expenses, row.data.expenses);
    fs.mkdirSync('scratch/backups', { recursive: true });
    fs.writeFileSync(`scratch/backups/kimquy-before-resize-${Date.now()}.json`, JSON.stringify(row, null, 2));
    const result = await prisma.processingGmpWorkspace.updateMany({ where: { ownerId, revision: row.revision }, data: { data, revision: { increment: 1 } } });
    assert.equal(result.count, 1, 'Workspace changed concurrently');
    const saved = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId } });
    assert.deepEqual(saved.data, data);
    console.log(JSON.stringify({ changes, recordsUpdated: modified.size, verified: true }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
