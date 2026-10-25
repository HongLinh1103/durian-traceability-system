const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { PrismaClient } = require('@prisma/client');
require('./register-other-register-aliases.cjs');
const { tidyOtherRegisters } = require('../scratch/other-register-tests/src/lib/other-register-cleanup');

async function run(environment, filename) {
 const url = new URL(parseEnv(fs.readFileSync(filename, 'utf8')).DATABASE_URL);
 if (environment === 'local' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw Error('Local source must be localhost');
 if (environment === 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)) throw Error('Production must be remote');
 url.searchParams.set('connection_limit', '1');
 const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
 try {
  const rows = await db.processingGmpWorkspace.findMany();
  const plan = rows.map(row => ({ before: row, result: tidyOtherRegisters(row.data, row.ownerId) })).filter(p => p.result.changed.length);
  console.log(JSON.stringify({ environment, workspaces: plan.length, records: plan.reduce((n, p) => n + p.result.changed.length, 0), apply: process.argv.includes('--apply') }));
  if (!process.argv.includes('--apply') || !plan.length) return;
  const directory = path.join('.storage', 'other-register-cleanup');
  fs.mkdirSync(directory, { recursive: true });
  const backup = path.join(directory, `${environment}-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify(plan.map(p => p.before)), { flag: 'wx', mode: 0o600 });
  await db.$transaction(async tx => {
   for (const item of plan) {
    const result = await tx.processingGmpWorkspace.updateMany({ where: { ownerId: item.before.ownerId, revision: item.before.revision }, data: { data: item.result.state, revision: { increment: 1 } } });
    if (result.count !== 1) throw Error('Workspace changed concurrently; no records committed');
   }
  }, { timeout: 60000 });
  for (const item of plan) {
   const after = await db.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId: item.before.ownerId } });
   if (JSON.stringify(after.data.records) !== JSON.stringify(item.before.data.records)) throw Error('Unrelated registers changed');
   if (tidyOtherRegisters(after.data, item.before.ownerId).changed.length) throw Error('Cleanup verification failed');
  }
  console.log(JSON.stringify({ environment, verified: true, backup }));
 } finally { await db.$disconnect(); }
}
(async () => {
 await run('local', '.env');
 if (process.argv.includes('--production')) await run('production', '.env.production.local');
})().catch(error => { console.error('Cleanup failed:', error.code || (error.constructor === Error ? error.message : error.name)); process.exitCode = 1; });
