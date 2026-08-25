import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROCESSING_STEPS_CONFIG } from "@/lib/processing-facility";

const createBatchSchema = z.object({
    rawMaterialLotId: z.string().min(1, "Vui lòng chọn lô nguyên liệu"),
    inputWeight: z.coerce.number().positive("Khối lượng đầu vào phải lớn hơn 0"),
    method: z.string().min(1, "Vui lòng nhập/chọn phương pháp chế biến"),
    targetProduct: z.string().min(1, "Vui lòng nhập/chọn sản phẩm mục tiêu"),
    lineName: z.string().trim().optional(),
    startedAt: z.string().optional(),
    supervisorName: z.string().trim().optional(),
    note: z.string().trim().optional(),
});

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    if (!facility) {
        return NextResponse.json({ success: true, data: [] });
    }

    const batches = await prisma.processingBatch.findMany({
        where: {
            facilityId: facility.id,
            ...(statusParam ? { status: statusParam as any } : {}),
        },
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
            supervisor: { select: { id: true, fullName: true, phone: true } },
            steps: {
                orderBy: { stepOrder: "asc" },
                include: { performedBy: { select: { id: true, fullName: true } } },
            },
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

    const data = batches.map((batch) => {
        const completedStepsCount = batch.steps.filter((s) => s.status === "COMPLETED").length;
        const currentStep = batch.steps.find((s) => s.status === "IN_PROGRESS") || batch.steps.find((s) => s.status === "PENDING") || batch.steps[batch.steps.length - 1];

        return {
            id: batch.id,
            batchCode: batch.batchCode,
            method: batch.method,
            targetProduct: batch.targetProduct,
            lineName: batch.lineName || "Dây chuyền 1",
            startedAt: batch.startedAt,
            completedAt: batch.completedAt,
            totalInputWeight: Number(batch.totalInputWeight),
            totalOutputWeight: Number(batch.totalOutputWeight),
            lossWeight: Number(batch.lossWeight),
            yieldPercent: Number(batch.yieldPercent),
            status: batch.status,
            note: batch.note,
            completedStepsCount,
            totalStepsCount: batch.steps.length || 9,
            currentStep: currentStep
                ? {
                      stepType: currentStep.stepType,
                      stepOrder: currentStep.stepOrder,
                      status: currentStep.status,
                  }
                : null,
            supervisor: batch.supervisor.fullName,
            inputs: batch.inputs.map((inp) => {
                const raw = inp.rawMaterialLot;
                const sourceHarvest = raw.rawMaterialReceipt.sourceHarvestLot;
                const sourceCollection = raw.rawMaterialReceipt.sourceCollectionLot;
                return {
                    id: inp.id,
                    rawMaterialLotId: raw.id,
                    rawMaterialLotCode: raw.lotCode,
                    inputWeight: Number(inp.inputWeight),
                    farmName: sourceHarvest?.farm.farmName ?? sourceCollection?.collectorFacility.name ?? "Vườn",
                    variety: sourceHarvest?.farm.durianVariety ?? "Sầu riêng Dona",
                };
            }),
            steps: batch.steps.map((step) => ({
                id: step.id,
                stepType: step.stepType,
                stepOrder: step.stepOrder,
                status: step.status,
                startedAt: step.startedAt,
                completedAt: step.completedAt,
                inputWeight: step.inputWeight ? Number(step.inputWeight) : null,
                outputWeight: step.outputWeight ? Number(step.outputWeight) : null,
                lossWeight: step.lossWeight ? Number(step.lossWeight) : null,
                performedBy: step.performedBy?.fullName || null,
                note: step.note,
                metadata: step.metadata,
            })),
            finishedLots: batch.finishedLots.map((f) => ({
                id: f.id,
                lotCode: f.lotCode,
                productName: f.productName,
                quantity: Number(f.quantity),
                netWeight: Number(f.netWeight),
                remainingWeight: Number(f.remainingWeight),
                status: f.status,
            })),
        };
    });

    return NextResponse.json({ success: true, data });
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
                    lineName: value.lineName || "Dây chuyền 1",
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

            // Initialize all 9 processing steps
            const stepCreates = PROCESSING_STEPS_CONFIG.map((cfg) => {
                if (cfg.type === "RAW_MATERIAL_ISSUE") {
                    return tx.processingStep.create({
                        data: {
                            processingBatchId: createdBatch.id,
                            stepType: cfg.type,
                            stepOrder: cfg.order,
                            status: "COMPLETED",
                            startedAt,
                            completedAt: startedAt,
                            inputWeight: value.inputWeight,
                            outputWeight: value.inputWeight,
                            lossWeight: 0,
                            performedById: session.user.id,
                            note: `Xuất kho nguyên liệu ${rawLot.lotCode} (${rawLot.warehouseLocation || "Kho NVL"})`,
                            metadata: {
                                rawMaterialLotCode: rawLot.lotCode,
                                warehouseLocation: rawLot.warehouseLocation || "KHO-NVL-01",
                                beforeWeight: currentAvailableWeight,
                                issuedWeight: value.inputWeight,
                            },
                        },
                    });
                }
                if (cfg.type === "CLEANING") {
                    return tx.processingStep.create({
                        data: {
                            processingBatchId: createdBatch.id,
                            stepType: cfg.type,
                            stepOrder: cfg.order,
                            status: "IN_PROGRESS",
                            startedAt,
                            inputWeight: value.inputWeight,
                            performedById: session.user.id,
                        },
                    });
                }
                return tx.processingStep.create({
                    data: {
                        processingBatchId: createdBatch.id,
                        stepType: cfg.type,
                        stepOrder: cfg.order,
                        status: "PENDING",
                    },
                });
            });

            await Promise.all(stepCreates);

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

            // Log RAW_MATERIAL_ISSUED
            await tx.traceEvent.create({
                data: {
                    entityType: "RAW_MATERIAL_LOT",
                    entityId: rawLot.id,
                    eventType: "RAW_MATERIAL_ISSUED",
                    eventTime: startedAt,
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: facility.id,
                    title: "Xuất kho nguyên liệu đưa vào chế biến",
                    description: `Đã xuất ${value.inputWeight} kg từ lô ${rawLot.lotCode} (${rawLot.warehouseLocation || "Kho NVL"}) cho mẻ ${createdBatch.batchCode} (${value.targetProduct}).`,
                    sourceEntityType: "RAW_MATERIAL_LOT",
                    sourceEntityId: rawLot.id,
                    isPublic: true,
                },
            });

            // Log PROCESSING_STARTED
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
                    description: `Sản phẩm: ${value.targetProduct} | Dây chuyền: ${value.lineName || "Dây chuyền 1"} | Phương pháp: ${value.method} | Đầu vào: ${value.inputWeight} kg`,
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
