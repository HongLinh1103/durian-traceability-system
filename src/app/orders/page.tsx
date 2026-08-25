"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Check,
    Clock,
    Copy,
    ExternalLink,
    Filter,
    Loader2,
    Package,
    Phone,
    Search,
    ShoppingBag,
    Store,
    Truck,
    X,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    formatOrderDateTime,
    formatPrice,
    getOrderStatusInfo,
    getPaymentStatusInfo,
    getShippingStatusInfo,
    OrderStatusKey,
} from "@/lib/order-status";

type OrderItem = {
    id: string;
    productName: string;
    productImage?: string | null;
    unitPrice: string | number;
    quantity: number;
    unit: string;
    storeName?: string;
};

type Order = {
    id: string;
    orderCode: string;
    status: OrderStatusKey;
    paymentStatus?: string | null;
    paymentMethod?: string;
    subtotal: string | number;
    shippingFee: string | number;
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    note?: string | null;
    createdAt: string;
    store: { name: string; phone?: string | null };
    items: OrderItem[];
    histories?: { id: string; toStatus: string; createdAt: string; note?: string | null }[];
};

type TabFilter = "ALL" | "PENDING" | "PREPARING" | "SHIPPING" | "COMPLETED" | "CANCELLED";

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancellingBusy, setCancellingBusy] = useState(false);
    const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const response = await fetch("/api/orders", { cache: "no-store" });
            const payload = await response.json();
            setOrders(payload.data || []);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const handleCopy = (code: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        }
    };

    async function handleConfirmCancel() {
        if (!cancellingId) return;
        setCancellingBusy(true);
        try {
            const res = await fetch(`/api/orders/${cancellingId}`, { method: "PATCH" });
            if (res.ok) {
                await load();
            }
        } finally {
            setCancellingBusy(false);
            setCancellingId(null);
        }
    }

    // Filter orders
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // Status Tab Filter
            if (activeTab === "PENDING" && order.status !== "PENDING") return false;
            if (
                activeTab === "PREPARING" &&
                !["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY"].includes(order.status)
            )
                return false;
            if (activeTab === "SHIPPING" && order.status !== "SHIPPING") return false;
            if (
                activeTab === "COMPLETED" &&
                !["DELIVERED", "COMPLETED"].includes(order.status)
            )
                return false;
            if (
                activeTab === "CANCELLED" &&
                !["CANCELLED", "REJECTED"].includes(order.status)
            )
                return false;

            // Search Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = order.orderCode.toLowerCase().includes(q);
                const matchStore = order.store.name.toLowerCase().includes(q);
                const matchProduct = order.items.some((item) =>
                    item.productName.toLowerCase().includes(q),
                );
                const matchRecipient =
                    order.recipientName.toLowerCase().includes(q) ||
                    order.recipientPhone.includes(q);
                if (!matchCode && !matchStore && !matchProduct && !matchRecipient) {
                    return false;
                }
            }

            return true;
        });
    }, [orders, activeTab, searchQuery]);

    // Count statistics
    const tabCounts = useMemo(() => {
        return {
            ALL: orders.length,
            PENDING: orders.filter((o) => o.status === "PENDING").length,
            PREPARING: orders.filter((o) =>
                ["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY"].includes(o.status),
            ).length,
            SHIPPING: orders.filter((o) => o.status === "SHIPPING").length,
            COMPLETED: orders.filter((o) =>
                ["DELIVERED", "COMPLETED"].includes(o.status),
            ).length,
            CANCELLED: orders.filter((o) =>
                ["CANCELLED", "REJECTED"].includes(o.status),
            ).length,
        };
    }, [orders]);

    return (
        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-5xl space-y-6 px-4 py-6 sm:px-6">
            {/* Top Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Quay lại</span>
                    </button>
                </div>
                <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-brand-600 font-semibold text-white shadow-soft hover:bg-brand-700"
                >
                    <Link href="/materials" className="flex items-center gap-1.5">
                        <ShoppingBag className="h-4 w-4" />
                        <span>Chợ vật tư nông nghiệp</span>
                    </Link>
                </Button>
            </div>

            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Đơn mua của tôi</h1>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    Theo dõi tiến độ giao hàng, đơn giá sản phẩm và lịch sử các đơn đặt hàng vật tư.
                </p>
            </div>

            {/* Search and Tabs */}
            <div className="space-y-3">
                {/* Search box */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo mã đơn, tên sản phẩm hoặc cửa hàng..."
                        className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Status Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 text-sm no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setActiveTab("ALL")}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-bold transition ${
                            activeTab === "ALL"
                                ? "bg-brand-600 text-white shadow-soft"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                    >
                        <span>Tất cả</span>
                        <span
                            className={`rounded-full px-1.5 py-0.5 text-xs ${
                                activeTab === "ALL"
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-200 text-slate-700"
                            }`}
                        >
                            {tabCounts.ALL}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("PENDING")}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-bold transition ${
                            activeTab === "PENDING"
                                ? "bg-amber-600 text-white shadow-soft"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                    >
                        <span>Chờ xác nhận</span>
                        {tabCounts.PENDING > 0 && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-xs ${
                                    activeTab === "PENDING"
                                        ? "bg-white/20 text-white"
                                        : "bg-amber-100 text-amber-800"
                                }`}
                            >
                                {tabCounts.PENDING}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("PREPARING")}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-bold transition ${
                            activeTab === "PREPARING"
                                ? "bg-blue-600 text-white shadow-soft"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                    >
                        <span>Đang chuẩn bị</span>
                        {tabCounts.PREPARING > 0 && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-xs ${
                                    activeTab === "PREPARING"
                                        ? "bg-white/20 text-white"
                                        : "bg-blue-100 text-blue-800"
                                }`}
                            >
                                {tabCounts.PREPARING}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("SHIPPING")}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-bold transition ${
                            activeTab === "SHIPPING"
                                ? "bg-purple-600 text-white shadow-soft"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                    >
                        <span>Đang giao</span>
                        {tabCounts.SHIPPING > 0 && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-xs ${
                                    activeTab === "SHIPPING"
                                        ? "bg-white/20 text-white"
                                        : "bg-purple-100 text-purple-800"
                                }`}
                            >
                                {tabCounts.SHIPPING}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("COMPLETED")}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-bold transition ${
                            activeTab === "COMPLETED"
                                ? "bg-emerald-600 text-white shadow-soft"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                    >
                        <span>Hoàn tất</span>
                        {tabCounts.COMPLETED > 0 && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-xs ${
                                    activeTab === "COMPLETED"
                                        ? "bg-white/20 text-white"
                                        : "bg-emerald-100 text-emerald-800"
                                }`}
                            >
                                {tabCounts.COMPLETED}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("CANCELLED")}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-bold transition ${
                            activeTab === "CANCELLED"
                                ? "bg-slate-700 text-white shadow-soft"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                    >
                        <span>Đã hủy</span>
                        {tabCounts.CANCELLED > 0 && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-xs ${
                                    activeTab === "CANCELLED"
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                {tabCounts.CANCELLED}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Loading Skeleton */}
            {loading && (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 space-y-4"
                        >
                            <div className="h-6 w-1/3 rounded-lg bg-slate-200" />
                            <div className="h-16 w-full rounded-xl bg-slate-100" />
                            <div className="h-8 w-1/4 rounded-lg bg-slate-200" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State when no orders at all */}
            {!loading && orders.length === 0 && (
                <section className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600 shadow-soft">
                        <ShoppingBag className="h-10 w-10" strokeWidth={1.8} />
                    </div>
                    <h2 className="mt-5 text-2xl font-black text-slate-900">Bạn chưa có đơn mua nào</h2>
                    <p className="mt-2 max-w-md text-sm text-slate-500">
                        Khám phá các sản phẩm phân bón, thuốc bảo vệ thực vật và thiết bị nông nghiệp từ
                        các cửa hàng uy tín đã được xác thực.
                    </p>
                    <Button
                        asChild
                        className="mt-6 h-12 rounded-2xl bg-brand-600 px-6 font-bold text-white shadow-soft hover:bg-brand-700"
                    >
                        <Link href="/materials">Khám phá chợ vật tư</Link>
                    </Button>
                </section>
            )}

            {/* Empty State when filtering/search returns 0 */}
            {!loading && orders.length > 0 && filteredOrders.length === 0 && (
                <div className="flex min-h-[35vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <Filter className="h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-bold text-slate-800">Không tìm thấy đơn hàng nào</p>
                    <p className="mt-1 text-xs text-slate-500">
                        Thử chọn trạng thái khác hoặc xóa từ khóa tìm kiếm.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setActiveTab("ALL");
                            setSearchQuery("");
                        }}
                        className="mt-4 rounded-full"
                    >
                        Đặt lại bộ lọc
                    </Button>
                </div>
            )}

            {/* Orders List */}
            {!loading && filteredOrders.length > 0 && (
                <div className="space-y-4">
                    {filteredOrders.map((order) => {
                        const orderStatus = getOrderStatusInfo(order.status);
                        const paymentStatus = getPaymentStatusInfo(
                            order.paymentStatus,
                            order.paymentMethod,
                            order.status,
                        );
                        const shippingStatus = getShippingStatusInfo(order.status);
                        const totalItemsCount = order.items.reduce(
                            (sum, it) => sum + it.quantity,
                            0,
                        );
                        const subtotalNum = Number(order.subtotal);
                        const shippingFeeNum = Number(order.shippingFee);
                        const totalAmount = subtotalNum + shippingFeeNum;

                        return (
                            <article
                                key={order.id}
                                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md"
                            >
                                {/* 1. PHẦN ĐẦU CARD */}
                                <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-slate-900">
                                                    Mã đơn: {order.orderCode}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(order.orderCode)}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
                                                    title="Sao chép mã đơn"
                                                >
                                                    {copiedCode === order.orderCode ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                                    <Store className="h-3.5 w-3.5 text-brand-600" />
                                                    {order.store.name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                    {formatOrderDateTime(order.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 3 Status Badges */}
                                        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                                            {/* Trạng thái đơn hàng */}
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${orderStatus.badgeBg}`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${orderStatus.badgeDot}`}
                                                />
                                                {orderStatus.label}
                                            </span>

                                            {/* Trạng thái thanh toán */}
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${paymentStatus.badgeBg}`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${paymentStatus.badgeDot}`}
                                                />
                                                {paymentStatus.label}
                                            </span>

                                            {/* Trạng thái giao hàng */}
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${shippingStatus.badgeBg}`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${shippingStatus.badgeDot}`}
                                                />
                                                {shippingStatus.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. PHẦN GIỮA CARD: TÓM TẮT SẢN PHẨM & GIAO NHẬN */}
                                <div className="p-4 sm:p-5">
                                    <div className="space-y-2.5 divide-y divide-slate-100">
                                        {order.items.map((item) => {
                                            const itemPrice = Number(item.unitPrice);
                                            const itemSubtotal = itemPrice * item.quantity;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-start justify-between gap-3 pt-2.5 first:pt-0"
                                                >
                                                    <div className="flex min-w-0 items-start gap-3">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
                                                            {item.productImage ? (
                                                                <img
                                                                    src={item.productImage}
                                                                    alt={item.productName}
                                                                    className="h-full w-full object-contain"
                                                                />
                                                            ) : (
                                                                <Package className="h-6 w-6 stroke-[1.5]" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="line-clamp-1 font-bold text-slate-900 text-sm sm:text-base">
                                                                {item.productName}
                                                            </h3>
                                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                                                <span>
                                                                    Số lượng:{" "}
                                                                    <b className="text-slate-800">
                                                                        {item.quantity} {item.unit}
                                                                    </b>
                                                                </span>
                                                                <span>•</span>
                                                                <span>
                                                                    Đơn giá:{" "}
                                                                    <b className="text-slate-800">
                                                                        {formatPrice(itemPrice)}/{item.unit}
                                                                    </b>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {formatPrice(itemSubtotal)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Tóm tắt số lượng & Giao nhận */}
                                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <Truck className="h-3.5 w-3.5 text-slate-400" />
                                            <span>
                                                Giao tới: <b className="text-slate-800">{order.recipientName}</b> ({order.recipientPhone}) -{" "}
                                                <span className="text-slate-500">{order.shippingAddress}</span>
                                            </span>
                                        </div>
                                        <span className="font-semibold text-slate-700">
                                            {totalItemsCount} món ({order.items.length} mặt hàng)
                                        </span>
                                    </div>

                                    {/* 3. PHẦN TIỀN */}
                                    <div className="mt-4 flex flex-col justify-between gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-end">
                                        <div className="text-xs text-slate-500 space-y-0.5">
                                            <p>
                                                Tiền hàng: <span className="font-semibold text-slate-700">{formatPrice(subtotalNum)}</span>
                                            </p>
                                            <p>
                                                Phí vận chuyển: <span className="font-semibold text-slate-700">{formatPrice(shippingFeeNum)}</span>
                                            </p>
                                        </div>

                                        <div className="text-left sm:text-right">
                                            <span className="text-xs text-slate-500">Tổng thanh toán:</span>
                                            <p className="text-lg font-black text-brand-700 sm:text-xl">
                                                {formatPrice(totalAmount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 4. PHẦN CUỐI: NÚT HÀNH ĐỘNG */}
                                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                        {order.store.phone && (
                                            <a
                                                href={`tel:${order.store.phone}`}
                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                <Phone className="h-3.5 w-3.5 text-brand-600" />
                                                <span>Gọi cửa hàng</span>
                                            </a>
                                        )}

                                        {order.status === "PENDING" && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCancellingId(order.id)}
                                                className="rounded-xl border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                                            >
                                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                                Hủy đơn
                                            </Button>
                                        )}

                                        <Button
                                            asChild
                                            size="sm"
                                            className="rounded-xl bg-brand-600 text-xs font-bold text-white shadow-soft hover:bg-brand-700"
                                        >
                                            <Link href={`/orders/${order.id}`}>
                                                <span>Xem chi tiết</span>
                                                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Modal Xác nhận Hủy đơn */}
            {cancellingId && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <XCircle className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-900">
                            Xác nhận hủy đơn mua này?
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Đơn hàng đang ở trạng thái <b>Chờ xác nhận</b> và chưa xuất kho. Khi bạn hủy,
                            hệ thống sẽ thông báo tới cửa hàng và hủy bỏ đơn này.
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={cancellingBusy}
                                onClick={() => setCancellingId(null)}
                                className="rounded-xl font-medium"
                            >
                                Đóng
                            </Button>
                            <Button
                                type="button"
                                disabled={cancellingBusy}
                                onClick={() => void handleConfirmCancel()}
                                className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700"
                            >
                                {cancellingBusy ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        <span>Đang hủy...</span>
                                    </>
                                ) : (
                                    "Xác nhận hủy đơn"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
