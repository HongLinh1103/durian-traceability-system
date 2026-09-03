import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    freshExportWeight: z.coerce.number().min(0).default(0),
    processingWeight: z.coerce.number().min(0).default(0),
    rejectedWeight: z.coerce.number().min(0).default(0),
    freshExportFruitCount: z.coerce.number().min(0).optional(),
    processingFruitCount: z.coerce.number().min(0).optional(),
    rejectedFruitCount: z.coerce.number().min(0).optional(),
    freshProductName: z.string().trim().min(1).default("Sầu riêng tươi xuất khẩu"),
    packaging: z.string().trim().optional(),
    classifiedAt: z.string().optional(),
    note: z.string().trim().optional(),
}).refine((value) => value.freshExportWeight + value.processingWeight + value.rejectedWeight > 0, "Phải phân loại ít nhất một nhánh.");

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Dữ liệu phân loại không hợp lệ." }, { status: 400 });
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });
    if (!facility) {
        return NextResponse.json({ success: false, message: "Không tìm thấy cơ sở chế biến." }, { status: 404 });
    }

    let lotId = params.id;
    let lot = await prisma.rawMaterialLot.findUnique({
        where: { id: lotId },
        include: {
            facility: true,
            rawMaterialReceipt: {
                include: {
                    sourceHarvestLot: { include: { farm: true, harvestRecord: true } },
                },
            },
        },
    });

    if (!lot && lotId.startsWith("harvest-")) {
        const harvestRecordId = lotId.replace("harvest-", "");
        lot = await prisma.rawMaterialLot.findFirst({
            where: {
                facilityId: facility.id,
                rawMaterialReceipt: {
                    sourceHarvestLot: {
                        harvestRecordId,
                    },
                },
            },
            include: {
                facility: true,
                rawMaterialReceipt: {
                    include: {
                        sourceHarvestLot: { include: { farm: true, harvestRecord: true } },
                    },
                },
            },
        });
    }

    if (!lot || lot.facility.ownerId !== session.user.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô tiếp nhận nguyên liệu." }, { status: 404 });
    }

    const value = parsed.data;
    const totalInput = Number(lot.acceptedWeight || lot.currentWeight);
    const totalClassified = value.freshExportWeight + value.processingWeight + value.rejectedWeight;

    // Validation: Check total matches actual received weight within 0.05kg tolerance
    if (Math.abs(totalClassified - totalInput) > 0.05 && totalClassified > totalInput + 0.001) {
        return NextResponse.json({
            success: false,
            message: `Tổng khối lượng phân loại (${totalClassified} kg) không được vượt quá khối lượng thực nhận (${totalInput} kg).`,
        }, { status: 400 });
    }

    const classifiedAt = value.classifiedAt ? new Date(value.classifiedAt) : new Date();
    const direction = value.freshExportWeight > 0 && value.processingWeight > 0
        ? "SPLIT"
        : value.freshExportWeight > 0
        ? "FRESH_EXPORT"
        : "PROCESSING";

    const dateCode = classifiedAt.toISOString().slice(0, 10).replaceAll("-", "");

    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.rawMaterialLot.update({
            where: { id: lot.id },
            data: {
                direction,
                freshExportWeight: value.freshExportWeight,
                processingWeight: value.processingWeight,
                classifiedAt,
                classifiedById: session.user.id,
                currentWeight: value.processingWeight,
                status: value.processingWeight > 0 ? "AVAILABLE" : "USED",
            },
        });

        const fruitSummary = [
            value.freshExportFruitCount ? `Trái tươi: ${value.freshExportFruitCount} trái` : "",
            value.processingFruitCount ? `Chế biến: ${value.processingFruitCount} trái` : "",
            value.rejectedFruitCount ? `Loại bỏ: ${value.rejectedFruitCount} trái` : "",
        ].filter(Boolean).join(" · ");

        await tx.traceEvent.create({
            data: {
                entityType: "RAW_MATERIAL_LOT",
                entityId: lot.id,
                eventType: "RAW_MATERIAL_CLASSIFIED",
                eventTime: classifiedAt,
                actorId: session.user.id,
                actorRole: "PROCESSING_FACILITY",
                organizationType: "PROCESSING_FACILITY",
                organizationId: lot.facilityId,
                title: "Tiếp nhận và phân loại nguyên liệu",
                description: `Trái tươi xuất khẩu: ${value.freshExportWeight.toLocaleString("vi-VN")} kg${value.freshExportFruitCount ? ` (${value.freshExportFruitCount} trái)` : ""} · Chuyển chế biến: ${value.processingWeight.toLocaleString("vi-VN")} kg${value.processingFruitCount ? ` (${value.processingFruitCount} trái)` : ""} · Không đạt/loại bỏ: ${value.rejectedWeight.toLocaleString("vi-VN")} kg${value.rejectedFruitCount ? ` (${value.rejectedFruitCount} trái)` : ""}`,
                metadata: {
                    direction,
                    freshExportWeight: value.freshExportWeight,
                    processingWeight: value.processingWeight,
                    rejectedWeight: value.rejectedWeight,
                    freshExportFruitCount: value.freshExportFruitCount,
                    processingFruitCount: value.processingFruitCount,
                    rejectedFruitCount: value.rejectedFruitCount,
                    totalActualWeight: totalInput,
                    fruitSummary,
                },
                isPublic: true,
            },
        });

        return { rawMaterialLot: updated };
    });

    return NextResponse.json({
        success: true,
        message: "Đã phân loại lô hàng thành công và chuyển dữ liệu sang Chế biến & Đóng gói.",
        data: result,
    }, { status: 201 });
}

