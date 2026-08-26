export type SeedlingSpec = {
    variety: string; // Giống (Ri6, Monthong, Musang King, Black Thorn...)
    propagationMethod: string; // Phương pháp nhân giống (Ghép nêm, Ghép mắt, Ghép chồi...)
    treeAge: string; // Tuổi cây (8 tháng, 10 tháng, 12 tháng...)
    treeHeight: string; // Chiều cao (70 - 90 cm, 80 - 100 cm...)
    rootstock: string; // Gốc ghép (Sầu riêng hạt, Sầu riêng bản địa khỏe...)
    plantHealth: string; // Tình trạng cây (Khỏe mạnh, đọt non xanh mướt, sạch sâu bệnh...)
    packagingSpec: string; // Quy cách (Cây / bầu)
    potSize: string; // Kích thước bầu (15 × 25 cm, 18 × 30 cm...)
};

export type SeedlingItem = {
    id: string;
    code: string; // Mã sản phẩm: e.g. CG-RI6-001
    title: string; // Tên sản phẩm: e.g. Cây giống sầu riêng Ri6 ghép
    variety: string; // Tên giống: Ri6
    price: number; // Giá bán (VNĐ/cây): e.g. 85000
    priceFormatted: string; // "85.000 đ/cây"
    status: "IN_STOCK" | "OUT_OF_STOCK"; // Tình trạng: Còn hàng / Tạm hết hàng
    availableQuantity: number; // Số lượng khả dụng: 350
    nurseryName: string; // Trại giống cung cấp: Trại giống Minh Phát
    nurseryPhone: string; // Liên hệ: 0909333001
    nurseryAddress: string; // Địa chỉ: Long Khánh, Đồng Nai
    nurseryProvince: string; // Tỉnh thành: Đồng Nai
    nurseryAvatar: string;
    imageUrls: string[]; // Danh sách nhiều ảnh
    specifications: SeedlingSpec; // Đặc điểm cây giống
    description: string; // Giới thiệu chi tiết
    guarantees: string[]; // Cam kết & chính sách
    createdAt: string;
    ownerPhone: string;
};

