import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";
import { getWeatherSession } from "@/lib/weather-scope";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getWeatherSession();
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });

    if (session.user.role === "FARMER") {
        const farms = await prisma.farm.findMany({
            where: { farmerId: session.user.id, isActive: true },
            orderBy: { farmName: "asc" },
            select: { id: true, farmCode: true, farmName: true, latitude: true, longitude: true, address: true, durianVariety: true, region: { select: { id: true, code: true, name: true } } },
        });
        return NextResponse.json({ success: true, role: "FARMER", farms });
    }

    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    if (!scope?.regions.length) return NextResponse.json({ success: false, message: "Tài khoản chưa được phân công vùng trồng." }, { status: 403 });
    const regions = await prisma.growingRegion.findMany({
        where: { id: { in: scope.regions.map((region) => region.id) }, isActive: true },
        orderBy: { name: "asc" },
        select: {
            id: true, code: true, name: true, province: true, district: true, ward: true,
            farms: {
                where: { isActive: true, farmer: { deletedAt: null, isApproved: true } },
                select: { id: true, farmCode: true, farmName: true, latitude: true, longitude: true, address: true, durianVariety: true },
                orderBy: { farmName: "asc" },
            },
        },
    });
    return NextResponse.json({ success: true, role: "AREA_MANAGER", regions });
}
