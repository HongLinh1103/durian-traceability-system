import { prisma } from "@/lib/prisma";

export async function getManagedRegionScope(userId: string, role: string) {
    if (role === "ADMIN") {
        const regions = await prisma.growingRegion.findMany({
            where: { status: "ACTIVE", isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, code: true, name: true },
        });
        return { isAdmin: true, regions, ids: regions.map((region) => region.id), codes: regions.map((region) => region.code) };
    }

    if (role !== "AREA_MANAGER") return null;
    const assignments = await prisma.areaManagerRegionAssignment.findMany({
        where: { areaManagerId: userId, isActive: true, endedAt: null, growingRegion: { status: "ACTIVE", isActive: true } },
        orderBy: { assignedAt: "asc" },
        select: { growingRegion: { select: { id: true, code: true, name: true } } },
    });
    const regions = assignments.map((assignment) => assignment.growingRegion);
    return { isAdmin: false, regions, ids: regions.map((region) => region.id), codes: regions.map((region) => region.code) };
}
