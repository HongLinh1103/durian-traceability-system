import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

const roleRedirects: Record<UserRole, string> = {
    ADMIN: "/dashboard/admin",
    AREA_MANAGER: "/dashboard/area-manager",
    FARMER: "/dashboard/farmer",
    STORE_OWNER: "/dashboard/store",
    COLLECTOR: "/dashboard/partner",
    PROCESSING_FACILITY: "/dashboard/partner",
};

const accessRules: Array<{ prefix: string; roles: UserRole[] }> = [
    { prefix: "/dashboard/admin", roles: ["ADMIN"] },
    { prefix: "/dashboard/area-manager", roles: ["AREA_MANAGER", "ADMIN"] },
    { prefix: "/dashboard/farmer", roles: ["FARMER", "AREA_MANAGER", "ADMIN"] },
    { prefix: "/dashboard/store", roles: ["STORE_OWNER"] },
];

function getRule(pathname: string): { prefix: string; roles: UserRole[] } | undefined {
    return accessRules.find((rule) => pathname.startsWith(rule.prefix));
}

function redirectToLogin(request: NextRequest, message: string): NextResponse {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", message);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
}

async function readSession(request: NextRequest): Promise<{ role: UserRole; isApproved: boolean } | null> {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_JWT_SECRET;
    if (!secret) {
        return null;
    }

    const nextAuthToken = await getToken({ req: request, secret });
    if (nextAuthToken?.role) {
        return {
            role: nextAuthToken.role as UserRole,
            isApproved: nextAuthToken.isApproved !== false,
        };
    }

    const fallbackToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!fallbackToken) {
        return null;
    }

    const payload = await verifyAuthToken(fallbackToken);
    if (!payload) {
        return null;
    }

    return {
        role: payload.role,
        isApproved: payload.isApproved,
    };
}

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const rule = getRule(pathname);
    if (!rule) {
        return NextResponse.next();
    }

    const session = await readSession(request);
    if (!session) {
        return redirectToLogin(request, "unauthenticated");
    }

    if (!session.isApproved) {
        return redirectToLogin(request, "approval-pending");
    }

    if (!rule.roles.includes(session.role)) {
        const destination = roleRedirects[session.role] ?? "/login";
        return NextResponse.redirect(new URL(destination, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
