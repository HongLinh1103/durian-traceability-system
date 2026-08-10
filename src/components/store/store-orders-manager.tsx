"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, Loader2, MapPin, Phone, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Order = {
    id: string; orderCode: string; status: string; recipientName: string; recipientPhone: string;
    shippingAddress: string; subtotal: string; shippingFee: string; createdAt: string; note?: string | null; rejectionReason?: string | null;
    farmer: { fullName?: string | null; phone: string };
    items: { id: string; productName: string; quantity: number; unit: string; unitPrice: string }[];
    inventoryDocuments: { code: string; type: string }[];
};

const statusLabels: Record<string, string> = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", PREPARING: "Đang chuẩn bị", READY_FOR_DELIVERY: "Sẵn sàng giao", SHIPPING: "Đang giao", DELIVERED: "Đã giao", COMPLETED: "Hoàn tất", CANCELLED: "Nông dân đã hủy", REJECTED: "Đã từ chối" };
const nextStatuses: Record<string, Array<{ value: string; label: string }>> = {
    PENDING: [{ value: "CONFIRMED", label: "Xác nhận đơn" }, { value: "REJECTED", label: "Từ chối" }],
    CONFIRMED: [{ value: "PREPARING", label: "Bắt đầu chuẩn bị" }],
    PREPARING: [{ value: "READY_FOR_DELIVERY", label: "Sẵn sàng giao" }],
    READY_FOR_DELIVERY: [{ value: "SHIPPING", label: "Bắt đầu giao" }],
    SHIPPING: [{ value: "DELIVERED", label: "Đã giao hàng" }],
    DELIVERED: [{ value: "COMPLETED", label: "Hoàn tất đơn" }],
};
const filters = [{ value: "ALL", label: "Tất cả" }, { value: "PENDING", label: "Chờ xác nhận" }, { value: "PROCESSING", label: "Đang xử lý" }, { value: "SHIPPING", label: "Đang giao" }, { value: "DONE", label: "Đã kết thúc" }];

export function StoreOrdersManager() {
    const [items, setItems] = useState<Order[]>([]);
    const [filter, setFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true); setError("");
        try { const response = await fetch("/api/store/orders", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "Không thể tải đơn hàng."); setItems(payload.data || []); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải đơn hàng."); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const visible = useMemo(() => items.filter((order) => filter === "ALL" || filter === "PENDING" && order.status === "PENDING" || filter === "PROCESSING" && ["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY"].includes(order.status) || filter === "SHIPPING" && order.status === "SHIPPING" || filter === "DONE" && ["DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(order.status)), [filter, items]);
    const pending = items.filter((order) => order.status === "PENDING").length;
    const shipping = items.filter((order) => order.status === "SHIPPING").length;
    const completed = items.filter((order) => order.status === "COMPLETED").length;

    async function update(order: Order, status: string) {
        let reason: string | undefined;
        if (status === "REJECTED") { reason = window.prompt("Nhập lý do từ chối để nông dân biết:")?.trim(); if (!reason) return; }
        setProcessingId(order.id); setError("");
        try { const response = await fetch(`/api/store/orders/${order.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, reason }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "Không thể cập nhật trạng thái."); await load(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái."); }
        finally { setProcessingId(""); }
    }

    return <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-3"><Stat icon={<Clock3 />} label="Chờ xác nhận" value={pending} tone="amber" /><Stat icon={<Truck />} label="Đang giao" value={shipping} tone="sky" /><Stat icon={<CheckCircle2 />} label="Hoàn tất" value={completed} tone="emerald" /></section>
        <div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button type="button" key={item.value} onClick={() => setFilter(item.value)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${filter === item.value ? "bg-emerald-600 text-white" : "border bg-white text-slate-600"}`}>{item.label}</button>)}</div>
        {error && <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}
        {loading && <div className="flex justify-center rounded-3xl border bg-white py-16"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}
        {!loading && visible.length === 0 && <div className="rounded-3xl border border-dashed bg-white py-16 text-center text-slate-500">Không có đơn hàng trong nhóm này.</div>}
        {!loading && visible.map((order) => <article key={order.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <header className="flex flex-col gap-2 border-b bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-slate-900">{order.orderCode}</b><p className="text-xs text-slate-500">Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")}</p></div><Status status={order.status} /></header>
            {order.inventoryDocuments?.length > 0 && <div className="flex flex-wrap gap-2 border-b px-5 py-3">{order.inventoryDocuments.map((document) => <Link key={document.code} href={`/dashboard/store/inventory/${encodeURIComponent(document.code)}`} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:underline">{document.type}: {document.code}</Link>)}</div>}
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
                <div><h3 className="font-bold text-slate-900">Sản phẩm</h3><div className="mt-2 divide-y">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-3 py-2 text-sm"><span>{item.productName} × {item.quantity} {item.unit}</span><b>{(Number(item.unitPrice) * item.quantity).toLocaleString("vi-VN")} đ</b></div>)}</div><div className="mt-3 space-y-1 border-t pt-3 text-sm"><p className="flex justify-between"><span>Tiền hàng</span><span>{Number(order.subtotal).toLocaleString("vi-VN")} đ</span></p><p className="flex justify-between"><span>Phí vận chuyển</span><span>{Number(order.shippingFee).toLocaleString("vi-VN")} đ</span></p><p className="flex justify-between text-lg font-black text-emerald-700"><span>Tổng thanh toán</span><span>{(Number(order.subtotal) + Number(order.shippingFee)).toLocaleString("vi-VN")} đ</span></p></div>{order.note && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>Ghi chú:</b> {order.note}</p>}</div>
                <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm"><h3 className="font-bold text-slate-900">Thông tin giao hàng</h3><p><b>{order.recipientName}</b></p><p className="flex gap-2"><Phone className="h-4 w-4 shrink-0" />{order.recipientPhone}</p><p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" />{order.shippingAddress}</p></div>
            </div>
            {(nextStatuses[order.status] || []).length > 0 && <footer className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">{nextStatuses[order.status].map((next) => <Button key={next.value} variant={next.value === "REJECTED" ? "outline" : "default"} disabled={processingId === order.id} onClick={() => void update(order, next.value)}>{processingId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{next.label}</Button>)}</footer>}
        </article>)}
    </div>;
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "amber" | "sky" | "emerald" }) { const colors = { amber: "bg-amber-50 text-amber-700", sky: "bg-sky-50 text-sky-700", emerald: "bg-emerald-50 text-emerald-700" }; return <div className={`rounded-2xl p-4 ${colors[tone]}`}><div className="flex items-center gap-2 [&_svg]:h-5 [&_svg]:w-5">{icon}<span className="text-sm font-semibold">{label}</span></div><p className="mt-2 text-3xl font-black">{value}</p></div>; }
function Status({ status }: { status: string }) { return <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{statusLabels[status] ?? status}</span>; }
