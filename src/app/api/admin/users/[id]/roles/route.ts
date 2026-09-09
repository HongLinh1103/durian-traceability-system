import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
    _: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Bạn không có quyền truy cập." }, { status: 403 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id, deletedAt: null },
            select: { id: true, fullName: true, phone: true, role: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy người dùng." }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                userId: user.id,
                fullName: user.fullName,
                currentRole: user.role,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error?.message || "Lỗi truy vấn." }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Bạn không có quyền gán vai trò." }, { status: 403 });
    }

    try {
        const body = await request.json();
        const newRole = String(body.role || "").trim();

        if (!newRole) {
            return NextResponse.json({ success: false, message: "Vui lòng chọn vai trò cần gán." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: params.id, deletedAt: null },
            select: { id: true, fullName: true, role: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy người dùng." }, { status: 404 });
        }

        const oldRole = user.role;

        await prisma.user.update({
            where: { id: params.id },
            data: { role: newRole as UserRole },
        });

        return NextResponse.json({
            success: true,
            message: `Đã thay đổi vai trò của "${user.fullName || params.id}" từ ${oldRole} sang ${newRole}.`,
            data: { userId: user.id, role: newRole },
        });
    } catch (error: any) {
        console.error("POST /api/admin/users/[id]/roles error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi gán vai trò." },
            { status: 500 },
        );
    }
}
