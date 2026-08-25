import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    result: z.enum(["PASSED", "FAILED", "CONDITIONAL"]),
    inspectedAt: z.string().optional(),
    appearance: z.string().trim().optional(),
    ripeness: z.string().trim().optional(),
    qualityGrade: z.string().trim().optional(),
    residueResult: z.string().trim().optional(),
    testCertificateCode: z.string().trim().optional(),
    damageRate: z.coerce.number().min(0).max(100).optional(),
    acceptedWeight: z.coerce.number().min(0).optional(),
    rejectedWeight: z.coerce.number().min(0).optional(),
    rejectionReason: z.string().trim().optional(),
    note: z.string().trim().optional(),
    warehouseLocation: z.string().trim().optional(),
    warehouseShelve: z.string().trim().optional(),
    storageCondition: z.string().trim().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
            { status: 400 }
        );
    }
    const lot = await prisma.rawMaterialLot.findUnique({
        where: { id: params.id },
        include: { facility: true, rawMaterialReceipt: true },
    });
    if (!lot || lot.facility.ownerId !== session.user.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô nguyên liệu." }, { status: 404 });
    }
    if (!["PENDING_QC", "QUARANTINED", "AVAILABLE", "REJECTED"].includes(lot.status)) {
        return NextResponse.json({ success: false, message: "Lô nguyên liệu không thể cập nhật QC." }, { status: 400 });
    }
    const value = parsed.data;
    const inspectedAt = value.inspectedAt ? new Date(value.inspectedAt) : new Date();

    let nextLotStatus: "AVAILABLE" | "QUARANTINED" | "REJECTED" = "AVAILABLE";
    let nextReceiptStatus: "ACCEPTED" | "REJECTED" = "ACCEPTED";

    if (value.result === "FAILED") {
        nextLotStatus = "REJECTED";
        nextReceiptStatus = "REJECTED";
    } else if (value.result === "CONDITIONAL") {
        nextLotStatus = "QUARANTINED";
        nextReceiptStatus = "ACCEPTED";
    } else {
        nextLotStatus = "AVAILABLE";
        nextReceiptStatus = "ACCEPTED";
    }

    const acceptedWeight =
        value.acceptedWeight !== undefined
            ? value.acceptedWeight
            : value.result === "FAILED"
            ? 0
            : Number(lot.acceptedWeight);

    const fullWarehouse = [value.warehouseLocation, value.warehouseShelve].filter(Boolean).join(" - ") || lot.warehouseLocation;

    const noteDetails = [
        value.note ? `Ghi chú: ${value.note}` : "",
        value.ripeness ? `Độ chín: ${value.ripeness}` : "",
        value.testCertificateCode ? `Mã phiếu kiểm nghiệm: ${value.testCertificateCode}` : "",
        value.acceptedWeight !== undefined ? `Khối lượng chấp nhận: ${value.acceptedWeight} kg` : "",
        value.rejectedWeight !== undefined ? `Khối lượng từ chối: ${value.rejectedWeight} kg` : "",
        value.rejectionReason ? `Lý do / điều kiện: ${value.rejectionReason}` : "",
        value.storageCondition ? `Bảo quản: ${value.storageCondition}` : "",
    ]
        .filter(Boolean)
        .join(" | ");

    const traceEventsToCreate = [
        prisma.traceEvent.create({
            data: {
                entityType: "RAW_MATERIAL_LOT",
                entityId: lot.id,
                eventType:
                    value.result === "PASSED"
                        ? "RAW_MATERIAL_QC_PASSED"
                        : value.result === "FAILED"
                        ? "RAW_MATERIAL_QC_FAILED"
                        : "RAW_MATERIAL_QC_CONDITIONAL",
                eventTime: inspectedAt,
                actorId: session.user.id,
                actorRole: "PROCESSING_FACILITY",
                organizationType: "PROCESSING_FACILITY",
                organizationId: lot.facilityId,
                title:
                    value.result === "PASSED"
                        ? "Kiểm tra chất lượng (QC) đạt"
                        : value.result === "FAILED"
                        ? "Kiểm tra chất lượng (QC) không đạt"
                        : "Kiểm tra chất lượng (QC) đạt có điều kiện",
                description: `Kết quả: ${value.result} | Grade: ${value.qualityGrade || "N/A"} | Ngoại quan: ${
                    value.appearance || "N/A"
                } | Dư lượng: ${value.residueResult || "N/A"} | Chấp nhận: ${acceptedWeight} kg | Từ chối: ${
                    value.rejectedWeight || 0
                } kg`,
                isPublic: true,
            },
        }),
    ];

    if (value.result === "PASSED" && fullWarehouse) {
        traceEventsToCreate.push(
            prisma.traceEvent.create({
                data: {
                    entityType: "RAW_MATERIAL_LOT",
                    entityId: lot.id,
                    eventType: "RAW_MATERIAL_WAREHOUSED",
                    eventTime: new Date(),
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: lot.facilityId,
                    title: "Nhập kho nguyên liệu",
                    description: `Đã nhập kho nguyên liệu: ${fullWarehouse} | Khối lượng sẵn sàng: ${acceptedWeight} kg`,
                    isPublic: true,
                },
            })
        );
    }

    await prisma.$transaction([
        prisma.qualityInspection.create({
            data: {
                rawMaterialLotId: lot.id,
                inspectorId: session.user.id,
                inspectedAt,
                appearance: value.appearance || null,
                qualityGrade: value.qualityGrade || null,
                residueResult: value.residueResult || null,
                damageRate: value.damageRate !== undefined ? value.damageRate : null,
                result: value.result,
                note: noteDetails || null,
            },
        }),
        prisma.rawMaterialLot.update({
            where: { id: lot.id },
            data: {
                status: nextLotStatus,
                acceptedWeight,
                currentWeight: acceptedWeight,
                warehouseLocation: fullWarehouse,
            },
        }),
        prisma.rawMaterialReceipt.update({
            where: { id: lot.rawMaterialReceiptId },
            data: { status: nextReceiptStatus },
        }),
        ...traceEventsToCreate,
    ]);

    return NextResponse.json({
        success: true,
        message: value.result === "PASSED" ? "QC đạt và đã nhập kho nguyên liệu thành công." : "Đã cập nhật kết quả QC.",
    });
}
