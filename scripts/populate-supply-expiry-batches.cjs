require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRODUCT_DEFINITIONS = [
    {
        names: ["Phân bón NPK Đầu Trâu 16-16-8+TE"],
        storeProductId: "seed-sp-npk-16168",
        productName: "Phân bón Đầu Trâu NPK 16-16-8+TE",
        type: "FERTILIZER",
        unit: "bao 50kg",
        manufacturer: "Công ty CP Phân bón Bình Điền",
        supplier: "Công ty CP Phân bón Bình Điền",
        batchCode: "LOT-DT16168-2025",
        mfgDate: "2025-10-15T00:00:00.000Z",
        expDate: "2027-10-15T00:00:00.000Z", // 2 năm
    },
    {
        names: ["Phân hữu cơ vi sinh Humic King"],
        storeProductId: "seed-sp-humic-king",
        productName: "Phân hữu cơ vi sinh Humic King",
        type: "FERTILIZER",
        unit: "bao 25kg",
        manufacturer: "Humic King Co., Ltd",
        supplier: "Công ty CP Nông nghiệp Xanh",
        batchCode: "LOT-HUMIC-2025",
        mfgDate: "2025-08-20T00:00:00.000Z",
        expDate: "2027-08-20T00:00:00.000Z",
    },
    {
        names: ["Phân bón lá Canxi Bo Sữa"],
        storeProductId: "seed-sp-canxi-bo",
        productName: "Phân bón lá Canxi Bo Sữa Chống Rụng Trái",
        type: "FERTILIZER",
        unit: "chai 1L",
        manufacturer: "EuroChem Vietnam",
        supplier: "Công ty TNHH Hóa sinh Nông nghiệp",
        batchCode: "LOT-CANXIBO-2025",
        mfgDate: "2025-09-10T00:00:00.000Z",
        expDate: "2027-09-10T00:00:00.000Z",
    },
    {
        names: ["Thuốc trừ nấm bệnh Champion 77WP", "Champion 77WP"],
        storeProductId: "seed-sp-copper",
        productName: "Thuốc trừ nấm gốc đồng Champion 77WP",
        type: "PESTICIDE",
        unit: "gói 500g",
        manufacturer: "Nufarm Vietnam",
        supplier: "Công ty TNHH Nufarm Limited",
        batchCode: "LOT-CHAMP77-2025",
        mfgDate: "2025-11-05T00:00:00.000Z",
        expDate: "2027-11-05T00:00:00.000Z",
    },
    {
        names: ["Thuốc trừ bệnh Tilt Super 300EC", "Tilt Super 300EC"],
        storeProductId: "seed-sp-tiltsuper-300ec",
        productName: "Thuốc trừ bệnh Tilt Super 300EC",
        type: "PESTICIDE",
        unit: "chai 250ml",
        manufacturer: "Syngenta Crop Protection AG",
        supplier: "Công ty TNHH Syngenta Việt Nam",
        batchCode: "LOT-TILTSUP-2025",
        mfgDate: "2025-12-01T00:00:00.000Z",
        expDate: "2027-12-01T00:00:00.000Z",
    },
    {
        names: ["Thuốc trừ sâu rầy Radiant 60SC", "Radiant 60SC"],
        storeProductId: "seed-sp-radiant-60sc",
        productName: "Thuốc trừ rầy bọ trĩ Radiant 60SC",
        type: "PESTICIDE",
        unit: "gói 15ml",
        manufacturer: "Corteva Agriscience Vietnam",
        supplier: "Corteva Agriscience",
        batchCode: "LOT-RADIANT-2025",
        mfgDate: "2025-10-25T00:00:00.000Z",
        expDate: "2027-10-25T00:00:00.000Z",
    },
    {
        names: ["Bình xịt điện 20L Oshima"],
        storeProductId: "seed-sp-binh-xit-oshima",
        productName: "Bình xịt điện Oshima 20L bơm đôi cực mạnh",
        type: "EQUIPMENT",
        unit: "cái",
        manufacturer: "Oshima Japan Technology",
        supplier: "Công ty TNHH Thương mại Oshima",
        batchCode: "LOT-OSHIMA-2025",
        mfgDate: "2025-05-01T00:00:00.000Z",
        expDate: "2030-05-01T00:00:00.000Z", // Niên hạn thiết bị 5 năm
    },
    {
        names: ["Mancozeb Xanh 80WP"],
        storeProductId: "seed-sp-mancozeb-80wp",
        productName: "Thuốc trừ nấm Mancozeb Xanh 80WP",
        type: "PESTICIDE",
        unit: "gói 1kg",
        manufacturer: "UPL Vietnam",
        supplier: "Công ty TNHH UPL Việt Nam",
        batchCode: "LOT-MANCOZEB-2025",
        mfgDate: "2025-11-12T00:00:00.000Z",
        expDate: "2027-11-12T00:00:00.000Z",
    },
    {
        names: ["Metalaxyl 35WP"],
        storeProductId: "seed-sp-metalaxyl-35wp",
        productName: "Thuốc đặc trị nấm Metalaxyl 35WP",
        type: "PESTICIDE",
        unit: "gói 500g",
        manufacturer: "Công ty CP Đầu tư Hợp Trí",
        supplier: "Hợp Trí AG",
        batchCode: "LOT-METALAXYL-2025",
        mfgDate: "2025-10-18T00:00:00.000Z",
        expDate: "2027-10-18T00:00:00.000Z",
    },
    {
        names: ["Phân NPK 20-20-15 Ba Con Cò"],
        storeProductId: "seed-sp-npk-202015",
        productName: "Phân bón Đầu Trâu NPK 20-20-15 + TE",
        type: "FERTILIZER",
        unit: "bao 50kg",
        manufacturer: "Công ty CP Phân bón Ba Con Cò",
        supplier: "Ba Con Cò Corp",
        batchCode: "LOT-BCC202015-2025",
        mfgDate: "2025-09-15T00:00:00.000Z",
        expDate: "2027-09-15T00:00:00.000Z",
    },
    {
        names: ["Phân chuồng ủ hoai mục"],
        storeProductId: "seed-sp-organic",
        productName: "Phân hữu cơ vi sinh Sông Gianh",
        type: "FERTILIZER",
        unit: "bao 25kg",
        manufacturer: "Nông hộ tự ủ sinh học",
        supplier: "Hợp tác xã Nông nghiệp Trị An",
        batchCode: "LOT-PHANCHUONG-2025",
        mfgDate: "2025-06-01T00:00:00.000Z",
        expDate: "2027-06-01T00:00:00.000Z",
    },
    {
        names: ["Abamectin 3.6EC"],
        storeProductId: "seed-sp-abamectin-36ec",
        productName: "Thuốc trừ sâu sinh học Abamectin 3.6EC",
        type: "PESTICIDE",
        unit: "chai 450ml",
        manufacturer: "Công ty CP BVTV Sài Gòn",
        supplier: "SPC Vietnam",
        batchCode: "LOT-ABAMECTIN-2025",
        mfgDate: "2025-10-10T00:00:00.000Z",
        expDate: "2027-10-10T00:00:00.000Z",
    },
    {
        names: ["Phân Kali Sunfat K2SO4"],
        storeProductId: "seed-sp-k2so4",
        productName: "Phân Kali Sulphate K2SO4 Haifa Multi-K",
        type: "FERTILIZER",
        unit: "bao 25kg",
        manufacturer: "Haifa Chemicals Ltd (Israel)",
        supplier: "Công ty TNHH Xuất Nhập khẩu Hóa chất Nông nghiệp",
        batchCode: "LOT-K2SO4-2025",
        mfgDate: "2025-08-15T00:00:00.000Z",
        expDate: "2027-08-15T00:00:00.000Z",
    },
    {
        names: ["Thuốc BVTV truy xuất Demo 1"],
        storeProductId: "cmt6qoy3f000qwc2qkqzhsgr3",
        productName: "Thuốc BVTV truy xuất Demo 1",
        type: "PESTICIDE",
        unit: "chai",
        manufacturer: "TriViet Demo",
        supplier: "Nhà cung cấp Demo",
        batchCode: "PB-STORE-1-ACTIVE",
        mfgDate: "2026-01-01T00:00:00.000Z",
        expDate: "2027-12-31T00:00:00.000Z",
    },
    {
        names: ["Thuốc BVTV truy xuất Demo 2"],
        storeProductId: "cmt6qoy4s000ywc2qa5237ard",
        productName: "Thuốc BVTV truy xuất Demo 2",
        type: "PESTICIDE",
        unit: "chai",
        manufacturer: "TriViet Demo",
        supplier: "Nhà cung cấp Demo",
        batchCode: "PB-STORE-2-ACTIVE",
        mfgDate: "2026-01-01T00:00:00.000Z",
        expDate: "2027-12-31T00:00:00.000Z",
    },
];

