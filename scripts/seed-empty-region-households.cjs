const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
require('@next/env').loadEnvConfig(process.cwd());

async function main() {
    const prisma = new PrismaClient();
    const password = await bcrypt.hash(randomBytes(48).toString('hex'), 12);
    try {
        const result = await prisma.$transaction(async tx => {
            const regions = await tx.growingRegion.findMany({ include: { farms: { select: { id: true, farmerId: true, areaSize: true, growingRegionId: true } }, managerAssignments: true }, orderBy: { code: 'asc' } });
            const empty = regions.filter(region => region.farms.length === 0);
            const summary = { emptyRegions: empty.length, householdsToCreate: empty.length * 3, applied: false };
            if (!process.argv.includes('--apply')) return summary;
            fs.mkdirSync('scratch/region-household-seed', { recursive: true });
            const stamp = Date.now();
            fs.writeFileSync(`scratch/region-household-seed/before-${stamp}.json`, JSON.stringify(regions, null, 2));
            const created = [];
            for (const region of empty) {
                for (let index = 1; index <= 3; index++) {
                    const key = createHash('sha256').update(region.id).digest('hex').slice(0, 16) + '-' + index;
                    const area = [1, 1.5, 2][index - 1];
                    const farmer = await tx.user.create({ data: {
                        phone: 'DEMO-REGION-' + key,
                        fullName: `Nông hộ minh họa ${index} · ${region.code}`,
                        password,
                        role: 'FARMER', accountStatus: 'APPROVED', isApproved: true, isLocked: true,
                        registrationName: 'Dữ liệu minh họa liên kết vùng trồng',
                        province: region.province,
                        address: region.address || [region.ward, region.district, region.province].filter(Boolean).join(', '),
                        registeredAreaSize: area,
                        registeredTotalTrees: 0,
                        registeredDurianVariety: 'Sầu riêng (minh họa)',
                    } });
                    const farm = await tx.farm.create({ data: {
                        farmCode: 'DEMO-FARM-' + key,
                        farmName: `Vườn sầu riêng minh họa ${index} · ${region.code}`,
                        farmerId: farmer.id,
                        growingRegionId: region.id,
                        growingRegion: `${region.code} - ${region.name}`,
                        province: region.province, district: region.district, ward: region.ward,
                        address: region.address || [region.ward, region.district, region.province].filter(Boolean).join(', '),
                        areaSize: area, areaUnit: 'HECTARE', totalTrees: 0,
                        durianVariety: 'Sầu riêng (minh họa)', isActive: true,
                        notes: 'DEMO_REGION_HOUSEHOLD: Nông hộ, vườn và diện tích là dữ liệu minh họa do admin yêu cầu. Địa chỉ kế thừa từ vùng trồng. Chưa có số cây, CCCD, SĐT và tọa độ thực tế. Tài khoản khóa đăng nhập.',
                    } });
                    created.push({ regionId: region.id, farmerId: farmer.id, farmId: farm.id });
                }
            }
            const after = await tx.growingRegion.findMany({ include: { farms: { select: { id: true, farmerId: true, areaSize: true, growingRegionId: true } }, managerAssignments: true }, orderBy: { code: 'asc' } });
            for (const previous of regions.filter(r => r.farms.length)) assert.deepStrictEqual(after.find(r => r.id === previous.id), previous);
            for (const region of empty) {
                const actual = after.find(r => r.id === region.id);
                assert.equal(actual.farms.length, 3);
                assert.equal(new Set(actual.farms.map(f => f.farmerId)).size, 3);
                assert.equal(actual.farms.reduce((sum, f) => sum + f.areaSize, 0), 4.5);
            }
            assert.equal(await tx.user.count({ where: { id: { in: created.map(r => r.farmerId) }, isLocked: true, isApproved: true, accountStatus: 'APPROVED' } }), created.length);
            fs.writeFileSync(`scratch/region-household-seed/created-${stamp}.json`, JSON.stringify(created, null, 2));
            return { ...summary, applied: true, createdHouseholds: created.length, createdFarms: created.length, verifiedRegions: empty.length };
        }, { isolationLevel: 'Serializable', timeout: 120000 });
        console.log(JSON.stringify(result, null, 2));
    } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
