import { prisma } from "@/lib/prisma";

type RegionAssignment = {
    code?: string;
    name?: string;
};

function normalizeAssignments(value: unknown): RegionAssignment[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is RegionAssignment => Boolean(item && typeof item === "object"));
    }
    return value && typeof value === "object" ? [value as RegionAssignment] : [];
}

export async function getManagedRegionScope(userId: string, role: string) {
    if (role === "ADMIN") {
        const regions = await prisma.growingRegion.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, code: true, name: true },
        });
        return { isAdmin: true, regions, codes: regions.map((region) => region.code) };
    }

    if (role !== "AREA_MANAGER") return null;
    const profile = await prisma.areaManagerApplication.findUnique({
        where: { userId },
        select: { managedRegions: true },
    });
    const assignments = normalizeAssignments(profile?.managedRegions);
    const codes = assignments
        .map((item) => item.code?.trim())
        .filter((code): code is string => Boolean(code));
    const regions = codes.length
        ? await prisma.growingRegion.findMany({
            where: { code: { in: codes }, isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, code: true, name: true },
        })
        : [];
    return { isAdmin: false, regions, codes: regions.map((region) => region.code) };
}
