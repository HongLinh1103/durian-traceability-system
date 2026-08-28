export type ActionType = "view" | "create" | "edit" | "delete" | "approve" | "export";

export interface PermissionActionDef {
    key: string;           // e.g. "CULTIVATION_LOG_VIEW"
    label: string;         // e.g. "Xem nhật ký"
    action: ActionType;    // "view", "create", "edit", "delete", "approve", "export"
    description?: string;
}

export interface FeatureDef {
    id: string;            // e.g. "cultivation_log"
    name: string;          // e.g. "Nhật ký canh tác & chăm sóc"
    description: string;   // e.g. "Ghi nhận tưới tiêu, bón phân, phun thuốc và quản lý đọt"
    menuPath?: string;     // e.g. "/dashboard/farmer/journal"
    // Action definitions. If undefined, action is NOT applicable (rendered as '—')
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
    id: string;            // e.g. "CULTIVATION"
    name: string;          // e.g. "CANH TÁC"
    title: string;         // e.g. "Quản lý canh tác & Vườn trồng"
    description: string;   // e.g. "Nhật ký nông nghiệp, kế hoạch mùa vụ, sâu bệnh và mua sắm vật tư"
    iconName: string;      // e.g. "Sprout", "Wheat", "ShoppingBag", etc.
    features: FeatureDef[];
}

export interface SystemRoleDef {
    key: string;           // e.g. "FARMER"
    name: string;          // e.g. "Nông dân"
    description: string;   // e.g. "Chủ vườn sầu riêng, ghi nhật ký, lập kế hoạch và thu hoạch"
    badgeColor: string;
}

