import type { UserRole } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { AUTH_SESSION_MAX_AGE_SECONDS, AUTH_REMEMBER_ME_MAX_AGE_SECONDS } from "@/lib/auth-token";
import { findSystemAccount, SystemAccount } from "@/lib/system-accounts";

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

async function tryAutoUpsertSystemAccount(sysAcc: SystemAccount) {
    try {
        const hashedPassword = await bcryptjs.hash(sysAcc.password, 10);
        const user = await prisma.user.upsert({
            where: { phone: sysAcc.phone },
            update: {
                email: sysAcc.email,
                fullName: sysAcc.fullName,
                role: sysAcc.role,
                isApproved: true,
                accountStatus: "APPROVED",
                password: hashedPassword,
                lastLoginAt: new Date(),
            },
            create: {
                id: sysAcc.id,
                phone: sysAcc.phone,
                email: sysAcc.email,
                fullName: sysAcc.fullName,
                role: sysAcc.role,
                isApproved: true,
                accountStatus: "APPROVED",
                password: hashedPassword,
                lastLoginAt: new Date(),
            },
        });

        // If collector or processing facility, ensure partner_facility exists
        if (sysAcc.role === "COLLECTOR" || sysAcc.role === "PROCESSING_FACILITY") {
            const existingFac = await prisma.partnerFacility.findFirst({
                where: { ownerId: user.id },
            });
            if (!existingFac && sysAcc.facilityName) {
                await prisma.partnerFacility.create({
                    data: {
                        ownerId: user.id,
                        type: sysAcc.role,
                        organizationType: "Hộ kinh doanh / Doanh nghiệp",
                        name: sysAcc.facilityName,
                        representativeName: sysAcc.fullName,
                        representativePhone: sysAcc.phone,
                        representativeEmail: sysAcc.email,
                        identityNumber: `ID-${sysAcc.phone}`,
                        phone: sysAcc.phone,
                        address: sysAcc.address || "Đồng Nai",
                        province: sysAcc.province || "Đồng Nai",
                        status: "APPROVED",
                    },
                });
            }
        }

        // If store / nursery owner, ensure store exists
        if (sysAcc.role === "STORE_OWNER") {
            const existingStore = await prisma.store.findFirst({
                where: { ownerId: user.id },
            });
            if (!existingStore && sysAcc.facilityName) {
                await prisma.store.create({
                    data: {
                        ownerId: user.id,
                        name: sysAcc.facilityName,
                        representativeName: sysAcc.fullName,
                        representativePhone: sysAcc.phone,
                        representativeEmail: sysAcc.email,
                        identityNumber: `ID-${sysAcc.phone}`,
                        phone: sysAcc.phone,
                        address: sysAcc.address || "Đồng Nai",
                        status: "APPROVED",
                    },
                });
            }
        }
    } catch {
        // Non-blocking if DB is not reachable
    }
}

export async function authenticateLoginAttempt({ identifier, password, rememberMe }: LoginRequest): Promise<LoginResult> {
    const normalizedIdentifier = identifier.trim();

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: normalizedIdentifier },
                    { email: { equals: normalizedIdentifier, mode: "insensitive" } },
                ],
            },
        });

        if (user) {
            const passwordMatches = await verifyPassword(password, user.password);
            if (passwordMatches) {
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

                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { lastLoginAt: new Date() },
                    });
                } catch {
                    // non-blocking
                }

                return {
                    ok: true,
                    user: toAuthenticatedUser(user),
                    expiresInSeconds: rememberMe ? AUTH_REMEMBER_ME_MAX_AGE_SECONDS : AUTH_SESSION_MAX_AGE_SECONDS,
                };
            }
        }
    } catch (err) {
        console.error("Database lookup error during auth:", err);
    }

    // Check system predefined accounts
    const sysAccount = findSystemAccount(normalizedIdentifier);
    if (sysAccount && sysAccount.password === password) {
        // Trigger non-blocking sync to database
        void tryAutoUpsertSystemAccount(sysAccount);

        return {
            ok: true,
            user: {
                id: sysAccount.id,
                role: sysAccount.role,
                phone: sysAccount.phone,
                email: sysAccount.email,
                fullName: sysAccount.fullName,
                isApproved: sysAccount.isApproved,
            },
            expiresInSeconds: rememberMe ? AUTH_REMEMBER_ME_MAX_AGE_SECONDS : AUTH_SESSION_MAX_AGE_SECONDS,
        };
    }

    return {
        ok: false,
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Sai số điện thoại/email hoặc mật khẩu. Vui lòng kiểm tra lại thông tin đăng nhập.",
    };
}
