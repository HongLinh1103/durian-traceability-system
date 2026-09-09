export type ActionType = "view" | "create" | "edit" | "delete" | "approve" | "deliver" | "export";

export interface PermissionRouteDef {
    kind: "page" | "api" | "client";
    path: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    operation?: string;
    source: string;
}

export interface PermissionActionDef {
    key: string;
    label: string;
    action: ActionType;
    description?: string;
    routes?: PermissionRouteDef[];
}

export interface FeatureDef {
    id: string;
    name: string;
    description?: string;
    menuPath?: string;
    group?: string;
    actions: Record<string, PermissionActionDef | undefined>;
}

export interface ModuleDef {
    id: string;
    name: string;
    title: string;
    description: string;
    iconName: string;
    isSingleEntity?: boolean;
    features: FeatureDef[];
}

export interface SystemRoleDef {
    key: string;
    name: string;
    description: string;
    targetGroup: string;
    badgeColor: string;
}

export const ROLE_TARGET_GROUPS = [
    "Cơ sở chế biến",
    "Vùng trồng & Nông hộ",
    "Vựa thu mua",
    "Cửa hàng vật tư",
    "Quản trị hệ thống",
] as const;

export type RoleTargetGroup = typeof ROLE_TARGET_GROUPS[number];

// Danh sách các vai trò chính thức trong hệ thống TriViet
export const SYSTEM_ROLES: SystemRoleDef[] = [
    {
        key: "ADMIN",
        name: "Administrator",
        description: "Quản trị viên tối cao hệ thống, quản trị cấu hình, tài khoản và phân quyền toàn diện",
        targetGroup: "Quản trị hệ thống",
        badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    },
    {
        key: "FARMER",
        name: "Nông dân",
        description: "Chủ vườn sầu riêng, ghi nhật ký canh tác, lập kế hoạch mùa vụ và đăng ký thu hoạch",
        targetGroup: "Vùng trồng & Nông hộ",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
        key: "PROCESSING_FACILITY",
        name: "Cơ sở chế biến",
        description: "Tiếp nhận nguyên liệu, bóc tách múi, cấp đông IQF, đóng gói thành phẩm và xuất hàng",
        targetGroup: "Cơ sở chế biến",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
        key: "COLLECTOR",
        name: "Vựa thu mua",
        description: "Tiếp nhận phiếu thu hoạch, cân nhận nông sản, kiểm tra QC và tạo lô gom hàng",
        targetGroup: "Vựa thu mua",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
        key: "STORE_OWNER",
        name: "Cửa hàng vật tư",
        description: "Kinh doanh phân bón, thuốc BVTV, xử lý đơn đặt hàng nông dân và quản lý kho vật tư",
        targetGroup: "Cửa hàng vật tư",
        badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    },
    {
        key: "AREA_MANAGER",
        name: "Trưởng ban",
        description: "Quản lý vùng trồng, giám sát vườn nông dân, hồ sơ tiêu chuẩn và chuỗi liên kết",
        targetGroup: "Vùng trồng & Nông hộ",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    },
];

export interface CustomRoleDef {
    key: string;
    name: string;
    description: string;
    targetGroup: string;
    badgeColor: string;
    status: "ACTIVE" | "INACTIVE";
    permissions: string[];
    assignedUserIds?: string[];
}

export interface RoleAssignedUser {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    organization?: string;
    accountStatus: string;
    role: string;
}

export const INITIAL_CUSTOM_ROLES: CustomRoleDef[] = [
    {
        key: "PROCESSING_STAFF",
        name: "Nhân viên chế biến",
        description: "Nhân viên thực hiện tiếp nhận, phân loại, bóc tách múi, cấp đông IQF và đóng gói thành phẩm tại xưởng",
        targetGroup: "Cơ sở chế biến",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
        status: "ACTIVE",
        permissions: [
            "RAW_MATERIAL_CLASSIFY_VIEW",
            "RAW_MATERIAL_CLASSIFY_EXEC",
            "PROCESSING_BATCH_VIEW",
            "PROCESSING_BATCH_CREATE",
            "PROCESSING_BATCH_COMPLETE",
            "FINISHED_LOT_VIEW",
            "FINISHED_LOT_CREATE",
            "FINISHED_LOT_COMPLETE",
            "SHIPMENT_VIEW",
            "QR_TRACE_VIEW"
        ],
        assignedUserIds: [
            "mock-proc-1",
            "mock-proc-2",
            "mock-proc-3",
            "mock-proc-4"
        ]
    },
    {
        key: "INTAKE_STAFF",
        name: "Nhân viên tiếp nhận",
        description: "Nhân viên thực hiện tiếp nhận nguyên liệu từ vườn/vựa, kiểm tra QC và phân loại quả tại xưởng",
        targetGroup: "Cơ sở chế biến",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
        status: "ACTIVE",
        permissions: [
            "INTAKE_HARVEST_VIEW",
            "INTAKE_HARVEST_ACCEPT",
            "GOODS_RECEIPT_VIEW",
            "GOODS_RECEIPT_CONFIRM",
            "RAW_MATERIAL_CLASSIFY_VIEW",
            "RAW_MATERIAL_CLASSIFY_EXEC",
            "QC_INSPECTION_VIEW",
            "QC_INSPECTION_CREATE",
            "QC_INSPECTION_CONFIRM",
            "QR_TRACE_VIEW"
        ],
        assignedUserIds: [
            "mock-intake-1",
            "mock-intake-2",
            "mock-intake-3"
        ]
    },
    {
        key: "DISPATCH_STAFF",
        name: "Nhân viên xuất hàng",
        description: "Nhân viên lập lệnh xuất hàng, gán cont lạnh, kiểm tra niêm phong và xuất kho thương mại",
        targetGroup: "Cơ sở chế biến",
        badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
        status: "ACTIVE",
        permissions: [
            "FINISHED_LOT_VIEW",
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "SHIPMENT_CONFIRM",
            "SHIPMENT_EXPORT_DOC",
            "COMMERCIAL_DISPATCH_VIEW",
            "COMMERCIAL_DISPATCH_CREATE",
            "COMMERCIAL_DISPATCH_PRINT",
            "QR_TRACE_VIEW",
            "WAREHOUSE_EXPORT_VIEW",
            "WAREHOUSE_EXPORT_CREATE",
            "WAREHOUSE_TRANSFER_VIEW"
        ],
        assignedUserIds: [
            "mock-dispatch-1",
            "mock-dispatch-2"
        ]
    }
];

