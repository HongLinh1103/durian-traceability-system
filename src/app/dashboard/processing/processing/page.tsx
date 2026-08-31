import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingProductionView, FreshProductItem, ProcessedBatchItem } from "@/components/processing/processing-production-view";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    let freshItems: FreshProductItem[] = [];
    let processedItems: ProcessedBatchItem[] = [];

    try {
        const facility = await prisma.partnerFacility.findFirst({
            where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
        });

        const [finishedLots, rawProcessingLots] = facility
            ? await Promise.all([
                  prisma.finishedProductLot.findMany({
                      where: { facilityId: facility.id },
                      include: {
                          processingBatch: {
                              include: {
                                  inputs: {
                                      include: {
                                          rawMaterialLot: {
                                              include: {
                                                  rawMaterialReceipt: {
                                                      include: { sourceHarvestLot: { include: { farm: true } } },
                                                  },
                                              },
                                          },
                                      },
                                  },
                              },
                          },
                      },
                      orderBy: { createdAt: "desc" },
                  }).catch(() => []),
                  prisma.rawMaterialLot.findMany({
                      where: {
                          facilityId: facility.id,
                          direction: { in: ["PROCESSING", "SPLIT"] },
                      },
                      include: {
                          rawMaterialReceipt: {
                              include: { sourceHarvestLot: { include: { farm: true } } },
                          },
                          batchInputs: {
                              include: { processingBatch: true },
                          },
                      },
                      orderBy: { createdAt: "desc" },
                  }).catch(() => []),
              ])
            : [[], []];

        // Format fresh items
        freshItems = finishedLots
            .filter((lot) => lot.branch === "FRESH_PACKED" || lot.productType === "FRESH_DURIAN")
            .map((lot) => {
                const raw = lot.processingBatch?.inputs?.[0]?.rawMaterialLot;
                const farm = raw?.rawMaterialReceipt?.sourceHarvestLot?.farm;
                return {
                    id: lot.id,
                    code: lot.lotCode,
                    sourceRawCode: raw?.lotCode,
                    farmName: farm?.farmName || "Vườn liên kết",
                    inputWeight: Number(lot.quantity || lot.netWeight || 0),
                    outputWeight: Number(lot.netWeight || 0),
                    packagingDate: lot.manufacturedAt || lot.createdAt,
                    boxCount: Math.round(Number(lot.netWeight || 0) / 18) || undefined,
                    packagingSpec: lot.packaging || "Thùng 5-6 trái / 18kg",
                    status: "READY_FOR_EXPORT",
                };
            });

        // Format processed items
        processedItems = rawProcessingLots.map((raw) => {
            const farm = raw.rawMaterialReceipt?.sourceHarvestLot?.farm;
            const batch = raw.batchInputs?.[0]?.processingBatch;
            return {
                id: raw.id,
                code: batch ? batch.batchCode : `PROC-${raw.lotCode}`,
                sourceRawCode: raw.lotCode,
                rawLotId: raw.id,
                farmName: farm?.farmName || "Vườn liên kết",
                method: batch?.method || "Bóc múi / Tách múi",
                inputWeight: Number(raw.processingWeight || raw.currentWeight || 0),
                outputProduct: batch?.targetProduct || undefined,
                outputWeight: batch ? Number(batch.totalOutputWeight || 0) : undefined,
                status: batch ? "COMPLETED" : "PENDING",
            };
        });
    } catch (err) {
        console.error("Error loading processing production page:", err);
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <ProcessingProductionView
                initialFreshItems={freshItems}
                initialProcessedItems={processedItems}
            />
        </main>
    );
}
