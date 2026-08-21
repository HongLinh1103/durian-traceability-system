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
            areaTreated,
            resultNotes,
            farmingLogId,
        } = parsed.data;

        const treatment = await prisma.pestTreatment.create({
            data: {
                monitoringBookId: book.id,
                treatmentDate: treatmentDate ? new Date(treatmentDate) : new Date(),
                treatmentType,
                productUsed: productUsed || null,
                dosage: dosage || null,
                areaTreated: areaTreated || "Toàn vườn",
                resultNotes: resultNotes || null,
                farmingLogId: farmingLogId || null,
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
