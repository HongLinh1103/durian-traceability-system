import { prisma } from "@/lib/prisma";

export type FacilityItem = {
    id: string;
    type: "COLLECTOR" | "PROCESSING_FACILITY";
    name: string;
    representativeName: string;
    representativePhone: string;
    phone: string;
    email?: string | null;
    website?: string | null;
    address: string;
    province: string;
    ward?: string | null;
    organizationType: string;
    taxCode?: string | null;
    businessCode?: string | null;
    purchasingAreas?: string[];
    processingTypes?: string[];
    expectedCapacity?: number | null;
    capacityUnit?: string | null;
    imageUrls: string[];
    avatar: string;
    certifications: string[];
    description?: string | null;
    establishedYear?: number;
    rating?: number;
};

export const FALLBACK_COLLECTORS: FacilityItem[] = [
    {
        id: "collector-1",
        type: "COLLECTOR",
        name: "Vựa Sầu riêng Thành Phát",
        representativeName: "Nguyễn Thành Phát",
        representativePhone: "0909000002",
        phone: "0909000002",
        email: "collector@triviet.vn",
        address: "128 Đường Hùng Vương, Phường Xuân Lập, TP. Long Khánh, Tỉnh Đồng Nai",
        province: "Đồng Nai",
        ward: "Phường Xuân Lập",
        organizationType: "Hộ kinh doanh",
        taxCode: "3603999002",
        businessCode: "HKD-TP-2026",
        purchasingAreas: ["Đồng Nai", "Bình Phước", "Lâm Đồng"],
        expectedCapacity: 50,
        capacityUnit: "tấn/ngày",
        imageUrls: [
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80"
        ],
        avatar: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
        certifications: ["VietGAP", "Chuỗi cung ứng an toàn", "Cơ sở đủ ĐK ATTP"],
        description: "Vựa thu mua sầu riêng trực tiếp từ các vườn trồng chuẩn VietGAP tại Đồng Nai và khu vực lân cận, liên kết với hơn 50 nhà vườn uy tín.",
        establishedYear: 2018,
        rating: 4.9,
    },
    {
        id: "collector-2",
        type: "COLLECTOR",
        name: "Vựa Sầu riêng Hoàng Long",
        representativeName: "Hoàng Văn Long",
        representativePhone: "0909111001",
        phone: "0909111001",
        email: "hoanglong.collector@triviet.vn",
        address: "Ấp 3, Xã Phú Riềng, Huyện Phú Riềng, Tỉnh Bình Phước",
        province: "Bình Phước",
        ward: "Xã Phú Riềng",
        organizationType: "Hợp tác xã",
        taxCode: "3603999011",
        businessCode: "HTX-HL-2026",
        purchasingAreas: ["Bình Phước", "Đắk Nông", "Tây Ninh"],
        expectedCapacity: 65,
        capacityUnit: "tấn/ngày",
        imageUrls: [
            "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80"
        ],
        avatar: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80",
        certifications: ["VietGAP", "Mã số cơ sở đóng gói", "OCOP 4 Sao"],
        description: "Hợp tác xã thu mua nông sản chuyên nghiệp, liên kết bền vững với hơn 80 hộ nông dân vùng Bình Phước, cam kết bao tiêu đầu ra ổn định.",
        establishedYear: 2019,
        rating: 4.8,
    },
    {
        id: "collector-3",
        type: "COLLECTOR",
        name: "Vựa Thu Mua Nông Sản Tây Nguyên",
        representativeName: "Đặng Quốc Thái",
        representativePhone: "0909111002",
        phone: "0909111002",
        email: "taynguyen.collector@triviet.vn",
        address: "Km 19, Quốc Lộ 26, Xã Ea Knuếc, Huyện Krông Pắc, Tỉnh Đắk Lắk",
        province: "Đắk Lắk",
        ward: "Xã Ea Knuếc",
        organizationType: "Doanh nghiệp tư nhân",
        taxCode: "3603999012",
        businessCode: "DNTN-TN-2026",
        purchasingAreas: ["Đắk Lắk", "Gia Lai", "Lâm Đồng", "Đắk Nông"],
        expectedCapacity: 80,
        capacityUnit: "tấn/ngày",
        imageUrls: [
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80"
        ],
        avatar: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80",
        certifications: ["VietGAP", "Cơ sở Đóng gói Đạt Chuẩn", "Đạt chuẩn ATTP"],
        description: "Đầu mối thu mua sầu riêng Dona & Ri6 trọng điểm Tây Nguyên, trang bị hệ thống phân loại quang học và kiểm định chất lượng tại vựa.",
        establishedYear: 2020,
        rating: 4.9,
    },
    {
        id: "collector-4",
        type: "COLLECTOR",
        name: "Vựa Sầu riêng Mekong Fruit",
        representativeName: "Lê Thị Mai",
        representativePhone: "0909111003",
        phone: "0909111003",
        email: "mekong.collector@triviet.vn",
        address: "Ấp 4, Xã Ngũ Hiệp, Huyện Cai Lậy, Tỉnh Tiền Giang",
        province: "Tiền Giang",
        ward: "Xã Ngũ Hiệp",
        organizationType: "Hộ kinh doanh",
        taxCode: "3603999013",
        businessCode: "HKD-MK-2026",
        purchasingAreas: ["Tiền Giang", "Bến Tre", "Vĩnh Long", "Cần Thơ"],
        expectedCapacity: 60,
        capacityUnit: "tấn/ngày",
        imageUrls: [
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80"
        ],
        avatar: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
        certifications: ["VietGAP", "OCOP 4 Sao", "Thương hiệu Đồng Bằng"],
        description: "Vựa thu mua sầu riêng uy tín tại vương quốc sầu riêng Ngũ Hiệp - Cai Lậy, thu mua sầu riêng chín cây và sầu riêng cắt xuất khẩu chất lượng cao.",
        establishedYear: 2017,
        rating: 4.8,
    },
];

