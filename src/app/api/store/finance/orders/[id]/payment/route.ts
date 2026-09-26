import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const store = await prisma.store.findFirst({
            where: { ownerId: session.user.id, deletedAt: null },
        });

        if (!store) {
            return NextResponse.json({ success: false, message: "Không tìm thấy cửa hàng." }, { status: 404 });
        }

        const body = await request.json().catch(() => ({}));
        const { paymentStatus = "PAID", paidAmount } = body;

        const order = await prisma.order.findFirst({
            where: { id: params.id, storeId: store.id, deletedAt: null },
        });

        if (!order) {
            return NextResponse.json({ success: false, message: "Không tìm thấy đơn hàng." }, { status: 404 });
        }

        if (!["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY", "SHIPPING", "DELIVERED", "COMPLETED"].includes(order.status)) {
            return NextResponse.json(
                { success: false, message: "Chỉ được thu tiền đơn đã xác nhận và chưa hủy." },
                { status: 409 },
            );
        }

        const totalAmount = Number(order.subtotal) + Number(order.shippingFee || 0);
        const previousPaidAmount = Number(order.paidAmount || 0);
        const previousOutstandingAmount = order.paymentStatus === "PAID"
            ? 0
            : Math.max(totalAmount - previousPaidAmount, 0);
        const newPaidAmount = paymentStatus === "PAID" ? totalAmount : (paidAmount ? Number(paidAmount) : 0);

        if (!["PAID", "PARTIAL", "UNPAID"].includes(paymentStatus) || !Number.isFinite(newPaidAmount) || newPaidAmount < 0 || newPaidAmount > totalAmount) {
            return NextResponse.json({ success: false, message: "Số tiền hoặc trạng thái thanh toán không hợp lệ." }, { status: 400 });
        }

        const changed = await prisma.order.updateMany({
            where: { id: order.id, storeId: store.id, deletedAt: null, status: order.status, updatedAt: order.updatedAt },
            data: {
                paymentStatus,
                paidAmount: newPaidAmount,
                paidAt: paymentStatus === "PAID" ? (order.paidAt || new Date()) : null,
            },
        });
        if (!changed.count) return NextResponse.json({ success: false, message: "Đơn hàng vừa thay đổi. Vui lòng tải lại." }, { status: 409 });
        const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

        return NextResponse.json({
            success: true,
            message: "Đã cập nhật trạng thái thanh toán đơn hàng.",
            data: {
                id: updated.id,
                paymentStatus: updated.paymentStatus,
                paidAmount: Number(updated.paidAmount || 0),
                paidAt: updated.paidAt?.toISOString() || null,
                receivableReduction: paymentStatus === "PAID" ? previousOutstandingAmount : 0,
            },
        });
    } catch (error) {
        console.error("PATCH order payment error:", error);
        return NextResponse.json({ success: false, message: "Không thể cập nhật thanh toán." }, { status: 500 });
    }
}
