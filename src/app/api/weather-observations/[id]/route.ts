import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { observationData } from "@/lib/weather-observation-data";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false }, { status: 403 });
    const owned = await prisma.weatherObservation.findFirst({ where: { id: params.id, farmerId: session.user.id, deletedAt: null } });
    if (!owned) return NextResponse.json({ success: false, message: "Không tìm thấy bản ghi." }, { status: 404 });
    try { const data = await observationData(request, session.user.id, owned.observedAt); const updated = await prisma.weatherObservation.update({ where: { id: owned.id }, data, include: { farm: { select: { farmName: true, farmCode: true } } } }); return NextResponse.json({ success: true, data: updated }); }
    catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Không thể cập nhật." }, { status: 400 }); }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false }, { status: 403 });
    const result = await prisma.weatherObservation.updateMany({ where: { id: params.id, farmerId: session.user.id, deletedAt: null }, data: { deletedAt: new Date() } });
    if (!result.count) return NextResponse.json({ success: false, message: "Không tìm thấy bản ghi." }, { status: 404 });
    return NextResponse.json({ success: true });
}
