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
        return NextResponse.json({ success: false, message: "Bạn không có quyền khóa tài khoản." }, { status: 403 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id, deletedAt: null },
            select: { id: true, fullName: true, phone: true, isLocked: true, partnerFacility: { select: { id: true } } },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy người dùng." }, { status: 404 });
        }

        if (user.id === session.user.id) {
            return NextResponse.json({ success: false, message: "Bạn không thể tự khóa tài khoản của chính mình." }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: params.id },
                data: { isLocked: true },
            });
            if (user.partnerFacility) {
                await tx.partnerFacility.update({
                    where: { id: user.partnerFacility.id },
                    data: { status: "SUSPENDED" },
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: `Đã khóa tài khoản "${user.fullName || user.phone}".`,
        });
    } catch (error: any) {
        console.error("POST /api/admin/users/[id]/lock error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi khóa tài khoản." },
            { status: 500 },
        );
    }
}
