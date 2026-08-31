import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionsForRole, ROLE_LABELS } from "@/lib/account-permissions";

export const dynamic = "force-dynamic";

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.id && session.user.role === "ADMIN" ? session : null;
}

export async function GET() {
    try {
        const session = await requireAdmin();
        if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        const users = await prisma.user.findMany({
            where: { role: { not: "ADMIN" }, deletedAt: null },
            select: { id: true, fullName: true, phone: true, email: true, role: true, accountStatus: true },
            orderBy: [{ fullName: "asc" }, { phone: "asc" }],
        });
        let savedConfigs = new Map<string, string[]>();
        try {
            const configs = await prisma.userPermissionConfig.findMany({ select: { userId: true, permissions: true } });
            savedConfigs = new Map(configs.map((config) => [config.userId, config.permissions]));
        } catch (error) {
            console.warn("[Permissions] Bảng user_permission_configs chưa sẵn sàng, dùng quyền mặc định.", error);
        }
        return NextResponse.json({ success: true, data: users.map((user) => {
            const availablePermissions = permissionsForRole(user.role);
            const savedPermissions = savedConfigs.get(user.id);
            return {
                id: user.id, fullName: user.fullName || user.phone, phone: user.phone, email: user.email,
                role: user.role, roleLabel: ROLE_LABELS[user.role] || user.role, accountStatus: user.accountStatus,
                availablePermissions, permissions: savedPermissions ?? availablePermissions.map((item) => item.key),
                isDefault: !savedPermissions,
            };
        }) });
    } catch (error) {
        console.error("GET /api/admin/permissions failed", error);
        return NextResponse.json({ success: false, message: "Không thể tải dữ liệu phân quyền. Vui lòng kiểm tra kết nối cơ sở dữ liệu." }, { status: 500 });
    }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const requested: string[] = Array.isArray(body.permissions)
        ? (body.permissions as unknown[]).filter((key): key is string => typeof key === "string")
        : [];
    const user = await prisma.user.findFirst({ where: { id: userId, role: { not: "ADMIN" }, deletedAt: null }, select: { id: true, role: true, fullName: true, phone: true } });
    if (!user) return NextResponse.json({ success: false, message: "Tài khoản không tồn tại." }, { status: 404 });
    const allowedKeys = new Set(permissionsForRole(user.role).map((item) => item.key));
    const permissions = [...new Set(requested)].filter((key) => allowedKeys.has(key));
    const adminName = session.user.fullName || session.user.phone || "Admin";
    await prisma.$transaction([
        prisma.userPermissionConfig.upsert({
            where: { userId }, update: { permissions, updatedById: session.user.id, updatedByName: adminName },
            create: { userId, permissions, updatedById: session.user.id, updatedByName: adminName },
        }),
        prisma.permissionAuditLog.create({ data: {
            roleKey: `USER:${userId}`, actorId: session.user.id, actorName: adminName,
            action: "UPDATE_USER_PERMISSIONS", changes: { permissions },
            changeSummary: `Cập nhật quyền cho ${user.fullName || user.phone}`,
        } }),
    ]);
    return NextResponse.json({ success: true, message: "Đã cập nhật quyền tài khoản.", data: { userId, permissions } });
  } catch (error) {
    console.error("PUT /api/admin/permissions failed", error);
    return NextResponse.json({ success: false, message: "Không thể lưu quyền. Hãy chạy migration cơ sở dữ liệu rồi thử lại." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const userId = new URL(request.url).searchParams.get("userId") || "";
    await prisma.userPermissionConfig.deleteMany({ where: { userId, user: { role: { not: "ADMIN" } } } });
    return NextResponse.json({ success: true, message: "Đã khôi phục quyền mặc định." });
  } catch (error) {
    console.error("DELETE /api/admin/permissions failed", error);
    return NextResponse.json({ success: false, message: "Không thể khôi phục quyền. Hãy kiểm tra cơ sở dữ liệu rồi thử lại." }, { status: 500 });
  }
}
