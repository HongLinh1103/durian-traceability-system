require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const orderBy = [{ actionDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }];
const round = n => Math.round(n * 1e6) / 1e6;

function ledger(rows) {
    let balance = 0, minimum = 0;
    for (const t of rows) {
        balance = round(t.type === 'IN' ? balance + t.quantity : t.type === 'OUT' ? balance - t.quantity : t.quantity);
        minimum = Math.min(minimum, balance);
    }
    return { balance, minimum };
}

async function main() {
    const supplies = await prisma.farmerSupply.findMany({ include: { transactions: { orderBy } }, orderBy: { id: 'asc' } });
    const plan = [];
    for (const supply of supplies) {
        const result = ledger(supply.transactions);
        if (result.minimum >= -0.000001) continue;
        assert(!supply.transactions.some(t => t.type === 'ADJUSTMENT'), 'Manual adjustment needs separate reconciliation: ' + supply.id);
        assert(supply.transactions.every(t => t.farmerId === supply.farmerId), 'Ownership mismatch: ' + supply.id);
        const reference = supply.transactions.find(t => t.type === 'OUT');
        const quantity = round(-result.minimum);
        plan.push({
            supply,
            input: {
                id: 'sample-stock-reconciliation-' + supply.id,
                supplyId: supply.id, farmerId: supply.farmerId, type: 'IN',
                quantity, unitPrice: reference.unitPrice,
                totalAmount: Math.round(quantity * Number(reference.unitPrice) * 100) / 100,
                // The date is explicitly a sample reconciliation date, not a real invoice date.
                actionDate: new Date(supply.transactions[0].actionDate.getTime() - 86400000),
                purpose: 'Nhập bổ sung đối soát dữ liệu mẫu',
                notes: '[SAMPLE_STOCK_RECONCILIATION] Phiếu nhập mẫu bổ sung theo yêu cầu đối soát; không phải chứng từ mua hàng thực tế. Ngày mẫu đặt trước lịch sử kho một ngày. Đơn giá tham chiếu phiếu xuất ' + reference.id + '.',
            },
            expectedBalance: round(result.balance + quantity),
        });
    }
    const summary = { supplies: plan.length, receipts: plan.length, sampleValue: plan.reduce((n, p) => n + p.input.totalAmount, 0) };
    if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ mode: 'preview', ...summary }, null, 2)); return; }
    if (!plan.length) { console.log('No missing inputs; nothing changed.'); return; }
    const folder = path.join(process.cwd(), 'scratch', 'backups');
    fs.mkdirSync(folder, { recursive: true });
    const backupPath = path.join(folder, 'stock-input-reconciliation-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
    fs.writeFileSync(backupPath, JSON.stringify({ status: 'before-apply', summary, plan }, null, 2));
    await prisma.$transaction(async tx => {
        for (const item of plan) {
            await tx.$queryRaw`SELECT id FROM farmer_supplies WHERE id=${item.supply.id} FOR UPDATE`;
            const current = await tx.farmerSupply.findUniqueOrThrow({ where: { id: item.supply.id }, include: { transactions: { orderBy } } });
            assert.equal(JSON.stringify(current), JSON.stringify(item.supply), 'Data changed since backup: ' + item.supply.id);
            await tx.farmerSupplyTransaction.create({ data: item.input });
            const movements = await tx.farmerSupplyTransaction.findMany({ where: { supplyId: item.supply.id }, orderBy });
            const result = ledger(movements);
            assert(result.minimum >= 0, 'Negative stock remains');
            assert.equal(result.balance, item.expectedBalance);
            assert.equal(JSON.stringify(movements.filter(t => t.id !== item.input.id)), JSON.stringify(item.supply.transactions), 'Existing movement changed');
            await tx.farmerSupply.update({ where: { id: item.supply.id }, data: { quantity: result.balance } });
        }
    }, { timeout: 30000 });
    fs.writeFileSync(backupPath, JSON.stringify({ status: 'applied', summary, plan }, null, 2));
    console.log(JSON.stringify({ mode: 'applied', ...summary, backupPath }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
