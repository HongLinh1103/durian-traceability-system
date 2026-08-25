import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingBatchManager } from "@/components/processing/processing-batch-manager";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    const [availableRawLotsData, rows] = facility
        ? await Promise.all([
              prisma.rawMaterialLot.findMany({
                  where: {
                      facilityId: facility.id,
                      status: { in: ["AVAILABLE", "PARTIALLY_USED"] },
                      currentWeight: { gt: 0 },
                  },
                  include: {
                      inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
                      rawMaterialReceipt: {
                          include: {
                              sourceHarvestLot: { include: { farm: true } },
                              sourceCollectionLot: { include: { collectorFacility: true } },
                          },
                      },
                  },
                  orderBy: { createdAt: "desc" },
              }),
              prisma.processingBatch.findMany({
                  where: { facilityId: facility.id },
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
                                  },
                              },
                          },
                      },
                      supervisor: { select: { fullName: true } },
                      finishedLots: {
                          select: {
                              id: true,
                              lotCode: true,
                              productName: true,
                              quantity: true,
                              netWeight: true,
                              remainingWeight: true,
                              status: true,
                          },
                      },
                  },
                  orderBy: { startedAt: "desc" },
              }),
          ])
        : [[], []];

    const availableRawLots = availableRawLotsData.map((lot) => {
        const sourceHarvest = lot.rawMaterialReceipt.sourceHarvestLot;
        const sourceCollection = lot.rawMaterialReceipt.sourceCollectionLot;
        const latestInspection = lot.inspections[0];

        return {
            id: lot.id,
            code: lot.lotCode,
            variety: sourceHarvest?.farm.durianVariety ?? "Sầu riêng Dona",
            farmName: sourceHarvest?.farm.farmName ?? sourceCollection?.collectorFacility.name ?? "Lô tổng hợp",
            sourceCode: sourceHarvest?.lotCode ?? sourceCollection?.lotCode ?? lot.rawMaterialReceipt.receiptCode,
            qualityGrade: latestInspection?.qualityGrade || "Loại A",
            residueResult: latestInspection?.residueResult || "Đạt",
            warehouseLocation: lot.warehouseLocation,
            acceptedWeight: Number(lot.acceptedWeight),
            currentWeight: Number(lot.currentWeight),
        };
    });

    const processingBatches = rows.map((row) => ({
        id: row.id,
        batchCode: row.batchCode,
        method: row.method,
        targetProduct: row.targetProduct,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        totalInputWeight: Number(row.totalInputWeight),
        totalOutputWeight: Number(row.totalOutputWeight),
        lossWeight: Number(row.lossWeight),
        yieldPercent: Number(row.yieldPercent),
        status: row.status,
        note: row.note ?? "",
        supervisor: row.supervisor.fullName,
        inputs: row.inputs.map((input) => ({
            id: input.id,
            rawMaterialLotId: input.rawMaterialLotId,
            rawMaterialLotCode: input.rawMaterialLot.lotCode,
            inputWeight: Number(input.inputWeight),
            farmName: input.rawMaterialLot.rawMaterialReceipt.sourceHarvestLot?.farm.farmName ?? "Lô tổng hợp",
        })),
        finishedLots: row.finishedLots.map((f) => ({
            id: f.id,
            lotCode: f.lotCode,
            productName: f.productName,
            quantity: Number(f.quantity),
            netWeight: Number(f.netWeight),
            remainingWeight: Number(f.remainingWeight),
            status: f.status,
        })),
    }));

    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
            <header className="rounded-3xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Module chế biến</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Lô chế biến</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Khởi tạo mẻ chế biến từ nguyên liệu đã QC đạt, theo dõi tiến độ, ghi nhận hao hụt và tạo lô thành phẩm.
                </p>
            </header>

            <ProcessingBatchManager
                initialBatches={JSON.parse(JSON.stringify(processingBatches))}
                availableRawLots={JSON.parse(JSON.stringify(availableRawLots))}
                currentUserName={session.user.fullName || "Người phụ trách"}
            />
        </main>
    );
}

