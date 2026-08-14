import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { observationData } from "@/lib/weather-observation-data";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const url = new URL(request.url);
    const farmId = url.searchParams.get("farmId") || undefined;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const search = url.searchParams.get("search")?.trim();
    const data = await prisma.weatherObservation.findMany({
        where: { farmerId: session.user.id, deletedAt: null, ...(farmId ? { farmId } : {}), ...(from || to ? { observedAt: { ...(from ? { gte: new Date(`${from}T00:00:00+07:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59+07:00`) } : {}) } } : {}), ...(search ? { note: { contains: search, mode: "insensitive" } } : {}) },
        include: { farm: { select: { farmName: true, farmCode: true } } }, orderBy: { observedAt: "desc" }, take: 200,
    });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    try {
        const data = await observationData(request, session.user.id);
        const created = await prisma.weatherObservation.create({ data, include: { farm: { select: { farmName: true, farmCode: true } } } });
        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Không thể lưu nhật ký thời tiết." }, { status: 400 }); }
}
