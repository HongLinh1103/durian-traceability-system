import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllRolesData, updateRoleInfo, deleteCustomRole } from "@/lib/role-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/roles/[id] - Lấy thông tin một vai trò
 * PUT /api/roles/[id] - Cập nhật thông tin vai trò
 * DELETE /api/roles/[id] - Xóa vai trò tùy chỉnh
 */
export async function GET(
    _: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const data = await getAllRolesData();
        const role = data.roles.find((r) => r.key === params.id);

        if (!role) {
            return NextResponse.json({ success: false, message: "Không tìm thấy vai trò." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: role });
    } catch (error: any) {
        console.error("GET /api/roles/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi lấy thông tin vai trò." },
            { status: 500 },
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const adminName = session.user.fullName || session.user.phone || "Admin";
        const adminId = session.user.id;
        const body = await request.json();

        const updated = await updateRoleInfo(params.id, body, adminName, adminId);
        return NextResponse.json({
            success: true,
            message: "Cập nhật vai trò thành công.",
            data: updated,
        });
    } catch (error: any) {
        console.error("PUT /api/roles/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi cập nhật vai trò." },
            { status: 500 },
        );
    }
}

export async function DELETE(
    _: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const adminName = session.user.fullName || session.user.phone || "Admin";
        const adminId = session.user.id;

        await deleteCustomRole(params.id, adminName, adminId);
        return NextResponse.json({
            success: true,
            message: "Đã xóa vai trò thành công.",
        });
    } catch (error: any) {
        console.error("DELETE /api/roles/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi xóa vai trò." },
            { status: 500 },
        );
    }
}
