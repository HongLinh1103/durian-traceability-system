import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("=========================================================================");
    console.log("CHUẨN HÓA NIÊN VỤ VÀ MỐC THỜI GIAN NHẬT KÝ CANH TÁC CHO TÀI KHOẢN NÔNG DÂN");
    console.log("=========================================================================\n");

    const farms = await prisma.farm.findMany({
        where: { isActive: true },
        include: {
            farmer: true,
            cropSeasons: {
                orderBy: [{ year: "asc" }, { sequence: "asc" }],
                include: {
                    farmingLogs: true,
                    pestMonitoringBooks: {
                        include: {
                            traps: true,
                            inspections: {
                                include: { items: true },
                            },
                        },
                    },
                    farmerSupplyTransactions: true,
                    farmerExpenses: true,
                },
            },
        },
    });

    console.log(`Tìm thấy ${farms.length} vườn trong hệ thống.\n`);

    for (const farm of farms) {
        console.log(`\n🏡 Vườn: ${farm.farmName} (${farm.farmCode}) - Chủ vườn: ${farm.farmer?.fullName || farm.farmer?.phone || "Chưa gán"}`);

        // ---------------------------------------------------------------------
        // 1. CHUẨN HÓA VỤ LỊCH SỬ -> "Niên vụ 2024-2025" [CLOSED]
        // ---------------------------------------------------------------------
        let season2025 = farm.cropSeasons.find(
            (s) => s.status === "CLOSED" || s.year === 2025 || s.name.includes("2025")
        );

        if (season2025) {
            season2025 = await prisma.cropSeason.update({
                where: { id: season2025.id },
                data: {
                    name: "Niên vụ 2024-2025",
                    year: 2025,
                    sequence: 1,
                    status: "CLOSED",
                    startedAt: new Date("2024-08-01T00:00:00Z"),
                    closedAt: new Date("2025-05-30T23:59:59Z"),
                    expectedEndAt: new Date("2025-05-31T23:59:59Z"),
                    notes: "Niên vụ 2024-2025 đã hoàn thành thu hoạch thắng lợi, năng suất đạt 14.5 tấn/ha theo tiêu chuẩn VietGAP xuất khẩu GACC.",
                },
                include: {
                    farmingLogs: true,
                    pestMonitoringBooks: { include: { traps: true, inspections: { include: { items: true } } } },
                    farmerSupplyTransactions: true,
                    farmerExpenses: true,
                },
            });
            console.log(`  ✅ Đã cập nhật Niên vụ 2024-2025 [CLOSED] (ID: ${season2025.id})`);
        } else {
            // Tạo mới Niên vụ 2024-2025 nếu chưa có
            season2025 = await prisma.cropSeason.create({
                data: {
                    farmId: farm.id,
                    name: "Niên vụ 2024-2025",
                    year: 2025,
                    sequence: 1,
                    status: "CLOSED",
                    startedAt: new Date("2024-08-01T00:00:00Z"),
                    closedAt: new Date("2025-05-30T23:59:59Z"),
                    expectedEndAt: new Date("2025-05-31T23:59:59Z"),
                    notes: "Niên vụ 2024-2025 đã hoàn thành thu hoạch thắng lợi, năng suất đạt 14.5 tấn/ha theo tiêu chuẩn VietGAP xuất khẩu GACC.",
                },
                include: {
                    farmingLogs: true,
                    pestMonitoringBooks: { include: { traps: true, inspections: { include: { items: true } } } },
                    farmerSupplyTransactions: true,
                    farmerExpenses: true,
                },
            });
            console.log(`  ➕ Đã tạo mới Niên vụ 2024-2025 [CLOSED] (ID: ${season2025.id})`);
        }

        // ---------------------------------------------------------------------
        // 2. CHUẨN HÓA VỤ HOẠT ĐỘNG -> "Niên vụ 2025-2026" [ACTIVE]
        // ---------------------------------------------------------------------
        let season2026 = farm.cropSeasons.find(
            (s) => s.id !== season2025?.id && (s.status === "ACTIVE" || s.year === 2027 || s.year === 2026 || s.name.includes("2026") || s.name.includes("2027"))
        );

        if (season2026) {
            season2026 = await prisma.cropSeason.update({
                where: { id: season2026.id },
                data: {
                    name: "Niên vụ 2025-2026",
                    year: 2026,
                    sequence: 1,
                    status: "ACTIVE",
                    startedAt: new Date("2025-08-01T00:00:00Z"),
                    closedAt: null,
                    expectedEndAt: new Date("2026-08-31T23:59:59Z"),
                    notes: "Niên vụ 2025-2026 đang canh tác, thực hiện theo tiêu chuẩn VietGAP xuất khẩu GACC.",
                },
                include: {
                    farmingLogs: true,
                    pestMonitoringBooks: { include: { traps: true, inspections: { include: { items: true } } } },
                    farmerSupplyTransactions: true,
                    farmerExpenses: true,
                },
            });
            console.log(`  ✅ Đã cập nhật Niên vụ 2025-2026 [ACTIVE] (ID: ${season2026.id})`);
        } else {
            season2026 = await prisma.cropSeason.create({
                data: {
                    farmId: farm.id,
                    name: "Niên vụ 2025-2026",
                    year: 2026,
                    sequence: 1,
                    status: "ACTIVE",
                    startedAt: new Date("2025-08-01T00:00:00Z"),
                    expectedEndAt: new Date("2026-08-31T23:59:59Z"),
                    notes: "Niên vụ 2025-2026 đang canh tác, thực hiện theo tiêu chuẩn VietGAP xuất khẩu GACC.",
                },
                include: {
                    farmingLogs: true,
                    pestMonitoringBooks: { include: { traps: true, inspections: { include: { items: true } } } },
                    farmerSupplyTransactions: true,
                    farmerExpenses: true,
                },
            });
            console.log(`  ➕ Đã tạo mới Niên vụ 2025-2026 [ACTIVE] (ID: ${season2026.id})`);
        }

        // ---------------------------------------------------------------------
        // 3. ĐIỀU CHỈNH CÁC MỐC THỜI GIAN NHẬT KÝ CHO "Niên vụ 2025-2026"
        // ---------------------------------------------------------------------
        const activeLogs = await prisma.farmingLog.findMany({
            where: { cropSeasonId: season2026.id },
            orderBy: { actionDate: "asc" },
        });

        let adjustedCount = 0;
        for (const log of activeLogs) {
            const currentYear = log.actionDate.getFullYear();
            let newActionDate = new Date(log.actionDate);
            let updated = false;

            // Nếu nhật ký rơi vào cuối năm 2026 (>= tháng 8) hoặc năm 2027:
            // Lùi lại 1 năm để đúng chu kỳ niên vụ 2025-2026 (tháng 8/2025 -> tháng 6/2026)
            if (currentYear === 2027 || (currentYear === 2026 && log.actionDate.getMonth() >= 7)) {
                newActionDate.setFullYear(currentYear - 1);
                updated = true;
            }

            // Đồng thời chuẩn hóa nội dung ghi chú nếu có chữ 2027
            let updatedNotes = log.notes;
            if (updatedNotes && updatedNotes.includes("2027")) {
                updatedNotes = updatedNotes.replace(/vụ mùa mới 2027/g, "niên vụ mới 2025-2026")
                    .replace(/vụ mùa 2027/g, "niên vụ 2025-2026")
                    .replace(/vụ 2027/g, "niên vụ 2025-2026")
                    .replace(/2027/g, "2026");
                updated = true;
            }

            if (updated) {
                await prisma.farmingLog.update({
                    where: { id: log.id },
                    data: {
                        actionDate: newActionDate,
                        notes: updatedNotes,
                    },
                });
                adjustedCount++;
            }
        }
        if (adjustedCount > 0) {
            console.log(`    🕒 Đã điều chỉnh mốc thời gian cho ${adjustedCount} nhật ký canh tác của Niên vụ 2025-2026`);
        }

        // Nếu vườn chưa có nhật ký nào cho Niên vụ 2025-2026, tạo bộ nhật ký mẫu chuẩn
        const currentActiveLogsCount = await prisma.farmingLog.count({
            where: { cropSeasonId: season2026.id },
        });

        if (currentActiveLogsCount === 0) {
            const standardLogs = [
                {
                    stage: "POST_HARVEST_RECOVERY" as const,
                    actionDate: new Date("2025-08-10T08:00:00Z"),
                    activityType: "PRUNE" as const,
                    chemicalName: "Vôi nông nghiệp + Coc 85",
                    dosage: "Quét gốc và cành",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Rửa vườn, cắt tỉa cành vô hiệu, tạo độ thông thoáng đầu niên vụ mới 2025-2026.",
                    images: [],
                },
                {
                    stage: "POST_HARVEST_RECOVERY" as const,
                    actionDate: new Date("2025-08-20T07:30:00Z"),
                    activityType: "BASE_FERTILIZING" as const,
                    chemicalName: "Phân chuồng ủ hoai mục + Vi sinh Trichoderma",
                    dosage: "25 kg / gốc",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Bón lót cải tạo đất, nâng pH đất lên mức tối ưu 5.8 - 6.5.",
                    images: [],
                },
                {
                    stage: "MAKING_SPROUT" as const,
                    actionDate: new Date("2025-09-15T08:00:00Z"),
                    activityType: "SHOOT_MANAGEMENT" as const,
                    chemicalName: "Phân bón lá Amino 6000 + Vi lượng",
                    dosage: "500ml / 400 lít",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Kéo đọt 1 bung đều và mập đọt.",
                    images: [],
                },
                {
                    stage: "MAKING_SPROUT" as const,
                    actionDate: new Date("2025-10-05T07:00:00Z"),
                    activityType: "FERTILIZE" as const,
                    chemicalName: "NPK 20-20-15 Đầu Trâu",
                    dosage: "1.5 kg / cây",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Bón gốc nuôi cơi đọt 2 phát triển xanh mướt.",
                    images: [],
                },
                {
                    stage: "FLOWER_INDUCTION" as const,
                    actionDate: new Date("2025-11-15T08:00:00Z"),
                    activityType: "WATER_STRESS" as const,
                    notes: "Bắt đầu xiết nước tạo khô hạn ép ra hoa.",
                    images: [],
                },
                {
                    stage: "FLOWERING" as const,
                    actionDate: new Date("2026-01-10T08:30:00Z"),
                    activityType: "FLOWER_THINNING" as const,
                    notes: "Mắt cua ra đồng loạt, tiến hành tỉa hoa đợt 1.",
                    images: [],
                },
                {
                    stage: "FLOWERING" as const,
                    actionDate: new Date("2026-01-22T19:00:00Z"),
                    activityType: "POLLINATION" as const,
                    notes: "Thụ phấn nhân tạo bổ sung vào buổi tối.",
                    images: [],
                },
                {
                    stage: "FRUIT_SETTING" as const,
                    actionDate: new Date("2026-02-15T07:30:00Z"),
                    activityType: "FRUIT_THINNING" as const,
                    notes: "Tỉa trái non đợt 1 sau xổ nhụy 20 ngày.",
                    images: [],
                },
                {
                    stage: "FRUIT_GROWING" as const,
                    actionDate: new Date("2026-03-01T08:00:00Z"),
                    activityType: "BRANCH_SUPPORT" as const,
                    notes: "Cột dây neo cành mang trái chuẩn bị cho giai đoạn nuôi trái lớn.",
                    images: [],
                },
            ];

            for (const log of standardLogs) {
                await prisma.farmingLog.create({
                    data: {
                        farmId: farm.id,
                        cropSeasonId: season2026.id,
                        stage: log.stage,
                        actionDate: log.actionDate,
                        activityType: log.activityType,
                        chemicalName: (log as any).chemicalName || null,
                        dosage: (log as any).dosage || null,
                        phiDays: (log as any).phiDays || 0,
                        isGACCCompliant: true,
                        notes: log.notes,
                        images: log.images,
                    },
                });
            }
            console.log(`    ➕ Đã tạo 9 nhật ký canh tác chuẩn cho Niên vụ 2025-2026`);
        }

        // Đảm bảo Niên vụ 2024-2025 có đủ nhật ký lịch sử
        const logs2025Count = await prisma.farmingLog.count({
            where: { cropSeasonId: season2025.id },
        });

        if (logs2025Count === 0) {
            const logs2025 = [
                { stage: "POST_HARVEST_RECOVERY" as const, actionDate: new Date("2024-08-15T08:30:00Z"), activityType: "PRUNE" as const, chemicalName: "Vôi tôi + Đồng Sunfat Bordeaux", dosage: "Quét thân cây và vết cắt cành", phiDays: 0, isGACCCompliant: true, notes: "Cắt tỉa toàn bộ cành khô, cành sâu bệnh, cành tăm trong tán. Quét gốc phòng ngừa xì mủ nấm Phytophthora.", images: ["https://images.unsplash.com/photo-1592417817098-8f3d6ef23a67?w=600&auto=format&fit=crop&q=80"] },
                { stage: "POST_HARVEST_RECOVERY" as const, actionDate: new Date("2024-08-25T07:00:00Z"), activityType: "BASE_FERTILIZING" as const, chemicalName: "Phân hữu cơ vi sinh Quế Lâm 01 + Trichoderma", dosage: "30 kg / gốc", phiDays: 0, isGACCCompliant: true, notes: "Bón lót phục hồi rễ sau vụ thu hoạch trước, kích hoạt hệ vi sinh vật đối kháng.", images: [] },
                { stage: "POST_HARVEST_RECOVERY" as const, actionDate: new Date("2024-09-10T06:30:00Z"), activityType: "IRRIGATE" as const, notes: "Tưới đẫm xả phèn và kích rễ tơ phát triển trở lại.", images: [] },
                { stage: "MAKING_SPROUT" as const, actionDate: new Date("2024-09-22T08:00:00Z"), activityType: "SHOOT_MANAGEMENT" as const, chemicalName: "Amino Acid hữu cơ Seaweed + Vi lượng Chelate", dosage: "1 lít / 600 lít nước", phiDays: 0, isGACCCompliant: true, notes: "Phun kéo cơi đọt 1, giúp lá non mở đều, phiến lá dày xanh bóng.", images: [] },
                { stage: "MAKING_SPROUT" as const, actionDate: new Date("2024-10-05T07:00:00Z"), activityType: "SPRAY_PESTICIDE" as const, chemicalName: "Radiant 60SC (Spinetoram)", dosage: "15ml / 20 lít nước", phiDays: 3, isGACCCompliant: true, notes: "Phun phòng ngừa rầy nhảy (rầy xanh) và bọ trĩ phá hại cơi đọt non.", images: [] },
                { stage: "MAKING_SPROUT" as const, actionDate: new Date("2024-10-20T08:00:00Z"), activityType: "FERTILIZE" as const, chemicalName: "NPK 20-20-15+TE Đầu Trâu", dosage: "1.5 kg / gốc", phiDays: 0, isGACCCompliant: true, notes: "Bón đón cơi đọt thứ 2, tạo bộ khung lá đủ khỏe để chuẩn bị làm bông.", images: [] },
                { stage: "FLOWER_INDUCTION" as const, actionDate: new Date("2024-11-08T08:00:00Z"), activityType: "FLOWER_INDUCTION" as const, chemicalName: "MKP (0-52-34) Haifa + Lân 86", dosage: "1 kg MKP + 500g Lân 86 / 200 lít", phiDays: 0, isGACCCompliant: true, notes: "Phun ủ mầm hoa lần 1, chặn đọt già hóa nhanh, phân hóa mầm hoa rõ rệt.", images: [] },
                { stage: "FLOWER_INDUCTION" as const, actionDate: new Date("2024-11-20T07:00:00Z"), activityType: "WATER_STRESS" as const, notes: "Bắt đầu xiết nước triệt để quanh bồn cây, quét sạch lá khô tạo khô hạn cưỡng bức.", images: [] },
                { stage: "FLOWER_INDUCTION" as const, actionDate: new Date("2024-12-05T08:30:00Z"), activityType: "IRRIGATE" as const, notes: "Mắt cua đã nhú sáng 70-80% toàn vườn. Tưới nhử nước nhẹ quanh rìa tán.", images: [] },
                { stage: "FLOWERING" as const, actionDate: new Date("2024-12-20T08:00:00Z"), activityType: "FLOWER_THINNING" as const, notes: "Tỉa hoa đợt 1: Cắt bỏ chùm hoa đầu cành, hoa sát thân chính, giữ lại chùm hoa giữa cành cấp 1 to khỏe.", images: [] },
                { stage: "FLOWERING" as const, actionDate: new Date("2025-01-08T07:30:00Z"), activityType: "SPRAY_PESTICIDE" as const, chemicalName: "Score 250EC + Antracol 70WP", dosage: "Pha đúng liều khuyến cáo", phiDays: 7, isGACCCompliant: true, notes: "Phun ngừa thán thư bông và khô bông trước khi hoa nở rộ.", images: [] },
                { stage: "FLOWERING" as const, actionDate: new Date("2025-01-20T19:30:00Z"), activityType: "POLLINATION" as const, notes: "Tiến hành quét phấn bổ sung lúc 19h - 21h đêm bằng chổi lông gà, tăng tỷ lệ đậu trái tròn đều.", images: [] },
                { stage: "FRUIT_SETTING" as const, actionDate: new Date("2025-02-10T08:00:00Z"), activityType: "FRUIT_THINNING" as const, notes: "Tỉa trái non đợt 1 (trái bằng trứng ngỗng): Cắt bỏ trái méo mó, trái cuống nhỏ, trái bị sâu gai.", images: [] },
                { stage: "FRUIT_SETTING" as const, actionDate: new Date("2025-02-25T08:00:00Z"), activityType: "FRUIT_THINNING" as const, notes: "Tỉa trái đợt 2: Định hình mỗi cành giữ từ 2 - 4 trái đều hộc, cuống to khỏe, cân đối tán cây.", images: [] },
                { stage: "FRUIT_GROWING" as const, actionDate: new Date("2025-03-15T07:00:00Z"), activityType: "FERTILIZE" as const, chemicalName: "NPK 12-11-18 YaraMila Winner", dosage: "2 kg / gốc", phiDays: 0, isGACCCompliant: true, notes: "Bón gốc thúc nuôi trái lớn nhanh, tăng độ dày vỏ và hạn chế bể gai.", images: [] },
                { stage: "FRUIT_GROWING" as const, actionDate: new Date("2025-04-02T08:00:00Z"), activityType: "BRANCH_SUPPORT" as const, notes: "Buộc dây nilon chịu lực neo trái vào cành mẹ, chống gãy cành khi gặp giông gió mùa mưa.", images: [] },
                { stage: "FRUIT_GROWING" as const, actionDate: new Date("2025-04-20T07:30:00Z"), activityType: "FOLIAR_FERTILIZING" as const, chemicalName: "Canxi Bo Sữa + Kali hữu cơ đậm đặc", dosage: "500ml / 400 lít", phiDays: 0, isGACCCompliant: true, notes: "Phun dưỡng cơm, chống nứt gai, giúp cơm vàng hạt lép và ngọt thơm.", images: [] },
                { stage: "PRE_HARVEST" as const, actionDate: new Date("2025-05-05T08:30:00Z"), activityType: "PEST_INSPECTION" as const, notes: "Kiểm tra mẫu trái toàn vườn, đo độ ngọt Brix, kiểm tra dịch hại kiểm dịch trước thu hoạch.", images: [] },
                { stage: "HARVEST" as const, actionDate: new Date("2025-05-20T06:00:00Z"), activityType: "HARVEST" as const, notes: "Thu hoạch đợt 1: Cắt trái đạt tuổi chín 8.5 - 9 tuổi, xuất bán cho công ty thu mua xuất khẩu.", images: [] },
                { stage: "HARVEST" as const, actionDate: new Date("2025-05-28T06:30:00Z"), activityType: "HARVEST" as const, notes: "Thu hoạch vét dứt điểm đợt 2: Hoàn tất thu hoạch toàn bộ vườn niên vụ 2024-2025.", images: [] },
            ];

            for (const log of logs2025) {
                await prisma.farmingLog.create({
                    data: {
                        farmId: farm.id,
                        cropSeasonId: season2025.id,
                        stage: log.stage,
                        actionDate: log.actionDate,
                        activityType: log.activityType,
                        chemicalName: (log as any).chemicalName || null,
                        dosage: (log as any).dosage || null,
                        phiDays: (log as any).phiDays || 0,
                        isGACCCompliant: true,
                        notes: log.notes,
                        images: log.images,
                    },
                });
            }
            console.log(`    ➕ Đã tạo 20 nhật ký canh tác chuẩn cho Niên vụ 2024-2025`);
        }

        // ---------------------------------------------------------------------
        // 4. ĐIỀU CHỈNH SỔ THEO DÕI SINH VẬT GÂY HẠI CHO "Niên vụ 2025-2026"
        // ---------------------------------------------------------------------
        for (const book of season2026.pestMonitoringBooks) {
            // Cập nhật ngày bắt đầu sổ
            await prisma.pestMonitoringBook.update({
                where: { id: book.id },
                data: {
                    startDate: new Date("2025-09-01T00:00:00Z"),
                    notes: book.notes?.replace(/2027/g, "2025-2026") || "Sổ theo dõi sinh vật gây hại niên vụ 2025-2026",
                },
            });

            // Cập nhật bẫy
            for (const trap of book.traps) {
                await prisma.pestTrap.update({
                    where: { id: trap.id },
                    data: { installedDate: new Date("2025-09-01T08:00:00Z") },
                });
            }

            // Cập nhật ngày điều tra nếu đang ở 2026-10..2027-03
            for (const insp of book.inspections) {
                const inspYear = insp.inspectionDate.getFullYear();
                if (inspYear === 2027 || (inspYear === 2026 && insp.inspectionDate.getMonth() >= 7)) {
                    const newDate = new Date(insp.inspectionDate);
                    newDate.setFullYear(inspYear - 1);
                    await prisma.pestInspection.update({
                        where: { id: insp.id },
                        data: { inspectionDate: newDate },
                    });
                }
            }
        }

        // ---------------------------------------------------------------------
        // 5. ĐIỀU CHỈNH GIAO DỊCH XUẤT KHO VẬT TƯ & CHI PHÍ CHO Niên vụ 2025-2026
        // ---------------------------------------------------------------------
        for (const tx of season2026.farmerSupplyTransactions) {
            const txYear = tx.actionDate.getFullYear();
            if (txYear === 2026 && tx.actionDate.getMonth() >= 7) {
                const newDate = new Date(tx.actionDate);
                newDate.setFullYear(2025);
                await prisma.farmerSupplyTransaction.update({
                    where: { id: tx.id },
                    data: { actionDate: newDate },
                });
            }
        }

        for (const exp of season2026.farmerExpenses) {
            const expYear = exp.expenseDate.getFullYear();
            if (expYear === 2026 && exp.expenseDate.getMonth() >= 7) {
                const newDate = new Date(exp.expenseDate);
                newDate.setFullYear(2025);
                await prisma.farmerExpense.update({
                    where: { id: exp.id },
                    data: { expenseDate: newDate },
                });
            }
        }
    }

    // Dọn dẹp các vụ mùa mồ côi hoặc trùng lặp nếu có
    console.log("\n🧹 Kiểm tra các mùa vụ khác trong hệ thống...");
    const otherSeasons = await prisma.cropSeason.findMany({
        where: {
            name: {
                notIn: ["Niên vụ 2024-2025", "Niên vụ 2025-2026"],
            },
        },
    });

    for (const s of otherSeasons) {
        if (s.name.includes("2025") || s.year === 2025) {
            await prisma.cropSeason.update({
                where: { id: s.id },
                data: { name: "Niên vụ 2024-2025", year: 2025 },
            });
            console.log(`  + Đã đổi tên vụ ${s.id} sang "Niên vụ 2024-2025"`);
        } else if (s.name.includes("2026") || s.name.includes("2027") || s.year === 2026 || s.year === 2027) {
            await prisma.cropSeason.update({
                where: { id: s.id },
                data: { name: "Niên vụ 2025-2026", year: 2026 },
            });
            console.log(`  + Đã đổi tên vụ ${s.id} sang "Niên vụ 2025-2026"`);
        }
    }

    console.log("\n=========================================================================");
    console.log("🎉 HOÀN THÀNH: ĐÃ CHUẨN HÓA TOÀN BỘ NIÊN VỤ VÀ MỐC THỜI GIAN NHẬT KÝ!");
    console.log("=========================================================================");
}

main()
    .catch((e) => {
        console.error("Lỗi:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
