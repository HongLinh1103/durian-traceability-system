import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllRolesData, createCustomRole } from "@/lib/role-service";

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
 * GET /api/admin/roles
 * Danh sách toàn bộ vai trò hệ thống & vai trò tùy chỉnh kèm quyền và số tài khoản
 */
export async function GET() {
    const auth = await checkAdminAuth();
    if ("error" in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    try {
        const data = await getAllRolesData();
        return NextResponse.json({ success: true, data: data.roles });
    } catch (error: any) {
        console.error("GET /api/admin/roles error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi lấy danh sách vai trò." },
            { status: 500 },
        );
    }
}

/**
 * POST /api/admin/roles
 * Tạo vai trò tùy chỉnh mới
 */
export async function POST(request: Request) {
    const auth = await checkAdminAuth();
    if ("error" in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const roleName = String(body.roleName || body.name || "").trim();

        if (!roleName) {
            return NextResponse.json({ success: false, message: "Vui lòng nhập tên vai trò." }, { status: 400 });
        }

        const adminName = auth.session.user.fullName || auth.session.user.phone || "Admin";
        const adminId = auth.session.user.id;

        const newRole = await createCustomRole(
            {
                roleName,
                roleKey: body.roleKey || body.key,
                roleDescription: body.roleDescription || body.description,
                targetGroup: body.targetGroup,
                copyFromRole: body.copyFromRole,
            },
            adminName,
            adminId,
        );

        return NextResponse.json({
            success: true,
            message: `Tạo vai trò "${newRole.name}" (${newRole.key}) thành công.`,
            data: newRole,
        });
    } catch (error: any) {
        console.error("POST /api/admin/roles error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi tạo vai trò mới." },
            { status: 500 },
        );
    }
}
