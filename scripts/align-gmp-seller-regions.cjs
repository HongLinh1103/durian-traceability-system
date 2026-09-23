const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { readCatalog, normalize } = require('./import-gacc-catalog.cjs');

function sellerOf(record, records, seen = new Set()) {
    if (!record || seen.has(record.id)) return '';
    seen.add(record.id);
    const parent = records.get(record.sourceId);
    return (parent && parent.id !== record.id ? sellerOf(parent, records, seen) : '') || String(record.values?.seller || '').trim();
}
function businessFields(record) {
    const copy = structuredClone(record);
    for (const key of ['puc', 'origin', 'regionName', 'regionAddress']) delete copy.values[key];
    return copy;
}
async function main() {
    const catalog = await readCatalog(process.argv[2]);
    const assignments = new Map([['Nguyễn Văn Nam', 'VN-DNOR-0271']]);
    const hoaCode = process.argv[3];
    if (hoaCode) {
        if (!['VN-DNOR-0273', 'VN-DNOR-0274'].includes(hoaCode)) throw new Error('Invalid THUYFRUITSONEMEMBER code');
        assignments.set('Lê Thị Hoa', hoaCode);
    }
    const regions = new Map([...assignments].map(([seller, code]) => {
        const region = catalog.regions.find(row => normalize(row.code) === code);
        assert(region && region.province === 'Dong Nai');
        assert.equal(region.name, seller === 'Nguyễn Văn Nam' ? 'Long Binh Durian Cooperative 1' : 'THUYFRUITSONEMEMBER');
        return [seller, region];
    }));
    const prisma = new PrismaClient();
    try {
        const workspaces = await prisma.processingGmpWorkspace.findMany();
        fs.mkdirSync('scratch/gacc-import', { recursive: true });
        fs.writeFileSync(`scratch/gacc-import/seller-alignment-before-${Date.now()}.json`, JSON.stringify(workspaces, null, 2));
        const summary = { updatedWorkspaces: 0, updatedRecords: 0, verifiedRecords: 0, assignments: Object.fromEntries(assignments) };
        await prisma.$transaction(async tx => {
            for (const workspace of workspaces) {
                const data = structuredClone(workspace.data);
                const records = new Map(Object.values(data.records || {}).flat().map(row => [row.id, row]));
                let changed = false;
                for (const record of records.values()) {
                    const region = regions.get(sellerOf(record, records));
                    if (!region) continue;
                    const before = structuredClone(record);
                    record.values.puc = region.code;
                    record.values.origin = `${region.name} - ${region.address}`;
                    if ('regionName' in record.values) record.values.regionName = region.name;
                    if ('regionAddress' in record.values) record.values.regionAddress = region.address;
                    assert.deepEqual(businessFields(record), businessFields(before));
                    if (JSON.stringify(record) !== JSON.stringify(before)) { changed = true; summary.updatedRecords++; }
                }
                if (changed) {
                    const result = await tx.processingGmpWorkspace.updateMany({ where: { ownerId: workspace.ownerId, revision: workspace.revision }, data: { data, revision: { increment: 1 } } });
                    assert.equal(result.count, 1, 'Workspace changed concurrently');
                    summary.updatedWorkspaces++;
                }
            }
            for (const workspace of await tx.processingGmpWorkspace.findMany()) {
                const records = new Map(Object.values(workspace.data.records || {}).flat().map(row => [row.id, row]));
                for (const record of records.values()) {
                    const region = regions.get(sellerOf(record, records));
                    if (!region) continue;
                    assert.equal(record.values.puc, region.code);
                    assert.equal(record.values.origin, `${region.name} - ${region.address}`);
                    summary.verifiedRecords++;
                }
            }
        });
        console.log(JSON.stringify(summary, null, 2));
    } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
