import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnedStore, requireRole } from "@/lib/store-marketplace";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await requireRole(["STORE_OWNER"]);
    if (!session) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
    const store = await getOwnedStore(session.user.id);
    if (!store) return NextResponse.json({ message: "Không tìm thấy cửa hàng." }, { status: 404 });
    const [orders, expenses, documents] = await Promise.all([
        prisma.order.findMany({
            where: { storeId: store.id, deletedAt: null, status: { in: ["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY", "SHIPPING", "DELIVERED", "COMPLETED"] } },
            include: { farmer: { select: { fullName: true } }, histories: { orderBy: { createdAt: "asc" } } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.storeExpense.findMany({ where: { storeId: store.id }, orderBy: { expenseDate: "desc" } }),
        prisma.inventoryDocument.findMany({ where: { storeId: store.id }, select: { id: true, code: true }, orderBy: { createdAt: "desc" } }),
    ]);
    const references = [...orders.map(o => ({ id: o.id, code: o.orderCode })), ...documents];
    return NextResponse.json({
        income: orders.map(o => {
            const total = Number(o.subtotal) + Number(o.shippingFee);
            const paid = o.paymentStatus === "PAID" ? total : Number(o.paidAmount || 0);
            const confirmed = o.histories.find(h => ["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY"].includes(h.toStatus));
            return { id: o.id, code: o.orderCode, date: (confirmed?.createdAt || o.createdAt).toISOString(), customer: o.farmer.fullName || o.recipientName, total, paid, remaining: Math.max(0, total - paid), method: o.paymentMethod };
        }).sort((a, b) => b.date.localeCompare(a.date)),
        expenses: expenses.map(e => ({ id: e.id, date: e.expenseDate.toISOString(), category: e.category, title: e.title, reference: references.find(r => r.id === e.referenceId)?.code || e.referenceId || "", amount: Number(e.amount), method: e.paymentMethod })),
        references,
    });
}
