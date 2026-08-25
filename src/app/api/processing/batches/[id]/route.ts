import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
    action: z.enum(["PAUSE", "RESUME", "CANCEL", "COMPLETE"]),
    note: z.string().trim().optional(),
    // Complete fields
    outputWeight: z.coerce.number().positive("Khối lượng thành phẩm phải lớn hơn 0").optional(),
    productName: z.string().trim().optional(),
    productType: z.string().trim().optional(),
    packaging: z.string().trim().optional(),
    storageCondition: z.string().trim().optional(),
    warehouseLocation: z.string().trim().optional(),
    expiryDate: z.string().optional(),
    completedAt: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    }

    const batch = await prisma.processingBatch.findUnique({
        where: { id: params.id },
        include: {
            facility: true,
            supervisor: { select: { fullName: true, phone: true } },
            inputs: {
                include: {
                    rawMaterialLot: {
                        include: {
                            rawMaterialReceipt: {
                                include: {
                                    sourceHarvestLot: {
                                        include: {
                                            farm: { include: { region: true } },
                                            harvestRecord: { include: { farmer: true } },
                                        },
                                    },
                                    sourceCollectionLot: { include: { collectorFacility: true } },
                                },
                            },
                            inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
                        },
                    },
                },
            },
            finishedLots: {
                include: {
                    commercialLots: {
                        include: { traceabilityCode: true, destination: true },
                    },
                },
            },
            steps: {
                orderBy: { stepOrder: "asc" },
                include: { performedBy: { select: { id: true, fullName: true } } },
            },
        },
    });

    if (!batch || batch.facility.ownerId !== session.user.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô chế biến." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: batch });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
            { status: 400 }
        );
    }

    const { action, note, outputWeight, productName, productType, packaging, storageCondition, warehouseLocation, expiryDate, completedAt } = parsed.data;

    const batch = await prisma.processingBatch.findUnique({
        where: { id: params.id },
        include: {
            facility: true,
            inputs: { include: { rawMaterialLot: true } },
        },
    });

    if (!batch || batch.facility.ownerId !== session.user.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô chế biến." }, { status: 404 });
    }

    const now = new Date();

    if (action === "PAUSE") {
        if (batch.status !== "IN_PROGRESS") {
            return NextResponse.json({ success: false, message: "Chỉ có thể tạm dừng mẻ đang chế biến." }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const res = await tx.processingBatch.update({
                where: { id: batch.id },
                data: {
                    status: "PAUSED",
                    note: note ? (batch.note ? `${batch.note}\n[Tạm dừng]: ${note}` : note) : batch.note,
                },
            });

            await tx.traceEvent.create({
                data: {
                    entityType: "PROCESSING_BATCH",
                    entityId: batch.id,
                    eventType: "PROCESSING_PAUSED",
                    eventTime: now,
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: batch.facilityId,
                    title: `Tạm dừng mẻ chế biến ${batch.batchCode}`,
                    description: note || "Mẻ chế biến tạm dừng",
                    isPublic: true,
                },
            });

            return res;
        });

        return NextResponse.json({ success: true, data: updated });
    }

    if (action === "RESUME") {
        if (batch.status !== "PAUSED") {
            return NextResponse.json({ success: false, message: "Chỉ có thể tiếp tục mẻ đang tạm dừng." }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const res = await tx.processingBatch.update({
                where: { id: batch.id },
                data: {
                    status: "IN_PROGRESS",
                    note: note ? (batch.note ? `${batch.note}\n[Tiếp tục]: ${note}` : note) : batch.note,
                },
            });

            await tx.traceEvent.create({
                data: {
                    entityType: "PROCESSING_BATCH",
                    entityId: batch.id,
                    eventType: "PROCESSING_RESUMED",
                    eventTime: now,
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: batch.facilityId,
                    title: `Tiếp tục mẻ chế biến ${batch.batchCode}`,
                    description: note || "Mẻ chế biến được tiếp tục",
                    isPublic: true,
                },
            });

            return res;
        });

        return NextResponse.json({ success: true, data: updated });
    }

    if (action === "CANCEL") {
        if (batch.status === "COMPLETED") {
            return NextResponse.json({ success: false, message: "Không thể hủy mẻ đã hoàn tất." }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const res = await tx.processingBatch.update({
                where: { id: batch.id },
                data: {
                    status: "CANCELLED",
                    note: note ? (batch.note ? `${batch.note}\n[Đã hủy]: ${note}` : note) : batch.note,
                },
            });

            // Restore raw material lot weights
            for (const input of batch.inputs) {
                await tx.rawMaterialLot.update({
                    where: { id: input.rawMaterialLotId },
                    data: {
                        currentWeight: { increment: input.inputWeight },
                        status: "AVAILABLE",
                    },
                });
            }

            await tx.traceEvent.create({
                data: {
                    entityType: "PROCESSING_BATCH",
                    entityId: batch.id,
                    eventType: "PROCESSING_CANCELLED",
                    eventTime: now,
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: batch.facilityId,
                    title: `Hủy mẻ chế biến ${batch.batchCode}`,
                    description: note || "Mẻ chế biến bị hủy, hoàn trả nguyên liệu khả dụng",
                    isPublic: true,
                },
            });

            return res;
        });

        return NextResponse.json({ success: true, data: updated });
    }

    if (action === "COMPLETE") {
        if (!["IN_PROGRESS", "PAUSED", "PREPARING", "DRAFT"].includes(batch.status)) {
            return NextResponse.json({ success: false, message: "Lô chế biến không ở trạng thái hợp lệ để hoàn tất." }, { status: 400 });
        }

        if (!outputWeight || outputWeight <= 0) {
            return NextResponse.json({ success: false, message: "Vui lòng nhập khối lượng thành phẩm thực tế (> 0)." }, { status: 400 });
        }

        const inputWeight = Number(batch.totalInputWeight);
        const lossWeight = Math.max(0, inputWeight - outputWeight);
        const yieldPercent = inputWeight > 0 ? Number(((outputWeight / inputWeight) * 100).toFixed(2)) : 0;
        const completionDate = completedAt ? new Date(completedAt) : now;
        const dateCode = completionDate.toISOString().slice(0, 10).replaceAll("-", "");

        // Generate FinishedProductLot code FPL-YYYYMMDD-XXX
        const existingFplCount = await prisma.finishedProductLot.count({
            where: {
                facilityId: batch.facilityId,
                lotCode: { startsWith: `FPL-${dateCode}` },
            },
        });
        const fplCode = `FPL-${dateCode}-${String(existingFplCount + 1).padStart(3, "0")}`;

        const finalProductName = productName?.trim() || batch.targetProduct;
        const finalProductType = productType?.trim() || batch.method;

        try {
            const result = await prisma.$transaction(async (tx) => {
                const updatedBatch = await tx.processingBatch.update({
                    where: { id: batch.id },
                    data: {
                        status: "COMPLETED",
                        completedAt: completionDate,
                        totalOutputWeight: outputWeight,
                        lossWeight,
                        yieldPercent,
                        note: note ? (batch.note ? `${batch.note}\n[Hoàn tất]: ${note}` : note) : batch.note,
                    },
                });

                const finishedLot = await tx.finishedProductLot.create({
                    data: {
                        lotCode: fplCode,
                        processingBatchId: batch.id,
                        facilityId: batch.facilityId,
                        productName: finalProductName,
                        productType: finalProductType,
                        quantity: outputWeight,
                        netWeight: outputWeight,
                        remainingWeight: outputWeight,
                        manufacturedAt: completionDate,
                        expiryDate: expiryDate ? new Date(expiryDate) : null,
                        packaging: packaging || null,
                        storageCondition: storageCondition || null,
                        warehouseLocation: warehouseLocation || null,
                        status: "READY_FOR_DISTRIBUTION",
                    },
                });

                await tx.lotRelation.create({
                    data: {
                        sourceType: "PROCESSING_BATCH",
                        sourceId: batch.id,
                        targetType: "FINISHED_PRODUCT_LOT",
                        targetId: finishedLot.id,
                        relationType: "PROCESSED_INTO",
                        quantity: outputWeight,
                        unit: "kg",
                    },
                });

                await tx.traceEvent.create({
                    data: {
                        entityType: "PROCESSING_BATCH",
                        entityId: batch.id,
                        eventType: "PROCESSING_COMPLETED",
                        eventTime: completionDate,
                        actorId: session.user.id,
                        actorRole: "PROCESSING_FACILITY",
                        organizationType: "PROCESSING_FACILITY",
                        organizationId: batch.facilityId,
                        title: `Hoàn tất mẻ chế biến ${batch.batchCode}`,
                        description: `Đầu vào: ${inputWeight} kg | Đầu ra: ${outputWeight} kg | Hao hụt: ${lossWeight} kg | Hiệu suất thu hồi: ${yieldPercent}%`,
                        isPublic: true,
                    },
                });

                await tx.traceEvent.create({
                    data: {
                        entityType: "FINISHED_PRODUCT_LOT",
                        entityId: finishedLot.id,
                        eventType: "FINISHED_PRODUCT_CREATED",
                        eventTime: completionDate,
                        actorId: session.user.id,
                        actorRole: "PROCESSING_FACILITY",
                        organizationType: "PROCESSING_FACILITY",
                        organizationId: batch.facilityId,
                        title: `Tạo lô thành phẩm ${finishedLot.lotCode}`,
                        description: `Sản phẩm: ${finalProductName} | Khối lượng: ${outputWeight} kg | Quy cách: ${packaging || "Chưa cập nhật"} | Kho: ${warehouseLocation || "Chưa cập nhật"}`,
                        sourceEntityType: "PROCESSING_BATCH",
                        sourceEntityId: batch.id,
                        isPublic: true,
                    },
                });

                return { batch: updatedBatch, finishedLot };
            });

            return NextResponse.json({ success: true, data: result });
        } catch (error) {
            return NextResponse.json(
                { success: false, message: error instanceof Error ? error.message : "Hoàn tất mẻ chế biến thất bại." },
                { status: 500 }
            );
        }
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ." }, { status: 400 });
}
