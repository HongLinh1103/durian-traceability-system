import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Chỉ ADMIN được quản lý canh tác." }, { status: 403 });
        }

        let farms: any[] = [];

        try {
            farms = await prisma.farm.findMany({
                where: {
                    farmer: {
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
        } catch (dbError) {
            console.warn("[AdminFarmingAPI] Error querying database or DB offline:", dbError);
            // Return empty data gracefully rather than throwing 500
            farms = [];
        }

        const rows = farms.map((farm) => {
            const latestLogDate = farm.farmingLogs?.[0]?.actionDate ?? null;
            return {
                id: farm.id,
                farmCode: farm.farmCode || "MSVT-CHUA-CAP",
                farmName: farm.farmName || "Vườn chưa đặt tên",
                ownerName: farm.farmer?.fullName ?? farm.farmer?.phone ?? "Chưa rõ",
                ownerId: farm.farmer?.id ?? "",
                growingRegion: farm.growingRegion ?? "Chưa phân vùng",
                address: farm.address ?? "",
                areaSize: Number(farm.areaSize) || 0,
                durianVariety: farm.durianVariety ?? "Sầu riêng",
                isActive: Boolean(farm.isActive),
                isInSeason: Boolean(farm.isInSeason),
                latestLogDate: latestLogDate ? new Date(latestLogDate).toISOString() : null,
                logCount: farm._count?.farmingLogs ?? 0,
            };
        });

        return NextResponse.json({
            success: true,
            data: rows,
            stats: {
                totalFarms: rows.length,
                activeFarms: rows.filter((farm) => farm.isActive).length,
                inSeasonFarms: rows.filter((farm) => farm.isActive && farm.isInSeason).length,
                totalArea: rows.reduce((total, farm) => total + (farm.areaSize || 0), 0),
            },
        });
    } catch (error: any) {
        console.error("Fatal error in GET /api/admin/farming:", error);
        return NextResponse.json(
            {
                success: false,
                message: error.message || "Lỗi khi tải dữ liệu canh tác",
                data: [],
                stats: { totalFarms: 0, activeFarms: 0, inSeasonFarms: 0, totalArea: 0 },
            },
            { status: 500 }
        );
    }
}
