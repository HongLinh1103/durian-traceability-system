import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinishedProductManager } from "@/components/processing/finished-product-manager";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    const rows = facility
        ? await prisma.finishedProductLot.findMany({
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
                                                  sourceHarvestLot: { include: { farm: true } },
                                                  sourceCollectionLot: { include: { collectorFacility: true } },
                                              },
                                          },
                                          inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
                                      },
                                  },
                              },
                          },
                      },
                  },
                  commercialLots: {
                      include: {
                          traceabilityCode: true,
                          destination: true,
                      },
                  },
              },
              orderBy: { manufacturedAt: "desc" },
          })
        : [];

    const finishedLots = rows.map((row) => {
        const batch = row.processingBatch;
        const netWeight = Number(row.netWeight);
        const remainingWeight = Number(row.remainingWeight);
        const allocatedWeight = Math.max(0, netWeight - remainingWeight);

        return {
            id: row.id,
            lotCode: row.lotCode,
            productName: row.productName,
            productType: row.productType,
            processingBatchId: row.processingBatchId,
            sourceProcessingBatchCode: batch.batchCode,
            manufacturedAt: row.manufacturedAt,
            expiryDate: row.expiryDate,
            packaging: row.packaging,
            storageCondition: row.storageCondition,
            warehouseLocation: row.warehouseLocation,
            quantity: Number(row.quantity),
            netWeight,
            remainingWeight,
            allocatedWeight,
            status: row.status,
            commercialLots: row.commercialLots.map((cm) => ({
                id: cm.id,
                lotCode: cm.lotCode,
                productName: cm.productName,
                quantity: Number(cm.quantity),
                unit: cm.unit,
                status: cm.status,
                destinationName: cm.destination?.name || "Chưa xác định",
                traceabilityCode: cm.traceabilityCode
                    ? {
                          id: cm.traceabilityCode.id,
                          publicToken: cm.traceabilityCode.publicToken,
                          status: cm.traceabilityCode.status,
                      }
                    : null,
            })),
            batchDetails: {
                method: batch.method,
                totalInputWeight: Number(batch.totalInputWeight),
                totalOutputWeight: Number(batch.totalOutputWeight),
                yieldPercent: Number(batch.yieldPercent),
                rawLots: batch.inputs.map((inp) => {
                    const raw = inp.rawMaterialLot;
                    const farm = raw.rawMaterialReceipt.sourceHarvestLot?.farm;
                    const inspection = raw.inspections[0];
                    return {
                        code: raw.lotCode,
                        farmName: farm?.farmName || "Vườn nguồn",
                        variety: farm?.durianVariety || "Sầu riêng",
                        qcResult: inspection?.result || "PASSED",
                    };
                }),
            },
        };
    });

    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
            <header className="rounded-3xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Module thành phẩm</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Lô thành phẩm</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Quản lý thành phẩm sau chế biến, theo dõi lượng tồn khả dụng và chuyển giao sang module Tạo QR xuất bán.
                </p>
            </header>

            <FinishedProductManager initialLots={JSON.parse(JSON.stringify(finishedLots))} />
        </main>
    );
}

