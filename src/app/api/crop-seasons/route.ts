import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const farmerId = await resolveFarmerId(session);
    if (!farmerId) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const farms = await prisma.farm.findMany({
        where: { farmerId, isActive: true },
        select: {
            id: true,
            farmName: true,
            farmCode: true,
            cropSeasons: {
                orderBy: [{ year: "desc" }, { sequence: "desc" }],
                select: {
                    id: true,
                    name: true,
                    year: true,
                    status: true,
                    startedAt: true,
                    closedAt: true,
                },
            },
        },
        orderBy: { farmName: "asc" },
    });

    return NextResponse.json({ success: true, farms, data: farms });
}

const schema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("CREATE"), farmId: z.string().min(1), targetYear: z.coerce.number().int().min(2020).max(2100),
        startedAt: z.string().min(1),
        startingStage: z.enum(["POST_HARVEST_RECOVERY", "MAKING_SPROUT", "FLOWER_INDUCTION", "FLOWERING", "FRUIT_SETTING", "FRUIT_GROWING", "PRE_HARVEST", "HARVEST"]),
        notes: z.string().trim().max(500).optional(),
    }),
    z.object({ action: z.literal("CLOSE"), seasonId: z.string().min(1), note: z.string().trim().max(500).optional() }),
]);

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") {
        return NextResponse.json({ success: false, message: "Chỉ nông dân được quản lý vụ mùa." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: "Dữ liệu vụ mùa không hợp lệ." }, { status: 400 });

    if (parsed.data.action === "CREATE") {
        const farm = await prisma.farm.findFirst({ where: { id: parsed.data.farmId, farmerId: session.user.id, isActive: true }, select: { id: true } });
        if (!farm) return NextResponse.json({ success: false, message: "Vườn không tồn tại hoặc không thuộc tài khoản." }, { status: 404 });
        const active = await prisma.cropSeason.findFirst({ where: { farmId: farm.id, status: "ACTIVE" }, select: { name: true } });
        if (active) return NextResponse.json({ success: false, message: `${active.name} vẫn đang hoạt động. Hãy đóng vụ trước khi mở vụ mới.` }, { status: 409 });
        const startedAt = new Date(parsed.data.startedAt);
        if (Number.isNaN(startedAt.getTime())) return NextResponse.json({ success: false, message: "Ngày bắt đầu không hợp lệ." }, { status: 400 });
        const sequence = (await prisma.cropSeason.count({ where: { farmId: farm.id, year: parsed.data.targetYear } })) + 1;
        const season = await prisma.cropSeason.create({ data: {
            farmId: farm.id,
            year: parsed.data.targetYear,
            sequence,
            name: sequence === 1 ? `Vụ ${parsed.data.targetYear}` : `Vụ ${parsed.data.targetYear} · Đợt ${sequence}`,
            startedAt,
            startingStage: parsed.data.startingStage,
            notes: parsed.data.notes || null,
            expectedEndAt: new Date(`${parsed.data.targetYear}-12-31T23:59:59+07:00`),
        } });
        return NextResponse.json({ success: true, data: season, message: "Đã bắt đầu vụ mùa mới." });
    }

    const season = await prisma.cropSeason.findFirst({ where: { id: parsed.data.seasonId, status: "ACTIVE", farm: { farmerId: session.user.id } }, select: { id: true, name: true } });
    if (!season) return NextResponse.json({ success: false, message: "Không tìm thấy vụ mùa đang hoạt động." }, { status: 404 });
    const harvested = await prisma.harvestRecord.count({ where: { cropSeasonId: season.id, status: { in: ["HARVESTED", "DELIVERY_CONFIRMED", "COMPLETED"] } } });
    if (!harvested) return NextResponse.json({ success: false, message: "Chỉ có thể đóng vụ sau khi đã ghi nhận thu hoạch." }, { status: 409 });
    await prisma.cropSeason.update({ where: { id: season.id }, data: { status: "CLOSED", closedAt: new Date(), closingNote: parsed.data.note || null } });
    return NextResponse.json({ success: true, message: `Đã đóng ${season.name}.` });
}
