import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createBookSchema = z.object({
    farmId: z.string().min(1, "Vui lòng chọn vườn"),
    cropSeasonId: z.string().min(1, "Vui lòng chọn vụ mùa"),
    pestName: z.string().trim().min(2, "Tên sinh vật quá ngắn").max(200),
    scientificName: z.string().trim().max(200).optional().nullable(),
    trapType: z.string().trim().min(2, "Vui lòng nhập loại bẫy").max(100),
    attractant: z.string().trim().max(200).optional().nullable(),
    startDate: z.string().optional().nullable(),
    checkFrequencyDays: z.coerce.number().int().min(1).default(7),
    notes: z.string().trim().max(1000).optional().nullable(),
    initialTraps: z
        .array(
            z.object({
                trapCode: z.string().trim().min(1),
                trapType: z.string().trim().optional(),
                locationName: z.string().trim().min(1),
                latitude: z.number().optional().nullable(),
                longitude: z.number().optional().nullable(),
            }),
        )
        .optional(),
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

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get("farmId");
        const cropSeasonId = searchParams.get("cropSeasonId");
        const status = searchParams.get("status");

        const whereClause: any = { farmerId };

        if (farmId) whereClause.farmId = farmId;
        if (cropSeasonId) whereClause.cropSeasonId = cropSeasonId;
        if (status && ["ACTIVE", "CLOSED"].includes(status)) {
            whereClause.status = status;
        }

        const books = await prisma.pestMonitoringBook.findMany({
            where: whereClause,
            include: {
                farm: { select: { id: true, farmName: true, farmCode: true } },
                cropSeason: { select: { id: true, name: true, year: true, status: true } },
                traps: {
                    select: { id: true, trapCode: true, trapType: true, locationName: true, status: true, latitude: true, longitude: true },
                },
                inspections: {
                    orderBy: { inspectionDate: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        inspectionDate: true,
                        totalPestsCount: true,
                        densityLevel: true,
                        actionNeeded: true,
                    },
                },
                _count: {
                    select: {
                        traps: true,
                        inspections: true,
                        treatments: true,
                    },
                },
            },
            orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        });

        // Định dạng dữ liệu trả về cho card
        const formattedBooks = books.map((b) => {
            const latestInspection = b.inspections[0] || null;
            return {
                id: b.id,
                pestName: b.pestName,
                scientificName: b.scientificName,
                trapType: b.trapType,
                attractant: b.attractant,
                startDate: b.startDate.toISOString(),
                checkFrequencyDays: b.checkFrequencyDays,
                status: b.status,
                notes: b.notes,
                farm: b.farm,
                cropSeason: b.cropSeason,
                trapsCount: b._count.traps,
                inspectionsCount: b._count.inspections,
                treatmentsCount: b._count.treatments,
                latestInspection: latestInspection
                    ? {
                        id: latestInspection.id,
                        inspectionDate: latestInspection.inspectionDate.toISOString(),
                        totalPestsCount: latestInspection.totalPestsCount,
                        densityLevel: latestInspection.densityLevel,
                        actionNeeded: latestInspection.actionNeeded,
                    }
                    : null,
            };
        });

        return NextResponse.json({ success: true, data: formattedBooks });
    } catch (error: any) {
        console.error("Error in GET /api/farmer/pest-monitoring:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
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
        const parsed = createBookSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const {
            farmId,
            cropSeasonId,
            pestName,
            scientificName,
            trapType,
            attractant,
            startDate,
            checkFrequencyDays,
            notes,
            initialTraps,
        } = parsed.data;

        // Tạo Sổ theo dõi và các bẫy ban đầu nếu có
        const book = await prisma.pestMonitoringBook.create({
            data: {
                farmerId,
                farmId,
                cropSeasonId,
                pestName,
                scientificName: scientificName || null,
                trapType,
                attractant: attractant || null,
                startDate: startDate ? new Date(startDate) : new Date(),
                checkFrequencyDays,
                notes: notes || null,
                traps: initialTraps && initialTraps.length > 0
                    ? {
                        create: initialTraps.map((t) => ({
                            trapCode: t.trapCode,
                            trapType: t.trapType || trapType,
                            locationName: t.locationName,
                            latitude: t.latitude || null,
                            longitude: t.longitude || null,
                        })),
                    }
                    : undefined,
            },
            include: {
                traps: true,
                farm: { select: { farmName: true } },
                cropSeason: { select: { name: true } },
            },
        });

        return NextResponse.json({ success: true, data: book, message: "Đã tạo sổ theo dõi sinh vật gây hại thành công." }, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/farmer/pest-monitoring:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
