export type ActionType = "view" | "create" | "edit" | "delete" | "approve" | "export";

export interface PermissionActionDef {
    key: string;
    label: string;
    action: ActionType;
    description?: string;
}

export interface FeatureDef {
    id: string;
    name: string;
    description: string;
    menuPath?: string;
    actions: {
        view?: PermissionActionDef;
        create?: PermissionActionDef;
        edit?: PermissionActionDef;
        delete?: PermissionActionDef;
        approve?: PermissionActionDef;
        export?: PermissionActionDef;
    };
}

export interface ModuleDef {
    id: string;
    name: string;
    title: string;
    description: string;
    iconName: string;
    features: FeatureDef[];
}

export interface SystemRoleDef {
    key: string;
    name: string;
    description: string;
    badgeColor: string;
}

// Danh sách các vai trò chính thức trong hệ thống TriViet
export const SYSTEM_ROLES: SystemRoleDef[] = [
    {
        key: "AREA_MANAGER",
        name: "Trưởng ban",
        description: "Quản lý vùng trồng, giám sát vườn nông dân, hồ sơ tiêu chuẩn và chuỗi liên kết",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    },
    {
        key: "FARMER",
        name: "Nông dân",
        description: "Chủ vườn sầu riêng, ghi nhật ký canh tác, lập kế hoạch mùa vụ và đăng ký thu hoạch",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
        key: "COLLECTOR",
        name: "Vựa thu mua",
        description: "Tiếp nhận phiếu thu hoạch, cân nhận nông sản, kiểm tra QC và tạo lô gom hàng",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
        key: "PROCESSING_FACILITY",
        name: "Cơ sở chế biến",
        description: "Tiếp nhận nguyên liệu, bóc tách múi, cấp đông IQF, đóng gói thành phẩm và xuất hàng",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
        key: "STORE_OWNER",
        name: "Cửa hàng vật tư",
        description: "Kinh doanh phân bón, thuốc BVTV, xử lý đơn đặt hàng nông dân và quản lý kho vật tư",
        badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    },
];

export function generateRoleKeyFromName(name: string): string {
    const normalized = name
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    return normalized || `ROLE_${Date.now()}`;
}

