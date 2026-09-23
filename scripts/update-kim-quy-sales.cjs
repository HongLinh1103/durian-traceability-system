const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const KIM_QUY_SALES_TABLE = {
    'LH-2026-0809': {
        date: '2026-09-11',
        customer: 'Công ty Phân phối Hoa quả Quảng Tây',
        customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0809',
        variety: 'Monthong',
        productLot: 'Monthong · LH-2026-0809',
        transportOk: 'Đ',
        truck: '51D-801.01',
        container: 'MSCU1234566',
        seal: 'HSS260911001',
        quantity_boxes: 396,
        weight_kg: 5940,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-0609': {
        date: '2026-09-10',
        customer: 'Công ty Thương mại Nông sản Bằng Tường',
        customerInfo: 'Bằng Tường, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0609',
        variety: 'Ri6',
        productLot: 'Ri6 · LH-2026-0609',
        transportOk: 'Đ',
        truck: '51D-806.02',
        container: 'TGHU7654320',
        seal: 'HSS260910002',
        quantity_boxes: 274,
        weight_kg: 5480,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-0509': {
        date: '2026-09-08',
        customer: 'Công ty Hoa quả Tươi Nam Ninh',
        customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0509',
        variety: 'Monthong',
        productLot: 'Monthong · LH-2026-0509',
        transportOk: 'Đ',
        truck: '51D-805.03',
        container: 'CMAU2468103',
        seal: 'HSS260908003',
        quantity_boxes: 284,
        weight_kg: 4260,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-0309': {
        date: '2026-09-05',
        customer: 'Công ty Phân phối Trái cây Quảng Tây',
        customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0309',
        variety: 'Ri6',
        productLot: 'Ri6 · LH-2026-0309',
        transportOk: 'Đ',
        truck: '51D-803.04',
        container: 'MSCU6543212',
        seal: 'HSS260905004',
        quantity_boxes: 341,
        weight_kg: 5115,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-0209': {
        date: '2026-09-04',
        customer: 'Công ty Nông sản Hữu nghị Quảng Tây',
        customerInfo: 'Bằng Tường, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0209',
        variety: 'Monthong',
        productLot: 'Monthong · LH-2026-0209',
        transportOk: 'Đ',
        truck: '51D-802.05',
        container: 'TGHU2345673',
        seal: 'HSS260904005',
        quantity_boxes: 255,
        weight_kg: 4590,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-2908': {
        date: '2026-08-31',
        customer: 'Công ty Thương mại Trái cây Bằng Tường',
        customerInfo: 'Bằng Tường, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-2908',
        variety: 'Ri6',
        productLot: 'Ri6 · LH-2026-2908',
        transportOk: 'Đ',
        truck: '51D-829.06',
        container: 'CMAU1357907',
        seal: 'HSS260831006',
        quantity_boxes: 258,
        weight_kg: 4644,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-2007': {
        date: '2026-07-22',
        customer: 'Công ty Phân phối Hoa quả Nam Ninh',
        customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-2007',
        variety: 'Ri6',
        productLot: 'Ri6 · LH-2026-2007',
        transportOk: 'Đ',
        truck: '51D-720.07',
        container: 'MSCU3456789',
        seal: 'HSS260722007',
        quantity_boxes: 204,
        weight_kg: 4080,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
};

async function main() {
    const ownerId = 'cmsogs6vi000314g3yuvld36x';
    const ws = await prisma.processingGmpWorkspace.findUniqueOrThrow({
        where: { ownerId }
    });

    fs.mkdirSync('scratch/backups', { recursive: true });
    const backupFile = `scratch/backups/kimquy-ws-before-${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(ws, null, 2));
    console.log(`Saved backup to ${backupFile}`);

    const data = structuredClone(ws.data);
    let salesUpdated = 0;
    let aftersalesUpdated = 0;

    // Update sales records
    if (Array.isArray(data.records?.sales)) {
        data.records.sales = data.records.sales.map(r => {
            const target = KIM_QUY_SALES_TABLE[r.lotCode];
            if (!target) return r;
            salesUpdated++;
            return {
                ...r,
                lotCode: target.lotCode,
                values: {
                    ...r.values,
                    ...target,
                }
            };
        });
    }

    // Update aftersales container & variety to stay synced
    if (Array.isArray(data.records?.aftersales)) {
        data.records.aftersales = data.records.aftersales.map(r => {
            const target = KIM_QUY_SALES_TABLE[r.lotCode];
            if (!target) return r;
            aftersalesUpdated++;
            return {
                ...r,
                values: {
                    ...r.values,
                    container: target.container,
                    variety: target.variety,
                    productLot: target.productLot,
                }
            };
        });
    }

    console.log(`Updated ${salesUpdated} sales records, ${aftersalesUpdated} aftersales records.`);

    await prisma.processingGmpWorkspace.update({
        where: { ownerId },
        data: {
            data,
            revision: { increment: 1 }
        }
    });

    console.log('Workspace successfully updated in PostgreSQL database!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
