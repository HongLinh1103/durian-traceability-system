import { NextResponse } from "next/server";
import { getScopedFarm, getScopedRegion, getWeatherSession } from "@/lib/weather-scope";
import { getWeather, weatherStatus } from "@/lib/weather";

export const dynamic = "force-dynamic";

function coordinate(value: string | null) {
    if (value === null || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
    const session = await getWeatherSession();
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const url = new URL(request.url);
    const farmId = url.searchParams.get("farmId");
    const regionId = url.searchParams.get("regionId");

    try {
        if (regionId) {
            const region = await getScopedRegion(session.user.id, session.user.role, regionId);
            if (!region) return NextResponse.json({ success: false, message: "Không có quyền xem vùng trồng này." }, { status: 403 });
            const farmsWithCoordinates = region.farms.filter((farm) => farm.latitude != null && farm.longitude != null);
            const results = await Promise.allSettled(farmsWithCoordinates.map(async (farm) => {
                const weather = await getWeather(farm.latitude!, farm.longitude!);
                const { farmingLogs, ...farmData } = farm;
                return {
                    ...farmData,
                    currentStage: farmingLogs[0]?.stage ?? null,
                    stageUpdatedAt: farmingLogs[0]?.actionDate ?? null,
                    weather,
                    status: weatherStatus(weather),
                };
            }));
            const farms = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
            const center = farmsWithCoordinates.length ? {
                latitude: farmsWithCoordinates.reduce((sum, farm) => sum + farm.latitude!, 0) / farmsWithCoordinates.length,
                longitude: farmsWithCoordinates.reduce((sum, farm) => sum + farm.longitude!, 0) / farmsWithCoordinates.length,
            } : null;
            const forecast = center ? await getWeather(center.latitude, center.longitude) : null;
            return NextResponse.json({ success: true, mode: "region", region: { id: region.id, code: region.code, name: region.name }, totalFarms: region.farms.length, farms, missingCoordinates: region.farms.length - farmsWithCoordinates.length, forecast });
        }

        if (farmId) {
            const farm = await getScopedFarm(session.user.id, session.user.role, farmId);
            if (!farm) return NextResponse.json({ success: false, message: "Không có quyền xem vườn này." }, { status: 403 });
            if (farm.latitude == null || farm.longitude == null) return NextResponse.json({ success: false, code: "MISSING_COORDINATES", message: "Vườn chưa có tọa độ để lấy thời tiết." }, { status: 422 });
            const weather = await getWeather(farm.latitude, farm.longitude);
            return NextResponse.json({ success: true, mode: "farm", farm: { id: farm.id, farmCode: farm.farmCode, farmName: farm.farmName, address: farm.address, durianVariety: farm.durianVariety, region: farm.region }, weather });
        }

        if (session.user.role !== "FARMER") return NextResponse.json({ success: false, message: "Trưởng ban cần chọn vùng hoặc vườn." }, { status: 400 });
        const latitude = coordinate(url.searchParams.get("latitude"));
        const longitude = coordinate(url.searchParams.get("longitude"));
        if (latitude === null || longitude === null) return NextResponse.json({ success: false, message: "Thiếu tọa độ vị trí hiện tại." }, { status: 400 });
        const weather = await getWeather(latitude, longitude);
        return NextResponse.json({ success: true, mode: "gps", weather });
    } catch (error) {
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Không thể tải dữ liệu thời tiết." }, { status: 502 });
    }
}
