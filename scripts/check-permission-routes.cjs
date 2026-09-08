const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const catalog = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/permissions-data.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: catalog });
const features = catalog.PERMISSION_MODULES.flatMap(module => module.features);
const actions = features.flatMap(feature => Object.values(feature.actions));
const retiredPages = ['/statistics', '/weather', '/dashboard/farmer/finance', '/dashboard/store/profile'];

test('every catalog action has a unique key and an existing UI source', () => {
    assert.equal(new Set(actions.map(action => action.key)).size, actions.length);
    for (const action of actions) {
        assert.ok(action.routes.length, `${action.key}: missing routes`);
        for (const route of action.routes) {
            assert.ok(route.source.startsWith('src/'), `${action.key}: invalid source`);
            assert.ok(fs.existsSync(path.join(root, route.source)), `${action.key}: source missing: ${route.source}`);
        }
    }
});

test('catalog paths resolve and API methods have real handlers', () => {
    for (const feature of features) {
        assert.ok(fs.existsSync(path.join(root, 'src/app', feature.menuPath, 'page.tsx')), `${feature.id}: menu route missing`);
        for (const action of Object.values(feature.actions)) {
            for (const route of action.routes) {
                assert.ok(route.path.startsWith('/') && !route.path.includes('?'), `${action.key}: invalid path`);
                const file = path.join(root, 'src/app', route.path, route.kind === 'api' ? 'route.ts' : 'page.tsx');
                assert.ok(fs.existsSync(file), `${action.key}: route missing: ${route.path}`);
                if (route.kind === 'api') {
                    assert.match(fs.readFileSync(file, 'utf8'), new RegExp(`export\\s+(?:async\\s+)?function\\s+${route.method}\\b`), `${action.key}: ${route.method} ${route.path}`);
                } else if (route.kind === 'client') {
                    assert.equal(route.method, undefined, 'Browser actions must not pretend to be API requests');
                    assert.ok(route.operation, `${action.key}: explain browser action`);
                }
            }
        }
    }
});

test('defaults only contain selectable permissions and enabled modules', () => {
    const valid = new Set(catalog.getAllSystemPermissionKeys());
    for (const [role, config] of Object.entries(catalog.DEFAULT_ROLE_PERMISSIONS)) {
        for (const key of config.permissions) {
            assert.ok(valid.has(key), `${role}: retired default key ${key}`);
            const module = catalog.PERMISSION_MODULES.find(module => module.features.some(feature => Object.values(feature.actions).some(action => action.key === key)));
            assert.equal(config.moduleEnabled[module.id], true, `${role}: granted key ${key} in disabled module`);
        }
    }
    for (const role of catalog.INITIAL_CUSTOM_ROLES) for (const key of role.permissions) assert.ok(valid.has(key));
});

test('old saved keys are filtered without adding grants', () => {
    const existing = actions[0].key;
    const normalized = catalog.normalizeCatalogPermissions([existing, existing, 'OBSOLETE_PERMISSION']);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0], existing);
    assert.equal(catalog.normalizeCatalogPermissions([]).length, 0);
});

test('retired pages are absent from the filesystem and the catalog', () => {
    for (const page of retiredPages) {
        assert.equal(fs.existsSync(path.join(root, 'src/app', page, 'page.tsx')), false);
        assert.equal(features.some(feature => feature.menuPath === page), false);
        assert.equal(actions.some(action => action.routes.some(route => route.path === page)), false);
    }
});
