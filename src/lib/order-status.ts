export type OrderStatusKey =
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY_FOR_DELIVERY"
    | "SHIPPING"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED";

export interface StatusMeta {
    key: string;
    label: string;
    badgeBg: string;
    badgeDot: string;
    description: string;
}

export const ORDER_STATUS_MAP: Record<string, StatusMeta> = {
    PENDING: {
        key: "PENDING",
        label: "Chờ xác nhận",
        badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
        badgeDot: "bg-amber-500",
        description: "Đơn hàng đang chờ cửa hàng kiểm tra và xác nhận.",
    },
    CONFIRMED: {
        key: "CONFIRMED",
        label: "Đã xác nhận",
        badgeBg: "bg-sky-50 text-sky-800 border-sky-200",
        badgeDot: "bg-sky-500",
        description: "Cửa hàng đã tiếp nhận và xác nhận đơn hàng.",
    },
    PREPARING: {
        key: "PREPARING",
        label: "Đang chuẩn bị hàng",
        badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
        badgeDot: "bg-blue-500",
        description: "Cửa hàng đang đóng gói và chuẩn bị hàng xuất kho.",
    },
    READY_FOR_DELIVERY: {
        key: "READY_FOR_DELIVERY",
        label: "Sẵn sàng giao",
        badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200",
        badgeDot: "bg-indigo-500",
        description: "Kiện hàng đã đóng gói xong, chuẩn bị bàn giao cho vận chuyển.",
    },
    SHIPPING: {
        key: "SHIPPING",
        label: "Đang giao hàng",
        badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
        badgeDot: "bg-purple-500",
        description: "Đơn hàng đang được vận chuyển đến địa chỉ của bạn.",
    },
    DELIVERED: {
        key: "DELIVERED",
        label: "Đã giao hàng",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        badgeDot: "bg-emerald-500",
        description: "Kiện hàng đã được giao thành công.",
    },
    COMPLETED: {
        key: "COMPLETED",
        label: "Hoàn tất",
        badgeBg: "bg-emerald-100/90 text-emerald-900 border-emerald-300",
        badgeDot: "bg-emerald-600",
        description: "Đơn hàng đã hoàn tất giao dịch thành công.",
    },
    CANCELLED: {
        key: "CANCELLED",
        label: "Đã hủy",
        badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
        badgeDot: "bg-slate-400",
        description: "Đơn hàng đã được hủy bỏ.",
    },
    REJECTED: {
        key: "REJECTED",
        label: "Từ chối",
        badgeBg: "bg-red-50 text-red-800 border-red-200",
        badgeDot: "bg-red-500",
        description: "Cửa hàng đã từ chối nhận đơn hàng này.",
    },
};

export function getOrderStatusInfo(status: string): StatusMeta {
    return (
        ORDER_STATUS_MAP[status] ?? {
            key: status,
            label: status,
            badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
            badgeDot: "bg-slate-400",
            description: "Trạng thái đơn hàng",
        }
    );
}

export function getPaymentStatusInfo(
    paymentStatus?: string | null,
    paymentMethod = "COD",
    orderStatus = "PENDING",
): { label: string; badgeBg: string; badgeDot: string } {
    if (paymentStatus === "PAID" || orderStatus === "COMPLETED") {
        return {
            label: "Đã thanh toán",
            badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
            badgeDot: "bg-emerald-500",
        };
    }
    if (paymentStatus === "PARTIAL") {
        return {
            label: "Thanh toán 1 phần",
            badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
            badgeDot: "bg-amber-500",
        };
    }
    if (paymentMethod === "COD" || !paymentMethod) {
        return {
            label: "Chưa thu (COD)",
            badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
            badgeDot: "bg-slate-400",
        };
    }
    return {
        label: "Chưa thanh toán",
        badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
        badgeDot: "bg-amber-500",
    };
}

export function getShippingStatusInfo(orderStatus: string): {
    label: string;
    badgeBg: string;
    badgeDot: string;
} {
    switch (orderStatus) {
        case "PENDING":
            return {
                label: "Chờ xử lý",
                badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
                badgeDot: "bg-amber-500",
            };
        case "CONFIRMED":
        case "PREPARING":
        case "READY_FOR_DELIVERY":
            return {
                label: "Chưa giao",
                badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
                badgeDot: "bg-blue-500",
            };
        case "SHIPPING":
            return {
                label: "Đang giao",
                badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
                badgeDot: "bg-purple-500",
            };
        case "DELIVERED":
        case "COMPLETED":
            return {
                label: "Đã giao",
                badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
                badgeDot: "bg-emerald-500",
            };
        case "CANCELLED":
            return {
                label: "Đã hủy",
                badgeBg: "bg-slate-100 text-slate-600 border-slate-200",
                badgeDot: "bg-slate-400",
            };
        case "REJECTED":
            return {
                label: "Giao thất bại",
                badgeBg: "bg-red-50 text-red-700 border-red-200",
                badgeDot: "bg-red-500",
            };
        default:
            return {
                label: "Chờ xử lý",
                badgeBg: "bg-slate-100 text-slate-600 border-slate-200",
                badgeDot: "bg-slate-400",
            };
    }
}

export function getHistoryTitle(toStatus: string): string {
    switch (toStatus) {
        case "PENDING":
            return "Đơn hàng đã được tạo";
        case "CONFIRMED":
            return "Đã xác nhận đơn hàng";
        case "PREPARING":
            return "Đang chuẩn bị hàng & đóng gói";
        case "READY_FOR_DELIVERY":
            return "Sẵn sàng bàn giao vận chuyển";
        case "SHIPPING":
            return "Đang giao hàng";
        case "DELIVERED":
            return "Giao hàng thành công";
        case "COMPLETED":
            return "Đơn hàng đã hoàn tất";
        case "CANCELLED":
            return "Đã hủy đơn hàng";
        case "REJECTED":
            return "Cửa hàng từ chối đơn hàng";
        default:
            return `Cập nhật: ${toStatus}`;
    }
}

export function formatPrice(amount: number | string | null | undefined): string {
    if (amount == null) return "0 đ";
    const num = typeof amount === "string" ? Number(amount) : amount;
    if (isNaN(num)) return "0 đ";
    return `${num.toLocaleString("vi-VN")} đ`;
}

export function formatOrderDateTime(dateStr?: string | Date | null): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
}
