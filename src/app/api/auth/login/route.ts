import { NextResponse } from "next/server";
import { z } from "zod";
import { loginSchema } from "@/lib/zod-schema";
import { authenticateLoginAttempt } from "@/lib/auth-service";
import { AUTH_COOKIE_NAME, signAuthToken } from "@/lib/auth-token";

export const runtime = "nodejs";

const responseSchema = loginSchema.extend({
    rememberMe: z.boolean().default(false),
});

function getDashboardPath(role: string): string {
    switch (role) {
        case "ADMIN":
            return "/dashboard/admin/reminders";
        case "AREA_MANAGER":
            return "/dashboard/area-manager";
        case "FARMER":
        default:
            return "/dashboard/farmer";
    }
}

export async function POST(request: Request) {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                {
                    message: "Payload JSON không hợp lệ.",
                },
                { status: 400 },
            );
        }

        const parsed = responseSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    message: parsed.error.issues[0]?.message ?? "Dữ liệu đăng nhập không hợp lệ.",
                    errors: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const result = await authenticateLoginAttempt(parsed.data);
        if (!result.ok) {
            return NextResponse.json(
                {
                    message: result.message,
                    code: result.code,
                },
                { status: result.status },
            );
        }

        const token = await signAuthToken(
            {
                sub: result.user.id,
                role: result.user.role,
                phone: result.user.phone,
                email: result.user.email,
                fullName: result.user.fullName,
                isApproved: result.user.isApproved,
            },
            result.expiresInSeconds,
        );

        const response = NextResponse.json(
            {
                message: "Đăng nhập thành công.",
                token,
                user: result.user,
                redirectTo: getDashboardPath(result.user.role),
            },
            { status: 200 },
        );

        response.cookies.set(AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: result.expiresInSeconds,
        });

        return response;
    } catch (error) {
        console.error("Login route failed", error);
        return NextResponse.json(
            {
                message: "Không thể xử lý đăng nhập lúc này.",
            },
            { status: 500 },
        );
    }
}
