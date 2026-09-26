require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const day = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const normalized = value => (value || '').normalize('NFC').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');

async function main() {
    const [logs, supplies] = await Promise.all([
        prisma.farmingLog.findMany({ include: { farm: { select: { farmerId: true } }, materialsUsed: true, supplyTransactions: true } }),
        prisma.farmerSupply.findMany({ include: { transactions: { orderBy: [{ actionDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] } } }),
    ]);
    const exports = supplies.flatMap(supply => supply.transactions.filter(t => t.type === 'OUT').map(t => ({ ...t, supply })));
    const candidates = [];
    const unmatched = [];
    const invalidStocks = [];
    for (const t of exports.filter(t => !t.farmingLogId)) {
        const matches = logs.filter(l => l.farm.farmerId === t.farmerId && l.farmId === t.farmId && l.cropSeasonId === t.cropSeasonId && !l.supplyTransactions.length && !l.materialsUsed.length && day(l.actionDate) === day(t.actionDate) && l.activityType === t.activityType && normalized(l.chemicalName) === normalized(t.supply.name));
        // Dosage such as ml/tank or kg/tree is not total inventory quantity: do not infer it.
        const exact = matches.filter(l => {
            const dose = (l.dosage || '').trim().match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/u);
            return dose && Number(dose[1].replace(',', '.')) === t.quantity && normalized(dose[2]) === normalized(t.supply.unit);
        });
        if (exact.length === 1) candidates.push({ transactionId: t.id, logId: exact[0].id, supplyId: t.supplyId });
        else unmatched.push({ transactionId: t.id, supplyId: t.supplyId, farmId: t.farmId, date: t.actionDate, reason: exact.length > 1 ? 'AMBIGUOUS_MATCH' : 'NO_VERIFIED_JOURNAL_MATCH' });
    }
    const uniqueCandidates = candidates.filter(c => candidates.filter(other => other.logId === c.logId).length === 1);
    for (const s of supplies) {
        let balance = 0; const issues = [];
        for (const t of s.transactions) {
            if (t.type === 'IN') balance += t.quantity;
            else if (t.type === 'OUT') balance -= t.quantity;
            else balance = t.quantity;
            if (balance < -0.000001) issues.push({ transactionId: t.id, date: t.actionDate, shortfall: -balance });
        }
        if (issues.length) invalidStocks.push({ supplyId: s.id, issues });
    }
    const folder = path.join(process.cwd(), 'scratch', 'backups'); fs.mkdirSync(folder, { recursive: true });
    const reportPath = path.join(folder, 'farming-log-stock-reconciliation-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
    const report = { summary: { exports: exports.length, verifiedLinks: uniqueCandidates.length, unverifiedExports: unmatched.length, invalidStocks: invalidStocks.length, applied: 0 }, candidates: uniqueCandidates, unmatched, invalidStocks, backup: uniqueCandidates.map(c => ({ transaction: exports.find(t => t.id === c.transactionId), log: logs.find(l => l.id === c.logId) })) };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    if (process.argv.includes('--apply') && uniqueCandidates.length) {
        await prisma.$transaction(async tx => {
            for (const candidate of uniqueCandidates) {
                const original = exports.find(t => t.id === candidate.transactionId);
                const originalLog = logs.find(l => l.id === candidate.logId);
                await tx.$queryRaw`SELECT id FROM "FarmingLog" WHERE id=${candidate.logId} FOR UPDATE`;
                await tx.$queryRaw`SELECT id FROM farmer_supplies WHERE id=${candidate.supplyId} FOR UPDATE`;
                const log = await tx.farmingLog.findUniqueOrThrow({ where: { id: candidate.logId }, include: { supplyTransactions: true, materialsUsed: true } });
                const current = await tx.farmerSupplyTransaction.findUniqueOrThrow({ where: { id: candidate.transactionId } });
                if (log.updatedAt.getTime() !== originalLog.updatedAt.getTime() || log.supplyTransactions.length || log.materialsUsed.length || current.farmingLogId || current.quantity !== original.quantity || current.actionDate.getTime() !== original.actionDate.getTime() || current.supplyId !== original.supplyId) throw new Error('Records changed during reconciliation');
                await tx.farmerSupplyTransaction.update({ where: { id: current.id }, data: { farmingLogId: log.id } });
                await tx.farmingLogMaterial.create({ data: { farmingLogId: log.id, transactionId: current.id, supplyId: current.supplyId, supplyName: original.supply.name, supplyType: original.supply.type, unit: original.supply.unit, quantity: current.quantity, unitPrice: current.unitPrice, totalCost: current.totalAmount } });
                report.summary.applied++;
            }
        }, { timeout: 30000 });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report.summary, reportPath }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
