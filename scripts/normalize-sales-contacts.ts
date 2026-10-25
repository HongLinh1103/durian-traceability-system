/** Plan by default. Run with tsx, --target local|production, and --apply to persist. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import { normalizeLegacySalesContacts } from '../src/lib/sales-contact';
import type { GmpState } from '../src/lib/processing-gmp';

async function main() {
  const target = process.argv[process.argv.indexOf('--target') + 1];
  if (!['local', 'production'].includes(target)) throw Error('Use --target local|production.');
  const env = parseEnv(readFileSync(target === 'local' ? '.env' : '.env.production.local', 'utf8'));
  if (!env.DATABASE_URL) throw Error('Missing database configuration.');
  const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  try {
    const rows = await db.processingGmpWorkspace.findMany();
    const planned = rows.flatMap(row => {
      const state = row.data as unknown as GmpState;
      const next = normalizeLegacySalesContacts(state);
      return next === state ? [] : [{ row, next, contacts: next.records.sales.filter((r, i) => r !== state.records.sales[i]).length }];
    });
    const apply = process.argv.includes('--apply');
    if (apply && planned.length) {
      const directory = '.storage/sales-contact-backups';
      mkdirSync(directory, { recursive: true });
      writeFileSync(`${directory}/${target}-${Date.now()}.json`, JSON.stringify(planned.map(p => p.row), null, 2), { flag: 'wx' });
      await db.$transaction(async tx => {
        for (const { row, next } of planned) {
          const updated = await tx.processingGmpWorkspace.updateMany({ where: { ownerId: row.ownerId, revision: row.revision }, data: { data: next as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
          if (updated.count !== 1) throw Error('Workspace changed; re-run the plan. No changes committed.');
        }
      }, { timeout: 30000 });
    }
    console.log(JSON.stringify({ target, mode: apply ? 'apply' : 'plan', workspaces: planned.length, contacts: planned.reduce((sum, p) => sum + p.contacts, 0), legacyValuesPreserved: true }));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error('Sales contact normalization failed:', error.code || error.message); process.exitCode = 1; });
