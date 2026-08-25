import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const warehouseInSchema = z.object({
    warehouseLocation: z.string().min(1, "Vui lòng nhập/chọn kho thành phẩm"),
    warehouseShelve: z.string().trim().optional(),
    storageCondition: z.string().min(1, "Vui lòng nhập điều kiện bảo quản"),
    expiryDate: z.string().min(1, "Vui lòng chọn hạn sử dụng"),
    warehousedAt: z.string().optional(),
    receiverName: z.string().trim().optional(),
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

    const parsed = warehouseInSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu nhập kho không hợp lệ." },
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
    const warehousedAt = value.warehousedAt ? new Date(value.warehousedAt) : new Date();
    const expiryDate = new Date(value.expiryDate);

    const fullLocation = value.warehouseShelve
        ? `${value.warehouseLocation} (${value.warehouseShelve})`
        : value.warehouseLocation;

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const updatedLot = await tx.finishedProductLot.update({
                where: { id: lot.id },
                data: {
                    status: "READY_FOR_DISTRIBUTION",
                    warehouseLocation: fullLocation,
                    storageCondition: value.storageCondition,
                    expiryDate,
                },
            });

            // Also update ProcessingBatch to COMPLETED if not already
            if (lot.processingBatch.status !== "COMPLETED") {
                await tx.processingBatch.update({
                    where: { id: lot.processingBatchId },
                    data: { status: "COMPLETED" },
                });
            }

            // Log Warehouse IN TraceEvent
            await tx.traceEvent.create({
                data: {
                    entityType: "FINISHED_PRODUCT_LOT",
                    entityId: lot.id,
                    eventType: "FINISHED_PRODUCT_WAREHOUSED",
                    eventTime: warehousedAt,
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: facility.id,
                    title: `Nhập kho thành phẩm ${lot.lotCode}`,
                    description: `Sản phẩm: ${lot.productName} (${Number(lot.netWeight).toLocaleString("vi-VN")} kg) đã nhập kho ${fullLocation} | Điều kiện: ${value.storageCondition} | Sẵn sàng phân phối / Tạo QR.`,
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
            { success: false, message: error instanceof Error ? error.message : "Nhập kho thành phẩm thất bại." },
            { status: 500 }
        );
    }
}
