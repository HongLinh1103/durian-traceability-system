import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminPermissionManager } from "@/components/admin/admin-permission-manager";

export const metadata: Metadata = {
    title: "Phân Quyền Hệ Thống - Quản Trị Trí Việt",
    description: "Quản lý và thiết lập ma trận quyền truy cập các phân hệ cho từng vai trò người dùng trong hệ thống.",
};

export const dynamic = "force-dynamic";

export default async function AdminPermissionsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    if (session.user.role !== "ADMIN") {
        redirect("/");
    }

    return (
        <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 sm:px-6">
            <AdminPermissionManager />
        </main>
    );
}
