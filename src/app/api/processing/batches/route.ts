import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createBatchSchema = z.object({
    rawMaterialLotId: z.string().min(1, "Vui lòng chọn nguồn nguyên liệu"),
    inputWeight: z.coerce.number().positive("Khối lượng đưa vào chế biến phải lớn hơn 0"),
    method: z.string().trim().min(2, "Vui lòng chọn hoặc nhập phương pháp chế biến"),
    targetProduct: z.string().trim().min(2, "Vui lòng chọn hoặc nhập sản phẩm mục tiêu"),
    startedAt: z.string().optional(),
    supervisorName: z.string().trim().optional(),
    note: z.string().trim().optional(),
});

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

    const batches = await prisma.processingBatch.findMany({
        where: { facilityId: facility.id },
        include: {
            inputs: {
                include: {
                    rawMaterialLot: {
                        include: {
                            rawMaterialReceipt: {
                                include: {
                                    sourceHarvestLot: { include: { farm: true } },
                                },
                            },
                        },
                    },
                },
            },
            supervisor: { select: { fullName: true, phone: true } },
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
    });

    const formatted = batches.map((batch) => ({
        id: batch.id,
        batchCode: batch.batchCode,
        method: batch.method,
        targetProduct: batch.targetProduct,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        totalInputWeight: Number(batch.totalInputWeight),
        totalOutputWeight: Number(batch.totalOutputWeight),
        lossWeight: Number(batch.lossWeight),
        yieldPercent: Number(batch.yieldPercent),
        status: batch.status,
        note: batch.note,
        supervisor: batch.supervisor.fullName,
        inputs: batch.inputs.map((input) => ({
            id: input.id,
            rawMaterialLotId: input.rawMaterialLotId,
            rawMaterialLotCode: input.rawMaterialLot.lotCode,
            inputWeight: Number(input.inputWeight),
            farmName: input.rawMaterialLot.rawMaterialReceipt.sourceHarvestLot?.farm.farmName ?? "Lô tổng hợp",
        })),
        finishedLots: batch.finishedLots.map((lot) => ({
            id: lot.id,
            lotCode: lot.lotCode,
            productName: lot.productName,
            netWeight: Number(lot.netWeight),
            remainingWeight: Number(lot.remainingWeight),
            status: lot.status,
        })),
    }));

    return NextResponse.json({ success: true, data: formatted });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }

    const parsed = createBatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
            { status: 400 }
        );
    }

    const value = parsed.data;

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    if (!facility) {
        return NextResponse.json({ success: false, message: "Cơ sở chế biến chưa được kích hoạt." }, { status: 400 });
    }

    const rawLot = await prisma.rawMaterialLot.findUnique({
        where: { id: value.rawMaterialLotId },
        include: { rawMaterialReceipt: true },
    });

    if (!rawLot || rawLot.facilityId !== facility.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô nguyên liệu hợp lệ." }, { status: 404 });
    }

    if (!["AVAILABLE", "PARTIALLY_USED"].includes(rawLot.status)) {
        return NextResponse.json(
            { success: false, message: `Lô nguyên liệu không ở trạng thái sẵn sàng chế biến (hiện tại: ${rawLot.status}).` },
            { status: 400 }
        );
    }

    const currentAvailableWeight = Number(rawLot.currentWeight);
    if (value.inputWeight > currentAvailableWeight) {
        return NextResponse.json(
            {
                success: false,
                message: `Khối lượng đưa vào chế biến (${value.inputWeight} kg) vượt quá khối lượng khả dụng (${currentAvailableWeight.toLocaleString("vi-VN")} kg).`,
            },
            { status: 400 }
        );
    }

    const startedAt = value.startedAt ? new Date(value.startedAt) : new Date();
    const dateCode = startedAt.toISOString().slice(0, 10).replaceAll("-", "");

    // Generate unique batch code PB-YYYYMMDD-XXX
    const existingCount = await prisma.processingBatch.count({
        where: {
            facilityId: facility.id,
            batchCode: { startsWith: `PB-${dateCode}` },
        },
    });
    const batchCode = `PB-${dateCode}-${String(existingCount + 1).padStart(3, "0")}`;

    const remainingRawWeight = Math.max(0, currentAvailableWeight - value.inputWeight);
    const nextRawLotStatus = remainingRawWeight === 0 ? "USED" : "PARTIALLY_USED";

    const note = [
        value.supervisorName ? `Người phụ trách: ${value.supervisorName}` : "",
        value.note,
    ].filter(Boolean).join("\n");

    try {
        const batch = await prisma.$transaction(async (tx) => {
            const createdBatch = await tx.processingBatch.create({
                data: {
                    batchCode,
                    facilityId: facility.id,
                    method: value.method,
                    targetProduct: value.targetProduct,
                    startedAt,
                    supervisorId: session.user.id,
                    totalInputWeight: value.inputWeight,
                    totalOutputWeight: 0,
                    lossWeight: 0,
                    yieldPercent: 0,
                    status: "IN_PROGRESS",
                    note: note || null,
                },
            });

            await tx.processingBatchInput.create({
                data: {
                    processingBatchId: createdBatch.id,
                    rawMaterialLotId: rawLot.id,
                    inputWeight: value.inputWeight,
                },
            });

            await tx.rawMaterialLot.update({
                where: { id: rawLot.id },
                data: {
                    currentWeight: remainingRawWeight,
                    status: nextRawLotStatus,
                },
            });

            await tx.lotRelation.create({
                data: {
                    sourceType: "RAW_MATERIAL_LOT",
                    sourceId: rawLot.id,
                    targetType: "PROCESSING_BATCH",
                    targetId: createdBatch.id,
                    relationType: "PROCESSED_INTO",
                    quantity: value.inputWeight,
                    unit: "kg",
                },
            });

            await tx.traceEvent.create({
                data: {
                    entityType: "PROCESSING_BATCH",
                    entityId: createdBatch.id,
                    eventType: "PROCESSING_STARTED",
                    eventTime: startedAt,
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: facility.id,
                    title: `Bắt đầu mẻ chế biến ${createdBatch.batchCode}`,
                    description: `Sản phẩm: ${value.targetProduct} | Phương pháp: ${value.method} | Nguyên liệu: ${rawLot.lotCode} (${value.inputWeight} kg)`,
                    sourceEntityType: "RAW_MATERIAL_LOT",
                    sourceEntityId: rawLot.id,
                    isPublic: true,
                },
            });

            return createdBatch;
        });

        return NextResponse.json({ success: true, data: batch }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Tạo lô chế biến thất bại." },
            { status: 500 }
        );
    }
}
