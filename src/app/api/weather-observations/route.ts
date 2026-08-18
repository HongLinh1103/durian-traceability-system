import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { observationData } from "@/lib/weather-observation-data";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "FARMER") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }
        const url = new URL(request.url);
        const farmId = url.searchParams.get("farmId") || undefined;
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const search = url.searchParams.get("search")?.trim();

        let observedAtFilter: { gte?: Date; lte?: Date } | undefined = undefined;
        if (from || to) {
            const dateObj: { gte?: Date; lte?: Date } = {};
            if (from && from.trim()) {
                const parsedFrom = new Date(`${from.trim()}T00:00:00`);
                if (!isNaN(parsedFrom.getTime())) {
                    dateObj.gte = parsedFrom;
                }
            }
            if (to && to.trim()) {
                const parsedTo = new Date(`${to.trim()}T23:59:59.999`);
                if (!isNaN(parsedTo.getTime())) {
                    dateObj.lte = parsedTo;
                }
            }
            if (dateObj.gte || dateObj.lte) {
                observedAtFilter = dateObj;
            }
        }

        const data = await prisma.weatherObservation.findMany({
            where: {
                farmerId: session.user.id,
                deletedAt: null,
                ...(farmId ? { farmId } : {}),
                ...(observedAtFilter ? { observedAt: observedAtFilter } : {}),
                ...(search ? { note: { contains: search, mode: "insensitive" } } : {}),
            },
            include: { farm: { select: { farmName: true, farmCode: true } } },
            orderBy: { observedAt: "desc" },
            take: 200,
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/weather-observations error:", error);
        return NextResponse.json({ success: false, data: [], message: error instanceof Error ? error.message : "Lỗi tải dữ liệu thời tiết." }, { status: 500 });
    }
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
