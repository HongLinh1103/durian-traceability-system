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
            where: { id: params.id, storeId: store.id },
        });

        if (!order) {
            return NextResponse.json({ success: false, message: "Không tìm thấy đơn hàng." }, { status: 404 });
        }

        if (["CANCELLED", "REJECTED"].includes(order.status)) {
            return NextResponse.json(
                { success: false, message: "Đơn hàng đã hủy hoặc bị từ chối, không thể ghi nhận thanh toán." },
                { status: 409 },
            );
        }

        const totalAmount = Number(order.subtotal) + Number(order.shippingFee || 0);
        const newPaidAmount = paymentStatus === "PAID" ? totalAmount : (paidAmount ? Number(paidAmount) : 0);

        const updated = await prisma.order.update({
            where: { id: order.id },
            data: {
                paymentStatus,
                paidAmount: newPaidAmount,
                paidAt: paymentStatus === "PAID" ? new Date() : null,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Đã cập nhật trạng thái thanh toán đơn hàng.",
            data: updated,
        });
    } catch (error) {
        console.error("PATCH order payment error:", error);
        return NextResponse.json({ success: false, message: "Không thể cập nhật thanh toán." }, { status: 500 });
    }
}
