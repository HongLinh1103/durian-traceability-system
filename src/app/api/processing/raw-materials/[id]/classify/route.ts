import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    freshExportWeight: z.coerce.number().min(0),
    processingWeight: z.coerce.number().min(0),
    freshProductName: z.string().trim().min(1).default("Sầu riêng tươi đóng gói"),
    packaging: z.string().trim().optional(),
    classifiedAt: z.string().optional(),
    note: z.string().trim().optional(),
}).refine((value) => value.freshExportWeight + value.processingWeight > 0, "Phải phân loại ít nhất một nhánh.");

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Dữ liệu phân loại không hợp lệ." }, { status: 400 });

    const lot = await prisma.rawMaterialLot.findUnique({ where: { id: params.id }, include: { facility: true } });
    if (!lot || lot.facility.ownerId !== session.user.id) return NextResponse.json({ success: false, message: "Không tìm thấy lô tiếp nhận." }, { status: 404 });
    if (!['AVAILABLE', 'PARTIALLY_USED'].includes(lot.status)) return NextResponse.json({ success: false, message: "Lô phải hoàn tất tiếp nhận và QC trước khi phân loại." }, { status: 400 });
    if (lot.direction !== "UNCLASSIFIED") return NextResponse.json({ success: false, message: "Lô này đã được phân loại." }, { status: 409 });

    const value = parsed.data;
    const total = value.freshExportWeight + value.processingWeight;
    if (total > Number(lot.currentWeight) + 0.001) return NextResponse.json({ success: false, message: "Tổng khối lượng phân loại vượt quá khối lượng hiện có." }, { status: 400 });
    const classifiedAt = value.classifiedAt ? new Date(value.classifiedAt) : new Date();
    const direction = value.freshExportWeight > 0 && value.processingWeight > 0 ? "SPLIT" : value.freshExportWeight > 0 ? "FRESH_EXPORT" : "PROCESSING";
    const dateCode = classifiedAt.toISOString().slice(0, 10).replaceAll("-", "");

    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.rawMaterialLot.update({ where: { id: lot.id }, data: {
            direction, freshExportWeight: value.freshExportWeight, processingWeight: value.processingWeight,
            classifiedAt, classifiedById: session.user.id, currentWeight: value.processingWeight,
            status: value.processingWeight > 0 ? "AVAILABLE" : "USED",
        } });
        let freshFinishedLot = null;
        if (value.freshExportWeight > 0) {
            const suffix = `${Date.now().toString().slice(-6)}`;
            const batch = await tx.processingBatch.create({ data: {
                batchCode: `PK-${dateCode}-${suffix}`, facilityId: lot.facilityId, method: "Đóng gói trái tươi",
                targetProduct: value.freshProductName, startedAt: classifiedAt, completedAt: classifiedAt,
                supervisorId: session.user.id, totalInputWeight: value.freshExportWeight,
                totalOutputWeight: value.freshExportWeight, lossWeight: 0, yieldPercent: 100,
                status: "COMPLETED", note: value.note || "Nhánh trái tươi đạt chuẩn xuất khẩu",
            } });
            await tx.processingBatchInput.create({ data: { processingBatchId: batch.id, rawMaterialLotId: lot.id, inputWeight: value.freshExportWeight } });
            freshFinishedLot = await tx.finishedProductLot.create({ data: {
                lotCode: `FP-FRESH-${dateCode}-${suffix}`, processingBatchId: batch.id, facilityId: lot.facilityId,
                productName: value.freshProductName, productType: "FRESH_DURIAN", branch: "FRESH_PACKED",
                quantity: value.freshExportWeight, netWeight: value.freshExportWeight, remainingWeight: value.freshExportWeight,
                manufacturedAt: classifiedAt, packaging: value.packaging || "Đóng thùng xuất khẩu", status: "READY_FOR_DISTRIBUTION",
            } });
            await tx.lotRelation.create({ data: { sourceType: "RAW_MATERIAL_LOT", sourceId: lot.id, targetType: "PROCESSING_BATCH", targetId: batch.id, relationType: "PACKAGED_INTO", quantity: value.freshExportWeight } });
            await tx.lotRelation.create({ data: { sourceType: "PROCESSING_BATCH", sourceId: batch.id, targetType: "FINISHED_PRODUCT_LOT", targetId: freshFinishedLot.id, relationType: "PACKAGED_INTO", quantity: value.freshExportWeight } });
        }
        await tx.traceEvent.create({ data: {
            entityType: "RAW_MATERIAL_LOT", entityId: lot.id, eventType: "RAW_MATERIAL_CLASSIFIED", eventTime: classifiedAt,
            actorId: session.user.id, actorRole: "PROCESSING_FACILITY", organizationType: "PROCESSING_FACILITY", organizationId: lot.facilityId,
            title: "Tiếp nhận và phân loại", description: `Trái tươi xuất khẩu: ${value.freshExportWeight} kg · Chuyển chế biến: ${value.processingWeight} kg`,
            metadata: { direction, freshExportWeight: value.freshExportWeight, processingWeight: value.processingWeight }, isPublic: true,
        } });
        return { rawMaterialLot: updated, freshFinishedLot };
    });
    return NextResponse.json({ success: true, message: "Đã phân loại lô hàng theo hai hướng.", data: result }, { status: 201 });
}
