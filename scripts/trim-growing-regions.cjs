const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { readCatalog, normalize } = require('./import-gacc-catalog.cjs');
require('@next/env').loadEnvConfig(process.cwd());
const normalized = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
(async () => {
    const file = process.argv.find(a => a.endsWith('.xlsx'));
    if (!file) throw Error('Supply source .xlsx and optionally --apply');
    const catalog = await readCatalog(file);
    const sourceCodes = new Set(catalog.regions.map(r => normalize(r.code)));
    const prisma = new PrismaClient();
    try {
        const result = await prisma.$transaction(async tx => {
            const rows = await tx.growingRegion.findMany({ include: { managerAssignments: true, farms: { select: { id: true, farmerId: true } } }, orderBy: { code: 'asc' } });
            const protectedRows = rows.filter(r => r.managerAssignments.length || r.farms.length);
            const keep = new Set(protectedRows.map(r => r.id));
            const groups = new Map();
            for (const row of rows) {
                if (!sourceCodes.has(normalize(row.code))) { keep.add(row.id); continue; }
                if (normalized(row.cropType) !== 'sau rieng') continue;
                const key = normalized(row.province);
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(row);
            }
            for (const group of groups.values()) {
                let count = group.filter(r => keep.has(r.id)).length;
                for (const row of group) if (count < 5 && !keep.has(row.id)) { keep.add(row.id); count++; }
            }
            const remove = rows.filter(r => !keep.has(r.id));
            const summary = { before: rows.length, remove: remove.length, after: rows.length - remove.length, protected: protectedRows.length, provinces: [...groups].map(([province, group]) => ({ province, retained: group.filter(r => keep.has(r.id)).length })), applied: false };
            if (!process.argv.includes('--apply')) return summary;
            fs.mkdirSync('scratch/growing-region-import', { recursive: true });
            const backup = `scratch/growing-region-import/before-trim-${Date.now()}.json`;
            fs.writeFileSync(backup, JSON.stringify({ rows, removeIds: remove.map(r => r.id), sourceSha256: catalog.sha256 }, null, 2));
            const deleted = await tx.growingRegion.deleteMany({ where: { id: { in: remove.map(r => r.id) }, managerAssignments: { none: {} }, farms: { none: {} } } });
            assert.equal(deleted.count, remove.length, 'Linked data changed; aborting');
            const after = await tx.growingRegion.findMany({ include: { managerAssignments: true, farms: { select: { id: true, farmerId: true } } } });
            for (const r of protectedRows) assert.deepStrictEqual(after.find(v => v.id === r.id), r);
            assert.equal(after.length, summary.after);
            assert(after.every(r => normalized(r.cropType) === 'sau rieng'), 'Non-durian region remains; aborting');
            return { ...summary, applied: true, backup };
        }, { isolationLevel: 'Serializable', timeout: 120000 });
        console.log(JSON.stringify(result, null, 2));
    } finally { await prisma.$disconnect(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
