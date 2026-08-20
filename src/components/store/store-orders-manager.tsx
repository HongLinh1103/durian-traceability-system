"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Loader2,
    MapPin,
    Package,
    PackageCheck,
    Phone,
    Search,
    Truck,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type OrderItem = {
    id: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: string;
};

type Order = {
    id: string;
    orderCode: string;
    status: string;
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    subtotal: string;
    shippingFee: string;
    createdAt: string;
    updatedAt?: string | null;
    cancelledAt?: string | null;
    note?: string | null;
    rejectionReason?: string | null;
    farmer: { fullName?: string | null; phone: string };
    items: OrderItem[];
    histories?: { toStatus: string; createdAt: string }[];
    inventoryDocuments: { id: string; code: string; type: string }[];
};

function formatOrderHistoryText(order: Order, statusObj: { key: string }) {
    const formatTimeDate = (dateStr?: string | null) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${hours}:${minutes} ngày ${day}/${month}/${year}`;
    };

    if (statusObj.key === "COMPLETED") {
        const historyItem = order.histories?.slice().reverse().find((h) => h.toStatus === "COMPLETED" || h.toStatus === "DELIVERED");
        const timeStr = formatTimeDate(historyItem?.createdAt || order.updatedAt || order.createdAt);
        return timeStr ? `Hoàn tất lúc ${timeStr}` : "Đơn hàng đã hoàn tất giao và thanh toán";
    }

    if (statusObj.key === "CANCELLED" || statusObj.key === "REJECTED") {
        const historyItem = order.histories?.slice().reverse().find((h) => h.toStatus === "CANCELLED" || h.toStatus === "REJECTED");
        const timeStr = formatTimeDate(order.cancelledAt || historyItem?.createdAt || order.updatedAt || order.createdAt);
        const prefix = statusObj.key === "REJECTED" ? "Từ chối lúc" : "Đã hủy lúc";
        return timeStr ? `${prefix} ${timeStr}` : "Đơn hàng đã kết thúc";
    }

    if (statusObj.key === "SHIPPING") {
        const historyItem = order.histories?.slice().reverse().find((h) => h.toStatus === "SHIPPING");
        const timeStr = formatTimeDate(historyItem?.createdAt || order.updatedAt);
        return timeStr ? `Bắt đầu giao lúc ${timeStr}` : "Đơn đang được vận chuyển đến nông dân";
    }

    if (statusObj.key === "PREPARING") {
        const historyItem = order.histories?.slice().reverse().find((h) => h.toStatus === "PREPARING" || h.toStatus === "CONFIRMED");
        const timeStr = formatTimeDate(historyItem?.createdAt || order.updatedAt);
        return timeStr ? `Xác nhận lúc ${timeStr}` : "Đang chuẩn bị hàng và xuất kho";
    }

    return "Cửa hàng cần xác nhận đơn để xuất kho chuẩn bị hàng";
}

// 4 Standard Display Statuses
export function getDisplayStatus(status: string): {
    key: "PENDING" | "PREPARING" | "SHIPPING" | "COMPLETED" | "CANCELLED" | "REJECTED";
    label: string;
    badgeBg: string;
    badgeDot: string;
} {
    switch (status) {
        case "PENDING":
            return {
                key: "PENDING",
                label: "Chờ xác nhận",
                badgeBg: "bg-amber-100/90 text-amber-900 border-amber-300 font-bold",
                badgeDot: "bg-amber-500",
            };
        case "CONFIRMED":
        case "PREPARING":
        case "READY_FOR_DELIVERY":
            return {
                key: "PREPARING",
                label: "Đang chuẩn bị hàng",
                badgeBg: "bg-blue-100/90 text-blue-900 border-blue-300 font-bold",
                badgeDot: "bg-blue-500",
            };
        case "SHIPPING":
            return {
                key: "SHIPPING",
                label: "Đang giao",
                badgeBg: "bg-purple-100/90 text-purple-900 border-purple-300 font-bold",
                badgeDot: "bg-purple-500",
            };
        case "DELIVERED":
        case "COMPLETED":
            return {
                key: "COMPLETED",
                label: "Hoàn tất",
                badgeBg: "bg-emerald-100/90 text-emerald-900 border-emerald-300 font-bold",
                badgeDot: "bg-emerald-500",
            };
        case "CANCELLED":
            return {
                key: "CANCELLED",
                label: "Nông dân đã hủy",
                badgeBg: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
                badgeDot: "bg-slate-400",
            };
        case "REJECTED":
            return {
                key: "REJECTED",
                label: "Đã từ chối",
                badgeBg: "bg-red-100 text-red-800 border-red-200 font-medium",
                badgeDot: "bg-red-500",
            };
        default:
            return {
                key: "PENDING",
                label: status,
                badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
                badgeDot: "bg-slate-400",
            };
    }
}

export function StoreOrdersManager() {
    const { toast } = useToast();
    const [items, setItems] = useState<Order[]>([]);
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "PREPARING" | "SHIPPING" | "COMPLETED" | "CANCELLED">("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/store/orders", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || "Không thể tải đơn hàng.");
            setItems(payload.data || []);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Không thể tải đơn hàng.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    // Count statistics across the 4 key categories
    const counts = useMemo(() => {
        let pending = 0;
        let preparing = 0;
        let shipping = 0;
        let completed = 0;
        let cancelled = 0;

        for (const order of items) {
            const disp = getDisplayStatus(order.status).key;
            if (disp === "PENDING") pending++;
            else if (disp === "PREPARING") preparing++;
            else if (disp === "SHIPPING") shipping++;
            else if (disp === "COMPLETED") completed++;
            else if (disp === "CANCELLED" || disp === "REJECTED") cancelled++;
        }

        return {
            total: items.length,
            pending,
            preparing,
            shipping,
            completed,
            cancelled,
        };
    }, [items]);

    // Filter and search
    const visible = useMemo(() => {
        return items.filter((order) => {
            const dispKey = getDisplayStatus(order.status).key;

            if (filter === "PENDING" && dispKey !== "PENDING") return false;
            if (filter === "PREPARING" && dispKey !== "PREPARING") return false;
            if (filter === "SHIPPING" && dispKey !== "SHIPPING") return false;
            if (filter === "COMPLETED" && dispKey !== "COMPLETED") return false;
            if (filter === "CANCELLED" && dispKey !== "CANCELLED" && dispKey !== "REJECTED") return false;

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const codeMatch = order.orderCode.toLowerCase().includes(query);
                const farmerMatch = (order.farmer?.fullName || order.recipientName || "").toLowerCase().includes(query);
                const phoneMatch = (order.farmer?.phone || order.recipientPhone || "").toLowerCase().includes(query);
                const itemMatch = order.items.some((it) => it.productName.toLowerCase().includes(query));
                if (!codeMatch && !farmerMatch && !phoneMatch && !itemMatch) return false;
            }

            return true;
        });
    }, [items, filter, searchQuery]);

    async function updateOrderStatus(order: Order, targetStatus: string) {
        let reason: string | undefined;
        if (targetStatus === "REJECTED") {
            reason = window.prompt("Nhập lý do từ chối đơn hàng:")?.trim();
            if (!reason) return;
        }

        setProcessingId(order.id);
        setError("");
        try {
            const response = await fetch(`/api/store/orders/${order.id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: targetStatus, reason }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || "Không thể cập nhật trạng thái.");

            if (targetStatus === "PREPARING") {
                toast({
                    title: "Đã xác nhận đơn hàng",
                    description: `Đơn ${order.orderCode} đã chuyển sang chuẩn bị hàng và tự động tạo phiếu xuất kho PX.`,
                    variant: "success",
                });
            } else if (targetStatus === "SHIPPING") {
                toast({
                    title: "Bắt đầu giao hàng",
                    description: `Đơn ${order.orderCode} đang được vận chuyển đến nông dân.`,
                    variant: "success",
                });
            } else if (targetStatus === "COMPLETED") {
                toast({
                    title: "Đơn hàng hoàn tất",
                    description: `Đơn ${order.orderCode} đã giao thành công và hoàn tất.`,
                    variant: "success",
                });
            } else if (targetStatus === "REJECTED") {
                toast({
                    title: "Đã từ chối đơn hàng",
                    description: `Đơn ${order.orderCode} đã bị từ chối.`,
                    variant: "success",
                });
            }

            await load();
        } catch (cause) {
            const msg = cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái.";
            setError(msg);
            toast({
                title: "Cập nhật thất bại",
                description: msg,
                variant: "destructive",
            });
        } finally {
            setProcessingId("");
        }
    }

    const filters = [
        { key: "ALL" as const, label: "Tất cả", count: counts.total },
        { key: "PENDING" as const, label: "Chờ xác nhận", count: counts.pending },
        { key: "PREPARING" as const, label: "Đang chuẩn bị hàng", count: counts.preparing },
        { key: "SHIPPING" as const, label: "Đang giao", count: counts.shipping },
        { key: "COMPLETED" as const, label: "Hoàn tất", count: counts.completed },
        { key: "CANCELLED" as const, label: "Đã hủy / Từ chối", count: counts.cancelled },
    ];

    return (
        <div className="space-y-6">
            {/* 1. BỐN CARD THỐNG KÊ TRỌNG TÂM (4 CORE ORDER STATUS CARDS) */}
            <section aria-label="Thống kê trạng thái đơn hàng" className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
                {/* 1. CHỜ XÁC NHẬN */}
                <button
                    type="button"
                    onClick={() => setFilter(filter === "PENDING" ? "ALL" : "PENDING")}
                    className={`flex flex-col justify-between rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        filter === "PENDING"
                            ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400/30"
                            : "border-slate-200 bg-white hover:border-amber-300"
                    }`}
                >
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                            Chờ xác nhận
                        </span>
                        <div className="mt-2">
                            <span className="text-2xl font-black text-slate-900 sm:text-3xl">
                                {counts.pending}
                            </span>
                            <span className="ml-1 text-xs text-slate-500 font-medium">đơn</span>
                        </div>
                    </div>
                    <p className="mt-2 text-[11px] text-amber-800 font-medium">Cần xác nhận & chuẩn bị</p>
                </button>

                {/* 2. ĐANG CHUẨN BỊ HÀNG */}
                <button
                    type="button"
                    onClick={() => setFilter(filter === "PREPARING" ? "ALL" : "PREPARING")}
                    className={`flex flex-col justify-between rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        filter === "PREPARING"
                            ? "border-blue-400 bg-blue-50 ring-2 ring-blue-400/30"
                            : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                >
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                            Đang chuẩn bị hàng
                        </span>
                        <div className="mt-2">
                            <span className="text-2xl font-black text-slate-900 sm:text-3xl">
                                {counts.preparing}
                            </span>
                            <span className="ml-1 text-xs text-slate-500 font-medium">đơn</span>
                        </div>
                    </div>
                    <p className="mt-2 text-[11px] text-blue-800 font-medium">Đang đóng gói & xuất kho</p>
                </button>

                {/* 3. ĐANG GIAO */}
                <button
                    type="button"
                    onClick={() => setFilter(filter === "SHIPPING" ? "ALL" : "SHIPPING")}
                    className={`flex flex-col justify-between rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        filter === "SHIPPING"
                            ? "border-purple-400 bg-purple-50 ring-2 ring-purple-400/30"
                            : "border-slate-200 bg-white hover:border-purple-300"
                    }`}
                >
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                            Đang giao
                        </span>
                        <div className="mt-2">
                            <span className="text-2xl font-black text-slate-900 sm:text-3xl">
                                {counts.shipping}
                            </span>
                            <span className="ml-1 text-xs text-slate-500 font-medium">đơn</span>
                        </div>
                    </div>
                    <p className="mt-2 text-[11px] text-purple-800 font-medium">Đang trên đường vận chuyển</p>
                </button>

                {/* 4. HOÀN TẤT */}
                <button
                    type="button"
                    onClick={() => setFilter(filter === "COMPLETED" ? "ALL" : "COMPLETED")}
                    className={`flex flex-col justify-between rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        filter === "COMPLETED"
                            ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/30"
                            : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                >
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                            Hoàn tất
                        </span>
                        <div className="mt-2">
                            <span className="text-2xl font-black text-slate-900 sm:text-3xl">
                                {counts.completed}
                            </span>
                            <span className="ml-1 text-xs text-slate-500 font-medium">đơn</span>
                        </div>
                    </div>
                    <p className="mt-2 text-[11px] text-emerald-800 font-medium">Giao hàng thành công</p>
                </button>
            </section>

            {/* 2. BỘ LỌC VÀ TÌM KIẾM */}
            <section aria-label="Lọc và tìm kiếm đơn hàng" className="rounded-3xl border border-white/80 bg-white/65 p-3 shadow-sm backdrop-blur-sm sm:p-4">
                <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-center">
                    <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Tìm mã đơn, nông dân, SĐT..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 w-full rounded-2xl border-slate-200 bg-white pl-10 text-sm shadow-xs"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-nowrap xl:justify-end">
                    {filters.map((f) => (
                        <button
                            type="button"
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2 text-center text-xs font-bold leading-tight transition sm:px-3 xl:min-h-10 xl:shrink xl:whitespace-nowrap xl:rounded-full xl:px-3 ${
                                filter === f.key
                                    ? "bg-brand-600 text-white shadow-xs"
                                    : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-slate-50"
                            }`}
                        >
                            <span>{f.label}</span>
                            <span
                                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                                    filter === f.key
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                {f.count}
                            </span>
                        </button>
                    ))}
                    </div>
                </div>
            </section>

            {/* ERROR NOTIFICATION */}
            {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* LOADING STATE */}
            {loading && (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    <p className="mt-3 text-xs font-medium text-slate-500">Đang tải danh sách đơn hàng...</p>
                </div>
            )}

            {/* EMPTY STATE */}
            {!loading && visible.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
                    <Package className="mx-auto h-10 w-10 text-slate-300" />
                    <h3 className="mt-3 text-base font-bold text-slate-800">Không có đơn hàng nào</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        {searchQuery ? "Không tìm thấy đơn hàng khớp với từ khóa tìm kiếm." : "Không có đơn hàng trong trạng thái này."}
                    </p>
                </div>
            )}

            {/* 3. DANH SÁCH ĐƠN HÀNG */}
            {!loading && (
                <div className="space-y-4">
                    {visible.map((order) => {
                        const statusObj = getDisplayStatus(order.status);
                        const isPending = statusObj.key === "PENDING";
                        const isPreparing = statusObj.key === "PREPARING";
                        const isShipping = statusObj.key === "SHIPPING";

                        const totalPayment = Number(order.subtotal) + Number(order.shippingFee || 0);

                        return (
                            <article
                                key={order.id}
                                className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-sm"
                            >
                                {/* Order Header */}
                                <header className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-base font-black text-slate-900">
                                            {order.orderCode}
                                        </span>
                                        <span className="text-xs text-slate-400">·</span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(order.createdAt).toLocaleString("vi-VN", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${statusObj.badgeBg}`}>
                                            <span className={`h-2 w-2 rounded-full ${statusObj.badgeDot}`} />
                                            {statusObj.label}
                                        </span>
                                    </div>
                                </header>

                                {/* Linked Warehouse Documents */}
                                {order.inventoryDocuments?.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-emerald-50/30 px-5 py-2.5 text-xs">
                                        <span className="font-semibold text-slate-600">Chứng từ xuất kho:</span>
                                        {order.inventoryDocuments.map((doc) => (
                                            <Link
                                                key={doc.code}
                                                href={`/dashboard/store/inventory/${encodeURIComponent(doc.id)}`}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 font-mono font-bold text-emerald-800 border border-emerald-300/80 hover:bg-emerald-200/70 transition shadow-2xs"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                {doc.code}
                                            </Link>
                                        ))}
                                    </div>
                                ) : order.status === "PENDING" ? (
                                    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-amber-50/50 px-5 py-2 text-xs text-amber-800">
                                        <span className="font-semibold">Chưa có chứng từ:</span>
                                        <span className="text-amber-700">Phiếu xuất kho (PX) sẽ tự động được tạo và trừ tồn khi bấm &quot;Xác nhận đơn&quot;.</span>
                                    </div>
                                ) : order.status === "REJECTED" ? (
                                    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">
                                        <span>Không có chứng từ xuất kho (Đơn hàng đã bị từ chối).</span>
                                    </div>
                                ) : null}

                                {/* Order Details Body */}
                                <div className="grid gap-6 p-5 lg:grid-cols-[1fr_320px]">
                                    {/* Products list */}
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Danh sách vật tư đặt mua ({order.items.length} món)
                                        </h4>
                                        <div className="mt-3 divide-y divide-slate-100">
                                            {order.items.map((item) => {
                                                const itemTotal = Number(item.unitPrice) * item.quantity;
                                                return (
                                                    <div key={item.id} className="py-2.5 space-y-1">
                                                        <div className="font-semibold text-slate-900 leading-snug">
                                                            {item.productName}
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-slate-500 font-medium">
                                                                {item.quantity} {item.unit} × {Number(item.unitPrice).toLocaleString("vi-VN")} đ
                                                            </span>
                                                            <b className="font-bold text-slate-900">
                                                                {itemTotal.toLocaleString("vi-VN")} đ
                                                            </b>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                                            <p className="flex justify-between text-slate-600">
                                                <span>Tiền hàng</span>
                                                <span className="font-semibold">{Number(order.subtotal).toLocaleString("vi-VN")} đ</span>
                                            </p>
                                            <p className="flex justify-between text-slate-600">
                                                <span>Phí vận chuyển</span>
                                                <span>{Number(order.shippingFee).toLocaleString("vi-VN")} đ</span>
                                            </p>
                                            <p className="flex justify-between text-base font-black text-emerald-700 pt-1 border-t border-dashed border-slate-200">
                                                <span>Tổng thanh toán</span>
                                                <span>{totalPayment.toLocaleString("vi-VN")} đ</span>
                                            </p>
                                        </div>

                                        {order.rejectionReason && (
                                            <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-800 font-medium">
                                                <b>Lý do từ chối:</b> {order.rejectionReason}
                                            </p>
                                        )}
                                    </div>

                                    {/* Shipping info */}
                                    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs">
                                        <h4 className="font-bold uppercase tracking-wider text-slate-400">
                                            Thông tin giao hàng
                                        </h4>
                                        <div className="space-y-1.5 text-slate-700">
                                            <p className="text-sm font-bold text-slate-900">
                                                {order.farmer?.fullName || order.recipientName}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="font-semibold">{order.recipientPhone || order.farmer?.phone}</span>
                                            </p>
                                            <p className="flex items-start gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                <span>{order.shippingAddress}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Action Footer */}
                                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3.5">
                                    <div className="text-xs font-medium text-slate-500">
                                        {formatOrderHistoryText(order, statusObj)}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Actions for PENDING */}
                                        {isPending && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={processingId === order.id}
                                                    onClick={() => void updateOrderStatus(order, "REJECTED")}
                                                    className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                                >
                                                    <XCircle className="mr-1.5 h-4 w-4" />
                                                    Từ chối
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={processingId === order.id}
                                                    onClick={() => void updateOrderStatus(order, "PREPARING")}
                                                    className="rounded-xl bg-brand-600 hover:bg-brand-700 font-bold text-white shadow-soft"
                                                >
                                                    {processingId === order.id ? (
                                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <PackageCheck className="mr-1.5 h-4 w-4" />
                                                    )}
                                                    Xác nhận & chuẩn bị hàng
                                                </Button>
                                            </>
                                        )}

                                        {/* Actions for PREPARING */}
                                        {isPreparing && (
                                            <Button
                                                size="sm"
                                                disabled={processingId === order.id}
                                                onClick={() => void updateOrderStatus(order, "SHIPPING")}
                                                className="rounded-xl bg-purple-600 hover:bg-purple-700 font-bold text-white shadow-soft"
                                            >
                                                {processingId === order.id ? (
                                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Truck className="mr-1.5 h-4 w-4" />
                                                )}
                                                Bắt đầu giao hàng
                                            </Button>
                                        )}

                                        {/* Actions for SHIPPING */}
                                        {isShipping && (
                                            <Button
                                                size="sm"
                                                disabled={processingId === order.id}
                                                onClick={() => void updateOrderStatus(order, "COMPLETED")}
                                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-soft"
                                            >
                                                {processingId === order.id ? (
                                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                                )}
                                                Xác nhận hoàn tất đơn
                                            </Button>
                                        )}
                                    </div>
                                </footer>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
