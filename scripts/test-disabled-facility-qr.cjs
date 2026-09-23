const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports, require: key => dependencies[key] ?? require(key) });
    return exports;
}
(async () => {
    let reads = 0;
    const service = load('src/lib/traceability.ts', {
        '@/lib/prisma': { prisma: { commercialLot: { findUnique: async () => { reads++; return { ownerType: 'PROCESSING_FACILITY' }; } } } },
        '@/lib/trace-preview': {}, '@/lib/date-format': {},
    });
    for (const actorRole of ['COLLECTOR', 'PROCESSING_FACILITY', 'ADMIN']) {
        await assert.rejects(service.issueTraceabilityCode({ commercialLotId: 'test', actorId: 'test', actorRole }));
    }
    assert.equal(reads, 0, 'Disallowed roles must stop before DB access');
    await assert.rejects(service.issueTraceabilityCode({ commercialLotId: 'test', actorId: 'test', actorRole: 'FARMER' }));
    assert.equal(reads, 1, 'Farmer must not issue a code for a processing lot');
    let actorRole = 'COLLECTOR', calls = 0;
    const route = load('src/app/api/traceability/codes/route.ts', {
        'next-auth': { getServerSession: async () => ({ user: { id: 'test', role: actorRole } }) },
        'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
        '@/lib/auth': {}, '@/lib/prisma': {},
        '@/lib/traceability': { issueTraceabilityCode: async () => { calls++; return { code: 'FARMER-TEST' }; } },
    });
    const request = { json: async () => ({ commercialLotId: 'test' }) };
    assert.equal((await route.POST(request)).status, 403);
    actorRole = 'PROCESSING_FACILITY';
    assert.equal((await route.POST(request)).status, 403);
    assert.equal(calls, 0);
    actorRole = 'FARMER';
    assert.equal((await route.POST(request)).status, 201);
    assert.equal(calls, 1);
    for (const path of ['src/app/api/processing/shipments/[id]/qr/issue/route.ts', 'src/app/api/shipments/[id]/qr/issue/route.ts']) assert.equal(fs.existsSync(path), false);
    assert(!fs.readFileSync('src/app/api/processing/shipments/route.ts', 'utf8').includes('traceabilityCode.create'));
    console.log('PASS: collector/processing API denied, service role and lot restrictions, farmer route retained, old issuing routes removed, shipment auto-issue removed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
