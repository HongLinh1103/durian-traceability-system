const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { readCatalog, normalize } = require('./import-gacc-catalog.cjs');
require('@next/env').loadEnvConfig(process.cwd());
const key = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
const provinces = { 'can tho': 'Cần Thơ', 'dak lak': 'Đắk Lắk', 'dong nai': 'Đồng Nai', 'dong thap': 'Đồng Tháp', 'gia lai': 'Gia Lai', 'lam dong': 'Lâm Đồng', 'tay ninh': 'Tây Ninh', 'vinh long': 'Vĩnh Long' };

async function main() {
    const file = process.argv.find(value => value.endsWith('.xlsx'));
    if (!file) throw Error('Supply source .xlsx and optionally --apply');
    const source = await readCatalog(file);
    const prisma = new PrismaClient();
    try {
        const result = await prisma.$transaction(async tx => {
            const profiles = await tx.partnerFacility.findMany({ where: { type: 'PROCESSING_FACILITY', deletedAt: null }, orderBy: { id: 'asc' } });
            const profileCodes = new Set(profiles.map(row => normalize(row.code || row.approvalCode || '')));
            const groups = new Map();
            for (const row of source.facilities) {
                if (key(row.cropType) !== 'sau rieng') continue;
                const province = provinces[key(row.province)];
                if (!province) throw Error(`Unknown province: ${row.province}`);
                if (!groups.has(province)) groups.set(province, []);
                groups.get(province).push({ ...row, province });
            }
            const selected = [];
            for (const rows of groups.values()) {
                const existing = rows.filter(row => profileCodes.has(normalize(row.code)));
                const additional = rows.filter(row => !profileCodes.has(normalize(row.code)));
                selected.push(...existing, ...additional.slice(0, Math.max(0, 5 - existing.length)));
            }
            const summary = { source: source.source, totalSource: source.facilities.length, selected: selected.length, existingProfilesMatched: selected.filter(row => profileCodes.has(normalize(row.code))).length, provinces: [...groups.keys()].map(province => ({ province, count: selected.filter(row => row.province === province).length })), applied: false };
            if (!process.argv.includes('--apply')) return summary;
            const before = await tx.packingFacilityCatalog.findMany();
            fs.mkdirSync('scratch/packing-facility-import', { recursive: true });
            const backup = `scratch/packing-facility-import/before-${Date.now()}.json`;
            fs.writeFileSync(backup, JSON.stringify({ before, profiles, source: source.source, sha256: source.sha256, selected }, null, 2));
            for (const row of selected) {
                const data = { code: row.code, name: row.name, province: row.province, address: row.address, fruitType: row.cropType, sourceFile: source.source, sourceSha256: source.sha256, sourceRow: row.sourceRow };
                await tx.packingFacilityCatalog.upsert({ where: { normalizedCode: normalize(row.code) }, create: { normalizedCode: normalize(row.code), ...data }, update: data });
            }
            const stored = await tx.packingFacilityCatalog.findMany();
            for (const row of selected) {
                const actual = stored.find(item => item.normalizedCode === normalize(row.code));
                assert(actual);
                for (const field of ['code', 'name', 'province', 'address']) assert.equal(actual[field], row[field]);
                assert.equal(actual.fruitType, row.cropType);
            }
            assert.deepStrictEqual(await tx.partnerFacility.findMany({ where: { type: 'PROCESSING_FACILITY', deletedAt: null }, orderBy: { id: 'asc' } }), profiles);
            return { ...summary, applied: true, verified: selected.length, backup };
        }, { isolationLevel: 'Serializable', timeout: 120000 });
        console.log(JSON.stringify(result, null, 2));
    } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
