import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateBookSchema = z.object({
    pestName: z.string().trim().min(2).max(200).optional(),
    scientificName: z.string().trim().max(200).optional().nullable(),
    trapType: z.string().trim().min(2).max(100).optional(),
    attractant: z.string().trim().max(200).optional().nullable(),
    checkFrequencyDays: z.coerce.number().int().min(1).optional(),
    status: z.enum(["ACTIVE", "CLOSED"]).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
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

export async function GET(
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
            where: {
                id: params.id,
                farmerId,
            },
            include: {
                farm: { select: { id: true, farmName: true, farmCode: true, address: true } },
                cropSeason: { select: { id: true, name: true, year: true, status: true } },
                traps: {
                    orderBy: { trapCode: "asc" },
                },
                inspections: {
                    orderBy: { inspectionDate: "desc" },
                    include: {
                        items: {
                            include: {
                                trap: {
                                    select: {
                                        trapCode: true,
                                        trapType: true,
                                        locationName: true,
                                        latitude: true,
                                        longitude: true,
                                    },
                                },
                            },
                        },
                    },
                },
                treatments: {
                    orderBy: { treatmentDate: "desc" },
                },
            },
        });

        if (!book) {
            return NextResponse.json({ success: false, message: "Không tìm thấy sổ theo dõi sinh vật gây hại." }, { status: 404 });
        }

        // Tính toán thống kê tổng quan
        const totalPestsDetected = book.inspections.reduce((sum, ins) => sum + ins.totalPestsCount, 0);
        const latestInspection = book.inspections[0] || null;
        const lastPestDetectedDate = book.inspections.find((ins) => ins.totalPestsCount > 0)?.inspectionDate || null;

        const summary = {
            trapsCount: book.traps.length,
            activeTrapsCount: book.traps.filter((t) => t.status === "ACTIVE").length,
            inspectionsCount: book.inspections.length,
            totalPestsDetected,
            lastInspectionDate: latestInspection ? latestInspection.inspectionDate.toISOString() : null,
            lastPestDetectedDate: lastPestDetectedDate ? lastPestDetectedDate.toISOString() : null,
            treatmentsCount: book.treatments.length,
        };

        return NextResponse.json({
            success: true,
            data: {
                ...book,
                startDate: book.startDate.toISOString(),
                createdAt: book.createdAt.toISOString(),
                updatedAt: book.updatedAt.toISOString(),
                traps: book.traps.map((t) => ({
                    ...t,
                    installedDate: t.installedDate.toISOString(),
                    createdAt: t.createdAt.toISOString(),
                    updatedAt: t.updatedAt.toISOString(),
                })),
                inspections: book.inspections.map((ins) => ({
                    ...ins,
                    inspectionDate: ins.inspectionDate.toISOString(),
                    createdAt: ins.createdAt.toISOString(),
                    updatedAt: ins.updatedAt.toISOString(),
                })),
                treatments: book.treatments.map((tr) => ({
                    ...tr,
                    treatmentDate: tr.treatmentDate.toISOString(),
                    createdAt: tr.createdAt.toISOString(),
                    updatedAt: tr.updatedAt.toISOString(),
                })),
                summary,
            },
        });
    } catch (error: any) {
        console.error("Error in GET /api/farmer/pest-monitoring/[id]:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}

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

        const json = await request.json().catch(() => null);
        const parsed = updateBookSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const updated = await prisma.pestMonitoringBook.update({
            where: { id: params.id, farmerId },
            data: parsed.data,
        });

        return NextResponse.json({ success: true, data: updated, message: "Đã cập nhật sổ theo dõi thành công." });
    } catch (error: any) {
        console.error("Error in PUT /api/farmer/pest-monitoring/[id]:", error);
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

        await prisma.pestMonitoringBook.delete({
            where: { id: params.id, farmerId },
        });

        return NextResponse.json({ success: true, message: "Đã xóa sổ theo dõi sinh vật gây hại thành công." });
    } catch (error: any) {
        console.error("Error in DELETE /api/farmer/pest-monitoring/[id]:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
