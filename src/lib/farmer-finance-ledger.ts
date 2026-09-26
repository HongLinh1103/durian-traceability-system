import { prisma } from "@/lib/prisma";
import { harvestReceipts, harvestValue } from "@/lib/farmer-harvest-finance";
import { isSupplyUsage } from "@/lib/farmer-stock-ledger";

export type FarmerFinanceLedger = {
    income: Array<{ id: string; code: string; season: string; date: string; weight: number; buyer: string; address: string; price: number; amount: number; paid: number; paidAt: string | null; canCollect: boolean; status: string }>;
    expenses: Array<{ id: string; date: string; category: string; content: string; amount: number }>;
};
export async function getFarmerFinanceLedger(farmerId: string, farmId: string, year: number | "ALL", cropSeasonId = "ALL"): Promise<FarmerFinanceLedger> {
    const scope = { farmerId, ...(farmId !== "ALL" ? { farmId } : {}), ...(cropSeasonId !== "ALL" ? { cropSeasonId } : {}) };
    const dateRange = year === "ALL" ? undefined : { gte: new Date(`${year}-01-01T00:00:00+07:00`), lt: new Date(`${year + 1}-01-01T00:00:00+07:00`) };
    const [harvests, supplies, expenses, receipts] = await Promise.all([
        prisma.harvestRecord.findMany({ where: { ...scope, expectedHarvestDate: dateRange }, include: { cropSeason: true, buyerFacility: true, buyerUser: { select: { fullName: true } } }, orderBy: { expectedHarvestDate: "desc" } }),
        prisma.farmerSupplyTransaction.findMany({ where: { ...scope, type: "OUT", actionDate: dateRange }, include: { supply: true } }),
        prisma.farmerExpense.findMany({ where: { ...scope, expenseDate: dateRange, category: { notIn: ["FERTILIZER", "PESTICIDE"] } } }),
        harvestReceipts(farmerId),
    ]);
    return {
        income: harvests.map(h => {
            const noteParts = (h.transactionNote || "").split(/ · | - /);
            const address = h.buyerFacility ? [h.buyerFacility.address, h.buyerFacility.ward, h.buyerFacility.province].filter(Boolean).join(", ") : noteParts.slice(1).join(" · ");
            const receipt = receipts.get(h.id);
            return { id: h.id, code: h.code, season: h.cropSeason?.name || "Chưa xác định", date: (h.actualHarvestedAt || h.expectedHarvestDate).toISOString(), ...harvestValue(h), buyer: h.buyerFacility?.name || h.buyerUser?.fullName || noteParts[0]?.trim() || "Chưa xác định", address: address || "—", paid: receipt?.paid ?? 0, paidAt: receipt?.paidAt ?? null, canCollect: !["DRAFT", "CANCELLED", "REJECTED"].includes(h.status), status: h.status };
        }),
        expenses: [
            ...supplies.filter(isSupplyUsage).map(t => ({ id: t.id, date: t.actionDate.toISOString(), category: t.supply.type, content: `${t.supply.name} · ${t.quantity.toLocaleString("vi-VN")} ${t.supply.unit}${t.purpose ? ` — ${t.purpose}` : ""}`, amount: Number(t.totalAmount) })),
            ...expenses.map(e => ({ id: e.id, date: e.expenseDate.toISOString(), category: e.category, content: e.title, amount: Number(e.amount) })),
        ].sort((a, b) => b.date.localeCompare(a.date)),
    };
}
