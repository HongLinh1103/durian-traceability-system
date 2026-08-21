import { prisma } from "@/lib/prisma";

export const DEFAULT_SAMPLE_SUPPLIES = [
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

export async function ensureFarmerInventoryData(farmerId: string) {
    const existingCount = await prisma.farmerSupply.count({ where: { farmerId } });
    if (existingCount === 0) {
        for (const item of DEFAULT_SAMPLE_SUPPLIES) {
            const sp = await prisma.farmerSupply.create({
                data: {
                    farmerId,
                    name: item.name,
                    type: item.type,
                    brand: item.brand,
                    unit: item.unit,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    phiDays: (item as any).phiDays ?? null,
                    activeIngredients: (item as any).activeIngredients ?? null,
                    notes: item.notes,
                },
            });

            await prisma.farmerSupplyTransaction.create({
                data: {
                    supplyId: sp.id,
                    farmerId,
                    type: "IN",
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalAmount: Number(item.unitPrice) * item.quantity,
                    purpose: "Nhập kho ban đầu",
                    actionDate: new Date(),
                },
            });
        }
    }
}

export async function getFarmerInventoryServerData(farmerId: string) {
    await ensureFarmerInventoryData(farmerId);

    const [supplies, transactions, farms] = await Promise.all([
        prisma.farmerSupply.findMany({
            where: { farmerId },
            orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        }),
        prisma.farmerSupplyTransaction.findMany({
            where: { farmerId },
            include: {
                supply: { select: { name: true, type: true, unit: true, brand: true } },
                farm: { select: { farmName: true, farmCode: true } },
                cropSeason: { select: { name: true, year: true } },
            },
            orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
        }),
        prisma.farm.findMany({
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
        }),
    ]);

    // Format plain JSON for serializability
    const serializedSupplies = supplies.map((s) => ({
        ...s,
        quantity: Number(s.quantity),
        unitPrice: Number(s.unitPrice),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
    }));

    const serializedTransactions = transactions.map((t) => ({
        ...t,
        quantity: Number(t.quantity),
        unitPrice: Number(t.unitPrice),
        totalAmount: Number(t.totalAmount),
        actionDate: t.actionDate.toISOString(),
        createdAt: t.createdAt.toISOString(),
    }));

    const serializedFarms = farms.map((f) => ({
        ...f,
        cropSeasons: f.cropSeasons.map((s) => ({
            ...s,
            startedAt: s.startedAt ? s.startedAt.toISOString() : null,
            closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        })),
    }));

    return {
        supplies: serializedSupplies,
        transactions: serializedTransactions,
        farms: serializedFarms,
    };
}
