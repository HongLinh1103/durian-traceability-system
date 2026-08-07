import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";
import { GardensManager } from "@/components/region-manager/gardens-manager";

export const dynamic = "force-dynamic";

export default async function RegionManagerGardensPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    if (!scope) redirect("/");

    const farms = scope.codes.length
        ? await prisma.farm.findMany({
            where: {
                isActive: true,
                region: { code: { in: scope.codes } },
                farmer: {
                    accountStatus: "APPROVED",
                    isApproved: true,
                    deletedAt: null,
                },
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                createdAt: true,
                farmCode: true,
                farmName: true,
                province: true,
                district: true,
                ward: true,
                address: true,
                areaSize: true,
                totalTrees: true,
                durianVariety: true,
                isActive: true,
                region: { select: { code: true, name: true } },
                farmer: { select: { fullName: true, phone: true, approvedAt: true } },
                farmingLogs: {
                    orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
                    select: { actionDate: true },
                },
            },
        })
        : [];

    return (
        <GardensManager
            regions={scope.regions}
            gardens={farms.map((farm) => {
                return {
                id: farm.id,
                farmCode: farm.farmCode,
                farmName: farm.farmName,
                ownerName: farm.farmer.fullName || farm.farmer.phone,
                ownerPhone: farm.farmer.phone,
                locality: [farm.ward, farm.district, farm.province].filter(Boolean).join(", ") || farm.address,
                areaSize: farm.areaSize,
                totalTrees: farm.totalTrees,
                durianVariety: farm.durianVariety,
                isActive: farm.isActive,
                regionCode: farm.region?.code ?? "",
                regionName: farm.region?.name ?? "",
                latestLogDate: farm.farmingLogs[0]?.actionDate.toISOString() ?? null,
                };
            })}
        />
    );
}
