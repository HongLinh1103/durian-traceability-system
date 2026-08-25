/** Labels shared by persisted processing views. */
export function formatStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        PENDING_QC: "Chờ QC",
        WAITING_INSPECTION: "Chờ QC",
        AVAILABLE: "Sẵn sàng chế biến",
        ACCEPTED: "QC đạt",
        QUARANTINED: "QC có điều kiện",
        REJECTED: "QC không đạt",
        PARTIALLY_USED: "Đang sử dụng",
        USED: "Đã sử dụng hết",
        STORED: "Đang lưu kho",
        CLOSED: "Đã đóng lô",
        DRAFT: "Bản nháp",
        PREPARING: "Chuẩn bị chế biến",
        IN_PROGRESS: "Đang chế biến",
        PAUSED: "Tạm dừng",
        COMPLETED: "Đã hoàn tất",
        CANCELLED: "Đã hủy",
        READY_FOR_DISTRIBUTION: "Sẵn sàng phân phối",
        PARTIALLY_DISTRIBUTED: "Đã phân phối một phần",
        DISTRIBUTED: "Đã phân phối hết",
        RECALLED: "Đã thu hồi",
        PENDING: "Chờ giao",
        READY: "Sẵn sàng giao",
        DISPATCHED: "Đã xuất hàng",
        IN_TRANSIT: "Đang giao",
        RECEIVED: "Đã nhận",
    };
    return labels[status] || status;
}

export function getStatusBadgeVariant(status: string): { label: string; bg: string; text: string; border: string } {
    switch (status) {
        case "AVAILABLE":
        case "ACCEPTED":
        case "COMPLETED":
        case "READY_FOR_DISTRIBUTION":
            return { label: formatStatusLabel(status), bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
        case "IN_PROGRESS":
        case "PARTIALLY_USED":
        case "PARTIALLY_DISTRIBUTED":
            return { label: formatStatusLabel(status), bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" };
        case "PENDING_QC":
        case "WAITING_INSPECTION":
        case "QUARANTINED":
        case "PAUSED":
        case "PREPARING":
            return { label: formatStatusLabel(status), bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
        case "REJECTED":
        case "CANCELLED":
        case "RECALLED":
            return { label: formatStatusLabel(status), bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
        default:
            return { label: formatStatusLabel(status), bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
    }
}

export function calculateYield(inputWeight: number, outputWeight: number) {
    if (inputWeight <= 0) return { lossWeight: 0, yieldPercent: 0 };
    const loss = Math.max(0, inputWeight - outputWeight);
    const yieldPct = Number(((outputWeight / inputWeight) * 100).toFixed(2));
    return { lossWeight: loss, yieldPercent: yieldPct };
}

