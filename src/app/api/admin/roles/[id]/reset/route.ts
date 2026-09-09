import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resetRolePermissionsToDefault } from "@/lib/role-service";

export const dynamic = "force-dynamic";

export async function POST(
    _: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Bạn không có quyền khôi phục quyền mặc định." }, { status: 403 });
    }

    try {
        const adminName = session.user.fullName || session.user.phone || "Admin";
        const adminId = session.user.id;

        const defaultPerms = await resetRolePermissionsToDefault(params.id, adminName, adminId);
        return NextResponse.json({
            success: true,
            message: `Đã khôi phục quyền vai trò "${params.id}" về mặc định hệ thống.`,
            data: {
                roleKey: params.id,
                permissions: defaultPerms,
                count: defaultPerms.length,
            },
        });
    } catch (error: any) {
        console.error("POST /api/admin/roles/[id]/reset error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi khôi phục quyền mặc định." },
            { status: 500 },
        );
    }
}
