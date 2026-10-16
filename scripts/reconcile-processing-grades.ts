import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { GmpState } from '../src/lib/processing-gmp';
import { reconcileProcessingGrades } from '../src/lib/processing-grade-reconciliation';

loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
    const ownerId = process.argv.find(a => a.startsWith('--owner='))?.slice(8);
    const rows = await db.processingGmpWorkspace.findMany({ where: ownerId ? { ownerId } : {} });
    if (!rows.length) throw new Error('No processing workspaces found.');
    const wholeKg = process.argv.includes('--whole-kg');
    const plans = rows.map(row => ({ row, ...reconcileProcessingGrades(row.data as unknown as GmpState, { wholeKg }) }));
    const stamp = Date.now();
    await mkdir('.storage/backups', { recursive: true });
    const report = `.storage/backups/processing-grades-${stamp}-plan.json`;
    await writeFile(report, JSON.stringify(plans.map(({ row, changes }) => ({ ownerId: row.ownerId, revision: row.revision, changes })), null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ report, workspaces: plans.map(p => ({ ownerId: p.row.ownerId, changedRecords: p.changes.length })) }));
    if (!process.argv.includes('--apply')) return;
    const changed = plans.filter(p => p.changes.length);
    if (!changed.length) { console.log('Already balanced; no writes.'); return; }
    const backup = `.storage/backups/processing-grades-${stamp}-before.json`;
    await writeFile(backup, JSON.stringify(changed.map(p => p.row), null, 2), { flag: 'wx' });
    await db.$transaction(async tx => {
        for (const { row, state } of changed) {
            const result = await tx.processingGmpWorkspace.updateMany({ where: { ownerId: row.ownerId, revision: row.revision }, data: { data: state as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
            if (result.count !== 1) throw new Error('Concurrent update detected; rolled back all workspaces.');
        }
    }, { timeout: 60000 });
    const canonical = (v: unknown) => JSON.stringify(v, (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
    for (const { row, state } of changed) {
        const saved = await db.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId: row.ownerId } });
        if (canonical(saved.data) !== canonical(state)) throw new Error(`Post-write verification failed: ${row.ownerId}. Backup: ${backup}`);
    }
    console.log(`Verified ${changed.length} updated workspaces. Backup: ${backup}`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
