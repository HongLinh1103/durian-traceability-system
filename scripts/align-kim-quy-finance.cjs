const fs = require('node:fs');
const assert = require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ownerId = 'cmsogs6vi000314g3yuvld36x';
    const facility = await prisma.partnerFacility.findUniqueOrThrow({ where: { ownerId } });
    assert.equal(facility.code, 'VN-DNPH-131');
    const row = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId } });
    assert.equal(row.data.demo, true, 'Sample expense amounts require a demo workspace');
    const data = structuredClone(row.data);
    let changedDates = 0;
    for (const payment of data.payments) {
        if (payment.direction !== 'OUT') continue;
        const purchase = data.records.purchases.find(record => record.id === payment.recordId);
        assert(purchase, 'Missing purchase for outgoing payment');
        const date = String(purchase.values.date);
        assert(/^\d{4}-\d{2}-\d{2}$/.test(date));
        if (payment.date !== date) { payment.date = date; changedDates++; }
    }
    const templates = [
        { category: 'Kiểm nghiệm & kiểm dịch', amount: 3500000, label: 'Phí kiểm nghiệm', key: 'testing' },
        { category: 'Xuất khẩu', amount: 2500000, label: 'Phí làm thủ tục xuất khẩu', key: 'export' },
        { category: 'Vận chuyển & logistics', amount: 12000000, label: 'Phí vận chuyển và logistics', key: 'logistics' },
    ];
    const sales = data.records.sales.filter(sale => !sale.draft);
    const added = [];
    const expenses = data.expenses || (data.expenses = []);
    for (const sale of sales) {
        assert(sale.lotCode && /^\d{4}-\d{2}-\d{2}$/.test(sale.values.date));
        for (const template of templates) {
            if (expenses.some(expense => expense.lotCode === sale.lotCode && expense.category === template.category)) continue;
            const expense = {
                id: `demo-export-cost-${sale.id}-${template.key}`,
                code: `CP-${sale.lotCode}-${template.key.toUpperCase()}`,
                date: sale.values.date,
                category: template.category,
                content: `${template.label} lô ${sale.lotCode}`,
                lotCode: sale.lotCode,
                amount: template.amount,
                method: 'Chuyển khoản',
                notes: 'Dữ liệu minh họa: dùng mức phí mẫu hiện có, ghi nhận vào ngày xuất bán; không phải chi phí từ hóa đơn thực tế.',
            };
            expenses.push(expense);
            added.push(expense);
        }
    }
    if (!changedDates && !added.length) { console.log('Already aligned; no changes.'); return; }
    data.payments.sort((a, b) => b.date.localeCompare(a.date));
    expenses.sort((a, b) => b.date.localeCompare(a.date));
    fs.mkdirSync('scratch/backups', { recursive: true });
    fs.writeFileSync(`scratch/backups/kimquy-before-finance-alignment-${Date.now()}.json`, JSON.stringify(row, null, 2));
    const result = await prisma.processingGmpWorkspace.updateMany({
        where: { ownerId, revision: row.revision },
        data: { data, revision: { increment: 1 } },
    });
    assert.equal(result.count, 1, 'Workspace changed concurrently');
    const saved = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId } });
    assert.deepEqual(saved.data, data);
    assert.deepEqual(data.records, row.data.records);
    for (const original of row.data.payments) {
        const payment = data.payments.find(item => item.id === original.id);
        assert.deepEqual({ ...payment, date: original.date }, original);
    }
    for (const sale of sales) for (const template of templates) {
        assert(expenses.some(expense => expense.lotCode === sale.lotCode && expense.category === template.category));
    }
    console.log(JSON.stringify({ changedDates, addedExpenses: added.length, addedAmount: added.reduce((sum, expense) => sum + expense.amount, 0), exportLots: sales.length, verified: true }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