export const INITIAL_SEEDLINGS: SeedlingItem[] = [
    {
        id: "cg-ri6-001",
        code: "CG-RI6-001",
        title: "Cây giống sầu riêng Ri6 ghép chuẩn F1",
        variety: "Ri6",
        price: 85000,
        priceFormatted: "85.000 đ/cây",
        status: "IN_STOCK",
        availableQuantity: 350,
        nurseryName: "Trại giống sầu riêng Minh Phát",
        nurseryPhone: "0909333001",
        nurseryAddress: "45 Đường CMT8, Phường Xuân Bình, TP. Long Khánh, Tỉnh Đồng Nai",
        nurseryProvince: "Đồng Nai",
        nurseryAvatar: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
        imageUrls: [
            "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
        ],
        specifications: {
            variety: "Ri6",
            propagationMethod: "Ghép nêm đọt non (Bo ghép lấy từ cây đầu dòng đạt chuẩn)",
            treeAge: "8 tháng",
            treeHeight: "70 – 90 cm",
            rootstock: "Sầu riêng hạt chọn lọc (Gốc 2 năm tuổi, thân mập)",
            plantHealth: "Khỏe mạnh, đọt non xanh mướt, rễ phát triển kín bầu, sạch sâu bệnh",
            packagingSpec: "Cây / bầu đất dinh dưỡng",
            potSize: "15 × 25 cm"
        },
        description: "Giống sầu riêng Ri6 thuần chủng được nhân giống từ vườn cây mẹ tuyển chọn 15 năm tuổi tại Long Khánh. Cây giống phát triển cơi đọt đồng đều, rễ khỏe, tỷ lệ sống trên 98% khi trồng ra vườn.",
        guarantees: [
            "Cam kết chuẩn giống Ri6 thuần chủng 100%, bảo hành đúng giống trọn đời",
            "Đã xử lý nấm bệnh rễ và khử khuẩn trước khi xuất vườn",
            "Hỗ trợ tư vấn kỹ thuật làm mô, đào hố, bón phân và chăm sóc định kỳ",
            "Đổi cây mới nếu cây bị hao hụt trong quá trình vận chuyển"
        ],
        createdAt: "2026-08-20T08:00:00.000Z",
        ownerPhone: "0909333001",
    },
    {
        id: "cg-dona-002",
        code: "CG-DONA-002",
        title: "Cây giống sầu riêng Monthong (Dona) ghép gốc khỏe",
        variety: "Monthong (Dona)",
        price: 95000,
        priceFormatted: "95.000 đ/cây",
        status: "IN_STOCK",
        availableQuantity: 500,
        nurseryName: "Trại giống sầu riêng Minh Phát",
        nurseryPhone: "0909333001",
        nurseryAddress: "45 Đường CMT8, Phường Xuân Bình, TP. Long Khánh, Tỉnh Đồng Nai",
        nurseryProvince: "Đồng Nai",
        nurseryAvatar: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
        imageUrls: [
            "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
        ],
        specifications: {
            variety: "Monthong (Dona Thái Lan)",
            propagationMethod: "Ghép chồi mắt nách sinh trưởng mạnh",
            treeAge: "10 tháng",
            treeHeight: "80 – 100 cm",
            rootstock: "Gốc sầu riêng hạt bản địa tuyển chọn",
            plantHealth: "Cây phát triển thẳng đứng, lá to dày, không bị nghẹt rễ",
            packagingSpec: "Cây / bầu ươm",
            potSize: "16 × 28 cm"
        },
        description: "Cây giống Monthong Dona xuất khẩu chất lượng cao, khả năng thích ứng rộng với cả vùng Đông Nam Bộ và Tây Nguyên. Gốc ghép to khỏe chịu hạn và kháng nấm Phytophthora tốt.",
        guarantees: [
            "Bảo hành chuẩn giống Monthong Dona trọn đời",
            "Cây đã qua giai đoạn thuần nắng 100%, đem về trồng ngay không bị héo đọt",
            "Hỗ trợ kỹ thuật bón lót và quy trình kích rễ sinh trưởng"
        ],
        createdAt: "2026-08-21T09:00:00.000Z",
        ownerPhone: "0909333001",
    },
    {
        id: "cg-msk-003",
        code: "CG-MSK-003",
        title: "Cây giống sầu riêng Musang King (D197) thuần hóa",
        variety: "Musang King",
        price: 140000,
        priceFormatted: "140.000 đ/cây",
        status: "IN_STOCK",
        availableQuantity: 200,
        nurseryName: "Trại cây giống Tân Phú Bến Tre",
        nurseryPhone: "0909333002",
        nurseryAddress: "Quốc lộ 57, Xã Phú Sơn, Huyện Chợ Lách, Tỉnh Bến Tre",
        nurseryProvince: "Bến Tre",
        nurseryAvatar: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
        imageUrls: [
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
        ],
        specifications: {
            variety: "Musang King (D197 Malaysia)",
            propagationMethod: "Ghép nêm mắt chồi F1 thuần chủng",
            treeAge: "12 tháng",
            treeHeight: "85 – 110 cm",
            rootstock: "Gốc sầu riêng hạt Chợ Lách thân chắc mập",
            plantHealth: "2 cơi đọt hoàn thiện, phiến lá thuôn dài xanh đậm bóng",
            packagingSpec: "Cây / bầu xơ dừa phối trộn vi sinh",
            potSize: "18 × 30 cm"
        },
        description: "Vua sầu riêng Musang King D197 được ươm ghép theo quy trình nghiêm ngặt tại thủ phủ cây giống Chợ Lách - Bến Tre. Bo ghép lấy từ cây mẹ nhập khẩu đã cho trái bói chất lượng chuẩn chỉ.",
        guarantees: [
            "Cam kết 100% chuẩn giống Musang King D197 Malaysia",
            "Cây đã vào bầu lớn 18x30cm dưỡng rễ hơn 4 tháng",
            "Tặng kèm tài liệu hướng dẫn chăm sóc sầu riêng Musang King đặc biệt"
        ],
        createdAt: "2026-08-22T10:00:00.000Z",
        ownerPhone: "0909333002",
    },
    {
        id: "cg-blk-004",
        code: "CG-BLK-004",
        title: "Cây giống sầu riêng Black Thorn (Gai Đen D200)",
        variety: "Black Thorn",
        price: 180000,
        priceFormatted: "180.000 đ/cây",
        status: "IN_STOCK",
        availableQuantity: 120,
        nurseryName: "Trại cây giống Tân Phú Bến Tre",
        nurseryPhone: "0909333002",
        nurseryAddress: "Quốc lộ 57, Xã Phú Sơn, Huyện Chợ Lách, Tỉnh Bến Tre",
        nurseryProvince: "Bến Tre",
        nurseryAvatar: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
        imageUrls: [
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
        ],
        specifications: {
            variety: "Black Thorn (D200 Gai Đen)",
            propagationMethod: "Ghép nêm cành đọt khỏe",
            treeAge: "9 tháng",
            treeHeight: "75 – 95 cm",
            rootstock: "Gốc hạt 2 năm tuổi rễ cọc đâm sâu",
            plantHealth: "Rễ cọc thẳng đứng, đọt vươn mạnh mẽ, không có nấm bệnh",
            packagingSpec: "Cây / bầu",
            potSize: "16 × 26 cm"
        },
        description: "Giống sầu riêng Black Thorn D200 cao cấp, giá trị thương phẩm cao hàng đầu thị trường hiện nay. Cây giống phát triển nhanh, cành tán xòe đều và cho quả sớm sau 4 năm.",
        guarantees: [
            "Cam kết chuẩn giống Black Thorn D200 chính gốc",
            "Hỗ trợ kỹ thuật cắt tỉa cành tạo tán từ năm thứ 1",
            "Giao hàng tận nơi toàn quốc an toàn tuyệt đối"
        ],
        createdAt: "2026-08-23T11:00:00.000Z",
        ownerPhone: "0909333002",
    },
    {
        id: "cg-sh-005",
        code: "CG-SH-005",
        title: "Cây giống sầu riêng Sáu Hữu ghép đọt non",
        variety: "Sáu Hữu",
        price: 120000,
        priceFormatted: "120.000 đ/cây",
        status: "IN_STOCK",
        availableQuantity: 180,
        nurseryName: "Trại giống sầu riêng Minh Phát",
        nurseryPhone: "0909333001",
        nurseryAddress: "45 Đường CMT8, Phường Xuân Bình, TP. Long Khánh, Tỉnh Đồng Nai",
        nurseryProvince: "Đồng Nai",
        nurseryAvatar: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
        imageUrls: [
            "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80"
        ],
        specifications: {
            variety: "Sáu Hữu",
            propagationMethod: "Ghép nêm ngọn chồi khỏe",
            treeAge: "8 tháng",
            treeHeight: "70 – 85 cm",
            rootstock: "Gốc hạt tuyển chọn",
            plantHealth: "Cây khỏe, cơi đọt mập tròn, lá bóng đẹp",
            packagingSpec: "Cây / bầu",
            potSize: "15 × 25 cm"
        },
        description: "Giống sầu riêng Sáu Hữu đặc sản cơm vàng đậm, dẻo béo thơm lừng. Cây giống được ghép và thuần khí hậu tại Đồng Nai, dễ trồng và tỉ lệ đậu hoa đậu trái cao.",
        guarantees: [
            "Bảo hành giống Sáu Hữu chuẩn 100%",
            "Cây đã thuần nắng, rễ ăn đều quanh bầu",
            "Tư vấn kỹ thuật xử lý ra hoa nghịch vụ"
        ],
        createdAt: "2026-08-24T08:30:00.000Z",
        ownerPhone: "0909333001",
    },
    {
        id: "cg-cb-006",
        code: "CG-CB-006",
        title: "Cây giống sầu riêng Chuồng Bò truyền thống",
        variety: "Chuồng Bò",
        price: 70000,
        priceFormatted: "70.000 đ/cây",
        status: "IN_STOCK",
        availableQuantity: 250,
        nurseryName: "Trại cây giống Tân Phú Bến Tre",
        nurseryPhone: "0909333002",
        nurseryAddress: "Quốc lộ 57, Xã Phú Sơn, Huyện Chợ Lách, Tỉnh Bến Tre",
        nurseryProvince: "Bến Tre",
        nurseryAvatar: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
        imageUrls: [
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
        ],
        specifications: {
            variety: "Chuồng Bò",
            propagationMethod: "Ghép chồi mắt",
            treeAge: "8 tháng",
            treeHeight: "70 – 90 cm",
            rootstock: "Sầu riêng hạt bản địa",
            plantHealth: "Kháng sâu đục thân và xì mủ tốt, cành lá sum suê",
            packagingSpec: "Cây / bầu",
            potSize: "15 × 25 cm"
        },
        description: "Giống sầu riêng Chuồng Bò hương vị béo ngậy đặc trưng miền Tây Nam Bộ. Cây giống có sức đề kháng sâu bệnh cực kỳ mạnh mẽ, ít tốn công chăm sóc.",
        guarantees: [
            "Chuẩn giống Chuồng Bò truyền thống 100%",
            "Hỗ trợ giao hàng tận vườn từ 20 cây"
        ],
        createdAt: "2026-08-24T14:00:00.000Z",
        ownerPhone: "0909333002",
    },
    {
        id: "cg-ri6-large-007",
        code: "CG-RI6-007",
        title: "Cây giống sầu riêng Ri6 cây lỡ bầu lớn (1.5 năm)",
        variety: "Ri6",
        price: 150000,
        priceFormatted: "150.000 đ/cây",
        status: "IN_STOCK",
        availableQuantity: 90,
        nurseryName: "Trại giống sầu riêng Minh Phát",
        nurseryPhone: "0909333001",
        nurseryAddress: "45 Đường CMT8, Phường Xuân Bình, TP. Long Khánh, Tỉnh Đồng Nai",
        nurseryProvince: "Đồng Nai",
        nurseryAvatar: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
        imageUrls: [
            "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
        ],
        specifications: {
            variety: "Ri6",
            propagationMethod: "Ghép đọt non nuôi dưỡng bầu lớn",
            treeAge: "15 tháng",
            treeHeight: "120 – 150 cm",
            rootstock: "Gốc ghép 2.5 năm to khỏe",
            plantHealth: "Tán cây phân tầng đều 4 hướng, rễ ăn bầu lớn, trồng nhanh cho quả",
            packagingSpec: "Cây / bầu lớn",
            potSize: "22 × 35 cm"
        },
        description: "Dòng cây giống lỡ được dưỡng trong bầu lớn hơn 1 năm, thân cây to bằng ngón chân cái, tán phân cành đều. Trồng rút ngắn thời gian thu hoạch từ 1-1.5 năm so với cây giống nhỏ.",
        guarantees: [
            "Cam kết cây phát đọt ngay sau 2 tuần hạ mô",
            "Bảo hành chuẩn giống Ri6 trọn đời cây",
            "Hỗ trợ kỹ thuật bấm ngọn tạo cành quả"
        ],
        createdAt: "2026-08-25T09:00:00.000Z",
        ownerPhone: "0909333001",
    },
    {
        id: "cg-dona-large-008",
        code: "CG-DONA-008",
        title: "Cây giống Monthong (Dona) cây lỡ tán dù",
        variety: "Monthong (Dona)",
        price: 165000,
        priceFormatted: "165.000 đ/cây",
        status: "IN_STOCK",
        availableQuantity: 75,
        nurseryName: "Trại cây giống Tân Phú Bến Tre",
        nurseryPhone: "0909333002",
        nurseryAddress: "Quốc lộ 57, Xã Phú Sơn, Huyện Chợ Lách, Tỉnh Bến Tre",
        nurseryProvince: "Bến Tre",
        nurseryAvatar: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
        imageUrls: [
            "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
        ],
        specifications: {
            variety: "Monthong (Dona)",
            propagationMethod: "Ghép chồi mắt nuôi bầu dưỡng",
            treeAge: "16 tháng",
            treeHeight: "130 – 160 cm",
            rootstock: "Gốc hạt 3 năm tuổi",
            plantHealth: "Tán dù xòe rộng, cành cấp 1 mập khỏe, rễ kín bầu",
            packagingSpec: "Cây / bầu lớn",
            potSize: "24 × 38 cm"
        },
        description: "Dòng cây giống Monthong Dona cao cấp tuyển chọn, cành nhánh đã định hình tán dù tròn đều. Cây sinh trưởng vượt trội, chịu gió tốt, rất thích hợp trồng dặm hoặc trồng mới muốn nhanh thu hoạch.",
        guarantees: [
            "Chuẩn giống Monthong Dona 100%",
            "Cây cứng cáp, bao sống 100% khi trồng đúng kỹ thuật hướng dẫn"
        ],
        createdAt: "2026-08-25T15:00:00.000Z",
        ownerPhone: "0909333002",
    },
];

