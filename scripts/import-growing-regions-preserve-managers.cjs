const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { readCatalog, normalize } = require('./import-gacc-catalog.cjs');
require('@next/env').loadEnvConfig(process.cwd());

const provinceNames = {
    'An Giang': 'An Giang', 'Cần thơ': 'Cần Thơ', 'Dak Lak': 'Đắk Lắk',
    'Dong Nai': 'Đồng Nai', 'Dong thap': 'Đồng Tháp', 'Gia Lai': 'Gia Lai',
    HCM: 'TP. Hồ Chí Minh', 'Lam Dong': 'Lâm Đồng', 'Tay Ninh': 'Tây Ninh',
    'VĨnh Long': 'Vĩnh Long', 'Vĩnh Long': 'Vĩnh Long', 'Quảng Ngãi': 'Quảng Ngãi', 'Phú Thọ': 'Phú Thọ',
};

async function main() {
    const file = process.argv.find(arg => arg.toLowerCase().endsWith('.xlsx'));
    if (!file) throw new Error('Supply the source .xlsx and optionally --apply');
    const catalog = await readCatalog(file);
    const prisma = new PrismaClient();
    try {
        const summary = await prisma.$transaction(async tx => {
            const before = await tx.growingRegion.findMany({ include: { managerAssignments: true, farms: { select: { id: true, farmerId: true } } }, orderBy: { id: 'asc' } });
            const byCode = new Map();
            for (const region of before) {
                const key = normalize(region.code);
                if (byCode.has(key)) throw new Error(`Duplicate existing code: ${key}`);
                byCode.set(key, region);
            }
            // Preserve all assignment history, not only currently active managers.
            const protectedRegions = before.filter(r => r.managerAssignments.length || r.farms.length);
            const protectedIds = new Set(protectedRegions.map(r => r.id));
            const create = [], update = [];
            let matchedProtected = 0;
            for (const row of catalog.regions) {
                const existing = byCode.get(normalize(row.code));
                if (existing && protectedIds.has(existing.id)) { matchedProtected++; continue; }
                if (!provinceNames[row.province]) throw new Error(`Unknown province: ${row.province}`);
                const data = { code: row.code, name: row.name, address: row.address, province: provinceNames[row.province], cropType: row.cropType, approvalCode: row.code, exportMarkets: ['Trung Quốc'] };
                if (existing) update.push({ id: existing.id, data });
                else create.push({ ...data, status: 'ACTIVE', isActive: true, cropVarieties: [] });
            }
            const result = { source: catalog.source, sha256: catalog.sha256, sourceRegions: catalog.regions.length, protectedRegions: protectedRegions.length, matchedProtected, update: update.length, create: create.length, deleted: 0, applied: false };
            if (!process.argv.includes('--apply')) return result;
            const folder = path.join(process.cwd(), 'scratch', 'growing-region-import');
            fs.mkdirSync(folder, { recursive: true });
            const backup = path.join(folder, `before-${Date.now()}.json`);
            fs.writeFileSync(backup, JSON.stringify({ ...result, regions: before, sourceRows: catalog.regions }, null, 2));
            for (const row of update) await tx.growingRegion.update({ where: { id: row.id }, data: row.data });
            if (create.length) await tx.growingRegion.createMany({ data: create });
            const after = await tx.growingRegion.findMany({ include: { managerAssignments: true, farms: { select: { id: true, farmerId: true } } }, orderBy: { id: 'asc' } });
            for (const region of protectedRegions) assert.deepStrictEqual(after.find(row => row.id === region.id), region, `Protected region changed: ${region.code}`);
            const finalCodes = new Map(after.map(row => [normalize(row.code), row]));
            assert.equal(finalCodes.size, after.length, 'Duplicate normalized codes');
            for (const row of catalog.regions) {
                const stored = finalCodes.get(normalize(row.code));
                assert(stored, `Missing source region: ${row.code}`);
                if (protectedIds.has(stored.id)) continue;
                assert.equal(stored.name, row.name);
                assert.equal(stored.address, row.address);
                assert.equal(stored.province, provinceNames[row.province]);
                assert.equal(stored.cropType, row.cropType);
            }
            result.applied = true;
            result.totalAfter = after.length;
            result.provinces = after.reduce((totals, region) => { const province = provinceNames[region.province] || region.province; totals[province] = (totals[province] || 0) + 1; return totals; }, {});
            result.backup = backup;
            fs.writeFileSync(path.join(folder, `result-${Date.now()}.json`), JSON.stringify(result, null, 2));
            return result;
        }, { isolationLevel: 'Serializable', timeout: 120000, maxWait: 15000 });
        console.log(JSON.stringify(summary, null, 2));
    } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
