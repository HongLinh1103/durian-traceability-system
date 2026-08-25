import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    result: z.enum(["PASSED", "FAILED", "CONDITIONAL"]),
    inspectedAt: z.string().optional(),
    appearance: z.string().trim().optional(),
    qualityGrade: z.string().trim().optional(),
    residueResult: z.string().trim().optional(),
    testCertificateCode: z.string().trim().optional(),
    damageRate: z.coerce.number().min(0).max(100).optional(),
    acceptedWeight: z.coerce.number().min(0).optional(),
    rejectedWeight: z.coerce.number().min(0).optional(),
    rejectionReason: z.string().trim().optional(),
    note: z.string().trim().optional(),
    warehouseLocation: z.string().trim().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const lot = await prisma.rawMaterialLot.findUnique({
        where: { id: params.id },
        include: { facility: true, rawMaterialReceipt: true }
    });
    if (!lot || lot.facility.ownerId !== session.user.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô nguyên liệu." }, { status: 404 });
    }
    if (lot.status !== "PENDING_QC" && lot.status !== "QUARANTINED") {
        return NextResponse.json({ success: false, message: "Lô nguyên liệu không ở trạng thái chờ QC." }, { status: 400 });
    }
    const value = parsed.data;
    const inspectedAt = value.inspectedAt ? new Date(value.inspectedAt) : new Date();
    const nextLotStatus = value.result === "PASSED" ? "AVAILABLE" : value.result === "FAILED" ? "REJECTED" : "QUARANTINED";
    const nextReceiptStatus = value.result === "PASSED" ? "ACCEPTED" : value.result === "FAILED" ? "REJECTED" : "QC_PENDING";

    const acceptedWeight = value.acceptedWeight !== undefined
        ? value.acceptedWeight
        : (value.result === "FAILED" ? 0 : Number(lot.acceptedWeight));

    const noteDetails = [
        value.note ? `Ghi chú: ${value.note}` : "",
        value.testCertificateCode ? `Mã phiếu kiểm nghiệm: ${value.testCertificateCode}` : "",
        value.acceptedWeight !== undefined ? `Khối lượng chấp nhận: ${value.acceptedWeight} kg` : "",
        value.rejectedWeight !== undefined ? `Khối lượng từ chối: ${value.rejectedWeight} kg` : "",
        value.rejectionReason ? `Lý do từ chối / điều kiện: ${value.rejectionReason}` : "",
    ].filter(Boolean).join(" | ");

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
            }
        }),
        prisma.rawMaterialLot.update({
            where: { id: lot.id },
            data: {
                status: nextLotStatus,
                acceptedWeight,
                currentWeight: acceptedWeight,
                warehouseLocation: value.warehouseLocation || lot.warehouseLocation
            }
        }),
        prisma.rawMaterialReceipt.update({
            where: { id: lot.rawMaterialReceiptId },
            data: { status: nextReceiptStatus }
        }),
    ]);

    return NextResponse.json({ success: true, data: { status: nextLotStatus } });
}
