import { prisma } from "@/lib/prisma";
import {
    SYSTEM_ROLES,
    INITIAL_CUSTOM_ROLES,
    MOCK_ASSIGNED_USERS,
    DEFAULT_ROLE_PERMISSIONS,
    PERMISSION_MODULES,
    calculateRolePermissionStats,
    generateRoleKeyFromName,
    getAllSystemPermissionKeys,
    normalizeCatalogPermissions,
    RoleItem,
    RoleAssignedUser,
    CustomRoleDef,
} from "@/lib/permissions-data";

// Bộ nhớ đệm (In-memory fallback) khi cơ sở dữ liệu tạm thời chưa kết nối hoặc chưa chạy migration
interface MemoryRoleState {
    customRoles: CustomRoleDef[];
    rolePermissions: Map<string, string[]>;
    roleMetadata: Map<string, { name?: string; description?: string; targetGroup?: string; status?: "ACTIVE" | "INACTIVE" }>;
    roleAssignedUsers: Map<string, string[]>; // roleKey -> userIds
}

const memoryState: MemoryRoleState = {
    customRoles: [...INITIAL_CUSTOM_ROLES],
    rolePermissions: new Map<string, string[]>(),
    roleMetadata: new Map(),
    roleAssignedUsers: new Map<string, string[]>(),
};

// Khởi tạo quyền mặc định và gán tài khoản cho custom roles ban đầu
for (const cr of INITIAL_CUSTOM_ROLES) {
    memoryState.rolePermissions.set(cr.key, [...cr.permissions]);
    memoryState.roleMetadata.set(cr.key, {
        name: cr.name,
        description: cr.description,
        targetGroup: cr.targetGroup,
        status: cr.status,
    });
    if (cr.assignedUserIds) {
        memoryState.roleAssignedUsers.set(cr.key, [...cr.assignedUserIds]);
    }
}

/**
 * Lấy danh sách toàn bộ tài khoản người dùng từ DB hoặc fallback mock
 */
export async function getAllUsersList(): Promise<RoleAssignedUser[]> {
    try {
        const dbUsers = await prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                role: true,
                accountStatus: true,
                registrationName: true,
                address: true,
            },
            orderBy: [{ fullName: "asc" }, { phone: "asc" }],
        });

        if (dbUsers && dbUsers.length > 0) {
            return dbUsers.map((u) => {
                const org =
                    u.registrationName ||
                    (u.role === "ADMIN" ? "Quản trị hệ thống Trí Việt" : u.address || undefined);
                return {
                    id: u.id,
                    fullName: u.fullName || u.phone,
                    phone: u.phone,
                    email: u.email,
                    organization: org,
                    accountStatus: u.accountStatus || "APPROVED",
                    role: u.role,
                };
            });
        }
    } catch (err) {
        console.warn("[RoleService] Cannot fetch users from DB, using fallback mock users:", err);
    }

    // Gộp tất cả mock users thành danh sách duy nhất không trùng
    const userMap = new Map<string, RoleAssignedUser>();
    for (const userList of Object.values(MOCK_ASSIGNED_USERS)) {
        for (const u of userList) {
            if (!userMap.has(u.id)) {
                userMap.set(u.id, u);
            }
        }
    }
    return Array.from(userMap.values());
}

/**
 * Lấy toàn bộ danh sách Role (Hệ thống + Tùy chỉnh) kèm quyền, tài khoản gán và thống kê
 */
