import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    getAllRolesData,
    saveRolePermissions,
    updateRoleInfo,
    createCustomRole,
    deleteCustomRole,
    assignUsersToRole,
    removeUserFromRole,
} from "@/lib/role-service";

export const dynamic = "force-dynamic";

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.id && session.user.role === "ADMIN" ? session : null;
}

export async function GET() {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const data = await getAllRolesData();
        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("GET /api/admin/permissions failed:", error);
        return NextResponse.json(
            { success: false, message: "Không thể tải danh mục phân quyền vai trò." },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const adminName = session.user.fullName || session.user.phone || "Admin";
        const adminId = session.user.id;
        const body = await request.json();

        // 1. Gán tài khoản vào Role
        if (body.action === "assign_users" && body.roleKey && Array.isArray(body.userIds)) {
            const assigned = await assignUsersToRole(body.roleKey, body.userIds, adminName, adminId);
            return NextResponse.json({
                success: true,
                message: `Đã gán ${body.userIds.length} tài khoản vào vai trò thành công.`,
                data: { roleKey: body.roleKey, userIds: assigned },
            });
        }

        // 2. Gỡ tài khoản khỏi Role
        if (body.action === "remove_user" && body.roleKey && body.userId) {
            const remaining = await removeUserFromRole(body.roleKey, body.userId, adminName, adminId);
            return NextResponse.json({
                success: true,
                message: "Đã gỡ tài khoản khỏi vai trò thành công.",
                data: { roleKey: body.roleKey, remainingUserIds: remaining },
            });
        }

        // 3. Cập nhật thông tin Role (Tên, Nhóm đối tượng, Mô tả, Trạng thái)
        if (body.action === "update_role_info" || (body.roleKey && (body.roleName || body.targetGroup || body.status))) {
            const updatedMeta = await updateRoleInfo(
                body.roleKey,
                {
                    name: body.roleName,
                    description: body.roleDescription,
                    targetGroup: body.targetGroup,
                    status: body.status,
                },
                adminName,
                adminId
            );
            return NextResponse.json({
                success: true,
                message: "Cập nhật thông tin vai trò thành công.",
                data: updatedMeta,
            });
        }

        // 4. Cập nhật phân quyền thao tác của Role
        if (body.roleKey && Array.isArray(body.permissions)) {
            const savedPermissions = await saveRolePermissions(
                body.roleKey,
                body.permissions,
                adminName,
                adminId
            );
            return NextResponse.json({
                success: true,
                message: "Đã lưu phân quyền cho vai trò thành công.",
                data: { roleKey: body.roleKey, permissions: savedPermissions },
            });
        }

        return NextResponse.json({ success: false, message: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
    } catch (error: any) {
        console.error("PUT /api/admin/permissions failed:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể lưu phân quyền." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const adminName = session.user.fullName || session.user.phone || "Admin";
        const adminId = session.user.id;
        const body = await request.json();

        // Tạo vai trò mới
        if (body.roleName) {
            const newRole = await createCustomRole(body, adminName, adminId);
            return NextResponse.json({
                success: true,
                message: `Tạo vai trò "${newRole.name}" thành công.`,
                data: newRole,
            });
        }

        // Gán tài khoản
        if (body.roleKey && Array.isArray(body.userIds)) {
            const assigned = await assignUsersToRole(body.roleKey, body.userIds, adminName, adminId);
            return NextResponse.json({
                success: true,
                message: `Đã gán tài khoản vào vai trò thành công.`,
                data: { roleKey: body.roleKey, userIds: assigned },
            });
        }

        return NextResponse.json({ success: false, message: "Thiếu thông tin tạo vai trò." }, { status: 400 });
    } catch (error: any) {
        console.error("POST /api/admin/permissions failed:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể tạo vai trò mới." },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const adminName = session.user.fullName || session.user.phone || "Admin";
        const adminId = session.user.id;
        const { searchParams } = new URL(request.url);
        const roleKey = searchParams.get("roleKey");

        if (roleKey) {
            await deleteCustomRole(roleKey, adminName, adminId);
            return NextResponse.json({
                success: true,
                message: `Đã xóa vai trò ${roleKey} thành công.`,
            });
        }

        return NextResponse.json({ success: false, message: "Thiếu mã vai trò cần xóa." }, { status: 400 });
    } catch (error: any) {
        console.error("DELETE /api/admin/permissions failed:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể xóa vai trò." },
            { status: 500 }
        );
    }
}
