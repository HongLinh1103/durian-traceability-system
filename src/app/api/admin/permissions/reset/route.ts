import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resetRolePermissionsToDefault } from "@/lib/role-service";
import { calculateRolePermissionStats } from "@/lib/permissions-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const adminName = session.user.fullName || session.user.phone || "Admin";
        const adminId = session.user.id;
        const body = await request.json();
        const { roleKey } = body;

        if (!roleKey) {
            return NextResponse.json({ success: false, message: "Thiếu mã vai trò." }, { status: 400 });
        }

        const defaultPermissions = await resetRolePermissionsToDefault(roleKey, adminName, adminId);
        const stats = calculateRolePermissionStats(roleKey, defaultPermissions);

        return NextResponse.json({
            success: true,
            message: `Đã khôi phục quyền vai trò ${roleKey} về mặc định thành công`,
            data: {
                roleKey,
                permissions: defaultPermissions,
                stats,
            },
        });
    } catch (error: any) {
        console.error("Error in reset permissions:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi khôi phục quyền mặc định" },
            { status: 500 }
        );
    }
}
