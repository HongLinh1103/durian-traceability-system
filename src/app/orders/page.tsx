"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

type Order = {
    id: string;
    orderCode: string;
    status: string;
    subtotal: string;
    createdAt: string;
    store: { name: string };
    items: { id: string; productName: string; quantity: number; unit: string }[];
};

const statusLabels: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PREPARING: "Đang chuẩn bị",
    READY_FOR_DELIVERY: "Sẵn sàng giao",
    SHIPPING: "Đang giao hàng",
    DELIVERED: "Đã giao hàng",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
    REJECTED: "Bị từ chối",
};

export default function OrdersPage() {
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

    return <main className="mx-auto min-h-[calc(100vh-64px)] max-w-5xl px-4 py-7 sm:px-6">
        <h1 className="text-3xl font-black text-slate-950">Đơn mua của tôi</h1>

        {loading && <div className="mt-6 h-40 animate-pulse rounded-3xl bg-slate-100" />}

        {!loading && orders.length === 0 && <section className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <ShoppingBag className="h-10 w-10" strokeWidth={1.8} />
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-900">Bạn chưa có đơn mua nào</h2>
            <p className="mt-2 max-w-md text-slate-500">Khám phá các sản phẩm phân bón và thuốc bảo vệ thực vật từ những cửa hàng đã được phê duyệt.</p>
            <Button asChild className="mt-6 px-6">
                <Link href="/materials">Mua sắm vật tư</Link>
            </Button>
        </section>}

        {!loading && orders.length > 0 && <div className="mt-6 space-y-4">
            {orders.map((order) => <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                    <div><h2 className="font-bold">{order.orderCode} · {order.store.name}</h2><p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString("vi-VN")}</p></div>
                    <span className="font-semibold text-emerald-700">{statusLabels[order.status] ?? order.status}</span>
                </div>
                <ul className="mt-3 text-sm text-slate-700">{order.items.map((item) => <li key={item.id}>{item.productName} × {item.quantity} {item.unit}</li>)}</ul>
                <p className="mt-3 font-bold">{Number(order.subtotal).toLocaleString("vi-VN")} đ</p>
                <div className="mt-3 flex gap-2"><Button asChild size="sm" variant="outline"><Link href={`/orders/${order.id}`}>Chi tiết</Link></Button>{order.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => void cancel(order.id)}>Hủy đơn</Button>}</div>
            </article>)}
        </div>}
    </main>;
}
