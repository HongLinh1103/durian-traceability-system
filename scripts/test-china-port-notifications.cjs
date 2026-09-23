const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies, extra = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => dependencies[name] ?? require(name), console: { ...console, error() {} }, Date, Set, Map, AbortSignal, ...extra });
    return exports;
}

(async () => {
    let role = 'ADMIN';
    let stored = null;
    const settingsDb = { chinaPortNotificationSetting: {
        findUnique: async () => stored,
        upsert: async ({ create }) => (stored = create),
    } };
    const settingsRoute = load('src/app/api/china-port/notification-settings/route.ts', {
        'next-auth': { getServerSession: async () => ({ user: { role, id: 'admin-1' } }) },
        'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
        '@/lib/auth': { authOptions: {} }, '@/lib/prisma': { prisma: settingsDb },
        '@/lib/email-service': { getEmailConfigurationStatus: () => ({ configured: true, missing: [] }) },
    });
    const body = { countryCode: '704', events: ['NEW_RECORD'], emailEnabled: true, smsEnabled: false, emails: ['recipient@example.com'], phones: [] };
    const request = value => ({ json: async () => value });
    role = 'FARMER';
    assert.equal((await settingsRoute.PUT(request(body))).status, 403);
    role = 'ADMIN';
    assert.equal((await settingsRoute.PUT(request({ ...body, emails: ['bad'] }))).status, 400);
    assert.equal((await settingsRoute.PUT(request(body))).status, 200);
    assert.equal((await settingsRoute.GET()).data.data.emails[0], 'recipient@example.com');

    let snapshot = [], sent = [], smtpReady = true, sendFails = false, fetched = 0;
    let upstream = [{ chinaRegNo: 'VN-TEST', countryCode: '704', regState: '1' }, { chinaRegNo: 'OTHER', countryCode: '156' }];
    const prisma = {
        $transaction: async fn => fn({ $queryRaw: async () => [{ locked: true }] }),
        user: { findMany: async () => [{ id: 'admin-1' }] },
        chinaPortNotificationSetting: { findMany: async () => stored.emailEnabled ? [stored] : [] },
        chinaPortRecord: {
            findMany: async () => snapshot,
            upsert: async ({ create }) => { snapshot = [create]; },
        },
        notification: { createMany: async () => {} },
        chinaPortSyncLog: { create: async () => {} },
    };
    const sync = load('src/lib/china-port-sync.ts', {
        '@/lib/prisma': { prisma },
        '@/lib/email-service': {
            getEmailConfigurationStatus: () => ({ configured: smtpReady }),
            sendChinaPortEventEmail: async (payload, recipients) => {
                sent.push({ payload, recipients });
                return { success: !sendFails, error: sendFails ? 'SMTP failed' : undefined };
            },
        },
    }, { fetch: async () => { fetched++; return { ok: true, json: async () => ({ data: { rows: upstream } }) }; } });
    smtpReady = false;
    assert.equal((await sync.syncChinaPortVietnamData()).success, false);
    assert.equal(fetched, 0);
    smtpReady = true; sendFails = true;
    assert.equal((await sync.syncChinaPortVietnamData()).success, false);
    assert.equal(snapshot.length, 0, 'Failed delivery must not advance snapshot');
    sendFails = false; sent = [];
    assert.equal((await sync.syncChinaPortVietnamData()).emailSent, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].recipients[0], 'recipient@example.com');
    assert.equal(sent[0].payload.record.chinaRegNo, 'VN-TEST');
    sent = [];
    await sync.syncChinaPortVietnamData();
    assert.equal(sent.length, 0, 'Unchanged data must not send again');
    upstream = [{ ...upstream[0], regState: '2' }];
    await sync.syncChinaPortVietnamData();
    assert.equal(sent.length, 0, 'Unselected status event must not send');
    stored.emailEnabled = false;
    upstream = [{ ...upstream[0], chinaRegNo: 'VN-SECOND' }];
    await sync.syncChinaPortVietnamData();
    assert.equal(sent.length, 0, 'Disabled email must not send');
    console.log('PASS: settings authorization/validation/persistence, saved recipients, Vietnam filter, selected events, disabled email, no duplicates for unchanged data, SMTP failure retry. No real mail sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
