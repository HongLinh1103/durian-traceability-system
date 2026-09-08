export type ActionType = "view" | "create" | "edit" | "delete" | "approve" | "deliver" | "export";

export interface PermissionRouteDef {
    kind: "page" | "api" | "client";
    path: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    operation?: string;
    /** Giao diện thực sự sử dụng route, phục vụ đối chiếu danh mục. */
    source: string;
}

export interface PermissionActionDef {
    key: string;
    label: string;
    action: ActionType;
    description?: string;
    routes: PermissionRouteDef[];
}

export interface FeatureDef {
    id: string;
    name: string;
    description: string;
    menuPath?: string;
    group?: string;
    actions: {
        view?: PermissionActionDef;
        create?: PermissionActionDef;
        edit?: PermissionActionDef;
        delete?: PermissionActionDef;
        approve?: PermissionActionDef;
        deliver?: PermissionActionDef;
        export?: PermissionActionDef;
        [actionKey: string]: PermissionActionDef | undefined;
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
        "key": "PROCESSING_STAFF",
        "name": "Nhân viên chế biến",
        "description": "Nhân viên thực hiện tiếp nhận, phân loại, bóc tách múi, cấp đông IQF và đóng gói thành phẩm tại xưởng",
        "targetGroup": "Cơ sở chế biến",
        "badgeColor": "bg-indigo-100 text-indigo-800 border-indigo-200",
        "status": "ACTIVE",
        "permissions": [
            "DASHBOARD_VIEW",
            "RAW_MATERIAL_VIEW",
            "RAW_MATERIAL_CREATE",
            "RAW_MATERIAL_RECEIVE",
            "RAW_MATERIAL_CLASSIFY",
            "PROCESSING_BATCH_VIEW",
            "PROCESSING_BATCH_CREATE",
            "FINISHED_LOT_VIEW",
            "FINISHED_LOT_CREATE",
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_CREATE"
        ],
        "assignedUserIds": [
            "mock-proc-1",
            "mock-proc-2",
            "mock-proc-3",
            "mock-proc-4"
        ]
    },
    {
        "key": "INTAKE_STAFF",
        "name": "Nhân viên tiếp nhận",
        "description": "Nhân viên thực hiện tiếp nhận nguyên liệu từ vườn/vựa, kiểm tra QC và phân loại quả tại xưởng",
        "targetGroup": "Cơ sở chế biến",
        "badgeColor": "bg-blue-100 text-blue-800 border-blue-200",
        "status": "ACTIVE",
        "permissions": [
            "DASHBOARD_VIEW",
            "RAW_MATERIAL_VIEW",
            "RAW_MATERIAL_CREATE",
            "RAW_MATERIAL_RECEIVE",
            "RAW_MATERIAL_CLASSIFY",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_CREATE"
        ],
        "assignedUserIds": [
            "mock-intake-1",
            "mock-intake-2",
            "mock-intake-3"
        ]
    },
    {
        "key": "DISPATCH_STAFF",
        "name": "Nhân viên xuất hàng",
        "description": "Nhân viên lập lệnh xuất hàng, gán cont lạnh, kiểm tra niêm phong và xuất kho thương mại",
        "targetGroup": "Cơ sở chế biến",
        "badgeColor": "bg-teal-100 text-teal-800 border-teal-200",
        "status": "ACTIVE",
        "permissions": [
            "DASHBOARD_VIEW",
            "FINISHED_LOT_VIEW",
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "SHIPMENT_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW",
            "COMMERCIAL_DISPATCH_CREATE",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_EXPORT",
            "WAREHOUSE_MOVE_VIEW",
            "WAREHOUSE_MOVE_CREATE"
        ],
        "assignedUserIds": [
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

// Danh mục chuẩn hóa 16 Phân hệ phân quyền hệ thống TriViet theo cấu trúc mới
export const PERMISSION_MODULES: ModuleDef[] = [
    {
        "id": "DASHBOARD",
        "name": "TỔNG QUAN",
        "title": "Bảng điều khiển & Thống kê tổng quan",
        "description": "Theo dõi thông tin tổng quan và tình trạng hoạt động của hệ thống",
        "iconName": "LayoutDashboard",
        "features": [
            {
                "id": "dashboard_overview",
                "name": "Tổng quan hệ thống",
                "description": "Truy cập màn hình tổng quan KPI, tiến độ canh tác, thu mua, chế biến và bán hàng",
                "menuPath": "/dashboard/admin",
                "actions": {
                    "view": {
                        "key": "DASHBOARD_VIEW",
                        "label": "Xem tổng quan",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/admin",
                                "method": "GET",
                                "source": "src/app/dashboard/admin/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer",
                                "method": "GET",
                                "source": "src/app/dashboard/farmer/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/area-manager",
                                "method": "GET",
                                "source": "src/app/dashboard/area-manager/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/partner",
                                "method": "GET",
                                "source": "src/app/dashboard/partner/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/processing",
                                "method": "GET",
                                "source": "src/app/dashboard/processing/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/store",
                                "method": "GET",
                                "source": "src/app/dashboard/store/page.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "CULTIVATION",
        "name": "NÔNG HỘ & CANH TÁC",
        "title": "Quản lý canh tác & Vườn trồng",
        "description": "Quản lý hồ sơ vườn, nhật ký canh tác, kế hoạch và thông tin sản xuất tại nông hộ",
        "iconName": "Sprout",
        "features": [
            {
                "id": "farm_profile",
                "name": "Hồ sơ vườn",
                "description": "Hồ sơ chủ vườn, vị trí GPS, diện tích đất, số lượng cây sầu riêng và giống trồng",
                "menuPath": "/dashboard/farmer",
                "actions": {
                    "view": {
                        "key": "FARM_PROFILE_VIEW",
                        "label": "Xem hồ sơ vườn",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer",
                                "method": "GET",
                                "source": "src/app/dashboard/farmer/page.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "farming_log",
                "name": "Nhật ký canh tác",
                "description": "Ghi nhận tưới nước, bón phân, phun thuốc BVTV, làm cỏ, tỉa bông đọt và tuân thủ GACC",
                "menuPath": "/dashboard/farmer/journal/cultivation",
                "actions": {
                    "view": {
                        "key": "FARMING_LOG_VIEW",
                        "label": "Xem nhật ký",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/journal/cultivation",
                                "method": "GET",
                                "source": "src/components/farmer/cultivation-logs-tab.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farming-logs",
                                "method": "GET",
                                "source": "src/components/farmer/cultivation-logs-tab.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "FARMING_LOG_CREATE",
                        "label": "Tạo nhật ký",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/logs/new",
                                "method": "GET",
                                "source": "src/app/dashboard/farmer/logs/new/page.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farming-logs",
                                "method": "POST",
                                "source": "src/app/dashboard/farmer/logs/new/page.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "weather_log",
                "name": "Nhật ký thời tiết",
                "description": "Ghi nhận nhiệt độ, độ ẩm, lượng mưa và hiện tượng thời tiết theo vườn và vụ mùa",
                "menuPath": "/dashboard/farmer/journal/weather",
                "actions": {
                    "view": {
                        "key": "WEATHER_LOG_VIEW",
                        "label": "Xem nhật ký",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/journal/weather",
                                "method": "GET",
                                "source": "src/components/weather/weather-journal.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/weather-observations",
                                "method": "GET",
                                "source": "src/components/weather/weather-journal.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "WEATHER_LOG_CREATE",
                        "label": "Ghi nhận thời tiết",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/weather-observations",
                                "method": "POST",
                                "source": "src/components/weather/weather-journal.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "WEATHER_LOG_EDIT",
                        "label": "Chỉnh sửa ghi nhận",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/weather-observations/[id]",
                                "method": "PUT",
                                "source": "src/components/weather/weather-journal.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "WEATHER_LOG_DELETE",
                        "label": "Xóa ghi nhận",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/weather-observations/[id]",
                                "method": "DELETE",
                                "source": "src/components/weather/weather-journal.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "farming_plan",
                "name": "Kế hoạch canh tác",
                "description": "Lịch trình xử lý ra hoa, làm đọt, chuẩn bị vật tư phân thuốc theo từng giai đoạn",
                "menuPath": "/dashboard/farmer/plans",
                "actions": {
                    "view": {
                        "key": "FARMING_PLAN_VIEW",
                        "label": "Xem kế hoạch",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/plans",
                                "method": "GET",
                                "source": "src/components/farming-plan-calendar.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farming-plans",
                                "method": "GET",
                                "source": "src/components/farming-plan-calendar.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "FARMING_PLAN_CREATE",
                        "label": "Tạo kế hoạch",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/farming-plans",
                                "method": "POST",
                                "source": "src/components/farming-plan-calendar.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "FARMING_PLAN_EDIT",
                        "label": "Chỉnh sửa kế hoạch",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/farming-plans/[id]",
                                "method": "PATCH",
                                "source": "src/components/farming-plan-calendar.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "FARMING_PLAN_DELETE",
                        "label": "Xóa kế hoạch",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/farming-plans/[id]",
                                "method": "DELETE",
                                "source": "src/components/farming-plan-calendar.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "pest_monitoring",
                "name": "Theo dõi sâu bệnh",
                "description": "Sổ theo dõi rầy nhảy, sâu đục quả, xì mủ nấm phytophthora và đặt bẫy giám sát",
                "menuPath": "/dashboard/farmer/journal/pests",
                "actions": {
                    "view": {
                        "key": "PEST_MONITORING_VIEW",
                        "label": "Xem ghi nhận sâu bệnh",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/journal/pests",
                                "method": "GET",
                                "source": "src/components/farmer/pest-monitoring-tab.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farmer/pest-monitoring",
                                "method": "GET",
                                "source": "src/components/farmer/pest-monitoring-tab.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farmer/pest-monitoring/[id]",
                                "method": "GET",
                                "source": "src/components/farmer/pest-monitoring-tab.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "PEST_MONITORING_CREATE",
                        "label": "Ghi nhận sâu bệnh",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/farmer/pest-monitoring",
                                "method": "POST",
                                "source": "src/components/farmer/pest-monitoring-tab.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "PEST_MONITORING_EDIT",
                        "label": "Cập nhật biện pháp xử lý",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/farmer/pest-monitoring/[id]/traps",
                                "method": "POST",
                                "source": "src/components/farmer/pest-monitoring-tab.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farmer/pest-monitoring/[id]/inspections",
                                "method": "POST",
                                "source": "src/components/farmer/pest-monitoring-tab.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farmer/pest-monitoring/[id]/treatments",
                                "method": "POST",
                                "source": "src/components/farmer/pest-monitoring-tab.tsx"
                            }
                        ]
                    },
                    "export": {
                        "key": "PEST_MONITORING_EXPORT",
                        "label": "Xuất báo cáo",
                        "action": "export",
                        "routes": [
                            {
                                "kind": "client",
                                "path": "/dashboard/farmer/journal/pests",
                                "operation": "In sổ theo dõi bằng window.print()",
                                "source": "src/components/farmer/pest-monitoring-tab.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "farmer_pesticide_statistics",
                "name": "Thống kê thuốc BVTV",
                "description": "Báo cáo tần suất phun xịt, thời gian cách ly PHI và hoạt chất sử dụng",
                "menuPath": "/dashboard/farmer/statistics/pesticides",
                "actions": {
                    "view": {
                        "key": "FARMER_PESTICIDE_STATISTICS_VIEW",
                        "label": "Xem thống kê",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/statistics/pesticides",
                                "method": "GET",
                                "source": "src/components/farmer/farmer-statistics-view.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farmer/statistics",
                                "method": "GET",
                                "source": "src/components/farmer/farmer-statistics-view.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "farmer_fertilizer_statistics",
                "name": "Thống kê phân bón",
                "description": "Tổng hợp lượng phân NPK, hữu cơ, vi lượng đã bón theo từng gốc sầu riêng",
                "menuPath": "/dashboard/farmer/statistics/fertilizers",
                "actions": {
                    "view": {
                        "key": "FARMER_FERTILIZER_STATISTICS_VIEW",
                        "label": "Xem thống kê",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/statistics/fertilizers",
                                "method": "GET",
                                "source": "src/components/farmer/farmer-statistics-view.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farmer/statistics",
                                "method": "GET",
                                "source": "src/components/farmer/farmer-statistics-view.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "farmer_expense_statistics",
                "name": "Chi phí canh tác",
                "description": "Theo dõi chi phí phân bón, thuốc BVTV, nhân công và chi phí khác theo vụ mùa",
                "menuPath": "/dashboard/farmer/statistics/expenses",
                "actions": {
                    "view": {
                        "key": "FARMER_EXPENSE_STATISTICS_VIEW",
                        "label": "Xem chi phí",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/statistics/expenses",
                                "method": "GET",
                                "source": "src/components/farmer/farmer-statistics-view.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/farmer/statistics",
                                "method": "GET",
                                "source": "src/components/farmer/farmer-statistics-view.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "FARMER_EXPENSE_STATISTICS_CREATE",
                        "label": "Ghi nhận chi phí",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/farmer/expenses",
                                "method": "POST",
                                "source": "src/components/farmer/farmer-statistics-view.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "HARVEST",
        "name": "THU HOẠCH",
        "title": "Thu hoạch & Bàn giao sản phẩm tại vườn",
        "description": "Quản lý phiếu thu hoạch và quá trình bàn giao sản phẩm tại vườn",
        "iconName": "Wheat",
        "features": [
            {
                "id": "harvest_request",
                "name": "Phiếu thu hoạch",
                "description": "Đăng ký kế hoạch cắt quả, sản lượng dự kiến và danh sách cây thu hoạch",
                "menuPath": "/dashboard/farmer/harvests",
                "actions": {
                    "view": {
                        "key": "HARVEST_REQUEST_VIEW",
                        "label": "Xem phiếu",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/harvests",
                                "method": "GET",
                                "source": "src/components/farmer-harvests.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/harvests/[id]",
                                "method": "GET",
                                "source": "src/components/farmer-harvests.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "HARVEST_REQUEST_CREATE",
                        "label": "Tạo phiếu thu hoạch",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/harvests/new",
                                "method": "GET",
                                "source": "src/app/harvests/new/page.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/harvests",
                                "method": "POST",
                                "source": "src/app/harvests/new/page.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "HARVEST_REQUEST_EDIT",
                        "label": "Cập nhật trạng thái thu hoạch",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/harvests/[id]",
                                "method": "PATCH",
                                "operation": "action=START | FINISH",
                                "source": "src/components/farmer-harvests.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "harvest_delivery",
                "name": "Bàn giao tại vườn",
                "description": "Biên bản cân nhận tại vườn, ghi nhận trọng lượng từng sọt và ký nhận với thương lái",
                "menuPath": "/dashboard/farmer/harvests",
                "actions": {
                    "view": {
                        "key": "HARVEST_DELIVERY_VIEW",
                        "label": "Xem thông tin cân nhận",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/harvests/[id]",
                                "method": "GET",
                                "source": "src/components/harvest-detail-view.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "HARVEST_DELIVERY_EDIT",
                        "label": "Xác nhận bàn giao",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/harvests/[id]",
                                "method": "PATCH",
                                "operation": "action=DELIVER",
                                "source": "src/components/farmer-harvests.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "PROCUREMENT",
        "name": "THU MUA & THU GOM",
        "title": "Thu mua nông sản & Lô hàng thu gom",
        "description": "Quản lý quá trình tiếp nhận sản phẩm từ nông dân, thu mua và hình thành lô thu gom",
        "iconName": "Handshake",
        "features": [
            {
                "id": "procurement_inbox",
                "name": "Tiếp nhận phiếu thu hoạch",
                "description": "Tiếp nhận phiếu báo thu hoạch từ các vườn liên kết, lên lịch cắt và chốt thương lượng",
                "menuPath": "/dashboard/partner/harvests",
                "actions": {
                    "view": {
                        "key": "PROCUREMENT_INBOX_VIEW",
                        "label": "Xem phiếu chờ tiếp nhận",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/partner/harvests",
                                "method": "GET",
                                "source": "src/components/partner-harvests.tsx"
                            }
                        ]
                    },
                    "approve": {
                        "key": "PROCUREMENT_INBOX_APPROVE",
                        "label": "Xác nhận tiếp nhận",
                        "action": "approve",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/harvests/[id]",
                                "method": "PATCH",
                                "operation": "action=CONFIRM | REJECT | RECEIVE",
                                "source": "src/components/partner-harvests.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "procurement_orders",
                "name": "Đơn thu mua",
                "description": "Hợp đồng thu mua, bảng giá thỏa thuận theo giống và điều khoản thanh toán",
                "menuPath": "/dashboard/partner/orders",
                "actions": {
                    "view": {
                        "key": "PROCUREMENT_ORDER_VIEW",
                        "label": "Xem đơn thu mua",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/partner/orders",
                                "method": "GET",
                                "source": "src/app/dashboard/partner/orders/page.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "collection_lots",
                "name": "Lô thu gom",
                "description": "Tập hợp các chuyến hàng từ vườn thành lô hàng lớn chuẩn bị vận chuyển đến xưởng",
                "menuPath": "/dashboard/partner/lots",
                "actions": {
                    "view": {
                        "key": "COLLECTION_LOT_VIEW",
                        "label": "Xem lô thu gom",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/partner/lots",
                                "method": "GET",
                                "source": "src/app/dashboard/partner/lots/page.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "RAW_MATERIAL_INTAKE",
        "name": "TIẾP NHẬN & PHÂN LOẠI",
        "title": "Tiếp nhận nguyên liệu & Phân loại chất lượng",
        "description": "Quản lý việc tiếp nhận nguyên liệu tại cơ sở và phân loại chất lượng đầu vào",
        "iconName": "Boxes",
        "features": [
            {
                "id": "raw_material_receive",
                "name": "Tiếp nhận nguyên liệu",
                "description": "Cân đối chiếu, kiểm tra ngoại quan chuyến hàng từ vựa/vườn và lập biên bản giao nhận",
                "menuPath": "/dashboard/processing/raw-materials",
                "actions": {
                    "view": {
                        "key": "RAW_MATERIAL_VIEW",
                        "label": "Xem danh sách",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/processing/raw-materials",
                                "method": "GET",
                                "source": "src/components/processing/processing-raw-materials-view.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "RAW_MATERIAL_CREATE",
                        "label": "Xác nhận / Từ chối tiếp nhận",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/harvests/[id]",
                                "method": "PATCH",
                                "operation": "action=CONFIRM | REJECT",
                                "source": "src/components/processing/processing-raw-materials-view.tsx"
                            }
                        ]
                    },
                    "approve": {
                        "key": "RAW_MATERIAL_RECEIVE",
                        "label": "Xác nhận nhập xưởng",
                        "action": "approve",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/harvests/[id]",
                                "method": "PATCH",
                                "operation": "action=RECEIVE",
                                "source": "src/components/processing/processing-raw-materials-view.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "raw_material_classify",
                "name": "Phân loại nguyên liệu",
                "description": "Phân loại sầu riêng theo loại A, B, C, dạt; đo độ ngọt brix và kiểm định dư lượng",
                "menuPath": "/dashboard/processing/raw-materials",
                "actions": {
                    "create": {
                        "key": "RAW_MATERIAL_CLASSIFY",
                        "label": "Thực hiện phân loại",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/processing/raw-materials/[id]/classify",
                                "method": "POST",
                                "source": "src/components/processing/processing-raw-materials-view.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "PROCESSING",
        "name": "CHẾ BIẾN & ĐÓNG GÓI",
        "title": "Chế biến nông sản & Đóng gói thành phẩm",
        "description": "Quản lý quá trình chế biến nguyên liệu và tạo lô thành phẩm",
        "iconName": "Factory",
        "features": [
            {
                "id": "processing_batches",
                "name": "Lô chế biến",
                "description": "Theo dõi công đoạn bóc múi, cấp đông IQF -40°C, hút chân không và kiểm tra kim loại",
                "menuPath": "/dashboard/processing/processing",
                "actions": {
                    "view": {
                        "key": "PROCESSING_BATCH_VIEW",
                        "label": "Xem lô",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/processing/processing",
                                "method": "GET",
                                "source": "src/components/processing/processing-production-view.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "PROCESSING_BATCH_CREATE",
                        "label": "Hoàn tất chế biến",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/processing/production",
                                "method": "POST",
                                "source": "src/components/processing/processing-production-view.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "finished_lots",
                "name": "Đóng gói lô thành phẩm",
                "description": "Quy cách đóng thùng carton, dán tem nhãn GACC, số lượng gói/thùng và trọng lượng tịnh",
                "menuPath": "/dashboard/processing/processing",
                "actions": {
                    "view": {
                        "key": "FINISHED_LOT_VIEW",
                        "label": "Xem lô thành phẩm",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/processing/processing",
                                "method": "GET",
                                "source": "src/components/processing/processing-production-view.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "FINISHED_LOT_CREATE",
                        "label": "Hoàn tất đóng gói",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/processing/fresh-packaging",
                                "method": "POST",
                                "source": "src/components/processing/processing-production-view.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "SHIPMENT_TRACEABILITY",
        "name": "XUẤT HÀNG & TRUY XUẤT",
        "title": "Xuất hàng, truy xuất nguồn gốc & Đối soát hải quan",
        "description": "Quản lý lô xuất hàng, truy xuất nguồn gốc và thông tin phục vụ xuất khẩu",
        "iconName": "Truck",
        "features": [
            {
                "id": "shipment_lots",
                "name": "Lô xuất hàng",
                "description": "Tập hợp các kiện thành phẩm vào cont lạnh, kiểm tra niêm phong hải quan và xuất xưởng",
                "menuPath": "/dashboard/processing/shipments",
                "actions": {
                    "view": {
                        "key": "SHIPMENT_VIEW",
                        "label": "Xem lô xuất hàng",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/processing/shipments",
                                "method": "GET",
                                "source": "src/components/processing/processing-shipments-view.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "SHIPMENT_CREATE",
                        "label": "Tạo lô xuất hàng",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/processing/shipments",
                                "method": "POST",
                                "source": "src/components/processing/processing-shipments-view.tsx"
                            }
                        ]
                    },
                    "export": {
                        "key": "SHIPMENT_EXPORT",
                        "label": "Xuất hồ sơ",
                        "action": "export",
                        "routes": [
                            {
                                "kind": "client",
                                "path": "/dashboard/processing/shipments",
                                "operation": "In phiếu xuất hàng bằng window.print()",
                                "source": "src/components/processing/processing-shipments-view.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "qr_manage",
                "name": "QR truy xuất nguồn gốc",
                "description": "Phát hành mã QR động theo lô thành phẩm, cấu hình thông tin hiển thị cho người tiêu dùng",
                "menuPath": "/dashboard/processing/traceability",
                "actions": {
                    "view": {
                        "key": "QR_MANAGE_VIEW",
                        "label": "Xem QR",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/farmer/traceability",
                                "method": "GET",
                                "source": "src/app/dashboard/farmer/traceability/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/partner/traceability",
                                "method": "GET",
                                "source": "src/app/dashboard/partner/traceability/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/processing/traceability",
                                "method": "GET",
                                "source": "src/app/dashboard/processing/traceability/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/admin/traceability",
                                "method": "GET",
                                "source": "src/app/dashboard/admin/traceability/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/area-manager/traceability",
                                "method": "GET",
                                "source": "src/app/dashboard/area-manager/traceability/page.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "QR_MANAGE_CREATE",
                        "label": "Tạo / Xem trước QR",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/traceability/codes",
                                "method": "POST",
                                "source": "src/components/traceability/traceability-manager.tsx"
                            }
                        ]
                    },
                    "export": {
                        "key": "QR_MANAGE_EXPORT",
                        "label": "Tải / In QR",
                        "action": "export",
                        "routes": [
                            {
                                "kind": "client",
                                "path": "/dashboard/processing/traceability",
                                "operation": "In hoặc tải ảnh QR",
                                "source": "src/components/processing/processing-qr-generator-view.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "china_port",
                "name": "Tra cứu China Port",
                "description": "Tra cứu danh bạ mã số vùng trồng và cơ sở đóng gói được Hải quan Trung Quốc (GACC) cấp phép",
                "menuPath": "/china-port",
                "actions": {
                    "view": {
                        "key": "CHINA_PORT_VIEW",
                        "label": "Tra cứu",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/china-port",
                                "method": "GET",
                                "source": "src/components/china-port/china-port-view.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/china-port/search",
                                "method": "POST",
                                "source": "src/components/china-port/china-port-view.tsx"
                            }
                        ]
                    },
                    "export": {
                        "key": "CHINA_PORT_EXPORT",
                        "label": "Xuất kết quả",
                        "action": "export",
                        "routes": [
                            {
                                "kind": "client",
                                "path": "/china-port",
                                "operation": "Tải CSV tại trình duyệt",
                                "source": "src/components/china-port/china-port-view.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "commercial_dispatch",
                "name": "Xuất bán thương mại",
                "description": "Lập lệnh xuất hàng bán cho đối tác thương mại, in phiếu xuất kho kiêm vận chuyển nội bộ",
                "menuPath": "/dashboard/partner/traceability",
                "actions": {
                    "view": {
                        "key": "COMMERCIAL_DISPATCH_VIEW",
                        "label": "Xem phiếu xuất bán",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/partner/traceability",
                                "method": "GET",
                                "source": "src/components/traceability/traceability-manager.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "COMMERCIAL_DISPATCH_CREATE",
                        "label": "Tạo lô xuất bán",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/traceability/commercial-lots",
                                "method": "POST",
                                "source": "src/components/traceability/traceability-manager.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "COMMERCIAL_DISPATCH_EDIT",
                        "label": "Chỉnh sửa thông tin xuất bán",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/traceability/commercial-lots",
                                "method": "PATCH",
                                "source": "src/components/traceability/traceability-manager.tsx"
                            }
                        ]
                    },
                    "export": {
                        "key": "COMMERCIAL_DISPATCH_EXPORT",
                        "label": "In phiếu",
                        "action": "export",
                        "routes": [
                            {
                                "kind": "client",
                                "path": "/dashboard/partner/traceability",
                                "operation": "In phiếu xuất bán",
                                "source": "src/components/partner/sales-dispatch-slip.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "INVENTORY",
        "name": "KHO HÀNG",
        "title": "Quản lý kho & Luân chuyển hàng hóa",
        "description": "Quản lý hoạt động nhập kho, xuất kho và điều chuyển hàng hóa",
        "iconName": "Package",
        "features": [
            {
                "id": "warehouse_movements",
                "name": "Nhập  Xuất  Chuyển kho",
                "description": "Phiếu nhập kho vật tư, xuất kho chế biến và chuyển kho giữa các chi nhánh hoặc kho lạnh",
                "menuPath": "/dashboard/store/inventory",
                "actions": {
                    "view": {
                        "key": "WAREHOUSE_MOVE_VIEW",
                        "label": "Xem phiếu kho",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/store/inventory",
                                "method": "GET",
                                "source": "src/components/store/inventory-manager.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/store/inventory/[code]",
                                "method": "GET",
                                "source": "src/components/store/inventory-document-view.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "WAREHOUSE_MOVE_CREATE",
                        "label": "Tạo phiếu kho",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/store/inventory",
                                "method": "POST",
                                "source": "src/components/store/inventory-manager.tsx"
                            }
                        ]
                    },
                    "export": {
                        "key": "WAREHOUSE_MOVE_EXPORT",
                        "label": "In phiếu",
                        "action": "export",
                        "routes": [
                            {
                                "kind": "client",
                                "path": "/dashboard/store/inventory/[code]",
                                "operation": "In phiếu nhập/xuất kho",
                                "source": "src/components/store/inventory-document-view.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "STORE_MARKETPLACE",
        "name": "VẬT TƯ & GIAO DỊCH",
        "title": "Cửa hàng vật tư & Hoạt động mua bán",
        "description": "Quản lý vật tư và hoạt động mua bán vật tư nông nghiệp",
        "iconName": "Store",
        "features": [
            {
                "id": "store_products",
                "name": "Quản lý sản phẩm",
                "group": "QUẢN LÝ CỬA HÀNG",
                "description": "Quản lý danh mục phân bón, thuốc BVTV, thiết bị tưới; giá bán và tình trạng còn hàng",
                "menuPath": "/dashboard/store/products",
                "actions": {
                    "view": {
                        "key": "STORE_PRODUCT_VIEW",
                        "label": "Xem sản phẩm",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/store/products",
                                "method": "GET",
                                "source": "src/components/store/store-products-manager.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "STORE_PRODUCT_CREATE",
                        "label": "Thêm sản phẩm",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/store/products",
                                "method": "POST",
                                "source": "src/components/store/store-products-manager.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "STORE_PRODUCT_EDIT",
                        "label": "Chỉnh sửa sản phẩm",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/store/products/[id]",
                                "method": "PATCH",
                                "operation": "Cập nhật sản phẩm hoặc status",
                                "source": "src/components/store/store-products-manager.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "STORE_PRODUCT_DELETE",
                        "label": "Xóa sản phẩm",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/store/products/[id]",
                                "method": "DELETE",
                                "source": "src/components/store/store-products-manager.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "store_orders",
                "name": "Đơn hàng nhận được",
                "group": "QUẢN LÝ CỬA HÀNG",
                "description": "Xử lý đơn đặt hàng vật tư từ nông dân, xác nhận đơn, chuẩn bị hàng và giao hàng",
                "menuPath": "/dashboard/store/orders",
                "actions": {
                    "view": {
                        "key": "STORE_ORDER_VIEW",
                        "label": "Xem đơn hàng",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/store/orders",
                                "method": "GET",
                                "source": "src/components/store/store-orders-manager.tsx"
                            }
                        ]
                    },
                    "approve": {
                        "key": "STORE_ORDER_APPROVE",
                        "label": "Xác nhận đơn hàng",
                        "action": "approve",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/store/orders/[id]",
                                "method": "PATCH",
                                "operation": "status=PREPARING | REJECTED",
                                "source": "src/components/store/store-orders-manager.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "STORE_ORDER_EDIT",
                        "label": "Cập nhật trạng thái",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/store/orders/[id]",
                                "method": "PATCH",
                                "operation": "status=SHIPPING | COMPLETED",
                                "source": "src/components/store/store-orders-manager.tsx"
                            }
                        ]
                    },
                    "deliver": {
                        "key": "STORE_ORDER_DELIVER",
                        "label": "Xác nhận giao hàng",
                        "action": "deliver",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/store/orders/[id]",
                                "method": "PATCH",
                                "operation": "status=DELIVERED",
                                "source": "src/components/store/store-orders-manager.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "store_profile",
                "name": "Hồ sơ cửa hàng",
                "group": "QUẢN LÝ CỬA HÀNG",
                "description": "Thông tin pháp lý cửa hàng vật tư nông nghiệp, giấy phép kinh doanh thuốc BVTV",
                "menuPath": "/account",
                "actions": {
                    "view": {
                        "key": "STORE_PROFILE_VIEW",
                        "label": "Xem hồ sơ",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/account",
                                "method": "GET",
                                "source": "src/components/account/user-profile.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "STORE_PROFILE_EDIT",
                        "label": "Chỉnh sửa hồ sơ",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/account",
                                "method": "PATCH",
                                "operation": "action=profile | facility",
                                "source": "src/components/account/user-profile.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "material_shopping",
                "name": "Tra cứu vật tư",
                "group": "MUA VẬT TƯ",
                "description": "Tra cứu danh mục vật tư nông nghiệp, phân bón, thuốc BVTV và tìm kiếm cửa hàng cung ứng",
                "menuPath": "/materials",
                "actions": {
                    "view": {
                        "key": "MATERIAL_SHOPPING_VIEW",
                        "label": "Xem vật tư và cửa hàng",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/materials",
                                "method": "GET",
                                "source": "src/app/materials/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/materials/pesticides",
                                "method": "GET",
                                "source": "src/app/materials/pesticides/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/materials/fertilizers",
                                "method": "GET",
                                "source": "src/app/materials/fertilizers/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/materials/stores",
                                "method": "GET",
                                "source": "src/app/materials/stores/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/materials/products/[id]",
                                "method": "GET",
                                "source": "src/app/materials/products/[id]/page.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "shopping_cart",
                "name": "Giỏ hàng",
                "group": "MUA VẬT TƯ",
                "description": "Xem giỏ hàng, thêm sản phẩm, cập nhật số lượng và xóa khỏi giỏ",
                "menuPath": "/cart",
                "actions": {
                    "view": {
                        "key": "SHOPPING_CART_VIEW",
                        "label": "Xem giỏ hàng",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/cart",
                                "method": "GET",
                                "source": "src/app/cart/page.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "SHOPPING_CART_CREATE",
                        "label": "Thêm vào giỏ",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/cart",
                                "method": "POST",
                                "source": "src/components/store/product-purchase-actions.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "SHOPPING_CART_EDIT",
                        "label": "Cập nhật số lượng",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/cart",
                                "method": "PATCH",
                                "source": "src/app/cart/page.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "SHOPPING_CART_DELETE",
                        "label": "Xóa khỏi giỏ",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/cart",
                                "method": "DELETE",
                                "operation": "query: id=[id]",
                                "source": "src/app/cart/page.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "purchase_orders",
                "name": "Đơn mua vật tư",
                "group": "MUA VẬT TƯ",
                "description": "Theo dõi đơn mua vật tư của nông dân, tiến độ giao hàng và lịch sử đơn đặt",
                "menuPath": "/orders",
                "actions": {
                    "view": {
                        "key": "SUPPLIES_ORDER_VIEW",
                        "label": "Xem đơn",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/orders",
                                "method": "GET",
                                "source": "src/app/orders/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/orders/[id]",
                                "method": "GET",
                                "source": "src/app/orders/[id]/page.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "SUPPLIES_ORDER_CREATE",
                        "label": "Đặt hàng",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/checkout",
                                "method": "GET",
                                "source": "src/app/checkout/page.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/orders",
                                "method": "POST",
                                "source": "src/app/checkout/page.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "SUPPLIES_ORDER_DELETE",
                        "label": "Hủy đơn",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/orders/[id]",
                                "method": "PATCH",
                                "source": "src/components/orders/order-detail-actions.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "FINANCE",
        "name": "TÀI CHÍNH",
        "title": "Dòng tiền & Quản lý thu chi công nợ",
        "description": "Quản lý thu chi, công nợ và tình hình tài chính của đơn vị",
        "iconName": "CircleDollarSign",
        "features": [
            {
                "id": "finance_dashboard",
                "name": "Tổng quan tài chính",
                "description": "Tổng hợp doanh thu thu mua, chi phí vận hành, dòng tiền vào ra và lợi nhuận ròng",
                "menuPath": "/dashboard/partner/finance",
                "actions": {
                    "view": {
                        "key": "FINANCE_DASHBOARD_VIEW",
                        "label": "Xem tổng quan",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/partner/finance",
                                "method": "GET",
                                "source": "src/components/partner/partner-finance-manager.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/processing/finance",
                                "method": "GET",
                                "source": "src/components/partner/partner-finance-manager.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/store/finance",
                                "method": "GET",
                                "source": "src/components/store/store-finance-dashboard.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "expense_book",
                "name": "Chi phí & Thanh toán",
                "description": "Sổ chi tiêu: tiền mua sầu riêng, vận chuyển cont lạnh, vật tư đóng gói và chi phí nhân công",
                "menuPath": "/dashboard/partner/finance",
                "actions": {
                    "view": {
                        "key": "EXPENSE_BOOK_VIEW",
                        "label": "Xem khoản chi",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/partner/finance",
                                "method": "GET",
                                "source": "src/components/partner/partner-finance-manager.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/processing/finance",
                                "method": "GET",
                                "source": "src/components/partner/partner-finance-manager.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/store/finance",
                                "method": "GET",
                                "source": "src/components/store/store-finance-dashboard.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "EXPENSE_BOOK_CREATE",
                        "label": "Tạo khoản chi",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/partner/finance",
                                "method": "POST",
                                "source": "src/components/partner/partner-finance-manager.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/store/finance/expenses",
                                "method": "POST",
                                "source": "src/components/store/store-finance-dashboard.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "EXPENSE_BOOK_DELETE",
                        "label": "Xóa khoản chi",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/store/finance/expenses",
                                "method": "DELETE",
                                "operation": "query: id=[id]",
                                "source": "src/components/store/store-finance-dashboard.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "debt_management",
                "name": "Công nợ",
                "description": "Theo dõi công nợ nông dân, cơ sở chế biến, vựa liên kết và hạn thanh toán",
                "menuPath": "/dashboard/partner/finance",
                "actions": {
                    "view": {
                        "key": "DEBT_VIEW",
                        "label": "Xem công nợ",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/partner/finance",
                                "method": "GET",
                                "source": "src/components/partner/partner-finance-manager.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/processing/finance",
                                "method": "GET",
                                "source": "src/components/partner/partner-finance-manager.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/store/finance",
                                "method": "GET",
                                "source": "src/components/store/store-finance-dashboard.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "DEBT_EDIT",
                        "label": "Ghi nhận thanh toán",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/partner/finance/payments",
                                "method": "POST",
                                "source": "src/components/partner/partner-finance-manager.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/store/finance/orders/[id]/payment",
                                "method": "PATCH",
                                "source": "src/components/store/store-finance-dashboard.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "GROWING_REGION",
        "name": "VÙNG TRỒNG & NÔNG HỘ",
        "title": "Vùng trồng, vườn thuộc vùng & Nông hộ toàn hệ thống",
        "description": "Quản lý vùng trồng, vườn thuộc vùng và các nông hộ tham gia hệ thống",
        "iconName": "MapPin",
        "features": [
            {
                "id": "growing_region",
                "name": "Vùng trồng",
                "description": "Quản lý danh sách vùng trồng tập trung, mã số vùng trồng xuất khẩu và diện tích canh tác",
                "menuPath": "/dashboard/admin/regions",
                "actions": {
                    "view": {
                        "key": "GROWING_REGION_VIEW",
                        "label": "Xem vùng trồng",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/admin/regions",
                                "method": "GET",
                                "source": "src/components/admin/growing-regions-manager.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "GROWING_REGION_CREATE",
                        "label": "Tạo vùng trồng",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/growing-regions",
                                "method": "POST",
                                "source": "src/components/admin/growing-regions-manager.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "GROWING_REGION_EDIT",
                        "label": "Phân công Trưởng vùng",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/region-assignments",
                                "method": "POST",
                                "operation": "Thay đổi Trưởng ban",
                                "source": "src/components/admin/growing-regions-manager.tsx"
                            }
                        ]
                    },
                    "approve": {
                        "key": "GROWING_REGION_APPROVE",
                        "label": "Kích hoạt / Tạm dừng",
                        "action": "approve",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/growing-regions",
                                "method": "PATCH",
                                "operation": "status=ACTIVE | SUSPENDED",
                                "source": "src/components/admin/growing-regions-manager.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "regional_gardens",
                "name": "Vườn thuộc vùng",
                "description": "Quản lý các vườn trồng thuộc vùng, phê duyệt liên kết và giám sát nhật ký",
                "menuPath": "/region-manager/gardens",
                "actions": {
                    "view": {
                        "key": "REGIONAL_GARDEN_VIEW",
                        "label": "Xem thông tin vườn",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/region-manager/gardens",
                                "method": "GET",
                                "source": "src/components/region-manager/gardens-manager.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/region-manager/gardens/[gardenId]",
                                "method": "GET",
                                "source": "src/app/region-manager/gardens/[gardenId]/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/region-manager/gardens/[gardenId]/logs",
                                "method": "GET",
                                "source": "src/app/region-manager/gardens/[gardenId]/logs/page.tsx"
                            }
                        ]
                    },
                    "approve": {
                        "key": "REGIONAL_GARDEN_APPROVE",
                        "label": "Duyệt / Tạm ngừng vườn",
                        "action": "approve",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/region-manager/gardens/[gardenId]/status",
                                "method": "PATCH",
                                "operation": "action và reason",
                                "source": "src/components/region-manager/garden-actions.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "admin_farming",
                "name": "Nông hộ toàn hệ thống",
                "description": "Giám sát, phân bổ và quản trị toàn bộ hồ sơ nông hộ, chủ vườn trên toàn hệ thống",
                "menuPath": "/dashboard/admin/farming",
                "actions": {
                    "view": {
                        "key": "ADMIN_FARM_VIEW",
                        "label": "Xem nông hộ",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/admin/farming",
                                "method": "GET",
                                "source": "src/app/dashboard/admin/farming/page.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/admin/farming/[farmId]",
                                "method": "GET",
                                "source": "src/app/dashboard/admin/farming/page.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "USER_ACCOUNTS",
        "name": "TÀI KHOẢN",
        "title": "Tài khoản người dùng & Phê duyệt onboarding",
        "description": "Quản lý tài khoản người dùng, tài khoản trong vùng và thông tin cá nhân",
        "iconName": "UserCheck",
        "features": [
            {
                "id": "user_accounts",
                "name": "Tài khoản người dùng",
                "description": "Danh sách người dùng, kích hoạt tài khoản, cấp lại mật khẩu hoặc khóa truy cập",
                "menuPath": "/dashboard/admin/accounts",
                "actions": {
                    "view": {
                        "key": "USER_ACCOUNT_VIEW",
                        "label": "Xem tài khoản",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/admin/accounts",
                                "method": "GET",
                                "source": "src/app/dashboard/admin/accounts/page.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "USER_ACCOUNT_EDIT",
                        "label": "Chỉnh sửa tài khoản",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/accounts",
                                "method": "PATCH",
                                "operation": "action=update",
                                "source": "src/app/dashboard/admin/accounts/page.tsx"
                            }
                        ]
                    },
                    "lock": {
                        "key": "USER_ACCOUNT_LOCK",
                        "label": "Khóa / Mở khóa",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/accounts",
                                "method": "PATCH",
                                "operation": "action=lock | unlock",
                                "source": "src/app/dashboard/admin/accounts/page.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "USER_ACCOUNT_DELETE",
                        "label": "Xóa tài khoản",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/accounts",
                                "method": "DELETE",
                                "source": "src/app/dashboard/admin/accounts/page.tsx"
                            }
                        ]
                    },
                    "approve": {
                        "key": "USER_ACCOUNT_APPROVE",
                        "label": "Phê duyệt / Từ chối",
                        "action": "approve",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/accounts",
                                "method": "PATCH",
                                "operation": "action=approve | reject | supplement",
                                "source": "src/app/dashboard/admin/accounts/page.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "regional_farmers",
                "name": "Tài khoản nông dân",
                "description": "Tài khoản nông dân trong vùng",
                "menuPath": "/region-manager/farmers",
                "actions": {
                    "view": {
                        "key": "REGIONAL_FARMER_VIEW",
                        "label": "Xem tài khoản",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/region-manager/farmers",
                                "method": "GET",
                                "source": "src/components/region-manager/farmer-accounts-manager.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "REGIONAL_FARMER_CREATE",
                        "label": "Tạo tài khoản",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/region-manager/farmers",
                                "method": "POST",
                                "source": "src/components/region-manager/farmer-accounts-manager.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "REGIONAL_FARMER_EDIT",
                        "label": "Chỉnh sửa tài khoản",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/region-manager/farmers",
                                "method": "PATCH",
                                "operation": "action=update",
                                "source": "src/components/region-manager/farmer-accounts-manager.tsx"
                            }
                        ]
                    },
                    "lock": {
                        "key": "REGIONAL_FARMER_LOCK",
                        "label": "Khóa / Mở khóa",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/region-manager/farmers",
                                "method": "PATCH",
                                "operation": "action=lock | unlock",
                                "source": "src/components/region-manager/farmer-accounts-manager.tsx"
                            }
                        ]
                    },
                    "approve": {
                        "key": "REGIONAL_FARMER_APPROVE",
                        "label": "Duyệt / Từ chối / Yêu cầu bổ sung",
                        "action": "approve",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/region-manager/farmers",
                                "method": "PATCH",
                                "operation": "action=approve | reject | supplement",
                                "source": "src/components/region-manager/farmer-accounts-manager.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "REGIONAL_FARMER_DELETE",
                        "label": "Xóa tài khoản",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/region-manager/farmers",
                                "method": "DELETE",
                                "source": "src/components/region-manager/farmer-accounts-manager.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "account_security",
                "name": "Tài khoản cá nhân",
                "description": "Thông tin cá nhân & Mật khẩu",
                "menuPath": "/account",
                "actions": {
                    "view": {
                        "key": "ACCOUNT_SECURITY_VIEW",
                        "label": "Xem hồ sơ cá nhân",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/account",
                                "method": "GET",
                                "source": "src/components/account/user-profile.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "ACCOUNT_SECURITY_EDIT",
                        "label": "Cập nhật hồ sơ",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/account",
                                "method": "PATCH",
                                "operation": "action=profile",
                                "source": "src/components/account/user-profile.tsx"
                            }
                        ]
                    },
                    "password": {
                        "key": "ACCOUNT_PASSWORD_EDIT",
                        "label": "Đổi mật khẩu",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/account",
                                "method": "PATCH",
                                "operation": "action=password",
                                "source": "src/components/account/user-profile.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "ROLE_PERMISSIONS",
        "name": "PHÂN QUYỀN",
        "title": "Phân quyền vai trò & Cấu hình tài khoản",
        "description": "Quản lý Role, quyền truy cập và tài khoản được gán vào từng Role",
        "iconName": "ShieldCheck",
        "features": [
            {
                "id": "role_permissions",
                "name": "Vai trò & Quyền",
                "description": "Xem bảng quyền, tạo role mới, cập nhật quyền hạn các phân hệ và gán tài khoản",
                "menuPath": "/dashboard/admin/permissions",
                "actions": {
                    "view": {
                        "key": "ROLE_PERMISSION_VIEW",
                        "label": "Xem Role & quyền",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/admin/permissions",
                                "method": "GET",
                                "source": "src/components/admin/admin-permission-manager.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "ROLE_PERMISSION_CREATE",
                        "label": "Tạo Role",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/permissions/roles",
                                "method": "POST",
                                "source": "src/components/admin/admin-permission-manager.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "ROLE_PERMISSION_EDIT",
                        "label": "Chỉnh sửa Role",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/permissions",
                                "method": "PUT",
                                "operation": "action=update_role_info",
                                "source": "src/components/admin/admin-permission-manager.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "ROLE_PERMISSION_DELETE",
                        "label": "Xóa Role",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/permissions",
                                "method": "DELETE",
                                "operation": "query: roleKey=[roleKey]",
                                "source": "src/components/admin/admin-permission-manager.tsx"
                            }
                        ]
                    },
                    "update_perms": {
                        "key": "ROLE_PERMISSION_UPDATE",
                        "label": "Cập nhật quyền Role",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/permissions",
                                "method": "PUT",
                                "operation": "Lưu permissions",
                                "source": "src/components/admin/admin-permission-manager.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/admin/permissions/reset",
                                "method": "POST",
                                "source": "src/components/admin/admin-permission-manager.tsx"
                            }
                        ]
                    },
                    "assign": {
                        "key": "ROLE_PERMISSION_ASSIGN",
                        "label": "Gán / Gỡ tài khoản",
                        "action": "approve",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/permissions",
                                "method": "PUT",
                                "operation": "action=assign_users | remove_user",
                                "source": "src/components/admin/admin-permission-manager.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "MASTER_CATALOGS",
        "name": "DANH MỤC",
        "title": "Danh mục dùng chung & Dữ liệu nền hệ thống",
        "description": "Quản lý các danh mục dùng chung và dữ liệu nền của hệ thống",
        "iconName": "Layers",
        "features": [
            {
                "id": "master_catalogs",
                "name": "Danh mục hệ thống",
                "description": "Danh mục giống sầu riêng (Ri6, Monthong, Musang King) và các giai đoạn sinh trưởng cây trồng",
                "menuPath": "/dashboard/admin/catalog",
                "actions": {
                    "view": {
                        "key": "MASTER_CATALOG_VIEW",
                        "label": "Xem danh mục",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/admin/catalog",
                                "method": "GET",
                                "source": "src/components/admin/catalog-manager.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "MASTER_CATALOG_CREATE",
                        "label": "Thêm danh mục",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/catalog/varieties",
                                "method": "POST",
                                "source": "src/components/admin/catalog-manager.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/admin/catalog/cultivation",
                                "method": "POST",
                                "source": "src/components/admin/catalog-manager.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "MASTER_CATALOG_EDIT",
                        "label": "Chỉnh sửa danh mục",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/catalog/varieties/[id]",
                                "method": "PATCH",
                                "operation": "Cập nhật tên, thứ tự hoặc isActive",
                                "source": "src/components/admin/catalog-manager.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/admin/catalog/cultivation/[id]",
                                "method": "PATCH",
                                "operation": "Cập nhật tên, thứ tự hoặc isActive",
                                "source": "src/components/admin/catalog-manager.tsx"
                            }
                        ]
                    }
                }
            },
            {
                "id": "prohibited_pesticides",
                "name": "Thuốc BVTV & Chất cấm",
                "description": "Danh sách hoạt chất cấm, cảnh báo dư lượng và quy định kiểm dịch thực vật theo GACC và MARD",
                "menuPath": "/dashboard/admin/master-data/pesticides",
                "actions": {
                    "view": {
                        "key": "PESTICIDE_CATALOG_VIEW",
                        "label": "Xem danh mục",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/dashboard/admin/master-data/pesticides",
                                "method": "GET",
                                "source": "src/app/dashboard/admin/master-data/pesticides/page.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "PESTICIDE_CATALOG_CREATE",
                        "label": "Thêm mới",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/master-data/pesticides",
                                "method": "POST",
                                "source": "src/components/admin/master-data/pesticide-form.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "PESTICIDE_CATALOG_EDIT",
                        "label": "Chỉnh sửa",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/master-data/pesticides/[id]",
                                "method": "PATCH",
                                "source": "src/components/admin/master-data/pesticide-form.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "PESTICIDE_CATALOG_DELETE",
                        "label": "Xóa",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/master-data/pesticides/[id]",
                                "method": "DELETE",
                                "source": "src/app/dashboard/admin/master-data/pesticides/page.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "DOCUMENTS",
        "name": "TÀI LIỆU",
        "title": "Tài liệu kỹ thuật & Hướng dẫn canh tác",
        "description": "Quản lý tài liệu kỹ thuật và tài liệu hướng dẫn trong hệ thống",
        "iconName": "BookOpen",
        "features": [
            {
                "id": "documents",
                "name": "Tài liệu kỹ thuật",
                "description": "Tài liệu hướng dẫn canh tác, quy định kiểm dịch thực vật và quy trình VietGAP",
                "menuPath": "/documents",
                "actions": {
                    "view": {
                        "key": "DOCUMENT_VIEW",
                        "label": "Xem tài liệu",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/documents",
                                "method": "GET",
                                "source": "src/components/documents/documents-library.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/documents/[slug]",
                                "method": "GET",
                                "source": "src/app/documents/[slug]/page.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "DOCUMENT_CREATE",
                        "label": "Tải lên tài liệu",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/documents",
                                "method": "POST",
                                "source": "src/components/documents/documents-library.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "DOCUMENT_EDIT",
                        "label": "Chỉnh sửa tài liệu",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/documents/[id]",
                                "method": "PATCH",
                                "operation": "action=restore | publish | unpublish",
                                "source": "src/components/documents/documents-library.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "DOCUMENT_DELETE",
                        "label": "Xóa tài liệu",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/documents/[id]",
                                "method": "PATCH",
                                "operation": "action=delete",
                                "source": "src/components/documents/documents-library.tsx"
                            },
                            {
                                "kind": "api",
                                "path": "/api/admin/documents/[id]",
                                "method": "DELETE",
                                "operation": "Xóa vĩnh viễn",
                                "source": "src/components/documents/documents-library.tsx"
                            }
                        ]
                    },
                    "export": {
                        "key": "DOCUMENT_EXPORT",
                        "label": "Tải xuống",
                        "action": "export",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/documents/[slug]/download",
                                "method": "GET",
                                "source": "src/components/documents/documents-library.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    },
    {
        "id": "NEWS",
        "name": "TIN TỨC & CẢNH BÁO",
        "title": "Tin tức thị trường & Cảnh báo mùa vụ",
        "description": "Quản lý nội dung tin tức và thông báo trên hệ thống",
        "iconName": "Bell",
        "features": [
            {
                "id": "news",
                "name": "Tin tức",
                "description": "Bản tin thời tiết mùa vụ, cảnh báo dịch hại khu vực và tin giá cả sầu riêng thị trường",
                "menuPath": "/news",
                "actions": {
                    "view": {
                        "key": "NEWS_VIEW",
                        "label": "Xem tin tức",
                        "action": "view",
                        "routes": [
                            {
                                "kind": "page",
                                "path": "/news",
                                "method": "GET",
                                "source": "src/app/news/page.tsx"
                            },
                            {
                                "kind": "page",
                                "path": "/dashboard/admin/news",
                                "method": "GET",
                                "source": "src/components/admin/news-manager.tsx"
                            }
                        ]
                    },
                    "create": {
                        "key": "NEWS_CREATE",
                        "label": "Tạo tin",
                        "action": "create",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/news",
                                "method": "POST",
                                "source": "src/components/admin/news-manager.tsx"
                            }
                        ]
                    },
                    "edit": {
                        "key": "NEWS_EDIT",
                        "label": "Chỉnh sửa tin",
                        "action": "edit",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/news/[id]",
                                "method": "PATCH",
                                "source": "src/components/admin/news-manager.tsx"
                            }
                        ]
                    },
                    "delete": {
                        "key": "NEWS_DELETE",
                        "label": "Xóa tin",
                        "action": "delete",
                        "routes": [
                            {
                                "kind": "api",
                                "path": "/api/admin/news/[id]",
                                "method": "DELETE",
                                "source": "src/components/admin/news-manager.tsx"
                            }
                        ]
                    }
                }
            }
        ]
    }
];

// Chỉ trả về các mã quyền đang có trong danh mục giao diện.
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

/** Loại mã quyền đã nghỉ dùng khi đọc cấu hình cũ, không tự cấp quyền mới. */
export function normalizeCatalogPermissions(permissions: string[]): string[] {
    const valid = new Set(getAllSystemPermissionKeys());
    return [...new Set(permissions)].filter((key) => valid.has(key));
}

// Quyền mặc định chuẩn hóa cho từng vai trò người dùng trong hệ thống TriViet
export const DEFAULT_ROLE_PERMISSIONS: Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[] }> = {
    "ADMIN": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": true,
            "HARVEST": true,
            "PROCUREMENT": true,
            "RAW_MATERIAL_INTAKE": true,
            "PROCESSING": true,
            "SHIPMENT_TRACEABILITY": true,
            "INVENTORY": true,
            "STORE_MARKETPLACE": true,
            "FINANCE": true,
            "GROWING_REGION": true,
            "USER_ACCOUNTS": true,
            "ROLE_PERMISSIONS": true,
            "MASTER_CATALOGS": true,
            "DOCUMENTS": true,
            "NEWS": true
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "FARM_PROFILE_VIEW",
            "FARMING_LOG_VIEW",
            "FARMING_LOG_CREATE",
            "WEATHER_LOG_VIEW",
            "WEATHER_LOG_CREATE",
            "WEATHER_LOG_EDIT",
            "WEATHER_LOG_DELETE",
            "FARMING_PLAN_VIEW",
            "FARMING_PLAN_CREATE",
            "FARMING_PLAN_EDIT",
            "FARMING_PLAN_DELETE",
            "PEST_MONITORING_VIEW",
            "PEST_MONITORING_CREATE",
            "PEST_MONITORING_EDIT",
            "PEST_MONITORING_EXPORT",
            "FARMER_PESTICIDE_STATISTICS_VIEW",
            "FARMER_FERTILIZER_STATISTICS_VIEW",
            "FARMER_EXPENSE_STATISTICS_VIEW",
            "FARMER_EXPENSE_STATISTICS_CREATE",
            "HARVEST_REQUEST_VIEW",
            "HARVEST_REQUEST_CREATE",
            "HARVEST_REQUEST_EDIT",
            "HARVEST_DELIVERY_VIEW",
            "HARVEST_DELIVERY_EDIT",
            "PROCUREMENT_INBOX_VIEW",
            "PROCUREMENT_INBOX_APPROVE",
            "PROCUREMENT_ORDER_VIEW",
            "COLLECTION_LOT_VIEW",
            "RAW_MATERIAL_VIEW",
            "RAW_MATERIAL_CREATE",
            "RAW_MATERIAL_RECEIVE",
            "RAW_MATERIAL_CLASSIFY",
            "PROCESSING_BATCH_VIEW",
            "PROCESSING_BATCH_CREATE",
            "FINISHED_LOT_VIEW",
            "FINISHED_LOT_CREATE",
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "SHIPMENT_EXPORT",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_CREATE",
            "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW",
            "CHINA_PORT_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW",
            "COMMERCIAL_DISPATCH_CREATE",
            "COMMERCIAL_DISPATCH_EDIT",
            "COMMERCIAL_DISPATCH_EXPORT",
            "WAREHOUSE_MOVE_VIEW",
            "WAREHOUSE_MOVE_CREATE",
            "WAREHOUSE_MOVE_EXPORT",
            "STORE_PRODUCT_VIEW",
            "STORE_PRODUCT_CREATE",
            "STORE_PRODUCT_EDIT",
            "STORE_PRODUCT_DELETE",
            "STORE_ORDER_VIEW",
            "STORE_ORDER_APPROVE",
            "STORE_ORDER_EDIT",
            "STORE_ORDER_DELIVER",
            "STORE_PROFILE_VIEW",
            "STORE_PROFILE_EDIT",
            "MATERIAL_SHOPPING_VIEW",
            "SHOPPING_CART_VIEW",
            "SHOPPING_CART_CREATE",
            "SHOPPING_CART_EDIT",
            "SHOPPING_CART_DELETE",
            "SUPPLIES_ORDER_VIEW",
            "SUPPLIES_ORDER_CREATE",
            "SUPPLIES_ORDER_DELETE",
            "FINANCE_DASHBOARD_VIEW",
            "EXPENSE_BOOK_VIEW",
            "EXPENSE_BOOK_CREATE",
            "EXPENSE_BOOK_DELETE",
            "DEBT_VIEW",
            "DEBT_EDIT",
            "GROWING_REGION_VIEW",
            "GROWING_REGION_CREATE",
            "GROWING_REGION_EDIT",
            "GROWING_REGION_APPROVE",
            "REGIONAL_GARDEN_VIEW",
            "REGIONAL_GARDEN_APPROVE",
            "ADMIN_FARM_VIEW",
            "USER_ACCOUNT_VIEW",
            "USER_ACCOUNT_EDIT",
            "USER_ACCOUNT_LOCK",
            "USER_ACCOUNT_DELETE",
            "USER_ACCOUNT_APPROVE",
            "REGIONAL_FARMER_VIEW",
            "REGIONAL_FARMER_CREATE",
            "REGIONAL_FARMER_EDIT",
            "REGIONAL_FARMER_LOCK",
            "REGIONAL_FARMER_APPROVE",
            "REGIONAL_FARMER_DELETE",
            "ACCOUNT_SECURITY_VIEW",
            "ACCOUNT_SECURITY_EDIT",
            "ACCOUNT_PASSWORD_EDIT",
            "ROLE_PERMISSION_VIEW",
            "ROLE_PERMISSION_CREATE",
            "ROLE_PERMISSION_EDIT",
            "ROLE_PERMISSION_DELETE",
            "ROLE_PERMISSION_UPDATE",
            "ROLE_PERMISSION_ASSIGN",
            "MASTER_CATALOG_VIEW",
            "MASTER_CATALOG_CREATE",
            "MASTER_CATALOG_EDIT",
            "PESTICIDE_CATALOG_VIEW",
            "PESTICIDE_CATALOG_CREATE",
            "PESTICIDE_CATALOG_EDIT",
            "PESTICIDE_CATALOG_DELETE",
            "DOCUMENT_VIEW",
            "DOCUMENT_CREATE",
            "DOCUMENT_EDIT",
            "DOCUMENT_DELETE",
            "DOCUMENT_EXPORT",
            "NEWS_VIEW",
            "NEWS_CREATE",
            "NEWS_EDIT",
            "NEWS_DELETE"
        ]
    },
    "PROCESSING_STAFF": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": false,
            "HARVEST": false,
            "PROCUREMENT": false,
            "RAW_MATERIAL_INTAKE": true,
            "PROCESSING": true,
            "SHIPMENT_TRACEABILITY": true,
            "INVENTORY": false,
            "STORE_MARKETPLACE": false,
            "FINANCE": false,
            "GROWING_REGION": false,
            "USER_ACCOUNTS": false,
            "ROLE_PERMISSIONS": false,
            "MASTER_CATALOGS": false,
            "DOCUMENTS": false,
            "NEWS": false
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "RAW_MATERIAL_VIEW",
            "RAW_MATERIAL_CREATE",
            "RAW_MATERIAL_RECEIVE",
            "RAW_MATERIAL_CLASSIFY",
            "PROCESSING_BATCH_VIEW",
            "PROCESSING_BATCH_CREATE",
            "FINISHED_LOT_VIEW",
            "FINISHED_LOT_CREATE",
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_CREATE"
        ]
    },
    "INTAKE_STAFF": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": false,
            "HARVEST": false,
            "PROCUREMENT": false,
            "RAW_MATERIAL_INTAKE": true,
            "PROCESSING": false,
            "SHIPMENT_TRACEABILITY": true,
            "INVENTORY": false,
            "STORE_MARKETPLACE": false,
            "FINANCE": false,
            "GROWING_REGION": false,
            "USER_ACCOUNTS": false,
            "ROLE_PERMISSIONS": false,
            "MASTER_CATALOGS": false,
            "DOCUMENTS": false,
            "NEWS": false
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "RAW_MATERIAL_VIEW",
            "RAW_MATERIAL_CREATE",
            "RAW_MATERIAL_RECEIVE",
            "RAW_MATERIAL_CLASSIFY",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_CREATE"
        ]
    },
    "DISPATCH_STAFF": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": false,
            "HARVEST": false,
            "PROCUREMENT": false,
            "RAW_MATERIAL_INTAKE": false,
            "PROCESSING": true,
            "SHIPMENT_TRACEABILITY": true,
            "INVENTORY": true,
            "STORE_MARKETPLACE": false,
            "FINANCE": false,
            "GROWING_REGION": false,
            "USER_ACCOUNTS": false,
            "ROLE_PERMISSIONS": false,
            "MASTER_CATALOGS": false,
            "DOCUMENTS": false,
            "NEWS": false
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "FINISHED_LOT_VIEW",
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "SHIPMENT_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW",
            "COMMERCIAL_DISPATCH_CREATE",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_EXPORT",
            "WAREHOUSE_MOVE_VIEW",
            "WAREHOUSE_MOVE_CREATE"
        ]
    },
    "FARMER": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": true,
            "HARVEST": true,
            "PROCUREMENT": false,
            "RAW_MATERIAL_INTAKE": false,
            "PROCESSING": false,
            "SHIPMENT_TRACEABILITY": true,
            "INVENTORY": false,
            "STORE_MARKETPLACE": true,
            "FINANCE": true,
            "GROWING_REGION": false,
            "USER_ACCOUNTS": true,
            "ROLE_PERMISSIONS": false,
            "MASTER_CATALOGS": false,
            "DOCUMENTS": true,
            "NEWS": true
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "FARM_PROFILE_VIEW",
            "FARMING_LOG_VIEW",
            "FARMING_LOG_CREATE",
            "FARMING_PLAN_VIEW",
            "FARMING_PLAN_CREATE",
            "FARMING_PLAN_EDIT",
            "FARMING_PLAN_DELETE",
            "PEST_MONITORING_VIEW",
            "PEST_MONITORING_CREATE",
            "PEST_MONITORING_EDIT",
            "PEST_MONITORING_EXPORT",
            "WEATHER_LOG_VIEW",
            "WEATHER_LOG_CREATE",
            "WEATHER_LOG_EDIT",
            "WEATHER_LOG_DELETE",
            "FARMER_PESTICIDE_STATISTICS_VIEW",
            "FARMER_FERTILIZER_STATISTICS_VIEW",
            "FARMER_EXPENSE_STATISTICS_VIEW",
            "FARMER_EXPENSE_STATISTICS_CREATE",
            "HARVEST_REQUEST_VIEW",
            "HARVEST_REQUEST_CREATE",
            "HARVEST_REQUEST_EDIT",
            "HARVEST_DELIVERY_VIEW",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_CREATE",
            "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW",
            "CHINA_PORT_EXPORT",
            "FINANCE_DASHBOARD_VIEW",
            "EXPENSE_BOOK_VIEW",
            "EXPENSE_BOOK_CREATE",
            "EXPENSE_BOOK_DELETE",
            "DEBT_VIEW",
            "ACCOUNT_SECURITY_VIEW",
            "ACCOUNT_SECURITY_EDIT",
            "ACCOUNT_PASSWORD_EDIT",
            "MATERIAL_SHOPPING_VIEW",
            "SHOPPING_CART_VIEW",
            "SHOPPING_CART_CREATE",
            "SHOPPING_CART_EDIT",
            "SHOPPING_CART_DELETE",
            "SUPPLIES_ORDER_VIEW",
            "SUPPLIES_ORDER_CREATE",
            "SUPPLIES_ORDER_DELETE",
            "DOCUMENT_VIEW",
            "DOCUMENT_EXPORT",
            "NEWS_VIEW"
        ]
    },
    "AREA_MANAGER": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": true,
            "HARVEST": true,
            "PROCUREMENT": false,
            "RAW_MATERIAL_INTAKE": false,
            "PROCESSING": false,
            "SHIPMENT_TRACEABILITY": true,
            "INVENTORY": false,
            "STORE_MARKETPLACE": false,
            "FINANCE": false,
            "GROWING_REGION": true,
            "USER_ACCOUNTS": true,
            "ROLE_PERMISSIONS": false,
            "MASTER_CATALOGS": true,
            "DOCUMENTS": true,
            "NEWS": true
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "FARM_PROFILE_VIEW",
            "FARMING_LOG_VIEW",
            "FARMING_PLAN_VIEW",
            "PEST_MONITORING_VIEW",
            "PEST_MONITORING_EXPORT",
            "HARVEST_REQUEST_VIEW",
            "HARVEST_DELIVERY_VIEW",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW",
            "CHINA_PORT_EXPORT",
            "GROWING_REGION_VIEW",
            "GROWING_REGION_EDIT",
            "GROWING_REGION_APPROVE",
            "REGIONAL_GARDEN_VIEW",
            "REGIONAL_GARDEN_APPROVE",
            "ADMIN_FARM_VIEW",
            "USER_ACCOUNT_VIEW",
            "USER_ACCOUNT_APPROVE",
            "REGIONAL_FARMER_VIEW",
            "REGIONAL_FARMER_CREATE",
            "REGIONAL_FARMER_EDIT",
            "REGIONAL_FARMER_LOCK",
            "REGIONAL_FARMER_APPROVE",
            "REGIONAL_FARMER_DELETE",
            "ACCOUNT_SECURITY_VIEW",
            "ACCOUNT_SECURITY_EDIT",
            "ACCOUNT_PASSWORD_EDIT",
            "MASTER_CATALOG_VIEW",
            "DOCUMENT_VIEW",
            "DOCUMENT_EXPORT",
            "NEWS_VIEW"
        ]
    },
    "COLLECTOR": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": false,
            "HARVEST": true,
            "PROCUREMENT": true,
            "RAW_MATERIAL_INTAKE": false,
            "PROCESSING": false,
            "SHIPMENT_TRACEABILITY": true,
            "INVENTORY": true,
            "STORE_MARKETPLACE": false,
            "FINANCE": true,
            "GROWING_REGION": false,
            "USER_ACCOUNTS": true,
            "ROLE_PERMISSIONS": false,
            "MASTER_CATALOGS": false,
            "DOCUMENTS": true,
            "NEWS": true
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "HARVEST_REQUEST_VIEW",
            "HARVEST_DELIVERY_VIEW",
            "HARVEST_DELIVERY_EDIT",
            "PROCUREMENT_INBOX_VIEW",
            "PROCUREMENT_INBOX_APPROVE",
            "PROCUREMENT_ORDER_VIEW",
            "COLLECTION_LOT_VIEW",
            "WAREHOUSE_MOVE_VIEW",
            "WAREHOUSE_MOVE_CREATE",
            "WAREHOUSE_MOVE_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW",
            "COMMERCIAL_DISPATCH_CREATE",
            "COMMERCIAL_DISPATCH_EDIT",
            "COMMERCIAL_DISPATCH_EXPORT",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_CREATE",
            "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW",
            "CHINA_PORT_EXPORT",
            "FINANCE_DASHBOARD_VIEW",
            "EXPENSE_BOOK_VIEW",
            "EXPENSE_BOOK_CREATE",
            "EXPENSE_BOOK_DELETE",
            "DEBT_VIEW",
            "DEBT_EDIT",
            "ACCOUNT_SECURITY_VIEW",
            "ACCOUNT_SECURITY_EDIT",
            "ACCOUNT_PASSWORD_EDIT",
            "DOCUMENT_VIEW",
            "DOCUMENT_EXPORT",
            "NEWS_VIEW"
        ]
    },
    "PROCESSING_FACILITY": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": false,
            "HARVEST": false,
            "PROCUREMENT": true,
            "RAW_MATERIAL_INTAKE": true,
            "PROCESSING": true,
            "SHIPMENT_TRACEABILITY": true,
            "INVENTORY": true,
            "STORE_MARKETPLACE": false,
            "FINANCE": true,
            "GROWING_REGION": false,
            "USER_ACCOUNTS": true,
            "ROLE_PERMISSIONS": false,
            "MASTER_CATALOGS": false,
            "DOCUMENTS": true,
            "NEWS": true
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "PROCUREMENT_ORDER_VIEW",
            "COLLECTION_LOT_VIEW",
            "RAW_MATERIAL_VIEW",
            "RAW_MATERIAL_CREATE",
            "RAW_MATERIAL_RECEIVE",
            "RAW_MATERIAL_CLASSIFY",
            "PROCESSING_BATCH_VIEW",
            "PROCESSING_BATCH_CREATE",
            "FINISHED_LOT_VIEW",
            "FINISHED_LOT_CREATE",
            "SHIPMENT_VIEW",
            "SHIPMENT_CREATE",
            "SHIPMENT_EXPORT",
            "WAREHOUSE_MOVE_VIEW",
            "WAREHOUSE_MOVE_CREATE",
            "WAREHOUSE_MOVE_EXPORT",
            "COMMERCIAL_DISPATCH_VIEW",
            "COMMERCIAL_DISPATCH_CREATE",
            "COMMERCIAL_DISPATCH_EDIT",
            "COMMERCIAL_DISPATCH_EXPORT",
            "QR_MANAGE_VIEW",
            "QR_MANAGE_CREATE",
            "QR_MANAGE_EXPORT",
            "CHINA_PORT_VIEW",
            "CHINA_PORT_EXPORT",
            "FINANCE_DASHBOARD_VIEW",
            "EXPENSE_BOOK_VIEW",
            "EXPENSE_BOOK_CREATE",
            "EXPENSE_BOOK_DELETE",
            "DEBT_VIEW",
            "DEBT_EDIT",
            "ACCOUNT_SECURITY_VIEW",
            "ACCOUNT_SECURITY_EDIT",
            "ACCOUNT_PASSWORD_EDIT",
            "DOCUMENT_VIEW",
            "DOCUMENT_EXPORT",
            "NEWS_VIEW"
        ]
    },
    "STORE_OWNER": {
        "moduleEnabled": {
            "DASHBOARD": true,
            "CULTIVATION": false,
            "HARVEST": false,
            "PROCUREMENT": false,
            "RAW_MATERIAL_INTAKE": false,
            "PROCESSING": false,
            "SHIPMENT_TRACEABILITY": false,
            "INVENTORY": true,
            "STORE_MARKETPLACE": true,
            "FINANCE": true,
            "GROWING_REGION": false,
            "USER_ACCOUNTS": true,
            "ROLE_PERMISSIONS": false,
            "MASTER_CATALOGS": false,
            "DOCUMENTS": true,
            "NEWS": true
        },
        "permissions": [
            "DASHBOARD_VIEW",
            "STORE_PRODUCT_VIEW",
            "STORE_PRODUCT_CREATE",
            "STORE_PRODUCT_EDIT",
            "STORE_PRODUCT_DELETE",
            "STORE_ORDER_VIEW",
            "STORE_ORDER_APPROVE",
            "STORE_ORDER_EDIT",
            "STORE_ORDER_DELIVER",
            "STORE_PROFILE_VIEW",
            "STORE_PROFILE_EDIT",
            "WAREHOUSE_MOVE_VIEW",
            "WAREHOUSE_MOVE_CREATE",
            "WAREHOUSE_MOVE_EXPORT",
            "FINANCE_DASHBOARD_VIEW",
            "EXPENSE_BOOK_VIEW",
            "EXPENSE_BOOK_CREATE",
            "EXPENSE_BOOK_DELETE",
            "DEBT_VIEW",
            "DEBT_EDIT",
            "ACCOUNT_SECURITY_VIEW",
            "ACCOUNT_SECURITY_EDIT",
            "ACCOUNT_PASSWORD_EDIT",
            "DOCUMENT_VIEW",
            "DOCUMENT_EXPORT",
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
        perModuleStats: Record<string, { granted: number; total: number; isEnabled?: boolean }>;
    };
    updatedAt?: string;
    updatedByName?: string;
}
