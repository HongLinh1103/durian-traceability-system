import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/store-marketplace";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const session = await requireRole(["FARMER"]);
    if (!session) return NextResponse.json({ success: false }, { status: 403 });
    const data = await prisma.order.findFirst({ where: { id: params.id, farmerId: session.user.id, deletedAt: null }, include: { items: true, store: true, histories: { orderBy: { createdAt: "asc" } } } });
    return data ? NextResponse.json({ success: true, data }) : NextResponse.json({ success: false }, { status: 404 });
}

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
    const session = await requireRole(["FARMER"]);
    if (!session) return NextResponse.json({ success: false }, { status: 403 });
    const order = await prisma.order.findFirst({ where: { id: params.id, farmerId: session.user.id, status: "PENDING", deletedAt: null }, include: { store: { select: { ownerId: true } } } });
    if (!order) return NextResponse.json({ success: false, message: "Đơn không thể hủy." }, { status: 400 });
    const data = await prisma.$transaction(async (tx) => {
        const changed = await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, actorId: session.user.id, fromStatus: order.status, toStatus: "CANCELLED", note: "Nông dân hủy đơn trước khi cửa hàng xác nhận; chưa phát sinh xuất kho." } });
        await tx.notification.create({ data: { userId: order.store.ownerId, title: "Đơn hàng đã hủy", message: `Nông dân đã hủy đơn ${order.orderCode}. Đơn chưa phát sinh xuất kho.`, type: "ORDER_CANCELLED" } });
        return changed;
    });
    return NextResponse.json({ success: true, data });
}
