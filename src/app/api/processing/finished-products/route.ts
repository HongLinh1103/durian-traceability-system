import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
        select: { id: true },
    });

    if (!facility) {
        return NextResponse.json({ success: true, data: [] });
    }

    const rows = await prisma.finishedProductLot.findMany({
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
                    shipmentItems: { include: { shipment: true } },
                },
            },
        },
        orderBy: { manufacturedAt: "desc" },
    });

    const data = rows.map((row) => ({
        id: row.id,
        lotCode: row.lotCode,
        processingBatchId: row.processingBatchId,
        processingBatchCode: row.processingBatch.batchCode,
        productName: row.productName,
        productType: row.productType,
        quantity: Number(row.quantity),
        netWeight: Number(row.netWeight),
        remainingWeight: Number(row.remainingWeight),
        allocatedWeight: Number(row.netWeight) - Number(row.remainingWeight),
        manufacturedAt: row.manufacturedAt,
        expiryDate: row.expiryDate,
        packaging: row.packaging,
        storageCondition: row.storageCondition,
        warehouseLocation: row.warehouseLocation,
        status: row.status,
        commercialLots: row.commercialLots.map((cm) => ({
            id: cm.id,
            lotCode: cm.lotCode,
            quantity: Number(cm.quantity),
            unit: cm.unit,
            status: cm.status,
            destinationName: cm.destination?.name || "Chưa xác định",
            traceabilityCode: cm.traceabilityCode ? {
                id: cm.traceabilityCode.id,
                publicToken: cm.traceabilityCode.publicToken,
                status: cm.traceabilityCode.status,
            } : null,
        })),
    }));

    return NextResponse.json({ success: true, data });
}