export async function getAllRolesData(): Promise<{ roles: RoleItem[]; allUsers: RoleAssignedUser[] }> {
    const allUsers = await getAllUsersList();
    const userById = new Map(allUsers.map((u) => [u.id, u]));

    // Đọc cấu hình từ DB nếu có
    const dbRoleConfigs = new Map<string, any>();
    try {
        const configs = await prisma.rolePermissionConfig.findMany();
        for (const c of configs) {
            dbRoleConfigs.set(c.roleKey, c);
        }
    } catch {
        // DB offline
    }

    const allRoles: RoleItem[] = [];

    // 1. DUYỆT CÁC ROLE HỆ THỐNG
    for (const sysRole of SYSTEM_ROLES) {
        const defaultPerms = normalizeCatalogPermissions(DEFAULT_ROLE_PERMISSIONS[sysRole.key]?.permissions || []);
        const dbConfig = dbRoleConfigs.get(sysRole.key);
        const memPerms = memoryState.rolePermissions.get(sysRole.key);
        const memMeta = memoryState.roleMetadata.get(sysRole.key);

        const activePermissions = normalizeCatalogPermissions(dbConfig?.permissions || memPerms || defaultPerms);
        const targetGroup = memMeta?.targetGroup || sysRole.targetGroup;
        const status = memMeta?.status || "ACTIVE";
        const roleName = dbConfig?.roleName || memMeta?.name || sysRole.name;
        const roleDescription = dbConfig?.roleDescription || memMeta?.description || sysRole.description;

        // Tài khoản được gán
        let assignedUsers: RoleAssignedUser[] = [];
        const customAssignedIds = memoryState.roleAssignedUsers.get(sysRole.key);

        if (customAssignedIds && customAssignedIds.length > 0) {
            assignedUsers = customAssignedIds
                .map((id) => userById.get(id))
                .filter((u): u is RoleAssignedUser => Boolean(u));
        } else {
            // Lấy theo role người dùng
            const matchingUsers = allUsers.filter((u) => u.role === sysRole.key);
            if (matchingUsers.length > 0) {
                assignedUsers = matchingUsers;
            } else if (MOCK_ASSIGNED_USERS[sysRole.key]) {
                assignedUsers = MOCK_ASSIGNED_USERS[sysRole.key];
            }
        }

        const stats = calculateRolePermissionStats(sysRole.key, activePermissions);

        allRoles.push({
            key: sysRole.key,
            name: roleName,
            description: roleDescription,
            isSystem: true,
            badgeColor: sysRole.badgeColor,
            targetGroup,
            status,
            permissions: activePermissions,
            defaultPermissions: defaultPerms,
            assignedUsers,
            stats: {
                totalGranted: stats.totalGranted,
                totalAvailable: stats.totalAvailable,
                userCount: assignedUsers.length,
                perModuleStats: stats.perModuleStats,
            },
            updatedAt: dbConfig?.updatedAt ? new Date(dbConfig.updatedAt).toISOString() : undefined,
            updatedByName: dbConfig?.updatedByName || "Admin",
        });
    }

    // 2. DUYỆT CÁC ROLE TÙY CHỈNH
    // Tập hợp các custom role keys từ memory và db
    const customRoleKeys = new Set<string>();
    for (const cr of memoryState.customRoles) {
        customRoleKeys.add(cr.key);
    }
    for (const k of dbRoleConfigs.keys()) {
        if (!SYSTEM_ROLES.some((sr) => sr.key === k)) {
            customRoleKeys.add(k);
        }
    }

    for (const roleKey of customRoleKeys) {
        const memRole = memoryState.customRoles.find((r) => r.key === roleKey);
        const dbConfig = dbRoleConfigs.get(roleKey);
        const memMeta = memoryState.roleMetadata.get(roleKey);

        const name = dbConfig?.roleName || memMeta?.name || memRole?.name || roleKey;
        const description = dbConfig?.roleDescription || memMeta?.description || memRole?.description || "";
        const targetGroup = memMeta?.targetGroup || memRole?.targetGroup || "Cơ sở chế biến";
        const status = memMeta?.status || memRole?.status || "ACTIVE";
        const badgeColor = memRole?.badgeColor || "bg-indigo-100 text-indigo-800 border-indigo-200";

        const defaultPerms = normalizeCatalogPermissions(memRole?.permissions || DEFAULT_ROLE_PERMISSIONS[roleKey]?.permissions || []);
        const activePermissions = normalizeCatalogPermissions(dbConfig?.permissions || memoryState.rolePermissions.get(roleKey) || defaultPerms);

        // Tài khoản được gán
        let assignedUsers: RoleAssignedUser[] = [];
        const customAssignedIds = memoryState.roleAssignedUsers.get(roleKey) || memRole?.assignedUserIds;

        if (customAssignedIds && customAssignedIds.length > 0) {
            assignedUsers = customAssignedIds
                .map((id) => userById.get(id))
                .filter((u): u is RoleAssignedUser => Boolean(u));
        }

        if (assignedUsers.length === 0 && MOCK_ASSIGNED_USERS[roleKey]) {
            assignedUsers = MOCK_ASSIGNED_USERS[roleKey];
        }

        const stats = calculateRolePermissionStats(roleKey, activePermissions);

        allRoles.push({
            key: roleKey,
            name,
            description,
            isSystem: false,
            badgeColor,
            targetGroup,
            status,
            permissions: activePermissions,
            defaultPermissions: defaultPerms,
            assignedUsers,
            stats: {
                totalGranted: stats.totalGranted,
                totalAvailable: stats.totalAvailable,
                userCount: assignedUsers.length,
                perModuleStats: stats.perModuleStats,
            },
            updatedAt: dbConfig?.updatedAt ? new Date(dbConfig.updatedAt).toISOString() : undefined,
            updatedByName: dbConfig?.updatedByName || "Admin",
        });
    }

    return { roles: allRoles, allUsers };
}

