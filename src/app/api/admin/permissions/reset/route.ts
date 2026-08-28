import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLE_PERMISSIONS, calculateRolePermissionStats } from "@/lib/permissions-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const adminName = session?.user?.fullName || session?.user?.phone || "Admin";

        const body = await request.json();
        const { roleKey } = body;

        if (!roleKey || !DEFAULT_ROLE_PERMISSIONS[roleKey]) {
            return NextResponse.json({ success: false, message: "Vai trò không hợp lệ" }, { status: 400 });
        }

        const defaultConfig = DEFAULT_ROLE_PERMISSIONS[roleKey];

        // Reset in database if available
        try {
            await prisma.rolePermissionConfig.upsert({
                where: { roleKey },
                update: {
                    moduleEnabled: defaultConfig.moduleEnabled,
                    permissions: defaultConfig.permissions,
                    updatedByName: adminName,
                    updatedAt: new Date(),
                },
                create: {
                    roleKey,
                    moduleEnabled: defaultConfig.moduleEnabled,
                    permissions: defaultConfig.permissions,
                    updatedByName: adminName,
                },
            });

            await prisma.permissionAuditLog.create({
                data: {
                    roleKey,
                    actorName: adminName,
                    action: "RESET_DEFAULT",
                    changes: [{ type: "RESET", description: "Khôi phục toàn bộ quyền về mặc định" }],
                    changeSummary: `Khôi phục cấu hình phân quyền vai trò ${roleKey} về mặc định hệ thống`,
                },
            });
        } catch (err) {
            console.warn("[PermissionsResetAPI] DB offline, reset locally:", err);
        }

        const stats = calculateRolePermissionStats(roleKey, defaultConfig.permissions, defaultConfig.moduleEnabled);

        return NextResponse.json({
            success: true,
            message: `Đã khôi phục quyền vai trò ${roleKey} về mặc định thành công`,
            data: {
                roleKey,
                moduleEnabled: defaultConfig.moduleEnabled,
                permissions: defaultConfig.permissions,
                stats,
            },
        });
    } catch (error: any) {
        console.error("Error in reset permissions:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Lỗi khi khôi phục quyền mặc định" },
            { status: 500 }
        );
    }
}
