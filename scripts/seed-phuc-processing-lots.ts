import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("=== THỰC HIỆN NHẬP LIỆU CHẾ BIẾN & ĐÓNG GÓI CHO TÀI KHOẢN LÊ VĂN PHÚC ===");

    // 1. Tìm thông tin nông dân Lê Văn Phúc
    const farmer = await prisma.user.findFirst({
        where: {
            OR: [
                { phone: "0908123456" },
                { email: "levanphuc.phuan@triviet.vn" },
                { fullName: { contains: "Lê Văn Phúc" } },
            ],
        },
    });

    if (!farmer) {
        throw new Error("Không tìm thấy tài khoản nông dân Lê Văn Phúc");
    }
    console.log(`- Nông dân: ${farmer.fullName} (${farmer.phone})`);

    // 2. Tìm cơ sở chế biến
    const facility = await prisma.partnerFacility.findFirst({
        where: { type: "PROCESSING_FACILITY", deletedAt: null },
        include: { owner: true },
    });

    if (!facility) {
        throw new Error("Không tìm thấy Cơ sở Chế biến");
    }
    console.log(`- Cơ sở chế biến: ${facility.name} (Chủ sở hữu: ${facility.owner.fullName})`);

    // 3. Tìm lô nguyên liệu của Lê Văn Phúc (RM-TH-20260901-001)
    const rawLot = await prisma.rawMaterialLot.findFirst({
        where: {
            lotCode: "RM-TH-20260901-001",
        },
        include: {
            rawMaterialReceipt: {
                include: {
                    sourceHarvestLot: {
                        include: { farm: true, harvestRecord: { include: { farmer: true, farm: true } } },
                    },
                },
            },
        },
    });

    if (!rawLot) {
        throw new Error("Không tìm thấy lô nguyên liệu RM-TH-20260901-001 của Lê Văn Phúc");
    }
    console.log(`- Lô nguyên liệu: ${rawLot.lotCode} (Khối lượng tươi: ${rawLot.freshExportWeight} kg, Chế biến: ${rawLot.processingWeight} kg)`);

    // Thời gian hoàn tất theo yêu cầu: 17:13 ngày 04/09/2026 (GMT+7) => 2026-09-04T10:13:00.000Z
    const completedAt = new Date("2026-09-04T10:13:00.000Z");

    // =========================================================================
    // FORM 1: ĐÓNG GÓI TRÁI TƯƠI XUẤT KHẨU
    // Khối lượng thành phẩm: 788 kg
    // Quy cách: 3 trái/thùng
    // Số thùng: 84 thùng
    // Hoàn tất lúc: 17:13 ngày 04/09/2026
    // =========================================================================
    console.log("\n--- THỰC HIỆN FORM 1: ĐÓNG GÓI TRÁI TƯƠI ---");
    const freshBatchCode = "PK-RM-TH-20260901-001";
    const freshLotCode = "FP-PK-TH-20260901-001";

    let freshBatch = await prisma.processingBatch.findUnique({
        where: { batchCode: freshBatchCode },
    });

    if (!freshBatch) {
        freshBatch = await prisma.processingBatch.create({
            data: {
                batchCode: freshBatchCode,
                facilityId: facility.id,
                method: "Đóng gói trái tươi xuất khẩu",
                targetProduct: "Sầu riêng tươi xuất khẩu",
                startedAt: completedAt,
                completedAt: completedAt,
                supervisorId: facility.ownerId,
                totalInputWeight: 788,
                totalOutputWeight: 788,
                lossWeight: 0,
                yieldPercent: 100,
                status: "COMPLETED",
                note: "Đóng gói trái tươi xuất khẩu · Quy cách: 3 trái/thùng · Số thùng: 84 thùng",
                createdAt: completedAt,
                updatedAt: completedAt,
            },
        });
    } else {
        freshBatch = await prisma.processingBatch.update({
            where: { id: freshBatch.id },
            data: {
                totalInputWeight: 788,
                totalOutputWeight: 788,
                lossWeight: 0,
                yieldPercent: 100,
                startedAt: completedAt,
                completedAt: completedAt,
                status: "COMPLETED",
                note: "Đóng gói trái tươi xuất khẩu · Quy cách: 3 trái/thùng · Số thùng: 84 thùng",
                updatedAt: completedAt,
            },
        });
    }

    // ProcessingBatchInput
    await prisma.processingBatchInput.upsert({
        where: {
            processingBatchId_rawMaterialLotId: {
                processingBatchId: freshBatch.id,
                rawMaterialLotId: rawLot.id,
            },
        },
        create: {
            processingBatchId: freshBatch.id,
            rawMaterialLotId: rawLot.id,
            inputWeight: 788,
            createdAt: completedAt,
        },
        update: {
            inputWeight: 788,
        },
    });

    // FinishedProductLot (Fresh)
    const freshFinishedLot = await prisma.finishedProductLot.upsert({
        where: { lotCode: freshLotCode },
        create: {
            lotCode: freshLotCode,
            processingBatchId: freshBatch.id,
            facilityId: facility.id,
            productName: "Sầu riêng tươi xuất khẩu",
            productType: "FRESH_DURIAN",
            branch: "FRESH_PACKED",
            quantity: 788,
            netWeight: 788,
            remainingWeight: 788,
            manufacturedAt: completedAt,
            packaging: "3 trái/thùng",
            status: "READY_FOR_DISTRIBUTION",
            createdAt: completedAt,
            updatedAt: completedAt,
        },
        update: {
            processingBatchId: freshBatch.id,
            quantity: 788,
            netWeight: 788,
            remainingWeight: 788,
            manufacturedAt: completedAt,
            packaging: "3 trái/thùng",
            status: "READY_FOR_DISTRIBUTION",
            updatedAt: completedAt,
        },
    });

    console.log(`✓ Đã lưu Lô đóng gói tươi: ${freshFinishedLot.lotCode} (788 kg, 84 thùng, 3 trái/thùng)`);

    // =========================================================================
    // FORM 2: CHẾ BIẾN BÓC MÚI & CẤP ĐÔNG
    // Phương pháp chế biến: Bóc múi & cấp đông
    // Tên thành phẩm: Cơm sầu riêng bóc múi hút chân không (Khay 500g)
    // Khối lượng thành phẩm: 109 kg
    // Số lượng thành phẩm: 218 khay
    // Hoàn tất lúc: 17:13 ngày 04/09/2026
    // =========================================================================
    console.log("\n--- THỰC HIỆN FORM 2: CHẾ BIẾN BÓC MÚI & CẤP ĐÔNG ---");
    const procBatchCode = "PB-PROC-TH-20260901-001";
    const procLotCode = "FP-PROC-TH-20260901-001";

    let procBatch = await prisma.processingBatch.findUnique({
        where: { batchCode: procBatchCode },
    });

    if (!procBatch) {
        procBatch = await prisma.processingBatch.create({
            data: {
                batchCode: procBatchCode,
                facilityId: facility.id,
                method: "Bóc múi & cấp đông",
                targetProduct: "Cơm sầu riêng bóc múi hút chân không (Khay 500g)",
                startedAt: completedAt,
                completedAt: completedAt,
                supervisorId: facility.ownerId,
                totalInputWeight: 241,
                totalOutputWeight: 109,
                lossWeight: 132,
                yieldPercent: 45.23,
                status: "COMPLETED",
                note: "Bóc múi & cấp đông · Số lượng thành phẩm: 218 khay (Khay 500g)",
                createdAt: completedAt,
                updatedAt: completedAt,
            },
        });
    } else {
        procBatch = await prisma.processingBatch.update({
            where: { id: procBatch.id },
            data: {
                method: "Bóc múi & cấp đông",
                targetProduct: "Cơm sầu riêng bóc múi hút chân không (Khay 500g)",
                totalInputWeight: 241,
                totalOutputWeight: 109,
                lossWeight: 132,
                yieldPercent: 45.23,
                startedAt: completedAt,
                completedAt: completedAt,
                status: "COMPLETED",
                note: "Bóc múi & cấp đông · Số lượng thành phẩm: 218 khay (Khay 500g)",
                updatedAt: completedAt,
            },
        });
    }

    // ProcessingBatchInput
    await prisma.processingBatchInput.upsert({
        where: {
            processingBatchId_rawMaterialLotId: {
                processingBatchId: procBatch.id,
                rawMaterialLotId: rawLot.id,
            },
        },
        create: {
            processingBatchId: procBatch.id,
            rawMaterialLotId: rawLot.id,
            inputWeight: 241,
            createdAt: completedAt,
        },
        update: {
            inputWeight: 241,
        },
    });

    // FinishedProductLot (Processed)
    const procFinishedLot = await prisma.finishedProductLot.upsert({
        where: { lotCode: procLotCode },
        create: {
            lotCode: procLotCode,
            processingBatchId: procBatch.id,
            facilityId: facility.id,
            productName: "Cơm sầu riêng bóc múi hút chân không (Khay 500g)",
            productType: "PROCESSED_DURIAN",
            branch: "PROCESSED",
            quantity: 218,
            netWeight: 109,
            remainingWeight: 109,
            manufacturedAt: completedAt,
            packaging: "Khay hút chân không 500g (218 khay)",
            status: "READY_FOR_DISTRIBUTION",
            createdAt: completedAt,
            updatedAt: completedAt,
        },
        update: {
            processingBatchId: procBatch.id,
            productName: "Cơm sầu riêng bóc múi hút chân không (Khay 500g)",
            quantity: 218,
            netWeight: 109,
            remainingWeight: 109,
            manufacturedAt: completedAt,
            packaging: "Khay hút chân không 500g (218 khay)",
            status: "READY_FOR_DISTRIBUTION",
            updatedAt: completedAt,
        },
    });

    console.log(`✓ Đã lưu Lô thành phẩm chế biến: ${procFinishedLot.lotCode} (109 kg, 218 khay)`);

    // 4. Cập nhật trạng thái lô nguyên liệu
    await prisma.rawMaterialLot.update({
        where: { id: rawLot.id },
        data: {
            currentWeight: 0,
            status: "USED",
            updatedAt: completedAt,
        },
    });
    console.log(`✓ Đã cập nhật lô nguyên liệu ${rawLot.lotCode} sang trạng thái USED (Đã sử dụng hết).`);

    // 5. Thêm / cập nhật TraceEvents
    await prisma.traceEvent.deleteMany({
        where: {
            OR: [
                { entityId: freshFinishedLot.id },
                { entityId: procFinishedLot.id },
                { entityId: freshBatch.id },
                { entityId: procBatch.id },
            ],
        },
    });

    await prisma.traceEvent.createMany({
        data: [
            {
                entityType: "PROCESSING_BATCH",
                entityId: freshBatch.id,
                eventType: "PACKAGING_COMPLETED",
                eventTime: completedAt,
                actorId: facility.ownerId,
                actorRole: "PROCESSING_FACILITY",
                organizationType: "PROCESSING_FACILITY",
                organizationId: facility.id,
                title: "Hoàn tất đóng gói thùng xuất khẩu",
                description: "Sầu riêng tươi xuất khẩu · Khối lượng: 788 kg · Quy cách: 3 trái/thùng · Số thùng: 84 thùng",
                sourceEntityType: "RAW_MATERIAL_LOT",
                sourceEntityId: rawLot.id,
                metadata: {
                    outputWeight: 788,
                    boxCount: 84,
                    packagingSpec: "3 trái/thùng",
                    farmerName: "Lê Văn Phúc",
                    farmName: "Vườn sầu riêng Phúc An",
                    completedAt: "2026-09-04T17:13:00+07:00",
                },
                isPublic: true,
                createdAt: completedAt,
            },
            {
                entityType: "PROCESSING_BATCH",
                entityId: procBatch.id,
                eventType: "PROCESSING_COMPLETED",
                eventTime: completedAt,
                actorId: facility.ownerId,
                actorRole: "PROCESSING_FACILITY",
                organizationType: "PROCESSING_FACILITY",
                organizationId: facility.id,
                title: "Hoàn tất bóc múi & cấp đông",
                description: "Cơm sầu riêng bóc múi hút chân không (Khay 500g) · Khối lượng: 109 kg · Số lượng: 218 khay",
                sourceEntityType: "RAW_MATERIAL_LOT",
                sourceEntityId: rawLot.id,
                metadata: {
                    method: "Bóc múi & cấp đông",
                    productName: "Cơm sầu riêng bóc múi hút chân không (Khay 500g)",
                    outputWeight: 109,
                    packageCount: "218 khay",
                    farmerName: "Lê Văn Phúc",
                    farmName: "Vườn sầu riêng Phúc An",
                    completedAt: "2026-09-04T17:13:00+07:00",
                },
                isPublic: true,
                createdAt: completedAt,
            },
        ],
    });

    console.log("✓ Đã tạo nhật ký truy xuất nguồn gốc (TraceEvent) cho cả 2 lô thành phẩm.");
    console.log("\n=== HOÀN TẤT NHẬP LIỆU THÀNH CÔNG ===");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