/**
 * Lưu danh sách quyền cho vai trò
 */
export async function saveRolePermissions(
    roleKey: string,
    permissions: string[],
    adminName = "Admin",
    adminId?: string
) {
    const validKeys = new Set(getAllSystemPermissionKeys());
    const cleanPermissions = [...new Set(permissions)].filter((k) => validKeys.has(k));

    // Lưu vào memory state
    memoryState.rolePermissions.set(roleKey, cleanPermissions);

    // Lưu vào DB nếu có
    try {
        const defaultModEnabled: Record<string, boolean> = {};
        for (const mod of PERMISSION_MODULES) {
            const hasAny = mod.features.some((f) =>
                Object.values(f.actions).some((a) => a?.key && cleanPermissions.includes(a.key))
            );
            defaultModEnabled[mod.id] = hasAny;
        }

        await prisma.rolePermissionConfig.upsert({
            where: { roleKey },
            update: {
                permissions: cleanPermissions,
                moduleEnabled: defaultModEnabled,
                updatedByName: adminName,
                updatedById: adminId,
            },
            create: {
                roleKey,
                permissions: cleanPermissions,
                moduleEnabled: defaultModEnabled,
                updatedByName: adminName,
                updatedById: adminId,
            },
        });

        await prisma.permissionAuditLog.create({
            data: {
                roleKey,
                actorId: adminId,
                actorName: adminName,
                action: "UPDATE_PERMISSIONS",
                changes: { count: cleanPermissions.length, permissions: cleanPermissions },
                changeSummary: `Cập nhật ${cleanPermissions.length} quyền cho vai trò ${roleKey}`,
            },
        });
    } catch (err) {
        console.warn("[RoleService] Database offline, saved in memory:", err);
    }

    return cleanPermissions;
}

/**
 * Cập nhật thông tin vai trò (Tên, Mô tả, Nhóm đối tượng, Trạng thái)
 */
