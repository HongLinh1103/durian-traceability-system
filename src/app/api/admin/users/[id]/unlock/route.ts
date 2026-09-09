import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
    _: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Bạn không có quyền mở khóa tài khoản." }, { status: 403 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id, deletedAt: null },
            select: { id: true, fullName: true, phone: true, isLocked: true, partnerFacility: { select: { id: true } } },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy người dùng." }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: params.id },
                data: { isLocked: false, failedAttempts: 0, lockUntil: null },
            });
            if (user.partnerFacility) {
                await tx.partnerFacility.update({
                    where: { id: user.partnerFacility.id },
                    data: { status: "APPROVED" },
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: `Đã mở khóa tài khoản "${user.fullName || user.phone}".`,
        });
    } catch (error: any) {
        console.error("POST /api/admin/users/[id]/unlock error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi mở khóa tài khoản." },
            { status: 500 },
        );
    }
}
