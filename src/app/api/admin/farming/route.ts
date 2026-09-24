import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Chỉ ADMIN được quản lý canh tác." }, { status: 403 });
        }

        const regionId = new URL(request.url).searchParams.get("regionId")?.trim();
        const regions = await prisma.growingRegion.findMany({ select: { id: true, code: true, name: true }, orderBy: [{ name: "asc" }, { code: "asc" }] });
        const region = regionId ? await prisma.growingRegion.findUnique({ where: { id: regionId }, select: { id: true, code: true, name: true } }) : null;
        if (regionId && !region) return NextResponse.json({ success: false, message: "Không tìm thấy vùng trồng." }, { status: 404 });
        let farms: any[] = [];

        try {
            farms = await prisma.farm.findMany({
                where: {
                    ...(regionId ? { growingRegionId: regionId, isActive: true } : {}),
                    farmer: {
                        deletedAt: null,
                        ...(regionId ? { accountStatus: "APPROVED", isApproved: true } : {}),
                    },
                },
                orderBy: { createdAt: "desc" },
                include: {
                    farmer: { select: { id: true, fullName: true, phone: true, address: true, province: true, district: true, ward: true, approvedAt: true } },
                    region: { select: { name: true, address: true, province: true, district: true, ward: true } },
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
            return NextResponse.json({ success: false, message: "Không thể đọc dữ liệu nông hộ. Vui lòng thử lại." }, { status: 503 });
        }

        let identityMap = new Map<string, string | null>();
        try {
            const userIdentities = await prisma.$queryRaw<Array<{ id: string; identityNumber: string | null }>>`
                SELECT id, "identityNumber" FROM "User"
            `;
            identityMap = new Map(userIdentities.map((u) => [u.id, u.identityNumber]));
        } catch (idErr) {
            console.warn("[AdminFarmingAPI] Error querying user identities:", idErr);
        }

        const rows = farms.map((farm) => {
            const latestLogDate = farm.farmingLogs?.[0]?.actionDate ?? null;
            // Explicitly labelled mock display data; never replace login phone numbers.
            const demoKey = createHash('sha256').update(farm.farmer?.id || farm.id).digest('hex').slice(0, 8).toUpperCase();
            const phone = farm.farmer?.phone?.startsWith("DEMO-REGION-") ? "" : farm.farmer?.phone?.trim() || "";
            const identity = (farm.farmer?.id ? identityMap.get(farm.farmer.id) : null)?.trim();
            return {
                id: farm.id,
                farmCode: farm.farmCode || "PUC-CHUA-CAP",
                farmName: farm.farmName || "Vườn chưa đặt tên",
                ownerName: farm.farmer?.fullName ?? farm.farmer?.phone ?? "Chưa rõ",
                ownerId: farm.farmer?.id ?? "",
                ownerAddress: farm.farmer?.address || [farm.farmer?.ward, farm.farmer?.district, farm.farmer?.province].filter(Boolean).join(", "),
                ownerPhone: phone || `DEMO-SDT-${demoKey}`,
                identityNumber: identity || `DEMO-CCCD-${demoKey}`,
                regionName: farm.region?.name || farm.growingRegion || "",
                regionAddress: farm.region?.address || (farm.region ? [farm.region.ward, farm.region.district, farm.region.province].filter(Boolean).join(", ") : farm.address) || "",
                latitude: farm.latitude != null ? Number(farm.latitude.toFixed(6)) : (farm.centerLatitude != null ? Number(farm.centerLatitude.toFixed(6)) : null),
                longitude: farm.longitude != null ? Number(farm.longitude.toFixed(6)) : (farm.centerLongitude != null ? Number(farm.centerLongitude.toFixed(6)) : null),
                growingRegion: farm.growingRegion ?? "Chưa phân vùng",
                growingRegionId: farm.growingRegionId,
                address: farm.address ?? "",
                areaSize: (Number(farm.areaSize) || 0) / (farm.areaUnit === "SQUARE_METER" ? 10000 : 1),
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
            region,
            regions,
            householdCount: new Set(rows.map(row => row.ownerId)).size,
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
