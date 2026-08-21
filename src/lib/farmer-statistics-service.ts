import { prisma } from "@/lib/prisma";

const STAGE_LABELS: Record<string, string> = {
    POST_HARVEST_RECOVERY: "Phục hồi sau thu hoạch",
    MAKING_SPROUT: "Làm đọt",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWERING: "Ra hoa",
    FRUIT_SETTING: "Đậu trái",
    FRUIT_GROWING: "Nuôi trái",
    PRE_HARVEST: "Trước thu hoạch",
    HARVEST: "Thu hoạch",
};

const ACTIVITY_LABELS: Record<string, string> = {
    BASE_FERTILIZING: "Bón phân gốc",
    PLANTING: "Trồng mới",
    MULCHING: "Phủ gốc",
    SPRAY_PESTICIDE: "Phun thuốc",
    FERTILIZE: "Bón phân",
    FOLIAR_FERTILIZING: "Bón phân qua lá",
    IRRIGATE: "Tưới nước",
    PRUNE: "Cắt tỉa",
    WEEDING: "Làm cỏ",
    SHOOT_MANAGEMENT: "Quản lý đọt",
    WATER_STRESS: "Xiết nước",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWER_THINNING: "Tỉa hoa",
    POLLINATION: "Thụ phấn",
    FRUIT_THINNING: "Tỉa trái",
    PEST_INSPECTION: "Kiểm tra sâu bệnh",
    TRACK_FRUIT: "Theo dõi trái",
    FRUIT_BAGGING: "Bao trái",
    BRANCH_SUPPORT: "Chống đỡ cành",
    HARVEST: "Thu hoạch",
    FRUIT_GRADING: "Phân loại trái",
    GARDEN_SANITATION: "Vệ sinh vườn",
    OTHER: "Khác",
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
    FERTILIZER: "Phân bón",
    PESTICIDE: "Thuốc BVTV",
    EQUIPMENT: "Vật tư & Thiết bị",
    LABOR: "Nhân công",
    ELECTRICITY_WATER: "Điện / nước",
    MACHINERY: "Máy móc / Cơ giới",
    TRANSPORT: "Vận chuyển",
    HARVESTING: "Thu hoạch",
    TESTING: "Kiểm nghiệm",
    OTHER: "Chi phí khác",
};

