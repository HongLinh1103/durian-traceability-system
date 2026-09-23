import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GrowingRegionsManager } from "@/components/admin/growing-regions-manager";

export const dynamic = "force-dynamic";
export default async function Page() {
    const session = await getServerSession(authOptions); if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login");
    const [regions, managers] = await Promise.all([
        prisma.growingRegion.findMany({
            orderBy: [{ status: "asc" }, { code: "asc" }], include: {
                farms: { where: { isActive: true, farmer: { accountStatus: "APPROVED", isApproved: true, deletedAt: null } }, select: { farmerId: true, areaSize: true, areaUnit: true } },
                managerAssignments: { orderBy: { assignedAt: "desc" }, select: { id: true, assignedAt: true, endedAt: true, isActive: true, note: true, areaManager: { select: { id: true, fullName: true, phone: true } } } },
            }
        }),
        prisma.user.findMany({ where: { role: "AREA_MANAGER", accountStatus: "APPROVED", isLocked: false, deletedAt: null }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, phone: true } }),
    ]);
    return (
        <main className="mx-auto w-full max-w-[1650px] space-y-6 px-3 py-6 sm:px-6">
            <header>
                <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Quản trị hệ thống</p>
                <h1 className="mt-1 text-3xl font-black">DANH SÁCH NÔNG HỘ</h1>

            </header>
            <GrowingRegionsManager regions={regions} managers={managers} />
        </main>
    );
}
