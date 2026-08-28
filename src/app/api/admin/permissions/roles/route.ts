import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRoleKeyFromName, calculateRolePermissionStats } from "@/lib/permissions-data";

export const dynamic = "force-dynamic";

// In-memory custom roles fallback
const customRolesMemory: any[] = [];

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const adminName = session?.user?.fullName || session?.user?.phone || "Admin";

        const body = await request.json();
        const { roleName, roleDescription } = body;

        if (!roleName || !roleName.trim()) {
            return NextResponse.json({ success: false, message: "Vui lòng nhập tên vai trò" }, { status: 400 });
        }

        const trimmedName = roleName.trim();
        const generatedKey = generateRoleKeyFromName(trimmedName);

        // Initial default empty permissions for new custom role
        const defaultModuleEnabled: Record<string, boolean> = {
            CULTIVATION: true,
            HARVEST: true,
            PROCUREMENT: true,
            PROCESSING: true,
            INVENTORY: true,
            STORE_MARKETPLACE: true,
            SEEDLING_NURSERY: true,
            FINANCE: true,
            TRACEABILITY: true,
            SYSTEM_ADMIN: false,
        };
        const initialPermissions: string[] = [];

        const newRoleObj = {
            key: generatedKey,
            name: trimmedName,
            description: roleDescription?.trim() || `Vai trò ${trimmedName} tùy chỉnh`,
            badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
        };

        customRolesMemory.push(newRoleObj);

        // Save to DB if available
        try {
            await prisma.rolePermissionConfig.upsert({
                where: { roleKey: generatedKey },
                update: {
                    roleName: trimmedName,
                    roleDescription: roleDescription?.trim() || `Vai trò ${trimmedName} tùy chỉnh`,
                    updatedByName: adminName,
                },
                create: {
                    roleKey: generatedKey,
                    roleName: trimmedName,
                    roleDescription: roleDescription?.trim() || `Vai trò ${trimmedName} tùy chỉnh`,
                    moduleEnabled: defaultModuleEnabled,
                    permissions: initialPermissions,
                    updatedByName: adminName,
                },
            });

            await prisma.permissionAuditLog.create({
                data: {
                    roleKey: generatedKey,
                    actorName: adminName,
                    action: "CREATE_ROLE",
                    changes: [{ type: "CREATE_ROLE", roleName: trimmedName, roleKey: generatedKey }],
                    changeSummary: `Tạo mới vai trò: ${trimmedName} (${generatedKey})`,
                },
            });
        } catch (dbErr) {
            console.warn("[CreateRoleAPI] Database offline, created in memory:", dbErr);
        }

        const stats = calculateRolePermissionStats(generatedKey, initialPermissions, defaultModuleEnabled);

        return NextResponse.json({
            success: true,
            message: `Tạo vai trò "${trimmedName}" thành công`,
            data: {
                role: newRoleObj,
                config: {
                    moduleEnabled: defaultModuleEnabled,
                    permissions: initialPermissions,
                    stats,
                },
            },
        });
    } catch (error: any) {
        console.error("Error creating custom role:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Lỗi khi tạo vai trò mới" },
            { status: 500 }
        );
    }
}