// In-memory / module-level state store with seed data
let globalSeedlings = [...INITIAL_SEEDLINGS];

export async function getSeedlings(filter?: {
    variety?: string;
    nurseryPhone?: string;
    province?: string;
    search?: string;
    status?: string;
}): Promise<SeedlingItem[]> {
    let result = [...globalSeedlings];

    if (filter?.variety && filter.variety !== "ALL") {
        result = result.filter((item) => item.variety === filter.variety);
    }
    if (filter?.nurseryPhone) {
        result = result.filter((item) => item.ownerPhone === filter.nurseryPhone || item.nurseryPhone === filter.nurseryPhone);
    }
    if (filter?.province && filter.province !== "ALL") {
        result = result.filter((item) => item.nurseryProvince === filter.province);
    }
    if (filter?.status && filter.status !== "ALL") {
        result = result.filter((item) => item.status === filter.status);
    }
    if (filter?.search) {
        const query = filter.search.toLowerCase().trim();
        result = result.filter(
            (item) =>
                item.title.toLowerCase().includes(query) ||
                item.variety.toLowerCase().includes(query) ||
                item.code.toLowerCase().includes(query) ||
                item.nurseryName.toLowerCase().includes(query) ||
                item.nurseryAddress.toLowerCase().includes(query)
        );
    }

    return result;
}

