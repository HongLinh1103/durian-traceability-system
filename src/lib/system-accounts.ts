import type { UserRole } from "@prisma/client";

export type SystemAccount = {
    id: string;
    phone: string;
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    isApproved: boolean;
    facilityName?: string;
    facilityType?: "COLLECTOR" | "PROCESSING_FACILITY" | "STORE" | "NURSERY";
    address?: string;
    province?: string;
};

export const SYSTEM_ACCOUNTS: SystemAccount[] = [
    // =========================================================================
    // 1. QUẢN TRỊ & NÔNG HỘ & CỬA HÀNG
    // =========================================================================
    {
        id: "user-admin-01",
        phone: "0909000000",
        email: "admin@triviet.vn",
        password: "Admin@123",
        fullName: "Quản trị viên TriViet",
        role: "ADMIN",
        isApproved: true,
    },
    {
        id: "user-manager-01",
        phone: "0909000001",
        email: "manager@triviet.vn",
        password: "Manager@123",
        fullName: "Trần Quản Lý Vùng",
        role: "AREA_MANAGER",
        isApproved: true,
        province: "Đồng Nai",
    },
    {
        id: "user-farmer-01",
        phone: "0909000004",
        email: "farmer@triviet.vn",
        password: "NongDan@123",
        fullName: "Nguyễn Văn Nông Dân",
        role: "FARMER",
        isApproved: true,
        province: "Đồng Nai",
    },
    {
        id: "user-store-01",
        phone: "0909000005",
        email: "store@triviet.vn",
        password: "CuaHang@123",
        fullName: "Lê Văn Cửa Hàng",
        role: "STORE_OWNER",
        isApproved: true,
        facilityName: "Cửa hàng Vật tư Nông nghiệp TriViet",
        province: "Đồng Nai",
    },

    // =========================================================================
    // 2. 3 VỰA THU MUA (COLLECTOR)
    // =========================================================================
    {
        id: "user-collector-01",
        phone: "0909111001",
        email: "hoanglong.collector@triviet.vn",
        password: "ThuMua@123",
        fullName: "Hoàng Văn Long",
        role: "COLLECTOR",
        isApproved: true,
        facilityName: "Vựa Sầu riêng Hoàng Long",
        facilityType: "COLLECTOR",
        address: "Ấp 3, Xã Phú Riềng, Huyện Phú Riềng, Tỉnh Bình Phước",
        province: "Bình Phước",
    },
    {
        id: "user-collector-02",
        phone: "0909111002",
        email: "taynguyen.collector@triviet.vn",
        password: "ThuMua@123",
        fullName: "Đặng Quốc Thái",
        role: "COLLECTOR",
        isApproved: true,
        facilityName: "Vựa Thu Mua Nông Sản Tây Nguyên",
        facilityType: "COLLECTOR",
        address: "Km 19, Quốc Lộ 26, Xã Ea Knuếc, Huyện Krông Pắc, Tỉnh Đắk Lắk",
        province: "Đắk Lắk",
    },
    {
        id: "user-collector-03",
        phone: "0909111003",
        email: "mekong.collector@triviet.vn",
        password: "ThuMua@123",
        fullName: "Lê Thị Mai",
        role: "COLLECTOR",
        isApproved: true,
        facilityName: "Vựa Sầu riêng Mekong Fruit",
        facilityType: "COLLECTOR",
        address: "Ấp 4, Xã Ngũ Hiệp, Huyện Cai Lậy, Tỉnh Tiền Giang",
        province: "Tiền Giang",
    },

    // =========================================================================
    // 3. 3 CƠ SỞ CHẾ BIẾN - ĐÓNG GÓI (PROCESSING_FACILITY)
    // =========================================================================
    {
        id: "user-processing-01",
        phone: "0909222001",
        email: "dongphu.factory@triviet.vn",
        password: "CheBien@123",
        fullName: "Phạm Thanh Hải",
        role: "PROCESSING_FACILITY",
        isApproved: true,
        facilityName: "Nhà máy Chế biến & Đóng gói Sầu riêng Đồng Phú",
        facilityType: "PROCESSING_FACILITY",
        address: "KCN Nam Đồng Phú, Xã Tân Lập, Huyện Đồng Phú, Tỉnh Bình Phước",
        province: "Bình Phước",
    },
    {
        id: "user-processing-02",
        phone: "0909222002",
        email: "krongpac.factory@triviet.vn",
        password: "CheBien@123",
        fullName: "Vũ Đức Trọng",
        role: "PROCESSING_FACILITY",
        isApproved: true,
        facilityName: "Trung tâm Chế biến Nông sản Xuất khẩu Krông Pắc",
        facilityType: "PROCESSING_FACILITY",
        address: "Cụm Công nghiệp Tân An, Xã Ea Đar, Huyện Ea Kar, Tỉnh Đắk Lắk",
        province: "Đắk Lắk",
    },
    {
        id: "user-processing-03",
        phone: "0909222003",
        email: "mientay.factory@triviet.vn",
        password: "CheBien@123",
        fullName: "Võ Hoàng Nam",
        role: "PROCESSING_FACILITY",
        isApproved: true,
        facilityName: "Nhà máy Đóng gói Trái cây Miền Tây Nam Bộ",
        facilityType: "PROCESSING_FACILITY",
        address: "QL1A, Xã Long Định, Huyện Châu Thành, Tỉnh Tiền Giang",
        province: "Tiền Giang",
    },

    // =========================================================================
    // 4. 2 TRẠI GIỐNG (NURSERY - STORE_OWNER)
    // =========================================================================
    {
        id: "user-nursery-01",
        phone: "0909333001",
        email: "minhphat.seedling@triviet.vn",
        password: "TraiGiong@123",
        fullName: "Hoàng Minh Phát",
        role: "STORE_OWNER",
        isApproved: true,
        facilityName: "Trại giống sầu riêng Minh Phát",
        facilityType: "NURSERY",
        address: "45 Đường CMT8, Phường Xuân Bình, TP. Long Khánh, Tỉnh Đồng Nai",
        province: "Đồng Nai",
    },
    {
        id: "user-nursery-02",
        phone: "0909333002",
        email: "tanphu.seedling@triviet.vn",
        password: "TraiGiong@123",
        fullName: "Nguyễn Văn Tân",
        role: "STORE_OWNER",
        isApproved: true,
        facilityName: "Trại cây giống Tân Phú Bến Tre",
        facilityType: "NURSERY",
        address: "Quốc lộ 57, Xã Phú Sơn, Huyện Chợ Lách, Tỉnh Bến Tre",
        province: "Bến Tre",
    },
];

export function findSystemAccount(identifier: string): SystemAccount | undefined {
    const clean = identifier.trim().toLowerCase();
    return SYSTEM_ACCOUNTS.find(
        (acc) => acc.phone === clean || acc.email.toLowerCase() === clean
    );
}
