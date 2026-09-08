import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllRolesData, createCustomRole } from "@/lib/role-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/roles - Lấy danh sách tất cả các vai trò
 * POST /api/roles - Tạo một vai trò mới
 * (Chuẩn hóa RESTful Resource theo ƯU TIÊN 8 & Điểm 14)
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const data = await getAllRolesData();
        return NextResponse.json({ success: true, data: data.roles });
    } catch (error: any) {
        console.error("GET /api/roles error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi lấy danh sách vai trò." },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "ADMIN") {
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
        console.error("POST /api/roles error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi tạo vai trò mới" },
            { status: 500 },
        );
    }
}
