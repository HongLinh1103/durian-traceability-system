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

        if (facility) {
            const [finishedLots, rawLotsWithFresh, rawProcessingLots] = await Promise.all([
                // 1. All finished product lots
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
                                                    include: {
                                                        sourceHarvestLot: {
                                                            include: { farm: true, harvestRecord: true },
                                                        },
                                                    },
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

                // 2. Raw Material Lots classified with Fresh Export weight
                prisma.rawMaterialLot.findMany({
                    where: {
                        facilityId: facility.id,
                        freshExportWeight: { gt: 0 },
                    },
                    include: {
                        rawMaterialReceipt: {
                            include: {
                                sourceHarvestLot: {
                                    include: { farm: true, harvestRecord: true },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }).catch(() => []),

                // 3. Raw Material Lots classified with Processing weight
                prisma.rawMaterialLot.findMany({
                    where: {
                        facilityId: facility.id,
                        direction: { in: ["PROCESSING", "SPLIT"] },
                        processingWeight: { gt: 0 },
                    },
                    include: {
                        rawMaterialReceipt: {
                            include: {
                                sourceHarvestLot: {
                                    include: { farm: true, harvestRecord: true },
                                },
                            },
                        },
                        batchInputs: {
                            include: { processingBatch: { include: { finishedLots: true } } },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }).catch(() => []),
            ]);

            // Map fresh items
            const freshLotIds = new Set<string>();

            finishedLots
                .filter((lot) => lot.branch === "FRESH_PACKED" || lot.productType === "FRESH_DURIAN")
                .forEach((lot) => {
                    const raw = lot.processingBatch?.inputs?.[0]?.rawMaterialLot;
                    const farm = raw?.rawMaterialReceipt?.sourceHarvestLot?.farm;
                    const hr = raw?.rawMaterialReceipt?.sourceHarvestLot?.harvestRecord;
                    const rawId = raw?.id;
                    if (rawId) freshLotIds.add(rawId);

                    const outW = Number(lot.netWeight || lot.quantity || 0);
                    const inW = Number(lot.processingBatch?.totalInputWeight || outW);
                    const isAvailable = ["READY_FOR_DISTRIBUTION", "AVAILABLE", "PARTIALLY_DISTRIBUTED"].includes(lot.status) && Number(lot.remainingWeight || 0) > 0;

                    freshItems.push({
                        id: lot.id,
                        code: lot.lotCode,
                        sourceRawCode: raw?.lotCode || hr?.code || "NVL-001",
                        rawLotId: raw?.id,
                        farmName: farm?.farmName || "Vườn liên kết",
                        inputWeight: inW,
                        outputWeight: outW,
                        packagingDate: lot.manufacturedAt || lot.createdAt,
                        boxCount: Math.round(outW / 18) || 1,
                        packagingSpec: lot.packaging || "Thùng 5-6 trái / 18kg",
                        status: isAvailable ? "READY_FOR_EXPORT" : "NOT_READY_FOR_EXPORT",
                    });
                });

            // If a raw lot was classified with freshExportWeight but no FinishedProductLot created yet
            rawLotsWithFresh.forEach((raw) => {
                if (freshLotIds.has(raw.id)) return;
                const farm = raw.rawMaterialReceipt?.sourceHarvestLot?.farm;
                const hr = raw.rawMaterialReceipt?.sourceHarvestLot?.harvestRecord;
                const freshW = Number(raw.freshExportWeight || 0);

                freshItems.push({
                    id: `raw-fresh-${raw.id}`,
                    code: `PK-${raw.lotCode}`,
                    sourceRawCode: raw.lotCode || hr?.code,
                    rawLotId: raw.id,
                    farmName: farm?.farmName || "Vườn liên kết",
                    inputWeight: freshW,
                    outputWeight: freshW,
                    packagingDate: raw.classifiedAt || raw.createdAt,
                    boxCount: Math.round(freshW / 18) || 1,
                    packagingSpec: "Thùng 5-6 trái / 18kg",
                    status: "PENDING_PACKAGING",
                });
            });

            // Map processed items:
            // 1. First, any finished product lots from processing (PROCESSED branch or non-fresh productType)
            const processedFinishedLots = finishedLots.filter(
                (lot) => lot.branch === "PROCESSED" || (lot.productType && lot.productType !== "FRESH_DURIAN")
            );
            const processedTrackedRawIds = new Set<string>();

            processedFinishedLots.forEach((lot) => {
                const raw = lot.processingBatch?.inputs?.[0]?.rawMaterialLot;
                if (raw?.id) processedTrackedRawIds.add(raw.id);
                const farm = raw?.rawMaterialReceipt?.sourceHarvestLot?.farm;
                const hr = raw?.rawMaterialReceipt?.sourceHarvestLot?.harvestRecord;
                const isReady = ["READY_FOR_DISTRIBUTION", "AVAILABLE", "PARTIALLY_DISTRIBUTED"].includes(lot.status) && Number(lot.remainingWeight || 0) > 0;
                const outW = Number(lot.netWeight || lot.quantity || 0);
                const inW = Number(lot.processingBatch?.totalInputWeight || outW);

                processedItems.push({
                    id: lot.id,
                    code: lot.lotCode,
                    sourceRawCode: raw?.lotCode || hr?.code || "NVL-001",
                    rawLotId: raw?.id,
                    farmName: farm?.farmName || "Vườn liên kết",
                    method: lot.processingBatch?.method || "Bóc múi & cấp đông",
                    inputWeight: inW,
                    outputProduct: lot.productName || "Cơm sầu riêng bóc múi",
                    outputWeight: outW,
                    status: isReady ? "COMPLETED" : "NOT_READY_FOR_EXPORT",
                });
            });

            // 2. Second, any raw lots with processing direction where batch is in progress or pending
            rawProcessingLots.forEach((raw) => {
                if (processedTrackedRawIds.has(raw.id)) return;
                const farm = raw.rawMaterialReceipt?.sourceHarvestLot?.farm;
                const hr = raw.rawMaterialReceipt?.sourceHarvestLot?.harvestRecord;
                const batch = raw.batchInputs?.[0]?.processingBatch;
                const inputW = Number(raw.processingWeight || raw.currentWeight || 0);

                processedItems.push({
                    id: raw.id,
                    code: batch ? batch.batchCode : `PROC-${raw.lotCode}`,
                    sourceRawCode: raw.lotCode || hr?.code || "NVL-001",
                    rawLotId: raw.id,
                    farmName: farm?.farmName || "Vườn liên kết",
                    method: batch?.method || "Bóc múi & cấp đông",
                    inputWeight: inputW,
                    outputProduct: batch?.targetProduct || "Cơm sầu riêng bóc múi",
                    outputWeight: batch ? Number(batch.totalOutputWeight || 0) : undefined,
                    status: batch ? "IN_PROGRESS" : "PENDING",
                });
            });
        }

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

