import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

        return NextResponse.json(
            {
                success: true,
                user: {
                    id: session.user.id,
                    fullName: session.user.fullName ?? null,
                    email: session.user.email ?? null,
                    phone: session.user.phone ?? null,
                    role: session.user.role,
                    isApproved: session.user.isApproved ?? false,
                },
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

