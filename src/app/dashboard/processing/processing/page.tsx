import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SimpleProductionManager } from "@/components/processing/simple-production-manager";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");
    const facility = await prisma.partnerFacility.findFirst({ where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null }, select: { id: true } });
    const rows = facility ? await prisma.rawMaterialLot.findMany({
        where: { facilityId: facility.id, direction: { in: ["PROCESSING", "SPLIT"] }, status: { in: ["AVAILABLE", "PARTIALLY_USED"] }, currentWeight: { gt: 0 } },
        include: { rawMaterialReceipt: { include: { sourceHarvestLot: { include: { farm: true } }, sourceCollectionLot: true } } }, orderBy: { classifiedAt: "desc" },
    }) : [];
    const rawLots = rows.map((row) => ({ id: row.id, code: row.lotCode, source: row.rawMaterialReceipt.sourceHarvestLot?.lotCode || row.rawMaterialReceipt.sourceCollectionLot?.lotCode || row.rawMaterialReceipt.receiptCode, farmName: row.rawMaterialReceipt.sourceHarvestLot?.farm.farmName || "Nguồn lô thu mua", currentWeight: Number(row.currentWeight) }));
    return <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6"><SimpleProductionManager rawLots={rawLots} /></main>;
}
