import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPrismaActivityType, toPrismaGrowthStage } from "@/lib/mappings";
import { activityTypes, growthStages } from "@/lib/constants";

export const dynamic = "force-dynamic";

const createSchema = z.object({
    farmId: z.string().min(1),
    plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    plannedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal("")),
    title: z.string().trim().min(2).max(160),
    stage: z.enum(growthStages),
    activityType: z.enum(activityTypes),
    otherActivity: z.string().trim().max(160).optional(),
    plannedMaterial: z.string().trim().max(300).optional(),
    plannedQuantity: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(1000).optional(),
});

function dayBounds(date: string) {
    const start = new Date(`${date}T00:00:00+07:00`);
    return { gte: start, lt: new Date(start.getTime() + 86_400_000) };
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false }, { status: 403 });
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const farmId = url.searchParams.get("farmId");
    const dueOnly = url.searchParams.get("due") === "true";
    const where: Record<string, unknown> = { farmerId: session.user.id };
    if (farmId) where.farmId = farmId;
    if (dueOnly) {
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        where.plannedDate = dayBounds(today);
        where.status = { not: "COMPLETED" };
    } else if (month && /^\d{4}-\d{2}$/.test(month)) {
        const start = new Date(`${month}-01T00:00:00+07:00`);
        const end = new Date(start); end.setMonth(end.getMonth() + 1);
        where.plannedDate = { gte: start, lt: end };
    }
    const [plans, farms] = await Promise.all([
        prisma.farmingPlan.findMany({ where, include: { farm: { select: { farmName: true, farmCode: true } }, log: { select: { id: true } } }, orderBy: [{ plannedDate: "asc" }, { createdAt: "asc" }] }),
        prisma.farm.findMany({ where: { farmerId: session.user.id, isActive: true }, select: { id: true, farmName: true, farmCode: true }, orderBy: { createdAt: "asc" } }),
    ]);
    return NextResponse.json({ success: true, plans, farms, dueCount: dueOnly ? plans.length : undefined });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false }, { status: 403 });
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Thông tin kế hoạch chưa hợp lệ." }, { status: 400 });
    const farm = await prisma.farm.findFirst({ where: { id: parsed.data.farmId, farmerId: session.user.id, isActive: true }, select: { id: true } });
    if (!farm) return NextResponse.json({ success: false, message: "Vườn không hợp lệ." }, { status: 404 });
    if (parsed.data.activityType === "Khác" && !parsed.data.otherActivity) return NextResponse.json({ success: false, message: "Vui lòng nhập tên công việc." }, { status: 400 });
    const plan = await prisma.farmingPlan.create({ data: { farmerId: session.user.id, farmId: farm.id, plannedDate: new Date(`${parsed.data.plannedDate}T${parsed.data.plannedTime || "00:00"}:00+07:00`), title: parsed.data.title, stage: toPrismaGrowthStage(parsed.data.stage), activityType: toPrismaActivityType(parsed.data.activityType), otherActivity: parsed.data.otherActivity || null, plannedMaterial: parsed.data.plannedMaterial || null, plannedQuantity: parsed.data.plannedQuantity || null, notes: parsed.data.notes || null } });
    return NextResponse.json({ success: true, plan }, { status: 201 });
}