// Danh mục chuẩn hóa 17 Module phân quyền hệ thống TriViet
export const PERMISSION_MODULES: ModuleDef[] = [
    {
        id: "DASHBOARD",
        name: "TỔNG QUAN",
        title: "Bảng điều khiển & Thống kê tổng quan",
        description: "Xem số liệu thống kê, biểu đồ KPI sản xuất và thông báo điều hành phù hợp vai trò",
        iconName: "LayoutDashboard",
        features: [
            {
                id: "dashboard_overview",
                name: "Tổng quan hệ thống",
                description: "Truy cập màn hình tổng quan KPI, tiến độ canh tác, thu mua, chế biến và bán hàng",
                menuPath: "/dashboard",
                actions: {
                    view: { key: "DASHBOARD_VIEW", label: "Xem tổng quan", action: "view" },
                },
            },
        ],
    },
    {
        id: "CULTIVATION",
        name: "NÔNG HỘ & CANH TÁC",
        title: "Quản lý canh tác & Vườn trồng",
        description: "Hồ sơ nông hộ, nhật ký nông nghiệp, kế hoạch mùa vụ và giám sát dịch hại sâu bệnh",
        iconName: "Sprout",
        features: [
            {
                id: "farm_profile",
                name: "Nông hộ & Vườn trồng",
                description: "Hồ sơ chủ vườn, vị trí GPS, diện tích đất, số lượng cây sầu riêng và giống trồng",
                menuPath: "/dashboard/farmer",
                actions: {
                    view: { key: "FARM_PROFILE_VIEW", label: "Xem hồ sơ vườn", action: "view" },
                    create: { key: "FARM_PROFILE_CREATE", label: "Tạo vườn mới", action: "create" },
                    edit: { key: "FARM_PROFILE_EDIT", label: "Chỉnh sửa vườn", action: "edit" },
                    delete: { key: "FARM_PROFILE_DELETE", label: "Xóa vườn trồng", action: "delete" },
                    approve: { key: "FARM_PROFILE_APPROVE", label: "Xác nhận / Duyệt vườn", action: "approve" },
                    export: { key: "FARM_PROFILE_EXPORT", label: "Xuất dữ liệu vườn", action: "export" },
                },
            },
            {
                id: "farming_log",
                name: "Nhật ký canh tác",
                description: "Ghi nhận tưới nước, bón phân, phun thuốc BVTV, làm cỏ, tỉa bông đọt và tuân thủ GACC",
                menuPath: "/dashboard/farmer/journal",
                actions: {
                    view: { key: "FARMING_LOG_VIEW", label: "Xem nhật ký", action: "view" },
                    create: { key: "FARMING_LOG_CREATE", label: "Tạo nhật ký", action: "create" },
                    edit: { key: "FARMING_LOG_EDIT", label: "Chỉnh sửa nhật ký", action: "edit" },
                    delete: { key: "FARMING_LOG_DELETE", label: "Xóa nhật ký", action: "delete" },
                    approve: { key: "FARMING_LOG_APPROVE", label: "Xác nhận nhật ký (GACC)", action: "approve" },
                    export: { key: "FARMING_LOG_EXPORT", label: "Xuất nhật ký canh tác", action: "export" },
                },
            },
            {
                id: "farming_plan",
                name: "Kế hoạch canh tác",
                description: "Lịch trình xử lý ra hoa, làm đọt, chuẩn bị vật tư phân thuốc theo từng giai đoạn",
                menuPath: "/dashboard/farmer/plans",
                actions: {
                    view: { key: "FARMING_PLAN_VIEW", label: "Xem kế hoạch", action: "view" },
                    create: { key: "FARMING_PLAN_CREATE", label: "Tạo kế hoạch mới", action: "create" },
                    edit: { key: "FARMING_PLAN_EDIT", label: "Chỉnh sửa kế hoạch", action: "edit" },
                    delete: { key: "FARMING_PLAN_DELETE", label: "Xóa kế hoạch", action: "delete" },
                    export: { key: "FARMING_PLAN_EXPORT", label: "Xuất kế hoạch", action: "export" },
                },
            },
            {
                id: "pest_monitoring",
                name: "Giám sát sâu bệnh",
                description: "Sổ theo dõi rầy nhảy, sâu đục quả, xì mủ nấm phytophthora và đặt bẫy giám sát",
                menuPath: "/dashboard/farmer/statistics",
                actions: {
                    view: { key: "PEST_MONITORING_VIEW", label: "Xem sổ sâu bệnh", action: "view" },
                    create: { key: "PEST_MONITORING_CREATE", label: "Ghi nhận dịch hại", action: "create" },
                    edit: { key: "PEST_MONITORING_EDIT", label: "Cập nhật xử lý", action: "edit" },
                    approve: { key: "PEST_MONITORING_APPROVE", label: "Xác nhận khoanh vùng", action: "approve" },
                    export: { key: "PEST_MONITORING_EXPORT", label: "Xuất báo cáo sâu bệnh", action: "export" },
                },
            },
        ],
    },
    {
        id: "HARVEST",
        name: "THU HOẠCH",
        title: "Quản lý thu hoạch & Bàn giao tại vườn",
        description: "Lập phiếu báo thu hoạch, sản lượng dự kiến, giống quả, cân ký và bàn giao",
        iconName: "Wheat",
        features: [
            {
                id: "harvest_request",
                name: "Phiếu thu hoạch",
                description: "Đăng ký ngày cắt dự kiến, sản lượng ước tính, giống quả (Ri6, Dona) và thông số mẫu quả",
                menuPath: "/dashboard/farmer/harvests",
                actions: {
                    view: { key: "HARVEST_REQUEST_VIEW", label: "Xem phiếu thu hoạch", action: "view" },
                    create: { key: "HARVEST_REQUEST_CREATE", label: "Tạo phiếu báo cắt", action: "create" },
                    edit: { key: "HARVEST_REQUEST_EDIT", label: "Chỉnh sửa phiếu", action: "edit" },
                    delete: { key: "HARVEST_REQUEST_DELETE", label: "Hủy phiếu thu hoạch", action: "delete" },
                    export: { key: "HARVEST_REQUEST_EXPORT", label: "Xuất phiếu thu hoạch", action: "export" },
                },
            },
            {
                id: "harvest_delivery",
                name: "Bàn giao / Cân nhận tại vườn",
                description: "Ghi nhận trọng lượng cân thực tế tại vườn, phân tỷ lệ dạt và ký xác nhận hai bên",
                menuPath: "/dashboard/farmer/harvests",
                actions: {
                    view: { key: "HARVEST_DELIVERY_VIEW", label: "Xem biên bản cân", action: "view" },
                    edit: { key: "HARVEST_DELIVERY_EDIT", label: "Cập nhật trọng lượng", action: "edit" },
                    approve: { key: "HARVEST_DELIVERY_APPROVE", label: "Ký xác nhận bàn giao", action: "approve" },
                    export: { key: "HARVEST_DELIVERY_EXPORT", label: "In biên bản bàn giao", action: "export" },
                },
            },
        ],
    },
    {
        id: "PROCUREMENT",
        name: "VỰA THU MUA",
        title: "Quản lý thu mua, tiếp nhận & Gom hàng",
        description: "Tiếp nhận nguồn cung từ nông dân, thỏa thuận đơn giá, kiểm định QC và tạo lô gom hàng",
        iconName: "Handshake",
        features: [
            {
                id: "procurement_inbox",
                name: "Tiếp nhận phiếu thu hoạch",
                description: "Danh sách thông báo cắt gửi đến từ nông dân liên kết trong khu vực",
                menuPath: "/dashboard/partner/harvests",
                actions: {
                    view: { key: "PROCUREMENT_INBOX_VIEW", label: "Xem phiếu gửi đến", action: "view" },
                    approve: { key: "PROCUREMENT_INBOX_APPROVE", label: "Xác nhận tiếp nhận", action: "approve" },
                    export: { key: "PROCUREMENT_INBOX_EXPORT", label: "Xuất dữ liệu tiếp nhận", action: "export" },
                },
            },
            {
                id: "procurement_orders",
                name: "Đơn thu mua",
                description: "Đơn thu mua chính thức, thỏa thuận đơn giá theo từng loại quả (Loại A, B, C, dạt)",
                menuPath: "/dashboard/partner/orders",
                actions: {
                    view: { key: "PROCUREMENT_ORDER_VIEW", label: "Xem đơn thu mua", action: "view" },
                    create: { key: "PROCUREMENT_ORDER_CREATE", label: "Lập đơn thu mua", action: "create" },
                    edit: { key: "PROCUREMENT_ORDER_EDIT", label: "Sửa đơn thu mua", action: "edit" },
                    delete: { key: "PROCUREMENT_ORDER_DELETE", label: "Hủy đơn thu mua", action: "delete" },
                    approve: { key: "PROCUREMENT_ORDER_APPROVE", label: "Chốt hoàn thành đơn", action: "approve" },
                    export: { key: "PROCUREMENT_ORDER_EXPORT", label: "In hợp đồng/đơn thu mua", action: "export" },
                },
            },
            {
                id: "procurement_qc",
                name: "Kiểm tra chất lượng (QC thu mua)",
                description: "Kiểm tra độ chín, độ brix, tồn dư nấm bệnh và phân loại phẩm cấp thu mua",
                menuPath: "/dashboard/partner/orders",
                actions: {
                    view: { key: "PROCUREMENT_QC_VIEW", label: "Xem kết quả QC", action: "view" },
                    create: { key: "PROCUREMENT_QC_CREATE", label: "Lập phiếu kiểm tra QC", action: "create" },
                    edit: { key: "PROCUREMENT_QC_EDIT", label: "Sửa kết quả QC", action: "edit" },
                    approve: { key: "PROCUREMENT_QC_APPROVE", label: "Xác nhận đạt QC", action: "approve" },
                    export: { key: "PROCUREMENT_QC_EXPORT", label: "Xuất phiếu kiểm định", action: "export" },
                },
            },
            {
                id: "collection_lots",
                name: "Lô thu gom",
                description: "Gom các đợt thu hoạch từ nhiều vườn thành lô lớn để vận chuyển về xưởng chế biến",
                menuPath: "/dashboard/partner/lots",
                actions: {
                    view: { key: "COLLECTION_LOT_VIEW", label: "Xem lô thu gom", action: "view" },
                    create: { key: "COLLECTION_LOT_CREATE", label: "Tạo lô thu gom mới", action: "create" },
                    edit: { key: "COLLECTION_LOT_EDIT", label: "Sửa thông tin lô gom", action: "edit" },
                    delete: { key: "COLLECTION_LOT_DELETE", label: "Hủy lô thu gom", action: "delete" },
                    approve: { key: "COLLECTION_LOT_APPROVE", label: "Chốt đóng lô gom", action: "approve" },
                    export: { key: "COLLECTION_LOT_EXPORT", label: "In phiếu lô thu gom", action: "export" },
                },
            },
        ],
    },
    {
        id: "RAW_MATERIAL_INTAKE",
        name: "TIẾP NHẬN & PHÂN LOẠI",
        title: "Tiếp nhận nguyên liệu & Phân loại quả xưởng",
        description: "Nhập nguyên liệu từ vựa/vườn, cân đối chiếu, phân loại theo kích cỡ và kiểm tra nguyên liệu",
        iconName: "Boxes",
        features: [
            {
                id: "raw_material_receive",
                name: "Tiếp nhận nguyên liệu",
                description: "Nhập sầu riêng quả vào cơ sở chế biến, xác nhận số lượng, mã lô và trọng lượng nhập",
                menuPath: "/dashboard/processing/raw-materials",
                actions: {
                    view: { key: "RAW_MATERIAL_VIEW", label: "Xem danh sách tiếp nhận", action: "view" },
                    create: { key: "RAW_MATERIAL_CREATE", label: "Ghi nhận tiếp nhận", action: "create" },
                    edit: { key: "RAW_MATERIAL_EDIT", label: "Sửa thông tin tiếp nhận", action: "edit" },
                    approve: { key: "RAW_MATERIAL_RECEIVE", label: "Xác nhận nhập xưởng", action: "approve" },
                    export: { key: "RAW_MATERIAL_EXPORT", label: "Xuất phiếu tiếp nhận", action: "export" },
                },
            },
            {
                id: "raw_material_classify",
                name: "Phân loại & Kiểm định QC",
                description: "Phân loại quả loại 1, 2, dạt, kiểm tra chất lượng trước khi đưa vào dây chuyền chế biến",
                menuPath: "/dashboard/processing/raw-materials",
                actions: {
                    view: { key: "RAW_MATERIAL_VIEW", label: "Xem kiểm định QC", action: "view" },
                    create: { key: "RAW_MATERIAL_CLASSIFY", label: "Thực hiện phân loại", action: "create" },
                    edit: { key: "RAW_MATERIAL_EDIT", label: "Sửa kết quả phân loại", action: "edit" },
                    approve: { key: "RAW_MATERIAL_APPROVE", label: "Xác nhận đạt QC nguyên liệu", action: "approve" },
                    export: { key: "RAW_MATERIAL_EXPORT", label: "Xuất biên bản kiểm định", action: "export" },
                },
            },
        ],
    },
    {
        id: "PROCESSING",
        name: "CHẾ BIẾN & ĐÓNG GÓI",
        title: "Quy trình chế biến, bóc múi & đóng gói",
        description: "Quản lý lô chế biến, bóc tách múi, cấp đông sâu IQF, kiểm định vi sinh và hoàn tất đóng gói",
        iconName: "Factory",
        features: [
            {
                id: "processing_batches",
                name: "Lô chế biến",
                description: "Khởi tạo mẻ sơ chế, khử trùng, bóc tách múi, phân loại múi A/B và cấp đông IQF",
                menuPath: "/dashboard/processing/processing",
                actions: {
                    view: { key: "PROCESSING_BATCH_VIEW", label: "Xem lô chế biến", action: "view" },
                    create: { key: "PROCESSING_BATCH_CREATE", label: "Tạo lô chế biến", action: "create" },
                    edit: { key: "PROCESSING_BATCH_EDIT", label: "Chỉnh sửa lô", action: "edit" },
                    delete: { key: "PROCESSING_BATCH_DELETE", label: "Hủy lô chế biến", action: "delete" },
                    approve: { key: "PROCESSING_BATCH_APPROVE", label: "Hoàn tất chế biến", action: "approve" },
                    export: { key: "PROCESSING_BATCH_EXPORT", label: "Xuất thông tin lô", action: "export" },
                },
            },
            {
                id: "processing_qc",
                name: "Kiểm tra chất lượng thành phẩm (QC)",
                description: "Đánh giá vi sinh, độ lạnh tâm sản phẩm, dư lượng và tiêu chuẩn vệ sinh xuất khẩu",
                menuPath: "/dashboard/processing/processing",
                actions: {
                    view: { key: "PROCESSING_QC_VIEW", label: "Xem kết quả QC", action: "view" },
                    create: { key: "PROCESSING_QC_CREATE", label: "Lập phiếu kiểm tra QC", action: "create" },
                    edit: { key: "PROCESSING_QC_EDIT", label: "Sửa kết quả QC", action: "edit" },
                    approve: { key: "PROCESSING_QC_APPROVE", label: "Xác nhận đạt QC thành phẩm", action: "approve" },
                    export: { key: "PROCESSING_QC_EXPORT", label: "Xuất chứng thư QC", action: "export" },
                },
            },
            {
                id: "finished_lots",
                name: "Đóng gói lô thành phẩm",
                description: "Đóng gói khay, hút chân không, dán nhãn hạn sử dụng và chuẩn bị nhập kho thành phẩm",
                menuPath: "/dashboard/processing/finished-products",
                actions: {
                    view: { key: "FINISHED_LOT_VIEW", label: "Xem lô thành phẩm", action: "view" },
                    create: { key: "FINISHED_LOT_CREATE", label: "Tạo lô thành phẩm", action: "create" },
                    edit: { key: "FINISHED_LOT_EDIT", label: "Chỉnh sửa đóng gói", action: "edit" },
                    approve: { key: "FINISHED_LOT_COMPLETE", label: "Hoàn tất đóng gói", action: "approve" },
                    export: { key: "FINISHED_LOT_EXPORT", label: "Xuất dữ liệu đóng gói", action: "export" },
                },
            },
        ],
    },
    {
        id: "SHIPMENT",
        name: "XUẤT HÀNG",
        title: "Quản lý xuất hàng & Vận chuyển thương mại",
        description: "Lập phiếu xuất hàng, gán phương tiện vận chuyển, hóa đơn giao nhận và xác nhận xuất xưởng",
        iconName: "Truck",
        features: [
            {
                id: "shipment_lots",
                name: "Lô xuất hàng",
                description: "Tạo lệnh xuất hàng, thông tin khách nhận, số lượng thùng, biển số xe và nhiệt độ cont",
                menuPath: "/dashboard/processing/shipments",
                actions: {
                    view: { key: "SHIPMENT_VIEW", label: "Xem lô xuất hàng", action: "view" },
                    create: { key: "SHIPMENT_CREATE", label: "Tạo lô xuất hàng", action: "create" },
                    edit: { key: "SHIPMENT_EDIT", label: "Chỉnh sửa lô xuất", action: "edit" },
                    delete: { key: "SHIPMENT_DELETE", label: "Hủy lô xuất hàng", action: "delete" },
                    approve: { key: "SHIPMENT_APPROVE", label: "Xác nhận xuất hàng", action: "approve" },
                    export: { key: "SHIPMENT_EXPORT", label: "Xuất hồ sơ xuất hàng", action: "export" },
                },
            },
        ],
    },
    {
        id: "TRACEABILITY",
        name: "TRUY XUẤT NGUỒN GỐC",
        title: "Mã QR truy xuất & Cổng kiểm dịch China Port",
        description: "Phát hành mã QR truy xuất minh bạch nguồn gốc nông sản và đối soát chuẩn hải quan GACC",
        iconName: "QrCode",
        features: [
            {
                id: "qr_manage",
                name: "QR truy xuất nguồn gốc",
                description: "Sinh mã QR truy xuất chuỗi hành trình từ vườn đến bàn ăn, cấp phát cho từng thùng",
                menuPath: "/dashboard/farmer/traceability",
                actions: {
                    view: { key: "QR_MANAGE_VIEW", label: "Xem QR", action: "view" },
                    create: { key: "QR_MANAGE_CREATE", label: "Tạo / Xem trước QR", action: "create" },
                    edit: { key: "QR_MANAGE_EDIT", label: "Chỉnh sửa thông tin", action: "edit" },
                    approve: { key: "QR_MANAGE_APPROVE", label: "Phát hành QR", action: "approve" },
                    export: { key: "QR_MANAGE_EXPORT", label: "Tải / In QR", action: "export" },
                },
            },
            {
                id: "china_port",
                name: "China Port (Cổng hải quan GACC)",
                description: "Tra cứu doanh nghiệp, cơ sở đóng gói và mã số vùng trồng được GACC cấp phép",
                menuPath: "/china-port",
                actions: {
                    view: { key: "CHINA_PORT_VIEW", label: "Tra cứu China Port", action: "view" },
                    approve: { key: "CHINA_PORT_SYNC", label: "Đồng bộ dữ liệu GACC", action: "approve" },
                    export: { key: "CHINA_PORT_EXPORT", label: "Xuất kết quả tra cứu", action: "export" },
                },
            },
        ],
    },
    {
        id: "INVENTORY",
        name: "KHO HÀNG",
        title: "Quản lý tồn kho & Điều chuyển kho",
        description: "Tồn kho nguyên liệu, vật tư và thành phẩm; luân chuyển kho lạnh và xuất bán thương mại",
        iconName: "Package",
        features: [
            {
                id: "warehouse_movements",
                name: "Nhập / Xuất / Chuyển kho",
                description: "Phiếu nhập kho thành phẩm từ xưởng, chuyển kho lạnh và cân đối luân chuyển tồn",
                menuPath: "/dashboard/store/inventory",
                actions: {
                    view: { key: "WAREHOUSE_MOVE_VIEW", label: "Xem phiếu điều chuyển", action: "view" },
                    create: { key: "WAREHOUSE_MOVE_CREATE", label: "Tạo phiếu nhập/chuyển", action: "create" },
                    edit: { key: "WAREHOUSE_MOVE_EDIT", label: "Sửa phiếu điều chuyển", action: "edit" },
                    approve: { key: "WAREHOUSE_MOVE_APPROVE", label: "Xác nhận nhập/xuất kho", action: "approve" },
                    export: { key: "WAREHOUSE_MOVE_EXPORT", label: "In phiếu kho", action: "export" },
                },
            },
            {
                id: "commercial_dispatch",
                name: "Xuất bán thương mại",
                description: "Xuất kho thương mại cho hệ thống phân phối, siêu thị hoặc đối tác mua sỉ",
                menuPath: "/dashboard/partner/lots",
                actions: {
                    view: { key: "COMMERCIAL_DISPATCH_VIEW", label: "Xem đơn xuất bán", action: "view" },
                    create: { key: "COMMERCIAL_DISPATCH_CREATE", label: "Tạo lô xuất bán", action: "create" },
                    edit: { key: "COMMERCIAL_DISPATCH_EDIT", label: "Sửa thông tin xuất bán", action: "edit" },
                    delete: { key: "COMMERCIAL_DISPATCH_DELETE", label: "Hủy lệnh xuất bán", action: "delete" },
                    approve: { key: "COMMERCIAL_DISPATCH_APPROVE", label: "Xác nhận xuất kho", action: "approve" },
                    export: { key: "COMMERCIAL_DISPATCH_EXPORT", label: "In phiếu xuất bán", action: "export" },
                },
            },
        ],
    },
    {
        id: "STORE_MARKETPLACE",
        name: "CỬA HÀNG VẬT TƯ",
        title: "Kinh doanh phân bón, thuốc BVTV & Vật tư nông nghiệp",
        description: "Quản lý danh mục sản phẩm, xử lý đơn đặt mua vật tư từ nông dân và hồ sơ cửa hàng",
        iconName: "Store",
        features: [
            {
                id: "store_products",
                name: "Sản phẩm vật tư",
                description: "Đăng tải sản phẩm phân bón, thuốc BVTV, hướng dẫn sử dụng, quy cách và giá bán",
                menuPath: "/dashboard/store/products",
                actions: {
                    view: { key: "STORE_PRODUCT_VIEW", label: "Xem danh mục sản phẩm", action: "view" },
                    create: { key: "STORE_PRODUCT_CREATE", label: "Đăng sản phẩm mới", action: "create" },
                    edit: { key: "STORE_PRODUCT_EDIT", label: "Cập nhật giá & tồn kho", action: "edit" },
                    delete: { key: "STORE_PRODUCT_DELETE", label: "Ẩn/Xóa sản phẩm", action: "delete" },
                    export: { key: "STORE_PRODUCT_EXPORT", label: "Xuất bảng giá vật tư", action: "export" },
                },
            },
            {
                id: "store_orders",
                name: "Đơn đặt hàng từ nông dân",
                description: "Tiếp nhận đơn mua phân thuốc, chuẩn bị vật tư giao cho nông dân và thu tiền",
                menuPath: "/dashboard/store/orders",
                actions: {
                    view: { key: "STORE_ORDER_VIEW", label: "Xem đơn hàng", action: "view" },
                    edit: { key: "STORE_ORDER_EDIT", label: "Cập nhật trạng thái đơn", action: "edit" },
                    approve: { key: "STORE_ORDER_APPROVE", label: "Xác nhận giao hàng & thanh toán", action: "approve" },
                    export: { key: "STORE_ORDER_EXPORT", label: "In hóa đơn bán lẻ", action: "export" },
                },
            },
            {
                id: "store_profile",
                name: "Hồ sơ cửa hàng",
                description: "Thông tin liên hệ, địa chỉ cửa hàng, kho bãi và chứng nhận đủ điều kiện kinh doanh",
                menuPath: "/dashboard/store/profile",
                actions: {
                    view: { key: "STORE_PROFILE_VIEW", label: "Xem hồ sơ cửa hàng", action: "view" },
                    edit: { key: "STORE_PROFILE_EDIT", label: "Chỉnh sửa hồ sơ", action: "edit" },
                },
            },
        ],
    },
    {
        id: "FINANCE",
        name: "TÀI CHÍNH",
        title: "Báo cáo doanh thu, Chi phí & Công nợ",
        description: "Theo dõi dòng tiền bán hàng, sổ chi phí sản xuất, thanh toán đối tác và đối soát công nợ",
        iconName: "CircleDollarSign",
        features: [
            {
                id: "finance_dashboard",
                name: "Tổng quan tài chính",
                description: "Biểu đồ doanh thu mùa vụ, cơ cấu chi phí vật tư, nhân công, chi phí vận hành và lợi nhuận",
                menuPath: "/dashboard/partner/finance",
                actions: {
                    view: { key: "FINANCE_DASHBOARD_VIEW", label: "Xem tổng quan tài chính", action: "view" },
                    export: { key: "FINANCE_DASHBOARD_EXPORT", label: "Xuất báo cáo tổng quan", action: "export" },
                },
            },
            {
                id: "expense_book",
                name: "Chi phí & Thanh toán",
                description: "Ghi nhận chi phí mua quả, mua vật tư bao bì, điện nước, nhân công và thanh toán chi phí",
                menuPath: "/dashboard/partner/finance",
                actions: {
                    view: { key: "EXPENSE_BOOK_VIEW", label: "Xem sổ chi phí", action: "view" },
                    create: { key: "EXPENSE_BOOK_CREATE", label: "Lập phiếu chi", action: "create" },
                    edit: { key: "EXPENSE_BOOK_EDIT", label: "Sửa phiếu chi", action: "edit" },
                    delete: { key: "EXPENSE_BOOK_DELETE", label: "Xóa phiếu chi", action: "delete" },
                    approve: { key: "EXPENSE_BOOK_APPROVE", label: "Xác nhận thanh toán", action: "approve" },
                    export: { key: "EXPENSE_BOOK_EXPORT", label: "Xuất sổ thu chi Excel", action: "export" },
                },
            },
            {
                id: "debt_management",
                name: "Công nợ",
                description: "Theo dõi các khoản phải thu từ người mua lô xuất, tạm ứng nông hộ và kỳ hạn thanh toán",
                menuPath: "/dashboard/partner/finance",
                actions: {
                    view: { key: "DEBT_VIEW", label: "Xem sổ công nợ", action: "view" },
                    create: { key: "DEBT_CREATE", label: "Ghi nhận công nợ mới", action: "create" },
                    edit: { key: "DEBT_EDIT", label: "Cập nhật công nợ", action: "edit" },
                    approve: { key: "DEBT_APPROVE", label: "Xác nhận thanh toán công nợ", action: "approve" },
                    export: { key: "DEBT_EXPORT", label: "In bảng đối soát công nợ", action: "export" },
                },
            },
        ],
    },
    {
        id: "GROWING_REGION",
        name: "QUẢN LÝ VÙNG TRỒNG",
        title: "Vùng trồng & Mã số vùng trồng (Admin)",
        description: "Quản lý danh sách vùng trồng tập trung, mã số vùng trồng xuất khẩu và diện tích canh tác",
        iconName: "MapPin",
        features: [
            {
                id: "growing_region",
                name: "Vùng trồng",
                description: "Thông tin vùng trồng tập trung, tọa độ, mã số vùng trồng (MSVT) và hồ sơ GACC",
                menuPath: "/dashboard/admin/regions",
                actions: {
                    view: { key: "GROWING_REGION_VIEW", label: "Xem vùng trồng", action: "view" },
                    create: { key: "GROWING_REGION_CREATE", label: "Tạo vùng trồng mới", action: "create" },
                    edit: { key: "GROWING_REGION_EDIT", label: "Chỉnh sửa vùng trồng", action: "edit" },
                    delete: { key: "GROWING_REGION_DELETE", label: "Xóa vùng trồng", action: "delete" },
                    approve: { key: "GROWING_REGION_APPROVE", label: "Xác nhận / Duyệt vùng trồng", action: "approve" },
                    export: { key: "GROWING_REGION_EXPORT", label: "Xuất dữ liệu vùng trồng", action: "export" },
                },
            },
        ],
    },
    {
        id: "ADMIN_FARMING",
        name: "NÔNG HỘ (HỆ THỐNG)",
        title: "Quản lý nông hộ hệ thống (Admin)",
        description: "Giám sát, phân bổ và quản trị toàn bộ hồ sơ nông hộ, chủ vườn trên toàn hệ thống",
        iconName: "Users",
        features: [
            {
                id: "admin_farming",
                name: "Quản lý nông hộ hệ thống",
                description: "Xem và quản trị tập trung hồ sơ các nông hộ, chuẩn hóa dữ liệu nông nghiệp",
                menuPath: "/dashboard/admin/farming",
                actions: {
                    view: { key: "ADMIN_FARM_VIEW", label: "Xem nông hộ hệ thống", action: "view" },
                    create: { key: "ADMIN_FARM_CREATE", label: "Thêm nông hộ mới", action: "create" },
                    edit: { key: "ADMIN_FARM_EDIT", label: "Sửa hồ sơ nông hộ", action: "edit" },
                    delete: { key: "ADMIN_FARM_DELETE", label: "Xóa hồ sơ nông hộ", action: "delete" },
                    approve: { key: "ADMIN_FARM_APPROVE", label: "Duyệt liên kết nông hộ", action: "approve" },
                    export: { key: "ADMIN_FARM_EXPORT", label: "Xuất danh sách nông hộ", action: "export" },
                },
            },
        ],
    },
    {
        id: "USER_ACCOUNTS",
        name: "QUẢN LÝ TÀI KHOẢN",
        title: "Tài khoản người dùng & Phê duyệt onboarding",
        description: "Quản lý danh sách tài khoản các bên tham gia (nông dân, vựa, xưởng, cửa hàng), duyệt và khóa",
        iconName: "UserCheck",
        features: [
            {
                id: "user_accounts",
                name: "Tài khoản người dùng",
                description: "Danh sách người dùng, kích hoạt tài khoản, cấp lại mật khẩu hoặc khóa truy cập",
                menuPath: "/dashboard/admin/accounts",
                actions: {
                    view: { key: "USER_ACCOUNT_VIEW", label: "Xem tài khoản", action: "view" },
                    create: { key: "USER_ACCOUNT_CREATE", label: "Tạo tài khoản", action: "create" },
                    edit: { key: "USER_ACCOUNT_EDIT", label: "Chỉnh sửa tài khoản", action: "edit" },
                    delete: { key: "USER_ACCOUNT_DELETE", label: "Khóa / Xóa tài khoản", action: "delete" },
                    approve: { key: "USER_ACCOUNT_APPROVE", label: "Phê duyệt / Từ chối", action: "approve" },
                    export: { key: "USER_ACCOUNT_EXPORT", label: "Xuất danh sách tài khoản", action: "export" },
                },
            },
        ],
    },
    {
        id: "ROLE_PERMISSIONS",
        name: "PHÂN QUYỀN",
        title: "Phân quyền vai trò & Cấu hình tài khoản",
        description: "Cấu hình chi tiết quyền hạn cho từng vai trò và phân quyền trực tiếp cho từng tài khoản",
        iconName: "ShieldCheck",
        features: [
            {
                id: "role_permissions",
                name: "Phân quyền hệ thống",
                description: "Xem bảng quyền, tạo role mới, cập nhật quyền hạn các phân hệ và gán tài khoản",
                menuPath: "/dashboard/admin/permissions",
                actions: {
                    view: { key: "ROLE_PERMISSION_VIEW", label: "Xem bảng quyền", action: "view" },
                    create: { key: "ROLE_PERMISSION_CREATE", label: "Tạo Role mới", action: "create" },
                    edit: { key: "ROLE_PERMISSION_EDIT", label: "Chỉnh sửa Role", action: "edit" },
                    delete: { key: "ROLE_PERMISSION_DELETE", label: "Xóa Role", action: "delete" },
                    approve: { key: "ROLE_PERMISSION_ASSIGN", label: "Gán tài khoản vào Role", action: "approve" },
                    export: { key: "ROLE_PERMISSION_EXPORT", label: "Xuất ma trận quyền", action: "export" },
                },
            },
        ],
    },
    {
        id: "MASTER_CATALOGS",
        name: "DANH MỤC",
        title: "Danh mục dùng chung & Hoạt chất thuốc BVTV",
        description: "Quản lý danh mục giống sầu riêng, giai đoạn mùa vụ và danh mục hoạt chất thuốc BVTV cấm GACC",
        iconName: "Layers",
        features: [
            {
                id: "master_catalogs",
                name: "Danh mục hệ thống",
                description: "Giống sầu riêng, quy trình canh tác mẫu, danh mục phân bón và thuốc BVTV cấm",
                menuPath: "/dashboard/admin/catalog",
                actions: {
                    view: { key: "MASTER_CATALOG_VIEW", label: "Xem danh mục", action: "view" },
                    create: { key: "MASTER_CATALOG_CREATE", label: "Thêm danh mục", action: "create" },
                    edit: { key: "MASTER_CATALOG_EDIT", label: "Sửa danh mục", action: "edit" },
                    delete: { key: "MASTER_CATALOG_DELETE", label: "Xóa danh mục", action: "delete" },
                    approve: { key: "MASTER_CATALOG_APPROVE", label: "Ban hành chuẩn GACC", action: "approve" },
                    export: { key: "MASTER_CATALOG_EXPORT", label: "Xuất dữ liệu danh mục", action: "export" },
                },
            },
        ],
    },
    {
        id: "DOCUMENTS_NEWS",
        name: "TÀI LIỆU & TIN TỨC",
        title: "Tài liệu kỹ thuật canh tác & Tin tức thị trường",
        description: "Quản trị cẩm nang hướng dẫn kỹ thuật, quy trình canh tác chuẩn và tin tức thị trường xuất khẩu",
        iconName: "BookOpen",
        features: [
            {
                id: "documents",
                name: "Tài liệu kỹ thuật",
                description: "Tài liệu hướng dẫn canh tác, quy định kiểm dịch thực vật và quy trình VietGAP",
                menuPath: "/documents",
                actions: {
                    view: { key: "DOCUMENT_VIEW", label: "Xem tài liệu", action: "view" },
                    create: { key: "DOCUMENT_CREATE", label: "Đăng tải tài liệu", action: "create" },
                    edit: { key: "DOCUMENT_EDIT", label: "Sửa tài liệu", action: "edit" },
                    delete: { key: "DOCUMENT_DELETE", label: "Xóa tài liệu", action: "delete" },
                    export: { key: "DOCUMENT_EXPORT", label: "Tải xuống tài liệu", action: "export" },
                },
            },
            {
                id: "news",
                name: "Tin tức & Cảnh báo",
                description: "Bản tin thời tiết mùa vụ, cảnh báo dịch hại khu vực và tin giá cả sầu riêng thị trường",
                menuPath: "/news",
                actions: {
                    view: { key: "NEWS_VIEW", label: "Xem tin tức", action: "view" },
                    create: { key: "NEWS_CREATE", label: "Đăng tin mới", action: "create" },
                    edit: { key: "NEWS_EDIT", label: "Sửa tin tức", action: "edit" },
                    delete: { key: "NEWS_DELETE", label: "Xóa tin tức", action: "delete" },
                    approve: { key: "NEWS_APPROVE", label: "Xuất bản / Gỡ xuất bản", action: "approve" },
                },
            },
        ],
    },
];

