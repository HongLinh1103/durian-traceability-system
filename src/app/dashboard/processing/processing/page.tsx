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
                        status: "READY_FOR_EXPORT",
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

            // Map processed items
            rawProcessingLots.forEach((raw) => {
                const farm = raw.rawMaterialReceipt?.sourceHarvestLot?.farm;
                const hr = raw.rawMaterialReceipt?.sourceHarvestLot?.harvestRecord;
                const batch = raw.batchInputs?.[0]?.processingBatch;
                const finished = batch?.finishedLots?.[0];
                const inputW = Number(raw.processingWeight || raw.currentWeight || 0);

                processedItems.push({
                    id: raw.id,
                    code: batch ? batch.batchCode : `PROC-${raw.lotCode}`,
                    sourceRawCode: raw.lotCode || hr?.code || "NVL-001",
                    rawLotId: raw.id,
                    farmName: farm?.farmName || "Vườn liên kết",
                    method: batch?.method || "Bóc múi / Tách múi",
                    inputWeight: inputW,
                    outputProduct: batch?.targetProduct || finished?.productName || "Cơm sầu riêng bóc múi",
                    outputWeight: batch ? Number(batch.totalOutputWeight || 0) : undefined,
                    status: batch ? "COMPLETED" : "PENDING",
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

