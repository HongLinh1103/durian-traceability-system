import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";
import { completedMissingLogDays } from "@/lib/log-schedule";

export async function POST(_: Request, { params }: { params: { gardenId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    if (!scope) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });

    const garden = await prisma.farm.findFirst({
        where: {
            id: params.gardenId,
            isActive: true,
            region: { code: { in: scope.codes } },
            farmer: { accountStatus: "APPROVED", isApproved: true, deletedAt: null },
        },
        select: {
            farmCode: true,
            farmName: true,
            createdAt: true,
            farmerId: true,
            farmer: { select: { approvedAt: true } },
            farmingLogs: { orderBy: { actionDate: "desc" }, take: 1, select: { actionDate: true } },
        },
    });
    if (!garden) return NextResponse.json({ success: false, message: "Vườn không thuộc phạm vi phụ trách." }, { status: 404 });

    const latest = garden.farmingLogs[0]?.actionDate ?? null;
    const days = completedMissingLogDays(latest ?? garden.farmer.approvedAt ?? garden.createdAt);
    if (days < 1) {
        return NextResponse.json({ success: false, message: "Vườn chưa trễ nhật ký nên không cần gửi nhắc nhở." }, { status: 409 });
    }
    await prisma.notification.create({
        data: {
            userId: garden.farmerId,
            title: `Nhắc cập nhật nhật ký ${garden.farmCode}`,
            message: `Vườn ${garden.farmName} đang thiếu nhật ký ${days} ngày. Vui lòng bổ sung nhật ký canh tác.`,
            type: "FARMING_LOG_REMINDER",
        },
    });
    return NextResponse.json({ success: true, message: `Đã gửi thông báo trong ứng dụng đến chủ vườn ${garden.farmName}.` });
}
