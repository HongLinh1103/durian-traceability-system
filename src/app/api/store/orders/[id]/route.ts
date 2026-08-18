import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnedStore, inventoryDocumentCode, requireRole } from "@/lib/store-marketplace";
import { prisma } from "@/lib/prisma";

const transitions: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "PREPARING", "REJECTED"],
    CONFIRMED: ["PREPARING", "READY_FOR_DELIVERY", "SHIPPING"],
    PREPARING: ["READY_FOR_DELIVERY", "SHIPPING"],
    READY_FOR_DELIVERY: ["SHIPPING"],
    SHIPPING: ["DELIVERED", "COMPLETED"],
    DELIVERED: ["COMPLETED"],
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await requireRole(["STORE_OWNER"]);
    if (!session) return NextResponse.json({ success: false }, { status: 403 });
    const store = await getOwnedStore(session.user.id);
    if (!store) return NextResponse.json({ success: false }, { status: 404 });
    const parsed = z.object({ status: z.enum(["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY", "SHIPPING", "DELIVERED", "COMPLETED", "REJECTED"]), reason: z.string().trim().max(1000).optional() }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false }, { status: 400 });
    const order = await prisma.order.findFirst({ where: { id: params.id, storeId: store.id, deletedAt: null }, include: { items: true, inventoryDocuments: true } });
    if (!order || !transitions[order.status]?.includes(parsed.data.status)) return NextResponse.json({ success: false, message: "Chuyển trạng thái không hợp lệ." }, { status: 400 });
    if (parsed.data.status === "REJECTED" && !parsed.data.reason) return NextResponse.json({ success: false, message: "Cần nhập lý do từ chối." }, { status: 400 });

    try {
        const data = await prisma.$transaction(async (tx) => {
            const needsExportDoc = ["CONFIRMED", "PREPARING"].includes(parsed.data.status) && !order.inventoryDocuments.some(d => d.type === "PX");
            if (needsExportDoc) {
                const code = await inventoryDocumentCode(tx, "PX");
                const actor = await tx.user.findUnique({ where: { id: session.user.id }, select: { fullName: true } });
                const document = await tx.inventoryDocument.create({ data: { storeId: store.id, code, type: "PX", businessType: "SALE_EXPORT", orderId: order.id, actorId: session.user.id, actorName: actor?.fullName || "Chủ cửa hàng" } });
                for (const item of order.items) if (item.productId) {
                    const changed = await tx.storeProduct.updateMany({ where: { id: item.productId, storeId: store.id, deletedAt: null, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
                    if (changed.count !== 1) throw new Error(`OUT_OF_STOCK:${item.productName}`);
                    const product = await tx.storeProduct.findUniqueOrThrow({ where: { id: item.productId }, select: { stock: true } });
                    await tx.inventoryMovement.create({ data: { documentId: document.id, productId: item.productId, actorId: session.user.id, type: "ORDER_SALE", quantity: item.quantity, stockBefore: product.stock + item.quantity, stockAfter: product.stock, reference: order.orderCode } });
                    if (product.stock === 0) await tx.storeProduct.update({ where: { id: item.productId }, data: { status: "OUT_OF_STOCK" } });
                }
            }
            const changed = await tx.order.update({ where: { id: order.id }, data: { status: parsed.data.status, rejectionReason: parsed.data.reason || null } });
            await tx.orderStatusHistory.create({ data: { orderId: order.id, actorId: session.user.id, fromStatus: order.status, toStatus: parsed.data.status, note: parsed.data.reason } });
            await tx.notification.create({ data: { userId: order.farmerId, title: "Cập nhật đơn hàng", message: parsed.data.status === "REJECTED" ? `Đơn ${order.orderCode} bị từ chối: ${parsed.data.reason}` : `Đơn ${order.orderCode}: ${parsed.data.status}.`, type: "ORDER_STATUS" } });
            return changed;
        });
        return NextResponse.json({ success: true, data });
    } catch (error) {
        const message = error instanceof Error && error.message.startsWith("OUT_OF_STOCK:") ? `Không đủ tồn kho cho ${error.message.slice(13)}. Không thể xác nhận đơn.` : "Không thể cập nhật đơn hàng.";
        return NextResponse.json({ success: false, message }, { status: 409 });
    }
}
