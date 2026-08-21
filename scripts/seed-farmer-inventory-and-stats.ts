import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Bắt đầu seed dữ liệu Kho vật tư và Thống kê Vụ mùa cho Nông dân...");

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

    if (farmers.length === 0) {
        console.log("⚠️ Không tìm thấy tài khoản FARMER nào trong hệ thống.");
        return;
    }

    for (const farmer of farmers) {
        console.log(`\n👨‍🌾 Đang xử lý tài khoản Nông dân: ${farmer.fullName || farmer.phone} (${farmer.id})`);

        // 1. Tạo các mặt hàng trong Kho vật tư của Nông dân nếu chưa có
        const sampleSupplies = [
            {
                name: "Phân bón NPK Đầu Trâu 16-16-8+TE",
                type: "FERTILIZER" as const,
                brand: "Đầu Trâu",
                unit: "bao 50kg",
                quantity: 15,
                unitPrice: 650000,
                notes: "Dùng bón thúc giai đoạn nuôi trái và làm đọt",
            },
            {
                name: "Phân hữu cơ vi sinh Humic King",
                type: "FERTILIZER" as const,
                brand: "Humic King",
                unit: "bao 25kg",
                quantity: 20,
                unitPrice: 380000,
                notes: "Bón phục hồi sau thu hoạch và kích rễ",
            },
            {
                name: "Phân bón lá Canxi Bo Sữa",
                type: "FERTILIZER" as const,
                brand: "EuroChem",
                unit: "chai 1L",
                quantity: 12,
                unitPrice: 160000,
                notes: "Phun giai đoạn ra hoa, chống rụng trái non",
            },
            {
                name: "Thuốc trừ nấm bệnh Champion 77WP",
                type: "PESTICIDE" as const,
                brand: "Nufarm",
                unit: "gói 500g",
                quantity: 18,
                unitPrice: 145000,
                phiDays: 7,
                activeIngredients: "Copper Hydroxide 77% w/w",
                notes: "Phòng trừ nấm Phytophthora gây xì mủ, thối rễ",
            },
            {
                name: "Thuốc trừ bệnh Tilt Super 300EC",
                type: "PESTICIDE" as const,
                brand: "Syngenta",
                unit: "chai 250ml",
                quantity: 10,
                unitPrice: 220000,
                phiDays: 14,
                activeIngredients: "Difenoconazole 150g/l + Propiconazole 150g/l",
                notes: "Trừ đốm lá, thán thư giai đoạn đọt non",
            },
            {
                name: "Thuốc trừ sâu rầy Radiant 60SC",
                type: "PESTICIDE" as const,
                brand: "Dow AgroSciences",
                unit: "gói 15ml",
                quantity: 30,
                unitPrice: 38000,
                phiDays: 3,
                activeIngredients: "Spinetoram 60g/L",
                notes: "Đặc trị bọ trĩ, sâu đục trái sầu riêng",
            },
            {
                name: "Bình xịt điện 20L Oshima",
                type: "EQUIPMENT" as const,
                brand: "Oshima",
                unit: "cái",
                quantity: 2,
                unitPrice: 1250000,
                notes: "Bình phun thuốc và phân bón lá",
            },
        ];

        const createdSupplies: any[] = [];
        for (const s of sampleSupplies) {
            let supply = await prisma.farmerSupply.findFirst({
                where: {
                    farmerId: farmer.id,
                    name: s.name,
                },
            });

            if (!supply) {
                supply = await prisma.farmerSupply.create({
                    data: {
                        farmerId: farmer.id,
                        name: s.name,
                        type: s.type,
                        brand: s.brand,
                        unit: s.unit,
                        quantity: s.quantity,
                        unitPrice: s.unitPrice,
                        phiDays: s.phiDays,
                        activeIngredients: s.activeIngredients,
                        notes: s.notes,
                    },
                });

                // Tạo giao dịch nhập kho IN
                await prisma.farmerSupplyTransaction.create({
                    data: {
                        supplyId: supply.id,
                        farmerId: farmer.id,
                        type: "IN",
                        quantity: s.quantity,
                        unitPrice: s.unitPrice,
                        totalAmount: s.unitPrice * s.quantity,
                        purpose: "Nhập kho ban đầu",
                        actionDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                    },
                });
            }
            createdSupplies.push(supply);
        }

        console.log(`   ✅ Đã chuẩn bị ${createdSupplies.length} loại vật tư trong kho.`);

        // 2. Tạo các giao dịch Xuất kho (OUT) và Chi phí ngoài cho Vụ mùa đang hoạt động
        const farm = farmer.farms[0];
        if (!farm) continue;

        const activeSeason = farm.cropSeasons.find((s) => s.status === "ACTIVE") || farm.cropSeasons[0];
        if (!activeSeason) continue;

        console.log(`   🌿 Gieo giao dịch sử dụng và chi phí cho Vườn [${farm.farmName}], Vụ [${activeSeason.name}]`);

        // Kiểm tra xem đã có giao dịch OUT nào chưa
        const existingOutCount = await prisma.farmerSupplyTransaction.count({
            where: { farmerId: farmer.id, cropSeasonId: activeSeason.id, type: "OUT" },
        });

        if (existingOutCount === 0) {
            const outScenarios = [
                {
                    supplyName: "Phân hữu cơ vi sinh Humic King",
                    qty: 6,
                    stage: "POST_HARVEST_RECOVERY" as const,
                    activity: "BASE_FERTILIZING" as const,
                    daysAgo: 45,
                    purpose: "Bón lót phục hồi sau thu hoạch",
                },
                {
                    supplyName: "Phân bón NPK Đầu Trâu 16-16-8+TE",
                    qty: 4,
                    stage: "MAKING_SPROUT" as const,
                    activity: "FERTILIZE" as const,
                    daysAgo: 30,
                    purpose: "Bón thúc đọt cơ 1",
                },
                {
                    supplyName: "Thuốc trừ nấm bệnh Champion 77WP",
                    qty: 4,
                    stage: "MAKING_SPROUT" as const,
                    activity: "SPRAY_PESTICIDE" as const,
                    daysAgo: 25,
                    purpose: "Phun phòng nấm bệnh lá non",
                },
                {
                    supplyName: "Phân bón lá Canxi Bo Sữa",
                    qty: 3,
                    stage: "FLOWERING" as const,
                    activity: "FOLIAR_FERTILIZING" as const,
                    daysAgo: 15,
                    purpose: "Phun dưỡng hoa, tăng tỷ lệ đậu trái",
                },
                {
                    supplyName: "Thuốc trừ sâu rầy Radiant 60SC",
                    qty: 8,
                    stage: "FRUIT_SETTING" as const,
                    activity: "SPRAY_PESTICIDE" as const,
                    daysAgo: 7,
                    purpose: "Phun ngừa bọ trĩ tấn công trái non",
                },
                {
                    supplyName: "Thuốc trừ bệnh Tilt Super 300EC",
                    qty: 2,
                    stage: "FRUIT_GROWING" as const,
                    activity: "SPRAY_PESTICIDE" as const,
                    daysAgo: 2,
                    purpose: "Phòng ngừa thán thư cuống trái",
                },
            ];

            for (const sc of outScenarios) {
                const sp = createdSupplies.find((s) => s.name === sc.supplyName);
                if (!sp) continue;

                const actionDate = new Date(Date.now() - sc.daysAgo * 24 * 60 * 60 * 1000);
                const totalAmount = Number(sp.unitPrice) * sc.qty;

                await prisma.farmerSupplyTransaction.create({
                    data: {
                        supplyId: sp.id,
                        farmerId: farmer.id,
                        farmId: farm.id,
                        cropSeasonId: activeSeason.id,
                        type: "OUT",
                        quantity: sc.qty,
                        unitPrice: sp.unitPrice,
                        totalAmount,
                        stage: sc.stage,
                        activityType: sc.activity,
                        purpose: sc.purpose,
                        actionDate,
                    },
                });
            }
            console.log(`   ✅ Đã gieo ${outScenarios.length} giao dịch xuất dùng vật tư.`);
        }

        // Kiểm tra xem đã có FarmerExpense nào chưa
        const existingExpCount = await prisma.farmerExpense.count({
            where: { farmerId: farmer.id, cropSeasonId: activeSeason.id },
        });

        if (existingExpCount === 0) {
            const outsideExpenses = [
                {
                    category: "LABOR" as const,
                    title: "Thuê nhân công tỉa cành, tạo tán sau thu hoạch",
                    amount: 3200000,
                    daysAgo: 40,
                    stage: "POST_HARVEST_RECOVERY" as const,
                    notes: "4 công x 800.000 đ/ngày",
                },
                {
                    category: "ELECTRICITY_WATER" as const,
                    title: "Tiền điện bơm tưới nước tháng trước",
                    amount: 1450000,
                    daysAgo: 20,
                    stage: "FLOWER_INDUCTION" as const,
                    notes: "Bơm tưới xiết nước và tưới đẫm",
                },
                {
                    category: "MACHINERY" as const,
                    title: "Thuê máy cày xới đất quanh tán",
                    amount: 1800000,
                    daysAgo: 35,
                    stage: "POST_HARVEST_RECOVERY" as const,
                    notes: "Xới rãnh bón phân hữu cơ",
                },
                {
                    category: "TESTING" as const,
                    title: "Kiểm nghiệm mẫu đất và dư lượng nước tưới",
                    amount: 1200000,
                    daysAgo: 10,
                    stage: "FRUIT_SETTING" as const,
                    notes: "Đạt chuẩn VietGAP / GACC",
                },
            ];

            for (const exp of outsideExpenses) {
                await prisma.farmerExpense.create({
                    data: {
                        farmerId: farmer.id,
                        farmId: farm.id,
                        cropSeasonId: activeSeason.id,
                        category: exp.category,
                        title: exp.title,
                        amount: exp.amount,
                        expenseDate: new Date(Date.now() - exp.daysAgo * 24 * 60 * 60 * 1000),
                        stage: exp.stage,
                        notes: exp.notes,
                    },
                });
            }
            console.log(`   ✅ Đã gieo ${outsideExpenses.length} khoản chi phí ngoài.`);
        }
    }

    console.log("\n🎉 Seed dữ liệu Kho vật tư và Thống kê thành công!");
}

main()
    .catch((e) => {
        console.error("❌ Lỗi khi seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