async function main() {
    const store = await prisma.store.findFirst({
        where: { id: "seed-store-tri-an" },
    }) || await prisma.store.findFirst();

    if (!store) {
        throw new Error("No store found to link products");
    }
    console.log(`Using Store: ${store.name} (${store.id})`);

    let updatedSuppliesCount = 0;

    for (const def of PRODUCT_DEFINITIONS) {
        // 1. Ensure StoreProduct exists
        let sp = await prisma.storeProduct.findUnique({ where: { id: def.storeProductId } });
        if (!sp) {
            sp = await prisma.storeProduct.upsert({
                where: { id: def.storeProductId },
                update: {},
                create: {
                    id: def.storeProductId,
                    storeId: store.id,
                    name: def.productName,
                    type: def.type,
                    manufacturer: def.manufacturer,
                    unit: def.unit.split(" ")[0] || "cái",
                    price: 150000,
                    costPrice: 100000,
                    stock: 500,
                    status: "APPROVED",
                },
            });
            console.log(`Created StoreProduct: ${sp.name} (${sp.id})`);
        }

        // 2. Ensure ProductBatch exists
        const batch = await prisma.productBatch.upsert({
            where: { batchCode: def.batchCode },
            update: {
                expiryDate: new Date(def.expDate),
                manufacturingDate: new Date(def.mfgDate),
                status: "ACTIVE",
            },
            create: {
                batchCode: def.batchCode,
                storeProductId: sp.id,
                supplierName: def.supplier,
                manufacturerName: def.manufacturer,
                manufacturingDate: new Date(def.mfgDate),
                expiryDate: new Date(def.expDate),
                receivedQuantity: 1000,
                remainingQuantity: 850,
                status: "ACTIVE",
            },
        });
        console.log(`ProductBatch: ${batch.batchCode} -> Expiry: ${batch.expiryDate.toISOString().split("T")[0]}`);

        // 3. Link all matching farmer supplies
        const res = await prisma.farmerSupply.updateMany({
            where: {
                name: { in: def.names },
            },
            data: {
                productBatchId: batch.id,
                productId: sp.id,
                storeId: store.id,
            },
        });
        console.log(`  Updated ${res.count} supplies matching [${def.names.join(", ")}]`);
        updatedSuppliesCount += res.count;
    }

    console.log(`\nDone! Total supplies updated: ${updatedSuppliesCount}`);

    // Verify
    const suppliesWithoutBatch = await prisma.farmerSupply.count({
        where: { productBatchId: null },
    });
    console.log(`Supplies still without batch: ${suppliesWithoutBatch}`);

    const suppliesWithExpiry = await prisma.farmerSupply.count({
        where: {
            productBatch: {
                expiryDate: { not: null },
            },
        },
    });
    console.log(`Supplies with valid expiryDate: ${suppliesWithExpiry}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
