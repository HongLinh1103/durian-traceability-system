import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllRolesData, updateRoleInfo, deleteCustomRole } from "@/lib/role-service";

export const dynamic = "force-dynamic";

async function checkAdminAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: "Chưa đăng nhập.", status: 401 } as const;
    }
    if (session.user.role !== "ADMIN") {
        return { error: "Bạn không có quyền quản trị vai trò.", status: 403 } as const;
    }
    return { session };
}

/**
 * GET /api/admin/roles/[id]
 * Xem chi tiết vai trò
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
        const data = await getAllRolesData();
        const role = data.roles.find((r) => r.key === params.id);

        if (!role) {
            return NextResponse.json({ success: false, message: "Không tìm thấy vai trò." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: role });
    } catch (error: any) {
        console.error("GET /api/admin/roles/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi lấy thông tin vai trò." },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/admin/roles/[id]
 * Cập nhật thông tin vai trò
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
        const adminName = auth.session.user.fullName || auth.session.user.phone || "Admin";
        const adminId = auth.session.user.id;

        const updated = await updateRoleInfo(params.id, body, adminName, adminId);
        return NextResponse.json({
            success: true,
            message: "Cập nhật thông tin vai trò thành công.",
            data: updated,
        });
    } catch (error: any) {
        console.error("PATCH /api/admin/roles/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi cập nhật vai trò." },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/admin/roles/[id]
 * Xóa vai trò tùy chỉnh
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
        const adminName = auth.session.user.fullName || auth.session.user.phone || "Admin";
        const adminId = auth.session.user.id;

        await deleteCustomRole(params.id, adminName, adminId);
        return NextResponse.json({
            success: true,
            message: `Đã xóa vai trò "${params.id}" thành công.`,
        });
    } catch (error: any) {
        console.error("DELETE /api/admin/roles/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi xóa vai trò." },
            { status: 500 },
        );
    }
}
