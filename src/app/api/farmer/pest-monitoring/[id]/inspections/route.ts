import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inspectionSchema = z.object({
    inspectionDate: z.string().optional().nullable(),
    inspectorName: z.string().trim().min(1, "Vui lòng nhập tên người điều tra").max(100),
    densityLevel: z.string().trim().optional().nullable(),
    weatherCondition: z.string().trim().optional().nullable(),
    actionNeeded: z.boolean().default(false),
    actionNote: z.string().trim().max(500).optional().nullable(),
    images: z.array(z.string()).default([]),
    notes: z.string().trim().max(1000).optional().nullable(),
    trapItems: z.array(
        z.object({
            trapId: z.string().min(1),
            pestsCount: z.coerce.number().int().min(0),
            baitStatus: z.string().optional().nullable(),
            notes: z.string().optional().nullable(),
        }),
    ).default([]),
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
        const parsed = inspectionSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const {
            inspectionDate,
            inspectorName,
            densityLevel,
            weatherCondition,
            actionNeeded,
            actionNote,
            images,
            notes,
            trapItems,
        } = parsed.data;

        // Tính tổng số cá thể từ trapItems
        const totalPestsCount = trapItems.reduce((sum, item) => sum + item.pestsCount, 0);

        const inspection = await prisma.$transaction(async (tx) => {
            const insp = await tx.pestInspection.create({
                data: {
                    monitoringBookId: book.id,
                    inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
                    inspectorName,
                    totalPestsCount,
                    densityLevel: densityLevel || (totalPestsCount === 0 ? "Không phát hiện" : totalPestsCount <= 3 ? "Nhẹ" : totalPestsCount <= 10 ? "Trung bình" : "Nặng"),
                    weatherCondition,
                    actionNeeded,
                    actionNote,
                    images,
                    notes,
                    items: {
                        create: trapItems.map((t) => ({
                            trapId: t.trapId,
                            pestsCount: t.pestsCount,
                            baitStatus: t.baitStatus || "Bình thường",
                            notes: t.notes || null,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });

            // Cập nhật updatedAt của sổ
            await tx.pestMonitoringBook.update({
                where: { id: book.id },
                data: { updatedAt: new Date() },
            });

            return insp;
        });

        return NextResponse.json({
            success: true,
            data: inspection,
            message: `Đã ghi nhận đợt điều tra thành công (${totalPestsCount} cá thể phát hiện).`,
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/farmer/pest-monitoring/[id]/inspections:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
