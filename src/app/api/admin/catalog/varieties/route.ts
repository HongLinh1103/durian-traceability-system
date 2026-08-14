import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { catalogCode, requireAdmin } from "@/lib/admin-catalog";

const schema = z.object({ name: z.string().trim().min(1), alternativeName: z.string().trim().optional(), description: z.string().trim().optional() });

export async function GET(request: Request) {
    if (!await requireAdmin()) return NextResponse.json({ success: false }, { status: 403 });
    const search = new URL(request.url).searchParams.get("search")?.trim();
    const data = await prisma.durianVariety.findMany({
        where: { deletedAt: null, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { alternativeName: { contains: search, mode: "insensitive" } }] } : {}) },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    if (!await requireAdmin()) return NextResponse.json({ success: false }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Vui lòng nhập tên giống." }, { status: 400 });
    try {
        const data = await prisma.durianVariety.create({ data: { code: catalogCode(parsed.data.name), name: parsed.data.name, alternativeName: parsed.data.alternativeName || null, description: parsed.data.description || null } });
        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch { return NextResponse.json({ success: false, message: "Tên hoặc mã giống đã tồn tại." }, { status: 409 }); }
}
