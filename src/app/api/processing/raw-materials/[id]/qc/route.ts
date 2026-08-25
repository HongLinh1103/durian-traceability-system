import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    result: z.enum(["PASSED", "FAILED", "CONDITIONAL"]), appearance: z.string().trim().optional(), qualityGrade: z.string().trim().optional(),
    residueResult: z.string().trim().optional(), damageRate: z.coerce.number().min(0).max(100).optional(), note: z.string().trim().optional(),
    warehouseLocation: z.string().trim().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") return NextResponse.json({ success: false }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 });
    const lot = await prisma.rawMaterialLot.findUnique({ where: { id: params.id }, include: { facility: true, rawMaterialReceipt: true } });
    if (!lot || lot.facility.ownerId !== session.user.id) return NextResponse.json({ success: false }, { status: 404 });
    if (lot.status !== "PENDING_QC" && lot.status !== "QUARANTINED") return NextResponse.json({ success: false, message: "Lô nguyên liệu không ở trạng thái chờ QC." }, { status: 400 });
    const value = parsed.data;
    const nextLotStatus = value.result === "PASSED" ? "AVAILABLE" : value.result === "FAILED" ? "REJECTED" : "QUARANTINED";
    const nextReceiptStatus = value.result === "PASSED" ? "ACCEPTED" : value.result === "FAILED" ? "REJECTED" : "QC_PENDING";
    await prisma.$transaction([
        prisma.qualityInspection.create({ data: { rawMaterialLotId: lot.id, inspectorId: session.user.id, inspectedAt: new Date(), appearance: value.appearance, qualityGrade: value.qualityGrade, residueResult: value.residueResult, damageRate: value.damageRate, result: value.result, note: value.note } }),
        prisma.rawMaterialLot.update({ where: { id: lot.id }, data: { status: nextLotStatus, currentWeight: value.result === "FAILED" ? 0 : lot.acceptedWeight, warehouseLocation: value.warehouseLocation || lot.warehouseLocation } }),
        prisma.rawMaterialReceipt.update({ where: { id: lot.rawMaterialReceiptId }, data: { status: nextReceiptStatus } }),
    ]);
    return NextResponse.json({ success: true, data: { status: nextLotStatus } });
}
