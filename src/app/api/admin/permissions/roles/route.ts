import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    getAllRolesData,
    createCustomRole,
    updateRoleInfo,
    deleteCustomRole,
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
        return NextResponse.json({ success: true, data: data.roles });
    } catch (error: any) {
        console.error("GET /api/admin/permissions/roles failed:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi lấy danh sách vai trò." },
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

        if (!body.roleName || !body.roleName.trim()) {
            return NextResponse.json({ success: false, message: "Vui lòng nhập tên vai trò." }, { status: 400 });
        }

        const newRole = await createCustomRole(body, adminName, adminId);
        return NextResponse.json({
            success: true,
            message: `Tạo vai trò "${newRole.name}" thành công`,
            data: newRole,
        });
    } catch (error: any) {
        console.error("POST /api/admin/permissions/roles failed:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi tạo vai trò mới" },
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

        if (!body.roleKey) {
            return NextResponse.json({ success: false, message: "Thiếu mã vai trò." }, { status: 400 });
        }

        const updated = await updateRoleInfo(
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
            message: "Cập nhật vai trò thành công.",
            data: updated,
        });
    } catch (error: any) {
        console.error("PUT /api/admin/permissions/roles failed:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi cập nhật vai trò" },
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

        if (!roleKey) {
            return NextResponse.json({ success: false, message: "Thiếu mã vai trò cần xóa." }, { status: 400 });
        }

        await deleteCustomRole(roleKey, adminName, adminId);
        return NextResponse.json({
            success: true,
            message: `Đã xóa vai trò ${roleKey} thành công.`,
        });
    } catch (error: any) {
        console.error("DELETE /api/admin/permissions/roles failed:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi xóa vai trò" },
            { status: 500 }
        );
    }
}
