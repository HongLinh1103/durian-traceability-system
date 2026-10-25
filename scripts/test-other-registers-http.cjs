const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(), true);
const local = readFileSync('.env', 'utf8').match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)?.[1];
assert(local && ['localhost', '127.0.0.1'].includes(new URL(local).hostname), 'Local DB only');
process.env.DATABASE_URL = local;
const { PrismaClient } = require('@prisma/client');
const { encode } = require('next-auth/jwt');
const prisma = new PrismaClient();
const { OTHER_REGISTER_KEYS, OTHER_REGISTERS } = require('../scratch/other-register-tests/src/lib/other-registers');
const { otherMaterialSources } = require('../scratch/other-register-tests/src/lib/other-register-data');
const { adoptOtherRegisterPreview } = require('../scratch/other-register-tests/src/lib/other-register-import');
const base = process.env.OTHER_REGISTERS_TEST_URL || 'http://localhost:3013';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
let fixtureId;

async function main() {
 try {
  // Existing accounts and data are read only; no production/test business records are created.
  const candidates = await prisma.user.findMany({ where: { role: 'PROCESSING_FACILITY', isApproved: true, isLocked: false, deletedAt: null } });
  let user, before, sources;
  for (const candidate of candidates) {
   const workspace = await prisma.processingGmpWorkspace.findUnique({ where: { ownerId: candidate.id } });
   const material = workspace ? otherMaterialSources(workspace.data) : [];
   if (material.length) { user = candidate; before = workspace; sources = material; break; }
  }
  assert(user && before && sources.length, 'Requires an existing local processing account with receiving CB codes');
  const cookie = 'next-auth.session-token=' + await encode({ secret: process.env.NEXTAUTH_SECRET, token: { sub: user.id, role: user.role, isApproved: true }, maxAge: 600 });
  const headers = { Cookie: cookie };
  const index = await fetch(base + '/dashboard/processing/other', { headers, redirect: 'manual' });
  const indexHtml = await index.text();
  assert([302, 307].includes(index.status) || (index.status === 200 && (indexHtml.includes('NEXT_REDIRECT') || indexHtml.includes('http-equiv="refresh"'))), 'Next may stream a server redirect: status ' + index.status);
  assert((index.headers.get('location') || indexHtml).includes('/dashboard/processing/other/preprocessing'));
  for (const key of OTHER_REGISTER_KEYS) {
   const response = await fetch(base + '/dashboard/processing/other/' + key, { headers });
   assert.equal(response.status, 200);
   const html = await response.text();
   const headings = [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)];
   assert.equal(headings.length, 1, key + ': exactly one H1');
   assert.equal(headings[0][1].replace(/<!--.*?-->/g, ''), OTHER_REGISTERS[key].title.replace(/&/g, '&amp;'));
   for (const tab of OTHER_REGISTER_KEYS) assert(html.includes('href="/dashboard/processing/other/' + tab + '"'));
   assert(html.includes('aria-current="page"'));
   assert(html.includes('Xuất file') && html.includes('Thêm bản ghi'));
   assert(!html.includes('DỮ LIỆU MẪU'), key + ': reads persisted records, without a preview mode');
   for (const source of sources) assert(html.includes(source.code), key + ': shows existing receiving material code');
   assert(!html.includes('Chưa có bản ghi phù hợp'), key + ': table contains persisted rows on first render');
   const addButton = html.match(/<button\b[^>]*>[^<]*(?:<svg[\s\S]*?<\/svg>)?Thêm bản ghi<\/button>/);
   assert(addButton, key + ': add-record button rendered');
   assert(!/\sdisabled(?:=|\s|>)/.test(addButton[0]), key + ': add-record button enabled');
   if (key === 'preprocessing') assert(!html.includes('Mã số lô hàng'), 'Column renamed to Mã lô NL');
   console.log('PASS route: ' + key);
  }
  for (const key of ['preprocessing', 'packaging', 'inspection', 'sales', 'aftersales']) {
   const response = await fetch(base + '/dashboard/processing/fresh/' + key, { headers });
   assert.equal(response.status, 200, 'Existing fresh route: ' + key);
  }
  const api = await fetch(base + '/api/processing/other-registers', { headers });
  assert.equal(api.status, 200); assert((await api.json()).state);
  const after = await prisma.processingGmpWorkspace.findUnique({ where: { ownerId: user.id } });
  assert.deepEqual(after, before, 'New registers API must not write workspace data');
  assert.equal((await fetch(base + '/api/processing/other-registers')).status, 403);
  const wrongRole = 'next-auth.session-token=' + await encode({ secret: process.env.NEXTAUTH_SECRET, token: { sub: 'unassigned-test-reader', role: 'EXPORTER', isApproved: true }, maxAge: 600 });
  assert.equal((await fetch(base + '/api/processing/other-registers', { headers: { Cookie: wrongRole } })).status, 403);
  // Isolated local fixture exercises actual POST/readback and concurrent inventory writes.
  const id = 'register-http-' + randomUUID();
  await prisma.user.create({ data: { id, phone: id, password: 'test-no-login', role: 'PROCESSING_FACILITY', isApproved: true, accountStatus: 'APPROVED', fullName: 'TEST Other Registers temporary' } });
  fixtureId = id;
  const materialCode = 'CB-' + id;
  const state = { demo: false, payments: [], records: { purchases: [], receiving: [{ id: 'receipt', sourceId: 'test-harvest', lotCode: 'TEST-RECEIVING', season: '2026', values: { date: '2026-10-20', classificationComplete: '1', sourceEligible: '1', cbLotCodes: materialCode, otherProcessing: 100, otherGrade1: 40, otherGrade2: 30, otherGrade3: 20, otherGradeOther: 10, variety: 'Test', harvestRecordId: 'test-harvest' } }], preprocessing: [], packaging: [], inspection: [], sales: [], aftersales: [] } };
  const initial = adoptOtherRegisterPreview(state, id, randomUUID).state;
  await prisma.processingGmpWorkspace.create({ data: { ownerId: id, data: state } });
  const fixtureCookie = 'next-auth.session-token=' + await encode({ secret: process.env.NEXTAUTH_SECRET, token: { sub: id, role: 'PROCESSING_FACILITY', isApproved: true }, maxAge: 600 });
  const fixtureHeaders = { Cookie: fixtureCookie, 'Content-Type': 'application/json' };
  let revision = 0;
  const post = body => fetch(base + '/api/processing/other-registers', { method: 'POST', headers: fixtureHeaders, body: JSON.stringify(body) });
  for (const book of OTHER_REGISTER_KEYS) {
   const row = book === 'preprocessing' ? initial.otherProcessing.find(r => r.book === book) : initial.otherMonitoring.find(r => r.book === book);
   const response = await post({ revision, record: { book, materialCode, confirmed: true, values: { ...row.values, correction: 'HTTP save verification' } } });
   const saved = await response.json();
   assert.equal(response.status, 200, JSON.stringify(saved));
   revision = saved.revision;
   const fresh = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId: id } });
   const written = book === 'preprocessing' ? fresh.data.otherProcessing.find(r => r.book === book) : fresh.data.otherMonitoring.find(r => r.book === book);
   assert.equal(written.values.correction, 'HTTP save verification');
   assert.equal(written.history.at(-1).actor, id);
  }
  const created = await prisma.processingGmpWorkspace.findUniqueOrThrow({ where: { ownerId: id } });
  const freezing = created.data.otherMonitoring.find(r => r.book === 'quick-freezing');
  const edit = await post({ revision, record: { book: freezing.book, id: freezing.id, materialCode, confirmed: true, values: { ...freezing.values, temperature1: -25 } } });
  assert.equal(edit.status, 200);
  const edited = await edit.json();
  revision = edited.revision;
  const changedFreezing = edited.state.otherMonitoring.find(r => r.id === freezing.id);
  assert.equal(changedFreezing.values.temperature1, -25); assert.equal(changedFreezing.history.length, 2);
  const sale = initial.otherMonitoring.find(r => r.book === 'sales-monitoring');
  const record = { book: 'sales-monitoring', materialCode, confirmed: true, values: { ...sale.values, quantity: 6, weight: 30 } };
  assert.equal((await post({ revision: 0, record })).status, 409);
  assert.equal((await post({ revision, record: { ...record, materialCode: 'CB-ANOTHER-ACCOUNT' } })).status, 400);
  assert.equal((await post({ revision, record: { ...record, values: { ...record.values, quantity: 100, weight: 100 } } })).status, 400);
  const simultaneous = await Promise.all([post({ revision, record }), post({ revision, record })]);
  assert.deepEqual(simultaneous.map(r => r.status).sort(), [200, 409], 'Only one competing save may commit');
  const reload = await fetch(base + '/api/processing/other-registers', { headers: fixtureHeaders });
  const persisted = await reload.json();
  assert.equal(persisted.revision, revision + 1);
  assert.equal(persisted.state.otherMonitoring.filter(r => r.book === 'sales-monitoring').length, 2);
  const rejected = await fetch(base + '/api/processing/other-registers', { method: 'POST', headers: { Cookie: wrongRole, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, record }) });
  assert.equal(rejected.status, 403);
  console.log('PASS HTTP: eight persisted tables and enabled forms; all eight POSTs read back from DB; audit, tenant isolation, stale revisions, concurrent stock limits and fresh routes');
 } finally {
  if (fixtureId) {
   await prisma.processingGmpWorkspace.deleteMany({ where: { ownerId: fixtureId } });
   await prisma.user.deleteMany({ where: { id: fixtureId } });
  }
  await prisma.$disconnect();
 }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
