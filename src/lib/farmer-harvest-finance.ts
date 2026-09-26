import { prisma } from "@/lib/prisma";

type Amount = number | string | { toString(): string } | null;
export function harvestValue(h: { actualWeight: Amount; expectedWeight: Amount; expectedPricePerKg: Amount; weightUnit?: string }) {
    const factor = ["tấn", "tan"].includes((h.weightUnit || "kg").toLowerCase()) ? 1000 : 1;
    const weight = Number(h.actualWeight ?? h.expectedWeight ?? 0) * factor;
    const price = Number(h.expectedPricePerKg ?? 0);
    return { weight, price, amount: Math.round(weight * price) };
}

export type HarvestReceiptInfo = {
    paid: number;
    paidAt: string | null;
};

export async function harvestReceipts(farmerId: string): Promise<Map<string, HarvestReceiptInfo>> {
    const rows = await prisma.$queryRaw<Array<{ harvestId: string; paid: string; lastPaidAt: Date | null }>>`
        SELECT r."harvestId", SUM(r.amount)::text AS paid, MAX(r."receivedAt") AS "lastPaidAt" FROM farmer_harvest_receipts r
        JOIN harvest_records h ON h.id = r."harvestId" WHERE h."farmerId" = ${farmerId}
        GROUP BY r."harvestId"`;
    return new Map(rows.map(row => [row.harvestId, {
        paid: Number(row.paid),
        paidAt: row.lastPaidAt ? row.lastPaidAt.toISOString() : null,
    }]));
}
