import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { HarvestStatus } from "@prisma/client";

const transitions: Record<string, Record<string, string[]>> = { COLLECTOR: { CONFIRM: ["WAITING_CONFIRMATION"], REJECT: ["WAITING_CONFIRMATION"], RECEIVE: ["DELIVERY_CONFIRMED", "HARVESTED"] }, PROCESSING_FACILITY: { CONFIRM: ["WAITING_CONFIRMATION"], REJECT: ["WAITING_CONFIRMATION"], RECEIVE: ["DELIVERY_CONFIRMED", "HARVESTED"] }, FARMER: { START: ["CONFIRMED", "DRAFT"], FINISH: ["HARVESTING"], DELIVER: ["HARVESTED"] } };
const targets: Record<string,string> = { CONFIRM: "CONFIRMED", REJECT: "REJECTED", START: "HARVESTING", FINISH: "HARVESTED", DELIVER: "DELIVERY_CONFIRMED", RECEIVE: "COMPLETED" };

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions); if (!session?.user?.id) return NextResponse.json({ success: false }, { status: 401 }); const body = await request.json(); const action = String(body.action || "");
    const record = await prisma.harvestRecord.findUnique({ where: { id: params.id }, include: { farm: true } }); if (!record) return NextResponse.json({ success: false }, { status: 404 });
    const owns = session.user.role === "FARMER" ? record.farmerId === session.user.id : record.buyerUserId === session.user.id; if (!owns) return NextResponse.json({ success: false }, { status: 403 });
    if (!transitions[session.user.role]?.[action]?.includes(record.status)) return NextResponse.json({ success: false, message: "Chuyển trạng thái không hợp lệ." }, { status: 400 });
    const target = targets[action] as HarvestStatus; const actualWeight = body.actualWeight ? Number(body.actualWeight) : undefined; const receivedWeight = body.receivedWeight ? Number(body.receivedWeight) : undefined;
    if (action === "FINISH" && (!actualWeight || actualWeight <= 0)) return NextResponse.json({ success: false, message: "Nhập khối lượng thu hoạch thực tế." }, { status: 400 });
    const updated = await prisma.$transaction(async tx => {
        const item = await tx.harvestRecord.update({ where: { id: record.id }, data: { status: target, rejectionReason: action === "REJECT" ? String(body.reason || "") : undefined, actualStartedAt: action === "START" ? new Date() : undefined, actualHarvestedAt: action === "FINISH" ? new Date() : undefined, actualTreeCount: body.actualTreeCount ? Number(body.actualTreeCount) : undefined, actualFruitCount: body.actualFruitCount ? Number(body.actualFruitCount) : undefined, actualWeight, actualNote: body.note, farmerDeliveredAt: action === "DELIVER" ? new Date() : undefined, deliveredWeight: action === "DELIVER" ? Number(body.deliveredWeight || record.actualWeight) : undefined, buyerReceivedAt: action === "RECEIVE" ? new Date() : undefined, receivedWeight, weightDifferenceReason: body.weightDifferenceReason, completedAt: action === "RECEIVE" ? new Date() : undefined } });
        await tx.harvestStatusHistory.create({ data: { harvestId: record.id, actorId: session.user.id, fromStatus: record.status, toStatus: target, note: body.reason || body.note } });
        if (action === "RECEIVE" && !await tx.farmingLog.findUnique({ where: { harvestRecordId: record.id } })) await tx.farmingLog.create({ data: { farmId: record.farmId, stage: "HARVEST", activityType: "HARVEST", actionDate: record.actualHarvestedAt || new Date(), notes: `Khối lượng: ${receivedWeight || record.deliveredWeight || record.actualWeight} kg\nPhiếu: ${record.code}`, harvestRecordId: record.id } });
        return item;
    });
    const notifyId = session.user.role === "FARMER" ? record.buyerUserId : record.farmerId; if (notifyId) await prisma.notification.create({ data: { userId: notifyId, type: "HARVEST_STATUS", title: `Phiếu ${record.code} đã cập nhật`, message: `Trạng thái mới: ${target}` } });
    return NextResponse.json({ success: true, data: updated });
}
