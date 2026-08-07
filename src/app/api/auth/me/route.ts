import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Returns the current authenticated user's information from the session.
 * Used by the client to verify session validity and get user data.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Chưa đăng nhập.",
                },
                { status: 401 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, fullName: true, email: true, phone: true, role: true, isApproved: true },
        });
        if (!user) return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 });

        return NextResponse.json(
            {
                success: true,
                user,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("GET /api/auth/me failed:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Không thể xác thực người dùng.",
            },
            { status: 500 },
        );
    }
}

