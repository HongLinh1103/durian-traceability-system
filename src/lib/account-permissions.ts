export type AccountPermission = { key: string; label: string; path: string };

export const ROLE_LABELS: Record<string, string> = {
    AREA_MANAGER: "Trưởng ban", FARMER: "Nông dân", COLLECTOR: "Vựa thu mua",
    PROCESSING_FACILITY: "Cơ sở chế biến", STORE_OWNER: "Cửa hàng vật tư",
};

const shared: AccountPermission[] = [{ key: "ACCOUNT_PROFILE", label: "Thông tin tài khoản", path: "/account" }];

export const ACCOUNT_PERMISSIONS_BY_ROLE: Record<string, AccountPermission[]> = {
    FARMER: [
        { key: "FARMER_DASHBOARD", label: "Tổng quan nông hộ", path: "/dashboard/farmer" },
        { key: "FARMER_JOURNAL", label: "Nhật ký canh tác", path: "/dashboard/farmer/journal" },
        { key: "FARMER_STATISTICS", label: "Tài chính & Thống kê", path: "/dashboard/farmer/statistics" },
        { key: "FARMER_PLANS", label: "Kế hoạch canh tác", path: "/dashboard/farmer/plans" },
        { key: "FARMER_HARVESTS", label: "Phiếu thu hoạch", path: "/dashboard/farmer/harvests" },
        { key: "FARMER_TRACEABILITY", label: "Tạo mã QR truy xuất", path: "/dashboard/farmer/traceability" },
        { key: "MATERIAL_CATALOG", label: "Danh mục vật tư", path: "/materials" },
        { key: "MATERIAL_STORES", label: "Cửa hàng vật tư", path: "/materials/stores" },
        { key: "FARMER_CART", label: "Giỏ hàng", path: "/cart" },
        { key: "FARMER_ORDERS", label: "Đơn mua của tôi", path: "/orders" },
        { key: "DOCUMENTS", label: "Tài liệu", path: "/documents" },
        { key: "NEWS", label: "Tin tức", path: "/news" }, ...shared,
    ],
    AREA_MANAGER: [
        { key: "AREA_DASHBOARD", label: "Tổng quan vùng trồng", path: "/dashboard/area-manager" },
        { key: "AREA_GARDENS", label: "Quản lý vườn trồng", path: "/region-manager/gardens" },
        { key: "AREA_FARMERS", label: "Hồ sơ nông dân", path: "/region-manager/farmers" },
        { key: "AREA_TRACEABILITY", label: "Truy xuất trong vùng", path: "/dashboard/area-manager/traceability" }, ...shared,
    ],
    COLLECTOR: [
        { key: "COLLECTOR_DASHBOARD", label: "Tổng quan vựa thu mua", path: "/dashboard/partner" },
        { key: "COLLECTOR_HARVESTS", label: "Phiếu thu hoạch", path: "/dashboard/partner/harvests" },
        { key: "COLLECTOR_ORDERS", label: "Đơn thu mua", path: "/dashboard/partner/orders" },
        { key: "COLLECTOR_LOTS", label: "Lô hàng", path: "/dashboard/partner/lots" },
        { key: "COLLECTOR_TRACEABILITY", label: "Tạo mã QR truy xuất", path: "/dashboard/partner/traceability" },
        { key: "COLLECTOR_FINANCE", label: "Tài chính", path: "/dashboard/partner/finance" },
        { key: "CHINA_PORT", label: "China Port", path: "/china-port" }, ...shared,
    ],
    PROCESSING_FACILITY: [
        { key: "PROCESSING_DASHBOARD", label: "Tổng quan cơ sở chế biến", path: "/dashboard/processing" },
        { key: "PROCESSING_RAW_MATERIALS", label: "Tiếp nhận & Phân loại", path: "/dashboard/processing/raw-materials" },
        { key: "PROCESSING_BATCHES", label: "Bốc múi / Chế biến", path: "/dashboard/processing/processing" },
        { key: "PROCESSING_PRODUCTS", label: "Thành phẩm", path: "/dashboard/processing/finished-products" },
        { key: "PROCESSING_SHIPMENTS", label: "Xuất hàng", path: "/dashboard/processing/shipments" },
        { key: "PROCESSING_TRACEABILITY", label: "Tạo mã QR truy xuất", path: "/dashboard/processing/traceability" },
        { key: "PROCESSING_FINANCE", label: "Tài chính", path: "/dashboard/processing/finance" },
        { key: "CHINA_PORT", label: "China Port", path: "/china-port" }, ...shared,
    ],
    STORE_OWNER: [
        { key: "STORE_DASHBOARD", label: "Tổng quan cửa hàng", path: "/dashboard/store" },
        { key: "STORE_PRODUCTS", label: "Sản phẩm", path: "/dashboard/store/products" },
        { key: "STORE_INVENTORY", label: "Kho hàng", path: "/dashboard/store/inventory" },
        { key: "STORE_ORDERS", label: "Đơn hàng", path: "/dashboard/store/orders" },
        { key: "STORE_FINANCE", label: "Tài chính", path: "/dashboard/store/finance" }, ...shared,
    ],
};

export function permissionsForRole(role: string) { return ACCOUNT_PERMISSIONS_BY_ROLE[role] || shared; }
