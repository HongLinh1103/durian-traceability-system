import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function adminSession() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "ADMIN" ? session : null;
}

export async function GET(_request: Request, { params }: { params: { farmId: string } }) {
    if (!(await adminSession())) {
        return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    }

    const farm = await prisma.farm.findUnique({
        where: { id: params.farmId },
        select: {
            id: true,
            farmCode: true,
            farmName: true,
            areaSize: true,
            areaUnit: true,
            totalTrees: true,
            durianVariety: true,
            address: true,
            province: true,
            district: true,
            ward: true,
            latitude: true,
            longitude: true,
            notes: true,
            growingRegion: true,
            isActive: true,
            isInSeason: true,
            createdAt: true,
            updatedAt: true,
            farmer: {
                select: {
                    fullName: true,
                    phone: true,
                    email: true,
                    address: true,
                    province: true,
                    district: true,
                    ward: true,
                    accountStatus: true,
                },
            },
            region: {
                select: {
                    code: true,
                    name: true,
                    province: true,
                    district: true,
                    ward: true,
                },
            },
            farmingLogs: {
                orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
                select: {
                    id: true,
                    actionDate: true,
                    stage: true,
                    activityType: true,
                    chemicalName: true,
                    dosage: true,
                    phiDays: true,
                    isGACCCompliant: true,
                    notes: true,
                    createdAt: true,
                },
            },
        },
    });

    if (!farm) return NextResponse.json({ success: false, message: "Không tìm thấy vườn." }, { status: 404 });
    return NextResponse.json({ success: true, data: farm });
}

export async function PATCH(request: Request, { params }: { params: { farmId: string } }) {
    const session = await adminSession();
    if (!session) {
        return NextResponse.json({ success: false, message: "Không có quyền cập nhật." }, { status: 403 });
    }
    const body = (await request.json()) as { isActive?: boolean; reason?: string };
    if (typeof body.isActive !== "boolean" || !body.reason?.trim()) {
        return NextResponse.json({ success: false, message: "Trạng thái không hợp lệ." }, { status: 400 });
    }
    const current = await prisma.farm.findUnique({ where: { id: params.farmId }, select: { status: true } });
    if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy vườn." }, { status: 404 });
    const nextStatus = body.isActive ? "ACTIVE" : "SUSPENDED";
    const farm = await prisma.$transaction(async tx => {
        const updated = await tx.farm.update({ where: { id: params.farmId }, data: { isActive: body.isActive, status: nextStatus, statusReason: body.reason!.trim(), statusChangedAt: new Date() } });
        await tx.gardenStatusHistory.create({ data: { farmId: params.farmId, actorId: session.user.id, fromStatus: current.status, toStatus: nextStatus, reason: `ADMIN_OVERRIDE: ${body.reason!.trim()}` } });
        return updated;
    });
    return NextResponse.json({ success: true, data: farm });
}