// Quyền mặc định chuẩn hóa cho từng vai trò người dùng trong hệ thống TriViet
export const DEFAULT_ROLE_PERMISSIONS: Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[] }> = {
    FARMER: {
        moduleEnabled: {
            DASHBOARD: true,
            CULTIVATION: true,
            HARVEST: true,
            PROCUREMENT: false,
            RAW_MATERIAL_INTAKE: false,
            PROCESSING: false,
            SHIPMENT: false,
            TRACEABILITY: true,
            INVENTORY: false,
            STORE_MARKETPLACE: true,
            FINANCE: true,
            GROWING_REGION: false,
            ADMIN_FARMING: false,
            USER_ACCOUNTS: false,
            ROLE_PERMISSIONS: false,
            MASTER_CATALOGS: false,
            DOCUMENTS_NEWS: true,
        },
        permissions: [
            "DASHBOARD_VIEW",
            "FARM_PROFILE_VIEW", "FARM_PROFILE_CREATE", "FARM_PROFILE_EDIT", "FARM_PROFILE_EXPORT",
            "FARMING_LOG_VIEW", "FARMING_LOG_CREATE", "FARMING_LOG_EDIT", "FARMING_LOG_DELETE", "FARMING_LOG_EXPORT",
            "FARMING_PLAN_VIEW", "FARMING_PLAN_CREATE", "FARMING_PLAN_EDIT", "FARMING_PLAN_DELETE", "FARMING_PLAN_EXPORT",
            "PEST_MONITORING_VIEW", "PEST_MONITORING_CREATE", "PEST_MONITORING_EDIT", "PEST_MONITORING_EXPORT",
            "HARVEST_REQUEST_VIEW", "HARVEST_REQUEST_CREATE", "HARVEST_REQUEST_EDIT", "HARVEST_REQUEST_DELETE", "HARVEST_REQUEST_EXPORT",
            "HARVEST_DELIVERY_VIEW", "HARVEST_DELIVERY_APPROVE", "HARVEST_DELIVERY_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_CREATE", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
            "STORE_PRODUCT_VIEW", "STORE_PRODUCT_EXPORT",
            "STORE_ORDER_VIEW",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_DELETE", "EXPENSE_BOOK_EXPORT",
            "DEBT_VIEW", "DEBT_EXPORT",
            "DOCUMENT_VIEW", "DOCUMENT_EXPORT",
            "NEWS_VIEW",
        ],
    },
    AREA_MANAGER: {
        moduleEnabled: {
            DASHBOARD: true,
            CULTIVATION: true,
            HARVEST: true,
            PROCUREMENT: false,
            RAW_MATERIAL_INTAKE: false,
            PROCESSING: false,
            SHIPMENT: false,
            TRACEABILITY: true,
            INVENTORY: false,
            STORE_MARKETPLACE: false,
            FINANCE: false,
            GROWING_REGION: true,
            ADMIN_FARMING: true,
            USER_ACCOUNTS: true,
            ROLE_PERMISSIONS: false,
            MASTER_CATALOGS: true,
            DOCUMENTS_NEWS: true,
        },
        permissions: [
            "DASHBOARD_VIEW",
            "FARM_PROFILE_VIEW", "FARM_PROFILE_EDIT", "FARM_PROFILE_APPROVE", "FARM_PROFILE_EXPORT",
            "FARMING_LOG_VIEW", "FARMING_LOG_APPROVE", "FARMING_LOG_EXPORT",
            "FARMING_PLAN_VIEW", "FARMING_PLAN_EXPORT",
            "PEST_MONITORING_VIEW", "PEST_MONITORING_APPROVE", "PEST_MONITORING_EXPORT",
            "HARVEST_REQUEST_VIEW", "HARVEST_REQUEST_EXPORT",
            "HARVEST_DELIVERY_VIEW", "HARVEST_DELIVERY_APPROVE", "HARVEST_DELIVERY_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
            "GROWING_REGION_VIEW", "GROWING_REGION_EDIT", "GROWING_REGION_APPROVE", "GROWING_REGION_EXPORT",
            "ADMIN_FARM_VIEW", "ADMIN_FARM_APPROVE", "ADMIN_FARM_EXPORT",
            "USER_ACCOUNT_VIEW", "USER_ACCOUNT_APPROVE", "USER_ACCOUNT_EXPORT",
            "MASTER_CATALOG_VIEW", "MASTER_CATALOG_EXPORT",
            "DOCUMENT_VIEW", "DOCUMENT_EXPORT",
            "NEWS_VIEW",
        ],
    },
    COLLECTOR: {
        moduleEnabled: {
            DASHBOARD: true,
            CULTIVATION: false,
            HARVEST: true,
            PROCUREMENT: true,
            RAW_MATERIAL_INTAKE: false,
            PROCESSING: false,
            SHIPMENT: false,
            TRACEABILITY: true,
            INVENTORY: true,
            STORE_MARKETPLACE: false,
            FINANCE: true,
            GROWING_REGION: false,
            ADMIN_FARMING: false,
            USER_ACCOUNTS: false,
            ROLE_PERMISSIONS: false,
            MASTER_CATALOGS: false,
            DOCUMENTS_NEWS: true,
        },
        permissions: [
            "DASHBOARD_VIEW",
            "HARVEST_REQUEST_VIEW", "HARVEST_REQUEST_EXPORT",
            "HARVEST_DELIVERY_VIEW", "HARVEST_DELIVERY_EDIT", "HARVEST_DELIVERY_APPROVE", "HARVEST_DELIVERY_EXPORT",
            "PROCUREMENT_INBOX_VIEW", "PROCUREMENT_INBOX_APPROVE", "PROCUREMENT_INBOX_EXPORT",
            "PROCUREMENT_ORDER_VIEW", "PROCUREMENT_ORDER_CREATE", "PROCUREMENT_ORDER_EDIT", "PROCUREMENT_ORDER_DELETE", "PROCUREMENT_ORDER_APPROVE", "PROCUREMENT_ORDER_EXPORT",
            "PROCUREMENT_QC_VIEW", "PROCUREMENT_QC_CREATE", "PROCUREMENT_QC_EDIT", "PROCUREMENT_QC_APPROVE", "PROCUREMENT_QC_EXPORT",
            "COLLECTION_LOT_VIEW", "COLLECTION_LOT_CREATE", "COLLECTION_LOT_EDIT", "COLLECTION_LOT_DELETE", "COLLECTION_LOT_APPROVE", "COLLECTION_LOT_EXPORT",
            "WAREHOUSE_MOVE_VIEW", "WAREHOUSE_MOVE_CREATE", "WAREHOUSE_MOVE_EDIT", "WAREHOUSE_MOVE_APPROVE", "WAREHOUSE_MOVE_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW", "COMMERCIAL_DISPATCH_CREATE", "COMMERCIAL_DISPATCH_EDIT", "COMMERCIAL_DISPATCH_DELETE", "COMMERCIAL_DISPATCH_APPROVE", "COMMERCIAL_DISPATCH_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_CREATE", "QR_MANAGE_EDIT", "QR_MANAGE_APPROVE", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_DELETE", "EXPENSE_BOOK_APPROVE", "EXPENSE_BOOK_EXPORT",
            "DEBT_VIEW", "DEBT_CREATE", "DEBT_EDIT", "DEBT_APPROVE", "DEBT_EXPORT",
            "DOCUMENT_VIEW", "DOCUMENT_EXPORT",
            "NEWS_VIEW",
        ],
    },
    PROCESSING_FACILITY: {
        moduleEnabled: {
            DASHBOARD: true,
            CULTIVATION: false,
            HARVEST: false,
            PROCUREMENT: true,
            RAW_MATERIAL_INTAKE: true,
            PROCESSING: true,
            SHIPMENT: true,
            TRACEABILITY: true,
            INVENTORY: true,
            STORE_MARKETPLACE: false,
            FINANCE: true,
            GROWING_REGION: false,
            ADMIN_FARMING: false,
            USER_ACCOUNTS: false,
            ROLE_PERMISSIONS: false,
            MASTER_CATALOGS: false,
            DOCUMENTS_NEWS: true,
        },
        permissions: [
            "DASHBOARD_VIEW",
            "PROCUREMENT_ORDER_VIEW", "PROCUREMENT_ORDER_EXPORT",
            "COLLECTION_LOT_VIEW", "COLLECTION_LOT_EXPORT",
            "RAW_MATERIAL_VIEW", "RAW_MATERIAL_CREATE", "RAW_MATERIAL_EDIT", "RAW_MATERIAL_RECEIVE", "RAW_MATERIAL_CLASSIFY", "RAW_MATERIAL_APPROVE", "RAW_MATERIAL_EXPORT",
            "PROCESSING_BATCH_VIEW", "PROCESSING_BATCH_CREATE", "PROCESSING_BATCH_EDIT", "PROCESSING_BATCH_DELETE", "PROCESSING_BATCH_APPROVE", "PROCESSING_BATCH_EXPORT",
            "PROCESSING_QC_VIEW", "PROCESSING_QC_CREATE", "PROCESSING_QC_EDIT", "PROCESSING_QC_APPROVE", "PROCESSING_QC_EXPORT",
            "FINISHED_LOT_VIEW", "FINISHED_LOT_CREATE", "FINISHED_LOT_EDIT", "FINISHED_LOT_COMPLETE", "FINISHED_LOT_EXPORT",
            "SHIPMENT_VIEW", "SHIPMENT_CREATE", "SHIPMENT_EDIT", "SHIPMENT_DELETE", "SHIPMENT_APPROVE", "SHIPMENT_EXPORT",
            "WAREHOUSE_MOVE_VIEW", "WAREHOUSE_MOVE_CREATE", "WAREHOUSE_MOVE_EDIT", "WAREHOUSE_MOVE_APPROVE", "WAREHOUSE_MOVE_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW", "COMMERCIAL_DISPATCH_CREATE", "COMMERCIAL_DISPATCH_EDIT", "COMMERCIAL_DISPATCH_DELETE", "COMMERCIAL_DISPATCH_APPROVE", "COMMERCIAL_DISPATCH_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_CREATE", "QR_MANAGE_EDIT", "QR_MANAGE_APPROVE", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_DELETE", "EXPENSE_BOOK_APPROVE", "EXPENSE_BOOK_EXPORT",
            "DEBT_VIEW", "DEBT_CREATE", "DEBT_EDIT", "DEBT_APPROVE", "DEBT_EXPORT",
            "DOCUMENT_VIEW", "DOCUMENT_EXPORT",
            "NEWS_VIEW",
        ],
    },
    STORE_OWNER: {
        moduleEnabled: {
            DASHBOARD: true,
            CULTIVATION: false,
            HARVEST: false,
            PROCUREMENT: false,
            RAW_MATERIAL_INTAKE: false,
            PROCESSING: false,
            SHIPMENT: false,
            TRACEABILITY: false,
            INVENTORY: true,
            STORE_MARKETPLACE: true,
            FINANCE: true,
            GROWING_REGION: false,
            ADMIN_FARMING: false,
            USER_ACCOUNTS: false,
            ROLE_PERMISSIONS: false,
            MASTER_CATALOGS: false,
            DOCUMENTS_NEWS: true,
        },
        permissions: [
            "DASHBOARD_VIEW",
            "STORE_PRODUCT_VIEW", "STORE_PRODUCT_CREATE", "STORE_PRODUCT_EDIT", "STORE_PRODUCT_DELETE", "STORE_PRODUCT_EXPORT",
            "STORE_ORDER_VIEW", "STORE_ORDER_EDIT", "STORE_ORDER_APPROVE", "STORE_ORDER_EXPORT",
            "STORE_PROFILE_VIEW", "STORE_PROFILE_EDIT",
            "WAREHOUSE_MOVE_VIEW", "WAREHOUSE_MOVE_CREATE", "WAREHOUSE_MOVE_EDIT", "WAREHOUSE_MOVE_APPROVE", "WAREHOUSE_MOVE_EXPORT",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_DELETE", "EXPENSE_BOOK_EXPORT",
            "DEBT_VIEW", "DEBT_CREATE", "DEBT_EDIT", "DEBT_EXPORT",
            "DOCUMENT_VIEW", "DOCUMENT_EXPORT",
            "NEWS_VIEW",
        ],
    },
};

