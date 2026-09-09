import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") return NextResponse.json({ success: false }, { status: 403 });

    let facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
        select: { id: true }
    });
    if (!facility) {
        facility = await prisma.partnerFacility.findFirst({
            where: { type: "PROCESSING_FACILITY", deletedAt: null },
            select: { id: true }
        });
    }

    const [harvestCount, qcCount, classifiedLots] = await Promise.all([
        prisma.harvestRecord.count({ where: { buyerUserId: session.user.id, buyerType: "PROCESSING_FACILITY", status: { in: ["WAITING_CONFIRMATION", "DELIVERY_CONFIRMED"] } } }),
        facility ? prisma.rawMaterialLot.count({ where: { facilityId: facility.id, status: "PENDING_QC" } }) : 0,
        facility ? prisma.rawMaterialLot.findMany({
            where: {
                facilityId: facility.id,
                direction: { in: ["FRESH_EXPORT", "PROCESSING", "SPLIT"] },
            },
            include: {
                batchInputs: {
                    include: {
                        processingBatch: {
                            include: { finishedLots: true }
                        }
                    }
                }
            }
        }) : [],
    ]);

    // Count how many classified lots still have pending packaging or pending processing
    let processingReadyCount = 0;
    for (const lot of classifiedLots) {
        const hasFresh = Number(lot.freshExportWeight || 0) > 0;
        const hasProc = Number(lot.processingWeight || 0) > 0;
        const hasFreshFinished = lot.batchInputs.some(bi =>
            bi.processingBatch?.finishedLots.some(fl => fl.branch === "FRESH_PACKED" || fl.productType === "FRESH_DURIAN")
        );
        const hasProcFinished = lot.batchInputs.some(bi =>
            bi.processingBatch?.finishedLots.some(fl => fl.branch === "PROCESSED" || (fl.productType && fl.productType !== "FRESH_DURIAN"))
        );

        if ((hasFresh && !hasFreshFinished) || (hasProc && !hasProcFinished)) {
            processingReadyCount++;
        }
    }

    return NextResponse.json({
        success: true,
        actionRequiredCount: harvestCount + qcCount,
        processingReadyCount,
    });
}
