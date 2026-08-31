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

        const facilityId = facility?.id;

        const [incomingHarvests, rawRows] = await Promise.all([
            prisma.harvestRecord.findMany({
                where: {
                    OR: [
                        { buyerUserId: session.user.id },
                        ...(facilityId ? [{ buyerFacilityId: facilityId }] : []),
                        { buyerType: "PROCESSING_FACILITY" },
                    ],
                    status: { in: ["WAITING_CONFIRMATION", "CONFIRMED", "HARVESTING", "HARVESTED", "DELIVERY_CONFIRMED"] },
                },
                include: {
                    farm: { include: { region: true } },
                    farmer: { select: { fullName: true, phone: true } },
                    varietyItems: true,
                },
                orderBy: { createdAt: "desc" },
            }).catch(() => []),
            facility
                ? prisma.rawMaterialLot.findMany({
                      where: { facilityId: facility.id },
                      include: {
                          rawMaterialReceipt: {
                              include: {
                                  sourceHarvestLot: {
                                      include: {
                                          farm: { include: { region: true } },
                                          harvestRecord: { include: { farmer: true, varietyItems: true } },
                                      },
                                  },
                                  sourceCollectionLot: { include: { collectorFacility: true } },
                              },
                          },
                          inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
                      },
                      orderBy: { createdAt: "desc" },
                  }).catch(() => [])
                : [],
        ]);

        // Keep track of harvest records that are already converted to RawMaterialLots
        const existingHarvestIds = new Set<string>();
        rawRows.forEach((row) => {
            const hId = row.rawMaterialReceipt?.sourceHarvestLot?.harvestRecordId;
            if (hId) existingHarvestIds.add(hId);
        });

        // 1. Pending incoming harvests from Farmer (not yet received)
        incomingHarvests.forEach((h) => {
            if (existingHarvestIds.has(h.id)) return;

            const declaredWeight = Number(h.deliveredWeight || h.actualWeight || h.expectedWeight || 0);
            const variety = h.durianVariety || h.varietyItems?.[0]?.durianVariety || "Ri6";

            formattedItems.push({
                id: `harvest-${h.id}`,
                harvestId: h.id,
                code: h.code || `TH-${h.id.slice(-6).toUpperCase()}`,
                receiptCode: h.code,
                farmName: h.farm?.farmName || "Vườn nông dân",
                regionCode: h.farm?.region?.code || h.farm?.growingRegion || undefined,
                farmerName: h.farmer?.fullName || undefined,
                farmerPhone: h.farmer?.phone || undefined,
                variety,
                harvestDate: h.actualHarvestedAt || h.expectedHarvestDate || h.createdAt,
                declaredWeight,
                expectedPricePerKg: h.expectedPricePerKg ? Number(h.expectedPricePerKg) : undefined,
                actualReceivedWeight: h.receivedWeight ? Number(h.receivedWeight) : declaredWeight,
                weightDifference: h.receivedWeight ? Number(h.receivedWeight) - declaredWeight : 0,
                receivedAt: h.buyerReceivedAt || null,
                status: "WAITING_RECEIPT",
                direction: "UNCLASSIFIED",
            });
        });

        // 2. Existing Received & Classified RawMaterialLots
        rawRows.forEach((row) => {
            const sourceHarvest = row.rawMaterialReceipt?.sourceHarvestLot;
            const sourceCollection = row.rawMaterialReceipt?.sourceCollectionLot;
            const hr = sourceHarvest?.harvestRecord;
            const farm = sourceHarvest?.farm;

            const declaredWeight = Number(hr?.deliveredWeight || hr?.actualWeight || hr?.expectedWeight || row.rawMaterialReceipt?.dispatchedWeight || row.acceptedWeight || 0);
            const actualReceivedWeight = Number(row.rawMaterialReceipt?.receivedWeight || row.acceptedWeight || 0);
            const weightDifference = actualReceivedWeight - declaredWeight;
            const variety = farm?.durianVariety || hr?.durianVariety || hr?.varietyItems?.[0]?.durianVariety || "Ri6";

            const freshW = row.freshExportWeight ? Number(row.freshExportWeight) : 0;
            const procW = row.processingWeight ? Number(row.processingWeight) : 0;
            const isClassified = row.direction !== "UNCLASSIFIED" || freshW > 0 || procW > 0;
            const rejectedW = Math.max(0, actualReceivedWeight - (freshW + procW));

            formattedItems.push({
                id: row.id,
                rawLotId: row.id,
                harvestId: hr?.id || undefined,
                code: hr?.code || row.lotCode,
                receiptCode: hr?.code || sourceHarvest?.lotCode || sourceCollection?.lotCode || row.rawMaterialReceipt?.receiptCode,
                farmName: farm?.farmName || sourceCollection?.collectorFacility?.name || "Vườn liên kết",
                regionCode: farm?.region?.code || farm?.growingRegion || undefined,
                farmerName: hr?.farmer?.fullName || sourceCollection?.collectorFacility?.name || "Nông hộ",
                farmerPhone: hr?.farmer?.phone || undefined,
                variety,
                harvestDate: hr?.actualHarvestedAt || hr?.expectedHarvestDate || row.rawMaterialReceipt?.receivedAt || row.createdAt,
                declaredWeight,
                expectedPricePerKg: hr?.expectedPricePerKg ? Number(hr.expectedPricePerKg) : undefined,
                actualReceivedWeight,
                weightDifference,
                receivedAt: row.rawMaterialReceipt?.receivedAt || row.createdAt,
                status: isClassified ? "CLASSIFIED" : "WAITING_CLASSIFICATION",
                direction: (row.direction || (isClassified ? (freshW > 0 && procW > 0 ? "SPLIT" : freshW > 0 ? "FRESH_EXPORT" : "PROCESSING") : "UNCLASSIFIED")) as any,
                freshExportWeight: freshW > 0 ? freshW : undefined,
                processingWeight: procW > 0 ? procW : undefined,
                rejectedWeight: isClassified && rejectedW > 0 ? rejectedW : undefined,
                note: row.rawMaterialReceipt?.note || undefined,
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
