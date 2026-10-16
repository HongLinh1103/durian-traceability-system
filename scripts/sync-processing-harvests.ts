import { loadEnvConfig } from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import type { GmpState } from '../src/lib/processing-gmp';

loadEnvConfig(process.cwd());
async function main() {
    // Load Next's selected environment before Prisma can load its default .env.
    const { prisma } = await import('../src/lib/prisma');
    const { syncProcessingHarvests } = await import('../src/lib/processing-harvest-sync');
    try {
    const facilities = await prisma.partnerFacility.findMany({ where: { type: 'PROCESSING_FACILITY', status: 'APPROVED', deletedAt: null }, select: { ownerId: true, code: true } });
    const rows = await prisma.processingGmpWorkspace.findMany({ where: { ownerId: { in: facilities.map(f => f.ownerId) } } });
    const eligibleCounts = await Promise.all(facilities.map(async f => ({ code: f.code, count: await prisma.harvestRecord.count({ where: { buyerFacility: { ownerId: f.ownerId }, buyerType: 'PROCESSING_FACILITY', weightUnit: 'kg', status: { notIn: ['DRAFT', 'CANCELLED', 'REJECTED'] } } }) })));
    console.log(JSON.stringify({ eligibleHarvests: eligibleCounts, apply: process.argv.includes('--apply') }));
    if (!process.argv.includes('--apply')) return;
    await mkdir('.storage/backups', { recursive: true });
    const backup = `.storage/backups/harvest-receiving-sync-${Date.now()}.json`;
    await writeFile(backup, JSON.stringify(rows, null, 2), { flag: 'wx' });
    for (const facility of facilities) {
        const result = await syncProcessingHarvests(facility.ownerId);
        const state = result.data as unknown as GmpState;
        const verified = await syncProcessingHarvests(facility.ownerId);
        if (verified.revision !== result.revision) throw new Error(`Non-idempotent sync: ${facility.code}`);
        console.log(JSON.stringify({ code: facility.code, revision: result.revision, linkedReceiving: state.records.receiving.filter(r => r.values.harvestRecordId).length, pending: state.records.receiving.filter(r => r.values.harvestRecordId && r.draft).length, conflicts: state.records.receiving.filter(r => r.values.sourceConflict === '1').length, verified: true }));
    }
    console.log(`Backup: ${backup}`);
    } finally { await prisma.$disconnect(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
