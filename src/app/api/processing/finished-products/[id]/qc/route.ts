import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const qcFinishedProductSchema = z.object({
    result: z.enum(["PASSED", "CONDITIONAL", "FAILED"]),
    appearance: z.string().trim().optional(),
    color: z.string().trim().optional(),
    odor: z.string().trim().optional(),
    packagingQuality: z.string().trim().optional(),
    netWeightChecked: z.string().trim().optional(),
    storageTemperatureChecked: z.string().trim().optional(),
    microbiologyResult: z.string().trim().optional(),
    testCertificateCode: z.string().trim().optional(),
    inspectedAt: z.string().optional(),
    inspectorName: z.string().trim().optional(),
    note: z.string().trim().optional(),
});

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }

    const parsed = qcFinishedProductSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu QC không hợp lệ." },
            { status: 400 }
        );
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    if (!facility) {
        return NextResponse.json({ success: false, message: "Cơ sở chế biến chưa được kích hoạt." }, { status: 400 });
    }

    const lot = await prisma.finishedProductLot.findUnique({
        where: { id: params.id },
        include: { processingBatch: true },
    });

    if (!lot || lot.facilityId !== facility.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô thành phẩm." }, { status: 404 });
    }

    const value = parsed.data;
    const inspectedAt = value.inspectedAt ? new Date(value.inspectedAt) : new Date();

    let newStatus: "WAITING_WAREHOUSE_IN" | "QC_HOLD" | "QC_FAILED" = "WAITING_WAREHOUSE_IN";
    if (value.result === "CONDITIONAL") newStatus = "QC_HOLD";
    if (value.result === "FAILED") newStatus = "QC_FAILED";

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const updatedLot = await tx.finishedProductLot.update({
                where: { id: lot.id },
                data: {
                    status: newStatus,
                },
            });

            // Log QC TraceEvent
            const traceType = value.result === "FAILED" ? "FINISHED_PRODUCT_QC_FAILED" : "FINISHED_PRODUCT_QC_PASSED";
            const resultLabel = value.result === "PASSED" ? "ĐẠT" : value.result === "CONDITIONAL" ? "ĐẠT CÓ ĐIỀU KIỆN" : "KHÔNG ĐẠT";

            await tx.traceEvent.create({
                data: {
                    entityType: "FINISHED_PRODUCT_LOT",
                    entityId: lot.id,
                    eventType: traceType,
                    eventTime: inspectedAt,
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: facility.id,
                    title: `QC Thành phẩm ${resultLabel} - ${lot.lotCode}`,
                    description: `Sản phẩm: ${lot.productName} | Cảm quan: ${value.appearance || "Đạt"} | Màu sắc: ${value.color || "Đạt"} | Vi sinh/dư lượng: ${value.microbiologyResult || "Đạt"}${value.testCertificateCode ? ` | Số phiếu KN: ${value.testCertificateCode}` : ""}`,
                    sourceEntityType: "PROCESSING_BATCH",
                    sourceEntityId: lot.processingBatchId,
                    isPublic: true,
                },
            });

            return updatedLot;
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Lưu kết quả QC thất bại." },
            { status: 500 }
        );
    }
}
