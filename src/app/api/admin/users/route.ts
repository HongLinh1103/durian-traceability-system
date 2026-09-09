import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { UserRole, AccountStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

async function checkAdminAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: "Chưa đăng nhập.", status: 401 } as const;
    }
    if (session.user.role !== "ADMIN") {
        return { error: "Bạn không có quyền quản trị tài khoản.", status: 403 } as const;
    }
    return { session };
}

/**
 * GET /api/admin/users
 * Danh sách tài khoản người dùng, 4 thẻ KPI số lượng và bộ lọc phân trang
 */
export async function GET(request: Request) {
    const auth = await checkAdminAuth();
    if ("error" in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    try {
        const url = new URL(request.url);
        const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));
        const search = url.searchParams.get("search")?.trim() || "";
        const status = url.searchParams.get("status") || "all";
        const role = url.searchParams.get("role")?.trim() || "";

        // Lấy thống kê 4 thẻ KPI số lượng độc lập với bộ lọc
        const [totalAccounts, pendingCount, activeCount, lockedCount] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.user.count({ where: { deletedAt: null, accountStatus: AccountStatus.PENDING } }),
            prisma.user.count({
                where: {
                    deletedAt: null,
                    accountStatus: AccountStatus.APPROVED,
                    isLocked: false,
                },
            }),
            prisma.user.count({ where: { deletedAt: null, isLocked: true } }),
        ]);

        const where: Record<string, any> = { deletedAt: null };

        // Lọc theo vai trò
        if (role && role !== "all") {
            where.role = role as UserRole;
        }

        // Lọc theo trạng thái
        if (status === "PENDING") {
            where.accountStatus = AccountStatus.PENDING;
        } else if (status === "ACTIVE" || status === "APPROVED") {
            where.accountStatus = AccountStatus.APPROVED;
            where.isLocked = false;
        } else if (status === "LOCKED") {
            where.isLocked = true;
        } else if (status === "REJECTED") {
            where.accountStatus = AccountStatus.REJECTED;
        } else if (status === "NEEDS_SUPPLEMENT" || status === "PENDING_SUPPLEMENT") {
            where.accountStatus = AccountStatus.NEEDS_SUPPLEMENT;
        }

        // Lọc theo từ khóa tìm kiếm
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { registrationName: { contains: search, mode: "insensitive" } },
            ];
        }

        const [users, totalItems] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: [{ accountStatus: "asc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    phone: true,
                    email: true,
                    fullName: true,
                    avatar: true,
                    role: true,
                    isApproved: true,
                    isLocked: true,
                    accountStatus: true,
                    address: true,
                    province: true,
                    district: true,
                    ward: true,
                    registrationName: true,
                    registeredAreaSize: true,
                    registeredTotalTrees: true,
                    registeredDurianVariety: true,
                    createdAt: true,
                    approvedAt: true,
                    updatedAt: true,
                    farms: {
                        select: {
                            id: true,
                            farmCode: true,
                            farmName: true,
                            areaSize: true,
                            totalTrees: true,
                            durianVariety: true,
                            address: true,
                            province: true,
                            district: true,
                            ward: true,
                            areaUnit: true,
                            isActive: true,
                            region: { select: { code: true, name: true } },
                        },
                    },
                    stores: {
                        where: { deletedAt: null },
                        select: { id: true, name: true, address: true, status: true },
                    },
                    partnerFacility: {
                        select: { id: true, name: true, type: true, province: true, status: true },
                    },
                    areaManagerApplication: {
                        select: { organizationName: true, position: true, status: true, managedRegions: true },
                    },
                    approvalHistories: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: {
                            id: true,
                            action: true,
                            reason: true,
                            createdAt: true,
                            actor: { select: { id: true, fullName: true, phone: true, role: true } },
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: users,
            kpis: {
                totalAccounts,
                pendingCount,
                activeCount,
                lockedCount,
            },
            pagination: {
                page,
                pageSize,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
            },
        });
    } catch (error: any) {
        console.error("GET /api/admin/users error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể tải danh sách tài khoản." },
            { status: 500 },
        );
    }
}

/**
 * POST /api/admin/users
 * Tạo tài khoản người dùng trực tiếp từ Admin
 */
export async function POST(request: Request) {
    const auth = await checkAdminAuth();
    if ("error" in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const fullName = String(body.fullName || "").trim();
        const phone = String(body.phone || "").trim();
        const email = String(body.email || "").trim() || null;
        const password = String(body.password || "").trim();
        const role = String(body.role || "").trim() as UserRole;
        const status = body.status === "PENDING" ? AccountStatus.PENDING : AccountStatus.APPROVED;
        const organization = String(body.organization || body.registrationName || "").trim() || null;
        const province = String(body.province || "").trim() || null;
        const district = String(body.district || "").trim() || null;
        const ward = String(body.ward || "").trim() || null;
        const address = String(body.address || "").trim() || null;

        if (!fullName || !phone || !password || !role) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập đầy đủ: Họ tên, Số điện thoại, Mật khẩu và Vai trò." },
                { status: 400 },
            );
        }

        // Kiểm tra số điện thoại đã tồn tại chưa
        const existingPhone = await prisma.user.findUnique({ where: { phone } });
        if (existingPhone) {
            return NextResponse.json(
                { success: false, message: `Số điện thoại ${phone} đã được đăng ký trong hệ thống.` },
                { status: 409 },
            );
        }

        if (email) {
            const existingEmail = await prisma.user.findUnique({ where: { email } });
            if (existingEmail) {
                return NextResponse.json(
                    { success: false, message: `Email ${email} đã được đăng ký trong hệ thống.` },
                    { status: 409 },
                );
            }
        }

        const hashedPassword = await hashPassword(password);
        const isApproved = status === AccountStatus.APPROVED;

        const newUser = await prisma.user.create({
            data: {
                fullName,
                phone,
                email,
                password: hashedPassword,
                role,
                accountStatus: status,
                isApproved,
                registrationName: organization,
                province,
                district,
                ward,
                address,
                approvedAt: isApproved ? new Date() : null,
            },
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                role: true,
                accountStatus: true,
                isApproved: true,
                createdAt: true,
            },
        });

        // Ghi nhận lịch sử duyệt nếu được kích hoạt ngay
        if (isApproved && auth.session.user.id) {
            await prisma.approvalHistory.create({
                data: {
                    subjectId: newUser.id,
                    actorId: auth.session.user.id,
                    action: "DIRECT_CREATE_APPROVED",
                    fromStatus: AccountStatus.PENDING,
                    toStatus: AccountStatus.APPROVED,
                    reason: "Tài khoản được tạo và kích hoạt trực tiếp bởi Quản trị viên",
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Tạo tài khoản "${fullName}" thành công.`,
            data: newUser,
        });
    } catch (error: any) {
        console.error("POST /api/admin/users error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể tạo tài khoản người dùng." },
            { status: 500 },
        );
    }
}
