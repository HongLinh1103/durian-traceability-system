import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const treatmentSchema = z.object({
    treatmentDate: z.string().optional().nullable(),
    treatmentType: z.string().trim().min(2, "Vui lòng chọn biện pháp xử lý").max(100),
    productUsed: z.string().trim().max(200).optional().nullable(),
    dosage: z.string().trim().max(100).optional().nullable(),
    phiDays: z.coerce.number().int().optional().nullable(),
    areaTreated: z.string().trim().max(200).optional().nullable(),
    resultNotes: z.string().trim().max(1000).optional().nullable(),
    farmingLogId: z.string().optional().nullable(),
});

async function resolveFarmerId(session: any): Promise<string | null> {
    if (session?.user?.id) {
        const u = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
        });
        if (u) return u.id;
    }
    if (session?.user?.phone) {
        const u = await prisma.user.findUnique({
            where: { phone: session.user.phone },
            select: { id: true },
        });
        if (u) return u.id;
    }
    if (session?.user?.email) {
        const u = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (u) return u.id;
    }
    return null;
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const book = await prisma.pestMonitoringBook.findFirst({
            where: { id: params.id, farmerId },
        });
        if (!book) {
            return NextResponse.json({ success: false, message: "Không tìm thấy sổ theo dõi." }, { status: 404 });
        }

        const json = await request.json().catch(() => null);
        const parsed = treatmentSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const {
            treatmentDate,
            treatmentType,
            productUsed,
            dosage,
            phiDays,
            areaTreated,
            resultNotes,
            farmingLogId,
        } = parsed.data;

        const linkedLog = farmingLogId ? await prisma.farmingLog.findFirst({
            where: { id: farmingLogId, farmId: book.farmId, cropSeasonId: book.cropSeasonId },
            select: { actionDate: true },
        }) : null;
        if (farmingLogId && !linkedLog) return NextResponse.json({ success: false, message: "Nhật ký không thuộc vườn và niên vụ của sổ." }, { status: 400 });
        const treatment = await prisma.pestTreatment.create({
            data: {
                monitoringBookId: book.id,
                treatmentDate: linkedLog?.actionDate || (treatmentDate ? new Date(treatmentDate) : new Date()),
                treatmentType,
                productUsed: productUsed || null,
                dosage: dosage || null,
                phiDays: phiDays ?? null,
                areaTreated: areaTreated || "Toàn vườn",
                resultNotes: resultNotes || null,
                farmingLogId: farmingLogId || null,
            },
            include: {
                farmingLog: {
                    select: {
                        id: true,
                        actionDate: true,
                        activityType: true,
                        chemicalName: true,
                        dosage: true,
                        phiDays: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: treatment,
            message: "Đã ghi nhận biện pháp can thiệp / xử lý thành công.",
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/farmer/pest-monitoring/[id]/treatments:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}

const updateTreatmentSchema = treatmentSchema.extend({
    treatmentId: z.string().min(1, "Vui lòng chỉ định biện pháp xử lý"),
});

export async function PUT(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const book = await prisma.pestMonitoringBook.findFirst({
            where: { id: params.id, farmerId },
        });
        if (!book) {
            return NextResponse.json({ success: false, message: "Không tìm thấy sổ theo dõi." }, { status: 404 });
        }

        const json = await request.json().catch(() => null);
        const parsed = updateTreatmentSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const {
            treatmentId,
            treatmentDate,
            treatmentType,
            productUsed,
            dosage,
            phiDays,
            areaTreated,
            resultNotes,
            farmingLogId,
        } = parsed.data;

        const existing = await prisma.pestTreatment.findFirst({
            where: { id: treatmentId, monitoringBookId: book.id },
        });
        if (!existing) {
            return NextResponse.json({ success: false, message: "Không tìm thấy biện pháp xử lý." }, { status: 404 });
        }

        const linkedLogId = farmingLogId !== undefined ? farmingLogId : existing.farmingLogId;
        const linkedLog = linkedLogId ? await prisma.farmingLog.findFirst({
            where: { id: linkedLogId, farmId: book.farmId, cropSeasonId: book.cropSeasonId },
            select: { actionDate: true },
        }) : null;
        if (linkedLogId && !linkedLog) return NextResponse.json({ success: false, message: "Nhật ký không thuộc vườn và niên vụ của sổ." }, { status: 400 });
        const updated = await prisma.pestTreatment.update({
            where: { id: treatmentId },
            data: {
                treatmentDate: linkedLog?.actionDate || (treatmentDate ? new Date(treatmentDate) : existing.treatmentDate),
                treatmentType,
                productUsed: productUsed !== undefined ? productUsed : existing.productUsed,
                dosage: dosage !== undefined ? dosage : existing.dosage,
                phiDays: phiDays !== undefined ? phiDays : existing.phiDays,
                areaTreated: areaTreated || existing.areaTreated,
                resultNotes: resultNotes !== undefined ? resultNotes : existing.resultNotes,
                farmingLogId: farmingLogId !== undefined ? farmingLogId : existing.farmingLogId,
            },
            include: {
                farmingLog: {
                    select: {
                        id: true,
                        actionDate: true,
                        activityType: true,
                        chemicalName: true,
                        dosage: true,
                        phiDays: true,
                    },
                },
            },
        });

        await prisma.pestMonitoringBook.update({
            where: { id: book.id },
            data: { updatedAt: new Date() },
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: "Đã cập nhật biện pháp xử lý thành công.",
        });
    } catch (error: any) {
        console.error("Error in PUT /api/farmer/pest-monitoring/[id]/treatments:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const book = await prisma.pestMonitoringBook.findFirst({
            where: { id: params.id, farmerId },
        });
        if (!book) {
            return NextResponse.json({ success: false, message: "Không tìm thấy sổ theo dõi." }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        let treatmentId = searchParams.get("treatmentId");
        if (!treatmentId) {
            const body = await request.json().catch(() => ({}));
            treatmentId = body.treatmentId;
        }

        if (!treatmentId) {
            return NextResponse.json({ success: false, message: "Vui lòng chỉ định biện pháp xử lý cần xóa." }, { status: 400 });
        }

        await prisma.pestTreatment.delete({
            where: { id: treatmentId, monitoringBookId: book.id },
        });

        return NextResponse.json({ success: true, message: "Đã xóa biện pháp xử lý thành công." });
    } catch (error: any) {
        console.error("Error in DELETE /api/farmer/pest-monitoring/[id]/treatments:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
