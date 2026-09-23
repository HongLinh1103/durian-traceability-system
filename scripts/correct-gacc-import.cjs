const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { readCatalog, normalize } = require('./import-gacc-catalog.cjs');
require('@next/env').loadEnvConfig(process.cwd());

async function main() {
    const backupPath = 'scratch/gacc-import/before-1789803734843.json';
    const before = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const source = await readCatalog(process.argv[2]);
    const originals = new Set(before.regions.map(row => row.id));
    const sourceRegions = new Map(source.regions.map(row => [normalize(row.code), row]));
    const sourceFacilities = new Map(source.facilities.map(row => [normalize(row.code), row]));
    const prisma = new PrismaClient();
    try {
        await prisma.$transaction(async tx => {
            const current = await tx.growingRegion.findMany({ include: { _count: { select: { farms: true, managerAssignments: true } } } });
            const added = current.filter(row => !originals.has(row.id));
            const workspaces = await tx.processingGmpWorkspace.findMany({ select: { data: true } });
            for (const row of added) {
                const expected = sourceRegions.get(normalize(row.code));
                if (!expected || row.name !== expected.name || row.address !== expected.address ||
                    row.createdAt < new Date('2026-09-19T07:42:14Z') || row.createdAt > new Date('2026-09-19T07:42:17Z') ||
                    row._count.farms || row._count.managerAssignments ||
                    workspaces.some(w => JSON.stringify(w.data).replace(/\s/g, '').includes(normalize(row.code)))) {
                    throw new Error(`Cannot safely remove changed/used record: ${row.code}`);
                }
            }
            fs.writeFileSync(`scratch/gacc-import/correction-before-${Date.now()}.json`, JSON.stringify(current, null, 2));
            await tx.growingRegion.deleteMany({ where: { id: { in: added.map(row => row.id) } } });
            for (const previous of before.regions) {
                const expected = sourceRegions.get(normalize(previous.code));
                if (!expected) throw new Error(`No exact source match: ${previous.code}`);
                await tx.growingRegion.update({ where: { id: previous.id }, data: {
                    code: expected.code, name: expected.name, address: expected.address,
                    approvalCode: expected.code, province: previous.province, cropType: previous.cropType,
                } });
            }
            for (const previous of before.facilities) {
                const expected = sourceFacilities.get(normalize(previous.code));
                if (!expected) throw new Error(`No exact facility match: ${previous.code}`);
                await tx.partnerFacility.update({ where: { id: previous.id }, data: {
                    code: expected.code, name: expected.name, address: expected.address,
                    approvalCode: expected.code, province: previous.province,
                } });
            }
            const result = await tx.growingRegion.findMany();
            if (result.length !== before.regions.length || result.some(row => !originals.has(row.id))) throw new Error('Original region set not preserved');
            for (const row of result) {
                const expected = sourceRegions.get(normalize(row.code));
                if (row.name !== expected.name || row.address !== expected.address) throw new Error(`Mismatch: ${row.code}`);
            }
            console.log(JSON.stringify({ removedUnrequestedRegions: added.length, retainedOriginalRegions: result.length, updatedExistingFacilities: before.facilities.length, originalIdsPreserved: true }, null, 2));
        }, { timeout: 120000 });
    } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
