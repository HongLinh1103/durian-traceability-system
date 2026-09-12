import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("=== BẮT ĐẦU ĐỒNG BỘ NHẬT KÝ CANH TÁC & SỔ THEO DÕI SINH VẬT GÂY HẠI ===");

    // Kích hoạt tất cả các vườn (kể cả Út Được) để nông dân có thể ghi nhật ký và xem sổ theo dõi
    await prisma.farm.updateMany({
        data: { isActive: true, status: "ACTIVE" },
    });

    const farms = await prisma.farm.findMany({
        include: {
            farmer: true,
            cropSeasons: true,
        },
    });

    console.log(`Tìm thấy ${farms.length} vườn hoạt động.`);

    for (const farm of farms) {
        if (!farm.farmerId) continue;
        console.log(`\n🌿 Đang xử lý vườn: ${farm.farmName} (${farm.farmCode}) - Chủ vườn: ${farm.farmer?.fullName || farm.farmer?.phone}`);

        const baseLat = farm.latitude || 12.6937455;
        const baseLng = farm.longitude || 108.2948055;
        const inspectorName = farm.farmer?.fullName || "Chủ vườn";

        // 1. NIÊN VỤ 2024-2025
        let season2025 = farm.cropSeasons.find((s) => s.name === "2024-2025" || s.name.includes("2024-2025"));
        if (!season2025) {
            season2025 = await prisma.cropSeason.create({
                data: {
                    farmId: farm.id,
                    name: "2024-2025",
                    year: 2025,
                    sequence: 1,
                    status: "CLOSED",
                    startedAt: new Date("2024-08-01T00:00:00Z"),
                    closedAt: new Date("2025-05-30T23:59:59Z"),
                    expectedEndAt: new Date("2025-05-31T23:59:59Z"),
                    notes: "Niên vụ 2024-2025 đạt chuẩn VietGAP.",
                },
            });
        }

        // 2. NIÊN VỤ 2025-2026
        let season2026 = farm.cropSeasons.find((s) => s.name === "2025-2026" || s.name.includes("2025-2026"));
        if (!season2026) {
            season2026 = await prisma.cropSeason.create({
                data: {
                    farmId: farm.id,
                    name: "2025-2026",
                    year: 2026,
                    sequence: 1,
                    status: "ACTIVE",
                    startedAt: new Date("2025-08-01T00:00:00Z"),
                    expectedEndAt: new Date("2026-08-31T23:59:59Z"),
                    notes: "Niên vụ 2025-2026 đang canh tác theo chuẩn VietGAP / GACC.",
                },
            });
        }

        // =====================================================================
        // XỬ LÝ NIÊN VỤ 2024-2025
        // =====================================================================
        // Xóa sạch nhật ký cũ của vụ 2024-2025 để tái thiết đồng bộ chuẩn xác
        await prisma.pestTreatment.deleteMany({
            where: { monitoringBook: { farmId: farm.id, cropSeasonId: season2025.id } },
        });
        await prisma.farmingLog.deleteMany({
            where: { farmId: farm.id, cropSeasonId: season2025.id },
        });

        // Định nghĩa 24 nhật ký canh tác cho niên vụ 2024-2025
        const logsData2025 = [
            {
                actionDate: new Date("2024-08-15T08:30:00Z"),
                stage: "POST_HARVEST_RECOVERY" as const,
                activityType: "PRUNE" as const,
                chemicalName: "Vôi tôi + Đồng Sunfat Bordeaux",
                dosage: "Quét gốc và thân",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Cắt tỉa toàn bộ cành khô, cành sâu bệnh, cành tăm trong tán. Quét gốc phòng ngừa nấm nứt thân xì mủ.",
            },
            {
                actionDate: new Date("2024-08-25T07:00:00Z"),
                stage: "POST_HARVEST_RECOVERY" as const,
                activityType: "BASE_FERTILIZING" as const,
                chemicalName: "Phân hữu cơ vi sinh Quế Lâm 01 + Trichoderma",
                dosage: "20 kg / gốc",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Bón rải đều quanh tán cây kết hợp tưới vi sinh đối kháng Trichoderma kích thích tái tạo rễ tơ.",
            },
            {
                actionDate: new Date("2024-09-05T08:00:00Z"),
                stage: "POST_HARVEST_RECOVERY" as const,
                activityType: "IRRIGATE" as const,
                pestsDetected: "Không phát hiện",
                notes: "Tưới đẫm nước toàn vườn bằng hệ thống béc tưới tự động, duy trì ẩm độ đất 65-70%.",
            },
            {
                actionDate: new Date("2024-09-20T08:00:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "SHOOT_MANAGEMENT" as const,
                chemicalName: "Phân bón lá Humic Acid + Rong biển Seaweed",
                dosage: "500ml / 400 lít nước",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Phun ướt đều tán lá kích cơi đọt thứ nhất phát triển đồng loạt, lá dày bóng.",
            },
            {
                actionDate: new Date("2024-10-02T07:30:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "FERTILIZE" as const,
                chemicalName: "NPK YaraMila Complex 12-11-18",
                dosage: "1.5 kg / gốc",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Bón gốc bổ sung dinh dưỡng đa lượng thúc đẩy cơi đọt thành thục nhanh và đồng đều.",
            },
            {
                actionDate: new Date("2024-10-15T08:30:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Rầy xanh (3-5 con/chồi non), Bọ trĩ",
                notes: "Điều tra sinh vật gây hại đợt 1: Phát hiện rầy xanh và bọ trĩ mật độ 3-5 con/chồi non gây quăn mép lá non. Đề xuất phun chế phẩm sinh học bảo vệ đọt.",
            },
            {
                actionDate: new Date("2024-10-18T16:30:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "SPRAY_PESTICIDE" as const,
                chemicalName: "Sinh học Radiant 60SC (Spinetoram)",
                dosage: "15ml / bình 16 lít",
                phiDays: 7,
                pestsDetected: "Rầy xanh-Bọ trĩ",
                notes: "Phun phòng trừ rầy xanh và bọ trĩ gây xoăn lá đọt non. Đọt ra đều, sạch sâu bệnh sau xử lý.",
            },
            {
                actionDate: new Date("2024-11-10T08:00:00Z"),
                stage: "FLOWER_INDUCTION" as const,
                activityType: "WATER_STRESS" as const,
                pestsDetected: "Không phát hiện",
                notes: "Dọn sạch cỏ rác trong bồn gốc, ngừng tưới nước (xiết nước tạo hạn) 20-25 ngày để cây phân hóa mầm hoa.",
            },
            {
                actionDate: new Date("2024-11-12T08:00:00Z"),
                stage: "FLOWER_INDUCTION" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Ruồi đục trái",
                notes: "Kiểm tra bẫy bả ruồi đục trái định kỳ: Ghi nhận 6 con ruồi đục trái (Bactrocera dorsalis) trong bẫy Pheromone. Đề xuất phun bả protein sinh học dẫn dụ quanh tán.",
            },
            {
                actionDate: new Date("2024-11-15T07:30:00Z"),
                stage: "FLOWER_INDUCTION" as const,
                activityType: "SPRAY_PESTICIDE" as const,
                chemicalName: "Bả protein Ento-Pro 150DD",
                dosage: "50ml bả + 1 lít nước (phun điểm 1m2/cây)",
                phiDays: 3,
                pestsDetected: "Ruồi đục trái",
                notes: "Phun bả dẫn dụ sinh học protein Ento-Pro 150DD tiêu diệt ruồi đục trái theo sổ theo dõi dịch hại.",
            },
            {
                actionDate: new Date("2024-11-28T08:00:00Z"),
                stage: "FLOWER_INDUCTION" as const,
                activityType: "FLOWER_INDUCTION" as const,
                chemicalName: "Phân bón lá MKP 0-52-34 Haifa",
                dosage: "1 kg / 200 lít nước",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Phun ức chế ngọn non, già hóa bộ lá và thúc đẩy mầm hoa dạng 'mắt cua' bung đều khắp cành cấp 1.",
            },
            {
                actionDate: new Date("2025-01-05T08:00:00Z"),
                stage: "FLOWERING" as const,
                activityType: "IRRIGATE" as const,
                pestsDetected: "Không phát hiện",
                notes: "Mắt cua đã nhú sáng 3cm khắp các cành mang trái. Bắt đầu tưới nhấp nước nhẹ 20-30% lượng bình thường.",
            },
            {
                actionDate: new Date("2025-01-18T08:30:00Z"),
                stage: "FLOWERING" as const,
                activityType: "FLOWER_THINNING" as const,
                pestsDetected: "Không phát hiện",
                notes: "Tỉa bớt các chùm hoa ở đầu cành, chùm hoa sát thân và chùm hoa dị dạng, chỉ để lại chùm hoa giữa cành khỏe.",
            },
            {
                actionDate: new Date("2025-01-26T18:30:00Z"),
                stage: "FLOWERING" as const,
                activityType: "POLLINATION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Thụ phấn bổ sung nhân tạo lúc 18h30 - 20h30 khi hoa nở rộ. Dùng chổi mềm quét phấn chéo giữa các cây.",
            },
            {
                actionDate: new Date("2025-02-12T07:30:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "FRUIT_THINNING" as const,
                pestsDetected: "Không phát hiện",
                notes: "Tỉa trái non đợt 1 sau khi đậu trái 3 tuần: Cắt bỏ các trái dị dạng, trái méo mó, trái bị sâu đục nhỏ.",
            },
            {
                actionDate: new Date("2025-02-22T08:00:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "FOLIAR_FERTILIZING" as const,
                chemicalName: "Canxi Bo Chelate + Amino Acid Hữu Cơ",
                dosage: "250ml / 200 lít nước",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Phun dưỡng trái non chống rụng trái sinh lý và giúp dai cuống.",
            },
            {
                actionDate: new Date("2025-03-10T08:00:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "FRUIT_THINNING" as const,
                pestsDetected: "Không phát hiện",
                notes: "Tỉa trái non đợt 2: Định hình số lượng trái ổn định trên cây (chọn giữ 60-80 trái/cây tùy sức cây).",
            },
            {
                actionDate: new Date("2025-03-24T08:00:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Ruồi đục trái, Sâu đục trái",
                notes: "Điều tra sinh vật gây hại định kỳ: Bẫy Pheromone ghi nhận 9 con ruồi đục trái. Phát hiện rải rác vết sâu đục trái non. Cần phun bả protein và chế phẩm sinh học khẩn cấp.",
            },
            {
                actionDate: new Date("2025-03-25T07:30:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "BRANCH_SUPPORT" as const,
                chemicalName: "Dây nilon đan chịu lực",
                pestsDetected: "Không phát hiện",
                notes: "Cột dây neo chống đỡ cành mang nhiều trái lớn vào thân chính, tránh gãy đổ cành khi có dông gió.",
            },
            {
                actionDate: new Date("2025-03-26T07:00:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "SPRAY_PESTICIDE" as const,
                chemicalName: "Bả protein Ento-Pro 150DD + Spinosad",
                dosage: "40ml bả / cây",
                phiDays: 3,
                pestsDetected: "Ruồi đục trái, Sâu đục trái",
                notes: "Phun bả protein sinh học kết hợp Spinosad phòng trừ ruồi đục trái và sâu đục trái, bảo vệ an toàn cho mùa thu hoạch.",
            },
            {
                actionDate: new Date("2025-04-08T07:00:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "FERTILIZE" as const,
                chemicalName: "NPK Kali Sunfat YaraMila Winner 15-09-20 (SOP)",
                dosage: "2 kg / cây",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Bón gốc thúc nuôi cơm dày, hạn chế sượng cơm và tăng phẩm chất ngọt béo thơm đặc trưng.",
            },
            {
                actionDate: new Date("2025-05-02T08:30:00Z"),
                stage: "PRE_HARVEST" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Kiểm tra dư lượng an toàn PHI trước thu hoạch 21 ngày và kiểm tra dịch hại kiểm dịch GACC: Không phát hiện sâu bệnh gây hại, vườn sạch đạt chuẩn xuất khẩu.",
            },
            {
                actionDate: new Date("2025-05-22T06:00:00Z"),
                stage: "HARVEST" as const,
                activityType: "HARVEST" as const,
                pestsDetected: "Không phát hiện",
                notes: "Thu hoạch đợt chính vụ: Cắt các trái sầu riêng đạt độ chín 8.5 tuổi (gai nở đều, cuống thơm). Sản lượng đạt 12.5 tấn.",
            },
            {
                actionDate: new Date("2025-05-23T10:00:00Z"),
                stage: "HARVEST" as const,
                activityType: "FRUIT_GRADING" as const,
                pestsDetected: "Không phát hiện",
                notes: "Phân loại chất lượng xuất khẩu: Trái loại A đạt 82%, Loại B đạt 15%, Dạt loại C 3%. Bàn giao HTX xuất khẩu theo mã MSVT.",
            },
            {
                actionDate: new Date("2025-05-28T08:00:00Z"),
                stage: "HARVEST" as const,
                activityType: "GARDEN_SANITATION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Thu dọn tàn dư sau thu hoạch, dọn sạch dây neo, khép lại vụ mùa 2024-2025 thành công.",
            },
        ];

        const createdLogs2025: any[] = [];
        for (const l of logsData2025) {
            const created = await prisma.farmingLog.create({
                data: {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: l.stage,
                    actionDate: l.actionDate,
                    activityType: l.activityType,
                    chemicalName: (l as any).chemicalName || null,
                    dosage: (l as any).dosage || null,
                    phiDays: (l as any).phiDays ?? null,
                    pestsDetected: l.pestsDetected,
                    isGACCCompliant: true,
                    notes: l.notes,
                    images: [],
                },
            });
            createdLogs2025.push(created);
        }
        console.log(`  + Đã tạo ${createdLogs2025.length} nhật ký canh tác cho Niên vụ 2024-2025`);

        // TÌM HOẶC TẠO SỔ THEO DÕI SINH VẬT GÂY HẠI CHO VỤ 2024-2025
        let book2025 = await prisma.pestMonitoringBook.findFirst({
            where: { farmId: farm.id, cropSeasonId: season2025.id, pestName: "Ruồi đục trái" },
        });

        if (!book2025) {
            book2025 = await prisma.pestMonitoringBook.create({
                data: {
                    farmerId: farm.farmerId,
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    pestName: "Ruồi đục trái",
                    scientificName: "Bactrocera dorsalis",
                    trapType: "Bẫy lồng Pheromone",
                    attractant: "Pheromone Methyl Eugenol",
                    startDate: new Date("2024-09-01T00:00:00Z"),
                    checkFrequencyDays: 7,
                    status: "CLOSED",
                    notes: "Sổ theo dõi ruồi đục trái toàn diện niên vụ 2024-2025 theo tiêu chuẩn giám sát dịch hại kiểm dịch GACC.",
                },
            });
        }

        // TẠO HOẶC LẤY BẪY
        let traps2025 = await prisma.pestTrap.findMany({ where: { monitoringBookId: book2025.id } });
        if (traps2025.length === 0) {
            const t1 = await prisma.pestTrap.create({
                data: {
                    monitoringBookId: book2025.id,
                    trapCode: "BAY-01",
                    trapType: "Bẫy lồng",
                    locationName: "Khu A - Hàng 3 Cây 5",
                    latitude: baseLat + 0.00012,
                    longitude: baseLng + 0.00015,
                    installedDate: new Date("2024-09-01T08:00:00Z"),
                    status: "ACTIVE",
                    notes: "Treo cành tán ngoài, cao 1.8m so với mặt đất, hướng gió chính.",
                },
            });
            const t2 = await prisma.pestTrap.create({
                data: {
                    monitoringBookId: book2025.id,
                    trapCode: "BAY-02",
                    trapType: "Bẫy lồng",
                    locationName: "Khu B - Hàng 8 Cây 12",
                    latitude: baseLat - 0.00021,
                    longitude: baseLng + 0.00034,
                    installedDate: new Date("2024-09-01T08:30:00Z"),
                    status: "ACTIVE",
                    notes: "Treo vị trí râm mát giữa vườn, cách bẫy 01 khoảng 50m.",
                },
            });
            const t3 = await prisma.pestTrap.create({
                data: {
                    monitoringBookId: book2025.id,
                    trapCode: "BAY-03",
                    trapType: "Bẫy lồng",
                    locationName: "Khu C - Giáp ranh mương nước",
                    latitude: baseLat + 0.00035,
                    longitude: baseLng - 0.00018,
                    installedDate: new Date("2024-09-01T09:00:00Z"),
                    status: "ACTIVE",
                    notes: "Khu vực ẩm ướt giáp bờ bao vườn.",
                },
            });
            traps2025 = [t1, t2, t3];
        }

        // TÁI LẬP CÁC ĐỢT ĐIỀU TRA (INSPECTIONS) TRÙNG KHỚP THỜI GIAN NHẬT KÝ
        await prisma.pestInspection.deleteMany({ where: { monitoringBookId: book2025.id } });

        const inspections2025 = [
            { date: "2024-09-08", counts: [0, 0, 0], note: "Mồi mới nạp, bẫy sạch sẽ" },
            { date: "2024-09-15", counts: [0, 1, 0], note: "Phát hiện 1 con ở BAY-02, mật độ an toàn" },
            { date: "2024-10-06", counts: [1, 0, 1], note: "Bổ sung thêm bông tẩm chất dẫn dụ Pheromone" },
            { date: "2024-11-12", counts: [2, 1, 3], note: "Mật độ tăng nhẹ giai đoạn làm hoa (6 con). Trùng khớp nhật ký kiểm tra sâu bệnh ngày 12/11/2024." },
            { date: "2025-01-20", counts: [1, 2, 1], note: "Thời kỳ hoa nở, ruồi ít xuất hiện" },
            { date: "2025-03-04", counts: [0, 0, 0], note: "Bẫy sạch, mồi pheromone duy trì tốt" },
            { date: "2025-03-24", counts: [3, 2, 4], note: "Giai đoạn nuôi trái lớn, mật độ tăng (9 con). Đề xuất phun bả protein. Trùng khớp nhật ký kiểm tra sâu bệnh ngày 24/03/2025." },
            { date: "2025-04-15", counts: [1, 0, 1], note: "Sau khi phun bả protein, mật độ ruồi giảm mạnh" },
            { date: "2025-05-02", counts: [0, 0, 0], note: "Kiểm tra dịch hại an toàn trước thu hoạch 20 ngày. Trùng khớp nhật ký kiểm tra ngày 02/05/2025." },
        ];

        for (const insp of inspections2025) {
            const total = insp.counts.reduce((a, b) => a + b, 0);
            const createdInsp = await prisma.pestInspection.create({
                data: {
                    monitoringBookId: book2025.id,
                    inspectionDate: new Date(`${insp.date}T08:00:00Z`),
                    inspectorName,
                    weatherCondition: "Nắng nhẹ, gió nhẹ",
                    totalPestsCount: total,
                    densityLevel: total > 5 ? "Cao" : total > 2 ? "Trung bình" : "Thấp",
                    actionNeeded: total > 5,
                    notes: insp.note,
                },
            });

            if (traps2025[0]) {
                await prisma.pestInspectionItem.createMany({
                    data: traps2025.map((t, idx) => ({
                        inspectionId: createdInsp.id,
                        trapId: t.id,
                        pestsCount: insp.counts[idx] ?? 0,
                        baitStatus: "Còn tốt",
                        notes: "Bẫy hoạt động ổn định",
                    })),
                });
            }
        }

        // TẠO BIỆN PHÁP XỬ LÝ (TREATMENTS) LIÊN KẾT CHẶT CHẼ VỚI NHẬT KÝ CANH TÁC
        const sprayLog1_2025 = createdLogs2025.find((l) => l.actionDate.toISOString().startsWith("2024-11-15"));
        const sprayLog2_2025 = createdLogs2025.find((l) => l.actionDate.toISOString().startsWith("2025-03-26"));

        await prisma.pestTreatment.createMany({
            data: [
                {
                    monitoringBookId: book2025.id,
                    treatmentDate: new Date("2024-11-15T07:30:00Z"),
                    treatmentType: "Phun bả dẫn dụ sinh học",
                    productUsed: "Bả protein Ento-Pro 150DD",
                    dosage: "50ml bả + 1 lít nước (phun điểm 1m2/cây)",
                    areaTreated: "Toàn bộ khu B và khu C (1.2 ha)",
                    resultNotes: "Sau 3 ngày ruồi tập trung dính bả chết nhiều, kiểm soát tốt ổ dịch. Trùng khớp nhật ký phun thuốc ngày 15/11/2024.",
                    farmingLogId: sprayLog1_2025?.id ?? null,
                },
                {
                    monitoringBookId: book2025.id,
                    treatmentDate: new Date("2025-03-26T07:00:00Z"),
                    treatmentType: "Phun bả dẫn dụ sinh học",
                    productUsed: "Bả protein Ento-Pro 150DD + Spinosad",
                    dosage: "40ml bả / cây",
                    areaTreated: "Toàn vườn (2.5 ha)",
                    resultNotes: "Mật độ ruồi đục trái giảm về dưới 1 con/bẫy, an toàn cho đợt thu hoạch. Trùng khớp nhật ký phun thuốc ngày 26/03/2025.",
                    farmingLogId: sprayLog2_2025?.id ?? null,
                },
            ],
        });

        // =====================================================================
        // XỬ LÝ NIÊN VỤ 2025-2026
        // =====================================================================
        await prisma.pestTreatment.deleteMany({
            where: { monitoringBook: { farmId: farm.id, cropSeasonId: season2026.id } },
        });
        await prisma.farmingLog.deleteMany({
            where: { farmId: farm.id, cropSeasonId: season2026.id },
        });

        const logsData2026 = [
            {
                actionDate: new Date("2025-08-10T08:00:00Z"),
                stage: "POST_HARVEST_RECOVERY" as const,
                activityType: "PRUNE" as const,
                chemicalName: "Vôi nông nghiệp + Coc 85",
                dosage: "Quét gốc và cành",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Rửa vườn, cắt tỉa cành vô hiệu, cành sâu bệnh và tạo độ thông thoáng sau thu hoạch vụ trước.",
            },
            {
                actionDate: new Date("2025-08-20T07:30:00Z"),
                stage: "POST_HARVEST_RECOVERY" as const,
                activityType: "BASE_FERTILIZING" as const,
                chemicalName: "Phân chuồng hoai mục + Vi sinh Trichoderma",
                dosage: "25 kg / gốc",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Bón lót phân chuồng hoai mục kết hợp nấm đối kháng Trichoderma và bón vôi nông nghiệp cải tạo đất.",
            },
            {
                actionDate: new Date("2025-09-05T08:00:00Z"),
                stage: "POST_HARVEST_RECOVERY" as const,
                activityType: "IRRIGATE" as const,
                pestsDetected: "Không phát hiện",
                notes: "Tưới đẫm nước toàn vườn bằng hệ thống béc tưới tự động, kích thích rễ tơ phát triển khỏe mạnh.",
            },
            {
                actionDate: new Date("2025-09-20T08:00:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "SHOOT_MANAGEMENT" as const,
                chemicalName: "Phân bón lá Amino 6000 + Vi lượng",
                dosage: "500ml / 400 lít nước",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Phun Amino Acid và vi lượng kích cơi đọt 1 bung đều, mập đọt và dày lá.",
            },
            {
                actionDate: new Date("2025-10-05T07:00:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "FERTILIZE" as const,
                chemicalName: "NPK 20-20-15 Đầu Trâu",
                dosage: "1.5 kg / cây",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Bón gốc NPK 20-20-15 bổ sung dinh dưỡng đa lượng thúc cơi đọt 2 phát triển xanh tốt.",
            },
            {
                actionDate: new Date("2025-10-18T08:30:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Rầy xanh (3-4 con/chồi), Bọ trĩ",
                notes: "Kiểm tra sâu bệnh đợt 1 cơi đọt 2: Phát hiện rầy xanh và bọ trĩ phá hoại lá non trong giai đoạn mở lá. Đề xuất phun chế phẩm sinh học.",
            },
            {
                actionDate: new Date("2025-10-18T10:00:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "SPRAY_PESTICIDE" as const,
                chemicalName: "Sinh học Radiant 60SC (Spinetoram)",
                dosage: "15ml / bình 16 lít",
                phiDays: 7,
                pestsDetected: "Rầy xanh-Bọ trĩ",
                notes: "Phun phòng ngừa rầy xanh và bọ trĩ phá hoại lá non trong giai đoạn mở lá cơi đọt 2 sau khi phát hiện sáng cùng ngày.",
            },
            {
                actionDate: new Date("2025-10-21T01:00:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Kiểm tra đọt non sau phun thuốc trừ rầy 3 ngày, rầy xanh và bọ trĩ đã được kiểm soát hoàn toàn.",
            },
            {
                actionDate: new Date("2025-10-24T01:00:00Z"),
                stage: "MAKING_SPROUT" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Cơi đọt 2 phát triển xanh tốt, lá mở đều, không phát hiện sâu bệnh gây hại.",
            },
            {
                actionDate: new Date("2025-11-10T08:00:00Z"),
                stage: "FLOWER_INDUCTION" as const,
                activityType: "WATER_STRESS" as const,
                pestsDetected: "Không phát hiện",
                notes: "Dọn sạch cỏ rác trong bồn gốc, quét cào mặt liếp và bắt đầu xiết nước tạo hạn ép mầm hoa.",
            },
            {
                actionDate: new Date("2025-11-28T08:00:00Z"),
                stage: "FLOWER_INDUCTION" as const,
                activityType: "FLOWER_INDUCTION" as const,
                chemicalName: "Phân bón lá MKP 0-52-34 Haifa",
                dosage: "1 kg / 200 lít nước",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Phun lân cao MKP 0-52-34 kết hợp Bo tạo mầm hoa, ức chế đọt non và già hóa bộ lá.",
            },
            {
                actionDate: new Date("2025-12-10T08:00:00Z"),
                stage: "FLOWER_INDUCTION" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Kiểm tra bẫy ruồi đục trái định kỳ giai đoạn làm bông: Không phát hiện ruồi đục trái, bẫy sạch, mật độ an toàn.",
            },
            {
                actionDate: new Date("2026-01-05T08:00:00Z"),
                stage: "FLOWERING" as const,
                activityType: "IRRIGATE" as const,
                pestsDetected: "Không phát hiện",
                notes: "Mắt cua nhú sáng 3-5cm đều khắp các cành mang trái, bắt đầu nhấp nước nhẹ giữ ẩm.",
            },
            {
                actionDate: new Date("2026-01-18T08:30:00Z"),
                stage: "FLOWERING" as const,
                activityType: "FLOWER_THINNING" as const,
                pestsDetected: "Không phát hiện",
                notes: "Tỉa bớt các chùm hoa ở đầu cành và hoa sát thân, chỉ giữ lại các chùm hoa vị trí thuận lợi giữa cành.",
            },
            {
                actionDate: new Date("2026-01-26T19:00:00Z"),
                stage: "FLOWERING" as const,
                activityType: "POLLINATION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Thụ phấn nhân tạo bổ sung vào lúc 18h30 - 20h00 tăng tỷ lệ thụ phấn đều, trái tròn đẹp.",
            },
            {
                actionDate: new Date("2026-02-04T08:00:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Ruồi đục trái",
                notes: "Kiểm tra bẫy ruồi đục trái giai đoạn đậu trái non: Ghi nhận 1 con ở bẫy BAY-02, bẫy hoạt động tốt, mật độ an toàn.",
            },
            {
                actionDate: new Date("2026-02-07T08:00:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "IRRIGATE" as const,
                pestsDetected: "Ruồi đục trái",
                notes: "Tưới nước duy trì độ ẩm đất giai đoạn đậu trái, theo dõi ruồi đục trái.",
            },
            {
                actionDate: new Date("2026-02-09T01:00:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Ruồi đục trái",
                notes: "Kiểm tra sâu bệnh định kỳ giai đoạn đậu trái: Phát hiện Ruồi đục trái.",
            },
            {
                actionDate: new Date("2026-02-12T07:30:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "FRUIT_THINNING" as const,
                pestsDetected: "Không phát hiện",
                notes: "Tỉa trái non đợt 1 sau xổ nhụy: Loại bỏ trái méo, cuống nhỏ, trái bị sâu đục nhỏ hoặc trầy xước.",
            },
            {
                actionDate: new Date("2026-02-14T01:00:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Ruồi đục trái",
                notes: "Kiểm tra bẫy và vườn giai đoạn đậu trái: Phát hiện Ruồi đục trái.",
            },
            {
                actionDate: new Date("2026-02-15T00:00:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "WEEDING" as const,
                pestsDetected: "Ruồi đục trái",
                notes: "Làm sạch cỏ gốc và mặt liếp giai đoạn đậu trái, quan sát Ruồi đục trái.",
            },
            {
                actionDate: new Date("2026-02-19T08:00:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Kiểm tra sâu bệnh giai đoạn đậu trái: Không phát hiện sâu bệnh gây hại.",
            },
            {
                actionDate: new Date("2026-02-22T08:00:00Z"),
                stage: "FRUIT_SETTING" as const,
                activityType: "FOLIAR_FERTILIZING" as const,
                chemicalName: "Canxi Bo Chelate + Amino Acid Hữu Cơ",
                dosage: "250ml / 200 lít nước",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Phun dưỡng trái non với Canxi-Bo và vi lượng hữu cơ chống nứt gai và rụng trái non.",
            },
            {
                actionDate: new Date("2026-03-04T08:00:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Ruồi đục trái",
                notes: "Kiểm tra bẫy ruồi đục trái định kỳ: Ghi nhận 3 con ở các bẫy, đã bổ sung thêm mồi pheromone và làm sạch bẫy lồng.",
            },
            {
                actionDate: new Date("2026-03-10T08:00:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "FRUIT_THINNING" as const,
                pestsDetected: "Không phát hiện",
                notes: "Tỉa trái non đợt 2: Định hình số lượng trái chuẩn trên cây theo đường kính thân.",
            },
            {
                actionDate: new Date("2026-03-25T07:30:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "BRANCH_SUPPORT" as const,
                chemicalName: "Dây nilon đan chịu lực",
                pestsDetected: "Không phát hiện",
                notes: "Cột dây neo chống đỡ cành mang nhiều trái, chằng dây cố định chống gió lốc.",
            },
            {
                actionDate: new Date("2026-04-10T07:00:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "FERTILIZE" as const,
                chemicalName: "NPK 12-11-18 + Kali Sunfat",
                dosage: "2 kg / cây",
                phiDays: 0,
                pestsDetected: "Không phát hiện",
                notes: "Bón gốc thúc nuôi trái NPK 12-11-18 + Kali Sunfat giúp cơm dày, vàng đậm và thơm ngọt.",
            },
            {
                actionDate: new Date("2026-04-25T07:00:00Z"),
                stage: "FRUIT_GROWING" as const,
                activityType: "SPRAY_PESTICIDE" as const,
                chemicalName: "Chế phẩm sinh học BT + Bả protein Ento-Pro 150DD",
                dosage: "50ml / 25 lít nước",
                phiDays: 3,
                pestsDetected: "Sâu đục trái, Bọ xít lưới, Ruồi đục trái",
                notes: "Phun sinh học phòng trừ sâu đục trái và bọ xít lưới, kiểm tra bao trái và bẫy bả theo sổ theo dõi dịch hại.",
            },
            {
                actionDate: new Date("2026-05-02T08:30:00Z"),
                stage: "PRE_HARVEST" as const,
                activityType: "PEST_INSPECTION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Kiểm tra dư lượng an toàn PHI trước thu hoạch (> 21 ngày cách ly), đo độ brix mẫu ngẫu nhiên: Không phát hiện sâu bệnh gây hại.",
            },
        ];

        // Lấy các hồ sơ thu hoạch thực tế của vụ 2025-2026 để đồng bộ khớp hoàn toàn với nhật ký
        const harvestRecords2026 = await prisma.harvestRecord.findMany({
            where: { farmId: farm.id, cropSeasonId: season2026.id },
            include: { buyerFacility: true },
            orderBy: { actualHarvestedAt: "asc" },
        });

        const harvestLogsData2026: any[] = [];
        if (harvestRecords2026.length > 0) {
            for (let i = 0; i < harvestRecords2026.length; i++) {
                const hr = harvestRecords2026[i];
                const weight = Number(hr.actualWeight ?? hr.expectedWeight ?? 0);
                const price = Number(hr.expectedPricePerKg ?? 0);
                const buyer = hr.buyerFacility?.name || hr.transactionNote || "đối tác thu mua";
                const dotNumber = i + 1;
                const dotName = dotNumber === 1 ? "đợt 1 (cắt bói)" : dotNumber === harvestRecords2026.length ? `đợt ${dotNumber} (vét cuối vụ)` : `đợt ${dotNumber} (chính vụ)`;
                harvestLogsData2026.push({
                    actionDate: hr.actualHarvestedAt || hr.expectedHarvestDate || hr.createdAt,
                    stage: "HARVEST" as const,
                    activityType: "HARVEST" as const,
                    pestsDetected: "Không phát hiện",
                    harvestRecordId: hr.id,
                    notes: `Thu hoạch ${dotName} (Mã hồ sơ: ${hr.code}). Khối lượng: ${weight.toLocaleString("vi-VN")} kg sầu riêng ${hr.durianVariety || "Ri6"}. Bán cho ${buyer} với giá ${price.toLocaleString("vi-VN")} đ/kg.`,
                });
            }
            const lastHarvest = harvestRecords2026[harvestRecords2026.length - 1];
            const lastHarvestDate = lastHarvest.actualHarvestedAt || lastHarvest.createdAt;
            const sanitationDate = new Date(new Date(lastHarvestDate).getTime() + 3 * 24 * 60 * 60 * 1000);
            harvestLogsData2026.push({
                actionDate: sanitationDate,
                stage: "HARVEST" as const,
                activityType: "GARDEN_SANITATION" as const,
                pestsDetected: "Không phát hiện",
                notes: "Thu dọn tàn dư sau thu hoạch, dọn sạch vườn chuẩn bị bước vào chu kỳ phục hồi vụ tiếp theo.",
            });
        } else {
            harvestLogsData2026.push(
                {
                    actionDate: new Date("2026-08-29T06:00:00Z"),
                    stage: "HARVEST" as const,
                    activityType: "HARVEST" as const,
                    pestsDetected: "Không phát hiện",
                    notes: "Thu hoạch chính vụ: Cắt các trái già đạt độ chín 8.5 - 9 tuổi (gai nở, thơm nhẹ).",
                },
                {
                    actionDate: new Date("2026-09-05T08:00:00Z"),
                    stage: "HARVEST" as const,
                    activityType: "GARDEN_SANITATION" as const,
                    pestsDetected: "Không phát hiện",
                    notes: "Thu dọn tàn dư sau thu hoạch, dọn sạch vườn chuẩn bị bước vào chu kỳ phục hồi vụ tiếp theo.",
                },
            );
        }

        const allLogsData2026 = [...logsData2026, ...harvestLogsData2026];

        const createdLogs2026: any[] = [];
        for (const l of allLogsData2026) {
            const created = await prisma.farmingLog.create({
                data: {
                    farmId: farm.id,
                    cropSeasonId: season2026.id,
                    stage: l.stage,
                    actionDate: l.actionDate,
                    activityType: l.activityType,
                    chemicalName: (l as any).chemicalName || null,
                    dosage: (l as any).dosage || null,
                    phiDays: (l as any).phiDays ?? null,
                    pestsDetected: l.pestsDetected,
                    isGACCCompliant: true,
                    harvestRecordId: (l as any).harvestRecordId || null,
                    notes: l.notes,
                    images: [],
                },
            });
            createdLogs2026.push(created);
        }
        console.log(`  + Đã tạo ${createdLogs2026.length} nhật ký canh tác cho Niên vụ 2025-2026`);

        // TÌM HOẶC TẠO SỔ THEO DÕI CHO VỤ 2025-2026: SỔ RẦY XANH, BỌ TRĨ
        let book2026 = await prisma.pestMonitoringBook.findFirst({
            where: {
                farmId: farm.id,
                cropSeasonId: season2026.id,
                pestName: { in: ["Rầy xanh-Bọ trĩ"] },
            },
        });

        if (!book2026) {
            book2026 = await prisma.pestMonitoringBook.create({
                data: {
                    farmerId: farm.farmerId,
                    farmId: farm.id,
                    cropSeasonId: season2026.id,
                    pestName: "Rầy xanh-Bọ trĩ",
                    scientificName: "Empoasca sp. & Thrips sp.",
                    firstDetectedDate: new Date("2025-10-18T01:30:00Z"),
                    discoveryStage: "Làm đọt",
                    monitoringMethods: ["Phun thuốc"],
                    targetPart: null,
                    startDate: new Date("2025-10-18T01:30:00Z"),
                    checkFrequencyDays: 3,
                    status: "ACTIVE",
                    notes: "Quan sát đọt non cơi đọt 2, theo dõi mật độ rầy xanh và bọ trĩ phá hoại, đánh giá hiệu quả thuốc sinh học.",
                },
            });
        } else {
            book2026 = await prisma.pestMonitoringBook.update({
                where: { id: book2026.id },
                data: {
                    pestName: "Rầy xanh-Bọ trĩ",
                    scientificName: "Empoasca sp. & Thrips sp.",
                    monitoringMethods: ["Phun thuốc"],
                    targetPart: null,
                },
            });
        }

        // TÁI LẬP INSPECTIONS CHO VỤ 2025-2026 TRÙNG KHỚP NHẬT KÝ
        await prisma.pestInspection.deleteMany({ where: { monitoringBookId: book2026.id } });

        const inspections2026 = [
            {
                date: "2025-10-18T01:30:00Z",
                target: "Lá non cơi đọt 2",
                result: "Có phát hiện",
                count: 1,
                density: "Trung bình",
                actionNeeded: true,
                actionNote: "Cần phun thuốc phòng trừ rầy xanh",
                note: "Phát hiện Rầy xanh trên lá non. Trùng khớp nhật ký kiểm tra sáng 18/10/2025.",
            },
            {
                date: "2025-10-21T01:00:00Z",
                target: "Lá non cơi đọt 2",
                result: "Không phát hiện",
                count: 0,
                density: "Không phát hiện",
                actionNeeded: false,
                actionNote: null,
                note: "Kiểm tra sâu bệnh (không phát hiện) sau khi xử lý phun thuốc 3 ngày. Trùng khớp nhật ký 21/10/2025.",
            },
            {
                date: "2025-10-24T01:00:00Z",
                target: "Lá non cơi đọt 2",
                result: "Không phát hiện",
                count: 0,
                density: "Không phát hiện",
                actionNeeded: false,
                actionNote: null,
                note: "Kiểm tra sâu bệnh (không phát hiện): Bộ đọt non phát triển bình thường, sạch sâu bệnh. Trùng khớp nhật ký 24/10/2025.",
            },
        ];

        for (const insp of inspections2026) {
            await prisma.pestInspection.create({
                data: {
                    monitoringBookId: book2026.id,
                    inspectionDate: new Date(insp.date),
                    inspectorName,
                    method: "Quan sát trực tiếp",
                    targetPart: insp.target,
                    resultText: insp.result,
                    totalPestsCount: insp.count,
                    densityLevel: insp.density,
                    actionNeeded: insp.actionNeeded,
                    actionNote: insp.actionNote,
                    notes: insp.note,
                    items: {
                        create: [
                            {
                                method: "Quan sát trực tiếp",
                                targetPart: insp.target,
                                resultText: insp.result,
                                pestsCount: insp.count,
                                notes: insp.note,
                            },
                        ],
                    },
                },
            });
        }

        // TẠO TREATMENT VỤ 2025-2026 LIÊN KẾT NHẬT KÝ
        const sprayLog2026 = createdLogs2026.find((l) => l.actionDate.toISOString().startsWith("2025-10-18T10:00"));

        await prisma.pestTreatment.deleteMany({ where: { monitoringBookId: book2026.id } });
        await prisma.pestTreatment.create({
            data: {
                monitoringBookId: book2026.id,
                treatmentDate: new Date("2025-10-18T10:00:00Z"),
                treatmentType: "Phun thuốc BVTV",
                productUsed: "Radiant 60SC",
                dosage: "15 ml/bình 16L",
                phiDays: 7,
                areaTreated: "Toàn vườn",
                resultNotes: "Phun xử lý sau khi phát hiện rầy xanh sáng 18/10/2025. Trùng khớp nhật ký ngày 18/10/2025.",
                farmingLogId: sprayLog2026?.id ?? null,
            },
        });
    }

    console.log("\n✅ ĐÃ HOÀN TẤT ĐỒNG BỘ TOÀN BỘ VƯỜN, NHẬT KÝ VÀ SỔ THEO DÕI SINH VẬT GÂY HẠI!");
}

main()
    .catch((err) => {
        console.error("Lỗi khi đồng bộ:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