// Lấy danh sách toàn bộ các mã quyền hợp lệ trong hệ thống (bao gồm cả các mã tương thích cũ)
export function getAllSystemPermissionKeys(): string[] {
    const keySet = new Set<string>();

    for (const mod of PERMISSION_MODULES) {
        for (const feat of mod.features) {
            for (const act of Object.values(feat.actions)) {
                if (act?.key) keySet.add(act.key);
            }
        }
    }

    // Các key bổ sung đảm bảo tương thích hoàn toàn dữ liệu
    const additionalLegacyKeys = [
        "USER_ACCOUNT_LOCK",
        "ROLE_PERMISSION_APPROVE",
        "SUPPLIES_ORDER_VIEW", "SUPPLIES_ORDER_CREATE", "SUPPLIES_ORDER_DELETE", "SUPPLIES_ORDER_EXPORT",
        "NURSERY_PROFILE_VIEW", "NURSERY_PROFILE_CREATE", "NURSERY_PROFILE_EDIT", "NURSERY_PROFILE_DELETE", "NURSERY_PROFILE_EXPORT",
        "SEEDLING_BATCH_VIEW", "SEEDLING_BATCH_CREATE", "SEEDLING_BATCH_EDIT", "SEEDLING_BATCH_DELETE", "SEEDLING_BATCH_APPROVE", "SEEDLING_BATCH_EXPORT"
    ];

    for (const k of additionalLegacyKeys) {
        keySet.add(k);
    }

    return Array.from(keySet);
}

// Tính toán thống kê quyền cho một vai trò
export function calculateRolePermissionStats(
    roleKey: string,
    grantedPermissions: string[],
    moduleEnabled?: Record<string, boolean>
) {
    let totalAvailable = 0;
    let totalGranted = 0;
    const perModuleStats: Record<string, { granted: number; total: number; isEnabled: boolean }> = {};

    for (const mod of PERMISSION_MODULES) {
        let modTotal = 0;
        let modGranted = 0;

        for (const feat of mod.features) {
            for (const act of Object.values(feat.actions)) {
                if (act?.key) {
                    modTotal += 1;
                    if (grantedPermissions.includes(act.key)) {
                        modGranted += 1;
                    }
                }
            }
        }

        totalAvailable += modTotal;
        totalGranted += modGranted;
        perModuleStats[mod.id] = {
            granted: modGranted,
            total: modTotal,
            isEnabled: moduleEnabled ? !!moduleEnabled[mod.id] : true,
        };
    }

    return {
        totalGranted,
        totalAvailable,
        perModuleStats,
    };
}
