import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScopedRegion, getWeatherSession } from "@/lib/weather-scope";

export async function POST(request: Request) {
    const session = await getWeatherSession();
    if (!session || session.user.role !== "AREA_MANAGER") return NextResponse.json({ success: false, message: "Không có quyền gửi thông báo." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { regionId?: string; farmIds?: string[]; message?: string; confirmed?: boolean };
    if (!body.confirmed) return NextResponse.json({ success: false, message: "Bạn cần xem và xác nhận nội dung trước khi gửi." }, { status: 400 });
    const message = body.message?.trim() ?? "";
    const farmIds = [...new Set(Array.isArray(body.farmIds) ? body.farmIds.filter((id): id is string => typeof id === "string") : [])];
    if (!body.regionId || !farmIds.length || message.length < 10 || message.length > 1000) return NextResponse.json({ success: false, message: "Hãy chọn vườn và nhập nội dung từ 10–1000 ký tự." }, { status: 400 });
    const region = await getScopedRegion(session.user.id, session.user.role, body.regionId);
    if (!region) return NextResponse.json({ success: false, message: "Không có quyền với vùng này." }, { status: 403 });
    const selected = region.farms.filter((farm) => farmIds.includes(farm.id));
    if (selected.length !== farmIds.length) return NextResponse.json({ success: false, message: "Danh sách vườn có phần tử ngoài phạm vi quản lý." }, { status: 403 });
    const farmerIds = [...new Set(selected.map((farm) => farm.farmerId))];
    await prisma.notification.createMany({ data: farmerIds.map((userId) => ({ userId, title: "Cảnh báo thời tiết vùng trồng", message, type: `WEATHER_ALERT:${region.id}` })) });
    return NextResponse.json({ success: true, recipients: farmerIds.length });
}
