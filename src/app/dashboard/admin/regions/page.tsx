import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GrowingRegionsManager } from "@/components/admin/growing-regions-manager";

export const dynamic = "force-dynamic";
export default async function Page() {
    const session = await getServerSession(authOptions); if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login");
    const [regions, managers] = await Promise.all([
        prisma.growingRegion.findMany({ orderBy: [{ status: "asc" }, { code: "asc" }], include: { _count: { select: { farms: true } }, managerAssignments: { where: { isActive: true, endedAt: null }, take: 1, select: { areaManager: { select: { id: true, fullName: true, phone: true } } } } } }),
        prisma.user.findMany({ where: { role: "AREA_MANAGER", accountStatus: "APPROVED", isLocked: false, deletedAt: null }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, phone: true } }),
    ]);
    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6"><header><p className="text-sm font-bold uppercase tracking-wider text-brand-700">Quản trị hệ thống</p><h1 className="mt-1 text-3xl font-black">Quản lý vùng trồng</h1><p className="mt-2 text-slate-500">Quản lý trạng thái vùng và phân công Trưởng ban bằng quan hệ có lịch sử.</p></header><GrowingRegionsManager regions={regions} managers={managers} /></main>;
}