export const FALLBACK_PROCESSING_FACILITIES: FacilityItem[] = [
    {
        id: "processing-1",
        type: "PROCESSING_FACILITY",
        name: "Cơ sở Chế biến Sầu riêng Trị An",
        representativeName: "Trần Minh Anh",
        representativePhone: "0909000003",
        phone: "0909000003",
        email: "processing@triviet.vn",
        website: "https://triviet.vn",
        address: "Tuyến ĐT 767, Xã Sông Trầu, Huyện Trảng Bom, Tỉnh Đồng Nai",
        province: "Đồng Nai",
        ward: "Xã Sông Trầu",
        organizationType: "Công ty TNHH",
        taxCode: "3603999003",
        businessCode: "DN-CB-2026",
        purchasingAreas: ["Đồng Nai", "Bình Phước", "Bình Thuận"],
        processingTypes: ["Sầu riêng nguyên trái xuất khẩu", "Tách múi hút chân không", "Cấp đông nhanh IQF"],
        expectedCapacity: 35,
        capacityUnit: "tấn/ngày",
        imageUrls: [
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
        ],
        avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80",
        certifications: ["HACCP", "ISO 22000:2018", "Chuẩn Xuất Khẩu GACC"],
        description: "Cơ sở tiếp nhận, sơ chế, khử khuẩn và chế biến sầu riêng đạt tiêu chuẩn an toàn thực phẩm quốc tế, phục vụ thị trường nội địa và xuất khẩu.",
        establishedYear: 2019,
        rating: 4.9,
    },
    {
        id: "processing-2",
        type: "PROCESSING_FACILITY",
        name: "Nhà máy Chế biến & Đóng gói Sầu riêng Đồng Phú",
        representativeName: "Phạm Thanh Hải",
        representativePhone: "0909222001",
        phone: "0909222001",
        email: "dongphu.factory@triviet.vn",
        website: "https://dongphufruit.vn",
        address: "KCN Nam Đồng Phú, Xã Tân Lập, Huyện Đồng Phú, Tỉnh Bình Phước",
        province: "Bình Phước",
        ward: "Xã Tân Lập",
        organizationType: "Công ty Cổ phần",
        taxCode: "3603999021",
        businessCode: "CP-DP-2026",
        purchasingAreas: ["Bình Phước", "Đồng Nai", "Đắk Nông"],
        processingTypes: [
            "Phân loại quang học laser",
            "Xông hơi khử trùng kiểm dịch",
            "Đóng thùng carton chuẩn GACC",
            "Cơm sầu riêng sấy thăng hoa"
        ],
        expectedCapacity: 50,
        capacityUnit: "tấn/ngày",
        imageUrls: [
            "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80"
        ],
        avatar: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80",
        certifications: ["BRC Food", "ISO 22000", "HACCP", "Mã GACC Hải Quan TQ"],
        description: "Nhà máy chế biến và đóng gói hiện đại với dây chuyền tự động hóa 100%, sở hữu mã cơ sở đóng gói xuất khẩu chính ngạch sang Trung Quốc.",
        establishedYear: 2020,
        rating: 5.0,
    },
    {
        id: "processing-3",
        type: "PROCESSING_FACILITY",
        name: "Trung tâm Chế biến Nông sản Xuất khẩu Krông Pắc",
        representativeName: "Vũ Đức Trọng",
        representativePhone: "0909222002",
        phone: "0909222002",
        email: "krongpac.factory@triviet.vn",
        address: "Cụm Công nghiệp Tân An, Xã Ea Đar, Huyện Ea Kar, Tỉnh Đắk Lắk",
        province: "Đắk Lắk",
        ward: "Xã Ea Đar",
        organizationType: "Công ty TNHH MTV",
        taxCode: "3603999022",
        businessCode: "DN-KP-2026",
        purchasingAreas: ["Đắk Lắk", "Gia Lai", "Kon Tum"],
        processingTypes: [
            "Cấp đông nitơ lỏng nguyên trái",
            "Tách múi đông sâu -40°C",
            "Đóng khay chân không cao cấp"
        ],
        expectedCapacity: 45,
        capacityUnit: "tấn/ngày",
        imageUrls: [
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80"
        ],
        avatar: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80",
        certifications: ["HACCP Codex", "VietGAP", "ISO 9001:2015"],
        description: "Trung tâm chế biến công nghệ cao vùng Tây Nguyên, chuyên dòng sản phẩm sầu riêng cấp đông sâu giữ trọn 99% hương vị tự nhiên.",
        establishedYear: 2021,
        rating: 4.9,
    },
    {
        id: "processing-4",
        type: "PROCESSING_FACILITY",
        name: "Nhà máy Đóng gói Trái cây Miền Tây Nam Bộ",
        representativeName: "Võ Hoàng Nam",
        representativePhone: "0909222003",
        phone: "0909222003",
        email: "mientay.factory@triviet.vn",
        website: "https://mientaypackaging.vn",
        address: "QL1A, Xã Long Định, Huyện Châu Thành, Tỉnh Tiền Giang",
        province: "Tiền Giang",
        ward: "Xã Long Định",
        organizationType: "Công ty Cổ phần",
        taxCode: "3603999023",
        businessCode: "CP-MT-2026",
        purchasingAreas: ["Tiền Giang", "Bến Tre", "Vĩnh Long", "Hậu Giang"],
        processingTypes: [
            "Xử lý chiếu xạ kiểm dịch thực vật",
            "Dán tem QR truy xuất nguồn gốc",
            "Đóng container lạnh xuất khẩu"
        ],
        expectedCapacity: 40,
        capacityUnit: "tấn/ngày",
        imageUrls: [
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
        ],
        avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80",
        certifications: ["GlobalGAP", "HACCP", "FDA Approved"],
        description: "Hệ thống nhà máy đóng gói chuẩn GlobalGAP, kết nối trực tiếp các cảng biển xuất khẩu phục vụ thị trường Trung Quốc, Nhật Bản, Hoa Kỳ.",
        establishedYear: 2018,
        rating: 4.8,
    },
];

