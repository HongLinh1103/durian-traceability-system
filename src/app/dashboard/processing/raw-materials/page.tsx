import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingRawMaterialsView, RawMaterialItem } from "@/components/processing/processing-raw-materials-view";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    let formattedItems: RawMaterialItem[] = [];

    try {
        const facility = await prisma.partnerFacility.findFirst({
            where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
        });

        const [incomingHarvests, rawRows] = await Promise.all([
            prisma.harvestRecord.findMany({
                where: { buyerUserId: session.user.id, buyerType: "PROCESSING_FACILITY", status: { in: ["WAITING_CONFIRMATION", "DELIVERY_CONFIRMED"] } },
                include: { farm: true, farmer: { select: { fullName: true, phone: true } } },
                orderBy: { createdAt: "desc" },
            }).catch(() => []),
            facility
                ? prisma.rawMaterialLot.findMany({
                      where: { facilityId: facility.id },
                      include: {
                          rawMaterialReceipt: {
                              include: {
                                  sourceHarvestLot: { include: { farm: true, harvestRecord: { include: { farmer: true } } } },
                                  sourceCollectionLot: { include: { collectorFacility: true } },
                              },
                          },
                          inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
                      },
                      orderBy: { createdAt: "desc" },
                  }).catch(() => [])
                : [],
        ]);

        // Pending incoming harvests
        incomingHarvests.forEach((h) => {
            formattedItems.push({
                id: `harvest-${h.id}`,
                code: h.code || `TH-${h.id.slice(-6).toUpperCase()}`,
                sourceCode: h.code,
                farmName: h.farm?.farmName || "Vườn nông dân",
                variety: h.durianVariety || "Sầu riêng",
                supplierName: h.farmer?.fullName || undefined,
                receivedAt: h.expectedHarvestDate || h.createdAt,
                actualReceivedWeight: Number(h.expectedWeight || 0),
                currentWeight: Number(h.expectedWeight || 0),
                status: "PENDING_RECEIPT",
                direction: "UNCLASSIFIED",
            });
        });

        // Existing RawMaterialLots
        rawRows.forEach((row) => {
            const sourceHarvest = row.rawMaterialReceipt?.sourceHarvestLot;
            const sourceCollection = row.rawMaterialReceipt?.sourceCollectionLot;
            const actualWeight = Number(row.rawMaterialReceipt?.receivedWeight || row.acceptedWeight || 0);

            formattedItems.push({
                id: row.id,
                code: row.lotCode,
                sourceCode: sourceHarvest?.lotCode || sourceCollection?.lotCode || row.rawMaterialReceipt?.receiptCode,
                farmName: sourceHarvest?.farm?.farmName || sourceCollection?.collectorFacility?.name || "Lô tổng hợp",
                variety: sourceHarvest?.farm?.durianVariety || "Sầu riêng",
                supplierName: sourceHarvest?.harvestRecord?.farmer?.fullName || sourceCollection?.collectorFacility?.name || "Đối tác vựa",
                receivedAt: row.rawMaterialReceipt?.receivedAt || row.createdAt,
                actualReceivedWeight: actualWeight,
                currentWeight: Number(row.currentWeight),
                status: (row.status || "AVAILABLE") as any,
                direction: (row.direction || "UNCLASSIFIED") as any,
                freshExportWeight: row.freshExportWeight ? Number(row.freshExportWeight) : undefined,
                processingWeight: row.processingWeight ? Number(row.processingWeight) : undefined,
                qualityResult: row.inspections?.[0]?.result,
            });
        });
    } catch (err) {
        console.error("Error loading processing raw materials page:", err);
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <ProcessingRawMaterialsView initialItems={formattedItems} />
        </main>
    );
}
