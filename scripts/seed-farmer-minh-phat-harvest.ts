import { prisma } from "../src/lib/prisma";
import bcryptjs from "bcryptjs";

async function main() {
    console.log("--- 1. Cập nhật mật khẩu tài khoản Nông dân Trần Văn Minh ---");
    const hashedPassword = await bcryptjs.hash("123456", 10);
    const farmer = await prisma.user.upsert({
        where: { phone: "0912345678" },
        update: {
            fullName: "Trần Văn Minh",
            email: "farmer@triviet.vn",
            password: hashedPassword,
            role: "FARMER",
            isApproved: true,
            accountStatus: "APPROVED",
        },
        create: {
            phone: "0912345678",
            fullName: "Trần Văn Minh",
            email: "farmer@triviet.vn",
            password: hashedPassword,
            role: "FARMER",
            isApproved: true,
            accountStatus: "APPROVED",
        },
    });
    console.log("Farmer User:", farmer.id, farmer.fullName, farmer.phone);

    console.log("--- 2. Kiểm tra Vườn sầu riêng Minh Phát ---");
    let farm = await prisma.farm.findFirst({
        where: { farmerId: farmer.id },
    });
    const region = await prisma.growingRegion.findFirst({
        where: { code: "MSVT-GACC-001" },
    });

    if (!farm) {
        farm = await prisma.farm.create({
            data: {
                farmerId: farmer.id,
                farmCode: "MSVT-TP-0001",
                farmName: "Vườn sầu riêng Minh Phát",
                address: "Ấp Phú Lộc, Xã Phú Lộc, Huyện Tân Phú, Tỉnh Đồng Nai",
                province: "Đồng Nai",
                district: "Tân Phú",
                ward: "Phú Lộc",
                areaSize: 3.2,
                totalTrees: 320,
                durianVariety: "Ri6",
                growingRegionId: region?.id || null,
                isActive: true,
            },
        });
    } else {
        await prisma.farm.update({
            where: { id: farm.id },
            data: {
                farmName: "Vườn sầu riêng Minh Phát",
                farmCode: "MSVT-TP-0001",
                durianVariety: "Ri6",
                growingRegionId: region?.id || farm.growingRegionId,
            },
        });
    }
    console.log("Farm:", farm.id, farm.farmName, farm.farmCode);

    console.log("--- 3. Lấy Vụ mùa hiện tại của vườn ---");
    let season = await prisma.cropSeason.findFirst({
        where: { farmId: farm.id, status: "ACTIVE" },
    });
    if (!season) {
        season = await prisma.cropSeason.findFirst({
            where: { farmId: farm.id },
        });
    }
    if (!season) {
        throw new Error("Không tìm thấy vụ mùa nào cho vườn!");
    }
    console.log("Season:", season.id, season.name);

    console.log("--- 4. Lấy cơ sở chế biến tiếp nhận ---");
    const facility = await prisma.partnerFacility.findFirst({
        where: { type: "PROCESSING_FACILITY", deletedAt: null },
    });
    const procUser = await prisma.user.findFirst({
        where: { role: "PROCESSING_FACILITY" },
    });

    console.log("--- 5. Tạo/Cập nhật Phiếu thu hoạch TH-20260829-002 ---");
    const harvestCode = "TH-20260829-002";
    const harvestData = {
        code: harvestCode,
        farmId: farm.id,
        farmerId: farmer.id,
        cropSeasonId: season.id,
        buyerType: "PROCESSING_FACILITY" as const,
        buyerFacilityId: facility?.id || null,
        buyerUserId: procUser?.id || null,
        status: "COMPLETED" as const,
        expectedHarvestDate: new Date("2026-08-29T00:00:00.000Z"),
        actualStartedAt: new Date("2026-08-29T06:00:00.000Z"),
        actualHarvestedAt: new Date("2026-08-29T08:30:00.000Z"),
        farmerDeliveredAt: new Date("2026-08-29T09:30:00.000Z"),
        buyerReceivedAt: new Date("2026-08-29T10:15:00.000Z"),
        completedAt: new Date("2026-08-29T11:00:00.000Z"),
        durianVariety: "Ri6",
        expectedWeight: 4.2,
        expectedSaleWeight: 4.2,
        weightUnit: "tấn",
        expectedPricePerKg: 88000,
        expectedFruitCount: 1400,
        deliveredWeight: 4200,
        actualWeight: 4200,
        actualFruitCount: 1400,
        receivedWeight: 4180,
        weightDifferenceReason: "Chênh lệch -20 kg so với khai báo (hao hụt vận chuyển tự nhiên < 0.5%)",
        deliveryMethod: "BUYER_PICKUP" as const,
        fruitCondition: "Đạt chuẩn tươi mới, gai xanh cứng, cuống tươi, độ brix > 32°Bx",
        actualNote: "Đã phân loại hoàn tất: Trái tươi 3.100 kg (1.030 trái), Chế biến 1.020 kg (340 trái), Loại bỏ 60 kg (20 trái). Xe 60B-991.22",
    };

    const existingHarvest = await prisma.harvestRecord.findFirst({
        where: { code: harvestCode },
    });

    let harvestRecord;
    if (existingHarvest) {
        harvestRecord = await prisma.harvestRecord.update({
            where: { id: existingHarvest.id },
            data: harvestData,
        });
        console.log("Updated harvest record:", harvestRecord.code);
    } else {
        harvestRecord = await prisma.harvestRecord.create({
            data: harvestData,
        });
        console.log("Created harvest record:", harvestRecord.code);
    }

    console.log("--- 6. Bổ sung nhật ký canh tác giai đoạn THU HOẠCH HOÀN TẤT & TRƯỚC THU HOẠCH ---");
    const logsToAdd = [
        {
            stage: "PRE_HARVEST",
            actionDate: new Date("2026-08-15T08:00:00.000Z"),
            activityType: "TRACK_FRUIT",
            notes: "Đo độ brix và kiểm tra độ già của trái trên cây. Độ brix đạt 31.5°Bx, cơm bắt đầu chuyển màu vàng đồng đều, gõ âm thanh trầm đục.",
            isGACCCompliant: true,
            phiDays: 20,
        },
        {
            stage: "PRE_HARVEST",
            actionDate: new Date("2026-08-22T07:30:00.000Z"),
            activityType: "PEST_INSPECTION",
            notes: "Kiểm dịch sâu bệnh và xác nhận thời gian cách ly thuốc BVTV (PHI > 21 ngày). Không có rệp sáp, không vết nấm xì mủ, đủ điều kiện thu hoạch xuất khẩu.",
            isGACCCompliant: true,
            phiDays: 21,
        },
        {
            stage: "HARVEST",
            actionDate: new Date("2026-08-28T06:30:00.000Z"),
            activityType: "HARVEST",
            notes: "Thu hoạch chính thức đợt 1: Cắt trái già đạt độ chín 8.5 - 9 tuổi tại các cây khu A và B. Tổng sản lượng cắt đạt 4.200 kg (khoảng 1.400 trái sầu riêng Ri6).",
            isGACCCompliant: true,
            phiDays: 27,
        },
        {
            stage: "HARVEST",
            actionDate: new Date("2026-08-29T07:00:00.000Z"),
            activityType: "FRUIT_GRADING",
            notes: "Tập kết tại nhà sơ chế sân vườn: Lau sạch bụi phấn vỏ, cắt tỉa cuống đều 3-5 cm, phân loại kiểm tra sơ bộ đạt tiêu chuẩn VietGAP & GACC.",
            isGACCCompliant: true,
            phiDays: 28,
        },
        {
            stage: "HARVEST",
            actionDate: new Date("2026-08-29T09:00:00.000Z"),
            activityType: "OTHER",
            otherActivity: "Bàn giao vận chuyển",
            notes: "Bốc dỡ sọt sầu riêng lên xe tải 60B-991.22 giao cho Cơ sở Chế biến Sầu riêng Trị An theo phiếu TH-20260829-002. Tổng khối lượng giao: 4.200 kg.",
            isGACCCompliant: true,
            phiDays: 28,
        },
        {
            stage: "HARVEST",
            actionDate: new Date("2026-08-30T08:00:00.000Z"),
            activityType: "GARDEN_SANITATION",
            notes: "Hoàn tất thu hoạch vụ mùa: Vệ sinh vườn, thu gom cành khô và quả rụng, quét dọn sạch mặt luống chuẩn bị chu kỳ bón phân phục hồi cây.",
            isGACCCompliant: true,
            phiDays: 0,
        },
    ];

    for (const log of logsToAdd) {
        const existing = await prisma.farmingLog.findFirst({
            where: {
                cropSeasonId: season.id,
                stage: log.stage as any,
                activityType: log.activityType as any,
                notes: log.notes,
            },
        });
        const existingWithHarvest = await prisma.farmingLog.findFirst({
            where: { harvestRecordId: harvestRecord.id },
        });

        if (!existing) {
            await prisma.farmingLog.create({
                data: {
                    farmId: farm.id,
                    cropSeasonId: season.id,
                    stage: log.stage as any,
                    actionDate: log.actionDate,
                    activityType: log.activityType as any,
                    otherActivity: log.otherActivity || null,
                    notes: log.notes,
                    isGACCCompliant: log.isGACCCompliant,
                    phiDays: log.phiDays,
                    harvestRecordId: !existingWithHarvest && log.activityType === "HARVEST" ? harvestRecord.id : null,
                },
            });
            console.log("Created log:", log.stage, log.activityType);
        } else {
            console.log("Log already exists:", log.stage, log.activityType);
        }
    }

    console.log("✅ Đã cập nhật thành công dữ liệu Vườn, Nhật ký canh tác giai đoạn thu hoạch và Phiếu thu hoạch!");
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