export async function getFarmerStatisticsServerData(
    farmerId: string,
    farmId?: string | null,
    cropSeasonId?: string | null,
) {
    let farms = await prisma.farm.findMany({
        where: { farmerId, isActive: true },
        select: {
            id: true,
            farmName: true,
            farmCode: true,
            cropSeasons: {
                orderBy: [{ year: "desc" }, { sequence: "desc" }],
                select: {
                    id: true,
                    name: true,
                    year: true,
                    status: true,
                    startedAt: true,
                    closedAt: true,
                    expectedEndAt: true,
                },
            },
        },
        orderBy: { farmName: "asc" },
    });

    if (farms.length === 0) {
        const newFarm = await prisma.farm.create({
            data: {
                farmerId,
                farmCode: `VN-FARM-${farmerId.slice(-6).toUpperCase()}`,
                farmName: `Vườn sầu riêng Gia đình`,
                address: "Trị An, Vĩnh Cửu, Đồng Nai",
                province: "Đồng Nai",
                district: "Vĩnh Cửu",
                ward: "Trị An",
                areaSize: 2.5,
                totalTrees: 250,
                durianVariety: "Ri6, Monthong",
                isActive: true,
                cropSeasons: {
                    create: {
                        name: "Vụ mùa 2027",
                        year: 2027,
                        sequence: 1,
                        status: "ACTIVE",
                        startedAt: new Date("2026-05-01"),
                        startingStage: "POST_HARVEST_RECOVERY",
                    },
                },
            },
            select: {
                id: true,
                farmName: true,
                farmCode: true,
                cropSeasons: {
                    select: {
                        id: true,
                        name: true,
                        year: true,
                        status: true,
                        startedAt: true,
                        closedAt: true,
                        expectedEndAt: true,
                    },
                },
            },
        });
        farms = [newFarm];
    }

    const serializedFarms = farms.map((f) => ({
        ...f,
        cropSeasons: f.cropSeasons.map((s) => ({
            ...s,
            startedAt: s.startedAt ? s.startedAt.toISOString() : "",
            closedAt: s.closedAt ? s.closedAt.toISOString() : null,
            expectedEndAt: s.expectedEndAt ? s.expectedEndAt.toISOString() : null,
        })),
    }));

    const selectedFarm = farms.find((f) => f.id === farmId) || farms[0];
    const activeSeason = selectedFarm.cropSeasons.find((s) => s.status === "ACTIVE");
    const selectedSeason =
        selectedFarm.cropSeasons.find((s) => s.id === cropSeasonId) ||
        activeSeason ||
        selectedFarm.cropSeasons[0] ||
        null;

    if (!selectedSeason) {
        return {
            farms: serializedFarms,
            selectedFarm: {
                id: selectedFarm.id,
                farmName: selectedFarm.farmName,
                farmCode: selectedFarm.farmCode,
            },
            selectedSeason: null,
            pesticides: { kpis: { typesCount: 0, usagesCount: 0, totalCost: 0, stagesCount: 0 }, items: [] },
            fertilizers: { kpis: { typesCount: 0, usagesCount: 0, totalCost: 0, stagesCount: 0 }, items: [], stageBreakdown: [] },
            expenses: { kpis: { totalCost: 0, materialCost: 0, outsideCost: 0, avgMonthlyCost: 0, diffMonths: 1 }, categories: [] },
        };
    }

    // Lấy transactions & expenses
    const [supplyTransactions, outsideExpenses] = await Promise.all([
        prisma.farmerSupplyTransaction.findMany({
            where: {
                farmerId,
                cropSeasonId: selectedSeason.id,
                type: "OUT",
            },
            include: {
                supply: true,
                cropSeason: { select: { name: true } },
                farm: { select: { farmName: true } },
            },
            orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
        }),
        prisma.farmerExpense.findMany({
            where: {
                farmerId,
                cropSeasonId: selectedSeason.id,
            },
            include: {
                cropSeason: { select: { name: true } },
                farm: { select: { farmName: true } },
            },
            orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        }),
    ]);

    // 1. Thuốc BVTV
    const pesticideTx = supplyTransactions.filter(
        (tx) => tx.supply && tx.supply.type === "PESTICIDE",
    );

    const pesticideMap = new Map<string, any>();
    const pesticideStagesSet = new Set<string>();

    for (const tx of pesticideTx) {
        const key = tx.supply.name.trim();
        const stage = tx.stage || "OTHER";
        if (tx.stage) pesticideStagesSet.add(tx.stage);

        const current = pesticideMap.get(key) || {
            name: tx.supply.name,
            brand: tx.supply.brand,
            unit: tx.supply.unit,
            usagesCount: 0,
            totalQuantity: 0,
            totalCost: 0,
            stageCounts: {},
            details: [],
        };

        current.usagesCount += 1;
        current.totalQuantity += tx.quantity;
        current.totalCost += Number(tx.totalAmount);
        current.stageCounts[stage] = (current.stageCounts[stage] || 0) + 1;

        current.details.push({
            id: tx.id,
            actionDate: tx.actionDate.toISOString(),
            activityType: tx.activityType || "SPRAY_PESTICIDE",
            activityLabel: (tx.activityType && ACTIVITY_LABELS[tx.activityType]) || "Phun thuốc BVTV",
            quantity: tx.quantity,
            unit: tx.supply.unit,
            unitPrice: Number(tx.unitPrice),
            totalAmount: Number(tx.totalAmount),
            stage: tx.stage,
            stageLabel: (tx.stage && STAGE_LABELS[tx.stage]) || "Chung",
            notes: tx.notes,
            purpose: tx.purpose,
        });

        pesticideMap.set(key, current);
    }

    const pesticideItems = Array.from(pesticideMap.values()).map((item) => {
        let mainStage = "Chung";
        let maxCount = 0;
        for (const [stg, count] of Object.entries(item.stageCounts)) {
            if ((count as number) > maxCount && stg !== "OTHER") {
                maxCount = count as number;
                mainStage = STAGE_LABELS[stg] || stg;
            }
        }
        return { ...item, mainStage };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const pesticideKpis = {
        typesCount: pesticideItems.length,
        usagesCount: pesticideTx.length,
        totalCost: pesticideItems.reduce((sum, item) => sum + item.totalCost, 0),
        stagesCount: pesticideStagesSet.size,
    };

    // 2. Phân bón
    const fertilizerTx = supplyTransactions.filter(
        (tx) => tx.supply && tx.supply.type === "FERTILIZER",
    );

    const fertilizerMap = new Map<string, any>();
    const fertilizerStagesSet = new Set<string>();
    const fertilizerStageCostMap: Record<string, number> = {
        POST_HARVEST_RECOVERY: 0,
        MAKING_SPROUT: 0,
        FLOWER_INDUCTION: 0,
        FLOWERING: 0,
        FRUIT_SETTING: 0,
        FRUIT_GROWING: 0,
        PRE_HARVEST: 0,
        HARVEST: 0,
    };

    for (const tx of fertilizerTx) {
        const key = tx.supply.name.trim();
        const stage = tx.stage || "OTHER";
        if (tx.stage) {
            fertilizerStagesSet.add(tx.stage);
            fertilizerStageCostMap[tx.stage] = (fertilizerStageCostMap[tx.stage] || 0) + Number(tx.totalAmount);
        }

        const current = fertilizerMap.get(key) || {
            name: tx.supply.name,
            brand: tx.supply.brand,
            unit: tx.supply.unit,
            usagesCount: 0,
            totalQuantity: 0,
            totalCost: 0,
            stageCounts: {},
            details: [],
        };

        current.usagesCount += 1;
        current.totalQuantity += tx.quantity;
        current.totalCost += Number(tx.totalAmount);
        current.stageCounts[stage] = (current.stageCounts[stage] || 0) + 1;

        current.details.push({
            id: tx.id,
            actionDate: tx.actionDate.toISOString(),
            activityType: tx.activityType || "FERTILIZE",
            activityLabel: (tx.activityType && ACTIVITY_LABELS[tx.activityType]) || "Bón phân",
            quantity: tx.quantity,
            unit: tx.supply.unit,
            unitPrice: Number(tx.unitPrice),
            totalAmount: Number(tx.totalAmount),
            stage: tx.stage,
            stageLabel: (tx.stage && STAGE_LABELS[tx.stage]) || "Chung",
            notes: tx.notes,
            purpose: tx.purpose,
        });

        fertilizerMap.set(key, current);
    }

    const fertilizerItems = Array.from(fertilizerMap.values()).map((item) => {
        let mainStage = "Chung";
        let maxCount = 0;
        for (const [stg, count] of Object.entries(item.stageCounts)) {
            if ((count as number) > maxCount && stg !== "OTHER") {
                maxCount = count as number;
                mainStage = STAGE_LABELS[stg] || stg;
            }
        }
        return { ...item, mainStage };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const fertilizerTotalCost = fertilizerItems.reduce((sum, item) => sum + item.totalCost, 0);

    const fertilizerKpis = {
        typesCount: fertilizerItems.length,
        usagesCount: fertilizerTx.length,
        totalCost: fertilizerTotalCost,
        stagesCount: fertilizerStagesSet.size,
    };

    const stageOrder = [
        "POST_HARVEST_RECOVERY",
        "MAKING_SPROUT",
        "FLOWER_INDUCTION",
        "FLOWERING",
        "FRUIT_SETTING",
        "FRUIT_GROWING",
        "PRE_HARVEST",
    ];

    const fertilizerStageBreakdown = stageOrder
        .map((key) => ({
            stageKey: key,
            stageLabel: STAGE_LABELS[key],
            amount: fertilizerStageCostMap[key] || 0,
            percentage: fertilizerTotalCost > 0 ? ((fertilizerStageCostMap[key] || 0) / fertilizerTotalCost) * 100 : 0,
        }))
        .filter((item) => item.amount > 0);

    // 3. Chi phí
    const equipmentTx = supplyTransactions.filter(
        (tx) => tx.supply && (tx.supply.type === "EQUIPMENT" || tx.supply.type === "OTHER"),
    );
    const equipmentCost = equipmentTx.reduce((sum, tx) => sum + Number(tx.totalAmount), 0);

    const categoryMap: Record<string, any> = {
        FERTILIZER: {
            categoryKey: "FERTILIZER",
            label: "Phân bón",
            transactionCount: fertilizerTx.length,
            totalAmount: fertilizerTotalCost,
            items: fertilizerTx.map((tx) => ({
                id: tx.id,
                title: `${tx.supply.name} (${tx.quantity} ${tx.supply.unit})`,
                date: tx.actionDate.toISOString(),
                amount: Number(tx.totalAmount),
                stageLabel: (tx.stage && STAGE_LABELS[tx.stage]) || "Chung",
                notes: tx.notes || tx.purpose,
            })),
        },
        PESTICIDE: {
            categoryKey: "PESTICIDE",
            label: "Thuốc BVTV",
            transactionCount: pesticideTx.length,
            totalAmount: pesticideKpis.totalCost,
            items: pesticideTx.map((tx) => ({
                id: tx.id,
                title: `${tx.supply.name} (${tx.quantity} ${tx.supply.unit})`,
                date: tx.actionDate.toISOString(),
                amount: Number(tx.totalAmount),
                stageLabel: (tx.stage && STAGE_LABELS[tx.stage]) || "Chung",
                notes: tx.notes || tx.purpose,
            })),
        },
    };

    if (equipmentCost > 0) {
        categoryMap.EQUIPMENT = {
            categoryKey: "EQUIPMENT",
            label: "Vật tư & Thiết bị khác",
            transactionCount: equipmentTx.length,
            totalAmount: equipmentCost,
            items: equipmentTx.map((tx) => ({
                id: tx.id,
                title: `${tx.supply.name} (${tx.quantity} ${tx.supply.unit})`,
                date: tx.actionDate.toISOString(),
                amount: Number(tx.totalAmount),
                stageLabel: (tx.stage && STAGE_LABELS[tx.stage]) || "Chung",
                notes: tx.notes || tx.purpose,
            })),
        };
    }

    for (const exp of outsideExpenses) {
        const catKey = exp.category;
        const catLabel = EXPENSE_CATEGORY_LABELS[catKey] || catKey;

        if (!categoryMap[catKey]) {
            categoryMap[catKey] = {
                categoryKey: catKey,
                label: catLabel,
                transactionCount: 0,
                totalAmount: 0,
                items: [],
            };
        }

        categoryMap[catKey].transactionCount += 1;
        categoryMap[catKey].totalAmount += Number(exp.amount);
        categoryMap[catKey].items.push({
            id: exp.id,
            title: exp.title,
            date: exp.expenseDate.toISOString(),
            amount: Number(exp.amount),
            stageLabel: (exp.stage && STAGE_LABELS[exp.stage]) || "Chung",
            notes: exp.notes,
        });
    }

    const totalCost = Object.values(categoryMap).reduce((sum: number, cat: any) => sum + cat.totalAmount, 0);
    const materialCost = fertilizerTotalCost + pesticideKpis.totalCost + equipmentCost;
    const outsideCost = totalCost - materialCost;

    const seasonStartDate = new Date(selectedSeason.startedAt);
    const seasonEndDate = selectedSeason.closedAt ? new Date(selectedSeason.closedAt) : new Date();
    const diffMonths = Math.max(
        1,
        (seasonEndDate.getFullYear() - seasonStartDate.getFullYear()) * 12 +
            (seasonEndDate.getMonth() - seasonStartDate.getMonth()) +
            1,
    );
    const avgMonthlyCost = Math.round(totalCost / diffMonths);

    const expenseCategories = Object.values(categoryMap)
        .filter((cat: any) => cat.totalAmount > 0)
        .map((cat: any) => ({
            ...cat,
            percentage: totalCost > 0 ? (cat.totalAmount / totalCost) * 100 : 0,
        }))
        .sort((a: any, b: any) => b.totalAmount - a.totalAmount);

    return {
        farms: serializedFarms,
        selectedFarm: {
            id: selectedFarm.id,
            farmName: selectedFarm.farmName,
            farmCode: selectedFarm.farmCode,
        },
        selectedSeason: {
            id: selectedSeason.id,
            name: selectedSeason.name,
            year: selectedSeason.year,
            status: selectedSeason.status,
            startedAt: selectedSeason.startedAt ? selectedSeason.startedAt.toISOString() : null,
            closedAt: selectedSeason.closedAt ? selectedSeason.closedAt.toISOString() : null,
        },
        pesticides: {
            kpis: pesticideKpis,
            items: pesticideItems,
        },
        fertilizers: {
            kpis: fertilizerKpis,
            items: fertilizerItems,
            stageBreakdown: fertilizerStageBreakdown,
        },
        expenses: {
            kpis: {
                totalCost,
                materialCost,
                outsideCost,
                avgMonthlyCost,
                diffMonths,
            },
            categories: expenseCategories,
        },
    };
}
