/**
 * Shared configurations, helpers, and types for the Processing Facility (Cơ sở chế biến).
 */

export const PROCESSING_STEPS_CONFIG = [
    {
        order: 1,
        type: "CLEANING",
        name: "Làm sạch",
        shortName: "1. Làm sạch",
        description: "Rửa sạch bụi bẩn, tạp chất và khử trùng vỏ ngoài",
        required: true,
    },
    {
        order: 2,
        type: "PEELING_PULP_SEPARATION",
        name: "Tách vỏ - Tách múi",
        shortName: "2. Tách múi",
        description: "Tách múi sầu riêng ra khỏi vỏ và loại bỏ hạt/xơ",
        required: true,
    },
    {
        order: 3,
        type: "REJECT_REMOVAL",
        name: "Loại bỏ phần không đạt",
        shortName: "3. Lọc bỏ",
        description: "Lọc bỏ phần dập, quá chín, sượng hoặc khuyết tật",
        required: true,
    },
    {
        order: 4,
        type: "FINAL_WEIGHING",
        name: "Cân thành phẩm",
        shortName: "4. Cân SP",
        description: "Cân định lượng múi sầu riêng đạt chuẩn chất lượng",
        required: true,
    },
    {
        order: 5,
        type: "PACKAGING",
        name: "Đóng gói",
        shortName: "5. Đóng gói",
        description: "Đóng khay/túi hút chân không theo quy cách",
        required: true,
    },
] as const;

export type ProcessingStepKey = (typeof PROCESSING_STEPS_CONFIG)[number]["type"];

export const QC_APPEARANCE_OPTIONS = [
    "Đạt yêu cầu",
    "Có khuyết tật nhẹ",
    "Khuyết tật đáng kể",
    "Không đạt",
] as const;

export const QC_RIPENESS_OPTIONS = [
    "Đạt độ chín yêu cầu",
    "Chưa đạt độ chín",
    "Chín cao",
    "Quá chín",
    "Không đánh giá",
] as const;

export const QC_GRADE_OPTIONS = ["Loại A", "Loại B", "Loại C", "Không phân hạng"] as const;

export const QC_RESIDUE_OPTIONS = [
    "Đạt yêu cầu",
    "Không đạt yêu cầu",
    "Đang chờ kết quả",
    "Chưa kiểm tra",
] as const;

export const QC_REJECT_REASONS = [
    "Dư lượng không đạt",
    "Tỷ lệ hư hỏng vượt mức",
    "Ngoại quan không đạt",
    "Sai giống / sai thông tin",
    "Không đảm bảo độ chín",
    "Nhiễm tạp chất",
    "Có dấu hiệu sâu bệnh",
    "Không đủ hồ sơ truy xuất",
    "Khác",
] as const;

export const REJECT_REMOVAL_REASONS = [
    "Dập / hư hỏng",
    "Quá chín",
    "Chưa đạt độ chín",
    "Màu sắc không đạt",
    "Mùi bất thường",
    "Nhiễm tạp chất",
    "Khác",
] as const;

export const PACKAGING_OPTIONS = [
    "250g/túi",
    "500g/túi",
    "1kg/túi",
    "5kg/thùng",
    "Hộp 500g",
    "Hộp 1kg",
    "Thùng carton 10kg",
    "Thùng xốp 18kg",
    "Khác",
] as const;

export const FREEZING_METHODS = [
    "Tách múi & Cấp đông nhanh (IQF)",
    "IQF (Cấp đông nhanh cá thể)",
    "Cấp đông gió",
    "Kho đông",
    "Đóng khay tươi bảo quản lạnh",
    "Khác",
] as const;

export const FINISHED_QC_RESULTS = ["Đạt", "Đạt có điều kiện", "Không đạt"] as const;

export const PRODUCTION_LINES = [
    "Dây chuyền 1 (Tách múi IQF)",
    "Dây chuyền 2 (Sấy thăng hoa)",
    "Dây chuyền 3 (Đóng gói tươi)",
    "Dây chuyền 4 (Kho lạnh)",
] as const;

/** Labels shared by persisted processing views. */
export function formatStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        WAITING_CONFIRMATION: "Mới / Chờ xác nhận",
        CONFIRMED: "Sắp giao",
        DELIVERY_CONFIRMED: "Đang vận chuyển",
        DISPATCHED: "Đang vận chuyển",
        IN_TRANSIT: "Đang vận chuyển",
        PENDING_QC: "Chờ QC",
        WAITING_INSPECTION: "Chờ QC",
        AVAILABLE: "Sẵn sàng chế biến",
        ACCEPTED: "QC đạt",
        QUARANTINED: "Cách ly",
        REJECTED: "Không đạt",
        PARTIALLY_USED: "Đã dùng một phần",
        USED: "Đã sử dụng hết",
        STORED: "Đang lưu kho",
        CLOSED: "Đã đóng lô",
        DRAFT: "Bản nháp",
        PREPARING: "Chuẩn bị chế biến",
        IN_PROGRESS: "Đang chế biến",
        PAUSED: "Tạm dừng",
        WAITING_FINISHED_QC: "Đã đóng gói / Chờ QC TP",
        PACKAGING_COMPLETED: "Đã đóng gói / Chờ QC TP",
        COMPLETED: "Hoàn tất chế biến",
        CANCELLED: "Đã hủy",
        WAITING_WAREHOUSE_IN: "QC đạt / Chờ nhập kho",
        QC_PASSED: "QC đạt / Chờ nhập kho",
        QC_FAILED: "QC Không đạt",
        READY_FOR_DISTRIBUTION: "Sẵn sàng phân phối",
        PARTIALLY_DISTRIBUTED: "Đã phân bổ một phần",
        DISTRIBUTED: "Đã phân phối hết",
        QC_HOLD: "Tạm giữ QC",
        RECALLED: "Đã thu hồi",
        PENDING: "Chờ thực hiện",
        SKIPPED: "Đã bỏ qua",
    };
    return labels[status] || status;
}

export function getStatusBadgeVariant(status: string): { label: string; bg: string; text: string; border: string } {
    switch (status) {
        case "AVAILABLE":
        case "ACCEPTED":
        case "COMPLETED":
        case "READY_FOR_DISTRIBUTION":
        case "QC_PASSED":
            return { label: formatStatusLabel(status), bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
        case "IN_PROGRESS":
        case "PARTIALLY_USED":
        case "PARTIALLY_DISTRIBUTED":
        case "WAITING_WAREHOUSE_IN":
            return { label: formatStatusLabel(status), bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" };
        case "PENDING_QC":
        case "WAITING_FINISHED_QC":
        case "PACKAGING_COMPLETED":
        case "WAITING_INSPECTION":
        case "WAITING_CONFIRMATION":
        case "CONFIRMED":
        case "QUARANTINED":
        case "PAUSED":
        case "PREPARING":
        case "PENDING":
            return { label: formatStatusLabel(status), bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
        case "REJECTED":
        case "CANCELLED":
        case "RECALLED":
        case "QC_HOLD":
        case "QC_FAILED":
            return { label: formatStatusLabel(status), bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
        default:
            return { label: formatStatusLabel(status), bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
    }
}

export function calculateYield(
    totalInputWeight: number,
    totalOutputWeight: number
): { lossWeight: number; yieldPercent: number } {
    const input = Math.max(0, Number(totalInputWeight) || 0);
    const output = Math.max(0, Number(totalOutputWeight) || 0);
    const lossWeight = Math.max(0, input - output);
    const yieldPercent = input > 0 ? Number(((output / input) * 100).toFixed(2)) : 0;
    return { lossWeight, yieldPercent };
}
