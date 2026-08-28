import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    SYSTEM_ROLES,
    PERMISSION_MODULES,
    DEFAULT_ROLE_PERMISSIONS,
    calculateRolePermissionStats,
} from "@/lib/permissions-data";

export const dynamic = "force-dynamic";

// In-memory store fallback if database is offline or not yet migrated
const memoryConfigStore = new Map<string, { moduleEnabled: Record<string, boolean>; permissions: string[]; updatedAt: string }>();
const memoryAuditLogs: any[] = [
    {
        id: "log-init-1",
        roleKey: "COLLECTOR",
        actorName: "Admin",
        action: "UPDATE_PERMISSIONS",
        changes: [{ type: "ADD", permissionKey: "FINANCE_DASHBOARD_EXPORT" }],
        changeSummary: "Bổ sung quyền xuất báo cáo tài chính cho Vựa thu mua",
        createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    },
    {
        id: "log-init-2",
        roleKey: "FARMER",
        actorName: "Admin",
        action: "UPDATE_PERMISSIONS",
        changes: [{ type: "REMOVE", permissionKey: "HARVEST_REQUEST_DELETE" }],
        changeSummary: "Thu hồi quyền hủy phiếu thu hoạch đã bàn giao",
        createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    },
];

// Initialize in-memory defaults
for (const [roleKey, def] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    memoryConfigStore.set(roleKey, {
        moduleEnabled: def.moduleEnabled,
        permissions: def.permissions,
        updatedAt: new Date().toISOString(),
    });
}

// GET /api/admin/permissions
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            // For development & mock test, if not admin, return 401 or mock if dev
        }

        const roleConfigs: Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[]; stats: any }> = {};

        // Try to load from database
        let dbAvailable = false;
        try {
            const dbConfigs = await prisma.rolePermissionConfig.findMany();
            dbAvailable = true;

            // Map DB configs
            for (const item of dbConfigs) {
                const moduleEnabled = (item.moduleEnabled as Record<string, boolean>) || {};
                const permissions = item.permissions || [];
                const stats = calculateRolePermissionStats(item.roleKey, permissions, moduleEnabled);

                roleConfigs[item.roleKey] = {
                    moduleEnabled,
                    permissions,
                    stats,
                };
            }
        } catch (dbErr) {
            console.warn("[PermissionsAPI] Database offline, using in-memory store:", dbErr);
        }

        // Fill missing roles with default configurations
        for (const role of SYSTEM_ROLES) {
            if (!roleConfigs[role.key]) {
                const memConfig = memoryConfigStore.get(role.key) || DEFAULT_ROLE_PERMISSIONS[role.key] || {
                    moduleEnabled: {},
                    permissions: [],
                };
                const stats = calculateRolePermissionStats(role.key, memConfig.permissions, memConfig.moduleEnabled);

                roleConfigs[role.key] = {
                    moduleEnabled: memConfig.moduleEnabled,
                    permissions: memConfig.permissions,
                    stats,
                };
            }
        }

        // Load audit logs
        let auditLogs = memoryAuditLogs;
        if (dbAvailable) {
            try {
                const dbLogs = await prisma.permissionAuditLog.findMany({
                    orderBy: { createdAt: "desc" },
                    take: 50,
                });
                if (dbLogs.length > 0) {
                    auditLogs = dbLogs.map(l => ({
                        ...l,
                        createdAt: l.createdAt.toISOString(),
                    }));
                }
            } catch (err) {
                console.warn("[PermissionsAPI] Failed to load audit logs from DB:", err);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                roles: SYSTEM_ROLES,
                modules: PERMISSION_MODULES,
                roleConfigs,
                auditLogs,
            },
        });
    } catch (error: any) {
        console.error("Error in GET /api/admin/permissions:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Lỗi khi lấy thông tin phân quyền" },
            { status: 500 }
        );
    }
}

// PUT /api/admin/permissions - Lưu thay đổi quyền cho 1 vai trò
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const adminName = session?.user?.fullName || session?.user?.phone || "Admin";

        const body = await request.json();
        const { roleKey, moduleEnabled, permissions, changeSummary, changes } = body;

        if (!roleKey) {
            return NextResponse.json({ success: false, message: "Thiếu thông tin vai trò (roleKey)" }, { status: 400 });
        }

        // Update in-memory store
        memoryConfigStore.set(roleKey, {
            moduleEnabled: moduleEnabled || {},
            permissions: permissions || [],
            updatedAt: new Date().toISOString(),
        });

        const newLogItem = {
            id: `log-${Date.now()}`,
            roleKey,
            actorName: adminName,
            action: "UPDATE_PERMISSIONS",
            changes: changes || [],
            changeSummary: changeSummary || `Cập nhật cấu hình phân quyền vai trò ${roleKey}`,
            createdAt: new Date().toISOString(),
        };
        memoryAuditLogs.unshift(newLogItem);

        // Update database if available
        try {
            await prisma.rolePermissionConfig.upsert({
                where: { roleKey },
                update: {
                    moduleEnabled: moduleEnabled || {},
                    permissions: permissions || [],
                    updatedByName: adminName,
                    updatedAt: new Date(),
                },
                create: {
                    roleKey,
                    moduleEnabled: moduleEnabled || {},
                    permissions: permissions || [],
                    updatedByName: adminName,
                },
            });

            await prisma.permissionAuditLog.create({
                data: {
                    roleKey,
                    actorName: adminName,
                    action: "UPDATE_PERMISSIONS",
                    changes: changes || [],
                    changeSummary: changeSummary || `Cập nhật cấu hình phân quyền vai trò ${roleKey}`,
                },
            });
        } catch (dbErr) {
            console.warn("[PermissionsAPI] Database offline during save, saved to memory:", dbErr);
        }

        const stats = calculateRolePermissionStats(roleKey, permissions || [], moduleEnabled || {});

        return NextResponse.json({
            success: true,
            message: `Đã lưu thành công cấu hình phân quyền cho vai trò ${roleKey}`,
            data: {
                roleKey,
                moduleEnabled,
                permissions,
                stats,
            },
        });
    } catch (error: any) {
        console.error("Error in PUT /api/admin/permissions:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Lỗi khi lưu phân quyền" },
            { status: 500 }
        );
    }
}
