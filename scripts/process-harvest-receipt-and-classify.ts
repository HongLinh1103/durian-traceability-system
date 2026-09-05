import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("=== THỰC HIỆN TIẾP NHẬN & PHÂN LOẠI MÃ PHIẾU TH-20260901-001 ===");

    // 1. Tìm thông tin Cơ sở Chế biến Sầu riêng Trị An
    const processingUser = await prisma.user.findFirst({
        where: {
            phone: "0909000003",
            role: "PROCESSING_FACILITY",
        },
    });

    if (!processingUser) {
        throw new Error("Không tìm thấy tài khoản Cơ sở Chế biến Sầu riêng Trị An (0909000003)");
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: {
            ownerId: processingUser.id,
            type: "PROCESSING_FACILITY",
            deletedAt: null,
        },
    });

    if (!facility) {
        throw new Error("Không tìm thấy Cơ sở Chế biến Sầu riêng Trị An");
    }

    console.log(`Cơ sở: ${facility.name} (ID: ${facility.id}, Chủ sở hữu: ${processingUser.fullName})`);

    // 2. Tìm phiếu thu hoạch TH-20260901-001
    const harvest = await prisma.harvestRecord.findFirst({
        where: { code: "TH-20260901-001" },
        include: { farm: true, farmer: true, varietyItems: true },
    });

    if (!harvest) {
        throw new Error("Không tìm thấy phiếu thu hoạch TH-20260901-001");
    }

    console.log(`Phiếu thu hoạch: ${harvest.code} từ nông dân ${harvest.farmer.fullName} - ${harvest.farm.farmName}`);
    console.log(`- Khối lượng khai báo ban đầu: ${harvest.expectedWeight} kg`);

    // 3. Thực hiện TIẾP NHẬN
    // Giờ tiếp nhận: 10:00 ngày 04/09/2026 (UTC: 2026-09-04T03:00:00.000Z)
    // Khối lượng tiếp nhận tăng 50 kg -> 1.050 kg (368 trái)
    const receivedAt = new Date("2026-09-04T03:00:00.000Z");
    const declaredWeight = Number(harvest.expectedWeight || 1000);
    const actualReceivedWeight = declaredWeight + 50; // 1050 kg (+50 kg)
    const actualFruitCount = 368;

    console.log("\n--- BƯỚC 1: TIẾP NHẬN NGUYÊN LIỆU ---");
    console.log(`- Thời gian tiếp nhận: 10:00 ngày 04/09/2026 (${receivedAt.toISOString()})`);
    console.log(`- Khối lượng thực nhận: ${actualReceivedWeight} kg (+50 kg so với dự kiến ${declaredWeight} kg)`);
    console.log(`- Số lượng trái: ${actualFruitCount} trái`);

    // Cập nhật phiếu thu hoạch sang COMPLETED
    await prisma.harvestRecord.update({
        where: { id: harvest.id },
        data: {
            buyerUserId: processingUser.id,
            buyerFacilityId: facility.id,
            buyerType: "PROCESSING_FACILITY",
            buyerReceivedAt: receivedAt,
            receivedWeight: actualReceivedWeight,
            actualFruitCount: actualFruitCount,
            actualWeight: actualReceivedWeight,
            deliveredWeight: declaredWeight,
            status: "COMPLETED",
            completedAt: receivedAt,
            farmerDeliveredAt: receivedAt,
            weightDifferenceReason: "Khối lượng thực nhận tại xưởng là 1.050 kg (tăng 50 kg so với dự kiến ban đầu 1.000 kg)",
            actualNote: "Cơ sở tiếp nhận đủ hàng tươi mới, gai xanh cứng, cuống tươi. Xe giao: 51D-123.45.",
            updatedAt: receivedAt,
        },
    });

    // Tạo hoặc cập nhật HarvestLot nếu chưa có
    let harvestLot = await prisma.harvestLot.findFirst({
        where: { harvestRecordId: harvest.id },
    });

    if (!harvestLot) {
        const season = harvest.cropSeasonId
            ? await prisma.cropSeason.findUnique({ where: { id: harvest.cropSeasonId } })
            : await prisma.cropSeason.findFirst({ where: { farmId: harvest.farmId } })
            ?? await prisma.cropSeason.findFirst({ orderBy: { createdAt: "desc" } });

        if (season) {
            harvestLot = await prisma.harvestLot.create({
                data: {
                    harvestRecordId: harvest.id,
                    lotCode: `HL-${harvest.code}`,
                    farmId: harvest.farmId,
                    cropSeasonId: season.id,
                    harvestedAt: receivedAt,
                    weight: actualReceivedWeight,
                    remainingWeight: 0,
                    complianceStatus: "PASS",
                    status: "USED",
                    finalizedAt: receivedAt,
                    createdAt: receivedAt,
                    updatedAt: receivedAt,
                },
            });
        }
    }

    // Tạo hoặc cập nhật RawMaterialReceipt
    const receiptCode = `RMR-${harvest.code}`;
    let receipt = await prisma.rawMaterialReceipt.findFirst({
        where: { receiptCode },
    });

    if (!receipt) {
        receipt = await prisma.rawMaterialReceipt.create({
            data: {
                receiptCode,
                sourceType: "HARVEST_LOT",
                sourceHarvestLotId: harvestLot?.id || null,
                facilityId: facility.id,
                dispatchedWeight: declaredWeight,
                receivedWeight: actualReceivedWeight,
                receivedAt: receivedAt,
                receivedById: processingUser.id,
                status: "QC_PENDING",
                note: `Nông dân giao: ${declaredWeight} kg\nThực nhận: ${actualReceivedWeight} kg (+50 kg)\nSố trái: ${actualFruitCount} trái\nXe giao: 51D-123.45`,
                createdAt: receivedAt,
                updatedAt: receivedAt,
            },
        });
    } else {
        receipt = await prisma.rawMaterialReceipt.update({
            where: { id: receipt.id },
            data: {
                dispatchedWeight: declaredWeight,
                receivedWeight: actualReceivedWeight,
                receivedAt: receivedAt,
                receivedById: processingUser.id,
                note: `Nông dân giao: ${declaredWeight} kg\nThực nhận: ${actualReceivedWeight} kg (+50 kg)\nSố trái: ${actualFruitCount} trái\nXe giao: 51D-123.45`,
                updatedAt: receivedAt,
            },
        });
    }

    // 4. Thực hiện PHÂN LOẠI TRÁI
    // Thời điểm phân loại: 10:30 ngày 04/09/2026 (UTC: 2026-09-04T03:30:00.000Z)
    const classifiedAt = new Date("2026-09-04T03:30:00.000Z");
    const freshExportWeight = 788; // 75%
    const freshExportFruitCount = 276;
    const processingWeight = 241; // 23%
    const processingFruitCount = 85;
    const rejectedWeight = 21; // 2%
    const rejectedFruitCount = 7;
    const direction = "SPLIT";

    console.log("\n--- BƯỚC 2: PHÂN LOẠI TRÁI NGUYÊN LIỆU ---");
    console.log(`- Thời gian phân loại: 10:30 ngày 04/09/2026 (${classifiedAt.toISOString()})`);
    console.log(`- Hướng phân loại: ${direction} (Vừa xuất tươi vừa chế biến cấp đông)`);
    console.log(`- Trái tươi xuất khẩu: ${freshExportWeight} kg (${freshExportFruitCount} trái)`);
    console.log(`- Chuyển chế biến cấp đông: ${processingWeight} kg (${processingFruitCount} trái)`);
    console.log(`- Loại bỏ (không đạt): ${rejectedWeight} kg (${rejectedFruitCount} trái)`);
    console.log(`- Tổng kiểm tra: ${freshExportWeight + processingWeight + rejectedWeight} kg / ${freshExportFruitCount + processingFruitCount + rejectedFruitCount} trái`);

    const rawLotCode = `RM-${harvest.code}`;
    let rawLot = await prisma.rawMaterialLot.findFirst({
        where: { lotCode: rawLotCode },
    });

    if (!rawLot) {
        rawLot = await prisma.rawMaterialLot.create({
            data: {
                lotCode: rawLotCode,
                facilityId: facility.id,
                rawMaterialReceiptId: receipt.id,
                acceptedWeight: actualReceivedWeight,
                currentWeight: processingWeight,
                status: "AVAILABLE",
                direction,
                freshExportWeight,
                processingWeight,
                classifiedAt,
                classifiedById: processingUser.id,
                createdAt: receivedAt,
                updatedAt: classifiedAt,
            },
        });
    } else {
        rawLot = await prisma.rawMaterialLot.update({
            where: { id: rawLot.id },
            data: {
                acceptedWeight: actualReceivedWeight,
                currentWeight: processingWeight,
                status: "AVAILABLE",
                direction,
                freshExportWeight,
                processingWeight,
                classifiedAt,
                classifiedById: processingUser.id,
                updatedAt: classifiedAt,
            },
        });
    }

    // 5. Cập nhật TraceEvent truy xuất nguồn gốc
    const fruitSummary = `Trái tươi: ${freshExportFruitCount} trái · Chế biến: ${processingFruitCount} trái · Loại bỏ: ${rejectedFruitCount} trái`;

    await prisma.traceEvent.deleteMany({
        where: {
            entityId: rawLot.id,
            eventType: "RAW_MATERIAL_CLASSIFIED",
        },
    });

    await prisma.traceEvent.create({
        data: {
            entityType: "RAW_MATERIAL_LOT",
            entityId: rawLot.id,
            eventType: "RAW_MATERIAL_CLASSIFIED",
            eventTime: classifiedAt,
            actorId: processingUser.id,
            actorRole: "PROCESSING_FACILITY",
            organizationType: "PROCESSING_FACILITY",
            organizationId: facility.id,
            title: "Tiếp nhận và phân loại nguyên liệu",
            description: `Trái tươi xuất khẩu: ${freshExportWeight.toLocaleString("vi-VN")} kg (${freshExportFruitCount} trái) · Chuyển chế biến: ${processingWeight.toLocaleString("vi-VN")} kg (${processingFruitCount} trái) · Không đạt/loại bỏ: ${rejectedWeight.toLocaleString("vi-VN")} kg (${rejectedFruitCount} trái)`,
            metadata: {
                direction,
                freshExportWeight,
                processingWeight,
                rejectedWeight,
                freshExportFruitCount,
                processingFruitCount,
                rejectedFruitCount,
                totalActualWeight: actualReceivedWeight,
                fruitSummary,
                note: "Phân loại chất lượng trái sầu riêng Ri6: chọn trái đều múi đẹp cho xuất khẩu tươi, trái lệch hộc đưa vào tách múi cấp đông.",
            },
            isPublic: true,
            createdAt: classifiedAt,
        },
    });

    console.log("\n=== HOÀN TẤT THÀNH CÔNG ===");
    console.log(`Lô nguyên liệu ${rawLot.lotCode} đã sẵn sàng ở cả 2 nhánh: Xuất tươi (${freshExportWeight} kg) và Chế biến (${processingWeight} kg).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
