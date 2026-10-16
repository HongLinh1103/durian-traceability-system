import { loadEnvConfig } from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Prisma } from '@prisma/client';
import type { GmpState } from '../src/lib/processing-gmp';
import { populateReceivingSamples } from '../src/lib/processing-receiving-samples';
loadEnvConfig(process.cwd(), process.argv.includes('--dev'));
async function main() {
    const { prisma } = await import('../src/lib/prisma');
    try {
        const rows = await prisma.processingGmpWorkspace.findMany();
        const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        const plans = rows.map(row => ({ row, next: populateReceivingSamples(row.data as unknown as GmpState, row.ownerId, date) }));
        console.log(JSON.stringify(plans.map(p => ({ ownerId: p.row.ownerId, samples: p.next.records.receiving.filter(r => r.values.sampleSourceId).length }))));
        if (!process.argv.includes('--apply')) return;
        await mkdir('.storage/backups', { recursive: true });
        const backup = `.storage/backups/receiving-samples-${Date.now()}.json`;
        await writeFile(backup, JSON.stringify(rows, null, 2), { flag: 'wx' });
        await prisma.$transaction(async tx => {
            for (const { row, next } of plans) {
                if (JSON.stringify(row.data) === JSON.stringify(next)) continue;
                const result = await tx.processingGmpWorkspace.updateMany({ where: { ownerId: row.ownerId, revision: row.revision }, data: { data: next as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
                if (result.count !== 1) throw new Error('Concurrent update. All sample writes rolled back.');
            }
        }, { maxWait: 10000, timeout: 30000 });
        for (const { row } of plans) {
            const saved = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId: row.ownerId } });
            const state = saved.data as unknown as GmpState;
            if (JSON.stringify(state) !== JSON.stringify(populateReceivingSamples(state, row.ownerId, date))) throw new Error('Sample idempotence verification failed.');
            if (state.records.receiving.some(r => !/^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(String(r.values.purchaseLotCode)))) throw new Error('Missing purchase lot code.');
        }
        console.log(`Saved and verified. Backup: ${backup}`);
    } finally { await prisma.$disconnect(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
