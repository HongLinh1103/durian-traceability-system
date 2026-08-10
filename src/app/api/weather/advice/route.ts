import { NextResponse } from "next/server";
import { getFarmerAdviceFarm, getScopedRegion, getWeatherSession } from "@/lib/weather-scope";
import { getWeather, weatherStatus } from "@/lib/weather";
import { generateWeatherAdvice } from "@/lib/weather-ai";

export async function POST(request: Request) {
    const session = await getWeatherSession();
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { farmId?: string; regionId?: string };
    try {
        if (session.user.role === "FARMER") {
            const farm = await getFarmerAdviceFarm(session.user.id);
            if (!farm) return NextResponse.json({ success: false, message: "Tài khoản chưa có vườn đang hoạt động để tạo gợi ý." }, { status: 422 });
            if (farm.latitude == null || farm.longitude == null) return NextResponse.json({ success: false, message: "Vườn chưa có tọa độ." }, { status: 422 });
            const weather = await getWeather(farm.latitude, farm.longitude);
            const latest = farm.farmingLogs[0];
            const result = await generateWeatherAdvice({
                cacheKey: `farm:${farm.id}:${weather.fetchedAt}`,
                regional: false,
                weather,
                farm: { farmName: farm.farmName, durianVariety: farm.durianVariety, areaSize: farm.areaSize, latestStage: latest?.stage ?? null, recentLogs: farm.farmingLogs.map((log) => ({ stage: log.stage, activityType: log.activityType, actionDate: log.actionDate, notes: log.notes })) },
            });
            return NextResponse.json({ success: true, ...result });
        }

        if (!body.regionId) return NextResponse.json({ success: false, message: "Hãy chọn vùng trồng." }, { status: 400 });
        const region = await getScopedRegion(session.user.id, session.user.role, body.regionId);
        if (!region) return NextResponse.json({ success: false, message: "Không có quyền xem vùng này." }, { status: 403 });
        const located = region.farms.filter((farm) => farm.latitude != null && farm.longitude != null);
        if (!located.length) return NextResponse.json({ success: false, message: "Vùng chưa có vườn với tọa độ hợp lệ." }, { status: 422 });
        const center = { latitude: located.reduce((sum, farm) => sum + farm.latitude!, 0) / located.length, longitude: located.reduce((sum, farm) => sum + farm.longitude!, 0) / located.length };
        const [weather, samples] = await Promise.all([
            getWeather(center.latitude, center.longitude),
            Promise.all(located.map(async (farm) => { const value = await getWeather(farm.latitude!, farm.longitude!); return { farmName: farm.farmName, status: weatherStatus(value), temperature: value.current.temperature, rainProbability: value.current.precipitationProbability, windSpeed: value.current.windSpeed }; })),
        ]);
        const result = await generateWeatherAdvice({ cacheKey: `region:${region.id}:${weather.fetchedAt}`, regional: true, weather, regionalSummary: samples });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Không thể tạo gợi ý AI." }, { status: 502 });
    }
}
