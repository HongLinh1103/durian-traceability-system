import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { orderCode, requireRole } from "@/lib/store-marketplace";

const checkoutSchema = z.object({
    recipientName: z.string().trim().min(2, "Tên người nhận quá ngắn.").max(120),
    recipientPhone: z.string().trim().min(9, "Số điện thoại không hợp lệ.").max(20),
    shippingAddress: z.string().trim().min(5, "Địa chỉ nhận hàng quá ngắn.").max(500),
    note: z.string().trim().max(1000).optional(),
});

export async function GET() {
    const session = await requireRole(["FARMER"]);
    if (!session) return NextResponse.json({ success: false }, { status: 403 });
    const data = await prisma.order.findMany({
        where: { farmerId: session.user.id, deletedAt: null },
        include: { items: true, store: { select: { name: true, phone: true } }, histories: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    const session = await requireRole(["FARMER"]);
    if (!session) return NextResponse.json({ success: false, message: "Chỉ tài khoản nông dân được đặt hàng." }, { status: 403 });
    const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 });
    const cart = await prisma.cartItem.findMany({ where: { userId: session.user.id }, include: { product: { include: { store: true } } } });
    if (!cart.length) return NextResponse.json({ success: false, message: "Giỏ hàng trống." }, { status: 400 });

    const groups = new Map<string, typeof cart>();
    for (const item of cart) {
        if (item.product.status !== "APPROVED" || item.product.deletedAt || item.product.store.status !== "APPROVED" || item.product.store.deletedAt || item.product.stock < item.quantity) {
            return NextResponse.json({ success: false, message: `Sản phẩm ${item.product.name} không còn đủ hàng.` }, { status: 409 });
        }
        groups.set(item.product.storeId, [...(groups.get(item.product.storeId) ?? []), item]);
    }

    try {
        const orders = await prisma.$transaction(async (tx) => {
            const result = [];
            for (const [storeId, items] of groups) {
                const subtotal = items.reduce((sum, item) => sum + Number(item.product.salePrice ?? item.product.price) * item.quantity, 0);
                const generatedOrderCode = await orderCode(tx);
                const created = await tx.order.create({ data: {
                    orderCode: generatedOrderCode, farmerId: session.user.id, storeId, ...parsed.data, subtotal, shippingFee: 20_000,
                    items: { create: items.map((item) => ({ productId: item.productId, productName: item.product.name, productImage: item.product.imageUrls[0] || null, unitPrice: item.product.salePrice ?? item.product.price, quantity: item.quantity, unit: item.product.unit, storeName: item.product.store.name })) },
                    histories: { create: { actorId: session.user.id, toStatus: "PENDING", note: "Nông dân đặt hàng, thanh toán COD." } },
                } });
                await tx.notification.create({ data: { userId: items[0].product.store.ownerId, title: "Có đơn hàng mới", message: `Đơn ${created.orderCode} đang chờ cửa hàng xác nhận.`, type: "ORDER_NEW" } });
                result.push(created);
            }
            await tx.cartItem.deleteMany({ where: { userId: session.user.id } });
            return result;
        });
        return NextResponse.json({ success: true, data: orders }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error && error.message === "DAILY_CODE_LIMIT" ? "Đã vượt giới hạn 999 đơn hàng trong ngày." : "Không thể tạo đơn hàng. Vui lòng thử lại.";
        return NextResponse.json({ success: false, message }, { status: 409 });
    }
}
