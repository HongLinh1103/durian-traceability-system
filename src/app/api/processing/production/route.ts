import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ rawMaterialLotId: z.string().min(1), inputWeight: z.coerce.number().positive(), outputWeight: z.coerce.number().positive(), productName: z.string().trim().min(2), method: z.string().trim().min(2), packaging: z.string().trim().optional(), manufacturedAt: z.string().optional(), note: z.string().trim().optional() });

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." }, { status: 400 });
    const value = parsed.data;
    if (value.outputWeight > value.inputWeight) return NextResponse.json({ success: false, message: "Khối lượng thành phẩm không được vượt đầu vào." }, { status: 400 });
    const raw = await prisma.rawMaterialLot.findUnique({ where: { id: value.rawMaterialLotId }, include: { facility: true } });
    if (!raw || raw.facility.ownerId !== session.user.id) return NextResponse.json({ success: false, message: "Không tìm thấy lô nguyên liệu." }, { status: 404 });
    if (!["PROCESSING", "SPLIT"].includes(raw.direction) || !["AVAILABLE", "PARTIALLY_USED"].includes(raw.status)) return NextResponse.json({ success: false, message: "Lô chưa được phân loại sang nhánh chế biến." }, { status: 400 });
    if (value.inputWeight > Number(raw.currentWeight)) return NextResponse.json({ success: false, message: "Khối lượng đầu vào vượt lượng còn lại." }, { status: 400 });
    const at = value.manufacturedAt ? new Date(value.manufacturedAt) : new Date();
    const code = `${at.toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
    const remaining = Number(raw.currentWeight) - value.inputWeight;
    const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.processingBatch.create({ data: { batchCode: `PB-${code}`, facilityId: raw.facilityId, method: value.method, targetProduct: value.productName, startedAt: at, completedAt: at, supervisorId: session.user.id, totalInputWeight: value.inputWeight, totalOutputWeight: value.outputWeight, lossWeight: value.inputWeight - value.outputWeight, yieldPercent: value.outputWeight / value.inputWeight * 100, status: "COMPLETED", note: value.note || null } });
        await tx.processingBatchInput.create({ data: { processingBatchId: batch.id, rawMaterialLotId: raw.id, inputWeight: value.inputWeight } });
        const finishedLot = await tx.finishedProductLot.create({ data: { lotCode: `FP-${code}`, processingBatchId: batch.id, facilityId: raw.facilityId, productName: value.productName, productType: "PROCESSED_DURIAN", branch: "PROCESSED", quantity: value.outputWeight, netWeight: value.outputWeight, remainingWeight: value.outputWeight, manufacturedAt: at, packaging: value.packaging || null, status: "READY_FOR_DISTRIBUTION" } });
        await tx.rawMaterialLot.update({ where: { id: raw.id }, data: { currentWeight: remaining, status: remaining > 0 ? "PARTIALLY_USED" : "USED" } });
        await tx.lotRelation.create({ data: { sourceType: "RAW_MATERIAL_LOT", sourceId: raw.id, targetType: "PROCESSING_BATCH", targetId: batch.id, relationType: "PROCESSED_INTO", quantity: value.inputWeight } });
        await tx.lotRelation.create({ data: { sourceType: "PROCESSING_BATCH", sourceId: batch.id, targetType: "FINISHED_PRODUCT_LOT", targetId: finishedLot.id, relationType: "PROCESSED_INTO", quantity: value.outputWeight } });
        await tx.traceEvent.create({ data: { entityType: "PROCESSING_BATCH", entityId: batch.id, eventType: "PROCESSING_COMPLETED", eventTime: at, actorId: session.user.id, actorRole: "PROCESSING_FACILITY", organizationType: "PROCESSING_FACILITY", organizationId: raw.facilityId, title: "Hoàn tất bốc múi / chế biến", description: `${value.productName} · Đầu vào ${value.inputWeight} kg · Thành phẩm ${value.outputWeight} kg`, sourceEntityType: "RAW_MATERIAL_LOT", sourceEntityId: raw.id, isPublic: true } });
        return { batch, finishedLot };
    });
    return NextResponse.json({ success: true, message: "Đã tạo lô thành phẩm chế biến.", data: result }, { status: 201 });
}
