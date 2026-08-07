import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Chỉ ADMIN được quản lý canh tác." }, { status: 403 });
    }

    const farms = await prisma.farm.findMany({
        where: {
            farmer: {
                isApproved: true,
                accountStatus: "APPROVED",
                deletedAt: null,
            },
        },
        orderBy: { createdAt: "desc" },
        include: {
            farmer: { select: { id: true, fullName: true, phone: true, approvedAt: true } },
            farmingLogs: {
                orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
                take: 1,
                select: { actionDate: true },
            },
            _count: { select: { farmingLogs: true } },
        },
    });

    const rows = farms.map((farm) => {
        const latestLogDate = farm.farmingLogs[0]?.actionDate ?? null;
        return {
            id: farm.id,
            farmCode: farm.farmCode,
            farmName: farm.farmName,
            ownerName: farm.farmer.fullName ?? farm.farmer.phone,
            ownerId: farm.farmer.id,
            growingRegion: farm.growingRegion ?? "Chưa phân vùng",
            address: farm.address,
            areaSize: farm.areaSize,
            durianVariety: farm.durianVariety,
            isActive: farm.isActive,
            isInSeason: farm.isInSeason,
            latestLogDate: latestLogDate?.toISOString() ?? null,
            logCount: farm._count.farmingLogs,
        };
    });

    return NextResponse.json({
        success: true,
        data: rows,
        stats: {
            totalFarms: rows.length,
            activeFarms: rows.filter((farm) => farm.isActive).length,
            inSeasonFarms: rows.filter((farm) => farm.isActive && farm.isInSeason).length,
            totalArea: rows.reduce((total, farm) => total + farm.areaSize, 0),
        },
    });
}
