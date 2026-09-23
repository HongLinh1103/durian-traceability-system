const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
require('@next/env').loadEnvConfig(process.cwd());
const normalize = code => code.replace(/\s+/g, '').toUpperCase();

async function readCatalog(file) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const catalog = { source: path.basename(file), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), regions: [], facilities: [] };
    for (const [sheetName, key] of [['Vùng trồng', 'regions'], ['CSĐG', 'facilities']]) {
        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) throw new Error(`Missing sheet: ${sheetName}`);
        const codes = new Set();
        sheet.eachRow((row, sourceRow) => {
            if (sourceRow < 3) return;
            const [province, name, code, address, approval, cropType] = [2, 3, 4, 5, 6, 7].map(i => row.getCell(i).text.trim());
            if (!name && !code && !address) return;
            if (!province || !name || !code || !address || !cropType || approval !== '通过') throw new Error(`Invalid/unapproved row: ${sheetName}:${sourceRow}`);
            const normalizedCode = normalize(code);
            if (codes.has(normalizedCode)) throw new Error(`Duplicate code: ${code}`);
            codes.add(normalizedCode);
            catalog[key].push({ code, name, address, province, cropType, approval, sourceRow });
        });
    }
    return catalog;
}

async function main() {
    const source = process.argv.find(arg => arg.toLowerCase().endsWith('.xlsx'));
    if (!source) throw new Error('Usage: node scripts/import-gacc-catalog.cjs <source.xlsx> [--apply]');
    const catalog = await readCatalog(source);
    const prisma = new PrismaClient();
    try {
        const [regions, facilities] = await Promise.all([
            prisma.growingRegion.findMany(),
            prisma.partnerFacility.findMany({ where: { type: 'PROCESSING_FACILITY', deletedAt: null }, select: { id: true, code: true, approvalCode: true, name: true, address: true, province: true } }),
        ]);
        const byCode = new Map();
        for (const region of regions) {
            const key = normalize(region.code);
            if (byCode.has(key)) throw new Error(`Database has duplicate normalized region code: ${key}`);
            byCode.set(key, region);
        }
        const facilityCatalog = new Map(catalog.facilities.map(row => [normalize(row.code), row]));
        const matchedRegions = catalog.regions.filter(row => byCode.has(normalize(row.code)));
        const matches = facilities.filter(row => row.code && facilityCatalog.has(normalize(row.code)));
        const summary = { source: catalog.source, regions: catalog.regions.length, facilities: catalog.facilities.length, existingRegions: catalog.regions.filter(row => byCode.has(normalize(row.code))).length, matchedFacilityProfiles: matches.length, applied: false };
        if (process.argv.includes('--apply')) {
            fs.mkdirSync('scratch/gacc-import', { recursive: true });
            const [farms, profiles, workspaces] = await Promise.all([
                prisma.farm.findMany({ select: { id: true, growingRegionId: true, growingRegion: true } }),
                prisma.areaManagerApplication.findMany({ select: { id: true, managedRegions: true } }),
                prisma.processingGmpWorkspace.findMany(),
            ]);
            fs.writeFileSync(`scratch/gacc-import/existing-only-before-${Date.now()}.json`, JSON.stringify({ regions, facilities, farms, profiles, workspaces }, null, 2));
            const matchedById = new Map(matchedRegions.map(row => [byCode.get(normalize(row.code)).id, row]));
            const matchedByCode = new Map(matchedRegions.map(row => [normalize(row.code), row]));
            // Explicit user-approved replacement of the five illustrative lots.
            const demoReplacements = process.argv.includes('--replace-demo-dong-nai')
                ? new Map(['0269', '0271', '0272', '0273', '0274'].map((suffix, index) => [`PUC-MH-${String(index + 1).padStart(3, '0')}`, `VN-DNOR-${suffix}`]))
                : new Map();
            for (const code of demoReplacements.values()) {
                if (matchedByCode.get(code)?.province !== 'Dong Nai') throw new Error(`Replacement must be an existing Dong Nai region: ${code}`);
            }
            summary.updatedFarmLabels = 0;
            summary.updatedManagerProfiles = 0;
            summary.updatedWorkspaces = 0;
            const unmatched = new Set();
            await prisma.$transaction(async tx => {
                for (const row of matchedRegions) {
                    const previous = byCode.get(normalize(row.code));
                    const data = { code: row.code, name: row.name, address: row.address, approvalCode: row.code };
                    if (previous) await tx.growingRegion.update({ where: { id: previous.id }, data });
                }
                for (const facility of matches) {
                    const row = facilityCatalog.get(normalize(facility.code));
                    await tx.partnerFacility.update({ where: { id: facility.id }, data: { code: row.code, approvalCode: row.code, name: row.name, address: row.address } });
                }
                for (const farm of farms) {
                    const source = matchedById.get(farm.growingRegionId);
                    if (!source) continue;
                    const label = `${source.code} - ${source.name}`;
                    if (farm.growingRegion === label) continue;
                    await tx.farm.update({ where: { id: farm.id }, data: { growingRegion: label } });
                    summary.updatedFarmLabels++;
                }
                for (const profile of profiles) {
                    if (!Array.isArray(profile.managedRegions)) continue;
                    const updated = profile.managedRegions.map(region => {
                        if (!region || typeof region !== 'object') return region;
                        const source = matchedById.get(region.id) || matchedByCode.get(normalize(String(region.code || '')));
                        return source ? { ...region, code: source.code, name: source.name, address: source.address } : region;
                    });
                    if (JSON.stringify(updated) === JSON.stringify(profile.managedRegions)) continue;
                    await tx.areaManagerApplication.update({ where: { id: profile.id }, data: { managedRegions: updated } });
                    summary.updatedManagerProfiles++;
                }
                for (const workspace of workspaces) {
                    const updated = structuredClone(workspace.data);
                    for (const records of Object.values(updated.records || {})) {
                        if (!Array.isArray(records)) continue;
                        for (const record of records) {
                            const values = record.values;
                            if (!values?.puc) continue;
                            const code = normalize(String(values.puc));
                            const source = matchedByCode.get(demoReplacements.get(code) || code);
                            if (!source) { unmatched.add(values.puc); continue; }
                            values.puc = source.code;
                            if ('origin' in values) values.origin = `${source.name} - ${source.address}`;
                            if ('regionName' in values) values.regionName = source.name;
                            if ('regionAddress' in values) values.regionAddress = source.address;
                        }
                    }
                    if (JSON.stringify(updated) === JSON.stringify(workspace.data)) continue;
                    const changed = await tx.processingGmpWorkspace.updateMany({ where: { ownerId: workspace.ownerId, revision: workspace.revision }, data: { data: updated, revision: { increment: 1 } } });
                    if (changed.count !== 1) throw new Error('Workspace changed during synchronization; retry.');
                    summary.updatedWorkspaces++;
                }
            }, { timeout: 120000 });
            summary.unmatchedRecordCodes = [...unmatched];
            const stored = await prisma.growingRegion.findMany();
            for (const row of matchedRegions) {
                if (!stored.some(actual => actual.code === row.code && actual.name === row.name && actual.address === row.address)) throw new Error(`Verification failed: ${row.code}`);
            }
            const storedFacilities = await prisma.partnerFacility.findMany({ where: { id: { in: matches.map(row => row.id) } } });
            for (const actual of storedFacilities) {
                const expected = facilityCatalog.get(normalize(actual.code));
                if (actual.name !== expected.name || actual.address !== expected.address || actual.code !== expected.code) throw new Error(`Facility verification failed: ${actual.code}`);
            }
            summary.applied = true;
            summary.verifiedRegions = matchedRegions.length;
            summary.verifiedFacilityProfiles = storedFacilities.length;
        }
        console.log(JSON.stringify(summary, null, 2));
    } finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { readCatalog, normalize };
