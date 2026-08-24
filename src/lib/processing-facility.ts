/** Labels shared by persisted processing views. No business data is synthesized here. */
export function formatStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        PENDING_QC: "Chờ kiểm tra", WAITING_INSPECTION: "Chờ kiểm tra", AVAILABLE: "Sẵn sàng",
        ACCEPTED: "Đạt", QUARANTINED: "Cách ly", REJECTED: "Không đạt",
        PARTIALLY_USED: "Đã dùng một phần", USED: "Đã sử dụng", STORED: "Đang lưu", CLOSED: "Đã đóng lô",
        PREPARING: "Chuẩn bị", IN_PROGRESS: "Đang chế biến", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy",
        DRAFT: "Bản nháp", READY_FOR_DISTRIBUTION: "Sẵn sàng phân phối",
        PARTIALLY_DISTRIBUTED: "Đã phân phối một phần", DISTRIBUTED: "Đã phân phối", RECALLED: "Đã thu hồi",
        PENDING: "Chờ giao", READY: "Sẵn sàng giao", DISPATCHED: "Đã xuất hàng", IN_TRANSIT: "Đang giao", RECEIVED: "Đã nhận",
    };
    return labels[status] || status;
}
