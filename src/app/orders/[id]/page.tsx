import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { authOptions } from "@/lib/auth";
import {
    formatOrderDateTime,
    formatPrice,
    getOrderStatusInfo,
} from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import {
    OrderDetailBottomActions,
    OrderDetailHeaderActions,
} from "@/components/orders/order-detail-actions";

type StepperStep = {
    key: string;
    label: string;
    status: "DONE" | "CURRENT" | "UPCOMING";
    time?: string | null;
    color: "amber" | "blue" | "purple" | "emerald" | "red" | "slate";
};

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const order = await prisma.order.findFirst({
        where: { id: params.id, farmerId: session.user.id, deletedAt: null },
        include: {
            store: true,
            items: true,
            histories: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!order) notFound();

    const orderStatus = getOrderStatusInfo(order.status);
    const subtotal = Number(order.subtotal);
    const shippingFee = Number(order.shippingFee);
    const totalAmount = subtotal + shippingFee;

    // Build Stepper Steps
    const isCancelled = ["CANCELLED", "REJECTED"].includes(order.status);
    const findHistoryTime = (statuses: string[]) => {
        const h = order.histories.find((item) => statuses.includes(item.toStatus));
        return h ? formatOrderDateTime(h.createdAt) : null;
    };

    let steps: StepperStep[] = [];

    if (isCancelled) {
        const isRejected = order.status === "REJECTED";
        const cancelTime =
            order.cancelledAt ||
            findHistoryTime(["CANCELLED", "REJECTED"]) ||
            order.updatedAt;

        steps = [
            {
                key: "CREATED",
                label: "Đơn đã tạo",
                status: "DONE",
                time: formatOrderDateTime(order.createdAt),
                color: "emerald",
            },
            {
                key: "CANCELLED",
                label: isRejected ? "Từ chối" : "Đã hủy",
                status: "CURRENT",
                time: formatOrderDateTime(cancelTime),
                color: isRejected ? "red" : "slate",
            },
        ];
    } else {
        const isCompleted = ["DELIVERED", "COMPLETED"].includes(order.status);
        const isShipping = order.status === "SHIPPING" || isCompleted;
        const isPreparing =
            ["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY"].includes(order.status) ||
            isShipping;

        steps = [
            {
                key: "CREATED",
                label: "Đơn đã tạo",
                status: "DONE",
                time: formatOrderDateTime(order.createdAt),
                color: "emerald",
            },
            {
                key: "PENDING",
                label: "Chờ xác nhận",
                status: isPreparing ? "DONE" : "CURRENT",
                time: findHistoryTime(["PENDING"]) || formatOrderDateTime(order.createdAt),
                color: isPreparing ? "emerald" : "amber",
            },
            {
                key: "PREPARING",
                label: "Chuẩn bị hàng",
                status: isShipping ? "DONE" : isPreparing ? "CURRENT" : "UPCOMING",
                time: findHistoryTime(["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY"]),
                color: isShipping ? "emerald" : isPreparing ? "blue" : "slate",
            },
            {
                key: "SHIPPING",
                label: "Đang giao",
                status: isCompleted
                    ? "DONE"
                    : order.status === "SHIPPING"
                    ? "CURRENT"
                    : "UPCOMING",
                time: findHistoryTime(["SHIPPING"]),
                color: isCompleted
                    ? "emerald"
                    : order.status === "SHIPPING"
                    ? "purple"
                    : "slate",
            },
            {
                key: "COMPLETED",
                label: "Hoàn tất",
                status: isCompleted ? "DONE" : "UPCOMING",
                time: findHistoryTime(["DELIVERED", "COMPLETED"]),
                color: isCompleted ? "emerald" : "slate",
            },
        ];
    }

    return (
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
            {/* Top Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                    href="/orders"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:text-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Quay lại đơn mua</span>
                </Link>

                <div className="flex items-center gap-2">
                    <OrderDetailHeaderActions orderCode={order.orderCode} />
                    <Link
                        href="/materials"
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                    >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Mua thêm vật tư</span>
                    </Link>
                </div>
            </div>

            {/* Title Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                        Chi tiết đơn {order.orderCode}
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        Ngày đặt: {formatOrderDateTime(order.createdAt)} • Cửa hàng: {order.store.name}
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs sm:text-sm font-bold ${orderStatus.badgeBg}`}
                    >
                        <span className={`h-2 w-2 rounded-full ${orderStatus.badgeDot}`} />
                        {orderStatus.label}
                    </span>
                </div>
            </div>

            {/* Container tài liệu / Hóa đơn chi tiết */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-7">
                {/* ========================================================= */}
                {/* 1. THÔNG TIN CHUNG ĐƠN HÀNG (DỌC) */}
                {/* ========================================================= */}
                <section className="space-y-3">
                    <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                        1. Thông tin chung đơn hàng
                    </h2>

                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Mã đơn hàng:</span>
                            <span className="font-mono font-bold text-slate-900">{order.orderCode}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Ngày đặt:</span>
                            <span className="text-slate-900">{formatOrderDateTime(order.createdAt)}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Cửa hàng:</span>
                            <span className="text-slate-900 font-semibold">{order.store.name}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Thanh toán:</span>
                            <span className="text-slate-900">
                                {order.paymentMethod === "COD" || !order.paymentMethod
                                    ? "Thanh toán khi nhận hàng (COD)"
                                    : order.paymentMethod}
                            </span>
                        </div>
                    </div>
                </section>

                {/* ========================================================= */}
                {/* 2. THÔNG TIN GIAO NHẬN (DỌC) */}
                {/* ========================================================= */}
                <section className="space-y-3 border-t border-slate-200 pt-6">
                    <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                        2. Thông tin giao nhận
                    </h2>

                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Người nhận:</span>
                            <span className="font-bold text-slate-900">{order.recipientName}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Số điện thoại:</span>
                            <span className="text-slate-900 font-semibold">{order.recipientPhone}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Địa chỉ nhận:</span>
                            <span className="text-slate-900 font-medium">{order.shippingAddress}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Phương thức giao:</span>
                            <span className="text-slate-900">Giao tận nơi</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start">
                            <span className="w-40 text-slate-500 shrink-0 font-medium">Ghi chú giao hàng:</span>
                            <span className="text-slate-700">
                                {order.note ? order.note : "Không có ghi chú"}
                            </span>
                        </div>

                        {order.rejectionReason && (
                            <div className="flex flex-col sm:flex-row sm:items-start text-red-600">
                                <span className="w-40 shrink-0 font-semibold">Lý do từ chối:</span>
                                <span className="font-medium">{order.rejectionReason}</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* ========================================================= */}
                {/* 3 & 4. BILL HÓA ĐƠN: DANH SÁCH SẢN PHẨM & TỔNG TIỀN */}
                {/* ========================================================= */}
                <section className="space-y-3 border-t border-slate-200 pt-6">
                    <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                        3. Danh sách sản phẩm
                    </h2>

                    {/* Bảng hóa đơn (Receipt Table) */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-300 text-xs font-bold text-slate-700">
                                    <th className="py-2.5 pr-4">Sản phẩm</th>
                                    <th className="py-2.5 px-3 text-center">SL</th>
                                    <th className="py-2.5 px-3 text-center">Đơn vị</th>
                                    <th className="py-2.5 px-4 text-right">Đơn giá</th>
                                    <th className="py-2.5 pl-4 text-right">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {order.items.map((item) => {
                                    const unitPrice = Number(item.unitPrice);
                                    const lineTotal = unitPrice * item.quantity;
                                    return (
                                        <tr key={item.id}>
                                            <td className="py-3 pr-4 font-semibold text-slate-900">
                                                {item.productName}
                                            </td>
                                            <td className="py-3 px-3 text-center text-slate-800 font-medium">
                                                {item.quantity}
                                            </td>
                                            <td className="py-3 px-3 text-center text-slate-600">
                                                {item.unit}
                                            </td>
                                            <td className="py-3 px-4 text-right text-slate-700">
                                                {formatPrice(unitPrice)}
                                            </td>
                                            <td className="py-3 pl-4 text-right font-bold text-slate-900">
                                                {formatPrice(lineTotal)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* Phần Tổng tiền theo định dạng Bill */}
                            <tfoot>
                                <tr className="border-t border-slate-300">
                                    <td colSpan={3} className="pt-4" />
                                    <td className="pt-4 px-4 text-right text-slate-600 text-sm">
                                        Tiền hàng:
                                    </td>
                                    <td className="pt-4 pl-4 text-right font-semibold text-slate-900 text-sm">
                                        {formatPrice(subtotal)}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="py-1" />
                                    <td className="py-1 px-4 text-right text-slate-600 text-sm">
                                        Phí vận chuyển:
                                    </td>
                                    <td className="py-1 pl-4 text-right font-semibold text-slate-900 text-sm">
                                        {formatPrice(shippingFee)}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="py-1" />
                                    <td className="py-1 px-4 text-right text-slate-600 text-sm">
                                        Giảm giá:
                                    </td>
                                    <td className="py-1 pl-4 text-right text-slate-600 text-sm">
                                        0 đ
                                    </td>
                                </tr>
                                <tr className="border-t-2 border-slate-800">
                                    <td colSpan={3} className="pt-3" />
                                    <td className="pt-3 px-4 text-right font-black text-slate-900 text-base">
                                        Tổng thanh toán:
                                    </td>
                                    <td className="pt-3 pl-4 text-right font-black text-brand-700 text-lg">
                                        {formatPrice(totalAmount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                {/* ========================================================= */}
                {/* 4. STEPPER LỊCH SỬ TRẠNG THÁI */}
                {/* ========================================================= */}
                <section className="space-y-4 border-t border-slate-200 pt-6">
                    <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                        4. Lịch sử trạng thái
                    </h2>

                    {/* Stepper ngang (Responsive) */}
                    <div className="pt-3 pb-2">
                        <div className="relative flex items-start justify-between">
                            {steps.map((step, index) => {
                                const isLast = index === steps.length - 1;
                                const isDone = step.status === "DONE";
                                const isCurrent = step.status === "CURRENT";

                                return (
                                    <div
                                        key={step.key}
                                        className="relative flex flex-1 flex-col items-center text-center px-1"
                                    >
                                        {/* Thanh nối ngang */}
                                        {!isLast && (
                                            <div
                                                className={`absolute left-1/2 top-3 h-0.5 w-full ${
                                                    isDone && steps[index + 1]?.status !== "UPCOMING"
                                                        ? "bg-emerald-500"
                                                        : "bg-slate-200"
                                                }`}
                                                style={{ zIndex: 0 }}
                                            />
                                        )}

                                        {/* Điểm mốc trạng thái */}
                                        <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white">
                                            {isDone ? (
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                                                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                                </div>
                                            ) : isCurrent ? (
                                                <div className="relative flex h-6 w-6 items-center justify-center">
                                                    {/* Pulse nhẹ nhàng */}
                                                    <span
                                                        className={`absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping ${
                                                            step.color === "amber"
                                                                ? "bg-amber-400"
                                                                : step.color === "blue"
                                                                ? "bg-blue-400"
                                                                : step.color === "purple"
                                                                ? "bg-purple-400"
                                                                : step.color === "red"
                                                                ? "bg-red-400"
                                                                : "bg-slate-400"
                                                        }`}
                                                        style={{ animationDuration: "2s" }}
                                                    />
                                                    <div
                                                        className={`relative flex h-6 w-6 items-center justify-center rounded-full ring-4 shadow-xs ${
                                                            step.color === "amber"
                                                                ? "bg-amber-500 ring-amber-100"
                                                                : step.color === "blue"
                                                                ? "bg-blue-600 ring-blue-100"
                                                                : step.color === "purple"
                                                                ? "bg-purple-600 ring-purple-100"
                                                                : step.color === "red"
                                                                ? "bg-red-600 ring-red-100"
                                                                : "bg-slate-500 ring-slate-100"
                                                        }`}
                                                    >
                                                        <span className="h-2 w-2 rounded-full bg-white" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Tên bước & Thời gian (Đồng nhất cỡ chữ) */}
                                        <div className="mt-2.5 space-y-0.5">
                                            <p
                                                className={`text-xs sm:text-sm leading-tight ${
                                                    isDone
                                                        ? "font-semibold text-slate-800"
                                                        : isCurrent
                                                        ? "font-bold text-slate-900"
                                                        : "font-medium text-slate-400"
                                                }`}
                                            >
                                                {step.label}
                                            </p>
                                            {step.time && (
                                                <p className="text-[11px] sm:text-xs text-slate-500 font-normal">
                                                    {step.time}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Chi tiết ghi chú nhật ký (Dạng text đồng nhất, không badge) */}
                    {order.histories.some((h) => h.note) && (
                        <div className="border-t border-slate-100 pt-3 space-y-1 text-xs text-slate-600">
                            <p className="font-semibold text-slate-700">Chi tiết nhật ký:</p>
                            {order.histories
                                .filter((h) => h.note)
                                .map((h) => (
                                    <p key={h.id} className="text-slate-600">
                                        • <span className="font-medium text-slate-700">{formatOrderDateTime(h.createdAt)}:</span> {h.note}
                                    </p>
                                ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <Link
                    href="/orders"
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                    ← Về danh sách đơn mua
                </Link>

                <OrderDetailBottomActions
                    orderId={order.id}
                    orderCode={order.orderCode}
                    status={order.status}
                    storePhone={order.store.phone}
                />
            </div>
        </main>
    );
}
