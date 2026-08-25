import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { HarvestStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const transitions: Record<string, Record<string, string[]>> = {
    COLLECTOR: { CONFIRM: ["WAITING_CONFIRMATION"], REJECT: ["WAITING_CONFIRMATION"], RECEIVE: ["DELIVERY_CONFIRMED", "HARVESTED"] },
    PROCESSING_FACILITY: { CONFIRM: ["WAITING_CONFIRMATION"], REJECT: ["WAITING_CONFIRMATION"], RECEIVE: ["DELIVERY_CONFIRMED"] },
    FARMER: { START: ["CONFIRMED", "DRAFT"], FINISH: ["HARVESTING"], DELIVER: ["HARVESTED"] },
};
const targets: Record<string, HarvestStatus> = { CONFIRM: "CONFIRMED", REJECT: "REJECTED", START: "HARVESTING", FINISH: "HARVESTED", DELIVER: "DELIVERY_CONFIRMED", RECEIVE: "COMPLETED" };

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false }, { status: 401 });
    const body = await request.json();
    const action = String(body.action || "");
    const record = await prisma.harvestRecord.findUnique({ where: { id: params.id }, include: { farm: true, harvestLot: true } });
    if (!record) return NextResponse.json({ success: false }, { status: 404 });
    const owns = session.user.role === "FARMER" ? record.farmerId === session.user.id : record.buyerUserId === session.user.id;
    if (!owns) return NextResponse.json({ success: false }, { status: 403 });
    if (!transitions[session.user.role]?.[action]?.includes(record.status)) return NextResponse.json({ success: false, message: "Chuyển trạng thái không hợp lệ." }, { status: 400 });

    const actualWeight = body.actualWeight === undefined ? undefined : Number(body.actualWeight);
    const deliveredWeight = body.deliveredWeight === undefined ? Number(record.actualWeight ?? 0) : Number(body.deliveredWeight);
    const receivedWeight = body.receivedWeight === undefined ? undefined : Number(body.receivedWeight);
    const rejectedWeight = body.rejectedWeight === undefined ? 0 : Number(body.rejectedWeight);
    if (action === "FINISH" && (!actualWeight || actualWeight <= 0)) return NextResponse.json({ success: false, message: "Nhập khối lượng thu hoạch thực tế." }, { status: 400 });
    if (action === "DELIVER" && deliveredWeight <= 0) return NextResponse.json({ success: false, message: "Khối lượng giao phải lớn hơn 0." }, { status: 400 });
    if (action === "RECEIVE" && (!receivedWeight || receivedWeight <= 0 || rejectedWeight < 0)) return NextResponse.json({ success: false, message: "Khối lượng thực nhận không hợp lệ." }, { status: 400 });
    const dispatched = Number(record.deliveredWeight ?? record.actualWeight ?? 0);
    if (action === "RECEIVE" && receivedWeight! + rejectedWeight > dispatched) return NextResponse.json({ success: false, message: "Tổng khối lượng nhận và từ chối không được vượt quá khối lượng nông dân giao." }, { status: 400 });
    const receivedAt = body.receivedAt ? new Date(body.receivedAt) : new Date();
    if (Number.isNaN(receivedAt.getTime())) return NextResponse.json({ success: false, message: "Ngày nhận không hợp lệ." }, { status: 400 });

    const target = targets[action];
    const updated = await prisma.$transaction(async (tx) => {
        const item = await tx.harvestRecord.update({ where: { id: record.id }, data: {
            status: target, rejectionReason: action === "REJECT" ? String(body.reason || "") : undefined,
            actualStartedAt: action === "START" ? new Date() : undefined, actualHarvestedAt: action === "FINISH" ? new Date() : undefined,
            actualTreeCount: body.actualTreeCount ? Number(body.actualTreeCount) : undefined, actualFruitCount: body.actualFruitCount ? Number(body.actualFruitCount) : undefined,
            actualWeight, actualNote: body.note, farmerDeliveredAt: action === "DELIVER" ? new Date() : undefined,
            deliveredWeight: action === "DELIVER" ? deliveredWeight : undefined, buyerReceivedAt: action === "RECEIVE" ? receivedAt : undefined,
            receivedWeight: action === "RECEIVE" ? receivedWeight : undefined, weightDifferenceReason: action === "RECEIVE" ? String(body.weightDifferenceReason || "") : undefined,
            completedAt: action === "RECEIVE" ? receivedAt : undefined,
        } });
        await tx.harvestStatusHistory.create({ data: { harvestId: record.id, actorId: session.user.id, fromStatus: record.status, toStatus: target, note: body.reason || body.note } });

        let harvestLot = record.harvestLot;
        if (["FINISH", "DELIVER", "RECEIVE"].includes(action)) {
            if (!record.cropSeasonId) throw new Error("Phiếu thu hoạch chưa liên kết vụ mùa.");
            const lotWeight = action === "FINISH" ? actualWeight! : Number(record.actualWeight ?? deliveredWeight);
            harvestLot = await tx.harvestLot.upsert({ where: { harvestRecordId: record.id }, update: {
                weight: lotWeight, remainingWeight: action === "RECEIVE" ? Math.max(0, lotWeight - receivedWeight! - rejectedWeight) : lotWeight,
                status: action === "FINISH" ? "FINALIZED" : action === "DELIVER" ? "DISPATCHED" : "USED", finalizedAt: action === "FINISH" ? new Date() : undefined,
            }, create: {
                lotCode: `HL-${record.code}`, harvestRecordId: record.id, farmId: record.farmId, cropSeasonId: record.cropSeasonId,
                harvestedAt: record.actualHarvestedAt ?? new Date(), weight: lotWeight,
                remainingWeight: action === "RECEIVE" ? Math.max(0, lotWeight - receivedWeight! - rejectedWeight) : lotWeight,
                complianceStatus: "WARNING", complianceDetails: { pendingComplianceReview: true },
                status: action === "FINISH" ? "FINALIZED" : action === "DELIVER" ? "DISPATCHED" : "USED", finalizedAt: new Date(),
            } });
        }

        if (action === "RECEIVE" && session.user.role === "PROCESSING_FACILITY") {
            const acceptedWeight = receivedWeight!;
            const facility = await tx.partnerFacility.findFirst({ where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null } });
            if (!facility || !harvestLot) throw new Error("Không tìm thấy cơ sở chế biến hoặc lô thu hoạch nguồn.");
            const note = [`Nông dân giao: ${dispatched} kg`, `Thực nhận: ${receivedWeight} kg`, `Từ chối: ${rejectedWeight} kg`, body.receiverName ? `Người nhận: ${String(body.receiverName)}` : "", body.weightDifferenceReason ? `Lý do chênh lệch: ${String(body.weightDifferenceReason)}` : "", body.note ? `Ghi chú: ${String(body.note)}` : ""].filter(Boolean).join("\n");
            const receipt = await tx.rawMaterialReceipt.upsert({ where: { receiptCode: `RMR-${record.code}` }, update: {
                dispatchedWeight: dispatched, receivedWeight: acceptedWeight, receivedAt, receivedById: session.user.id, status: "QC_PENDING", note,
            }, create: {
                receiptCode: `RMR-${record.code}`, sourceType: "HARVEST_LOT", sourceHarvestLotId: harvestLot.id, facilityId: facility.id,
                dispatchedWeight: dispatched, receivedWeight: acceptedWeight, receivedAt, receivedById: session.user.id, status: "QC_PENDING", note,
            } });
            await tx.rawMaterialLot.upsert({ where: { rawMaterialReceiptId: receipt.id }, update: {
                acceptedWeight, currentWeight: acceptedWeight, warehouseLocation: body.warehouseLocation || undefined, status: "PENDING_QC",
            }, create: {
                lotCode: `RM-${record.code}`, facilityId: facility.id, rawMaterialReceiptId: receipt.id, acceptedWeight, currentWeight: acceptedWeight, warehouseLocation: body.warehouseLocation || null, status: "PENDING_QC",
            } });
        }

        if (action === "RECEIVE" && !await tx.farmingLog.findUnique({ where: { harvestRecordId: record.id } })) await tx.farmingLog.create({ data: {
            farmId: record.farmId, cropSeasonId: record.cropSeasonId, stage: "HARVEST", activityType: "HARVEST", actionDate: record.actualHarvestedAt || new Date(),
            notes: `Khối lượng: ${receivedWeight || record.deliveredWeight || record.actualWeight} kg\nPhiếu: ${record.code}`, harvestRecordId: record.id,
        } });
        return item;
    });

    const notifyId = session.user.role === "FARMER" ? record.buyerUserId : record.farmerId;
    if (notifyId) await prisma.notification.create({ data: { userId: notifyId, type: "HARVEST_STATUS", title: `Phiếu ${record.code} đã cập nhật`, message: `Trạng thái mới: ${target}` } }).catch(() => undefined);
    return NextResponse.json({ success: true, data: updated });
}
