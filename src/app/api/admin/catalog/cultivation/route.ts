import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { activitiesByStage, growthStages } from "@/lib/constants";
import { prismaActivityTypeMap, prismaGrowthStageMap } from "@/lib/mappings";
import { catalogCode, requireAdmin } from "@/lib/admin-catalog";

async function ensureInitialCatalog() {
    if (await prisma.cultivationStageCatalog.count()) return;
    await prisma.$transaction(growthStages.map((stage, stageIndex) => prisma.cultivationStageCatalog.create({
        data: {
            code: prismaGrowthStageMap[stage], name: stage, sortOrder: stageIndex,
            activities: { create: activitiesByStage[stage].map((activity, activityIndex) => ({ code: prismaActivityTypeMap[activity], name: activity, sortOrder: activityIndex })) },
        },
    })));
}

const createSchema = z.discriminatedUnion("entity", [
    z.object({ entity: z.literal("stage"), name: z.string().trim().min(1) }),
    z.object({ entity: z.literal("activity"), stageId: z.string().min(1), name: z.string().trim().min(1) }),
]);

export async function GET() {
    if (!await requireAdmin()) return NextResponse.json({ success: false }, { status: 403 });
    await ensureInitialCatalog();
    const data = await prisma.cultivationStageCatalog.findMany({ orderBy: { sortOrder: "asc" }, include: { activities: { orderBy: { sortOrder: "asc" } } } });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    if (!await requireAdmin()) return NextResponse.json({ success: false }, { status: 403 });
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
    try {
        if (parsed.data.entity === "stage") {
            const sortOrder = await prisma.cultivationStageCatalog.count();
            const data = await prisma.cultivationStageCatalog.create({ data: { code: catalogCode(parsed.data.name), name: parsed.data.name, sortOrder } });
            return NextResponse.json({ success: true, data }, { status: 201 });
        }
        const sortOrder = await prisma.cultivationActivityCatalog.count({ where: { stageId: parsed.data.stageId } });
        const data = await prisma.cultivationActivityCatalog.create({ data: { stageId: parsed.data.stageId, code: catalogCode(parsed.data.name), name: parsed.data.name, sortOrder } });
        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch { return NextResponse.json({ success: false, message: "Tên danh mục đã tồn tại." }, { status: 409 }); }
}
