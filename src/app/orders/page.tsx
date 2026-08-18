"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

type Order = {
    id: string;
    orderCode: string;
    status: string;
    subtotal: string;
    shippingFee: string;
    createdAt: string;
    store: { name: string };
    items: { id: string; productName: string; quantity: number; unit: string }[];
};

const statusLabels: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đang chuẩn bị hàng",
    PREPARING: "Đang chuẩn bị hàng",
    READY_FOR_DELIVERY: "Đang chuẩn bị hàng",
    SHIPPING: "Đang giao",
    DELIVERED: "Hoàn tất",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
    REJECTED: "Đã từ chối",
};

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const response = await fetch("/api/orders", { cache: "no-store" });
            const payload = await response.json();
            setOrders(payload.data || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function cancel(id: string) {
        if (!window.confirm("Bạn có chắc muốn hủy đơn mua này?")) return;
        await fetch(`/api/orders/${id}`, { method: "PATCH" });
        await load();
    }

    return (
        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-5xl space-y-5 px-4 py-7 sm:px-6">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Quay lại</span>
                </button>
            </div>

            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Đơn mua của tôi</h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">Xem và theo dõi trạng thái các đơn đặt hàng vật tư.</p>
            </div>

        {loading && <div className="mt-6 h-40 animate-pulse rounded-3xl bg-slate-100" />}

        {!loading && orders.length === 0 && (
            <section className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600 shadow-soft">
                    <ShoppingBag className="h-10 w-10" strokeWidth={1.8} />
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-900">Bạn chưa có đơn mua nào</h2>
                <p className="mt-2 max-w-md text-slate-500">Khám phá các sản phẩm phân bón và thuốc bảo vệ thực vật từ những cửa hàng đã được phê duyệt.</p>
                <Button asChild className="mt-6 h-12 rounded-2xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 shadow-soft">
                    <Link href="/materials">Mua sắm vật tư</Link>
                </Button>
            </section>
        )}

        {!loading && orders.length > 0 && (
            <div className="mt-6 space-y-4">
                {orders.map((order) => (
                    <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row">
                            <div>
                                <h2 className="font-bold text-slate-900">{order.orderCode} · {order.store.name}</h2>
                                <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
                            </div>
                            <span className="font-semibold text-brand-700">{statusLabels[order.status] ?? order.status}</span>
                        </div>
                        <ul className="mt-3 text-sm text-slate-700">
                            {order.items.map((item) => (
                                <li key={item.id}>{item.productName} × {item.quantity} {item.unit}</li>
                            ))}
                        </ul>
                        <div className="mt-3 text-sm text-slate-600">
                            <p>Tiền hàng: {Number(order.subtotal).toLocaleString("vi-VN")} đ</p>
                            <p>Phí vận chuyển: {Number(order.shippingFee).toLocaleString("vi-VN")} đ</p>
                            <p className="font-bold text-brand-700">Tổng thanh toán: {(Number(order.subtotal) + Number(order.shippingFee)).toLocaleString("vi-VN")} đ</p>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <Button asChild size="sm" variant="outline" className="text-slate-700 hover:text-brand-700">
                                <Link href={`/orders/${order.id}`}>Chi tiết</Link>
                            </Button>
                            {order.status === "PENDING" && (
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => void cancel(order.id)}>
                                    Hủy đơn
                                </Button>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        )}
        </main>
    );
}
