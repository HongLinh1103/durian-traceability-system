import { randomBytes } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ commercialLotId: z.string().min(1), weight: z.coerce.number().positive() });

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["FARMER", "COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role)) return NextResponse.json({ success: false, error: "Không có quyền xuất hàng" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Khối lượng giao không hợp lệ" }, { status: 400 });
    const lot = await prisma.commercialLot.findUnique({ where: { id: parsed.data.commercialLotId }, include: { owner: true, traceabilityCode: true, destination: true } });
    if (!lot || !lot.destinationId) return NextResponse.json({ success: false, error: "Lô hoặc điểm đến không tồn tại" }, { status: 404 });
    const destinationId = lot.destinationId;
    const owns = lot.ownerType === "FARMER" ? lot.farmerOwnerId === session.user.id && session.user.role === "FARMER" : lot.owner?.ownerId === session.user.id && lot.ownerType === session.user.role;
    if (!owns) return NextResponse.json({ success: false, error: "Bạn không sở hữu lô này" }, { status: 403 });
    if (lot.traceabilityCode?.status !== "ACTIVE") return NextResponse.json({ success: false, error: "QR phải đang hoạt động trước khi xuất hàng" }, { status: 400 });
    if (parsed.data.weight > Number(lot.remainingQuantity)) return NextResponse.json({ success: false, error: "Khối lượng giao vượt lượng còn lại của lô" }, { status: 400 });
    const now = new Date();
    const senderType = session.user.role === "FARMER" ? "FARMER" : session.user.role === "COLLECTOR" ? "COLLECTOR" : "PROCESSING_FACILITY";
    const result = await prisma.$transaction(async tx => {
        const reserved = await tx.commercialLot.updateMany({ where: { id: lot.id, remainingQuantity: { gte: parsed.data.weight } }, data: { remainingQuantity: { decrement: parsed.data.weight }, status: "DISPATCHED" } });
        if (reserved.count !== 1) throw new Error("Lô vừa được giao bởi thao tác khác; vui lòng tải lại");
        const shipment = await tx.shipment.create({ data: { shipmentCode: `SHP-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`, senderType, senderId: lot.ownerId ?? undefined, farmerSenderId: lot.farmerOwnerId ?? undefined, destinationId, dispatchAt: now, dispatchedWeight: parsed.data.weight, status: "DISPATCHED" } });
        await tx.shipmentItem.create({ data: { shipmentId: shipment.id, commercialLotId: lot.id, quantity: parsed.data.weight, weight: parsed.data.weight } });
        await tx.traceEvent.create({ data: { commercialLotId: lot.id, entityType: "SHIPMENT", entityId: shipment.id, eventType: lot.ownerType === "FARMER" ? "DIRECT_RETAIL_DISPATCHED" : lot.destination?.type === "EXPORT" ? "EXPORT_DISPATCHED" : "SHIPMENT_DISPATCHED", eventTime: now, actorId: session.user.id, actorRole: session.user.role, title: lot.ownerType === "FARMER" ? "Đã xuất bán trực tiếp" : "Đã xuất hàng đến điểm đến", description: lot.destination?.name, locationText: lot.destination?.address, metadata: { sourceActor: lot.ownerType, destinationType: lot.destination?.type }, isPublic: true } });
        return shipment;
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
}
