import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
 * GET /api/admin/users/[id]
 * Xem chi tiết hồ sơ tài khoản
 */
export async function GET(
    _: Request,
    { params }: { params: { id: string } },
) {
    const auth = await checkAdminAuth();
    if ("error" in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id, deletedAt: null },
            include: {
                farms: {
                    include: {
                        region: true,
                    },
                },
                stores: {
                    where: { deletedAt: null },
                    include: {
                        documents: true,
                    },
                },
                partnerFacility: {
                    include: {
                        documents: true,
                    },
                },
                areaManagerApplication: true,
                approvalHistories: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        actor: {
                            select: { id: true, fullName: true, phone: true, role: true },
                        },
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy người dùng." }, { status: 404 });
        }

        const { password, ...safeUser } = user;
        return NextResponse.json({ success: true, data: safeUser });
    } catch (error: any) {
        console.error("GET /api/admin/users/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể lấy thông tin người dùng." },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/admin/users/[id]
 * Cập nhật thông tin tài khoản người dùng
 */
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } },
) {
    const auth = await checkAdminAuth();
    if ("error" in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const fullName = String(body.fullName || "").trim();
        const phone = String(body.phone || "").trim();
        const email = String(body.email || "").trim() || null;
        const address = String(body.address || "").trim() || null;
        const province = String(body.province || "").trim() || null;
        const district = String(body.district || "").trim() || null;
        const ward = String(body.ward || "").trim() || null;
        const registrationName = String(body.registrationName || "").trim() || null;

        if (!fullName || !phone) {
            return NextResponse.json(
                { success: false, message: "Họ và tên cùng số điện thoại là bắt buộc." },
                { status: 400 },
            );
        }

        // Kiểm tra số điện thoại có bị trùng với người khác không
        const duplicatePhone = await prisma.user.findFirst({
            where: {
                phone,
                id: { not: params.id },
                deletedAt: null,
            },
        });
        if (duplicatePhone) {
            return NextResponse.json(
                { success: false, message: `Số điện thoại ${phone} đã được sử dụng bởi tài khoản khác.` },
                { status: 409 },
            );
        }

        const role = body.role ? String(body.role).trim() : undefined;

        const updateData: any = {
            fullName,
            phone,
            email,
            address,
            province,
            district,
            ward,
            registrationName,
        };
        if (role) {
            updateData.role = role;
        }

        const updated = await prisma.user.update({
            where: { id: params.id },
            data: updateData,
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                role: true,
                address: true,
                province: true,
                district: true,
                ward: true,
                registrationName: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Cập nhật thông tin tài khoản thành công.",
            data: updated,
        });
    } catch (error: any) {
        console.error("PATCH /api/admin/users/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể cập nhật tài khoản." },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/admin/users/[id]
 * Xóa mềm tài khoản
 */
export async function DELETE(
    _: Request,
    { params }: { params: { id: string } },
) {
    const auth = await checkAdminAuth();
    if ("error" in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id },
            select: { id: true, role: true, fullName: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy người dùng." }, { status: 404 });
        }

        if (user.id === auth.session.user.id) {
            return NextResponse.json({ success: false, message: "Bạn không thể tự xóa tài khoản của chính mình." }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: params.id },
            data: { deletedAt: new Date() },
        });

        return NextResponse.json({
            success: true,
            message: `Đã xóa tài khoản "${user.fullName || params.id}".`,
        });
    } catch (error: any) {
        console.error("DELETE /api/admin/users/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể xóa tài khoản." },
            { status: 500 },
        );
    }
}
