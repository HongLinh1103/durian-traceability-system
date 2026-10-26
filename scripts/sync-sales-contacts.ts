import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import { contactName, contactPhone } from '../src/lib/sales-contact';
import type { GmpState } from '../src/lib/processing-gmp';

async function main() {
  const localEnv = parseEnv(readFileSync('.env', 'utf8'));
  const productionEnv = parseEnv(readFileSync('.env.production.local', 'utf8'));
  if (!localEnv.DATABASE_URL || !productionEnv.DATABASE_URL) throw Error('Missing database configuration.');
  if (!['localhost', '127.0.0.1'].includes(new URL(localEnv.DATABASE_URL).hostname)) throw Error('Source must be local.');
  if (['localhost', '127.0.0.1'].includes(new URL(productionEnv.DATABASE_URL).hostname)) throw Error('Target must be remote.');
  const local = new PrismaClient({ datasources: { db: { url: localEnv.DATABASE_URL } } });
  const production = new PrismaClient({ datasources: { db: { url: productionEnv.DATABASE_URL } } });
  try {
    const [sources, targets] = await Promise.all([local.processingGmpWorkspace.findMany(), production.processingGmpWorkspace.findMany()]);
    const plan: { target: typeof targets[number]; next: GmpState; contacts: number }[] = [];
    for (const source of sources) {
      const target = targets.find(t => t.ownerId === source.ownerId);
      if (!target) continue;
      const next = structuredClone(target.data) as unknown as GmpState;
      let contacts = 0;
      for (const record of (source.data as unknown as GmpState).records.sales) {
        const destination = next.records.sales.find(r => r.id === record.id);
        if (!destination || destination.lotCode !== record.lotCode) continue;
        const name = contactName.safeParse(record.values.customer), phone = contactPhone.safeParse(record.values.customerInfo);
        if (!name.success || !phone.success) continue;
        if (destination.values.customer === name.data && destination.values.customerInfo === phone.data) continue;
        const accepted = await production.exporterHandover.findFirst({ where: { ownerId: target.ownerId, saleId: destination.id, status: 'ACCEPTED' } });
        if (accepted) throw Error('An accepted handover needs separate reconciliation; no changes applied.');
        destination.values = { ...destination.values, customer: name.data, customerInfo: phone.data };
        contacts++;
      }
      if (contacts) plan.push({ target, next, contacts });
    }
    if (process.argv.includes('--apply') && plan.length) {
      mkdirSync('.storage/sales-contact-sync', { recursive: true });
      writeFileSync(`.storage/sales-contact-sync/production-${Date.now()}.json`, JSON.stringify(plan.map(p => p.target), null, 2), { flag: 'wx' });
      await production.$transaction(async tx => {
        for (const { target, next } of plan) {
          const result = await tx.processingGmpWorkspace.updateMany({ where: { ownerId: target.ownerId, revision: target.revision }, data: { data: next as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
          if (result.count !== 1) throw Error('Concurrent change; transaction rolled back.');
        }
      }, { timeout: 30000 });
    }
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'plan', workspaces: plan.length, contacts: plan.reduce((sum, p) => sum + p.contacts, 0), productionOnlyPreserved: true }));
  } finally { await Promise.all([local.$disconnect(), production.$disconnect()]); }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
