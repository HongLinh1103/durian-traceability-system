import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-catalog";

const schema = z.object({ name: z.string().trim().min(1).optional(), alternativeName: z.string().trim().nullable().optional(), description: z.string().trim().nullable().optional(), isActive: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    if (!await requireAdmin()) return NextResponse.json({ success: false }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
    try {
        const data = await prisma.durianVariety.update({ where: { id: params.id }, data: parsed.data });
        return NextResponse.json({ success: true, data });
    } catch { return NextResponse.json({ success: false, message: "Không thể cập nhật giống." }, { status: 400 }); }
}
