import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const regionSchema = z.object({ code: z.string().trim().min(2), name: z.string().trim().min(2), province: z.string().trim().min(2), district: z.string().trim().optional(), ward: z.string().trim().optional(), areaSize: z.coerce.number().positive().optional(), cropType: z.string().trim().default("Sầu riêng"), cropVarieties: z.array(z.string().trim()).default([]), approvalCode: z.string().trim().optional(), exportMarkets: z.array(z.string().trim()).default([]), managingOrganization: z.string().trim().optional() });
const updateSchema = z.object({ id: z.string().min(1), status: z.enum(["DRAFT", "PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "REVOKED"]), reason: z.string().trim().min(3).max(500) });
async function check() { const session = await getServerSession(authOptions); return session?.user?.role === "ADMIN" ? session : null; }

export async function GET() {
    if (!await check()) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });
    const data = await prisma.growingRegion.findMany({ orderBy: [{ status: "asc" }, { code: "asc" }], include: { _count: { select: { farms: true } }, managerAssignments: { where: { isActive: true, endedAt: null }, take: 1, select: { areaManager: { select: { id: true, fullName: true, phone: true } } } } } });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    if (!await check()) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });
    const parsed = regionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Dữ liệu vùng không hợp lệ." }, { status: 400 });
    const data = await prisma.growingRegion.create({ data: { ...parsed.data, district: parsed.data.district || null, ward: parsed.data.ward || null, approvalCode: parsed.data.approvalCode || null, managingOrganization: parsed.data.managingOrganization || null, status: "DRAFT", isActive: false } });
    return NextResponse.json({ success: true, data, message: "Đã tạo vùng trồng ở trạng thái nháp." }, { status: 201 });
}

export async function PATCH(request: Request) {
    if (!await check()) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
    const data = await prisma.growingRegion.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status, isActive: parsed.data.status === "ACTIVE", validUntil: parsed.data.status === "EXPIRED" ? new Date() : undefined } });
    return NextResponse.json({ success: true, data, message: `Đã chuyển trạng thái vùng thành ${parsed.data.status}.` });
}
