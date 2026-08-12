import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activitiesByStage, activityTypes, growthStages } from "@/lib/constants";
import { toPrismaActivityType, toPrismaGrowthStage } from "@/lib/mappings";

const updateSchema = z.object({
    farmId: z.string().min(1), plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    plannedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal("")),
    stage: z.enum(growthStages), activityType: z.enum(activityTypes),
    otherActivity: z.string().trim().max(160).optional(), notes: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false }, { status: 403 });
    const plan = await prisma.farmingPlan.findFirst({ where: { id: params.id, farmerId: session.user.id, status: { not: "COMPLETED" } }, select: { id: true } });
    if (!plan) return NextResponse.json({ success: false, message: "Kế hoạch không tồn tại hoặc đã hoàn thành." }, { status: 404 });
    const body = await request.json().catch(() => null);
    if (body) {
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success || !activitiesByStage[parsed.data.stage].includes(parsed.data.activityType as never)) return NextResponse.json({ success: false, message: "Thông tin cập nhật chưa hợp lệ." }, { status: 400 });
        const farm = await prisma.farm.findFirst({ where: { id: parsed.data.farmId, farmerId: session.user.id, isActive: true }, select: { id: true } });
        if (!farm) return NextResponse.json({ success: false, message: "Vườn không hợp lệ." }, { status: 404 });
        const title = parsed.data.activityType === "Khác" ? parsed.data.otherActivity?.trim() : parsed.data.activityType;
        if (!title) return NextResponse.json({ success: false, message: "Vui lòng nhập hoạt động khác." }, { status: 400 });
        await prisma.farmingPlan.update({ where: { id: plan.id }, data: { farmId: farm.id, plannedDate: new Date(`${parsed.data.plannedDate}T${parsed.data.plannedTime || "00:00"}:00+07:00`), title, stage: toPrismaGrowthStage(parsed.data.stage), activityType: toPrismaActivityType(parsed.data.activityType), otherActivity: parsed.data.otherActivity || null, notes: parsed.data.notes || null } });
    } else {
        await prisma.farmingPlan.update({ where: { id: plan.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
    }
    return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false }, { status: 403 });
    await prisma.farmingPlan.deleteMany({ where: { id: params.id, farmerId: session.user.id, status: { not: "COMPLETED" } } });
    return NextResponse.json({ success: true });
}
