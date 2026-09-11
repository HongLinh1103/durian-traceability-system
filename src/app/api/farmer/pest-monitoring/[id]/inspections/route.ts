import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inspectionSchema = z.object({
    inspectionDate: z.string().optional().nullable(),
    inspectorName: z.string().trim().min(1, "Vui lòng nhập tên người điều tra").max(100),
    method: z.string().trim().optional().nullable(),
    targetPart: z.string().trim().optional().nullable(),
    resultText: z.string().trim().optional().nullable(),
    totalPestsCount: z.coerce.number().int().min(0).optional(),
    densityLevel: z.string().trim().optional().nullable(),
    weatherCondition: z.string().trim().optional().nullable(),
    actionNeeded: z.boolean().default(false),
    actionNote: z.string().trim().max(500).optional().nullable(),
    images: z.array(z.string()).default([]),
    notes: z.string().trim().max(1000).optional().nullable(),
    trapItems: z.array(
        z.object({
            trapId: z.string().optional().nullable(),
            trapCode: z.string().optional().nullable(),
            method: z.string().optional().nullable(),
            targetPart: z.string().optional().nullable(),
            resultText: z.string().optional().nullable(),
            pestsCount: z.coerce.number().int().min(0).default(0),
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
            method,
            targetPart,
            resultText,
            densityLevel,
            weatherCondition,
            actionNeeded,
            actionNote,
            images,
            notes,
            trapItems,
        } = parsed.data;

        // Tính tổng số cá thể từ trapItems nếu có
        const totalPestsCount = trapItems.length > 0
            ? trapItems.reduce((sum, item) => sum + item.pestsCount, 0)
            : (parsed.data.totalPestsCount ?? (resultText && !resultText.includes("Không") ? 1 : 0));

        const inspection = await prisma.$transaction(async (tx) => {
            const insp = await tx.pestInspection.create({
                data: {
                    monitoringBookId: book.id,
                    inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
                    inspectorName,
                    method: method || (trapItems.length > 0 ? "Kiểm tra bẫy" : "Quan sát trực tiếp"),
                    targetPart: targetPart || null,
                    resultText: resultText || (totalPestsCount > 0 ? `${totalPestsCount} cá thể` : "Không phát hiện"),
                    totalPestsCount,
                    densityLevel: densityLevel || (totalPestsCount === 0 ? "Không phát hiện" : totalPestsCount <= 3 ? "Nhẹ" : totalPestsCount <= 10 ? "Trung bình" : "Nặng"),
                    weatherCondition,
                    actionNeeded,
                    actionNote,
                    images,
                    notes,
                    items: trapItems.length > 0
                        ? {
                            create: trapItems.map((t) => ({
                                trapId: t.trapId || null,
                                method: t.method || method || "Kiểm tra bẫy",
                                targetPart: t.targetPart || t.trapCode || null,
                                resultText: t.resultText || (t.pestsCount > 0 ? `${t.pestsCount} cá thể` : "0"),
                                pestsCount: t.pestsCount,
                                baitStatus: t.baitStatus || "Bình thường",
                                notes: t.notes || null,
                            })),
                        }
                        : {
                            create: [
                                {
                                    trapId: null,
                                    method: method || "Quan sát trực tiếp",
                                    targetPart: targetPart || null,
                                    resultText: resultText || "Không phát hiện",
                                    pestsCount: totalPestsCount,
                                    notes: notes || null,
                                },
                            ],
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
            message: `Đã ghi nhận đợt điều tra thành công.`,
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/farmer/pest-monitoring/[id]/inspections:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}

const updateInspectionSchema = inspectionSchema.extend({
    inspectionId: z.string().min(1, "Vui lòng chỉ định đợt điều tra"),
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
        const parsed = updateInspectionSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const {
            inspectionId,
            inspectionDate,
            inspectorName,
            method,
            targetPart,
            resultText,
            densityLevel,
            weatherCondition,
            actionNeeded,
            actionNote,
            images,
            notes,
            trapItems,
        } = parsed.data;

        const existing = await prisma.pestInspection.findFirst({
            where: { id: inspectionId, monitoringBookId: book.id },
        });
        if (!existing) {
            return NextResponse.json({ success: false, message: "Không tìm thấy đợt điều tra." }, { status: 404 });
        }

        const totalPestsCount = trapItems.length > 0
            ? trapItems.reduce((sum, item) => sum + item.pestsCount, 0)
            : (parsed.data.totalPestsCount ?? (resultText && !resultText.includes("Không") ? 1 : 0));

        const updated = await prisma.$transaction(async (tx) => {
            if (trapItems.length > 0) {
                await tx.pestInspectionItem.deleteMany({
                    where: { inspectionId },
                });
                await tx.pestInspectionItem.createMany({
                    data: trapItems.map((item) => ({
                        inspectionId,
                        trapId: item.trapId || null,
                        method: item.method || "Kiểm tra bẫy",
                        targetPart: item.targetPart || null,
                        resultText: item.resultText || null,
                        pestsCount: item.pestsCount,
                        baitStatus: item.baitStatus || null,
                        notes: item.notes || null,
                    })),
                });
            }

            const insp = await tx.pestInspection.update({
                where: { id: inspectionId },
                data: {
                    inspectionDate: inspectionDate ? new Date(inspectionDate) : existing.inspectionDate,
                    inspectorName,
                    method: method || existing.method,
                    targetPart: targetPart !== undefined ? targetPart : existing.targetPart,
                    resultText: resultText !== undefined ? resultText : existing.resultText,
                    totalPestsCount,
                    densityLevel: densityLevel !== undefined ? densityLevel : existing.densityLevel,
                    weatherCondition: weatherCondition !== undefined ? weatherCondition : existing.weatherCondition,
                    actionNeeded: actionNeeded ?? existing.actionNeeded,
                    actionNote: actionNote !== undefined ? actionNote : existing.actionNote,
                    images: images && images.length > 0 ? images : existing.images,
                    notes: notes !== undefined ? notes : existing.notes,
                },
                include: {
                    items: true,
                },
            });

            await tx.pestMonitoringBook.update({
                where: { id: book.id },
                data: { updatedAt: new Date() },
            });

            return insp;
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: "Cập nhật đợt điều tra thành công.",
        });
    } catch (error: any) {
        console.error("Error in PUT /api/farmer/pest-monitoring/[id]/inspections:", error);
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
        let inspectionId = searchParams.get("inspectionId");
        if (!inspectionId) {
            const body = await request.json().catch(() => ({}));
            inspectionId = body.inspectionId;
        }

        if (!inspectionId) {
            return NextResponse.json({ success: false, message: "Vui lòng chỉ định đợt điều tra cần xóa." }, { status: 400 });
        }

        await prisma.pestInspection.delete({
            where: { id: inspectionId, monitoringBookId: book.id },
        });

        return NextResponse.json({ success: true, message: "Đã xóa đợt điều tra thành công." });
    } catch (error: any) {
        console.error("Error in DELETE /api/farmer/pest-monitoring/[id]/inspections:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
