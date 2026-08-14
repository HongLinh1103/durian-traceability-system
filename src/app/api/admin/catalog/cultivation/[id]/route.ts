import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-catalog";

const schema = z.object({ entity: z.enum(["stage", "activity"]), name: z.string().trim().min(1).optional(), isActive: z.boolean().optional(), sortOrder: z.number().int().min(0).optional() });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    if (!await requireAdmin()) return NextResponse.json({ success: false }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
    const { entity, ...data } = parsed.data;
    try {
        const result = entity === "stage"
            ? await prisma.cultivationStageCatalog.update({ where: { id: params.id }, data })
            : await prisma.cultivationActivityCatalog.update({ where: { id: params.id }, data });
        return NextResponse.json({ success: true, data: result });
    } catch { return NextResponse.json({ success: false, message: "Không thể cập nhật danh mục." }, { status: 400 }); }
}