// 1. Danh sách các vai trò có thể cấu hình phân quyền trong hệ thống
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
        description: "Chủ vườn trồng, ghi nhật ký canh tác, mua sắm vật tư, đăng ký thu hoạch và theo dõi tài chính",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
        key: "COLLECTOR",
        name: "Vựa thu mua",
        description: "Tiếp nhận phiếu thu hoạch, cân nhận nông sản, kiểm tra chất lượng (QC) và tạo lô thu gom",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
        key: "PROCESSING_FACILITY",
        name: "Cơ sở chế biến",
        description: "Tiếp nhận nguyên liệu, quy trình bóc múi, cấp đông, đóng gói thành phẩm và phát hành mã QR",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
        key: "STORE_OWNER",
        name: "Cửa hàng vật tư",
        description: "Bán lẻ phân bón, thuốc BVTV, quản lý tồn kho, xử lý đơn hàng nông dân và sổ thu chi",
        badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    },
    {
        key: "SEEDLING_FARM",
        name: "Trại giống",
        description: "Cung cấp giống sầu riêng chuẩn đầu dòng, giấy chứng nhận kiểm định và nhật ký vườn ươm",
        badgeColor: "bg-lime-100 text-lime-800 border-lime-200",
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

// 2. Danh mục đầy đủ 10 phân hệ & ma trận chức năng x hành vi
export const PERMISSION_MODULES: ModuleDef[] = [
    {
        id: "CULTIVATION",
        name: "CANH TÁC",
        title: "Quản lý canh tác & Nhật ký nông nghiệp",
        description: "Hồ sơ vườn trồng, nhật ký tưới tiêu, bón phân, kế hoạch mùa vụ và giám sát sâu bệnh",
        iconName: "Sprout",
        features: [
            {
                id: "farm_profile",
                name: "Hồ sơ nông hộ & vườn trồng",
                description: "Thông tin chủ vườn, diện tích, tọa độ GPS, số lượng cây và giống trồng",
                menuPath: "/dashboard/farmer",
                actions: {
                    view: { key: "FARM_PROFILE_VIEW", label: "Xem hồ sơ vườn", action: "view" },
                    create: { key: "FARM_PROFILE_CREATE", label: "Tạo vườn mới", action: "create" },
                    edit: { key: "FARM_PROFILE_EDIT", label: "Chỉnh sửa vườn", action: "edit" },
                    delete: { key: "FARM_PROFILE_DELETE", label: "Xóa vườn trồng", action: "delete" },
                    approve: { key: "FARM_PROFILE_APPROVE", label: "Duyệt/Xác thực vườn", action: "approve" },
                    export: { key: "FARM_PROFILE_EXPORT", label: "Xuất hồ sơ vườn", action: "export" },
                },
            },
            {
                id: "farming_log",
                name: "Nhật ký canh tác & chăm sóc",
                description: "Nhật ký tưới nước, bón phân, phun thuốc BVTV, tỉa hoa, thụ phấn và kiểm dịch GACC",
                menuPath: "/dashboard/farmer/journal",
                actions: {
                    view: { key: "FARMING_LOG_VIEW", label: "Xem nhật ký", action: "view" },
                    create: { key: "FARMING_LOG_CREATE", label: "Ghi nhật ký mới", action: "create" },
                    edit: { key: "FARMING_LOG_EDIT", label: "Sửa nhật ký", action: "edit" },
                    delete: { key: "FARMING_LOG_DELETE", label: "Xóa nhật ký", action: "delete" },
                    approve: { key: "FARMING_LOG_APPROVE", label: "Duyệt tuân thủ GACC", action: "approve" },
                    export: { key: "FARMING_LOG_EXPORT", label: "Xuất sổ nhật ký", action: "export" },
                },
            },
            {
                id: "farming_plan",
                name: "Lập kế hoạch mùa vụ & công việc",
                description: "Lịch trình xử lý ra hoa, làm đọt, chuẩn bị phân thuốc và nhắc việc canh tác",
                menuPath: "/dashboard/farmer/plans",
                actions: {
                    view: { key: "FARMING_PLAN_VIEW", label: "Xem kế hoạch", action: "view" },
                    create: { key: "FARMING_PLAN_CREATE", label: "Tạo kế hoạch mới", action: "create" },
                    edit: { key: "FARMING_PLAN_EDIT", label: "Sửa kế hoạch", action: "edit" },
                    delete: { key: "FARMING_PLAN_DELETE", label: "Hủy/Xóa kế hoạch", action: "delete" },
                    // approve: không áp dụng cho kế hoạch
                    export: { key: "FARMING_PLAN_EXPORT", label: "Xuất lịch kế hoạch", action: "export" },
                },
            },
            {
                id: "pest_monitoring",
                name: "Giám sát sinh trưởng & sâu bệnh",
                description: "Sổ theo dõi rầy nhảy, sâu đục quả, nấm phytophthora và quan sát thời tiết",
                menuPath: "/dashboard/farmer/statistics",
                actions: {
                    view: { key: "PEST_MONITORING_VIEW", label: "Xem sổ sâu bệnh", action: "view" },
                    create: { key: "PEST_MONITORING_CREATE", label: "Ghi nhận dịch hại", action: "create" },
                    edit: { key: "PEST_MONITORING_EDIT", label: "Cập nhật xử lý", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "PEST_MONITORING_APPROVE", label: "Xác nhận khoanh vùng", action: "approve" },
                    export: { key: "PEST_MONITORING_EXPORT", label: "Xuất báo cáo sâu bệnh", action: "export" },
                },
            },
            {
                id: "supplies_procurement",
                name: "Giỏ hàng & Đơn mua vật tư",
                description: "Đặt mua phân bón, thuốc BVTV từ các cửa hàng vật tư liên kết trong sàn",
                menuPath: "/materials",
                actions: {
                    view: { key: "SUPPLIES_ORDER_VIEW", label: "Xem đơn mua vật tư", action: "view" },
                    create: { key: "SUPPLIES_ORDER_CREATE", label: "Tạo đơn đặt mua", action: "create" },
                    // edit: không áp dụng
                    delete: { key: "SUPPLIES_ORDER_DELETE", label: "Hủy đơn đặt mua", action: "delete" },
                    // approve: không áp dụng
                    export: { key: "SUPPLIES_ORDER_EXPORT", label: "In phiếu đặt hàng", action: "export" },
                },
            },
        ],
    },
    {
        id: "HARVEST",
        name: "THU HOẠCH",
        title: "Quản lý thu hoạch & Bàn giao tại vườn",
        description: "Lập phiếu báo thu hoạch, phân loại giống, cân ký và bàn giao cho vựa/nhà máy",
        iconName: "Wheat",
        features: [
            {
                id: "harvest_request",
                name: "Phiếu đăng ký thu hoạch vườn",
                description: "Khai báo ngày cắt dự kiến, sản lượng ước tính, giống (Ri6, Dona) và hình ảnh mẫu quả",
                menuPath: "/dashboard/farmer/harvests",
                actions: {
                    view: { key: "HARVEST_REQUEST_VIEW", label: "Xem phiếu thu hoạch", action: "view" },
                    create: { key: "HARVEST_REQUEST_CREATE", label: "Tạo phiếu báo cắt", action: "create" },
                    edit: { key: "HARVEST_REQUEST_EDIT", label: "Sửa phiếu thu hoạch", action: "edit" },
                    delete: { key: "HARVEST_REQUEST_DELETE", label: "Hủy phiếu thu hoạch", action: "delete" },
                    // approve: do buyer duyệt bên module thu mua
                    export: { key: "HARVEST_REQUEST_EXPORT", label: "Xuất phiếu thu hoạch", action: "export" },
                },
            },
            {
                id: "harvest_delivery",
                name: "Biên bản bàn giao & Cân ký thực tế",
                description: "Ghi nhận trọng lượng thực tế tại gốc, tỷ lệ quả dạt và xác nhận hai bên",
                menuPath: "/dashboard/farmer/harvests",
                actions: {
                    view: { key: "HARVEST_DELIVERY_VIEW", label: "Xem biên bản cân", action: "view" },
                    // create: sinh tự động từ quy trình
                    edit: { key: "HARVEST_DELIVERY_EDIT", label: "Cập nhật trọng lượng", action: "edit" },
                    // delete: không được xóa
                    approve: { key: "HARVEST_DELIVERY_APPROVE", label: "Ký xác nhận bàn giao", action: "approve" },
                    export: { key: "HARVEST_DELIVERY_EXPORT", label: "In biên bản bàn giao", action: "export" },
                },
            },
        ],
    },
    {
        id: "PROCUREMENT",
        name: "THU MUA",
        title: "Quản lý thu mua, tiếp nhận & Gom hàng",
        description: "Tiếp nhận nguồn cung từ nông dân, thỏa thuận giá, kiểm tra QC và lập lô thu gom",
        iconName: "Handshake",
        features: [
            {
                id: "procurement_inbox",
                name: "Phiếu thu hoạch gửi đến từ vườn",
                description: "Danh sách thông báo cắt sầu riêng gửi đến từ nông dân trong vùng liên kết",
                menuPath: "/dashboard/partner/harvests",
                actions: {
                    view: { key: "PROCUREMENT_INBOX_VIEW", label: "Xem phiếu gửi đến", action: "view" },
                    // create: nông dân tạo
                    // edit: không áp dụng
                    // delete: không áp dụng
                    approve: { key: "PROCUREMENT_INBOX_APPROVE", label: "Xác nhận tiếp nhận/Từ chối", action: "approve" },
                    export: { key: "PROCUREMENT_INBOX_EXPORT", label: "Xuất danh sách phiếu", action: "export" },
                },
            },
            {
                id: "procurement_orders",
                name: "Đơn thu mua & Hợp đồng bao tiêu",
                description: "Quản lý đơn thu mua chính thức, thỏa thuận giá theo loại quả (A, B, C, dạt)",
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
                name: "Kiểm định chất lượng thu mua (QC)",
                description: "Kiểm tra độ chín, độ ngọt brix, tồn dư nấm bệnh và phân loại phẩm cấp thu mua",
                menuPath: "/dashboard/partner/orders",
                actions: {
                    view: { key: "PROCUREMENT_QC_VIEW", label: "Xem kết quả QC", action: "view" },
                    create: { key: "PROCUREMENT_QC_CREATE", label: "Lập phiếu kiểm tra QC", action: "create" },
                    edit: { key: "PROCUREMENT_QC_EDIT", label: "Sửa kết quả QC", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "PROCUREMENT_QC_APPROVE", label: "Xác nhận đạt chuẩn QC", action: "approve" },
                    export: { key: "PROCUREMENT_QC_EXPORT", label: "Xuất phiếu kiểm định", action: "export" },
                },
            },
            {
                id: "collection_lots",
                name: "Lô hàng thu gom (Collection Lot)",
                description: "Gom các đợt thu hoạch từ nhiều vườn thành lô hàng lớn chuẩn bị chuyển nhà máy",
                menuPath: "/dashboard/partner/lots",
                actions: {
                    view: { key: "COLLECTION_LOT_VIEW", label: "Xem lô thu gom", action: "view" },
                    create: { key: "COLLECTION_LOT_CREATE", label: "Tạo lô thu gom mới", action: "create" },
                    edit: { key: "COLLECTION_LOT_EDIT", label: "Sửa thông tin lô gom", action: "edit" },
                    delete: { key: "COLLECTION_LOT_DELETE", label: "Hủy lô thu gom", action: "delete" },
                    approve: { key: "COLLECTION_LOT_APPROVE", label: "Chốt đóng lô thu gom", action: "approve" },
                    export: { key: "COLLECTION_LOT_EXPORT", label: "In phiếu lô thu gom", action: "export" },
                },
            },
        ],
    },
    {
        id: "PROCESSING",
        name: "CHẾ BIẾN & SẢN XUẤT",
        title: "Quy trình chế biến sầu riêng, bóc múi & cấp đông",
        description: "Quản lý nguyên liệu vào, công đoạn bóc tách múi, khử trùng, cấp đông và kiểm tra thành phẩm",
        iconName: "Factory",
        features: [
            {
                id: "raw_material_intake",
                name: "Tiếp nhận nguyên liệu thô",
                description: "Nhập sầu riêng quả từ vựa hoặc vườn vào kho mát chờ xử lý chế biến",
                menuPath: "/dashboard/processing/raw-materials",
                actions: {
                    view: { key: "RAW_MATERIAL_VIEW", label: "Xem nguyên liệu thô", action: "view" },
                    create: { key: "RAW_MATERIAL_CREATE", label: "Tạo phiếu nhập nguyên liệu", action: "create" },
                    edit: { key: "RAW_MATERIAL_EDIT", label: "Sửa thông tin nguyên liệu", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "RAW_MATERIAL_APPROVE", label: "Duyệt nhập kho nguyên liệu", action: "approve" },
                    export: { key: "RAW_MATERIAL_EXPORT", label: "Xuất phiếu nhập", action: "export" },
                },
            },
            {
                id: "processing_batches",
                name: "Mẻ chế biến & Giám sát công đoạn",
                description: "Quản lý mẻ sơ chế, rửa khử trùng, tách múi, phân loại múi A/B và cấp đông sâu IQF",
                menuPath: "/dashboard/processing/processing",
                actions: {
                    view: { key: "PROCESSING_BATCH_VIEW", label: "Xem mẻ chế biến", action: "view" },
                    create: { key: "PROCESSING_BATCH_CREATE", label: "Khởi tạo mẻ chế biến", action: "create" },
                    edit: { key: "PROCESSING_BATCH_EDIT", label: "Cập nhật tiến độ mẻ", action: "edit" },
                    delete: { key: "PROCESSING_BATCH_DELETE", label: "Hủy mẻ chế biến", action: "delete" },
                    approve: { key: "PROCESSING_BATCH_APPROVE", label: "Hoàn tất mẻ chế biến", action: "approve" },
                    export: { key: "PROCESSING_BATCH_EXPORT", label: "Xuất nhật ký mẻ", action: "export" },
                },
            },
            {
                id: "processing_qc",
                name: "Kiểm định chất lượng thành phẩm (Finished QC)",
                description: "Đánh giá vi sinh, dư lượng, độ lạnh tâm sản phẩm và tiêu chuẩn bao bì trước khi nhập kho",
                menuPath: "/dashboard/processing/processing",
                actions: {
                    view: { key: "PROCESSING_QC_VIEW", label: "Xem kết quả QC thành phẩm", action: "view" },
                    create: { key: "PROCESSING_QC_CREATE", label: "Lập phiếu kiểm tra QC", action: "create" },
                    edit: { key: "PROCESSING_QC_EDIT", label: "Sửa kết quả QC", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "PROCESSING_QC_APPROVE", label: "Xác nhận đạt chuẩn xuất xưởng", action: "approve" },
                    export: { key: "PROCESSING_QC_EXPORT", label: "Xuất chứng thư QC", action: "export" },
                },
            },
        ],
    },
    {
        id: "INVENTORY",
        name: "KHO HÀNG & THÀNH PHẨM",
        title: "Quản lý tồn kho, nhập xuất & đóng hàng thương mại",
        description: "Quản lý tồn kho sản phẩm, thành phẩm cấp đông, chuyển kho và xuất bán cho đối tác",
        iconName: "Package",
        features: [
            {
                id: "finished_product_lots",
                name: "Danh sách lô thành phẩm",
                description: "Theo dõi các lô sầu riêng cấp đông, sầu riêng sấy, quy cách đóng gói và hạn sử dụng",
                menuPath: "/dashboard/processing/finished-products",
                actions: {
                    view: { key: "FINISHED_LOT_VIEW", label: "Xem lô thành phẩm", action: "view" },
                    // create: '—' (Không áp dụng vì thành phẩm được sinh từ mẻ chế biến)
                    edit: { key: "FINISHED_LOT_EDIT", label: "Chỉnh sửa thông tin lô", action: "edit" },
                    // delete: không áp dụng
                    // approve: không áp dụng
                    export: { key: "FINISHED_LOT_EXPORT", label: "Xuất danh sách lô", action: "export" },
                },
            },
            {
                id: "warehouse_movements",
                name: "Nhập kho & Chuyển kho nội bộ",
                description: "Phiếu nhập thành phẩm từ xưởng, chuyển giữa các kho mát/kho đông và điều phối",
                menuPath: "/dashboard/store/inventory",
                actions: {
                    view: { key: "WAREHOUSE_MOVE_VIEW", label: "Xem phiếu điều chuyển", action: "view" },
                    create: { key: "WAREHOUSE_MOVE_CREATE", label: "Tạo phiếu nhập/chuyển", action: "create" },
                    edit: { key: "WAREHOUSE_MOVE_EDIT", label: "Sửa phiếu điều chuyển", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "WAREHOUSE_MOVE_APPROVE", label: "Xác nhận nhập/xuất kho", action: "approve" },
                    export: { key: "WAREHOUSE_MOVE_EXPORT", label: "In phiếu kho", action: "export" },
                },
            },
            {
                id: "commercial_dispatch",
                name: "Xuất bán & Đóng hàng thương mại",
                description: "Xuất bán cho nhà phân phối, siêu thị, container xuất khẩu và gán mã QR thương phẩm",
                menuPath: "/dashboard/partner/lots",
                actions: {
                    view: { key: "COMMERCIAL_DISPATCH_VIEW", label: "Xem đơn xuất bán", action: "view" },
                    create: { key: "COMMERCIAL_DISPATCH_CREATE", label: "Tạo lô xuất bán", action: "create" },
                    edit: { key: "COMMERCIAL_DISPATCH_EDIT", label: "Sửa thông tin xuất bán", action: "edit" },
                    delete: { key: "COMMERCIAL_DISPATCH_DELETE", label: "Hủy lệnh xuất bán", action: "delete" },
                    approve: { key: "COMMERCIAL_DISPATCH_APPROVE", label: "Xác nhận xuất kho giao", action: "approve" },
                    export: { key: "COMMERCIAL_DISPATCH_EXPORT", label: "In phiếu xuất bán", action: "export" },
                },
            },
        ],
    },
    {
        id: "STORE_MARKETPLACE",
        name: "CỬA HÀNG VẬT TƯ",
        title: "Kinh doanh phân bón, thuốc BVTV & vật tư nông nghiệp",
        description: "Quản lý danh mục sản phẩm, tồn kho cửa hàng, tiếp nhận và xử lý đơn đặt hàng của nông dân",
        iconName: "Store",
        features: [
            {
                id: "store_products",
                name: "Danh mục sản phẩm kinh doanh",
                description: "Đăng tải phân bón, thuốc bảo vệ thực vật, giá bán, hướng dẫn sử dụng và chứng nhận",
                menuPath: "/dashboard/store/products",
                actions: {
                    view: { key: "STORE_PRODUCT_VIEW", label: "Xem danh mục sản phẩm", action: "view" },
                    create: { key: "STORE_PRODUCT_CREATE", label: "Đăng sản phẩm mới", action: "create" },
                    edit: { key: "STORE_PRODUCT_EDIT", label: "Cập nhật giá & tồn kho", action: "edit" },
                    delete: { key: "STORE_PRODUCT_DELETE", label: "Ẩn/Xóa sản phẩm", action: "delete" },
                    // approve: do admin duyệt
                    export: { key: "STORE_PRODUCT_EXPORT", label: "Xuất bảng giá vật tư", action: "export" },
                },
            },
            {
                id: "store_orders",
                name: "Xử lý đơn hàng từ nông dân",
                description: "Tiếp nhận đơn đặt hàng, chuẩn bị vật tư, giao hàng và xác nhận thanh toán",
                menuPath: "/dashboard/store/orders",
                actions: {
                    view: { key: "STORE_ORDER_VIEW", label: "Xem đơn hàng", action: "view" },
                    // create: nông dân đặt
                    edit: { key: "STORE_ORDER_EDIT", label: "Cập nhật trạng thái đơn", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "STORE_ORDER_APPROVE", label: "Xác nhận giao hàng/thanh toán", action: "approve" },
                    export: { key: "STORE_ORDER_EXPORT", label: "In hóa đơn bán lẻ", action: "export" },
                },
            },
        ],
    },
    {
        id: "SEEDLING_NURSERY",
        name: "TRẠI GIỐNG",
        title: "Quản lý vườn ươm, cây giống & kiểm định đầu dòng",
        description: "Hồ sơ vườn ươm giống, chứng nhận cây mẹ đầu dòng, theo dõi lô cây giống và phân phối",
        iconName: "Trees",
        features: [
            {
                id: "nursery_profile",
                name: "Hồ sơ trại giống & Cây đầu dòng",
                description: "Khai báo nguồn gốc mắt ghép, chứng chỉ cây đầu dòng giống Ri6, Monthong, Musang King",
                menuPath: "/seedlings",
                actions: {
                    view: { key: "NURSERY_PROFILE_VIEW", label: "Xem hồ sơ trại giống", action: "view" },
                    create: { key: "NURSERY_PROFILE_CREATE", label: "Đăng ký trại giống mới", action: "create" },
                    edit: { key: "NURSERY_PROFILE_EDIT", label: "Sửa hồ sơ trại giống", action: "edit" },
                    delete: { key: "NURSERY_PROFILE_DELETE", label: "Xóa hồ sơ trại", action: "delete" },
                    // approve: do admin duyệt
                    export: { key: "NURSERY_PROFILE_EXPORT", label: "Xuất hồ sơ kiểm định", action: "export" },
                },
            },
            {
                id: "seedling_batches",
                name: "Quản lý lô cây giống & Giấy chứng nhận",
                description: "Theo dõi số lượng cây xuất vườn, chiều cao, độ tuổi ghép và tem mã chứng nhận xuất xứ",
                menuPath: "/seedlings",
                actions: {
                    view: { key: "SEEDLING_BATCH_VIEW", label: "Xem lô cây giống", action: "view" },
                    create: { key: "SEEDLING_BATCH_CREATE", label: "Khai báo lô cây giống", action: "create" },
                    edit: { key: "SEEDLING_BATCH_EDIT", label: "Cập nhật lô cây", action: "edit" },
                    delete: { key: "SEEDLING_BATCH_DELETE", label: "Hủy lô cây giống", action: "delete" },
                    approve: { key: "SEEDLING_BATCH_APPROVE", label: "Xác nhận kiểm định giống", action: "approve" },
                    export: { key: "SEEDLING_BATCH_EXPORT", label: "In chứng nhận cây giống", action: "export" },
                },
            },
        ],
    },
    {
        id: "FINANCE",
        name: "TÀI CHÍNH",
        title: "Báo cáo doanh thu, chi phí sản xuất & công nợ",
        description: "Dashboard tài chính, sổ thu chi chi tiết, đối soát công nợ mua bán và xuất báo cáo",
        iconName: "CircleDollarSign",
        features: [
            {
                id: "finance_dashboard",
                name: "Tổng quan tài chính & Dòng tiền",
                description: "Biểu đồ doanh thu theo mùa vụ, cơ cấu chi phí nhân công, vật tư, phân bón và lợi nhuận",
                menuPath: "/dashboard/partner/finance",
                actions: {
                    view: { key: "FINANCE_DASHBOARD_VIEW", label: "Xem tổng quan tài chính", action: "view" },
                    // create: không áp dụng
                    // edit: không áp dụng
                    // delete: không áp dụng
                    // approve: không áp dụng
                    export: { key: "FINANCE_DASHBOARD_EXPORT", label: "Xuất báo cáo tổng quan", action: "export" },
                },
            },
            {
                id: "expense_book",
                name: "Sổ thu chi & Khoản mục chi phí",
                description: "Ghi chép các khoản chi mua vật tư, trả tiền thu mua, tiền điện lạnh, nhân công bóc múi",
                menuPath: "/dashboard/partner/finance",
                actions: {
                    view: { key: "EXPENSE_BOOK_VIEW", label: "Xem sổ thu chi", action: "view" },
                    create: { key: "EXPENSE_BOOK_CREATE", label: "Lập phiếu thu/chi", action: "create" },
                    edit: { key: "EXPENSE_BOOK_EDIT", label: "Sửa phiếu thu/chi", action: "edit" },
                    delete: { key: "EXPENSE_BOOK_DELETE", label: "Xóa phiếu thu/chi", action: "delete" },
                    approve: { key: "EXPENSE_BOOK_APPROVE", label: "Duyệt chi thanh toán", action: "approve" },
                    export: { key: "EXPENSE_BOOK_EXPORT", label: "Xuất sổ thu chi Excel", action: "export" },
                },
            },
            {
                id: "debt_management",
                name: "Quản lý công nợ khách hàng & đối tác",
                description: "Theo dõi các khoản phải thu từ người mua, tạm ứng cho nông dân và hạn thanh toán",
                menuPath: "/dashboard/partner/finance",
                actions: {
                    view: { key: "DEBT_VIEW", label: "Xem sổ công nợ", action: "view" },
                    create: { key: "DEBT_CREATE", label: "Ghi nhận công nợ mới", action: "create" },
                    edit: { key: "DEBT_EDIT", label: "Cập nhật thanh toán nợ", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "DEBT_APPROVE", label: "Xác nhận đối soát hết nợ", action: "approve" },
                    export: { key: "DEBT_EXPORT", label: "In bảng đối soát công nợ", action: "export" },
                },
            },
        ],
    },
    {
        id: "TRACEABILITY",
        name: "TRUY XUẤT & QR",
        title: "Hệ thống truy xuất nguồn gốc, mã QR & Cổng China Port (GACC)",
        description: "Phát hành mã QR truy xuất, kiểm tra chuỗi dữ liệu minh bạch và đối soát mã vùng trồng GACC",
        iconName: "QrCode",
        features: [
            {
                id: "qr_issuance",
                name: "Phát hành & Quản lý mã QR truy xuất",
                description: "Sinh mã QR chuẩn quốc gia gắn vào từng thùng/lô hàng sầu riêng trước khi phân phối",
                menuPath: "/dashboard/farmer/traceability",
                actions: {
                    view: { key: "QR_MANAGE_VIEW", label: "Xem danh sách mã QR", action: "view" },
                    create: { key: "QR_MANAGE_CREATE", label: "Tạo & Cấp phát mã QR", action: "create" },
                    edit: { key: "QR_MANAGE_EDIT", label: "Cập nhật thông tin mã QR", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "QR_MANAGE_APPROVE", label: "Kích hoạt mã QR ra thị trường", action: "approve" },
                    export: { key: "QR_MANAGE_EXPORT", label: "In/Xuất tem mã QR", action: "export" },
                },
            },
            {
                id: "china_port_lookup",
                name: "Cổng kiểm dịch China Port (GACC)",
                description: "Tra cứu danh sách doanh nghiệp, cơ sở đóng gói và vùng trồng được GACC phê duyệt",
                menuPath: "/china-port",
                actions: {
                    view: { key: "CHINA_PORT_VIEW", label: "Tra cứu China Port", action: "view" },
                    // create: không áp dụng
                    // edit: không áp dụng
                    // delete: không áp dụng
                    // approve: không áp dụng
                    export: { key: "CHINA_PORT_EXPORT", label: "Xuất dữ liệu GACC", action: "export" },
                },
            },
        ],
    },
    {
        id: "SYSTEM_ADMIN",
        name: "QUẢN TRỊ & HỆ THỐNG",
        title: "Quản lý người dùng, duyệt hồ sơ, danh mục & tin tức",
        description: "Phê duyệt tài khoản, phân quyền vai trò, quản trị danh mục giống, hoạt chất và thông báo",
        iconName: "ShieldCheck",
        features: [
            {
                id: "user_accounts",
                name: "Quản lý tài khoản & Duyệt hồ sơ",
                description: "Danh sách người dùng, phê duyệt nông dân, vựa thu mua, cơ sở chế biến và khóa tài khoản",
                menuPath: "/dashboard/admin/accounts",
                actions: {
                    view: { key: "USER_ACCOUNT_VIEW", label: "Xem danh sách tài khoản", action: "view" },
                    create: { key: "USER_ACCOUNT_CREATE", label: "Tạo tài khoản mới", action: "create" },
                    edit: { key: "USER_ACCOUNT_EDIT", label: "Sửa thông tin tài khoản", action: "edit" },
                    delete: { key: "USER_ACCOUNT_DELETE", label: "Khóa/Xóa tài khoản", action: "delete" },
                    approve: { key: "USER_ACCOUNT_APPROVE", label: "Phê duyệt Onboarding", action: "approve" },
                    export: { key: "USER_ACCOUNT_EXPORT", label: "Xuất danh sách người dùng", action: "export" },
                },
            },
            {
                id: "role_permissions",
                name: "Phân quyền vai trò hệ thống",
                description: "Cấu hình chi tiết quyền hạn truy cập các phân hệ và hành động cho từng vai trò",
                menuPath: "/dashboard/admin/permissions",
                actions: {
                    view: { key: "ROLE_PERMISSION_VIEW", label: "Xem bảng phân quyền", action: "view" },
                    // create: không áp dụng
                    edit: { key: "ROLE_PERMISSION_EDIT", label: "Cập nhật phân quyền", action: "edit" },
                    // delete: không áp dụng
                    approve: { key: "ROLE_PERMISSION_APPROVE", label: "Phê duyệt thay đổi quyền", action: "approve" },
                    export: { key: "ROLE_PERMISSION_EXPORT", label: "Xuất ma trận phân quyền", action: "export" },
                },
            },
            {
                id: "master_catalogs",
                name: "Danh mục dùng chung & Thuốc cấm GACC",
                description: "Danh mục giống sầu riêng, phân bón, giai đoạn canh tác và danh sách hóa chất bị GACC cấm",
                menuPath: "/dashboard/admin/catalog",
                actions: {
                    view: { key: "MASTER_CATALOG_VIEW", label: "Xem danh mục", action: "view" },
                    create: { key: "MASTER_CATALOG_CREATE", label: "Thêm mục mới", action: "create" },
                    edit: { key: "MASTER_CATALOG_EDIT", label: "Sửa danh mục", action: "edit" },
                    delete: { key: "MASTER_CATALOG_DELETE", label: "Xóa mục danh mục", action: "delete" },
                    approve: { key: "MASTER_CATALOG_APPROVE", label: "Ban hành danh mục chuẩn", action: "approve" },
                    export: { key: "MASTER_CATALOG_EXPORT", label: "Xuất dữ liệu danh mục", action: "export" },
                },
            },
        ],
    },
];

// 3. Quyền mặc định được cấu hình trước cho từng Role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[] }> = {
    AREA_MANAGER: {
        moduleEnabled: {
            CULTIVATION: true,
            HARVEST: true,
            PROCUREMENT: false,
            PROCESSING: false,
            INVENTORY: false,
            STORE_MARKETPLACE: false,
            SEEDLING_NURSERY: false,
            FINANCE: false,
            TRACEABILITY: true,
            SYSTEM_ADMIN: true,
        },
        permissions: [
            "FARM_PROFILE_VIEW", "FARM_PROFILE_EDIT", "FARM_PROFILE_APPROVE", "FARM_PROFILE_EXPORT",
            "FARMING_LOG_VIEW", "FARMING_LOG_APPROVE", "FARMING_LOG_EXPORT",
            "FARMING_PLAN_VIEW", "FARMING_PLAN_EXPORT",
            "PEST_MONITORING_VIEW", "PEST_MONITORING_APPROVE", "PEST_MONITORING_EXPORT",
            "HARVEST_REQUEST_VIEW", "HARVEST_REQUEST_EXPORT",
            "HARVEST_DELIVERY_VIEW", "HARVEST_DELIVERY_APPROVE", "HARVEST_DELIVERY_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
            "USER_ACCOUNT_VIEW", "USER_ACCOUNT_APPROVE", "USER_ACCOUNT_EXPORT",
            "MASTER_CATALOG_VIEW", "MASTER_CATALOG_EXPORT",
        ],
    },
    FARMER: {
        moduleEnabled: {
            CULTIVATION: true,
            HARVEST: true,
            PROCUREMENT: false,
            PROCESSING: false,
            INVENTORY: false,
            STORE_MARKETPLACE: false,
            SEEDLING_NURSERY: false,
            FINANCE: true,
            TRACEABILITY: true,
            SYSTEM_ADMIN: false,
        },
        permissions: [
            "FARM_PROFILE_VIEW", "FARM_PROFILE_CREATE", "FARM_PROFILE_EDIT", "FARM_PROFILE_EXPORT",
            "FARMING_LOG_VIEW", "FARMING_LOG_CREATE", "FARMING_LOG_EDIT", "FARMING_LOG_DELETE", "FARMING_LOG_EXPORT",
            "FARMING_PLAN_VIEW", "FARMING_PLAN_CREATE", "FARMING_PLAN_EDIT", "FARMING_PLAN_DELETE", "FARMING_PLAN_EXPORT",
            "PEST_MONITORING_VIEW", "PEST_MONITORING_CREATE", "PEST_MONITORING_EDIT", "PEST_MONITORING_EXPORT",
            "SUPPLIES_ORDER_VIEW", "SUPPLIES_ORDER_CREATE", "SUPPLIES_ORDER_DELETE", "SUPPLIES_ORDER_EXPORT",
            "HARVEST_REQUEST_VIEW", "HARVEST_REQUEST_CREATE", "HARVEST_REQUEST_EDIT", "HARVEST_REQUEST_DELETE", "HARVEST_REQUEST_EXPORT",
            "HARVEST_DELIVERY_VIEW", "HARVEST_DELIVERY_APPROVE", "HARVEST_DELIVERY_EXPORT",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_DELETE", "EXPENSE_BOOK_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_CREATE", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
        ],
    },
    COLLECTOR: {
        moduleEnabled: {
            CULTIVATION: false,
            HARVEST: true,
            PROCUREMENT: true,
            PROCESSING: false,
            INVENTORY: true,
            STORE_MARKETPLACE: false,
            SEEDLING_NURSERY: false,
            FINANCE: true,
            TRACEABILITY: true,
            SYSTEM_ADMIN: false,
        },
        permissions: [
            "HARVEST_REQUEST_VIEW", "HARVEST_REQUEST_EXPORT",
            "HARVEST_DELIVERY_VIEW", "HARVEST_DELIVERY_EDIT", "HARVEST_DELIVERY_APPROVE", "HARVEST_DELIVERY_EXPORT",
            "PROCUREMENT_INBOX_VIEW", "PROCUREMENT_INBOX_APPROVE", "PROCUREMENT_INBOX_EXPORT",
            "PROCUREMENT_ORDER_VIEW", "PROCUREMENT_ORDER_CREATE", "PROCUREMENT_ORDER_EDIT", "PROCUREMENT_ORDER_DELETE", "PROCUREMENT_ORDER_APPROVE", "PROCUREMENT_ORDER_EXPORT",
            "PROCUREMENT_QC_VIEW", "PROCUREMENT_QC_CREATE", "PROCUREMENT_QC_EDIT", "PROCUREMENT_QC_APPROVE", "PROCUREMENT_QC_EXPORT",
            "COLLECTION_LOT_VIEW", "COLLECTION_LOT_CREATE", "COLLECTION_LOT_EDIT", "COLLECTION_LOT_DELETE", "COLLECTION_LOT_APPROVE", "COLLECTION_LOT_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW", "COMMERCIAL_DISPATCH_CREATE", "COMMERCIAL_DISPATCH_EDIT", "COMMERCIAL_DISPATCH_DELETE", "COMMERCIAL_DISPATCH_APPROVE", "COMMERCIAL_DISPATCH_EXPORT",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_DELETE", "EXPENSE_BOOK_APPROVE", "EXPENSE_BOOK_EXPORT",
            "DEBT_VIEW", "DEBT_CREATE", "DEBT_EDIT", "DEBT_APPROVE", "DEBT_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_CREATE", "QR_MANAGE_EDIT", "QR_MANAGE_APPROVE", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
        ],
    },
    PROCESSING_FACILITY: {
        moduleEnabled: {
            CULTIVATION: false,
            HARVEST: false,
            PROCUREMENT: true,
            PROCESSING: true,
            INVENTORY: true,
            STORE_MARKETPLACE: false,
            SEEDLING_NURSERY: false,
            FINANCE: true,
            TRACEABILITY: true,
            SYSTEM_ADMIN: false,
        },
        permissions: [
            "RAW_MATERIAL_VIEW", "RAW_MATERIAL_CREATE", "RAW_MATERIAL_EDIT", "RAW_MATERIAL_APPROVE", "RAW_MATERIAL_EXPORT",
            "PROCESSING_BATCH_VIEW", "PROCESSING_BATCH_CREATE", "PROCESSING_BATCH_EDIT", "PROCESSING_BATCH_DELETE", "PROCESSING_BATCH_APPROVE", "PROCESSING_BATCH_EXPORT",
            "PROCESSING_QC_VIEW", "PROCESSING_QC_CREATE", "PROCESSING_QC_EDIT", "PROCESSING_QC_APPROVE", "PROCESSING_QC_EXPORT",
            "FINISHED_LOT_VIEW", "FINISHED_LOT_EDIT", "FINISHED_LOT_EXPORT",
            "WAREHOUSE_MOVE_VIEW", "WAREHOUSE_MOVE_CREATE", "WAREHOUSE_MOVE_EDIT", "WAREHOUSE_MOVE_APPROVE", "WAREHOUSE_MOVE_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW", "COMMERCIAL_DISPATCH_CREATE", "COMMERCIAL_DISPATCH_EDIT", "COMMERCIAL_DISPATCH_DELETE", "COMMERCIAL_DISPATCH_APPROVE", "COMMERCIAL_DISPATCH_EXPORT",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_DELETE", "EXPENSE_BOOK_APPROVE", "EXPENSE_BOOK_EXPORT",
            "DEBT_VIEW", "DEBT_CREATE", "DEBT_EDIT", "DEBT_APPROVE", "DEBT_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_CREATE", "QR_MANAGE_EDIT", "QR_MANAGE_APPROVE", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
        ],
    },
    STORE_OWNER: {
        moduleEnabled: {
            CULTIVATION: true,
            HARVEST: false,
            PROCUREMENT: false,
            PROCESSING: false,
            INVENTORY: true,
            STORE_MARKETPLACE: true,
            SEEDLING_NURSERY: false,
            FINANCE: true,
            TRACEABILITY: false,
            SYSTEM_ADMIN: false,
        },
        permissions: [
            "SUPPLIES_ORDER_VIEW", "SUPPLIES_ORDER_EXPORT",
            "STORE_PRODUCT_VIEW", "STORE_PRODUCT_CREATE", "STORE_PRODUCT_EDIT", "STORE_PRODUCT_DELETE", "STORE_PRODUCT_EXPORT",
            "STORE_ORDER_VIEW", "STORE_ORDER_EDIT", "STORE_ORDER_APPROVE", "STORE_ORDER_EXPORT",
            "WAREHOUSE_MOVE_VIEW", "WAREHOUSE_MOVE_CREATE", "WAREHOUSE_MOVE_EDIT", "WAREHOUSE_MOVE_APPROVE", "WAREHOUSE_MOVE_EXPORT",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_DELETE", "EXPENSE_BOOK_EXPORT",
            "DEBT_VIEW", "DEBT_CREATE", "DEBT_EDIT", "DEBT_EXPORT",
        ],
    },
    SEEDLING_FARM: {
        moduleEnabled: {
            CULTIVATION: true,
            HARVEST: false,
            PROCUREMENT: false,
            PROCESSING: false,
            INVENTORY: false,
            STORE_MARKETPLACE: false,
            SEEDLING_NURSERY: true,
            FINANCE: true,
            TRACEABILITY: true,
            SYSTEM_ADMIN: false,
        },
        permissions: [
            "FARM_PROFILE_VIEW", "FARM_PROFILE_EXPORT",
            "FARMING_LOG_VIEW", "FARMING_LOG_CREATE", "FARMING_LOG_EDIT", "FARMING_LOG_EXPORT",
            "NURSERY_PROFILE_VIEW", "NURSERY_PROFILE_CREATE", "NURSERY_PROFILE_EDIT", "NURSERY_PROFILE_DELETE", "NURSERY_PROFILE_EXPORT",
            "SEEDLING_BATCH_VIEW", "SEEDLING_BATCH_CREATE", "SEEDLING_BATCH_EDIT", "SEEDLING_BATCH_DELETE", "SEEDLING_BATCH_APPROVE", "SEEDLING_BATCH_EXPORT",
            "FINANCE_DASHBOARD_VIEW", "FINANCE_DASHBOARD_EXPORT",
            "EXPENSE_BOOK_VIEW", "EXPENSE_BOOK_CREATE", "EXPENSE_BOOK_EDIT", "EXPENSE_BOOK_EXPORT",
            "QR_MANAGE_VIEW", "QR_MANAGE_CREATE", "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW", "CHINA_PORT_EXPORT",
        ],
    },
};

