import { GardenStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";

const schema = z.object({ action: z.enum(["WARN", "REQUEST_LOG_UPDATE", "REQUEST_LOG_CORRECTION", "MARK_INSPECTION", "SUSPEND", "ACTIVATE"]), reason: z.string().trim().min(3).max(500) });
const statusByAction: Partial<Record<z.infer<typeof schema>["action"], GardenStatus>> = { MARK_INSPECTION: "NEEDS_INSPECTION", SUSPEND: "SUSPENDED", ACTIVATE: "ACTIVE" };

export async function PATCH(request: Request, { params }: { params: { gardenId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "AREA_MANAGER") return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!scope || !parsed.success) return NextResponse.json({ success: false, message: "Dữ liệu xử lý không hợp lệ." }, { status: 400 });
    const farm = await prisma.farm.findFirst({ where: { id: params.gardenId, growingRegionId: { in: scope.ids } }, select: { id: true, farmName: true, farmerId: true, status: true } });
    if (!farm) return NextResponse.json({ success: false, message: "Vườn không thuộc vùng được phân công." }, { status: 404 });
    const nextStatus = statusByAction[parsed.data.action];
    await prisma.$transaction(async tx => {
        if (nextStatus) await tx.farm.update({ where: { id: farm.id }, data: { status: nextStatus, isActive: nextStatus === "ACTIVE", statusReason: parsed.data.reason, statusChangedAt: new Date() } });
        await tx.gardenStatusHistory.create({ data: { farmId: farm.id, actorId: session.user.id, fromStatus: farm.status, toStatus: nextStatus ?? farm.status, reason: `${parsed.data.action}: ${parsed.data.reason}` } });
        await tx.notification.create({ data: { userId: farm.farmerId, title: parsed.data.action === "SUSPEND" ? "Vườn đã bị tạm dừng" : "Thông báo từ Trưởng ban vùng trồng", message: `${farm.farmName}: ${parsed.data.reason}`, type: `GARDEN_${parsed.data.action}` } });
    });
    return NextResponse.json({ success: true, message: "Đã ghi nhận xử lý vườn." });
}
