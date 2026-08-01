import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "ADMIN";
}

export async function GET(_request: Request, { params }: { params: { farmId: string } }) {
    if (!(await isAdmin())) {
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
    if (!(await isAdmin())) {
        return NextResponse.json({ success: false, message: "Không có quyền cập nhật." }, { status: 403 });
    }
    const body = (await request.json()) as { isActive?: boolean };
    if (typeof body.isActive !== "boolean") {
        return NextResponse.json({ success: false, message: "Trạng thái không hợp lệ." }, { status: 400 });
    }
    const farm = await prisma.farm.update({ where: { id: params.farmId }, data: { isActive: body.isActive } });
    return NextResponse.json({ success: true, data: farm });
}

export async function POST(request: Request, { params }: { params: { farmId: string } }) {
    if (!(await isAdmin())) {
        return NextResponse.json({ success: false, message: "Không có quyền gửi nhắc nhở." }, { status: 403 });
    }
    const body = (await request.json()) as { message?: string; daysOverdue?: number };
    const message = body.message?.trim();
    if (!message) {
        return NextResponse.json({ success: false, message: "Nội dung thông báo không được để trống." }, { status: 400 });
    }
    const farm = await prisma.farm.findUnique({
        where: { id: params.farmId },
        select: { farmName: true, farmerId: true },
    });
    if (!farm) return NextResponse.json({ success: false, message: "Không tìm thấy vườn." }, { status: 404 });

    await prisma.notification.create({
        data: {
            userId: farm.farmerId,
            title: "Nhắc nhở cập nhật nhật ký canh tác",
            message,
            type: "FARMING_LOG_REMINDER",
        },
    });
    return NextResponse.json({ success: true, message: `Đã gửi nhắc nhở cho ${farm.farmName}.` });
}