export const MOCK_ASSIGNED_USERS: Record<string, RoleAssignedUser[]> = {
    PROCESSING_STAFF: [
        { id: "mock-proc-1", fullName: "Nguyễn Văn A", phone: "0901 111 222", email: "nguyenvana@processing.vn", organization: "Cơ sở Chế biến Trị An", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-proc-2", fullName: "Trần Văn B", phone: "0902 222 333", email: "tranvanb@processing.vn", organization: "Cơ sở Chế biến Minh Phát", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-proc-3", fullName: "Lê Thị Cẩm Tú", phone: "0903 333 444", email: "camtu@durian-daklak.vn", organization: "Xưởng Chế Biến Sầu Riêng Đắk Lắk", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-proc-4", fullName: "Hoàng Trọng Nhân", phone: "0904 444 555", email: "nhanht@phongdien-foods.vn", organization: "Nhà máy Nông sản Phong Điền", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
    ],
    INTAKE_STAFF: [
        { id: "mock-intake-1", fullName: "Đặng Hữu Tài", phone: "0905 555 666", email: "taidh@trian.vn", organization: "Cơ sở Chế biến Trị An", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-intake-2", fullName: "Phạm Thị Hoa", phone: "0906 666 777", email: "hoapt@minhphat.vn", organization: "Cơ sở Chế biến Minh Phát", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-intake-3", fullName: "Ngô Minh Trí", phone: "0907 777 888", email: "trinm@durian-daklak.vn", organization: "Xưởng Chế Biến Sầu Riêng Đắk Lắk", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
    ],
    DISPATCH_STAFF: [
        { id: "mock-dispatch-1", fullName: "Vũ Đức Long", phone: "0908 888 999", email: "longvd@durian-daklak.vn", organization: "Xưởng Chế Biến Sầu Riêng Đắk Lắk", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-dispatch-2", fullName: "Bùi Quốc Huy", phone: "0909 999 000", email: "huybq@trian.vn", organization: "Cơ sở Chế biến Trị An", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
    ],
    ADMIN: [
        { id: "mock-admin-1", fullName: "Admin Trí Việt", phone: "0900 000 001", email: "admin@triviet.vn", organization: "Tổng bộ Quản trị Trí Việt", accountStatus: "APPROVED", role: "ADMIN" },
        { id: "mock-admin-2", fullName: "Quản Trị Viên Kỹ Thuật", phone: "0900 000 002", email: "tech@triviet.vn", organization: "Trung tâm Công nghệ & Vận hành", accountStatus: "APPROVED", role: "ADMIN" },
    ],
    FARMER: [
        { id: "mock-farmer-1", fullName: "Nguyễn Văn Ba (Ba Durian)", phone: "0911 234 567", email: "baview@nongdan.vn", organization: "Vườn Sầu Riêng Bảy Ngàn", accountStatus: "APPROVED", role: "FARMER" },
        { id: "mock-farmer-2", fullName: "Trần Văn Sáu", phone: "0912 345 678", email: "sau.durian@nongdan.vn", organization: "Vườn Sầu Riêng Cai Lậy", accountStatus: "APPROVED", role: "FARMER" },
        { id: "mock-farmer-3", fullName: "Lê Văn Tám", phone: "0913 456 789", email: "tam.krongpak@nongdan.vn", organization: "Nông hộ Krông Pắk Đắk Lắk", accountStatus: "APPROVED", role: "FARMER" },
        { id: "mock-farmer-4", fullName: "Phạm Quốc Dũng", phone: "0914 567 890", email: "dung.pq@nongdan.vn", organization: "HTX Sầu Riêng Cư M'gar", accountStatus: "APPROVED", role: "FARMER" },
    ],
    PROCESSING_FACILITY: [
        { id: "mock-fac-1", fullName: "Cơ sở Chế biến Trị An", phone: "0283 888 991", email: "trian@chebien.vn", organization: "Cơ sở Chế biến Trị An", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-fac-2", fullName: "Cơ sở Chế biến Minh Phát", phone: "0283 888 992", email: "minhphat@chebien.vn", organization: "Cơ sở Chế biến Minh Phát", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-fac-3", fullName: "Xưởng Chế Biến Sầu Riêng Đắk Lắk", phone: "0262 388 993", email: "daklak@chebien.vn", organization: "Xưởng Chế Biến Sầu Riêng Đắk Lắk", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-fac-4", fullName: "Nhà máy Nông sản Phong Điền", phone: "0292 388 994", email: "phongdien@chebien.vn", organization: "Nhà máy Nông sản Phong Điền", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
        { id: "mock-fac-5", fullName: "Cơ sở Chế biến & Cấp đông Tiền Giang", phone: "0273 388 995", email: "tiengiang@chebien.vn", organization: "Cơ sở Chế biến & Cấp đông Tiền Giang", accountStatus: "APPROVED", role: "PROCESSING_FACILITY" },
    ],
    COLLECTOR: [
        { id: "mock-coll-1", fullName: "Vựa Thu Mua Chín Sầu Riêng", phone: "0931 111 222", email: "chindurian@vuahang.vn", organization: "Vựa Thu Mua Chín Sầu Riêng", accountStatus: "APPROVED", role: "COLLECTOR" },
        { id: "mock-coll-2", fullName: "Vựa Nông Sản Tiền Giang", phone: "0932 222 333", email: "nongsan.tg@vuahang.vn", organization: "Vựa Nông Sản Tiền Giang", accountStatus: "APPROVED", role: "COLLECTOR" },
    ],
    STORE_OWNER: [
        { id: "mock-store-1", fullName: "Cửa Hàng Vật Tư Nông Nghiệp Xanh", phone: "0941 111 222", email: "vattuxanh@daily.vn", organization: "Cửa Hàng Vật Tư Nông Nghiệp Xanh", accountStatus: "APPROVED", role: "STORE_OWNER" },
        { id: "mock-store-2", fullName: "Đại Lý Phân Bón Thuốc BVTV Phát Đạt", phone: "0942 222 333", email: "phatdat@daily.vn", organization: "Đại Lý Phát Đạt", accountStatus: "APPROVED", role: "STORE_OWNER" },
    ],
    AREA_MANAGER: [
        { id: "mock-area-1", fullName: "Ban Quản Lý Vùng Trồng Krông Pắk", phone: "0951 111 222", email: "bql.krongpak@triviet.vn", organization: "UBND Huyện Krông Pắk & HTX", accountStatus: "APPROVED", role: "AREA_MANAGER" },
        { id: "mock-area-2", fullName: "Tổ Giám Sát Vùng Trồng Cai Lậy", phone: "0952 222 333", email: "giamsat.cailay@triviet.vn", organization: "Chi Cục Trồng Trọt & BVTV Tiền Giang", accountStatus: "APPROVED", role: "AREA_MANAGER" },
    ],
};

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

// Danh mục chuẩn hóa 17 Module phân quyền hệ thống theo cấu trúc chuẩn:
// - MODULE = "Quản lý + phạm vi nghiệp vụ"
// - FEATURE = tên đối tượng / chứng từ / quy trình cụ thể (KHÔNG thêm chữ "Quản lý")
// - ACTION = động từ ngắn ("Xem", "Tạo", "Chỉnh sửa", "Xóa", ...)
// - Module 2 tầng (isSingleEntity = true): không cần tạo cấp con thừa (Tài khoản, Tài liệu, Tin tức)
// - Module 3 tầng: có cấp Feature khi module có nhiều đối tượng
export const PERMISSION_MODULES: ModuleDef[] = [
    // 1. QUẢN LÝ TÀI KHOẢN (2 tầng: Module -> Action)
    {
        id: "ACCOUNT_MANAGEMENT",
        name: "QUẢN LÝ TÀI KHOẢN",
        title: "Tài khoản người dùng & phê duyệt",
        description: "Quản lý tài khoản toàn hệ thống, phê duyệt hồ sơ, khóa tài khoản và phân quyền vai trò",
        iconName: "Users",
        isSingleEntity: true,
        features: [
            {
                id: "user_account_direct",
                name: "Tài khoản người dùng",
                description: "Quản lý hồ sơ tài khoản, phê duyệt và gán vai trò người dùng",
                actions: {
                    view: { key: "USER_VIEW", label: "Xem", action: "view", description: "Xem danh sách và chi tiết tài khoản người dùng" },
                    create: { key: "USER_CREATE", label: "Tạo", action: "create", description: "Tạo mới tài khoản người dùng" },
                    edit: { key: "USER_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa thông tin tài khoản người dùng" },
                    delete: { key: "USER_DELETE", label: "Xóa", action: "delete", description: "Xóa tài khoản người dùng" },
                    approve: { key: "USER_APPROVE", label: "Phê duyệt", action: "approve", description: "Phê duyệt hồ sơ đăng ký tài khoản (bao gồm Nông dân)" },
                    reject: { key: "USER_REJECT", label: "Từ chối", action: "edit", description: "Từ chối phê duyệt hồ sơ người dùng" },
                    supplement: { key: "USER_REQUEST_SUPPLEMENT", label: "Yêu cầu bổ sung hồ sơ", action: "edit", description: "Yêu cầu người dùng bổ sung giấy tờ, hồ sơ" },
                    lock: { key: "USER_LOCK", label: "Khóa / Mở khóa", action: "edit", description: "Khóa tạm thời hoặc mở khóa tài khoản" },
                    assignRole: { key: "USER_ASSIGN_ROLE", label: "Gán vai trò", action: "edit", description: "Gán vai trò chức năng cho tài khoản" },
                    removeRole: { key: "USER_REMOVE_ROLE", label: "Gỡ vai trò", action: "edit", description: "Gỡ vai trò chức năng khỏi tài khoản" },
                }
            }
        ]
    },

    // 2. QUẢN LÝ NHẬT KÝ (3 tầng)
    {
        id: "JOURNAL_MANAGEMENT",
        name: "QUẢN LÝ NHẬT KÝ",
        title: "Nhật ký canh tác, thời tiết & sinh vật gây hại",
        description: "Quản lý các loại nhật ký phục vụ truy xuất nguồn gốc và tiêu chuẩn VietGAP / GACC",
        iconName: "BookOpen",
        isSingleEntity: false,
        features: [
            {
                id: "farming_journal",
                name: "Nhật ký canh tác",
                description: "Ghi chép các hoạt động bón phân, phun thuốc, tỉa cành, tưới nước và chăm sóc cây",
                actions: {
                    view: { key: "FARMING_LOG_VIEW", label: "Xem", action: "view", description: "Xem nhật ký canh tác" },
                    create: { key: "FARMING_LOG_CREATE", label: "Tạo", action: "create", description: "Ghi nhật ký canh tác mới" },
                    edit: { key: "FARMING_LOG_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa nhật ký canh tác" },
                    delete: { key: "FARMING_LOG_DELETE", label: "Xóa", action: "delete", description: "Xóa nhật ký canh tác" },
                }
            },
            {
                id: "weather_journal",
                name: "Nhật ký thời tiết",
                description: "Theo dõi nhiệt độ, độ ẩm, lượng mưa và các hiện tượng thời tiết tại vườn",
                actions: {
                    view: { key: "WEATHER_LOG_VIEW", label: "Xem", action: "view", description: "Xem nhật ký thời tiết" },
                    create: { key: "WEATHER_LOG_CREATE", label: "Tạo", action: "create", description: "Ghi nhận dữ liệu thời tiết" },
                    edit: { key: "WEATHER_LOG_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa dữ liệu thời tiết" },
                    delete: { key: "WEATHER_LOG_DELETE", label: "Xóa", action: "delete", description: "Xóa ghi chép thời tiết" },
                }
            },
            {
                id: "pest_journal",
                name: "Nhật ký sinh vật gây hại",
                description: "Ghi chép tình hình xuất hiện các loại sâu bệnh, nấm khuẩn và sinh vật gây hại",
                actions: {
                    view: { key: "PEST_LOG_VIEW", label: "Xem", action: "view", description: "Xem nhật ký sinh vật gây hại" },
                    create: { key: "PEST_LOG_CREATE", label: "Tạo", action: "create", description: "Ghi nhận sự xuất hiện của sinh vật gây hại" },
                    edit: { key: "PEST_LOG_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa ghi chép sinh vật gây hại" },
                    delete: { key: "PEST_LOG_DELETE", label: "Xóa", action: "delete", description: "Xóa ghi chép sinh vật gây hại" },
                }
            }
        ]
    },

    // 3. QUẢN LÝ CANH TÁC (3 tầng)
    {
        id: "CULTIVATION_MANAGEMENT",
        name: "QUẢN LÝ CANH TÁC",
        title: "Hồ sơ vườn, kế hoạch mùa vụ, theo dõi dịch hại & thống kê sản xuất",
        description: "Quản lý thông tin vườn sầu riêng, lập kế hoạch mùa vụ và thống kê chỉ số vật tư",
        iconName: "Sprout",
        isSingleEntity: false,
        features: [
            {
                id: "farm_profile",
                name: "Hồ sơ vườn",
                description: "Thông tin diện tích, số cây, giống trồng, tọa độ ranh giới thửa đất",
                actions: {
                    view: { key: "FARM_PROFILE_VIEW", label: "Xem", action: "view", description: "Xem hồ sơ vườn sầu riêng" },
                    create: { key: "FARM_PROFILE_CREATE", label: "Tạo", action: "create", description: "Đăng ký thêm vườn sầu riêng mới" },
                    edit: { key: "FARM_PROFILE_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật thông tin vườn trồng" },
                    delete: { key: "FARM_PROFILE_DELETE", label: "Xóa", action: "delete", description: "Xóa hồ sơ vườn" },
                }
            },
            {
                id: "farming_plan",
                name: "Kế hoạch canh tác",
                description: "Lập kế hoạch làm bông, nuôi trái, bón phân và dự kiến ngày thu hoạch",
                actions: {
                    view: { key: "FARMING_PLAN_VIEW", label: "Xem", action: "view", description: "Xem kế hoạch canh tác mùa vụ" },
                    create: { key: "FARMING_PLAN_CREATE", label: "Tạo", action: "create", description: "Tạo kế hoạch canh tác vụ mới" },
                    edit: { key: "FARMING_PLAN_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa kế hoạch mùa vụ" },
                    delete: { key: "FARMING_PLAN_DELETE", label: "Xóa", action: "delete", description: "Xóa kế hoạch canh tác" },
                }
            },
            {
                id: "pest_monitoring",
                name: "Theo dõi sinh vật gây hại",
                description: "Theo dõi mật độ dịch hại theo giai đoạn sinh trưởng và quản lý biện pháp xử lý",
                actions: {
                    view: { key: "PEST_MONITORING_VIEW", label: "Xem", action: "view", description: "Xem sổ theo dõi sinh vật gây hại" },
                    create: { key: "PEST_MONITORING_CREATE", label: "Tạo", action: "create", description: "Tạo đợt theo dõi dịch hại mới" },
                    edit: { key: "PEST_MONITORING_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa đợt theo dõi" },
                    delete: { key: "PEST_MONITORING_DELETE", label: "Xóa", action: "delete", description: "Xóa đợt theo dõi dịch hại" },
                    treatment: { key: "PEST_MONITORING_TREATMENT", label: "Cập nhật biện pháp xử lý", action: "edit", description: "Ghi nhận các biện pháp phòng trừ, xử lý sâu bệnh" },
                }
            },
            {
                id: "production_statistics",
                name: "Thống kê sản xuất",
                description: "Báo cáo tổng hợp lượng thuốc BVTV, phân bón, chi phí và doanh thu vườn",
                actions: {
                    pesticide: { key: "PRODUCTION_STATS_PESTICIDE", label: "Xem thuốc BVTV", action: "view", description: "Xem thống kê lượng thuốc bảo vệ thực vật đã dùng" },
                    fertilizer: { key: "PRODUCTION_STATS_FERTILIZER", label: "Xem phân bón", action: "view", description: "Xem thống kê lượng phân bón các loại đã sử dụng" },
                    expense: { key: "PRODUCTION_STATS_EXPENSE", label: "Xem chi phí", action: "view", description: "Xem thống kê chi phí đầu tư vườn theo mùa vụ" },
                    revenue: { key: "PRODUCTION_STATS_REVENUE", label: "Xem doanh thu", action: "view", description: "Xem thống kê doanh thu bán nông sản" },
                    profit: { key: "PRODUCTION_STATS_PROFIT", label: "Xem lợi nhuận", action: "view", description: "Xem thống kê tỷ suất lợi nhuận sau thu hoạch" },
                }
            }
        ]
    },

    // 4. QUẢN LÝ THU HOẠCH (3 tầng)
    {
        id: "HARVEST_MANAGEMENT",
        name: "QUẢN LÝ THU HOẠCH",
        title: "Phiếu thu hoạch & bàn giao tại vườn",
        description: "Quản lý đăng ký thu hoạch, sản lượng dự kiến và bàn giao sầu riêng cho thương lái/vựa",
        iconName: "Wheat",
        isSingleEntity: false,
        features: [
            {
                id: "harvest_request",
                name: "Phiếu thu hoạch",
                description: "Lập phiếu đăng ký sản lượng, loại sầu riêng và ngày thu hoạch dự kiến",
                actions: {
                    view: { key: "HARVEST_REQUEST_VIEW", label: "Xem", action: "view", description: "Xem danh sách và chi tiết phiếu thu hoạch" },
                    create: { key: "HARVEST_REQUEST_CREATE", label: "Tạo", action: "create", description: "Tạo phiếu thu hoạch mới" },
                    edit: { key: "HARVEST_REQUEST_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa thông tin phiếu thu hoạch" },
                    delete: { key: "HARVEST_REQUEST_DELETE", label: "Xóa", action: "delete", description: "Xóa phiếu thu hoạch" },
                    submit: { key: "HARVEST_REQUEST_SUBMIT", label: "Gửi phiếu", action: "deliver", description: "Gửi phiếu thu hoạch đến vựa hoặc cơ sở chế biến" },
                }
            },
            {
                id: "harvest_handover",
                name: "Bàn giao tại vườn",
                description: "Cân hàng, đối soát khối lượng và xác nhận bàn giao sầu riêng tại gốc",
                actions: {
                    view: { key: "HARVEST_HANDOVER_VIEW", label: "Xem", action: "view", description: "Xem biên bản bàn giao tại vườn" },
                    confirm: { key: "HARVEST_HANDOVER_CONFIRM", label: "Xác nhận bàn giao", action: "approve", description: "Ký xác nhận bàn giao khối lượng nông sản" },
                }
            }
        ]
    },

    // 5. QUẢN LÝ THU MUA & THU GOM (3 tầng - Dành cho Vựa)
    {
        id: "COLLECTOR_PROCUREMENT",
        name: "QUẢN LÝ THU MUA & THU GOM",
        title: "Thu mua sầu riêng & tạo lô gom hàng",
        description: "Tiếp nhận phiếu thu hoạch từ nông dân, tạo đơn thu mua và gom thành các lô hàng xuất bán",
        iconName: "Handshake",
        isSingleEntity: false,
        features: [
            {
                id: "collector_inbox",
                name: "Phiếu thu hoạch gửi đến",
                description: "Xử lý các đề xuất thu hoạch do các chủ vườn gửi trực tiếp đến vựa",
                actions: {
                    view: { key: "COLLECTOR_INBOX_VIEW", label: "Xem", action: "view", description: "Xem phiếu thu hoạch gửi đến vựa" },
                    accept: { key: "COLLECTOR_INBOX_ACCEPT", label: "Xác nhận tiếp nhận", action: "approve", description: "Chấp thuận thu mua phiếu thu hoạch" },
                    reject: { key: "COLLECTOR_INBOX_REJECT", label: "Từ chối tiếp nhận", action: "edit", description: "Từ chối nhận thu mua lô sầu riêng" },
                    receive: { key: "COLLECTOR_INBOX_RECEIVE", label: "Xác nhận nhận hàng", action: "deliver", description: "Xác nhận đã nhận hàng nông sản thực tế tại vựa" },
                }
            },
            {
                id: "purchase_order",
                name: "Đơn thu mua",
                description: "Lập hợp đồng và đơn đặt hàng thu mua sầu riêng tại các nhà vườn",
                actions: {
                    view: { key: "PURCHASE_ORDER_VIEW", label: "Xem", action: "view", description: "Xem danh sách đơn thu mua" },
                    create: { key: "PURCHASE_ORDER_CREATE", label: "Tạo", action: "create", description: "Tạo đơn thu mua mới" },
                    edit: { key: "PURCHASE_ORDER_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa đơn thu mua" },
                    delete: { key: "PURCHASE_ORDER_DELETE", label: "Xóa", action: "delete", description: "Hủy bỏ đơn thu mua" },
                }
            },
            {
                id: "collection_lot",
                name: "Lô thu gom",
                description: "Tổng hợp sản lượng từ nhiều phiếu thu hoạch thành lô hàng gom lớn",
                actions: {
                    view: { key: "COLLECTION_LOT_VIEW", label: "Xem", action: "view", description: "Xem danh sách lô thu gom" },
                    create: { key: "COLLECTION_LOT_CREATE", label: "Tạo", action: "create", description: "Tạo mã lô gom hàng mới" },
                    edit: { key: "COLLECTION_LOT_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật sản lượng lô gom" },
                    delete: { key: "COLLECTION_LOT_DELETE", label: "Xóa", action: "delete", description: "Xóa lô gom hàng" },
                    complete: { key: "COLLECTION_LOT_COMPLETE", label: "Hoàn tất", action: "approve", description: "Đóng lô gom sẵn sàng xuất kho hoặc giao cơ sở chế biến" },
                }
            }
        ]
    },

    // 6. QUẢN LÝ TIẾP NHẬN & PHÂN LOẠI (3 tầng - Dành cho cơ sở chế biến)
    {
        id: "PROCESSING_INTAKE",
        name: "QUẢN LÝ TIẾP NHẬN & PHÂN LOẠI",
        title: "Tiếp nhận nguyên liệu, kiểm tra QC & phân loại quả",
        description: "Quy trình nhận sầu riêng quả từ vườn/vựa, kiểm tra chất lượng và phân loại cấp đông / ăn tươi",
        iconName: "Boxes",
        isSingleEntity: false,
        features: [
            {
                id: "intake_harvest",
                name: "Phiếu thu hoạch gửi đến",
                description: "Tiếp nhận và phản hồi các phiếu thu hoạch trực tiếp từ các vườn liên kết",
                actions: {
                    view: { key: "INTAKE_HARVEST_VIEW", label: "Xem", action: "view", description: "Xem phiếu thu hoạch gửi về nhà máy" },
                    accept: { key: "INTAKE_HARVEST_ACCEPT", label: "Xác nhận tiếp nhận", action: "approve", description: "Đồng ý tiếp nhận chuyến hàng sầu riêng" },
                    reject: { key: "INTAKE_HARVEST_REJECT", label: "Từ chối tiếp nhận", action: "edit", description: "Từ chối tiếp nhận lô hàng" },
                }
            },
            {
                id: "goods_receipt",
                name: "Nhận hàng",
                description: "Biên bản giao nhận nguyên liệu thực tế tại cổng nhà máy, cân xe và lập phiếu nhận",
                actions: {
                    view: { key: "GOODS_RECEIPT_VIEW", label: "Xem", action: "view", description: "Xem danh sách phiếu nhận hàng" },
                    confirm: { key: "GOODS_RECEIPT_CONFIRM", label: "Xác nhận nhận hàng", action: "deliver", description: "Xác nhận khối lượng thực nhận vào khu tập kết" },
                }
            },
            {
                id: "material_classify",
                name: "Phân loại nguyên liệu",
                description: "Phân loại sầu riêng thành các nhóm: xuất khẩu quả tươi, bóc múi cấp đông, chế biến sâu",
                actions: {
                    view: { key: "RAW_MATERIAL_CLASSIFY_VIEW", label: "Xem", action: "view", description: "Xem kết quả phân loại sầu riêng nguyên liệu" },
                    execute: { key: "RAW_MATERIAL_CLASSIFY_EXEC", label: "Thực hiện phân loại", action: "create", description: "Thực hiện chấm điểm và phân loại lô sầu riêng" },
                    edit: { key: "RAW_MATERIAL_CLASSIFY_EDIT", label: "Chỉnh sửa kết quả", action: "edit", description: "Chỉnh sửa tỷ lệ phân loại múi quả" },
                }
            },
            {
                id: "qc_inspection",
                name: "Kiểm tra chất lượng",
                description: "Kiểm nghiệm dư lượng thuốc BVTV, độ brix, độ chín và cảm quan sầu riêng",
                actions: {
                    view: { key: "QC_INSPECTION_VIEW", label: "Xem", action: "view", description: "Xem kết quả kiểm định QC" },
                    create: { key: "QC_INSPECTION_CREATE", label: "Ghi nhận kết quả", action: "create", description: "Lập phiếu kiểm tra chất lượng nguyên liệu" },
                    edit: { key: "QC_INSPECTION_EDIT", label: "Chỉnh sửa kết quả", action: "edit", description: "Chỉnh sửa số liệu kiểm định chất lượng" },
                    confirm: { key: "QC_INSPECTION_CONFIRM", label: "Xác nhận kết quả", action: "approve", description: "Duyệt thông qua tiêu chuẩn QC để đưa vào chế biến" },
                }
            }
        ]
    },

    // 7. QUẢN LÝ CHẾ BIẾN & ĐÓNG GÓI (3 tầng)
    {
        id: "PROCESSING_PACKAGING",
        name: "QUẢN LÝ CHẾ BIẾN & ĐÓNG GÓI",
        title: "Bóc múi, cấp đông IQF, mẻ chế biến & lô thành phẩm",
        description: "Giám sát quy trình bóc tách múi sầu riêng, cấp đông IQF và đóng thùng thành phẩm",
        iconName: "Factory",
        isSingleEntity: false,
        features: [
            {
                id: "processing_batch",
                name: "Lô chế biến",
                description: "Quản lý mẻ chế biến bóc tách múi, khử trùng, đưa vào buồng cấp đông IQF",
                actions: {
                    view: { key: "PROCESSING_BATCH_VIEW", label: "Xem", action: "view", description: "Xem danh sách và tiến độ các lô chế biến" },
                    create: { key: "PROCESSING_BATCH_CREATE", label: "Tạo", action: "create", description: "Tạo lệnh bắt đầu lô chế biến mới" },
                    edit: { key: "PROCESSING_BATCH_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật công đoạn, nhiệt độ cấp đông và tỷ lệ hao hụt" },
                    delete: { key: "PROCESSING_BATCH_DELETE", label: "Xóa", action: "delete", description: "Hủy lô chế biến" },
                    complete: { key: "PROCESSING_BATCH_COMPLETE", label: "Hoàn tất chế biến", action: "approve", description: "Nghiệm thu hoàn tất quy trình chế biến cấp đông" },
                }
            },
            {
                id: "finished_lot",
                name: "Lô thành phẩm",
                description: "Quản lý đóng gói hút chân không, đóng thùng carton và nhập kho bảo quản",
                actions: {
                    view: { key: "FINISHED_LOT_VIEW", label: "Xem", action: "view", description: "Xem danh sách lô sầu riêng thành phẩm" },
                    create: { key: "FINISHED_LOT_CREATE", label: "Tạo", action: "create", description: "Tạo mã lô hàng thành phẩm mới" },
                    edit: { key: "FINISHED_LOT_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật thông tin quy cách đóng gói và hạn dùng" },
                    delete: { key: "FINISHED_LOT_DELETE", label: "Xóa", action: "delete", description: "Xóa lô thành phẩm" },
                    complete: { key: "FINISHED_LOT_COMPLETE", label: "Hoàn tất đóng gói", action: "approve", description: "Xác nhận hoàn tất đóng gói sẵn sàng phân phối" },
                }
            }
        ]
    },

    // 8. QUẢN LÝ XUẤT HÀNG (3 tầng)
    {
        id: "DISPATCH_MANAGEMENT",
        name: "QUẢN LÝ XUẤT HÀNG",
        title: "Lô xuất hàng, điều phối vận tải & phiếu xuất bán",
        description: "Quản lý vận đơn cont lạnh, điều phối phương tiện vận chuyển và lập phiếu xuất bán",
        iconName: "Truck",
        isSingleEntity: false,
        features: [
            {
                id: "shipment",
                name: "Lô xuất hàng",
                description: "Lập lệnh vận chuyển cont lạnh, kiểm tra niêm phong kẹp chì và xuất bến",
                actions: {
                    view: { key: "SHIPMENT_VIEW", label: "Xem", action: "view", description: "Xem danh sách các chuyến xe xuất hàng" },
                    create: { key: "SHIPMENT_CREATE", label: "Tạo", action: "create", description: "Tạo lệnh xuất hàng / vận đơn mới" },
                    edit: { key: "SHIPMENT_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật biển số xe, cont lạnh và tài xế" },
                    delete: { key: "SHIPMENT_DELETE", label: "Xóa", action: "delete", description: "Hủy lệnh xuất hàng" },
                    confirm: { key: "SHIPMENT_CONFIRM", label: "Xác nhận xuất hàng", action: "approve", description: "Xác nhận xe rời kho bảo quản / bến xuất" },
                    exportDoc: { key: "SHIPMENT_EXPORT_DOC", label: "Xuất hồ sơ", action: "export", description: "In hồ sơ kiểm dịch thực vật và vận đơn đường dài" },
                }
            },
            {
                id: "commercial_dispatch",
                name: "Phiếu xuất bán",
                description: "Lập phiếu xuất bán thành phẩm cho các đại lý, siêu thị hoặc đối tác xuất khẩu",
                actions: {
                    view: { key: "COMMERCIAL_DISPATCH_VIEW", label: "Xem", action: "view", description: "Xem danh sách phiếu xuất bán thương mại" },
                    create: { key: "COMMERCIAL_DISPATCH_CREATE", label: "Tạo", action: "create", description: "Tạo phiếu xuất bán nội địa / xuất khẩu" },
                    edit: { key: "COMMERCIAL_DISPATCH_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa giá bán, khối lượng và chiết khấu" },
                    delete: { key: "COMMERCIAL_DISPATCH_DELETE", label: "Xóa", action: "delete", description: "Hủy phiếu xuất bán" },
                    print: { key: "COMMERCIAL_DISPATCH_PRINT", label: "In phiếu", action: "export", description: "In hóa đơn và phiếu xuất kho giao hàng" },
                }
            }
        ]
    },

    // 9. QUẢN LÝ TRUY XUẤT NGUỒN GỐC (3 tầng)
    {
        id: "TRACEABILITY_MANAGEMENT",
        name: "QUẢN LÝ TRUY XUẤT NGUỒN GỐC",
        title: "Mã QR truy xuất, chuỗi liên kết & kết nối China Port",
        description: "Phát hành mã QR truy xuất nguồn gốc, xem dòng chảy dữ liệu chuỗi và đồng bộ hải quan",
        iconName: "QrCode",
        isSingleEntity: false,
        features: [
            {
                id: "qr_trace",
                name: "QR truy xuất",
                description: "Tạo mã QR cho thùng/quả sầu riêng, thiết lập trang công khai truy xuất nguồn gốc",
                actions: {
                    view: { key: "QR_TRACE_VIEW", label: "Xem", action: "view", description: "Xem danh sách mã QR truy xuất đã phát hành" },
                    preview: { key: "QR_TRACE_PREVIEW", label: "Xem trước", action: "view", description: "Xem trước giao diện người tiêu dùng quét mã QR" },
                    issue: { key: "QR_TRACE_ISSUE", label: "Phát hành", action: "approve", description: "Kích hoạt và chính thức phát hành dải mã QR" },
                    print: { key: "QR_TRACE_PRINT", label: "Tải xuống / In", action: "export", description: "Tải tem nhãn QR dạng PDF / PNG để dán lên bao bì" },
                }
            },
            {
                id: "trace_chain",
                name: "Thông tin truy xuất",
                description: "Xem toàn bộ chuỗi mắt xích từ nông hộ -> vựa -> nhà máy -> kiểm định QC -> xuất khẩu",
                actions: {
                    view: { key: "TRACE_CHAIN_VIEW", label: "Xem chuỗi truy xuất", action: "view", description: "Xem nhật ký dòng chảy liên kết của từng lô hàng" },
                }
            },
            {
                id: "china_port",
                name: "China Port",
                description: "Tra cứu danh mục mã số vùng trồng, mã đóng gói đã đăng ký với Hải quan Trung Quốc (GACC)",
                actions: {
                    search: { key: "CHINA_PORT_SEARCH", label: "Tra cứu", action: "view", description: "Tra cứu trạng thái cấp phép trên cổng thông tin GACC" },
                    sync: { key: "CHINA_PORT_SYNC", label: "Đồng bộ", action: "create", description: "Đồng bộ dữ liệu mã vùng trồng và cơ sở đóng gói" },
                    export: { key: "CHINA_PORT_EXPORT", label: "Xuất kết quả", action: "export", description: "Xuất báo cáo đối soát danh sách cơ sở đủ điều kiện" },
                }
            }
        ]
    },

    // 10. QUẢN LÝ KHO (3 tầng)
    {
        id: "INVENTORY_MANAGEMENT",
        name: "QUẢN LÝ KHO",
        title: "Nhập kho, xuất kho & điều chuyển kho",
        description: "Quản lý tồn kho nguyên liệu, vật tư và thành phẩm tại các kho bảo quản lạnh",
        iconName: "Package",
        isSingleEntity: false,
        features: [
            {
                id: "warehouse_import",
                name: "Nhập kho",
                description: "Tạo và kiểm soát phiếu nhập kho nguyên liệu, bao bì và thành phẩm",
                actions: {
                    view: { key: "WAREHOUSE_IMPORT_VIEW", label: "Xem", action: "view", description: "Xem danh sách phiếu nhập kho" },
                    create: { key: "WAREHOUSE_IMPORT_CREATE", label: "Tạo", action: "create", description: "Lập phiếu nhập kho mới" },
                    edit: { key: "WAREHOUSE_IMPORT_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa số lượng và vị trí kệ kho" },
                    confirm: { key: "WAREHOUSE_IMPORT_CONFIRM", label: "Xác nhận", action: "approve", description: "Ký duyệt xác nhận nhập kho thực tế" },
                    print: { key: "WAREHOUSE_IMPORT_PRINT", label: "In phiếu", action: "export", description: "In phiếu nhập kho (PN)" },
                }
            },
            {
                id: "warehouse_export",
                name: "Xuất kho",
                description: "Tạo và kiểm soát phiếu xuất kho bán hàng, xuất gia công và xuất hủy",
                actions: {
                    view: { key: "WAREHOUSE_EXPORT_VIEW", label: "Xem", action: "view", description: "Xem danh sách phiếu xuất kho" },
                    create: { key: "WAREHOUSE_EXPORT_CREATE", label: "Tạo", action: "create", description: "Lập phiếu xuất kho mới" },
                    edit: { key: "WAREHOUSE_EXPORT_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa số lượng xuất kho" },
                    confirm: { key: "WAREHOUSE_EXPORT_CONFIRM", label: "Xác nhận", action: "approve", description: "Ký duyệt lệnh xuất kho thực tế" },
                    print: { key: "WAREHOUSE_EXPORT_PRINT", label: "In phiếu", action: "export", description: "In phiếu xuất kho (PX)" },
                }
            },
            {
                id: "warehouse_transfer",
                name: "Chuyển kho",
                description: "Điều chuyển nguyên liệu, thành phẩm giữa kho lạnh sơ chế và kho phân phối",
                actions: {
                    view: { key: "WAREHOUSE_TRANSFER_VIEW", label: "Xem", action: "view", description: "Xem danh sách phiếu điều chuyển kho" },
                    create: { key: "WAREHOUSE_TRANSFER_CREATE", label: "Tạo", action: "create", description: "Lập lệnh điều chuyển nội bộ giữa các kho" },
                    confirm: { key: "WAREHOUSE_TRANSFER_CONFIRM", label: "Xác nhận", action: "approve", description: "Xác nhận hoàn tất quá trình nhận hàng tại kho đích" },
                    print: { key: "WAREHOUSE_TRANSFER_PRINT", label: "In phiếu", action: "export", description: "In phiếu chuyển kho nội bộ" },
                }
            }
        ]
    },

    // 11. QUẢN LÝ VẬT TƯ & GIAO DỊCH (3 tầng)
    {
        id: "SUPPLIES_TRADE_MANAGEMENT",
        name: "QUẢN LÝ VẬT TƯ & GIAO DỊCH",
        title: "Sản phẩm vật tư, đơn hàng, giỏ hàng & cửa hàng",
        description: "Sàn thương mại vật tư nông nghiệp, phân bón, thuốc BVTV và xử lý đơn hàng nông dân",
        iconName: "Store",
        isSingleEntity: false,
        features: [
            {
                id: "store_product",
                name: "Sản phẩm vật tư",
                description: "Đăng tải danh mục phân bón, thuốc bảo vệ thực vật, hạt giống và dụng cụ làm vườn",
                actions: {
                    view: { key: "STORE_PRODUCT_VIEW", label: "Xem", action: "view", description: "Xem danh sách sản phẩm vật tư nông nghiệp" },
                    create: { key: "STORE_PRODUCT_CREATE", label: "Tạo", action: "create", description: "Đăng sản phẩm vật tư mới lên cửa hàng" },
                    edit: { key: "STORE_PRODUCT_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật giá bán, hình ảnh và tồn kho" },
                    delete: { key: "STORE_PRODUCT_DELETE", label: "Xóa", action: "delete", description: "Gỡ bỏ hoặc ẩn sản phẩm khỏi sàn" },
                }
            },
            {
                id: "store_order",
                name: "Đơn hàng",
                description: "Tiếp nhận đơn mua phân bón, thuốc trừ sâu của bà con nông dân và xử lý giao nhận",
                actions: {
                    view: { key: "STORE_ORDER_VIEW", label: "Xem", action: "view", description: "Xem danh sách đơn đặt hàng vật tư" },
                    create: { key: "STORE_ORDER_CREATE", label: "Tạo", action: "create", description: "Tạo đơn hàng đặt mua vật tư" },
                    confirm: { key: "STORE_ORDER_CONFIRM", label: "Xác nhận", action: "approve", description: "Xác nhận đơn hàng và chuẩn bị xuất kho" },
                    cancel: { key: "STORE_ORDER_CANCEL", label: "Hủy", action: "edit", description: "Hủy đơn hàng theo yêu cầu người mua / cửa hàng" },
                    statusUpdate: { key: "STORE_ORDER_STATUS_UPDATE", label: "Cập nhật trạng thái", action: "edit", description: "Cập nhật tiến trình: đang giao, đã giao, hoàn tất" },
                }
            },
            {
                id: "cart",
                name: "Giỏ hàng",
                description: "Quản lý giỏ hàng của tài khoản nông dân khi mua sắm vật tư trên nền tảng",
                actions: {
                    view: { key: "CART_VIEW", label: "Xem", action: "view", description: "Xem giỏ hàng cá nhân" },
                    addItem: { key: "CART_ADD_ITEM", label: "Thêm sản phẩm", action: "create", description: "Thêm sản phẩm phân bón/thuốc BVTV vào giỏ" },
                    updateQty: { key: "CART_UPDATE_QTY", label: "Cập nhật số lượng", action: "edit", description: "Tăng giảm số lượng sản phẩm trong giỏ" },
                    removeItem: { key: "CART_REMOVE_ITEM", label: "Xóa sản phẩm", action: "delete", description: "Xóa sản phẩm khỏi giỏ hàng" },
                }
            },
            {
                id: "store_profile",
                name: "Hồ sơ cửa hàng",
                description: "Quản lý hồ sơ pháp lý, giấy phép kinh doanh thuốc BVTV và thông tin đại lý",
                actions: {
                    view: { key: "STORE_PROFILE_VIEW", label: "Xem", action: "view", description: "Xem thông tin hồ sơ đại lý vật tư" },
                    edit: { key: "STORE_PROFILE_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật thông tin liên hệ, địa chỉ và giấy phép" },
                }
            }
        ]
    },

    // 12. QUẢN LÝ TÀI CHÍNH (3 tầng)
    {
        id: "FINANCE_MANAGEMENT",
        name: "QUẢN LÝ TÀI CHÍNH",
        title: "Thu chi, thanh toán công nợ & báo cáo tài chính",
        description: "Quản lý dòng tiền mua bán nông sản, chi phí vận hành xưởng, công nợ nông dân và đại lý",
        iconName: "CircleDollarSign",
        isSingleEntity: false,
        features: [
            {
                id: "finance_income",
                name: "Thu",
                description: "Ghi nhận nguồn thu từ bán sầu riêng xuất khẩu, bán sỉ thành phẩm và bán vật tư",
                actions: {
                    view: { key: "FINANCE_INCOME_VIEW", label: "Xem", action: "view", description: "Xem sổ quỹ các khoản thu" },
                    create: { key: "FINANCE_INCOME_CREATE", label: "Tạo", action: "create", description: "Lập phiếu thu tiền" },
                    edit: { key: "FINANCE_INCOME_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa chứng từ thu tiền" },
                    delete: { key: "FINANCE_INCOME_DELETE", label: "Xóa", action: "delete", description: "Hủy phiếu thu" },
                }
            },
            {
                id: "finance_expense",
                name: "Chi",
                description: "Chi phí nhân công hái, bóc múi, điện kho lạnh, cước cont và chi phí mua nguyên liệu",
                actions: {
                    view: { key: "FINANCE_EXPENSE_VIEW", label: "Xem", action: "view", description: "Xem sổ theo dõi các khoản chi" },
                    create: { key: "FINANCE_EXPENSE_CREATE", label: "Tạo", action: "create", description: "Lập phiếu chi tiền" },
                    edit: { key: "FINANCE_EXPENSE_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa chứng từ chi phí" },
                    delete: { key: "FINANCE_EXPENSE_DELETE", label: "Xóa", action: "delete", description: "Hủy phiếu chi" },
                }
            },
            {
                id: "finance_debt",
                name: "Công nợ",
                description: "Theo dõi số dư công nợ phải thu từ khách hàng và công nợ phải trả tiền sầu riêng cho nông dân",
                actions: {
                    view: { key: "FINANCE_DEBT_VIEW", label: "Xem", action: "view", description: "Xem sổ theo dõi công nợ chi tiết" },
                    recordPayment: { key: "FINANCE_DEBT_RECORD_PAYMENT", label: "Ghi nhận thanh toán", action: "create", description: "Lập phiếu thu/trả nợ theo từng đợt" },
                    edit: { key: "FINANCE_DEBT_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa số tiền hoặc hạn mức công nợ" },
                    confirmPayment: { key: "FINANCE_DEBT_CONFIRM_PAYMENT", label: "Xác nhận thanh toán", action: "approve", description: "Ký duyệt xác nhận đã quyết toán dứt điểm công nợ" },
                }
            },
            {
                id: "finance_report",
                name: "Báo cáo tài chính",
                description: "Tổng hợp dòng tiền, báo cáo doanh thu, chi phí, lợi nhuận ròng theo mùa vụ",
                actions: {
                    view: { key: "FINANCE_REPORT_VIEW", label: "Xem", action: "view", description: "Xem các biểu đồ và báo cáo tài chính" },
                    export: { key: "FINANCE_REPORT_EXPORT", label: "Xuất báo cáo", action: "export", description: "Xuất dữ liệu tài chính ra file Excel / PDF" },
                }
            }
        ]
    },

    // 13. QUẢN LÝ VÙNG TRỒNG (3 tầng)
    {
        id: "GROWING_REGION_MANAGEMENT",
        name: "QUẢN LÝ VÙNG TRỒNG",
        title: "Mã số vùng trồng (MSVT), ban quản lý & nông hộ liên kết",
        description: "Quản trị cơ sở dữ liệu mã vùng trồng được cấp phép, phân công trưởng ban và duyệt hộ liên kết",
        iconName: "MapPin",
        isSingleEntity: false,
        features: [
            {
                id: "growing_region",
                name: "Vùng trồng",
                description: "Hồ sơ mã số vùng trồng được Cục Trồng trọt và Tổng cục Hải quan Trung Quốc (GACC) phê duyệt",
                actions: {
                    view: { key: "GROWING_REGION_VIEW", label: "Xem", action: "view", description: "Xem danh sách mã số vùng trồng" },
                    create: { key: "GROWING_REGION_CREATE", label: "Tạo", action: "create", description: "Tạo hồ sơ mã số vùng trồng mới" },
                    edit: { key: "GROWING_REGION_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật tọa độ, diện tích và giống đăng ký" },
                    delete: { key: "GROWING_REGION_DELETE", label: "Xóa", action: "delete", description: "Xóa hồ sơ mã vùng trồng" },
                    toggle: { key: "GROWING_REGION_TOGGLE", label: "Kích hoạt / Tạm dừng", action: "approve", description: "Kích hoạt hoặc tạm đình chỉ hoạt động của mã vùng trồng" },
                }
            },
            {
                id: "area_manager",
                name: "Trưởng ban quản lý",
                description: "Phân công cán bộ phụ trách giám sát tiêu chuẩn kỹ thuật cho từng địa bàn vùng trồng",
                actions: {
                    view: { key: "AREA_MANAGER_VIEW", label: "Xem", action: "view", description: "Xem danh sách trưởng ban quản lý phụ trách" },
                    assign: { key: "AREA_MANAGER_ASSIGN", label: "Phân công", action: "create", description: "Phân công trưởng ban phụ trách mã vùng trồng" },
                    reassign: { key: "AREA_MANAGER_REASSIGN", label: "Thay đổi phân công", action: "edit", description: "Điều chuyển hoặc thay đổi cán bộ quản lý vùng" },
                }
            },
            {
                id: "region_farm",
                name: "Vườn thuộc vùng",
                description: "Xét duyệt và giám sát các thửa vườn của nông dân nằm trong phạm vi mã số vùng trồng",
                actions: {
                    view: { key: "REGION_FARM_VIEW", label: "Xem", action: "view", description: "Xem danh sách vườn trực thuộc mã vùng trồng" },
                    approve: { key: "REGION_FARM_APPROVE", label: "Duyệt", action: "approve", description: "Duyệt đơn gia nhập mã vùng trồng của nhà vườn" },
                    reject: { key: "REGION_FARM_REJECT", label: "Từ chối", action: "edit", description: "Từ chối tiếp nhận vườn vào mã vùng" },
                    toggle: { key: "REGION_FARM_TOGGLE", label: "Kích hoạt / Tạm dừng", action: "approve", description: "Tạm dừng quyền khai thác mã vùng đối với vườn vi phạm" },
                }
            },
            {
                id: "region_farmer",
                name: "Nông hộ thuộc vùng",
                description: "Danh bạ chủ hộ, diện tích canh tác và số lượng cây đăng ký theo hợp đồng liên kết",
                actions: {
                    view: { key: "REGION_FARMER_VIEW", label: "Xem", action: "view", description: "Xem danh sách nông hộ thành viên trong vùng trồng" },
                }
            }
        ]
    },

    // 14. QUẢN LÝ VAI TRÒ & PHÂN QUYỀN (3 tầng)
    {
        id: "ROLE_PERMISSION_MANAGEMENT",
        name: "QUẢN LÝ VAI TRÒ & PHÂN QUYỀN",
        title: "Vai trò người dùng & ma trận phân quyền hệ thống",
        description: "Thiết lập quyền truy cập cho từng vai trò và tạo các vai trò nghiệp vụ tùy chỉnh",
        iconName: "ShieldCheck",
        isSingleEntity: false,
        features: [
            {
                id: "role_def",
                name: "Vai trò",
                description: "Quản trị danh sách các vai trò mặc định của hệ thống và các vai trò tùy chỉnh",
                actions: {
                    view: { key: "ROLE_VIEW", label: "Xem", action: "view", description: "Xem danh sách vai trò người dùng" },
                    create: { key: "ROLE_CREATE", label: "Tạo", action: "create", description: "Tạo vai trò tùy chỉnh mới" },
                    edit: { key: "ROLE_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa thông tin tên, mô tả vai trò" },
                    delete: { key: "ROLE_DELETE", label: "Xóa", action: "delete", description: "Xóa vai trò tùy chỉnh" },
                }
            },
            {
                id: "role_permissions",
                name: "Quyền của vai trò",
                description: "Cấp phát và điều chỉnh ma trận các quyền thao tác cho từng vai trò",
                actions: {
                    view: { key: "ROLE_PERMISSION_VIEW", label: "Xem", action: "view", description: "Xem ma trận phân quyền của vai trò" },
                    update: { key: "ROLE_PERMISSION_UPDATE", label: "Cập nhật", action: "edit", description: "Lưu thay đổi ma trận phân quyền" },
                    reset: { key: "ROLE_PERMISSION_RESET", label: "Khôi phục mặc định", action: "approve", description: "Khôi phục quyền vai trò về trạng thái mặc định của hệ thống" },
                }
            }
        ]
    },

    // 15. QUẢN LÝ DANH MỤC (3 tầng)
    {
        id: "MASTER_CATALOG_MANAGEMENT",
        name: "QUẢN LÝ DANH MỤC",
        title: "Giống sầu riêng, thuốc BVTV, phân bón & danh mục chất cấm",
        description: "Dữ liệu danh mục chuẩn dùng chung trên toàn hệ thống và đối chiếu tiêu chuẩn kiểm dịch GACC",
        iconName: "Layers",
        isSingleEntity: false,
        features: [
            {
                id: "catalog_variety",
                name: "Giống cây trồng",
                description: "Danh mục giống sầu riêng (Ri6, Monthong / Dona, Musang King, Black Thorn, ...)",
                actions: {
                    view: { key: "CATALOG_VARIETY_VIEW", label: "Xem", action: "view", description: "Xem danh mục giống sầu riêng" },
                    create: { key: "CATALOG_VARIETY_CREATE", label: "Tạo", action: "create", description: "Thêm giống sầu riêng mới vào danh mục" },
                    edit: { key: "CATALOG_VARIETY_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa thông tin đặc tính giống" },
                    delete: { key: "CATALOG_VARIETY_DELETE", label: "Xóa", action: "delete", description: "Xóa giống sầu riêng khỏi danh mục" },
                }
            },
            {
                id: "catalog_pesticide",
                name: "Thuốc BVTV",
                description: "Danh mục thuốc bảo vệ thực vật hợp quy, hoạt chất và thời gian cách ly (PHI)",
                actions: {
                    view: { key: "CATALOG_PESTICIDE_VIEW", label: "Xem", action: "view", description: "Xem danh mục thuốc bảo vệ thực vật" },
                    create: { key: "CATALOG_PESTICIDE_CREATE", label: "Tạo", action: "create", description: "Thêm loại thuốc BVTV mới" },
                    edit: { key: "CATALOG_PESTICIDE_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật hoạt chất, liều lượng khuyến cáo và thời gian PHI" },
                    delete: { key: "CATALOG_PESTICIDE_DELETE", label: "Xóa", action: "delete", description: "Xóa thuốc BVTV khỏi danh mục" },
                }
            },
            {
                id: "catalog_fertilizer",
                name: "Phân bón",
                description: "Danh mục phân bón hữu cơ, vô cơ, NPK, phân vi lượng dùng trong canh tác sầu riêng",
                actions: {
                    view: { key: "CATALOG_FERTILIZER_VIEW", label: "Xem", action: "view", description: "Xem danh mục phân bón" },
                    create: { key: "CATALOG_FERTILIZER_CREATE", label: "Tạo", action: "create", description: "Thêm loại phân bón mới" },
                    edit: { key: "CATALOG_FERTILIZER_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật thành phần dinh dưỡng và hướng dẫn bón" },
                    delete: { key: "CATALOG_FERTILIZER_DELETE", label: "Xóa", action: "delete", description: "Xóa phân bón khỏi danh mục" },
                }
            },
            {
                id: "catalog_prohibited",
                name: "Chất cấm",
                description: "Danh sách hoạt chất BVTV bị cấm sử dụng theo quy định của Bộ NN&PTNT và Hải quan Trung Quốc",
                actions: {
                    view: { key: "CATALOG_PROHIBITED_VIEW", label: "Xem", action: "view", description: "Xem danh sách hoạt chất cấm" },
                    create: { key: "CATALOG_PROHIBITED_CREATE", label: "Tạo", action: "create", description: "Thêm hoạt chất vào danh sách cấm" },
                    edit: { key: "CATALOG_PROHIBITED_EDIT", label: "Chỉnh sửa", action: "edit", description: "Cập nhật ngưỡng phát hiện và căn cứ pháp lý" },
                    delete: { key: "CATALOG_PROHIBITED_DELETE", label: "Xóa", action: "delete", description: "Xóa hoạt chất khỏi danh sách cấm" },
                }
            }
        ]
    },

    // 16. QUẢN LÝ TÀI LIỆU (2 tầng: Module -> Action)
    {
        id: "DOCUMENT_MANAGEMENT",
        name: "QUẢN LÝ TÀI LIỆU",
        title: "Thư viện tài liệu kỹ thuật & pháp lý",
        description: "Quản lý tài liệu hướng dẫn kỹ thuật canh tác, quy định kiểm dịch và tiêu chuẩn xuất khẩu",
        iconName: "BookOpen",
        isSingleEntity: true,
        features: [
            {
                id: "document_direct",
                name: "Tài liệu",
                description: "Quản lý và chia sẻ tài liệu quy trình",
                actions: {
                    view: { key: "DOC_VIEW", label: "Xem", action: "view", description: "Xem và đọc tài liệu trực tuyến" },
                    upload: { key: "DOC_UPLOAD", label: "Tải lên", action: "create", description: "Tải lên tài liệu kỹ thuật mới (PDF / Word / Excel)" },
                    edit: { key: "DOC_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa tiêu đề, mô tả và phân loại tài liệu" },
                    delete: { key: "DOC_DELETE", label: "Xóa", action: "delete", description: "Xóa tài liệu khỏi thư viện" },
                    download: { key: "DOC_DOWNLOAD", label: "Tải xuống", action: "export", description: "Tải tài liệu về thiết bị cá nhân" },
                }
            }
        ]
    },

    // 17. QUẢN LÝ TIN TỨC (2 tầng: Module -> Action)
    {
        id: "NEWS_MANAGEMENT",
        name: "QUẢN LÝ TIN TỨC",
        title: "Bản tin thị trường sầu riêng & kỹ thuật nông nghiệp",
        description: "Quản lý và xuất bản các bài viết về giá cả thị trường, thời tiết mùa vụ và cảnh báo sâu bệnh",
        iconName: "Bell",
        isSingleEntity: true,
        features: [
            {
                id: "news_direct",
                name: "Tin tức",
                description: "Xuất bản bài viết tin tức và cảnh báo thị trường",
                actions: {
                    view: { key: "NEWS_VIEW", label: "Xem", action: "view", description: "Xem danh sách bài viết tin tức" },
                    create: { key: "NEWS_CREATE", label: "Tạo", action: "create", description: "Viết bài tin tức mới" },
                    edit: { key: "NEWS_EDIT", label: "Chỉnh sửa", action: "edit", description: "Chỉnh sửa nội dung và hình ảnh bài viết" },
                    delete: { key: "NEWS_DELETE", label: "Xóa", action: "delete", description: "Xóa bài viết tin tức" },
                    publish: { key: "NEWS_PUBLISH", label: "Đăng / Gỡ đăng", action: "approve", description: "Xuất bản bài viết lên trang chủ hoặc gỡ bỏ tin đã đăng" },
                }
            }
        ]
    }
];

// Trả về danh sách tất cả các permission keys trong hệ thống
export function getAllSystemPermissionKeys(): string[] {
    const keySet = new Set<string>();

    for (const mod of PERMISSION_MODULES) {
        for (const feat of mod.features) {
            for (const act of Object.values(feat.actions)) {
                if (act?.key) keySet.add(act.key);
            }
        }
    }

    return Array.from(keySet);
}

/** Lọc bỏ các mã quyền không có trong danh mục chuẩn */
export function normalizeCatalogPermissions(permissions: string[]): string[] {
    const valid = new Set(getAllSystemPermissionKeys());
    return [...new Set(permissions)].filter((key) => valid.has(key));
}

// Quyền mặc định chuẩn hóa cho từng vai trò người dùng trong hệ thống TriViet
export const DEFAULT_ROLE_PERMISSIONS: Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[] }> = {
    ADMIN: {
        moduleEnabled: {
            ACCOUNT_MANAGEMENT: true,
            JOURNAL_MANAGEMENT: true,
            CULTIVATION_MANAGEMENT: true,
            HARVEST_MANAGEMENT: true,
            COLLECTOR_PROCUREMENT: true,
            PROCESSING_INTAKE: true,
            PROCESSING_PACKAGING: true,
            DISPATCH_MANAGEMENT: true,
            TRACEABILITY_MANAGEMENT: true,
            INVENTORY_MANAGEMENT: true,
            SUPPLIES_TRADE_MANAGEMENT: true,
            FINANCE_MANAGEMENT: true,
            GROWING_REGION_MANAGEMENT: true,
            ROLE_PERMISSION_MANAGEMENT: true,
            MASTER_CATALOG_MANAGEMENT: true,
            DOCUMENT_MANAGEMENT: true,
            NEWS_MANAGEMENT: true
        },
        permissions: getAllSystemPermissionKeys()
    },

    FARMER: {
        moduleEnabled: {
            ACCOUNT_MANAGEMENT: false,
            JOURNAL_MANAGEMENT: true,
            CULTIVATION_MANAGEMENT: true,
            HARVEST_MANAGEMENT: true,
            COLLECTOR_PROCUREMENT: false,
            PROCESSING_INTAKE: false,
            PROCESSING_PACKAGING: false,
            DISPATCH_MANAGEMENT: false,
            TRACEABILITY_MANAGEMENT: true,
            INVENTORY_MANAGEMENT: false,
            SUPPLIES_TRADE_MANAGEMENT: true,
            FINANCE_MANAGEMENT: false,
            GROWING_REGION_MANAGEMENT: false,
            ROLE_PERMISSION_MANAGEMENT: false,
            MASTER_CATALOG_MANAGEMENT: false,
            DOCUMENT_MANAGEMENT: true,
            NEWS_MANAGEMENT: true
        },
        permissions: [
            // Nhật ký
            "FARMING_LOG_VIEW",
            "FARMING_LOG_CREATE",
            "FARMING_LOG_EDIT",
            "FARMING_LOG_DELETE",
            "WEATHER_LOG_VIEW",
            "WEATHER_LOG_CREATE",
            "WEATHER_LOG_EDIT",
            "WEATHER_LOG_DELETE",
            "PEST_LOG_VIEW",
            "PEST_LOG_CREATE",
            "PEST_LOG_EDIT",
            "PEST_LOG_DELETE",
            // Canh tác
            "FARM_PROFILE_VIEW",
            "FARM_PROFILE_CREATE",
            "FARM_PROFILE_EDIT",
            "FARMING_PLAN_VIEW",
            "FARMING_PLAN_CREATE",
            "FARMING_PLAN_EDIT",
            "PEST_MONITORING_VIEW",
            "PEST_MONITORING_CREATE",
            "PEST_MONITORING_EDIT",
            "PEST_MONITORING_TREATMENT",
            "PRODUCTION_STATS_PESTICIDE",
            "PRODUCTION_STATS_FERTILIZER",
            "PRODUCTION_STATS_EXPENSE",
            "PRODUCTION_STATS_REVENUE",
            "PRODUCTION_STATS_PROFIT",
            // Thu hoạch
            "HARVEST_REQUEST_VIEW",
            "HARVEST_REQUEST_CREATE",
            "HARVEST_REQUEST_EDIT",
            "HARVEST_REQUEST_SUBMIT",
            "HARVEST_HANDOVER_VIEW",
            "HARVEST_HANDOVER_CONFIRM",
            // Vật tư & Đơn hàng
            "STORE_PRODUCT_VIEW",
            "STORE_ORDER_VIEW",
            "STORE_ORDER_CREATE",
            "STORE_ORDER_CANCEL",
            "CART_VIEW",
            "CART_ADD_ITEM",
            "CART_UPDATE_QTY",
            "CART_REMOVE_ITEM",
            // Truy xuất
            "QR_TRACE_VIEW",
            "TRACE_CHAIN_VIEW",
            // Tài liệu & Tin tức
            "DOC_VIEW",
            "DOC_DOWNLOAD",
            "NEWS_VIEW"
        ]
    },

    COLLECTOR: {
        moduleEnabled: {
            ACCOUNT_MANAGEMENT: false,
            JOURNAL_MANAGEMENT: false,
            CULTIVATION_MANAGEMENT: false,
            HARVEST_MANAGEMENT: true,
            COLLECTOR_PROCUREMENT: true,
            PROCESSING_INTAKE: false,
            PROCESSING_PACKAGING: false,
            DISPATCH_MANAGEMENT: true,
            TRACEABILITY_MANAGEMENT: true,
            INVENTORY_MANAGEMENT: true,
            SUPPLIES_TRADE_MANAGEMENT: false,
            FINANCE_MANAGEMENT: true,
            GROWING_REGION_MANAGEMENT: false,
            ROLE_PERMISSION_MANAGEMENT: false,
            MASTER_CATALOG_MANAGEMENT: false,
            DOCUMENT_MANAGEMENT: true,
            NEWS_MANAGEMENT: true
        },
        permissions: [
            // Thu mua & Thu gom
            "COLLECTOR_INBOX_VIEW",
            "COLLECTOR_INBOX_ACCEPT",
            "COLLECTOR_INBOX_REJECT",
            "COLLECTOR_INBOX_RECEIVE",
            "PURCHASE_ORDER_VIEW",
            "PURCHASE_ORDER_CREATE",
            "PURCHASE_ORDER_EDIT",
            "PURCHASE_ORDER_DELETE",
            "COLLECTION_LOT_VIEW",
            "COLLECTION_LOT_CREATE",
            "COLLECTION_LOT_EDIT",
            "COLLECTION_LOT_DELETE",
            "COLLECTION_LOT_COMPLETE",
            // Thu hoạch
            "HARVEST_REQUEST_VIEW",
            "HARVEST_HANDOVER_VIEW",
            // Xuất hàng
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "SHIPMENT_CONFIRM",
            "SHIPMENT_EXPORT_DOC",
            // Truy xuất
            "QR_TRACE_VIEW",
            "TRACE_CHAIN_VIEW",
            // Kho
            "WAREHOUSE_IMPORT_VIEW",
            "WAREHOUSE_IMPORT_CREATE",
            "WAREHOUSE_IMPORT_CONFIRM",
            "WAREHOUSE_IMPORT_PRINT",
            "WAREHOUSE_EXPORT_VIEW",
            "WAREHOUSE_EXPORT_CREATE",
            "WAREHOUSE_EXPORT_CONFIRM",
            "WAREHOUSE_EXPORT_PRINT",
            // Tài chính
            "FINANCE_INCOME_VIEW",
            "FINANCE_EXPENSE_VIEW",
            "FINANCE_DEBT_VIEW",
            "FINANCE_DEBT_RECORD_PAYMENT",
            "FINANCE_REPORT_VIEW",
            // Tài liệu & Tin tức
            "DOC_VIEW",
            "DOC_DOWNLOAD",
            "NEWS_VIEW"
        ]
    },

    PROCESSING_FACILITY: {
        moduleEnabled: {
            ACCOUNT_MANAGEMENT: false,
            JOURNAL_MANAGEMENT: false,
            CULTIVATION_MANAGEMENT: false,
            HARVEST_MANAGEMENT: true,
            COLLECTOR_PROCUREMENT: false,
            PROCESSING_INTAKE: true,
            PROCESSING_PACKAGING: true,
            DISPATCH_MANAGEMENT: true,
            TRACEABILITY_MANAGEMENT: true,
            INVENTORY_MANAGEMENT: true,
            SUPPLIES_TRADE_MANAGEMENT: false,
            FINANCE_MANAGEMENT: true,
            GROWING_REGION_MANAGEMENT: false,
            ROLE_PERMISSION_MANAGEMENT: false,
            MASTER_CATALOG_MANAGEMENT: false,
            DOCUMENT_MANAGEMENT: true,
            NEWS_MANAGEMENT: true
        },
        permissions: [
            // Tiếp nhận & Phân loại
            "INTAKE_HARVEST_VIEW",
            "INTAKE_HARVEST_ACCEPT",
            "INTAKE_HARVEST_REJECT",
            "GOODS_RECEIPT_VIEW",
            "GOODS_RECEIPT_CONFIRM",
            "RAW_MATERIAL_CLASSIFY_VIEW",
            "RAW_MATERIAL_CLASSIFY_EXEC",
            "RAW_MATERIAL_CLASSIFY_EDIT",
            "QC_INSPECTION_VIEW",
            "QC_INSPECTION_CREATE",
            "QC_INSPECTION_EDIT",
            "QC_INSPECTION_CONFIRM",
            // Chế biến & Đóng gói
            "PROCESSING_BATCH_VIEW",
            "PROCESSING_BATCH_CREATE",
            "PROCESSING_BATCH_EDIT",
            "PROCESSING_BATCH_DELETE",
            "PROCESSING_BATCH_COMPLETE",
            "FINISHED_LOT_VIEW",
            "FINISHED_LOT_CREATE",
            "FINISHED_LOT_EDIT",
            "FINISHED_LOT_DELETE",
            "FINISHED_LOT_COMPLETE",
            // Xuất hàng
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "SHIPMENT_EDIT",
            "SHIPMENT_CONFIRM",
            "SHIPMENT_EXPORT_DOC",
            "COMMERCIAL_DISPATCH_VIEW",
            "COMMERCIAL_DISPATCH_CREATE",
            "COMMERCIAL_DISPATCH_PRINT",
            // Truy xuất & China Port
            "QR_TRACE_VIEW",
            "QR_TRACE_PREVIEW",
            "QR_TRACE_ISSUE",
            "QR_TRACE_PRINT",
            "TRACE_CHAIN_VIEW",
            "CHINA_PORT_SEARCH",
            "CHINA_PORT_SYNC",
            "CHINA_PORT_EXPORT",
            // Kho
            "WAREHOUSE_IMPORT_VIEW",
            "WAREHOUSE_IMPORT_CREATE",
            "WAREHOUSE_IMPORT_CONFIRM",
            "WAREHOUSE_IMPORT_PRINT",
            "WAREHOUSE_EXPORT_VIEW",
            "WAREHOUSE_EXPORT_CREATE",
            "WAREHOUSE_EXPORT_CONFIRM",
            "WAREHOUSE_EXPORT_PRINT",
            "WAREHOUSE_TRANSFER_VIEW",
            "WAREHOUSE_TRANSFER_CREATE",
            "WAREHOUSE_TRANSFER_CONFIRM",
            "WAREHOUSE_TRANSFER_PRINT",
            // Tài chính
            "FINANCE_INCOME_VIEW",
            "FINANCE_EXPENSE_VIEW",
            "FINANCE_DEBT_VIEW",
            "FINANCE_DEBT_RECORD_PAYMENT",
            "FINANCE_REPORT_VIEW",
            "FINANCE_REPORT_EXPORT",
            // Tài liệu & Tin tức
            "DOC_VIEW",
            "DOC_DOWNLOAD",
            "NEWS_VIEW"
        ]
    },

    STORE_OWNER: {
        moduleEnabled: {
            ACCOUNT_MANAGEMENT: false,
            JOURNAL_MANAGEMENT: false,
            CULTIVATION_MANAGEMENT: false,
            HARVEST_MANAGEMENT: false,
            COLLECTOR_PROCUREMENT: false,
            PROCESSING_INTAKE: false,
            PROCESSING_PACKAGING: false,
            DISPATCH_MANAGEMENT: false,
            TRACEABILITY_MANAGEMENT: false,
            INVENTORY_MANAGEMENT: true,
            SUPPLIES_TRADE_MANAGEMENT: true,
            FINANCE_MANAGEMENT: true,
            GROWING_REGION_MANAGEMENT: false,
            ROLE_PERMISSION_MANAGEMENT: false,
            MASTER_CATALOG_MANAGEMENT: true,
            DOCUMENT_MANAGEMENT: true,
            NEWS_MANAGEMENT: true
        },
        permissions: [
            // Vật tư & Giao dịch
            "STORE_PRODUCT_VIEW",
            "STORE_PRODUCT_CREATE",
            "STORE_PRODUCT_EDIT",
            "STORE_PRODUCT_DELETE",
            "STORE_ORDER_VIEW",
            "STORE_ORDER_CONFIRM",
            "STORE_ORDER_CANCEL",
            "STORE_ORDER_STATUS_UPDATE",
            "STORE_PROFILE_VIEW",
            "STORE_PROFILE_EDIT",
            // Kho vật tư
            "WAREHOUSE_IMPORT_VIEW",
            "WAREHOUSE_IMPORT_CREATE",
            "WAREHOUSE_IMPORT_CONFIRM",
            "WAREHOUSE_IMPORT_PRINT",
            "WAREHOUSE_EXPORT_VIEW",
            "WAREHOUSE_EXPORT_CREATE",
            "WAREHOUSE_EXPORT_CONFIRM",
            "WAREHOUSE_EXPORT_PRINT",
            // Tài chính cửa hàng
            "FINANCE_INCOME_VIEW",
            "FINANCE_INCOME_CREATE",
            "FINANCE_EXPENSE_VIEW",
            "FINANCE_EXPENSE_CREATE",
            "FINANCE_DEBT_VIEW",
            "FINANCE_DEBT_RECORD_PAYMENT",
            "FINANCE_REPORT_VIEW",
            // Danh mục tra cứu
            "CATALOG_VARIETY_VIEW",
            "CATALOG_PESTICIDE_VIEW",
            "CATALOG_FERTILIZER_VIEW",
            "CATALOG_PROHIBITED_VIEW",
            // Tài liệu & Tin tức
            "DOC_VIEW",
            "DOC_DOWNLOAD",
            "NEWS_VIEW"
        ]
    },

    AREA_MANAGER: {
        moduleEnabled: {
            ACCOUNT_MANAGEMENT: false,
            JOURNAL_MANAGEMENT: true,
            CULTIVATION_MANAGEMENT: true,
            HARVEST_MANAGEMENT: true,
            COLLECTOR_PROCUREMENT: false,
            PROCESSING_INTAKE: false,
            PROCESSING_PACKAGING: false,
            DISPATCH_MANAGEMENT: false,
            TRACEABILITY_MANAGEMENT: true,
            INVENTORY_MANAGEMENT: false,
            SUPPLIES_TRADE_MANAGEMENT: false,
            FINANCE_MANAGEMENT: false,
            GROWING_REGION_MANAGEMENT: true,
            ROLE_PERMISSION_MANAGEMENT: false,
            MASTER_CATALOG_MANAGEMENT: true,
            DOCUMENT_MANAGEMENT: true,
            NEWS_MANAGEMENT: true
        },
        permissions: [
            // Vùng trồng
            "GROWING_REGION_VIEW",
            "GROWING_REGION_EDIT",
            "AREA_MANAGER_VIEW",
            "REGION_FARM_VIEW",
            "REGION_FARM_APPROVE",
            "REGION_FARM_REJECT",
            "REGION_FARM_TOGGLE",
            "REGION_FARMER_VIEW",
            // Giám sát canh tác & nhật ký
            "FARM_PROFILE_VIEW",
            "FARMING_LOG_VIEW",
            "WEATHER_LOG_VIEW",
            "PEST_LOG_VIEW",
            "PEST_MONITORING_VIEW",
            "PRODUCTION_STATS_PESTICIDE",
            "PRODUCTION_STATS_FERTILIZER",
            "PRODUCTION_STATS_EXPENSE",
            "PRODUCTION_STATS_REVENUE",
            "PRODUCTION_STATS_PROFIT",
            // Giám sát thu hoạch & truy xuất
            "HARVEST_REQUEST_VIEW",
            "HARVEST_HANDOVER_VIEW",
            "QR_TRACE_VIEW",
            "TRACE_CHAIN_VIEW",
            // Danh mục & Tài liệu
            "CATALOG_VARIETY_VIEW",
            "CATALOG_PESTICIDE_VIEW",
            "CATALOG_FERTILIZER_VIEW",
            "CATALOG_PROHIBITED_VIEW",
            "DOC_VIEW",
            "DOC_DOWNLOAD",
            "NEWS_VIEW"
        ]
    }
};

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

export interface RoleItem {
    key: string;
    name: string;
    description: string;
    isSystem: boolean;
    badgeColor: string;
    targetGroup: string;
    status: "ACTIVE" | "INACTIVE";
    permissions: string[];
    defaultPermissions: string[];
    assignedUsers: RoleAssignedUser[];
    stats: {
        totalGranted: number;
        totalAvailable: number;
        userCount: number;
        perModuleStats?: Record<string, { granted: number; total: number; isEnabled: boolean }>;
    };
    updatedAt?: string;
    updatedByName?: string;
}
