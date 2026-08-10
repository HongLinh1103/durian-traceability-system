import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";

export async function getWeatherSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    if (!['FARMER', 'AREA_MANAGER'].includes(session.user.role)) return null;
    return session;
}

export async function getScopedFarm(userId: string, role: string, farmId: string) {
    if (role === "FARMER") {
        return prisma.farm.findFirst({
            where: { id: farmId, farmerId: userId, isActive: true },
            include: { region: { select: { id: true, code: true, name: true } }, farmingLogs: { orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }], take: 5 } },
        });
    }
    if (role === "AREA_MANAGER") {
        const scope = await getManagedRegionScope(userId, role);
        if (!scope?.codes.length) return null;
        return prisma.farm.findFirst({
            where: { id: farmId, isActive: true, region: { code: { in: scope.codes } } },
            include: { region: { select: { id: true, code: true, name: true } }, farmingLogs: { orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }], take: 5 } },
        });
    }
    return null;
}

export async function getFarmerAdviceFarm(userId: string) {
    return prisma.farm.findFirst({
        where: { farmerId: userId, isActive: true },
        orderBy: [{ farmingLogs: { _count: "desc" } }, { createdAt: "asc" }],
        include: {
            region: { select: { id: true, code: true, name: true } },
            farmingLogs: { orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }], take: 5 },
        },
    });
}

export async function getScopedRegion(userId: string, role: string, regionId: string) {
    if (role !== "AREA_MANAGER") return null;
    const scope = await getManagedRegionScope(userId, role);
    if (!scope?.codes.length) return null;
    return prisma.growingRegion.findFirst({
        where: { id: regionId, code: { in: scope.codes }, isActive: true },
        include: {
            farms: {
                where: { isActive: true, farmer: { deletedAt: null, isApproved: true } },
                select: {
                    id: true, farmCode: true, farmName: true, latitude: true, longitude: true,
                    address: true, durianVariety: true, farmerId: true,
                    farmingLogs: {
                        orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
                        take: 1,
                        select: { stage: true, actionDate: true },
                    },
                },
                orderBy: { farmName: "asc" },
            },
        },
    });
}