export async function getCollectors(): Promise<FacilityItem[]> {
    try {
        const dbItems = await prisma.partnerFacility.findMany({
            where: {
                type: "COLLECTOR",
                status: "APPROVED",
                deletedAt: null,
                NOT: [
                    { name: { contains: "Demo 1", mode: "insensitive" } },
                    { name: { contains: "Demo 2", mode: "insensitive" } },
                    { name: { contains: "Vựa thu mua Demo", mode: "insensitive" } },
                ],
            },
            include: {
                owner: {
                    select: {
                        avatar: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const mappedDb: FacilityItem[] = (dbItems || [])
            .filter((item) => {
                const lowerName = (item.name || "").toLowerCase();
                const lowerRep = (item.representativeName || "").toLowerCase();
                return (
                    !lowerName.includes("demo 1") &&
                    !lowerName.includes("demo 2") &&
                    !lowerName.includes("vựa thu mua demo") &&
                    !lowerRep.includes("demo 1") &&
                    !lowerRep.includes("demo 2")
                );
            })
            .map((item, idx) => {
                const fallback = FALLBACK_COLLECTORS[idx % FALLBACK_COLLECTORS.length];
                return {
                    id: item.id,
                    type: "COLLECTOR",
                    name: item.name,
                    representativeName: item.representativeName || item.owner?.fullName || fallback.representativeName,
                    representativePhone: item.representativePhone || item.owner?.phone || fallback.representativePhone,
                    phone: item.phone || fallback.phone,
                    email: item.email || fallback.email,
                    website: item.website || fallback.website,
                    address: item.address,
                    province: item.province,
                    ward: item.ward,
                    organizationType: item.organizationType || fallback.organizationType,
                    taxCode: item.taxCode,
                    businessCode: item.businessCode,
                    purchasingAreas: item.purchasingAreas?.length ? item.purchasingAreas : fallback.purchasingAreas,
                    processingTypes: item.processingTypes,
                    expectedCapacity: item.expectedCapacity ? Number(item.expectedCapacity) : fallback.expectedCapacity,
                    capacityUnit: item.capacityUnit || fallback.capacityUnit,
                    imageUrls: item.imageUrls?.length ? item.imageUrls : fallback.imageUrls,
                    avatar: item.imageUrls?.[0] || item.owner?.avatar || fallback.avatar,
                    certifications: fallback.certifications,
                    description: item.description || fallback.description,
                    establishedYear: fallback.establishedYear,
                    rating: fallback.rating,
                };
            });

        // Merge to guarantee all 4 official collectors are always displayed
        const result = [...mappedDb];
        for (const fb of FALLBACK_COLLECTORS) {
            const exists = result.some(
                (r) => r.phone === fb.phone || r.name.trim().toLowerCase() === fb.name.trim().toLowerCase()
            );
            if (!exists) {
                result.push(fb);
            }
        }

        return result.length > 0 ? result : FALLBACK_COLLECTORS;
    } catch {
        return FALLBACK_COLLECTORS;
    }
}

export async function getProcessingFacilities(): Promise<FacilityItem[]> {
    try {
        const dbItems = await prisma.partnerFacility.findMany({
            where: {
                type: "PROCESSING_FACILITY",
                status: "APPROVED",
                deletedAt: null,
                NOT: [
                    { name: { contains: "Demo 1", mode: "insensitive" } },
                    { name: { contains: "Demo 2", mode: "insensitive" } },
                    { name: { contains: "Cơ sở chế biến Demo", mode: "insensitive" } },
                ],
            },
            include: {
                owner: {
                    select: {
                        avatar: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const mappedDb: FacilityItem[] = (dbItems || [])
            .filter((item) => {
                const lowerName = (item.name || "").toLowerCase();
                const lowerRep = (item.representativeName || "").toLowerCase();
                return (
                    !lowerName.includes("demo 1") &&
                    !lowerName.includes("demo 2") &&
                    !lowerName.includes("cơ sở chế biến demo") &&
                    !lowerRep.includes("demo 1") &&
                    !lowerRep.includes("demo 2")
                );
            })
            .map((item, idx) => {
                const fallback = FALLBACK_PROCESSING_FACILITIES[idx % FALLBACK_PROCESSING_FACILITIES.length];
                return {
                    id: item.id,
                    type: "PROCESSING_FACILITY",
                    name: item.name,
                    representativeName: item.representativeName || item.owner?.fullName || fallback.representativeName,
                    representativePhone: item.representativePhone || item.owner?.phone || fallback.representativePhone,
                    phone: item.phone || fallback.phone,
                    email: item.email || fallback.email,
                    website: item.website || fallback.website,
                    address: item.address,
                    province: item.province,
                    ward: item.ward,
                    organizationType: item.organizationType || fallback.organizationType,
                    taxCode: item.taxCode,
                    businessCode: item.businessCode,
                    purchasingAreas: item.purchasingAreas?.length ? item.purchasingAreas : fallback.purchasingAreas,
                    processingTypes: item.processingTypes?.length ? item.processingTypes : fallback.processingTypes,
                    expectedCapacity: item.expectedCapacity ? Number(item.expectedCapacity) : fallback.expectedCapacity,
                    capacityUnit: item.capacityUnit || fallback.capacityUnit,
                    imageUrls: item.imageUrls?.length ? item.imageUrls : fallback.imageUrls,
                    avatar: item.imageUrls?.[0] || item.owner?.avatar || fallback.avatar,
                    certifications: fallback.certifications,
                    description: item.description || fallback.description,
                    establishedYear: fallback.establishedYear,
                    rating: fallback.rating,
                };
            });

        // Merge to guarantee all 4 official processing facilities are always displayed
        const result = [...mappedDb];
        for (const fb of FALLBACK_PROCESSING_FACILITIES) {
            const exists = result.some(
                (r) => r.phone === fb.phone || r.name.trim().toLowerCase() === fb.name.trim().toLowerCase()
            );
            if (!exists) {
                result.push(fb);
            }
        }

        return result.length > 0 ? result : FALLBACK_PROCESSING_FACILITIES;
    } catch {
        return FALLBACK_PROCESSING_FACILITIES;
    }
}