export async function updateRoleInfo(
    roleKey: string,
    data: { name?: string; description?: string; targetGroup?: string; status?: "ACTIVE" | "INACTIVE" },
    adminName = "Admin",
    adminId?: string
) {
    const prevMeta = memoryState.roleMetadata.get(roleKey) || {};
    const updatedMeta = { ...prevMeta, ...data };
    memoryState.roleMetadata.set(roleKey, updatedMeta);

    // Cập nhật trong customRoles nếu là custom role
    const crIndex = memoryState.customRoles.findIndex((r) => r.key === roleKey);
    if (crIndex !== -1) {
        if (data.name) memoryState.customRoles[crIndex].name = data.name;
        if (data.description !== undefined) memoryState.customRoles[crIndex].description = data.description;
        if (data.targetGroup) memoryState.customRoles[crIndex].targetGroup = data.targetGroup;
        if (data.status) memoryState.customRoles[crIndex].status = data.status;
    }

    // Cập nhật DB nếu có
    try {
        await prisma.rolePermissionConfig.upsert({
            where: { roleKey },
            update: {
                roleName: data.name,
                roleDescription: data.description,
                updatedByName: adminName,
                updatedById: adminId,
            },
            create: {
                roleKey,
                roleName: data.name,
                roleDescription: data.description,
                moduleEnabled: {},
                permissions: memoryState.rolePermissions.get(roleKey) || [],
                updatedByName: adminName,
                updatedById: adminId,
            },
        });

        await prisma.permissionAuditLog.create({
            data: {
                roleKey,
                actorId: adminId,
                actorName: adminName,
                action: "UPDATE_ROLE_INFO",
                changes: data,
                changeSummary: `Cập nhật thông tin vai trò ${roleKey}`,
            },
        });
    } catch (err) {
        console.warn("[RoleService] Database offline, updated role info in memory:", err);
    }

    return updatedMeta;
}

/**
 * Tạo mới vai trò tùy chỉnh
 */
export async function createCustomRole(
    params: {
        roleName: string;
        roleKey?: string;
        roleDescription?: string;
        targetGroup?: string;
        copyFromRole?: string;
    },
    adminName = "Admin",
    adminId?: string
) {
    const trimmedName = params.roleName.trim();
    const generatedKey = params.roleKey?.trim() || generateRoleKeyFromName(trimmedName);

    // Kiểm tra trùng key
    const allRoles = await getAllRolesData();
    if (allRoles.roles.some((r) => r.key === generatedKey)) {
        throw new Error(`Mã vai trò "${generatedKey}" đã tồn tại trên hệ thống.`);
    }

    // Quyền khởi tạo
    let initialPermissions: string[] = [];
    if (params.copyFromRole) {
        const sourceRole = allRoles.roles.find((r) => r.key === params.copyFromRole);
        if (sourceRole) {
            initialPermissions = [...sourceRole.permissions];
        }
    }

    const newRoleObj: CustomRoleDef = {
        key: generatedKey,
        name: trimmedName,
        description: params.roleDescription?.trim() || `Vai trò ${trimmedName} tùy chỉnh`,
        targetGroup: params.targetGroup || "Cơ sở chế biến",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
        status: "ACTIVE",
        permissions: initialPermissions,
        assignedUserIds: [],
    };

    memoryState.customRoles.push(newRoleObj);
    memoryState.rolePermissions.set(generatedKey, initialPermissions);
    memoryState.roleMetadata.set(generatedKey, {
        name: trimmedName,
        description: newRoleObj.description,
        targetGroup: newRoleObj.targetGroup,
        status: "ACTIVE",
    });
    memoryState.roleAssignedUsers.set(generatedKey, []);

    // Lưu vào DB
    try {
        await prisma.rolePermissionConfig.create({
            data: {
                roleKey: generatedKey,
                roleName: trimmedName,
                roleDescription: newRoleObj.description,
                moduleEnabled: {},
                permissions: initialPermissions,
                updatedByName: adminName,
                updatedById: adminId,
            },
        });

        await prisma.permissionAuditLog.create({
            data: {
                roleKey: generatedKey,
                actorId: adminId,
                actorName: adminName,
                action: "CREATE_ROLE",
                changes: { roleKey: generatedKey, roleName: trimmedName },
                changeSummary: `Tạo mới vai trò: ${trimmedName} (${generatedKey})`,
            },
        });
    } catch (err) {
        console.warn("[RoleService] Database offline, created role in memory:", err);
    }

    return newRoleObj;
}

/**
 * Xóa vai trò tùy chỉnh
 */
