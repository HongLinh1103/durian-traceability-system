require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const offsets = { 'Xuất khẩu': -1, 'Kiểm nghiệm & kiểm dịch': -2, 'Vận chuyển & logistics': 3 };
function shift(date, days) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(date));
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}
async function main() {
    const ownerId = 'cmsogs6vi000314g3yuvld36x';
    const facility = await prisma.partnerFacility.findUniqueOrThrow({ where: { ownerId } });
    assert.equal(facility.code, 'VN-DNPH-131');
    const row = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId } });
    const data = structuredClone(row.data);
    const counts = {};
    for (const expense of data.expenses) {
        let date;
        if (Object.hasOwn(offsets, expense.category)) {
            const sales = data.records.sales.filter(sale => sale.lotCode === expense.lotCode);
            assert.equal(sales.length, 1, `Missing or ambiguous sale: ${expense.id}`);
            date = shift(sales[0].values.date, offsets[expense.category]);
            if (expense.notes?.includes('ghi nhận vào ngày xuất bán')) {
                expense.notes = expense.notes.replace('ghi nhận vào ngày xuất bán', 'ngày ghi nhận đã điều chỉnh theo lịch chi phí của lô xuất bán');
            }
        } else if (expense.category === 'Vận hành cơ sở' && /^Tiền (điện|nước) tháng \d{2}$/.test(expense.content)) {
            date = `${expense.date.slice(0, 7)}-20`;
        }
        if (date && date !== expense.date) {
            expense.date = date;
            counts[expense.category] = (counts[expense.category] || 0) + 1;
        }
    }
    if (JSON.stringify(data) === JSON.stringify(row.data)) { console.log('Already aligned; no changes.'); return; }
    data.expenses.sort((a, b) => b.date.localeCompare(a.date));
    assert.deepEqual(data.payments, row.data.payments);
    assert.deepEqual(data.records, row.data.records);
    for (const expense of data.expenses) {
        const original = row.data.expenses.find(item => item.id === expense.id);
        assert.deepEqual({ ...expense, date: original.date, ...(original.notes !== undefined ? { notes: original.notes } : {}) }, original);
    }
    fs.mkdirSync('scratch/backups', { recursive: true });
    fs.writeFileSync(`scratch/backups/kimquy-before-expense-dates-${Date.now()}.json`, JSON.stringify(row, null, 2));
    const result = await prisma.processingGmpWorkspace.updateMany({ where: { ownerId, revision: row.revision }, data: { data, revision: { increment: 1 } } });
    assert.equal(result.count, 1, 'Workspace changed concurrently');
    const saved = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId } });
    assert.deepEqual(saved.data, data);
    console.log(JSON.stringify({ counts, verified: true }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