export async function getSeedlingById(id: string): Promise<SeedlingItem | null> {
    const found = globalSeedlings.find((item) => item.id === id || item.code.toLowerCase() === id.toLowerCase());
    return found || null;
}

export async function createSeedling(data: Omit<SeedlingItem, "id" | "createdAt" | "priceFormatted">): Promise<SeedlingItem> {
    const id = `cg-${Date.now()}`;
    const priceFormatted = `${data.price.toLocaleString("vi-VN")} đ/cây`;
    const newItem: SeedlingItem = {
        ...data,
        id,
        priceFormatted,
        createdAt: new Date().toISOString(),
    };
    globalSeedlings.unshift(newItem);
    return newItem;
}

export async function updateSeedling(id: string, updates: Partial<SeedlingItem>): Promise<SeedlingItem | null> {
    const index = globalSeedlings.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const current = globalSeedlings[index];
    const updatedPrice = updates.price !== undefined ? updates.price : current.price;
    const priceFormatted = `${updatedPrice.toLocaleString("vi-VN")} đ/cây`;

    const updatedItem: SeedlingItem = {
        ...current,
        ...updates,
        price: updatedPrice,
        priceFormatted,
    };
    globalSeedlings[index] = updatedItem;
    return updatedItem;
}

export async function deleteSeedling(id: string): Promise<boolean> {
    const initialLen = globalSeedlings.length;
    globalSeedlings = globalSeedlings.filter((item) => item.id !== id);
    return globalSeedlings.length < initialLen;
}
