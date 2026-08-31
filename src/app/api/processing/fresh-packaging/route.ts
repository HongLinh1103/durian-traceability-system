import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    lotId: z.string().optional(),
    rawMaterialLotId: z.string().optional(),
    outputWeight: z.coerce.number().positive(),
    boxCount: z.coerce.number().optional(),
    packagingSpec: z.string().trim().default("Thùng 5-6 trái / 18kg"),
    completedAt: z.string().optional(),
    note: z.string().trim().optional(),
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    const value = parsed.data;
    const completedAt = value.completedAt ? new Date(value.completedAt) : new Date();

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });
    if (!facility) {
        return NextResponse.json({ success: false, message: "Không tìm thấy cơ sở chế biến." }, { status: 404 });
    }

    // 1. If lotId is provided and exists in FinishedProductLot
    if (value.lotId && !value.lotId.startsWith("raw-fresh-")) {
        const lot = await prisma.finishedProductLot.findUnique({
            where: { id: value.lotId },
            include: { facility: true, processingBatch: true },
        });

        if (lot && lot.facilityId === facility.id) {
            const updated = await prisma.finishedProductLot.update({
                where: { id: lot.id },
                data: {
                    netWeight: value.outputWeight,
                    quantity: value.outputWeight,
                    remainingWeight: value.outputWeight,
                    packaging: value.packagingSpec,
                    manufacturedAt: completedAt,
                    status: "READY_FOR_DISTRIBUTION",
                },
            });

            if (lot.processingBatchId) {
                await prisma.processingBatch.update({
                    where: { id: lot.processingBatchId },
                    data: {
                        totalOutputWeight: value.outputWeight,
                        completedAt,
                        status: "COMPLETED",
                        note: value.note || undefined,
                    },
                });
            }

            return NextResponse.json({
                success: true,
                message: "Đã cập nhật thông tin đóng gói thùng xuất khẩu.",
                data: updated,
            });
        }
    }

    // 2. If creating from a RawMaterialLot with fresh export weight
    const rawId = value.rawMaterialLotId || value.lotId?.replace("raw-fresh-", "");
    if (!rawId) {
        return NextResponse.json({ success: false, message: "Thiếu thông tin lô nguyên liệu." }, { status: 400 });
    }

    const raw = await prisma.rawMaterialLot.findUnique({
        where: { id: rawId },
        include: { facility: true },
    });

    if (!raw || raw.facilityId !== facility.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô nguyên liệu." }, { status: 404 });
    }

    const dateCode = completedAt.toISOString().slice(0, 10).replaceAll("-", "");
    const suffix = `${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.processingBatch.create({
            data: {
                batchCode: `PK-${dateCode}-${suffix}`,
                facilityId: facility.id,
                method: "Đóng gói trái tươi xuất khẩu",
                targetProduct: "Sầu riêng tươi xuất khẩu",
                startedAt: completedAt,
                completedAt: completedAt,
                supervisorId: session.user.id,
                totalInputWeight: value.outputWeight,
                totalOutputWeight: value.outputWeight,
                lossWeight: 0,
                yieldPercent: 100,
                status: "COMPLETED",
                note: value.note || "Đóng gói trái tươi xuất khẩu",
            },
        });

        await tx.processingBatchInput.create({
            data: {
                processingBatchId: batch.id,
                rawMaterialLotId: raw.id,
                inputWeight: value.outputWeight,
            },
        });

        const finishedLot = await tx.finishedProductLot.create({
            data: {
                lotCode: `FP-FRESH-${dateCode}-${suffix}`,
                processingBatchId: batch.id,
                facilityId: facility.id,
                productName: "Sầu riêng tươi xuất khẩu",
                productType: "FRESH_DURIAN",
                branch: "FRESH_PACKED",
                quantity: value.outputWeight,
                netWeight: value.outputWeight,
                remainingWeight: value.outputWeight,
                manufacturedAt: completedAt,
                packaging: value.packagingSpec,
                status: "READY_FOR_DISTRIBUTION",
            },
        });

        await tx.lotRelation.create({
            data: {
                sourceType: "RAW_MATERIAL_LOT",
                sourceId: raw.id,
                targetType: "PROCESSING_BATCH",
                targetId: batch.id,
                relationType: "PACKAGED_INTO",
                quantity: value.outputWeight,
            },
        });

        await tx.lotRelation.create({
            data: {
                sourceType: "PROCESSING_BATCH",
                sourceId: batch.id,
                targetType: "FINISHED_PRODUCT_LOT",
                targetId: finishedLot.id,
                relationType: "PACKAGED_INTO",
                quantity: value.outputWeight,
            },
        });

        return { batch, finishedLot };
    });

    return NextResponse.json({
        success: true,
        message: "Đã hoàn tất đóng gói lô hàng tươi.",
        data: result,
    }, { status: 201 });
}
