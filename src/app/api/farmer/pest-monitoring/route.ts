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
    firstDetectedDate: z.string().optional().nullable(),
    discoveryStage: z.string().trim().max(100).optional().nullable(),
    discoverySource: z.string().trim().max(200).optional().nullable(),
    discoveryLogId: z.string().optional().nullable(),
    monitoringMethods: z.array(z.string()).default([]),
    targetPart: z.string().trim().max(200).optional().nullable(),
    trapType: z.string().trim().max(100).optional().nullable(),
    attractant: z.string().trim().max(200).optional().nullable(),
    startDate: z.string().optional().nullable(),
    checkFrequencyDays: z.coerce.number().int().min(1).default(7),
    notes: z.string().trim().max(1000).optional().nullable(),
    treatmentMethod: z.enum(["TRAP", "SPRAY"]).optional().nullable(),
    treatmentProduct: z.string().trim().max(200).optional().nullable(),
    treatmentPhi: z.coerce.number().int().min(0).optional().nullable(),
    traps: z
        .array(
            z.object({
                trapCode: z.string().trim().min(1),
                trapType: z.string().trim().optional().default("Bẫy lồng"),
                attractant: z.string().trim().optional().nullable(),
                locationName: z.string().trim().min(1),
                latitude: z.number().optional().nullable(),
                longitude: z.number().optional().nullable(),
                notes: z.string().trim().optional().nullable(),
            }),
        )
        .optional(),
    initialTraps: z.array(z.any()).optional(),
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
                farm: { select: { id: true, farmName: true, farmCode: true, address: true, ward: true, district: true, province: true } },
                cropSeason: { select: { id: true, name: true, year: true, status: true } },
                discoveryLog: {
                    select: {
                        id: true,
                        actionDate: true,
                        stage: true,
                        activityType: true,
                        otherActivity: true,
                    },
                },
                traps: {
                    select: {
                        id: true,
                        trapCode: true,
                        trapType: true,
                        attractant: true,
                        locationName: true,
                        status: true,
                        latitude: true,
                        longitude: true,
                    },
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
                        resultText: true,
                    },
                },
                treatments: {
                    orderBy: { treatmentDate: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        treatmentDate: true,
                        treatmentType: true,
                        productUsed: true,
                        dosage: true,
                        phiDays: true,
                        resultNotes: true,
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
            const latestTreatment = b.treatments[0] || null;
            return {
                id: b.id,
                pestName: b.pestName,
                scientificName: b.scientificName,
                trapType: b.trapType || (b.traps[0]?.trapType ?? null),
                attractant: b.attractant || (b.traps[0]?.attractant ?? null),
                firstDetectedDate: b.firstDetectedDate ? b.firstDetectedDate.toISOString() : null,
                discoveryStage: b.discoveryStage,
                discoverySource: b.discoverySource,
                discoveryLogId: b.discoveryLogId,
                discoveryLog: b.discoveryLog
                    ? {
                        ...b.discoveryLog,
                        actionDate: b.discoveryLog.actionDate.toISOString(),
                    }
                    : null,
                monitoringMethods: b.monitoringMethods && b.monitoringMethods.length > 0
                    ? b.monitoringMethods
                    : (b.traps.length > 0 ? ["Kiểm tra bẫy"] : ["Quan sát trực tiếp"]),
                targetPart: b.targetPart,
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
                        resultText: latestInspection.resultText,
                    }
                    : null,
                latestTreatment: latestTreatment
                    ? {
                        id: latestTreatment.id,
                        treatmentDate: latestTreatment.treatmentDate.toISOString(),
                        treatmentType: latestTreatment.treatmentType,
                        productUsed: latestTreatment.productUsed,
                        dosage: latestTreatment.dosage,
                        phiDays: latestTreatment.phiDays,
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
            firstDetectedDate,
            discoveryStage,
            discoverySource,
            discoveryLogId,
            monitoringMethods,
            targetPart,
            trapType,
            attractant,
            startDate,
            checkFrequencyDays,
            notes,
            treatmentMethod,
            treatmentProduct,
            treatmentPhi,
            traps,
            initialTraps,
        } = parsed.data;

        const isSpray = treatmentMethod === "SPRAY";
        const effectiveTraps = (!isSpray && traps && traps.length > 0)
            ? traps
            : (!isSpray && initialTraps && initialTraps.length > 0)
            ? initialTraps.map((t: any) => ({
                trapCode: t.trapCode,
                trapType: t.trapType || trapType || "Bẫy lồng",
                attractant: t.attractant || attractant || null,
                locationName: t.locationName,
                latitude: t.latitude || null,
                longitude: t.longitude || null,
                notes: t.notes || null,
            }))
            : [];

        const hasTraps = effectiveTraps.length > 0;
        const mainTrapType = hasTraps ? effectiveTraps[0].trapType : (isSpray ? null : (trapType || null));
        const mainAttractant = hasTraps ? (effectiveTraps[0].attractant || attractant || null) : (isSpray ? null : (attractant || null));
        const finalMethods = monitoringMethods && monitoringMethods.length > 0
            ? monitoringMethods
            : (hasTraps ? ["Kiểm tra bẫy"] : (isSpray ? ["Quan sát trực tiếp", "Phun thuốc"] : ["Quan sát trực tiếp"]));

        const book = await prisma.pestMonitoringBook.create({
            data: {
                farmerId,
                farmId,
                cropSeasonId,
                pestName,
                scientificName: scientificName || null,
                firstDetectedDate: firstDetectedDate ? new Date(firstDetectedDate) : (startDate ? new Date(startDate) : new Date()),
                discoveryStage: discoveryStage || null,
                discoverySource: discoverySource || null,
                discoveryLogId: discoveryLogId || null,
                monitoringMethods: finalMethods,
                targetPart: targetPart || null,
                trapType: mainTrapType,
                attractant: mainAttractant,
                startDate: startDate ? new Date(startDate) : (firstDetectedDate ? new Date(firstDetectedDate) : new Date()),
                checkFrequencyDays,
                notes: notes || null,
                traps: hasTraps
                    ? {
                        create: effectiveTraps.map((t: any) => ({
                            trapCode: t.trapCode,
                            trapType: t.trapType || "Bẫy lồng",
                            attractant: t.attractant || null,
                            locationName: t.locationName,
                            latitude: t.latitude || null,
                            longitude: t.longitude || null,
                            notes: t.notes || null,
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

        if (isSpray && treatmentProduct) {
            await prisma.pestTreatment.create({
                data: {
                    monitoringBookId: book.id,
                    treatmentDate: firstDetectedDate ? new Date(firstDetectedDate) : new Date(),
                    treatmentType: "Phun thuốc BVTV",
                    productUsed: treatmentProduct,
                    phiDays: treatmentPhi ?? null,
                    areaTreated: "Toàn vườn",
                    resultNotes: `Phun thuốc xử lý ${pestName}.`,
                },
            });
        }

        return NextResponse.json({ success: true, data: book, message: "Đã tạo sổ theo dõi sinh vật gây hại thành công." }, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/farmer/pest-monitoring:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
