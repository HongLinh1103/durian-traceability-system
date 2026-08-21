import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("=== BẮT ĐẦU SEED TOÀN DIỆN VỤ MÙA, NHẬT KÝ CANH TÁC & SỔ THEO DÕI SINH VẬT GÂY HẠI ===");

    // 1. Lấy tất cả các vườn trong hệ thống
    const farms = await prisma.farm.findMany({
        where: { isActive: true },
        include: {
            farmer: true,
            cropSeasons: true,
        },
    });

    console.log(`Tìm thấy ${farms.length} vườn.`);

    for (const farm of farms) {
        if (!farm.farmerId) continue;
        console.log(`\n--- Xử lý vườn: ${farm.farmName} (${farm.farmCode}) - Chủ: ${farm.farmer?.fullName} ---`);

        // A. ĐẢM BẢO CÓ VỤ 2025 [CLOSED]
        let season2025 = farm.cropSeasons.find((s) => s.year === 2025);
        if (!season2025) {
            season2025 = await prisma.cropSeason.create({
                data: {
                    farmId: farm.id,
                    name: "Vụ 2025",
                    year: 2025,
                    sequence: 1,
                    status: "CLOSED",
                    startedAt: new Date("2024-08-01T00:00:00Z"),
                    closedAt: new Date("2025-05-30T23:59:59Z"),
                    notes: "Vụ mùa 2025 đã hoàn thành thu hoạch thắng lợi, năng suất đạt 14.5 tấn/ha.",
                },
            });
            console.log(`  + Đã tạo Vụ 2025 [CLOSED]`);
        } else {
            if (season2025.status !== "CLOSED") {
                season2025 = await prisma.cropSeason.update({
                    where: { id: season2025.id },
                    data: {
                        status: "CLOSED",
                        startedAt: new Date("2024-08-01T00:00:00Z"),
                        closedAt: new Date("2025-05-30T23:59:59Z"),
                    },
                });
            }
        }

        // B. ĐẢM BẢO CÓ VỤ 2027 [ACTIVE]
        let season2027 = farm.cropSeasons.find((s) => s.year === 2027);
        if (!season2027) {
            season2027 = await prisma.cropSeason.create({
                data: {
                    farmId: farm.id,
                    name: "Vụ 2027",
                    year: 2027,
                    sequence: 1,
                    status: "ACTIVE",
                    startedAt: new Date("2026-08-01T00:00:00Z"),
                    notes: "Vụ mùa 2027 đang canh tác, thực hiện theo tiêu chuẩn VietGAP xuất khẩu GACC.",
                },
            });
            console.log(`  + Đã tạo Vụ 2027 [ACTIVE]`);
        }

        // C. TỌA ĐỘ VƯỜN ĐỂ GÁN CHO BẪY
        const baseLat = farm.latitude || 12.6937455;
        const baseLng = farm.longitude || 108.2948055;
        const inspectorName = farm.farmer?.fullName || "Nguyễn Văn Hào";

        // =========================================================================
        // 2. SEED NHẬT KÝ CANH TÁC (FarmingLog) CHO VỤ 2025 [CLOSED]
        // =========================================================================
        const existingLogs2025Count = await prisma.farmingLog.count({
            where: { cropSeasonId: season2025.id },
        });

        if (existingLogs2025Count === 0) {
            const logs2025 = [
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "POST_HARVEST_RECOVERY" as const,
                    actionDate: new Date("2024-08-15T08:30:00Z"),
                    activityType: "PRUNE" as const,
                    chemicalName: "Vôi tôi + Đồng Sunfat Bordeaux",
                    dosage: "Quét thân cây và vết cắt cành",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Cắt tỉa toàn bộ cành khô, cành sâu bệnh, cành tăm trong tán. Quét gốc phòng ngừa xì mủ nấm Phytophthora.",
                    images: ["https://images.unsplash.com/photo-1592417817098-8f3d6ef23a67?w=600&auto=format&fit=crop&q=80"],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "POST_HARVEST_RECOVERY" as const,
                    actionDate: new Date("2024-08-25T07:00:00Z"),
                    activityType: "BASE_FERTILIZING" as const,
                    chemicalName: "Phân hữu cơ vi sinh Quế Lâm 01 + Trichoderma",
                    dosage: "20 kg / gốc",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Bón rải đều quanh tán cây kết hợp tưới vi sinh đối kháng Trichoderma kích thích phục hồi hệ rễ non.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "POST_HARVEST_RECOVERY" as const,
                    actionDate: new Date("2024-09-05T09:00:00Z"),
                    activityType: "IRRIGATE" as const,
                    notes: "Tưới đẫm nước toàn vườn bằng hệ thống béc tưới tự động, duy trì ẩm độ đất 70-80%.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "MAKING_SPROUT" as const,
                    actionDate: new Date("2024-09-20T08:00:00Z"),
                    activityType: "SHOOT_MANAGEMENT" as const,
                    chemicalName: "Phân bón lá Humic Acid + Rong biển Seaweed",
                    dosage: "500ml / 400 lít nước",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Phun ướt đều tán lá kích cơi đọt thứ nhất phát triển đồng loạt, lá dày bóng khỏe.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "MAKING_SPROUT" as const,
                    actionDate: new Date("2024-10-02T07:30:00Z"),
                    activityType: "FERTILIZE" as const,
                    chemicalName: "NPK YaraMila Complex 12-11-18",
                    dosage: "1.5 kg / cây",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Bón gốc bổ sung dinh dưỡng đa lượng thúc đẩy cơi đọt thành thục nhanh.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "MAKING_SPROUT" as const,
                    actionDate: new Date("2024-10-18T16:30:00Z"),
                    activityType: "SPRAY_PESTICIDE" as const,
                    chemicalName: "Sinh học Radiant 60SC (Spinetoram)",
                    dosage: "15ml / bình 16 lít",
                    phiDays: 3,
                    isGACCCompliant: true,
                    notes: "Phun phòng ngừa rầy xanh và bọ trĩ gây xoăn lá đọt non. Đọt ra đều, sạch sâu bệnh.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FLOWER_INDUCTION" as const,
                    actionDate: new Date("2024-11-10T08:00:00Z"),
                    activityType: "WATER_STRESS" as const,
                    notes: "Dọn sạch cỏ rác trong bồn gốc, ngừng tưới nước (xiết nước tạo hạn) 20 ngày để cây phân hóa mầm hoa.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FLOWER_INDUCTION" as const,
                    actionDate: new Date("2024-11-28T07:30:00Z"),
                    activityType: "FLOWER_INDUCTION" as const,
                    chemicalName: "Phân bón lá MKP 0-52-34 Haifa",
                    dosage: "1 kg / 200 lít nước",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Phun ức chế ngọn non, già hóa bộ lá và thúc đẩy mầm hoa dạng 'mắt cua' nhú đều dưới dạ cành.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FLOWERING" as const,
                    actionDate: new Date("2025-01-05T09:00:00Z"),
                    activityType: "IRRIGATE" as const,
                    notes: "Mắt cua đã nhú sáng 3cm khắp các cành mang trái. Bắt đầu tưới nhấp nước nhẹ 1/3 lượng nước bình thường để nuôi hoa.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FLOWERING" as const,
                    actionDate: new Date("2025-01-18T08:00:00Z"),
                    activityType: "FLOWER_THINNING" as const,
                    notes: "Tỉa bớt chùm hoa đầu cành và chùm hoa dị dạng. Giữ lại 4-6 chùm hoa khỏe cách nhau 20-25cm trên mỗi cành.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FLOWERING" as const,
                    actionDate: new Date("2025-01-26T19:00:00Z"),
                    activityType: "POLLINATION" as const,
                    notes: "Thụ phấn bổ sung nhân tạo lúc 18h30 - 20h30 khi hoa nở rộ giúp trái nở hộc đều, tròn đều.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FRUIT_SETTING" as const,
                    actionDate: new Date("2025-02-12T07:30:00Z"),
                    activityType: "FRUIT_THINNING" as const,
                    notes: "Tỉa trái non đợt 1 sau khi đậu trái 3 tuần: Cắt bỏ các trái dị dạng, trái méo mó, trái sâu.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FRUIT_SETTING" as const,
                    actionDate: new Date("2025-02-22T08:00:00Z"),
                    activityType: "FOLIAR_FERTILIZING" as const,
                    chemicalName: "Canxi Bo Chelate + Amino Acid Hữu Cơ",
                    dosage: "250ml / 200 lít nước",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Phun dưỡng trái non chống rụng trái sinh lý và giúp dai cuống.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FRUIT_GROWING" as const,
                    actionDate: new Date("2025-03-10T08:00:00Z"),
                    activityType: "FRUIT_THINNING" as const,
                    notes: "Tỉa trái non đợt 2: Định hình số lượng trái ổn định trên cây (chọn giữ 70-80 trái đều đẹp/cây).",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FRUIT_GROWING" as const,
                    actionDate: new Date("2025-03-25T07:30:00Z"),
                    activityType: "BRANCH_SUPPORT" as const,
                    chemicalName: "Dây nilon đan chịu lực",
                    notes: "Cột dây neo chống đỡ cành mang nhiều trái lớn vào thân chính, tránh gãy đổ cành khi có dông gió.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "FRUIT_GROWING" as const,
                    actionDate: new Date("2025-04-08T07:00:00Z"),
                    activityType: "FERTILIZE" as const,
                    chemicalName: "NPK Kali Sunfat YaraMila Winner 15-09-20 (SOP)",
                    dosage: "2 kg / cây",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Bón gốc thúc nuôi cơm dày, hạn chế sượng cơm và tăng phẩm chất ngọt béo thơm đặc trưng.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "PRE_HARVEST" as const,
                    actionDate: new Date("2025-05-02T08:30:00Z"),
                    activityType: "PEST_INSPECTION" as const,
                    notes: "Kiểm tra dư lượng an toàn PHI trước thu hoạch 21 ngày. Không sử dụng bất kỳ loại hóa chất BVTV nào.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "HARVEST" as const,
                    actionDate: new Date("2025-05-22T06:00:00Z"),
                    activityType: "HARVEST" as const,
                    notes: "Thu hoạch đợt chính vụ: Cắt các trái sầu riêng đạt độ chín 8.5 tuổi (gai nở đều, cuống thơm). Sản lượng đợt 1 đạt 12.5 tấn.",
                    images: ["https://images.unsplash.com/photo-1546470427-e26264be0b11?w=600&auto=format&fit=crop&q=80"],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "HARVEST" as const,
                    actionDate: new Date("2025-05-23T10:00:00Z"),
                    activityType: "FRUIT_GRADING" as const,
                    notes: "Phân loại chất lượng xuất khẩu: Trái loại A đạt 82%, Loại B đạt 15%, Dạt loại C 3%. Bàn giao HTX xuất khẩu theo mã MSVT.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2025.id,
                    stage: "HARVEST" as const,
                    actionDate: new Date("2025-05-28T08:00:00Z"),
                    activityType: "GARDEN_SANITATION" as const,
                    notes: "Thu dọn tàn dư sau thu hoạch, dọn sạch dây neo, khép lại vụ mùa 2025 thành công.",
                    images: [],
                },
            ];

            await prisma.farmingLog.createMany({ data: logs2025 });
            console.log(`  + Đã tạo 20 nhật ký canh tác cho Vụ 2025 [CLOSED]`);
        }

        // =========================================================================
        // 3. SEED NHẬT KÝ CANH TÁC CHO VỤ 2027 [ACTIVE]
        // =========================================================================
        const existingLogs2027Count = await prisma.farmingLog.count({
            where: { cropSeasonId: season2027.id },
        });

        if (existingLogs2027Count === 0) {
            const logs2027 = [
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "POST_HARVEST_RECOVERY" as const,
                    actionDate: new Date("2026-08-10T08:00:00Z"),
                    activityType: "PRUNE" as const,
                    chemicalName: "Vôi nông nghiệp + Coc 85",
                    dosage: "Quét gốc và cành",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Rửa vườn, cắt tỉa cành vô hiệu, tạo độ thông thoáng đầu vụ mùa mới 2027.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "POST_HARVEST_RECOVERY" as const,
                    actionDate: new Date("2026-08-20T07:30:00Z"),
                    activityType: "BASE_FERTILIZING" as const,
                    chemicalName: "Phân chuồng ủ hoai mục + Vi sinh Trichoderma",
                    dosage: "25 kg / gốc",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Bón lót cải tạo đất, nâng pH đất lên mức tối ưu 5.8 - 6.5.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "MAKING_SPROUT" as const,
                    actionDate: new Date("2026-09-15T08:00:00Z"),
                    activityType: "SHOOT_MANAGEMENT" as const,
                    chemicalName: "Phân bón lá Amino 6000 + Vi lượng",
                    dosage: "500ml / 400 lít",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Kéo đọt 1 bung đều và mập đọt.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "MAKING_SPROUT" as const,
                    actionDate: new Date("2026-10-05T07:00:00Z"),
                    activityType: "FERTILIZE" as const,
                    chemicalName: "NPK 20-20-15 Đầu Trâu",
                    dosage: "1.5 kg / cây",
                    phiDays: 0,
                    isGACCCompliant: true,
                    notes: "Bón gốc nuôi cơi đọt 2 phát triển xanh mướt.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "FLOWER_INDUCTION" as const,
                    actionDate: new Date("2026-11-15T08:00:00Z"),
                    activityType: "WATER_STRESS" as const,
                    notes: "Bắt đầu xiết nước tạo khô hạn ép ra hoa.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "FLOWERING" as const,
                    actionDate: new Date("2027-01-10T08:30:00Z"),
                    activityType: "FLOWER_THINNING" as const,
                    notes: "Mắt cua ra đồng loạt, tiến hành tỉa hoa đợt 1.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "FLOWERING" as const,
                    actionDate: new Date("2027-01-22T19:00:00Z"),
                    activityType: "POLLINATION" as const,
                    notes: "Thụ phấn nhân tạo bổ sung vào buổi tối.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "FRUIT_SETTING" as const,
                    actionDate: new Date("2027-02-15T07:30:00Z"),
                    activityType: "FRUIT_THINNING" as const,
                    notes: "Tỉa trái non đợt 1 sau xổ nhụy 20 ngày.",
                    images: [],
                },
                {
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    stage: "FRUIT_GROWING" as const,
                    actionDate: new Date("2027-03-01T08:00:00Z"),
                    activityType: "BRANCH_SUPPORT" as const,
                    notes: "Cột dây neo cành mang trái chuẩn bị cho giai đoạn nuôi trái lớn.",
                    images: [],
                },
            ];

            await prisma.farmingLog.createMany({ data: logs2027 });
            console.log(`  + Đã tạo 9 nhật ký canh tác cho Vụ 2027 [ACTIVE]`);
        }

        // =========================================================================
        // 4. SEED SỔ THEO DÕI SINH VẬT GÂY HẠI CHO VỤ 2025 [CLOSED]
        // =========================================================================
        const existingPestBooks2025 = await prisma.pestMonitoringBook.findMany({
            where: { cropSeasonId: season2025.id },
        });

        if (existingPestBooks2025.length === 0) {
            // Sổ 1: Ruồi đục trái (Vụ 2025)
            const bookFruitFly2025 = await prisma.pestMonitoringBook.create({
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
                    notes: "Sổ theo dõi ruồi đục trái toàn diện vụ 2025 theo tiêu chuẩn giám sát dịch hại kiểm dịch GACC.",
                },
            });

            // Tạo các bẫy cho Sổ 1 (Vụ 2025)
            const trap1_2025 = await prisma.pestTrap.create({
                data: {
                    monitoringBookId: bookFruitFly2025.id,
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

            const trap2_2025 = await prisma.pestTrap.create({
                data: {
                    monitoringBookId: bookFruitFly2025.id,
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

            const trap3_2025 = await prisma.pestTrap.create({
                data: {
                    monitoringBookId: bookFruitFly2025.id,
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

            // Tạo các đợt điều tra (Inspections) cho Sổ 1 (Vụ 2025)
            const inspectionDates2025 = [
                { date: "2024-09-08", counts: [0, 0, 0], note: "Mồi mới nạp, bẫy sạch sẽ" },
                { date: "2024-09-15", counts: [0, 1, 0], note: "Phát hiện 1 con ở BAY-02, mật độ an toàn" },
                { date: "2024-10-06", counts: [1, 0, 1], note: "Bổ sung thêm bông tẩm chất dẫn dụ Pheromone" },
                { date: "2024-11-12", counts: [2, 1, 3], note: "Mật độ tăng nhẹ giai đoạn làm hoa, kiểm tra kỹ bẫy" },
                { date: "2025-01-20", counts: [1, 2, 1], note: "Thời kỳ hoa nở, ruồi ít xuất hiện" },
                { date: "2025-03-04", counts: [0, 0, 0], note: "Bẫy sạch, mồi pheromone duy trì tốt" },
                { date: "2025-03-24", counts: [3, 2, 4], note: "Giai đoạn nuôi trái lớn, mật độ tăng. Đề xuất phun bả protein" },
                { date: "2025-04-15", counts: [1, 0, 1], note: "Sau khi phun bả protein, mật độ ruồi giảm mạnh" },
                { date: "2025-05-10", counts: [0, 1, 0], note: "Trước thu hoạch 12 ngày, vùng đệm an toàn tuyệt đối" },
            ];

            for (const insp of inspectionDates2025) {
                const total = insp.counts.reduce((a, b) => a + b, 0);
                const inspection = await prisma.pestInspection.create({
                    data: {
                        monitoringBookId: bookFruitFly2025.id,
                        inspectionDate: new Date(`${insp.date}T08:00:00Z`),
                        inspectorName: inspectorName,
                        weatherCondition: "Nắng nhẹ, gió nhẹ",
                        totalPestsCount: total,
                        densityLevel: total > 5 ? "Cao" : total > 2 ? "Trung bình" : "Thấp",
                        actionNeeded: total > 5,
                        notes: insp.note,
                    },
                });

                // Tạo từng item cho bẫy
                await prisma.pestInspectionItem.createMany({
                    data: [
                        {
                            inspectionId: inspection.id,
                            trapId: trap1_2025.id,
                            pestsCount: insp.counts[0],
                            baitStatus: "Còn tốt",
                            notes: "Bẫy ổn định",
                        },
                        {
                            inspectionId: inspection.id,
                            trapId: trap2_2025.id,
                            pestsCount: insp.counts[1],
                            baitStatus: "Còn tốt",
                            notes: "Bẫy ổn định",
                        },
                        {
                            inspectionId: inspection.id,
                            trapId: trap3_2025.id,
                            pestsCount: insp.counts[2],
                            baitStatus: "Đã châm thêm bả",
                            notes: "Vệ sinh lưới lồng",
                        },
                    ],
                });
            }

            // Tạo các biện pháp xử lý (Treatments) cho Sổ 1 (Vụ 2025)
            await prisma.pestTreatment.createMany({
                data: [
                    {
                        monitoringBookId: bookFruitFly2025.id,
                        treatmentDate: new Date("2024-11-15T07:30:00Z"),
                        treatmentType: "Phun bả dẫn dụ sinh học",
                        productUsed: "Bả protein Ento-Pro 150DD",
                        dosage: "50ml bả + 1 lít nước (phun điểm 1m2/cây)",
                        areaTreated: "Toàn bộ khu B và khu C (1.2 ha)",
                        resultNotes: "Sau 3 ngày ruồi tập trung dính bả chết nhiều, kiểm soát tốt ổ dịch.",
                    },
                    {
                        monitoringBookId: bookFruitFly2025.id,
                        treatmentDate: new Date("2025-03-26T07:00:00Z"),
                        treatmentType: "Phun bả dẫn dụ sinh học",
                        productUsed: "Bả protein Ento-Pro 150DD + Spinosad",
                        dosage: "40ml bả / cây",
                        areaTreated: "Toàn vườn (2.5 ha)",
                        resultNotes: "Mật độ ruồi đục trái giảm về dưới 1 con/bẫy, an toàn cho đợt thu hoạch.",
                    },
                ],
            });

            console.log(`  + Đã tạo Sổ theo dõi Ruồi đục trái (kèm 3 bẫy, 9 đợt điều tra, 2 đợt xử lý) cho Vụ 2025 [CLOSED]`);
        }

        // =========================================================================
        // 5. SEED SỔ THEO DÕI SINH VẬT GÂY HẠI CHO VỤ 2027 [ACTIVE]
        // =========================================================================
        const existingPestBooks2027 = await prisma.pestMonitoringBook.findMany({
            where: { cropSeasonId: season2027.id },
        });

        if (existingPestBooks2027.length === 0) {
            // Sổ 1: Ruồi đục trái (Vụ 2027 Đang hoạt động)
            const bookFruitFly2027 = await prisma.pestMonitoringBook.create({
                data: {
                    farmerId: farm.farmerId,
                    farmId: farm.id,
                    cropSeasonId: season2027.id,
                    pestName: "Ruồi đục trái",
                    scientificName: "Bactrocera dorsalis",
                    trapType: "Bẫy lồng",
                    attractant: "Pheromone Methyl Eugenol",
                    startDate: new Date("2026-09-01T00:00:00Z"),
                    checkFrequencyDays: 7,
                    status: "ACTIVE",
                    notes: "Sổ theo dõi ruồi đục trái vụ mùa 2027 theo chuẩn mã số vùng trồng xuất khẩu.",
                },
            });

            const trap1_2027 = await prisma.pestTrap.create({
                data: {
                    monitoringBookId: bookFruitFly2027.id,
                    trapCode: "BAY-01",
                    trapType: "Bẫy lồng",
                    locationName: "Khu vườn phía Đông",
                    latitude: baseLat + 0.00018,
                    longitude: baseLng + 0.00022,
                    installedDate: new Date("2026-09-01T08:00:00Z"),
                    status: "ACTIVE",
                    notes: "Treo cành tán ngoài cao 1.8m.",
                },
            });

            const trap2_2027 = await prisma.pestTrap.create({
                data: {
                    monitoringBookId: bookFruitFly2027.id,
                    trapCode: "BAY-02",
                    trapType: "Bẫy lồng",
                    locationName: "Khu vườn phía Tây",
                    latitude: baseLat - 0.00015,
                    longitude: baseLng - 0.00019,
                    installedDate: new Date("2026-09-01T08:30:00Z"),
                    status: "ACTIVE",
                    notes: "Treo khu vực râm mát.",
                },
            });

            const inspectionDates2027 = [
                { date: "2026-10-04", counts: [0, 0], note: "Mồi mới, bẫy sạch" },
                { date: "2026-12-10", counts: [1, 0], note: "Giai đoạn làm bông, phát hiện 1 con ở BAY-01" },
                { date: "2027-02-04", counts: [0, 1], note: "Giai đoạn đậu trái non, bẫy hoạt động tốt" },
                { date: "2027-03-04", counts: [2, 1], note: "Mật độ thấp, đã bổ sung thêm mồi pheromone" },
            ];

            for (const insp of inspectionDates2027) {
                const total = insp.counts.reduce((a, b) => a + b, 0);
                const inspection = await prisma.pestInspection.create({
                    data: {
                        monitoringBookId: bookFruitFly2027.id,
                        inspectionDate: new Date(`${insp.date}T08:00:00Z`),
                        inspectorName: inspectorName,
                        weatherCondition: "Nắng ráo",
                        totalPestsCount: total,
                        densityLevel: total > 2 ? "Trung bình" : "Thấp",
                        actionNeeded: false,
                        notes: insp.note,
                    },
                });

                await prisma.pestInspectionItem.createMany({
                    data: [
                        {
                            inspectionId: inspection.id,
                            trapId: trap1_2027.id,
                            pestsCount: insp.counts[0],
                            baitStatus: "Còn tốt",
                            notes: "Mồi còn tác dụng",
                        },
                        {
                            inspectionId: inspection.id,
                            trapId: trap2_2027.id,
                            pestsCount: insp.counts[1],
                            baitStatus: "Còn tốt",
                            notes: "Mồi còn tác dụng",
                        },
                    ],
                });
            }

            console.log(`  + Đã tạo Sổ theo dõi Ruồi đục trái (kèm 2 bẫy, 4 đợt điều tra) cho Vụ 2027 [ACTIVE]`);
        }
    }

    console.log("\n=== HOÀN TẤT SEED TOÀN DIỆN THÀNH CÔNG RỰC RỠ ===");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
