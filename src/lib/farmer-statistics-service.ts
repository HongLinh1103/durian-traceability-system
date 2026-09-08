import { prisma } from "@/lib/prisma";

export const STAGE_LABELS: Record<string, string> = {
    POST_HARVEST_RECOVERY: "Phục hồi sau thu hoạch",
    MAKING_SPROUT: "Làm đọt",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWERING: "Ra hoa",
    FRUIT_SETTING: "Đậu trái",
    FRUIT_GROWING: "Nuôi trái",
    PRE_HARVEST: "Trước thu hoạch",
    HARVEST: "Thu hoạch",
};

export const ACTIVITY_LABELS: Record<string, string> = {
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

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
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

export interface MonthlyFinancialPoint {
    month: string;      // "2026-01"
    monthIndex: number; // 1..12
    label: string;      // "T1"
    revenue: number;
    cost: number;
    profit: number;
    fertilizerCost: number;
    pesticideCost: number;
    otherCost: number;
    weightKg: number;
}

export interface FarmerOverviewStats {
    filters: {
        farmId: string; // "ALL" or specific farmId
        year: number | string; // e.g. 2026 or "ALL"
    };
    farms: Array<{
        id: string;
        farmName: string;
        farmCode: string;
        cropSeasons: Array<{
            id: string;
            name: string;
            year: number;
            status: string;
        }>;
    }>;
    availableYears: number[];

    // 5 Top KPI Cards
    kpis: {
        pesticideCost: number;
        pesticideUsages: number;
        fertilizerCost: number;
        fertilizerUsages: number;
        totalCost: number;
        totalRevenue: number;
        totalSoldWeightKg: number;
        estimatedProfit: number;
        profitMargin: number; // %
        profitPerKg: number;  // đ/kg
    };

    // 1. Thống kê Thuốc BVTV
    pesticides: {
        totalCost: number;
        usagesCount: number;
        typesCount: number;
        monthlyTrends: Array<{
            month: string;
            label: string;
            cost: number;
        }>;
        topSupplies: Array<{
            name: string;
            usagesCount: number;
            totalQuantity: number;
            unit: string;
            totalCost: number;
        }>;
    };

    // 2. Thống kê Phân bón
    fertilizers: {
        totalCost: number;
        usagesCount: number;
        totalWeightKg: number;
        typesCount: number;
        monthlyTrends: Array<{
            month: string;
            label: string;
            cost: number;
        }>;
        composition: Array<{
            key: string;
            name: string;
            weightKg: number;
            percentage: number;
            cost: number;
            color: string;
        }>;
    };

    // 3. Thống kê Chi phí
    expenses: {
        totalCost: number;
        structure: {
            fertilizer: { amount: number; percentage: number };
            other: { amount: number; percentage: number };
            pesticide: { amount: number; percentage: number };
        };
        monthlyTrends: Array<{
            month: string;
            label: string;
            fertilizerCost: number;
            pesticideCost: number;
            otherCost: number;
            totalCost: number;
        }>;
        categoryBreakdown: Array<{
            categoryKey: string;
            label: string;
            amount: number;
            percentage: number;
            count: number;
        }>;
    };

    // 4. Thống kê Doanh thu
    revenue: {
        totalRevenue: number;
        totalWeightKg: number;
        avgPricePerKg: number;
        salesCount: number;
        monthlyTrends: Array<{
            month: string;
            label: string;
            revenue: number;
            weightKg: number;
        }>;
        recentTransactions: Array<{
            id: string;
            code: string;
            date: string;
            buyerName: string;
            variety: string;
            weightKg: number;
            pricePerKg: number;
            totalAmount: number;
            status: string;
            statusLabel: string;
        }>;
    };

    // 5. Thống kê Lợi nhuận & Hiệu quả tài chính
    financial: {
        totalRevenue: number;
        totalCost: number;
        estimatedProfit: number;
        profitMargin: number;
        profitPerKg: number;
        monthlyTrends: MonthlyFinancialPoint[];
    };
}

function parseFertilizerKg(quantity: number, unit: string = ""): number {
    const u = unit.toLowerCase().trim();
    if (u.includes("50kg") || u.includes("50 kg")) return quantity * 50;
    if (u.includes("25kg") || u.includes("25 kg")) return quantity * 25;
    if (u.includes("tấn") || u.includes("tan")) return quantity * 1000;
    if (u.includes("kg")) return quantity;
    if (u.includes("lít") || u.includes("lit") || u.includes("1l") || u.includes("chai")) return quantity * 1;
    if (u.includes("500g") || u.includes("500 g")) return quantity * 0.5;
    if (u.includes("gói") || u.includes("bao")) return quantity * 25; // default reasonable bag
    return quantity;
}

function classifyFertilizer(name: string, notes: string = ""): "NPK" | "ORGANIC" | "KALI" | "OTHER" {
    const text = `${name} ${notes}`.toLowerCase();
    if (/npk|16-16-8|20-20-15|30-10-10|dap|đầu trâu|ba con cò/.test(text)) {
        return "NPK";
    }
    if (/hữu cơ|organic|humic|vi sinh|chuồng|hoai|ủ mục|compost/.test(text)) {
        return "ORGANIC";
    }
    if (/kali|potassium|k2o|kcl|k2so4|sunfat/.test(text)) {
        return "KALI";
    }
    return "OTHER";
}

const HARVEST_STATUS_LABELS: Record<string, string> = {
    DRAFT: "Bản nháp",
    WAITING_CONFIRMATION: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    HARVESTING: "Đang thu hoạch",
    HARVESTED: "Đã thu hoạch",
    DELIVERY_CONFIRMED: "Đã giao hàng",
    COMPLETED: "Hoàn tất",
    REJECTED: "Đã từ chối",
    CANCELLED: "Đã hủy",
};

export async function getFarmerOverviewStatistics(
    farmerId: string,
    options?: {
        farmId?: string | null;
        year?: number | string | null;
        cropSeasonId?: string | null;
    },
): Promise<FarmerOverviewStats> {
    // 1. Get farmer farms
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
                farmName: "Vườn sầu riêng Gia đình",
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
                        name: "Vụ mùa 2026",
                        year: 2026,
                        sequence: 1,
                        status: "ACTIVE",
                        startedAt: new Date("2026-01-01"),
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
                    },
                },
            },
        });
        farms = [newFarm];
    }

    const farmIdOption = options?.farmId && options.farmId !== "ALL" ? options.farmId : "ALL";
    const farmIds = farmIdOption === "ALL" ? farms.map((f) => f.id) : [farmIdOption];

    // Determine available years
    const seasonYears = new Set<number>();
    farms.forEach((f) => f.cropSeasons.forEach((s) => seasonYears.add(s.year)));
    seasonYears.add(2026);
    seasonYears.add(2025);
    const availableYears = Array.from(seasonYears).sort((a, b) => b - a);

    let selectedYear: number | "ALL" = 2026;
    if (options?.year) {
        if (options.year === "ALL") {
            selectedYear = "ALL";
        } else {
            const parsed = Number(options.year);
            if (!isNaN(parsed)) selectedYear = parsed;
        }
    }

    // Date range filter
    let dateFilter: { gte?: Date; lte?: Date } | undefined = undefined;
    if (selectedYear !== "ALL") {
        dateFilter = {
            gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
            lte: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
        };
    }

    // Build Prisma where clauses
    const supplyWhere: any = {
        farmerId,
        farmId: { in: farmIds },
        type: "OUT",
    };
    if (dateFilter) supplyWhere.actionDate = dateFilter;
    if (options?.cropSeasonId) supplyWhere.cropSeasonId = options.cropSeasonId;

    const expenseWhere: any = {
        farmerId,
        farmId: { in: farmIds },
    };
    if (dateFilter) expenseWhere.expenseDate = dateFilter;
    if (options?.cropSeasonId) expenseWhere.cropSeasonId = options.cropSeasonId;

    const harvestWhere: any = {
        farmerId,
        farmId: { in: farmIds },
        status: { in: ["CONFIRMED", "HARVESTING", "HARVESTED", "DELIVERY_CONFIRMED", "COMPLETED"] },
    };
    if (dateFilter) harvestWhere.expectedHarvestDate = dateFilter;
    if (options?.cropSeasonId) harvestWhere.cropSeasonId = options.cropSeasonId;

    // Fetch data concurrently
    const [supplyTransactions, outsideExpenses, harvestRecords] = await Promise.all([
        prisma.farmerSupplyTransaction.findMany({
            where: supplyWhere,
            include: { supply: true, farm: { select: { farmName: true } } },
            orderBy: [{ actionDate: "asc" }, { createdAt: "asc" }],
        }),
        prisma.farmerExpense.findMany({
            where: expenseWhere,
            include: { farm: { select: { farmName: true } } },
            orderBy: [{ expenseDate: "asc" }, { createdAt: "asc" }],
        }),
        prisma.harvestRecord.findMany({
            where: harvestWhere,
            include: {
                varietyItems: true,
                buyerFacility: { select: { name: true, phone: true } },
                buyerUser: { select: { fullName: true } },
                farm: { select: { farmName: true } },
            },
            orderBy: [{ completedAt: "desc" }, { actualHarvestedAt: "desc" }, { expectedHarvestDate: "desc" }],
        }),
    ]);

    // Initialize monthly timeline T1..T12
    const targetYearNum = typeof selectedYear === "number" ? selectedYear : 2026;
    const monthlyMap = new Map<number, MonthlyFinancialPoint>();
    for (let m = 1; m <= 12; m++) {
        const monthKey = `${targetYearNum}-${String(m).padStart(2, "0")}`;
        monthlyMap.set(m, {
            month: monthKey,
            monthIndex: m,
            label: `T${m}`,
            revenue: 0,
            cost: 0,
            profit: 0,
            fertilizerCost: 0,
            pesticideCost: 0,
            otherCost: 0,
            weightKg: 0,
        });
    }

    // -------------------------------------------------------------
    // 1. Thuốc BVTV
    // -------------------------------------------------------------
    const pesticideTx = supplyTransactions.filter((tx) => tx.supply && tx.supply.type === "PESTICIDE");
    let pesticideCost = 0;
    const pesticideTypesSet = new Set<string>();
    const pesticideSupplyMap = new Map<string, { name: string; usagesCount: number; totalQuantity: number; unit: string; totalCost: number }>();

    for (const tx of pesticideTx) {
        const cost = Number(tx.totalAmount || 0);
        pesticideCost += cost;
        const sName = tx.supply.name.trim();
        pesticideTypesSet.add(sName);

        const cur = pesticideSupplyMap.get(sName) || {
            name: sName,
            usagesCount: 0,
            totalQuantity: 0,
            unit: tx.supply.unit || "gói/chai",
            totalCost: 0,
        };
        cur.usagesCount += 1;
        cur.totalQuantity += tx.quantity;
        cur.totalCost += cost;
        pesticideSupplyMap.set(sName, cur);

        const m = new Date(tx.actionDate).getMonth() + 1;
        const point = monthlyMap.get(m);
        if (point) {
            point.pesticideCost += cost;
            point.cost += cost;
        }
    }

    const pesticideTop = Array.from(pesticideSupplyMap.values())
        .sort((a, b) => b.usagesCount - a.usagesCount || b.totalCost - a.totalCost)
        .slice(0, 6);

    const pesticideMonthlyTrends = Array.from(monthlyMap.values()).map((p) => ({
        month: p.month,
        label: p.label,
        cost: p.pesticideCost,
    }));

    // -------------------------------------------------------------
    // 2. Phân bón
    // -------------------------------------------------------------
    const fertilizerTx = supplyTransactions.filter((tx) => tx.supply && tx.supply.type === "FERTILIZER");
    let fertilizerCost = 0;
    let fertilizerTotalWeightKg = 0;
    const fertilizerTypesSet = new Set<string>();

    const compositionMap = {
        NPK: { key: "NPK", name: "NPK (Hỗn hợp vô cơ)", weightKg: 0, cost: 0, color: "#10B981" },
        ORGANIC: { key: "ORGANIC", name: "Phân hữu cơ & Vi sinh", weightKg: 0, cost: 0, color: "#84CC16" },
        KALI: { key: "KALI", name: "Kali (K2SO4, KCl)", weightKg: 0, cost: 0, color: "#F59E0B" },
        OTHER: { key: "OTHER", name: "Phân bón lá & Vi lượng khác", weightKg: 0, cost: 0, color: "#6366F1" },
    };

    for (const tx of fertilizerTx) {
        const cost = Number(tx.totalAmount || 0);
        fertilizerCost += cost;
        const sName = tx.supply.name.trim();
        fertilizerTypesSet.add(sName);

        const kg = parseFertilizerKg(tx.quantity, tx.supply.unit);
        fertilizerTotalWeightKg += kg;

        const group = classifyFertilizer(sName, tx.purpose || "");
        compositionMap[group].weightKg += kg;
        compositionMap[group].cost += cost;

        const m = new Date(tx.actionDate).getMonth() + 1;
        const point = monthlyMap.get(m);
        if (point) {
            point.fertilizerCost += cost;
            point.cost += cost;
        }
    }

    const fertilizerComposition = Object.values(compositionMap).map((item) => ({
        ...item,
        percentage: fertilizerTotalWeightKg > 0 ? Math.round((item.weightKg / fertilizerTotalWeightKg) * 1000) / 10 : 0,
    }));

    const fertilizerMonthlyTrends = Array.from(monthlyMap.values()).map((p) => ({
        month: p.month,
        label: p.label,
        cost: p.fertilizerCost,
    }));

    // -------------------------------------------------------------
    // 3. Chi phí (Equipment + Outside expenses)
    // -------------------------------------------------------------
    const equipmentTx = supplyTransactions.filter(
        (tx) => tx.supply && (tx.supply.type === "EQUIPMENT" || tx.supply.type === "OTHER"),
    );
    let equipmentCost = 0;
    for (const tx of equipmentTx) {
        const cost = Number(tx.totalAmount || 0);
        equipmentCost += cost;
        const m = new Date(tx.actionDate).getMonth() + 1;
        const point = monthlyMap.get(m);
        if (point) {
            point.otherCost += cost;
            point.cost += cost;
        }
    }

    const categoryExpMap = new Map<string, { label: string; amount: number; count: number }>();
    let outsideCost = 0;

    for (const exp of outsideExpenses) {
        const cost = Number(exp.amount || 0);
        outsideCost += cost;
        const catKey = exp.category || "OTHER";
        const catLabel = EXPENSE_CATEGORY_LABELS[catKey] || catKey;

        const cur = categoryExpMap.get(catKey) || { label: catLabel, amount: 0, count: 0 };
        cur.amount += cost;
        cur.count += 1;
        categoryExpMap.set(catKey, cur);

        const m = new Date(exp.expenseDate).getMonth() + 1;
        const point = monthlyMap.get(m);
        if (point) {
            point.otherCost += cost;
            point.cost += cost;
        }
    }

    const otherTotalCost = equipmentCost + outsideCost;
    const totalCost = fertilizerCost + pesticideCost + otherTotalCost;

    const expenseStructure = {
        fertilizer: {
            amount: fertilizerCost,
            percentage: totalCost > 0 ? Math.round((fertilizerCost / totalCost) * 1000) / 10 : 0,
        },
        other: {
            amount: otherTotalCost,
            percentage: totalCost > 0 ? Math.round((otherTotalCost / totalCost) * 1000) / 10 : 0,
        },
        pesticide: {
            amount: pesticideCost,
            percentage: totalCost > 0 ? Math.round((pesticideCost / totalCost) * 1000) / 10 : 0,
        },
    };

    const categoryBreakdown = Array.from(categoryExpMap.entries())
        .map(([key, val]) => ({
            categoryKey: key,
            label: val.label,
            amount: val.amount,
            count: val.count,
            percentage: totalCost > 0 ? Math.round((val.amount / totalCost) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

    // -------------------------------------------------------------
    // 4. Doanh thu (Sales / Revenue from confirmed HarvestRecords)
    // -------------------------------------------------------------
    let totalRevenue = 0;
    let totalSoldWeightKg = 0;
    const recentTransactions: FarmerOverviewStats["revenue"]["recentTransactions"] = [];

    for (const h of harvestRecords) {
        let weight = Number(h.receivedWeight ?? h.deliveredWeight ?? h.actualWeight ?? h.expectedSaleWeight ?? h.expectedWeight ?? 0);
        const unitLower = (h.weightUnit || "").toLowerCase();
        if ((unitLower.includes("tấn") || unitLower.includes("tan")) && weight > 0 && weight < 50) {
            weight = weight * 1000;
        }

        const price = Number(h.expectedPricePerKg || 0);
        let amount = 0;

        if (h.varietyItems && h.varietyItems.length > 0) {
            const vSum = h.varietyItems.reduce((acc, vi) => {
                const viWeight = Number(vi.expectedWeight || 0);
                const viPrice = Number(vi.expectedPricePerKg || h.expectedPricePerKg || 0);
                return acc + viWeight * viPrice;
            }, 0);
            amount = vSum > 0 ? vSum : weight * price;
        } else {
            amount = weight * price;
        }

        // If price was not specified in record, provide market estimate based on Ri6/Monthong
        if (amount === 0 && weight > 0) {
            const estimatedRate = 75000;
            amount = weight * estimatedRate;
        }

        totalRevenue += amount;
        totalSoldWeightKg += weight;

        const harvestDate = h.buyerReceivedAt ?? h.completedAt ?? h.actualHarvestedAt ?? h.expectedHarvestDate;
        const d = new Date(harvestDate);
        const dayStr = String(d.getDate()).padStart(2, "0");
        const monStr = String(d.getMonth() + 1).padStart(2, "0");
        const formattedDate = `${dayStr}/${monStr}`;

        const noteMatch = h.transactionNote?.match(/bán cho ([^-,.\n]+)/i);
        const buyerName =
            noteMatch?.[1]?.trim() ||
            h.buyerFacility?.name ||
            h.buyerUser?.fullName ||
            (h.buyerType === "COLLECTOR"
                ? "Vựa thu mua"
                : h.buyerType === "PROCESSING_FACILITY"
                ? "Cơ sở chế biến"
                : "Thương lái thu mua");

        recentTransactions.push({
            id: h.id,
            code: h.code,
            date: formattedDate,
            buyerName,
            variety: h.durianVariety || "Sầu riêng",
            weightKg: weight,
            pricePerKg: price > 0 ? price : Math.round(amount / (weight || 1)),
            totalAmount: amount,
            status: h.status,
            statusLabel: HARVEST_STATUS_LABELS[h.status] || h.status,
        });

        const m = d.getMonth() + 1;
        const point = monthlyMap.get(m);
        if (point) {
            point.revenue += amount;
            point.weightKg += weight;
        }
    }

    const avgPricePerKg = totalSoldWeightKg > 0 ? Math.round(totalRevenue / totalSoldWeightKg) : 0;

    // -------------------------------------------------------------
    // 5. Hiệu quả tài chính & Lợi nhuận
    // -------------------------------------------------------------
    const estimatedProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? Math.round((estimatedProfit / totalRevenue) * 1000) / 10 : 0;
    const profitPerKg = totalSoldWeightKg > 0 ? Math.round(estimatedProfit / totalSoldWeightKg) : 0;

    // Finalize monthly points profit
    const monthlyTrends = Array.from(monthlyMap.values()).map((p) => {
        p.profit = p.revenue - p.cost;
        return p;
    });

    const revenueMonthlyTrends = monthlyTrends.map((p) => ({
        month: p.month,
        label: p.label,
        revenue: p.revenue,
        weightKg: p.weightKg,
    }));

    const expenseMonthlyTrends = monthlyTrends.map((p) => ({
        month: p.month,
        label: p.label,
        fertilizerCost: p.fertilizerCost,
        pesticideCost: p.pesticideCost,
        otherCost: p.otherCost,
        totalCost: p.cost,
    }));

    return {
        filters: {
            farmId: farmIdOption,
            year: selectedYear,
        },
        farms: farms.map((f) => ({
            id: f.id,
            farmName: f.farmName,
            farmCode: f.farmCode,
            cropSeasons: f.cropSeasons.map((s) => ({
                id: s.id,
                name: s.name,
                year: s.year,
                status: s.status,
            })),
        })),
        availableYears,
        kpis: {
            pesticideCost,
            pesticideUsages: pesticideTx.length,
            fertilizerCost,
            fertilizerUsages: fertilizerTx.length,
            totalCost,
            totalRevenue,
            totalSoldWeightKg,
            estimatedProfit,
            profitMargin,
            profitPerKg,
        },
        pesticides: {
            totalCost: pesticideCost,
            usagesCount: pesticideTx.length,
            typesCount: pesticideTypesSet.size,
            monthlyTrends: pesticideMonthlyTrends,
            topSupplies: pesticideTop,
        },
        fertilizers: {
            totalCost: fertilizerCost,
            usagesCount: fertilizerTx.length,
            totalWeightKg: fertilizerTotalWeightKg,
            typesCount: fertilizerTypesSet.size,
            monthlyTrends: fertilizerMonthlyTrends,
            composition: fertilizerComposition,
        },
        expenses: {
            totalCost,
            structure: expenseStructure,
            monthlyTrends: expenseMonthlyTrends,
            categoryBreakdown,
        },
        revenue: {
            totalRevenue,
            totalWeightKg: totalSoldWeightKg,
            avgPricePerKg,
            salesCount: harvestRecords.length,
            monthlyTrends: revenueMonthlyTrends,
            recentTransactions: recentTransactions.slice(0, 6),
        },
        financial: {
            totalRevenue,
            totalCost,
            estimatedProfit,
            profitMargin,
            profitPerKg,
            monthlyTrends,
        },
    };
}

// Keep existing drill-down server data retrieval function for pesticides, fertilizers, and expenses
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
                        name: "Vụ mùa 2026",
                        year: 2026,
                        sequence: 1,
                        status: "ACTIVE",
                        startedAt: new Date("2026-01-01"),
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

    // Query supply transactions and outside expenses for the season
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
