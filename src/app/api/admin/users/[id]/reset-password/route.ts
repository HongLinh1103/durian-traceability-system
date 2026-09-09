import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(
    request: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Bạn không có quyền đặt lại mật khẩu." }, { status: 403 });
    }

    try {
        const body = await request.json();
        const newPassword = String(body.newPassword || "").trim();

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự." },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: params.id, deletedAt: null },
            select: { id: true, fullName: true, phone: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy người dùng." }, { status: 404 });
        }

        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: params.id },
            data: {
                password: hashedPassword,
                passwordUpdatedAt: new Date(),
                failedAttempts: 0,
                lockUntil: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: `Đã đặt lại mật khẩu cho tài khoản "${user.fullName || user.phone}".`,
        });
    } catch (error: any) {
        console.error("POST /api/admin/users/[id]/reset-password error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi đặt lại mật khẩu." },
            { status: 500 },
        );
    }
}
