import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🐛 Bắt đầu seed dữ liệu Sổ theo dõi Sinh vật gây hại...");

    const farmers = await prisma.user.findMany({
        where: { role: "FARMER" },
        include: {
            farms: {
                include: {
                    cropSeasons: true,
                },
            },
        },
    });

    console.log(`Tìm thấy ${farmers.length} tài khoản Nông dân.`);

    for (let i = 0; i < farmers.length; i++) {
        const farmer = farmers[i];
        const farm = farmer.farms[0];
        if (!farm) continue;

        const activeSeason = farm.cropSeasons.find((s) => s.status === "ACTIVE") || farm.cropSeasons[0];
        if (!activeSeason) continue;

        // Kiểm tra xem đã có sổ nào chưa
        const existingCount = await prisma.pestMonitoringBook.count({
            where: { farmerId: farmer.id, farmId: farm.id, cropSeasonId: activeSeason.id },
        });

        if (existingCount === 0) {
            console.log(`\n🌱 Gieo sổ theo dõi cho Nông dân: ${farmer.fullName || farmer.phone} - Vườn: ${farm.farmName}`);

            // 1. Sổ 1: Ruồi đục trái
            const fruitFlyBook = await prisma.pestMonitoringBook.create({
                data: {
                    farmerId: farmer.id,
                    farmId: farm.id,
                    cropSeasonId: activeSeason.id,
                    pestName: "Ruồi đục trái",
                    scientificName: "Bactrocera dorsalis",
                    trapType: "Bẫy lồng",
                    attractant: "Pheromone Methyl Eugenol",
                    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                    checkFrequencyDays: 7,
                    status: "ACTIVE",
                    notes: "Theo dõi định kỳ 7 ngày/lần để phòng ngừa ruồi đục trái giai đoạn quả non và quả sắp chín.",
                    traps: {
                        create: [
                            {
                                trapCode: "BAY-01",
                                trapType: "Bẫy lồng",
                                locationName: "Khu A - Lô 1 (Gần bờ kênh)",
                                latitude: 10.94512,
                                longitude: 107.23845,
                                installedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                                status: "ACTIVE",
                                notes: "Treo cành cao 1.8m, hướng râm mát",
                            },
                            {
                                trapCode: "BAY-02",
                                trapType: "Bẫy lồng",
                                locationName: "Khu B - Lô 3 (Giữa vườn)",
                                latitude: 10.94602,
                                longitude: 107.23912,
                                installedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                                status: "ACTIVE",
                                notes: "Treo cành tán ngoài, thay mồi định kỳ 15 ngày/lần",
                            },
                        ],
                    },
                },
                include: { traps: true },
            });

            // Gieo 8 lần điều tra cho Sổ Ruồi đục trái
            const trap1 = fruitFlyBook.traps[0];
            const trap2 = fruitFlyBook.traps[1];

            const inspectionsData = [
                { daysAgo: 56, c1: 0, c2: 1, weather: "Nắng ráo", actionNeeded: false },
                { daysAgo: 49, c1: 1, c2: 0, weather: "Mát mẻ", actionNeeded: false },
                { daysAgo: 42, c1: 0, c2: 0, weather: "Nắng", actionNeeded: false },
                { daysAgo: 35, c1: 2, c2: 1, weather: "Mưa nhẹ", actionNeeded: false },
                { daysAgo: 28, c1: 1, c2: 1, weather: "Nắng gắt", actionNeeded: false },
                { daysAgo: 21, c1: 0, c2: 0, weather: "Gió nhẹ", actionNeeded: false },
                { daysAgo: 14, c1: 1, c2: 2, weather: "Âm u", actionNeeded: false },
                { daysAgo: 3, c1: 2, c2: 1, weather: "Nắng nhẹ", actionNeeded: true, actionNote: "Mật độ tăng nhẹ, bổ sung mồi bẫy bả protein quanh tán" },
            ];

            for (const ins of inspectionsData) {
                const total = ins.c1 + ins.c2;
                await prisma.pestInspection.create({
                    data: {
                        monitoringBookId: fruitFlyBook.id,
                        inspectionDate: new Date(Date.now() - ins.daysAgo * 24 * 60 * 60 * 1000),
                        inspectorName: farmer.fullName || "Chủ vườn",
                        totalPestsCount: total,
                        densityLevel: total === 0 ? "Không phát hiện" : total <= 2 ? "Nhẹ" : "Trung bình",
                        weatherCondition: ins.weather,
                        actionNeeded: ins.actionNeeded,
                        actionNote: ins.actionNote || null,
                        notes: `Kiểm tra định kỳ 7 ngày. Tình trạng bẫy tốt.`,
                        items: {
                            create: [
                                { trapId: trap1.id, pestsCount: ins.c1, baitStatus: "Mồi còn tốt" },
                                { trapId: trap2.id, pestsCount: ins.c2, baitStatus: "Mồi còn tốt" },
                            ],
                        },
                    },
                });
            }

            // Gieo 1 biện pháp xử lý cho Ruồi đục trái
            await prisma.pestTreatment.create({
                data: {
                    monitoringBookId: fruitFlyBook.id,
                    treatmentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    treatmentType: "Phun bả Protein thủy phân + Ento-Pro",
                    productUsed: "Bả sinh học SOFRI Protein",
                    dosage: "50ml bả / cây, phun đốm tán",
                    areaTreated: "Khu A và Khu B",
                    resultNotes: "Sau 2 ngày kiểm tra không phát hiện thêm cá thể mới quanh quả non.",
                },
            });

            // 2. Sổ 2: Rệp sáp
            const mealybugBook = await prisma.pestMonitoringBook.create({
                data: {
                    farmerId: farmer.id,
                    farmId: farm.id,
                    cropSeasonId: activeSeason.id,
                    pestName: "Rệp sáp",
                    scientificName: "Planococcus citri",
                    trapType: "Bẫy dính màu vàng",
                    attractant: "Keo dính sinh học",
                    startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                    checkFrequencyDays: 7,
                    status: "ACTIVE",
                    notes: "Khảo sát và đặt bẫy dính vàng quan sát rệp sáp và bọ trĩ cuống hoa.",
                    traps: {
                        create: [
                            { trapCode: "BAY-03", trapType: "Bẫy dính màu vàng", locationName: "Khu A - Hàng cây 1-5", installedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
                            { trapCode: "BAY-04", trapType: "Bẫy dính màu vàng", locationName: "Khu B - Hàng cây 6-10", installedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
                            { trapCode: "BAY-05", trapType: "Bẫy dính màu vàng", locationName: "Khu C - Phía Đông", installedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
                            { trapCode: "BAY-06", trapType: "Bẫy dính màu vàng", locationName: "Khu D - Phía Tây", installedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
                        ],
                    },
                },
                include: { traps: true },
            });

            // Gieo 5 lần kiểm tra không phát hiện
            const rTraps = mealybugBook.traps;
            for (let k = 1; k <= 5; k++) {
                await prisma.pestInspection.create({
                    data: {
                        monitoringBookId: mealybugBook.id,
                        inspectionDate: new Date(Date.now() - (40 - k * 7) * 24 * 60 * 60 * 1000),
                        inspectorName: farmer.fullName || "Chủ vườn",
                        totalPestsCount: 0,
                        densityLevel: "Không phát hiện",
                        weatherCondition: "Nắng ráo",
                        actionNeeded: false,
                        notes: "Bẫy dính sạch, không thấy xuất hiện rệp sáp trên cuống và trái.",
                        items: {
                            create: rTraps.map((tr) => ({
                                trapId: tr.id,
                                pestsCount: 0,
                                baitStatus: "Bình thường",
                            })),
                        },
                    },
                });
            }

            // 3. Sổ 3: Sâu đục trái
            await prisma.pestMonitoringBook.create({
                data: {
                    farmerId: farmer.id,
                    farmId: farm.id,
                    cropSeasonId: activeSeason.id,
                    pestName: "Sâu đục trái sầu riêng",
                    scientificName: "Conogethes punctiferalis",
                    trapType: "Khảo sát trực tiếp & Bẫy đèn",
                    attractant: "Ánh sáng đèn led sinh học",
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    checkFrequencyDays: 5,
                    status: "ACTIVE",
                    notes: "Khảo sát kẽ trái, chùm quả non từ khi đậu trái đến trước thu hoạch.",
                },
            });

            console.log(`   ✅ Đã tạo 3 sổ theo dõi kèm bẫy và lịch sử điều tra mẫu.`);
        }
    }

    console.log("\n🎉 Seed dữ liệu Sinh vật gây hại hoàn tất 100%!");
}

main().finally(() => prisma.$disconnect());
