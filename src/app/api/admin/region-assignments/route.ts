import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ areaManagerId: z.string().min(1), growingRegionId: z.string().min(1), note: z.string().trim().min(3, "Vui lòng nhập lý do thay đổi").max(500) });

async function admin() { const session = await getServerSession(authOptions); return session?.user?.role === "ADMIN" ? session : null; }

export async function GET() {
    if (!await admin()) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });
    const data = await prisma.areaManagerRegionAssignment.findMany({ where: { isActive: true, endedAt: null }, orderBy: { assignedAt: "desc" }, include: { areaManager: { select: { id: true, fullName: true, phone: true } }, growingRegion: { select: { id: true, code: true, name: true, status: true } } } });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    const session = await admin(); if (!session) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: "Dữ liệu phân công không hợp lệ." }, { status: 400 });
    const [manager, region] = await Promise.all([
        prisma.user.findFirst({ where: { id: parsed.data.areaManagerId, role: "AREA_MANAGER", accountStatus: "APPROVED", isLocked: false, deletedAt: null }, select: { id: true } }),
        prisma.growingRegion.findFirst({ where: { id: parsed.data.growingRegionId, status: "ACTIVE", isActive: true }, select: { id: true } }),
    ]);
    if (!manager || !region) return NextResponse.json({ success: false, message: "Trưởng ban hoặc vùng trồng không hợp lệ." }, { status: 400 });
    const current = await prisma.areaManagerRegionAssignment.findFirst({ where: { growingRegionId: region.id, isActive: true, endedAt: null }, select: { areaManagerId: true } });
    if (!current) return NextResponse.json({ success: false, message: "Vùng chưa có Trưởng ban. Phân công ban đầu chỉ được tạo qua quy trình duyệt hồ sơ." }, { status: 409 });
    if (current.areaManagerId === manager.id) return NextResponse.json({ success: false, message: "Người được chọn đang là Trưởng ban hiện tại." }, { status: 400 });
    await prisma.$transaction(async tx => {
        await tx.areaManagerRegionAssignment.updateMany({ where: { growingRegionId: region.id, isActive: true, endedAt: null }, data: { isActive: false, endedAt: new Date() } });
        await tx.areaManagerRegionAssignment.create({ data: { ...parsed.data, assignedById: session.user.id } });
    });
    return NextResponse.json({ success: true, message: "Đã thay đổi Trưởng ban và lưu lịch sử phân công." });
}

export async function DELETE(request: Request) {
    const session = await admin(); if (!session) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "Thiếu mã phân công." }, { status: 400 });
    await prisma.areaManagerRegionAssignment.updateMany({ where: { id, isActive: true }, data: { isActive: false, endedAt: new Date(), note: "Admin kết thúc phân công" } });
    return NextResponse.json({ success: true, message: "Đã kết thúc phân công." });
}
