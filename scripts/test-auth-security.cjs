const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/lib/auth-service.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup({ user = null, databaseError = false, passwordMatches = false } = {}) {
    const writes = [];
    const exports = {};
    const dependencies = {
        '@/lib/prisma': { prisma: { user: {
            findFirst: async () => {
                if (databaseError) throw new Error('Test database unavailable');
                return user;
            },
            update: async (args) => { writes.push(args); },
            upsert: async () => { throw new Error('Login must never provision an account'); },
        } } },
        '@/lib/password': { verifyPassword: async () => passwordMatches },
        '@/lib/auth-token': { AUTH_SESSION_MAX_AGE_SECONDS: 60, AUTH_REMEMBER_ME_MAX_AGE_SECONDS: 120 },
    };
    vm.runInNewContext(compiled, {
        exports,
        require: (name) => {
            assert.ok(name in dependencies, `Unexpected login dependency: ${name}`);
            return dependencies[name];
        },
        console: { error() {} },
    });
    return { login: exports.authenticateLoginAttempt, writes };
}

const request = { identifier: 'test@example.invalid', password: 'test-only-input', rememberMe: false };
const activeUser = { id: 'test-user', role: 'ADMIN', phone: 'test-phone', email: request.identifier,
    fullName: 'Test user', password: 'test-stored-hash', isApproved: true, isLocked: false, deletedAt: null };

for (const [name, options, code] of [
    ['missing account', {}, 'INVALID_CREDENTIALS'],
    ['database unavailable', { databaseError: true }, 'INVALID_CREDENTIALS'],
    ['wrong or previously changed password', { user: activeUser }, 'INVALID_CREDENTIALS'],
    ['locked account', { user: { ...activeUser, isLocked: true }, passwordMatches: true }, 'ACCOUNT_LOCKED'],
    ['deleted account', { user: { ...activeUser, deletedAt: new Date() }, passwordMatches: true }, 'ACCOUNT_LOCKED'],
    ['pending account', { user: { ...activeUser, isApproved: false }, passwordMatches: true }, 'ACCOUNT_PENDING'],
]) {
    test(`rejects ${name} without changing the account`, async () => {
        const { login, writes } = setup(options);
        const result = await login(request);
        assert.equal(result.ok, false);
        assert.equal(result.code, code);
        assert.equal(writes.length, 0);
    });
}

test('approved account can log in with the database password', async () => {
    for (const rememberMe of [false, true]) {
        const { login, writes } = setup({ user: activeUser, passwordMatches: true });
        const result = await login({ ...request, rememberMe });
        assert.equal(result.ok, true);
        assert.equal(result.user.id, activeUser.id);
        assert.equal(result.expiresInSeconds, rememberMe ? 120 : 60);
        assert.equal('password' in result.user, false);
        assert.equal(writes.length, 1);
        assert.deepEqual(Object.keys(writes[0].data), ['lastLoginAt']);
    }
});

test('login page does not distribute preset account credentials', () => {
    const page = fs.readFileSync(path.join(root, 'src/app/(auth)/login/page.tsx'), 'utf8');
    assert.doesNotMatch(page, /system-accounts|SYSTEM_ACCOUNTS|acc\.password/);
    const accounts = fs.readFileSync(path.join(root, 'src/lib/system-accounts.ts'), 'utf8');
    assert.doesNotMatch(accounts, /password\s*:/);
});
