import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllRolesData, saveRolePermissions } from "@/lib/role-service";

export const dynamic = "force-dynamic";

async function checkAdminAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: "Chưa đăng nhập.", status: 401 } as const;
    }
    if (session.user.role !== "ADMIN") {
        return { error: "Bạn không có quyền cấu hình quyền cho vai trò.", status: 403 } as const;
    }
    return { session };
}

/**
 * GET /api/admin/roles/[id]/permissions
 * Lấy danh sách permission keys của vai trò
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

        return NextResponse.json({
            success: true,
            data: {
                roleKey: role.key,
                roleName: role.name,
                permissions: role.permissions,
                totalGranted: role.stats?.totalGranted || role.permissions.length,
            },
        });
    } catch (error: any) {
        console.error("GET /api/admin/roles/[id]/permissions error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi lấy quyền của vai trò." },
            { status: 500 },
        );
    }
}

/**
 * PUT /api/admin/roles/[id]/permissions
 * Cập nhật danh sách permission keys cho vai trò
 */
export async function PUT(
    request: Request,
    { params }: { params: { id: string } },
) {
    const auth = await checkAdminAuth();
    if ("error" in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const permissions = Array.isArray(body.permissions) ? body.permissions : [];
        const adminName = auth.session.user.fullName || auth.session.user.phone || "Admin";
        const adminId = auth.session.user.id;

        const saved = await saveRolePermissions(params.id, permissions, adminName, adminId);
        return NextResponse.json({
            success: true,
            message: `Đã lưu ${saved.length} quyền cho vai trò "${params.id}".`,
            data: {
                roleKey: params.id,
                permissions: saved,
                count: saved.length,
            },
        });
    } catch (error: any) {
        console.error("PUT /api/admin/roles/[id]/permissions error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi lưu quyền cho vai trò." },
            { status: 500 },
        );
    }
}
