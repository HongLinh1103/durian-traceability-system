import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    rawMaterialLotId: z.string().min(1),
    inputWeight: z.coerce.number().positive(),
    outputWeight: z.coerce.number().positive(),
    productName: z.string().trim().min(2),
    method: z.string().trim().min(2),
    packageCount: z.string().trim().optional(),
    packaging: z.string().trim().optional(),
    manufacturedAt: z.string().optional(),
    note: z.string().trim().optional(),
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." }, { status: 400 });

    const value = parsed.data;
    if (value.outputWeight > value.inputWeight) return NextResponse.json({ success: false, message: "Khối lượng thành phẩm không được vượt đầu vào." }, { status: 400 });

    let facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });
    if (!facility) {
        facility = await prisma.partnerFacility.findFirst({
            where: { type: "PROCESSING_FACILITY", deletedAt: null },
        });
    }
    if (!facility) return NextResponse.json({ success: false, message: "Không tìm thấy cơ sở chế biến." }, { status: 404 });

    const raw = await prisma.rawMaterialLot.findUnique({ where: { id: value.rawMaterialLotId }, include: { facility: true } });
    if (!raw || raw.facilityId !== facility.id) return NextResponse.json({ success: false, message: "Không tìm thấy lô nguyên liệu." }, { status: 404 });

    if (!["PROCESSING", "SPLIT"].includes(raw.direction) || !["AVAILABLE", "PARTIALLY_USED", "USED"].includes(raw.status)) {
        return NextResponse.json({ success: false, message: "Lô chưa được phân loại sang nhánh chế biến." }, { status: 400 });
    }

    const at = value.manufacturedAt ? new Date(value.manufacturedAt) : new Date();
    const code = `${at.toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
    const remaining = Math.max(0, Number(raw.currentWeight) - value.inputWeight);

    const batchNote = value.note
        ? `${value.note}${value.packageCount ? ` · Số lượng thành phẩm: ${value.packageCount}` : ""}`
        : (value.packageCount ? `Số lượng thành phẩm: ${value.packageCount}` : null);
    const packagingDesc = value.packaging
        ? value.packaging
        : (value.packageCount ? `Khay hút chân không 500g (${value.packageCount})` : "Khay hút chân không 500g");

    const supervisorId = facility.ownerId || session.user.id;

    const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.processingBatch.create({
            data: {
                batchCode: `PB-${code}`,
                facilityId: raw.facilityId,
                method: value.method,
                targetProduct: value.productName,
                startedAt: at,
                completedAt: at,
                supervisorId,
                totalInputWeight: value.inputWeight,
                totalOutputWeight: value.outputWeight,
                lossWeight: Math.max(0, value.inputWeight - value.outputWeight),
                yieldPercent: (value.outputWeight / value.inputWeight) * 100,
                status: "COMPLETED",
                note: batchNote,
            },
        });

        await tx.processingBatchInput.create({
            data: {
                processingBatchId: batch.id,
                rawMaterialLotId: raw.id,
                inputWeight: value.inputWeight,
            },
        });

        const finishedLot = await tx.finishedProductLot.create({
            data: {
                lotCode: `FP-${code}`,
                processingBatchId: batch.id,
                facilityId: raw.facilityId,
                productName: value.productName,
                productType: "PROCESSED_DURIAN",
                branch: "PROCESSED",
                quantity: value.packageCount ? (parseInt(value.packageCount, 10) || value.outputWeight) : value.outputWeight,
                netWeight: value.outputWeight,
                remainingWeight: value.outputWeight,
                manufacturedAt: at,
                packaging: packagingDesc,
                status: "READY_FOR_DISTRIBUTION",
            },
        });

        await tx.rawMaterialLot.update({
            where: { id: raw.id },
            data: {
                currentWeight: remaining,
                status: remaining > 0 ? "PARTIALLY_USED" : "USED",
            },
        });

        await tx.lotRelation.create({
            data: {
                sourceType: "RAW_MATERIAL_LOT",
                sourceId: raw.id,
                targetType: "PROCESSING_BATCH",
                targetId: batch.id,
                relationType: "PROCESSED_INTO",
                quantity: value.inputWeight,
            },
        });

        await tx.lotRelation.create({
            data: {
                sourceType: "PROCESSING_BATCH",
                sourceId: batch.id,
                targetType: "FINISHED_PRODUCT_LOT",
                targetId: finishedLot.id,
                relationType: "PROCESSED_INTO",
                quantity: value.outputWeight,
            },
        });

        await tx.traceEvent.create({
            data: {
                entityType: "PROCESSING_BATCH",
                entityId: batch.id,
                eventType: "PROCESSING_COMPLETED",
                eventTime: at,
                actorId: session.user.id,
                actorRole: "PROCESSING_FACILITY",
                organizationType: "PROCESSING_FACILITY",
                organizationId: raw.facilityId,
                title: "Hoàn tất bóc múi / chế biến",
                description: `${value.productName} · Đầu vào ${value.inputWeight} kg · Thành phẩm ${value.outputWeight} kg${value.packageCount ? ` (${value.packageCount})` : ""}`,
                sourceEntityType: "RAW_MATERIAL_LOT",
                sourceEntityId: raw.id,
                metadata: {
                    packageCount: value.packageCount,
                    outputWeight: value.outputWeight,
                    method: value.method,
                },
                isPublic: true,
            },
        });

        return { batch, finishedLot };
    });

    return NextResponse.json({ success: true, message: "Đã tạo lô thành phẩm chế biến.", data: result }, { status: 201 });
}
