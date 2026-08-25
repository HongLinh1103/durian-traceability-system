import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROCESSING_STEPS_CONFIG, calculateYield } from "@/lib/processing-facility";

const stepUpdateSchema = z.object({
    action: z.enum(["START", "COMPLETE", "SKIP"]).default("COMPLETE"),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    inputWeight: z.coerce.number().optional(),
    outputWeight: z.coerce.number().optional(),
    lossWeight: z.coerce.number().optional(),
    note: z.string().trim().optional(),
    metadata: z.record(z.unknown()).optional(),
});

export async function PATCH(
    request: Request,
    { params }: { params: { id: string; stepType: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }

    const parsed = stepUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
            { status: 400 }
        );
    }

    const { id: batchId, stepType } = params;
    const value = parsed.data;

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    if (!facility) {
        return NextResponse.json({ success: false, message: "Cơ sở chế biến chưa được kích hoạt." }, { status: 400 });
    }

    const batch = await prisma.processingBatch.findUnique({
        where: { id: batchId },
        include: {
            steps: { orderBy: { stepOrder: "asc" } },
            inputs: { include: { rawMaterialLot: true } },
        },
    });

    if (!batch || batch.facilityId !== facility.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy mẻ chế biến." }, { status: 404 });
    }

    const targetStep = batch.steps.find((s) => s.stepType === stepType);
    if (!targetStep) {
        return NextResponse.json({ success: false, message: "Công đoạn không tồn tại trong mẻ chế biến." }, { status: 404 });
    }

    // Business Rule XLIV: Không cho ProcessingStep sau chạy trước bước bắt buộc trước đó
    const previousSteps = batch.steps.filter((s) => s.stepOrder < targetStep.stepOrder);
    const incompletePrevious = previousSteps.find((s) => s.status !== "COMPLETED" && s.status !== "SKIPPED");
    if (incompletePrevious) {
        const prevConfig = PROCESSING_STEPS_CONFIG.find((c) => c.type === incompletePrevious.stepType);
        return NextResponse.json(
            {
                success: false,
                message: `Chưa thể thực hiện bước này vì bước trước đó (${prevConfig?.name || incompletePrevious.stepType}) chưa hoàn tất.`,
            },
            { status: 400 }
        );
    }

    const completedAt = value.completedAt ? new Date(value.completedAt) : new Date();
    const startedAt = value.startedAt ? new Date(value.startedAt) : targetStep.startedAt || completedAt;

    try {
        const result = await prisma.$transaction(async (tx) => {
            let nextStatus: "COMPLETED" | "IN_PROGRESS" | "SKIPPED" = "COMPLETED";
            if (value.action === "START") nextStatus = "IN_PROGRESS";
            if (value.action === "SKIP") nextStatus = "SKIPPED";

            const inputWeight = value.inputWeight !== undefined ? value.inputWeight : Number(targetStep.inputWeight ?? batch.totalInputWeight);
            const outputWeight = value.outputWeight !== undefined ? value.outputWeight : inputWeight;
            const lossWeight = value.lossWeight !== undefined ? value.lossWeight : Math.max(0, inputWeight - outputWeight);

            // Update current step
            const updatedStep = await tx.processingStep.update({
                where: { id: targetStep.id },
                data: {
                    status: nextStatus,
                    startedAt: value.action === "START" ? startedAt : targetStep.startedAt || startedAt,
                    completedAt: nextStatus === "COMPLETED" || nextStatus === "SKIPPED" ? completedAt : null,
                    inputWeight,
                    outputWeight,
                    lossWeight,
                    performedById: session.user.id,
                    note: value.note || targetStep.note,
                    metadata: (value.metadata as any) || targetStep.metadata,
                },
            });

            // If this step is completed, activate next step
            if (nextStatus === "COMPLETED") {
                const nextStep = batch.steps.find((s) => s.stepOrder === targetStep.stepOrder + 1);
                if (nextStep && nextStep.status === "PENDING") {
                    await tx.processingStep.update({
                        where: { id: nextStep.id },
                        data: {
                            status: "IN_PROGRESS",
                            startedAt: completedAt,
                            inputWeight: outputWeight,
                        },
                    });
                }
            }

            // Create step-specific TraceEvent
            let traceEventType = "";
            let traceTitle = "";
            let traceDescription = "";

            switch (stepType) {
                case "CLEANING":
                    traceEventType = "CLEANING_COMPLETED";
                    traceTitle = `Hoàn tất làm sạch - Mẻ ${batch.batchCode}`;
                    traceDescription = `Đầu vào: ${inputWeight} kg | Sau làm sạch: ${outputWeight} kg | Hao hụt: ${lossWeight} kg`;
                    break;
                case "PEELING_PULP_SEPARATION":
                    traceEventType = "PEELING_COMPLETED";
                    traceTitle = `Hoàn tất tách vỏ & tách múi - Mẻ ${batch.batchCode}`;
                    traceDescription = `Đầu vào: ${inputWeight} kg | Múi thu hồi: ${outputWeight} kg | Vỏ/hạt: ${lossWeight} kg`;
                    break;
                case "REJECT_REMOVAL":
                    traceEventType = "REJECT_REMOVAL_COMPLETED";
                    traceTitle = `Hoàn tất phân loại loại bỏ - Mẻ ${batch.batchCode}`;
                    traceDescription = `Đầu vào: ${inputWeight} kg | Đạt chuẩn: ${outputWeight} kg | Loại bỏ: ${lossWeight} kg | Lý do: ${(value.metadata?.rejectionReason as string) || "Khuyết tật/dập"}`;
                    break;
                case "FINAL_WEIGHING":
                    traceEventType = "FINAL_WEIGHING_COMPLETED";
                    traceTitle = `Hoàn tất cân định lượng - Mẻ ${batch.batchCode}`;
                    traceDescription = `Khối lượng thành phẩm thực tế: ${outputWeight} kg | Chênh lệch: ${lossWeight} kg`;
                    break;
                case "PACKAGING":
                    traceEventType = "PACKAGING_COMPLETED";
                    traceTitle = `Hoàn tất đóng gói - Mẻ ${batch.batchCode}`;
                    traceDescription = `Quy cách: ${(value.metadata?.packagingSpec as string) || "Gói"} | Số lượng: ${(value.metadata?.packageCount as number) || 0} | Tổng KL: ${outputWeight} kg`;
                    break;
                case "FREEZING":
                    traceEventType = "FREEZING_COMPLETED";
                    traceTitle = `Hoàn tất cấp đông - Mẻ ${batch.batchCode}`;
                    traceDescription = `Phương pháp: ${(value.metadata?.freezingMethod as string) || "IQF"} | Nhiệt độ: ${(value.metadata?.actualTemperature as string) || "-18°C"} | Kết quả: ${(value.metadata?.freezingResult as string) || "Đạt"}`;
                    break;
                case "FINISHED_PRODUCT_QC":
                    const qcResult = (value.metadata?.result as string) || "PASSED";
                    traceEventType = qcResult === "FAILED" ? "FINISHED_PRODUCT_QC_FAILED" : "FINISHED_PRODUCT_QC_PASSED";
                    traceTitle = qcResult === "FAILED" ? `QC thành phẩm KHÔNG ĐẠT - Mẻ ${batch.batchCode}` : `QC thành phẩm ĐẠT - Mẻ ${batch.batchCode}`;
                    traceDescription = `Kết quả: ${qcResult} | Cảm quan: ${(value.metadata?.appearance as string) || "Đạt"} | Vi sinh/dư lượng: ${(value.metadata?.microbiologyResult as string) || "Đạt"}`;
                    break;
                case "FINISHED_PRODUCT_WAREHOUSE_IN":
                    traceEventType = "FINISHED_PRODUCT_WAREHOUSED";
                    traceTitle = `Nhập kho thành phẩm - Mẻ ${batch.batchCode}`;
                    traceDescription = `Kho: ${(value.metadata?.warehouseLocation as string) || "Kho TP"} | Khối lượng: ${outputWeight} kg`;
                    break;
            }

            if (traceEventType && nextStatus === "COMPLETED") {
                await tx.traceEvent.create({
                    data: {
                        entityType: "PROCESSING_BATCH",
                        entityId: batch.id,
                        eventType: traceEventType,
                        eventTime: completedAt,
                        actorId: session.user.id,
                        actorRole: "PROCESSING_FACILITY",
                        organizationType: "PROCESSING_FACILITY",
                        organizationId: facility.id,
                        title: traceTitle,
                        description: traceDescription,
                        isPublic: true,
                    },
                });
            }

            // Step 9 Completion: atomically complete ProcessingBatch & generate FinishedProductLot
            let createdFinishedLot = null;
            if (stepType === "FINISHED_PRODUCT_WAREHOUSE_IN" && nextStatus === "COMPLETED") {
                const totalInputWeight = Number(batch.totalInputWeight);
                const finalOutputWeight = outputWeight;
                const { lossWeight: totalLoss, yieldPercent } = calculateYield(totalInputWeight, finalOutputWeight);

                // Update Batch to COMPLETED
                await tx.processingBatch.update({
                    where: { id: batch.id },
                    data: {
                        status: "COMPLETED",
                        completedAt,
                        totalOutputWeight: finalOutputWeight,
                        lossWeight: totalLoss,
                        yieldPercent,
                    },
                });

                // Generate unique finished lot code FPL-YYYYMMDD-XXX
                const dateCode = completedAt.toISOString().slice(0, 10).replaceAll("-", "");
                const existingFinishedCount = await tx.finishedProductLot.count({
                    where: {
                        facilityId: facility.id,
                        lotCode: { startsWith: `FPL-${dateCode}` },
                    },
                });
                const lotCode = `FPL-${dateCode}-${String(existingFinishedCount + 1).padStart(3, "0")}`;

                const meta = (value.metadata as any) || {};
                const productName = meta.productName || batch.targetProduct;
                const packaging = meta.packaging || "500g/túi";
                const storageCondition = meta.storageCondition || "-18°C";
                const warehouseLocation = meta.warehouseLocation || "KHO-TP-01";
                const quantity = meta.packageCount ? Number(meta.packageCount) : Math.max(1, Math.round(finalOutputWeight / 0.5));
                const expiryDate = meta.expiryDate ? new Date(meta.expiryDate) : new Date(completedAt.getTime() + 365 * 24 * 60 * 60 * 1000);

                createdFinishedLot = await tx.finishedProductLot.create({
                    data: {
                        lotCode,
                        processingBatchId: batch.id,
                        facilityId: facility.id,
                        productName,
                        productType: batch.method,
                        quantity,
                        netWeight: finalOutputWeight,
                        remainingWeight: finalOutputWeight,
                        manufacturedAt: completedAt,
                        expiryDate,
                        packaging,
                        storageCondition,
                        warehouseLocation,
                        status: "READY_FOR_DISTRIBUTION",
                    },
                });

                await tx.lotRelation.create({
                    data: {
                        sourceType: "PROCESSING_BATCH",
                        sourceId: batch.id,
                        targetType: "FINISHED_PRODUCT_LOT",
                        targetId: createdFinishedLot.id,
                        relationType: "PROCESSED_INTO",
                        quantity: finalOutputWeight,
                        unit: "kg",
                    },
                });

                // Log PROCESSING_COMPLETED
                await tx.traceEvent.create({
                    data: {
                        entityType: "PROCESSING_BATCH",
                        entityId: batch.id,
                        eventType: "PROCESSING_COMPLETED",
                        eventTime: completedAt,
                        actorId: session.user.id,
                        actorRole: "PROCESSING_FACILITY",
                        organizationType: "PROCESSING_FACILITY",
                        organizationId: facility.id,
                        title: `Hoàn tất mẻ chế biến ${batch.batchCode}`,
                        description: `Sản phẩm: ${productName} | Đầu ra: ${finalOutputWeight} kg | Hao hụt: ${totalLoss} kg | Hiệu suất thu hồi: ${yieldPercent}%`,
                        isPublic: true,
                    },
                });

                // Log FINISHED_PRODUCT_CREATED
                await tx.traceEvent.create({
                    data: {
                        entityType: "FINISHED_PRODUCT_LOT",
                        entityId: createdFinishedLot.id,
                        eventType: "FINISHED_PRODUCT_CREATED",
                        eventTime: completedAt,
                        actorId: session.user.id,
                        actorRole: "PROCESSING_FACILITY",
                        organizationType: "PROCESSING_FACILITY",
                        organizationId: facility.id,
                        title: `Tạo lô thành phẩm ${createdFinishedLot.lotCode}`,
                        description: `${productName} (${finalOutputWeight} kg) đã nhập kho ${warehouseLocation} và sẵn sàng phân phối.`,
                        sourceEntityType: "PROCESSING_BATCH",
                        sourceEntityId: batch.id,
                        isPublic: true,
                    },
                });
            }

            return { step: updatedStep, finishedLot: createdFinishedLot };
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Cập nhật công đoạn thất bại." },
            { status: 500 }
        );
    }
}
