const fs = require('node:fs');
const { parseEnv } = require('node:util');
const { PrismaClient } = require('@prisma/client');
const normalize = value => (value || '').replace(/\s+/g, '').toUpperCase();

function planProfiles(source, target) {
    const updates = [];
    for (const row of source) {
        const matches = target.filter(candidate => candidate.ownerId === row.ownerId || candidate.owner.phone === row.owner.phone ||
            (row.owner.email && candidate.owner.email && candidate.owner.email.toLowerCase() === row.owner.email.toLowerCase()));
        if (matches.length > 1) throw new Error('Ambiguous profile owner match; import stopped.');
        const existing = matches[0];
        if (!existing) continue;
        const data = {};
        if (!existing.code && row.code) {
            if (target.some(other => other.id !== existing.id && normalize(other.code) === normalize(row.code))) {
                throw new Error('Facility code already belongs to another profile; import stopped.');
            }
            data.code = row.code;
        }
        if (!existing.approvalCode && row.approvalCode) data.approvalCode = row.approvalCode;
        if (Object.keys(data).length) updates.push({ id: existing.id, data });
    }
    return updates;
}

function connection(value) {
    const url = new URL(value);
    url.searchParams.set('connection_limit', '1');
    url.searchParams.set('connect_timeout', '30');
    url.searchParams.set('pool_timeout', '30');
    return new PrismaClient({ datasources: { db: { url: url.toString() } } });
}

async function main() {
    require('@next/env').loadEnvConfig(process.cwd(), true);
    const sourceUrl = process.env.DATABASE_URL;
    const targetUrl = parseEnv(fs.readFileSync('.env.production.local', 'utf8')).DATABASE_URL;
    if (!sourceUrl || !targetUrl || sourceUrl === targetUrl) throw new Error('Separate local and production database connections are required.');
    const source = connection(sourceUrl);
    const target = connection(targetUrl);
    const profileFields = { id: true, ownerId: true, code: true, approvalCode: true, owner: { select: { phone: true, email: true } } };
    try {
        const catalog = await source.packingFacilityCatalog.findMany();
        const profiles = await source.partnerFacility.findMany({ where: { type: 'PROCESSING_FACILITY', deletedAt: null }, select: profileFields });
        const apply = process.argv.includes('--apply');
        const result = await target.$transaction(async tx => {
            const before = await tx.packingFacilityCatalog.findMany();
            const targetProfiles = await tx.partnerFacility.findMany({ where: { type: 'PROCESSING_FACILITY', deletedAt: null }, select: profileFields });
            const codes = new Set(before.map(row => row.normalizedCode));
            const missing = catalog.filter(row => !codes.has(row.normalizedCode));
            const updates = planProfiles(profiles, targetProfiles);
            if (apply && (missing.length || updates.length)) {
                fs.mkdirSync('scratch/packing-catalog-transfer', { recursive: true });
                fs.writeFileSync(`scratch/packing-catalog-transfer/before-${Date.now()}.json`, JSON.stringify({ before, profiles: targetProfiles.map(({ owner, ...row }) => row) }), { flag: 'wx', mode: 0o600 });
                // New database IDs avoid conflicts with unrelated production records.
                if (missing.length) await tx.packingFacilityCatalog.createMany({ data: missing.map(({ id, ...row }) => row) });
                for (const update of updates) await tx.partnerFacility.update({ where: { id: update.id }, data: update.data });
                const actual = await tx.packingFacilityCatalog.findMany();
                for (const row of missing) {
                    const stored = actual.find(item => item.normalizedCode === row.normalizedCode);
                    if (!stored || ['code', 'name', 'province', 'address', 'fruitType', 'sourceFile', 'sourceSha256', 'sourceRow'].some(field => stored[field] !== row[field])) {
                        throw new Error('Catalog verification failed; transaction rolled back.');
                    }
                }
                for (const update of updates) {
                    const stored = await tx.partnerFacility.findUnique({ where: { id: update.id }, select: { code: true, approvalCode: true } });
                    if (Object.entries(update.data).some(([field, value]) => stored[field] !== value)) throw new Error('Profile verification failed; transaction rolled back.');
                }
            }
            return { mode: apply ? 'apply' : 'dry-run', localCatalog: catalog.length, productionCatalogBefore: before.length, missing: missing.length,
                profilesToFill: updates.length, added: apply ? missing.length : 0, filled: apply ? updates.length : 0 };
        }, { isolationLevel: 'Serializable', maxWait: 30000, timeout: 60000 });
        console.log(JSON.stringify(result, null, 2));
    } finally { await Promise.allSettled([source.$disconnect(), target.$disconnect()]); }
}
if (require.main === module) main().catch(error => {
    console.error('Catalog transfer failed:', error.code || error.errorCode || (error.constructor === Error ? error.message : error.name));
    if (error.meta?.column) console.error('Missing column:', error.meta.column);
    process.exitCode = 1;
});
module.exports = { planProfiles };