export async function deleteCustomRole(roleKey: string, adminName = "Admin", adminId?: string) {
    if (SYSTEM_ROLES.some((sr) => sr.key === roleKey)) {
        throw new Error("Không thể xóa vai trò mặc định của hệ thống.");
    }

    memoryState.customRoles = memoryState.customRoles.filter((r) => r.key !== roleKey);
    memoryState.rolePermissions.delete(roleKey);
    memoryState.roleMetadata.delete(roleKey);
    memoryState.roleAssignedUsers.delete(roleKey);

    try {
        await prisma.rolePermissionConfig.deleteMany({ where: { roleKey } });
        await prisma.permissionAuditLog.create({
            data: {
                roleKey,
                actorId: adminId,
                actorName: adminName,
                action: "DELETE_ROLE",
                changes: { roleKey },
                changeSummary: `Xóa vai trò tùy chỉnh: ${roleKey}`,
            },
        });
    } catch (err) {
        console.warn("[RoleService] Database offline, deleted role from memory:", err);
    }

    return true;
}

/**
 * Gán danh sách tài khoản vào vai trò
 */
export async function assignUsersToRole(
    roleKey: string,
    userIds: string[],
    adminName = "Admin",
    adminId?: string
) {
    const current = memoryState.roleAssignedUsers.get(roleKey) || [];
    const merged = Array.from(new Set([...current, ...userIds]));
    memoryState.roleAssignedUsers.set(roleKey, merged);

    try {
        await prisma.permissionAuditLog.create({
            data: {
                roleKey,
                actorId: adminId,
                actorName: adminName,
                action: "ASSIGN_USERS",
                changes: { userIds },
                changeSummary: `Gán ${userIds.length} tài khoản vào vai trò ${roleKey}`,
            },
        });
    } catch {
        // db offline
    }

    return merged;
}

/**
 * Gỡ tài khoản khỏi vai trò
 */
export async function removeUserFromRole(
    roleKey: string,
    userId: string,
    adminName = "Admin",
    adminId?: string
) {
    const current = memoryState.roleAssignedUsers.get(roleKey) || [];
    const filtered = current.filter((id) => id !== userId);
    memoryState.roleAssignedUsers.set(roleKey, filtered);

    // Xóa trong mock assigned users nếu có
    if (MOCK_ASSIGNED_USERS[roleKey]) {
        MOCK_ASSIGNED_USERS[roleKey] = MOCK_ASSIGNED_USERS[roleKey].filter((u) => u.id !== userId);
    }

    try {
        await prisma.permissionAuditLog.create({
            data: {
                roleKey,
                actorId: adminId,
                actorName: adminName,
                action: "REMOVE_USER",
                changes: { userId },
                changeSummary: `Gỡ tài khoản ${userId} khỏi vai trò ${roleKey}`,
            },
        });
    } catch {
        // db offline
    }

    return filtered;
}

/**
 * Khôi phục quyền vai trò về mặc định
 */
export async function resetRolePermissionsToDefault(
    roleKey: string,
    adminName = "Admin",
    adminId?: string
) {
    const defaultPerms = normalizeCatalogPermissions(DEFAULT_ROLE_PERMISSIONS[roleKey]?.permissions || []);
    memoryState.rolePermissions.set(roleKey, [...defaultPerms]);

    try {
        await prisma.rolePermissionConfig.upsert({
            where: { roleKey },
            update: {
                permissions: defaultPerms,
                updatedByName: adminName,
                updatedById: adminId,
            },
            create: {
                roleKey,
                permissions: defaultPerms,
                moduleEnabled: {},
                updatedByName: adminName,
                updatedById: adminId,
            },
        });

        await prisma.permissionAuditLog.create({
            data: {
                roleKey,
                actorId: adminId,
                actorName: adminName,
                action: "RESET_DEFAULT",
                changes: { permissions: defaultPerms },
                changeSummary: `Khôi phục quyền vai trò ${roleKey} về mặc định hệ thống`,
            },
        });
    } catch (err) {
        console.warn("[RoleService] Database offline, reset in memory:", err);
    }

    return defaultPerms;
}
