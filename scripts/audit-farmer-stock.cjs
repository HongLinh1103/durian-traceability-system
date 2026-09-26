require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const supplies = await prisma.farmerSupply.findMany({ include: { transactions: { orderBy: [{ actionDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] } } });
    const summary = { supplies: supplies.length, exports: 0, exportsBeforeInput: 0, exportsOverBalance: 0, wrongOwner: 0, cachedBalanceMismatch: 0, invalidHistories: 0, synchronizedBalances: 0 };
    const issues = [];
    const candidates = [];
    for (const supply of supplies) {
        let balance = 0, input = false, invalid = false;
        const problems = [];
        for (const tx of supply.transactions) {
            if (tx.farmerId !== supply.farmerId) { summary.wrongOwner++; invalid = true; problems.push({ transactionId: tx.id, issue: 'WRONG_OWNER' }); }
            if (tx.type === 'IN') { input = true; balance += tx.quantity; }
            else if (tx.type === 'OUT') {
                summary.exports++; balance -= tx.quantity;
                if (!input) { summary.exportsBeforeInput++; problems.push({ transactionId: tx.id, issue: 'EXPORT_BEFORE_INPUT' }); }
                if (balance < -0.000001) { summary.exportsOverBalance++; invalid = true; problems.push({ transactionId: tx.id, issue: 'EXPORT_EXCEEDS_BALANCE' }); }
            } else if (tx.type === 'ADJUSTMENT') { balance = tx.quantity; input = true; }
        }
        balance = Math.round(balance * 1e6) / 1e6;
        if (invalid) summary.invalidHistories++;
        if (Math.abs(balance - supply.quantity) > 0.000001) {
            summary.cachedBalanceMismatch++;
            problems.push({ issue: 'CACHED_BALANCE_MISMATCH', cached: supply.quantity, ledger: balance });
            if (!invalid && balance >= 0) candidates.push({ supply, balance });
        }
        if (problems.length) issues.push({ supplyId: supply.id, problems });
    }
    const folder = path.join(process.cwd(), 'scratch', 'backups'); fs.mkdirSync(folder, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const report = path.join(folder, 'farmer-stock-audit-' + stamp + '.json');
    // Backup before deterministic cache correction. No historical movements are invented or changed.
    fs.writeFileSync(report, JSON.stringify({ summary, issues, balanceBackup: candidates.map(({ supply, balance }) => ({ id: supply.id, quantity: supply.quantity, updatedAt: supply.updatedAt, derivedBalance: balance })) }, null, 2));
    if (process.argv.includes('--apply')) {
        await prisma.$transaction(async tx => {
            for (const { supply, balance } of candidates) {
                await tx.$queryRaw`SELECT id FROM farmer_supplies WHERE id=${supply.id} FOR UPDATE`;
                const current = await tx.farmerSupplyTransaction.findMany({ where: { supplyId: supply.id }, orderBy: [{ actionDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
                if (JSON.stringify(current) !== JSON.stringify(supply.transactions)) throw new Error('Ledger changed during audit: ' + supply.id);
                const result = await tx.farmerSupply.updateMany({ where: { id: supply.id, updatedAt: supply.updatedAt }, data: { quantity: balance } });
                if (result.count !== 1) throw new Error('Supply changed during audit: ' + supply.id);
                summary.synchronizedBalances++;
            }
        }, { timeout: 30000 });
    }
    fs.writeFileSync(report, JSON.stringify({ summary, issues, balanceBackup: candidates.map(({ supply, balance }) => ({ id: supply.id, quantity: supply.quantity, updatedAt: supply.updatedAt, derivedBalance: balance })) }, null, 2));
    console.log(JSON.stringify({ summary, report }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
