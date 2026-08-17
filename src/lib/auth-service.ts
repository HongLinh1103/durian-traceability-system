import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { AUTH_SESSION_MAX_AGE_SECONDS, AUTH_REMEMBER_ME_MAX_AGE_SECONDS } from "@/lib/auth-token";

export type AuthenticatedUser = {
    id: string;
    role: UserRole;
    phone: string;
    email: string | null;
    fullName: string | null;
    isApproved: boolean;
};

export type LoginRequest = {
    identifier: string;
    password: string;
    rememberMe: boolean;
};

export type LoginSuccess = {
    ok: true;
    user: AuthenticatedUser;
    expiresInSeconds: number;
};

export type LoginFailure = {
    ok: false;
    status: 401 | 403;
    code: "INVALID_CREDENTIALS" | "ACCOUNT_PENDING" | "ACCOUNT_LOCKED";
    message: string;
};

export type LoginResult = LoginSuccess | LoginFailure;

function toAuthenticatedUser(user: {
    id: string;
    role: UserRole;
    phone: string;
    email: string | null;
    fullName: string | null;
    isApproved: boolean;
}): AuthenticatedUser {
    return {
        id: user.id,
        role: user.role,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        isApproved: user.isApproved,
    };
}

export async function authenticateLoginAttempt({ identifier, password, rememberMe }: LoginRequest): Promise<LoginResult> {
    const normalizedIdentifier = identifier.trim();
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { phone: normalizedIdentifier },
                { email: { equals: normalizedIdentifier, mode: "insensitive" } },
            ],
        },
    });

    if (!user) {
        return {
            ok: false,
            status: 401,
            code: "INVALID_CREDENTIALS",
            message: "Sai số điện thoại/email hoặc mật khẩu. Vui lòng thử lại.",
        };
    }

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
        return {
            ok: false,
            status: 401,
            code: "INVALID_CREDENTIALS",
            message: "Sai số điện thoại/email hoặc mật khẩu. Vui lòng thử lại.",
        };
    }

    if (user.deletedAt || user.isLocked) {
        return {
            ok: false,
            status: 403,
            code: "ACCOUNT_LOCKED",
            message: "Tài khoản đang bị khóa hoặc đã ngừng hoạt động. Vui lòng liên hệ đơn vị quản lý.",
        };
    }

    if (!user.isApproved) {
        return {
            ok: false,
            status: 403,
            code: "ACCOUNT_PENDING",
            message: user.role === "FARMER"
                ? "Hồ sơ của bạn đang chờ Trưởng ban quản lý vùng trồng xử lý."
                : "Tài khoản của bạn đang chờ Admin phê duyệt.",
        };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });

    return {
        ok: true,
        user: toAuthenticatedUser(user),
        expiresInSeconds: rememberMe ? AUTH_REMEMBER_ME_MAX_AGE_SECONDS : AUTH_SESSION_MAX_AGE_SECONDS,
    };
}