// 4. Lấy tất cả danh sách các key permission khả dụng trong toàn bộ hệ thống
export function getAllSystemPermissionKeys(): string[] {
    const keys: string[] = [];
    for (const mod of PERMISSION_MODULES) {
        for (const feat of mod.features) {
            for (const act of Object.values(feat.actions)) {
                if (act?.key) keys.push(act.key);
            }
        }
    }
    return keys;
}

// 5. Tính toán thống kê quyền cho một vai trò
export function calculateRolePermissionStats(
    roleKey: string,
    grantedPermissions: string[],
    moduleEnabled: Record<string, boolean>
) {
    let totalAvailable = 0;
    let totalGranted = 0;
    const perModuleStats: Record<string, { granted: number; total: number; isEnabled: boolean }> = {};

    for (const mod of PERMISSION_MODULES) {
        let modTotal = 0;
        let modGranted = 0;
        const isEnabled = moduleEnabled[mod.id] ?? true;

        for (const feat of mod.features) {
            for (const act of Object.values(feat.actions)) {
                if (act?.key) {
                    modTotal += 1;
                    if (isEnabled && grantedPermissions.includes(act.key)) {
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
            isEnabled,
        };
    }

    return {
        totalGranted,
        totalAvailable,
        perModuleStats,
    };
}
