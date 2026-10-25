const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(), true);
const local = fs.readFileSync('.env', 'utf8').match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)?.[1];
assert(local && ['localhost', '127.0.0.1'].includes(new URL(local).hostname), 'This script only adopts records in the configured local database');
process.env.DATABASE_URL = local;
require('./register-other-register-aliases.cjs');
const { adoptOtherRegisterPreview } = require('../scratch/other-register-tests/src/lib/other-register-import');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
 try {
  const ownerId = process.argv.find(a => a.startsWith('--owner='))?.slice(8);
  assert(ownerId && /^[A-Za-z0-9_-]+$/.test(ownerId), 'Pass --owner=<processing account ID>');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
  assert(user.role === 'PROCESSING_FACILITY' && user.isApproved && !user.deletedAt && !user.isLocked, 'An active processing account is required');
  const before = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId } });
  const result = adoptOtherRegisterPreview(before.data, ownerId, randomUUID);
  const counts = result.imported.reduce((summary, r) => { summary[r.book] = (summary[r.book] || 0) + 1; return summary; }, {});
  if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ mode: 'plan', account: user.fullName, count: result.imported.length, books: counts })); return; }
  if (!result.imported.length) { console.log('No new records: initial data was already adopted.'); return; }
  const backupDir = path.join(process.cwd(), '.storage', 'processing-backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${ownerId}-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(before), { flag: 'wx', encoding: 'utf8' });
  await prisma.$transaction(async tx => {
   const saved = await tx.processingGmpWorkspace.updateMany({ where: { ownerId, revision: before.revision }, data: { data: result.state, revision: { increment: 1 } } });
   assert.equal(saved.count, 1, 'Workspace changed. Re-run the adoption to preserve concurrent edits.');
  });
  const after = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId } });
  assert.deepEqual(after.data.records, before.data.records, 'Fresh registers and receiving data must remain unchanged');
  assert.deepEqual(after.data.payments, before.data.payments, 'Payments must remain unchanged');
  console.log(JSON.stringify({ mode: 'applied', account: user.fullName, count: result.imported.length, books: counts, revision: after.revision, backupPath }));
 } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
