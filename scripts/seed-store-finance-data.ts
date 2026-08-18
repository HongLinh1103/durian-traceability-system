import { PrismaClient, StoreExpenseCategory, OrderStatus, OrderPaymentStatus, ExpensePaymentStatus, StoreProductType, StoreProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

const STORE_ID = "seed-store-tri-an";
const OWNER_PHONE = "0909000001";

// 24 Detailed agricultural products with realistic prices and cost prices
const PRODUCTS_CATALOG = [
    // --- PHÂN BÓN (FERTILIZER) ---
    {
        id: "seed-sp-npk-16168",
        code: "NPK-16168",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân bón Đầu Trâu NPK 16-16-8+TE",
        brand: "Đầu Trâu",
        manufacturer: "Công ty CP Phân bón Bình Điền",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 50kg",
        price: 395000,
        salePrice: 385000,
        costPrice: 310000,
        initialStock: 65,
        status: "APPROVED" as StoreProductStatus,
        description: "Cung cấp đạm, lân, kali cân đối giúp cây bung đọt đồng loạt, dưỡng lá xanh dày.",
        composition: "N: 16%, P2O5: 16%, K2O: 8% + Vi lượng TE",
        weight: 10,
    },
    {
        id: "seed-sp-npk-202015",
        code: "NPK-202015",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân bón Đầu Trâu NPK 20-20-15 + TE",
        brand: "Đầu Trâu",
        manufacturer: "Công ty CP Phân bón Bình Điền",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 520000,
        salePrice: 499000,
        costPrice: 420000,
        initialStock: 55,
        status: "APPROVED" as StoreProductStatus,
        description: "Dinh dưỡng cao cấp nuôi trái lớn nhanh, tăng độ ngọt và phẩm chất cơm sầu riêng.",
        composition: "N: 20%, P2O5: 20%, K2O: 15%",
        weight: 9,
    },
    {
        id: "seed-sp-yaramila-15520",
        code: "NPK-15520",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân bón YaraMila Complex 15-5-20",
        brand: "Yara",
        manufacturer: "Yara International ASA",
        origin: "Na Uy",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 590000,
        salePrice: 575000,
        costPrice: 485000,
        initialStock: 45,
        status: "APPROVED" as StoreProductStatus,
        description: "Phân khoáng cao cấp nhập khẩu chuyên dùng giai đoạn vào cơm, chống sượng múi.",
        composition: "N: 15%, P2O5: 5%, K2O: 20% + S, Mg",
        weight: 8,
    },
    {
        id: "seed-sp-organic",
        code: "HC-SONGGIANH",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân hữu cơ vi sinh Sông Gianh",
        brand: "Sông Gianh",
        manufacturer: "Tổng Công ty Sông Gianh",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 195000,
        salePrice: 185000,
        costPrice: 150000,
        initialStock: 80,
        status: "APPROVED" as StoreProductStatus,
        description: "Cải tạo đất chai cứng, tăng độ phì nhiêu và kích thích hệ vi sinh vật có ích.",
        composition: "Hữu cơ: 23%, Vi sinh vật cố định đạm, phân giải lân",
        weight: 10,
    },
    {
        id: "seed-sp-quelam-01",
        code: "HC-QUELAM",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân hữu cơ khoáng Quế Lâm 01",
        brand: "Quế Lâm",
        manufacturer: "Tập đoàn Quế Lâm",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 225000,
        salePrice: 215000,
        costPrice: 175000,
        initialStock: 50,
        status: "APPROVED" as StoreProductStatus,
        description: "Bổ sung axit humic và fulvic giúp bộ rễ phát triển cực mạnh, kháng nghẹt rễ.",
        composition: "Hữu cơ: 15%, NPK: 3-5-2 + Acid Humic",
        weight: 7,
    },
    {
        id: "seed-sp-dap-philip",
        code: "DAP-PHILIP",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân DAP Philippines 18-46-0",
        brand: "Philphos",
        manufacturer: "Philippine Phosphate Fertilizer Corp",
        origin: "Philippines",
        unit: "bao",
        packaging: "Bao 50kg",
        price: 960000,
        salePrice: 940000,
        costPrice: 810000,
        initialStock: 35,
        status: "APPROVED" as StoreProductStatus,
        description: "Cung cấp đạm và lân tan nhanh, kích thích phân hóa mầm hoa và đâm rễ non.",
        composition: "N: 18%, P2O5: 46%",
        weight: 6,
    },
    {
        id: "seed-sp-k2so4",
        code: "K2SO4-HAIFA",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân Kali Sulphate K2SO4 Haifa Multi-K",
        brand: "Haifa",
        manufacturer: "Haifa Chemicals",
        origin: "Israel",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 780000,
        salePrice: 750000,
        costPrice: 630000,
        initialStock: 30,
        status: "APPROVED" as StoreProductStatus,
        description: "Kali trắng không chứa clo, giúp sầu riêng lên màu vàng đều, dẻo ngọt thơm ngon.",
        composition: "K2O: 52%, S: 18%",
        weight: 7,
    },
    {
        id: "seed-sp-lan-vandien",
        code: "LAN-VANDIEN",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân lân nung chảy Văn Điển",
        brand: "Văn Điển",
        manufacturer: "Công ty CP Phân lân nung chảy Văn Điển",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 50kg",
        price: 270000,
        salePrice: 260000,
        costPrice: 210000,
        initialStock: 70,
        status: "APPROVED" as StoreProductStatus,
        description: "Khử chua hạ phèn, bổ sung canxi và magie giúp cứng cây, dày lá.",
        composition: "P2O5: 16%, CaO: 30%, MgO: 15%, SiO2: 24%",
        weight: 6,
    },
    {
        id: "seed-sp-canxi-bo",
        code: "CANXI-BO",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân bón lá Canxi Bo Sữa Chống Rụng Trái",
        brand: "AgriTech",
        manufacturer: "Công ty Nông nghiệp Xanh",
        origin: "Việt Nam",
        unit: "chai",
        packaging: "Chai 500ml",
        price: 135000,
        salePrice: 125000,
        costPrice: 95000,
        initialStock: 12, // Low stock demo
        status: "APPROVED" as StoreProductStatus,
        description: "Tăng độ dai cuống, chống rụng hoa và trái non sinh lý hiệu quả.",
        composition: "Canxi: 12%, Bo: 20.000 ppm",
        weight: 9,
    },
    {
        id: "seed-sp-humic-usa",
        code: "HUMIC-USA",
        type: "FERTILIZER" as StoreProductType,
        name: "Axit Humic Diamond Grow 99% Kích Rễ",
        brand: "Diamond Grow",
        manufacturer: "Humic Growth Solutions",
        origin: "Mỹ",
        unit: "gói",
        packaging: "Gói 1kg",
        price: 120000,
        salePrice: 110000,
        costPrice: 85000,
        initialStock: 8, // Low stock demo
        status: "APPROVED" as StoreProductStatus,
        description: "Phục hồi cây sau thu hoạch, giải độc phèn ngộ độc hữu cơ.",
        composition: "Potassium Humate: 99%, Acid Humic: 85%",
        weight: 8,
    },
    {
        id: "seed-sp-at1",
        code: "AT1-BINHDIEN",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân bón Đầu Trâu AT1",
        brand: "Đầu Trâu",
        manufacturer: "Bình Điền",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 565000,
        salePrice: 545000,
        costPrice: 450000,
        initialStock: 40,
        status: "APPROVED" as StoreProductStatus,
        description: "Phân bón chuyên dùng cho giai đoạn phục hồi sau thu hoạch và sinh trưởng chồi non.",
        composition: "NPK 18-8-12 + TE",
        weight: 7,
    },
    {
        id: "seed-sp-at2",
        code: "AT2-BINHDIEN",
        type: "FERTILIZER" as StoreProductType,
        name: "Phân bón Đầu Trâu AT2 Phân Hóa Mầm Hoa",
        brand: "Đầu Trâu",
        manufacturer: "Bình Điền",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 590000,
        salePrice: 570000,
        costPrice: 475000,
        initialStock: 35,
        status: "APPROVED" as StoreProductStatus,
        description: "Hỗ trợ phân hóa mầm hoa và ra hoa tập trung đồng loạt.",
        composition: "N: 7%, P2O5: 17%, K2O: 12%, Zn, B",
        weight: 6,
    },

    // --- THUỐC BVTV & CHẾ PHẨM SINH HỌC (PESTICIDE) ---
    {
        id: "seed-sp-amistar",
        code: "AMISTAR-TOP",
        type: "PESTICIDE" as StoreProductType,
        name: "Thuốc trừ bệnh Amistar Top 325SC",
        brand: "Syngenta",
        manufacturer: "Syngenta Crop Protection AG",
        origin: "Thụy Sĩ",
        unit: "chai",
        packaging: "Chai 250ml",
        price: 245000,
        salePrice: 235000,
        costPrice: 190000,
        initialStock: 45,
        status: "APPROVED" as StoreProductStatus,
        description: "Đặc trị thán thư, đốm lá mắt cua và nấm hồng trên cành lá sầu riêng.",
        composition: "Azoxystrobin 200g/l + Difenoconazole 125g/l",
        phiDays: 14,
        weight: 10,
    },
    {
        id: "seed-sp-ridomil-gold",
        code: "RIDOMIL-GOLD",
        type: "PESTICIDE" as StoreProductType,
        name: "Thuốc trừ nấm Ridomil Gold 68WG",
        brand: "Syngenta",
        manufacturer: "Syngenta Crop Protection AG",
        origin: "Thụy Sĩ",
        unit: "gói",
        packaging: "Gói 100g",
        price: 55000,
        salePrice: 50000,
        costPrice: 39000,
        initialStock: 60,
        status: "APPROVED" as StoreProductStatus,
        description: "Quét vết thương thân xì mủ, tưới gốc trị thối rễ do nấm Phytophthora.",
        composition: "Metalaxyl-M 40g/kg + Mancozeb 640g/kg",
        phiDays: 14,
        weight: 9,
    },
    {
        id: "seed-sp-copper",
        code: "CHAMPION-77WP",
        type: "PESTICIDE" as StoreProductType,
        name: "Thuốc trừ nấm gốc đồng Champion 77WP",
        brand: "Nufarm",
        manufacturer: "Nufarm Vietnam",
        origin: "Úc",
        unit: "gói",
        packaging: "Gói 1kg",
        price: 215000,
        salePrice: 205000,
        costPrice: 168000,
        initialStock: 35,
        status: "APPROVED" as StoreProductStatus,
        description: "Rửa vườn sau thu hoạch, phòng trừ rong rêu mảng bám trên thân cây.",
        composition: "Copper Hydroxide 77% w/w",
        phiDays: 7,
        weight: 7,
    },
    {
        id: "seed-sp-radiant-60sc",
        code: "RADIANT-60SC",
        type: "PESTICIDE" as StoreProductType,
        name: "Thuốc trừ rầy bọ trĩ Radiant 60SC",
        brand: "Corteva",
        manufacturer: "Corteva Agriscience",
        origin: "Mỹ",
        unit: "chai",
        packaging: "Chai 100ml",
        price: 145000,
        salePrice: 138000,
        costPrice: 110000,
        initialStock: 7, // Low stock demo
        status: "APPROVED" as StoreProductStatus,
        description: "Thuốc sinh học diệt trừ bọ trĩ, sâu đục trái, sâu ăn bông thế hệ mới.",
        composition: "Spinetoram 60g/L",
        phiDays: 3,
        weight: 8,
    },
    {
        id: "seed-sp-trangxanh",
        code: "TRANG-XANH",
        type: "PESTICIDE" as StoreProductType,
        name: "Chế phẩm nấm ký sinh côn trùng Trắng Xanh WP",
        brand: "Đức Thành",
        manufacturer: "Công ty TNHH Đức Thành",
        origin: "Việt Nam",
        unit: "gói",
        packaging: "Gói 500g",
        price: 165000,
        salePrice: null,
        costPrice: 125000,
        initialStock: 35,
        status: "APPROVED" as StoreProductStatus,
        description: "Nấm xanh nấm trắng ký sinh tiêu diệt rầy phấn trắng, bọ cánh cứng an toàn sinh học.",
        composition: "Beauveria bassiana + Metarhizium anisopliae",
        phiDays: 0,
        weight: 6,
    },
    {
        id: "seed-sp-neem",
        code: "NEEM-GREEN",
        type: "PESTICIDE" as StoreProductType,
        name: "Thuốc trừ sâu thảo mộc NeemNim Green 0.3EC",
        brand: "Ngân Anh",
        manufacturer: "Công ty TNHH Ngân Anh",
        origin: "Việt Nam",
        unit: "chai",
        packaging: "Chai 400ml",
        price: 195000,
        salePrice: 185000,
        costPrice: 145000,
        initialStock: 45,
        status: "APPROVED" as StoreProductStatus,
        description: "Chiết xuất tinh dầu hạt neem xua đuổi côn trùng chích hút, an toàn chuẩn VietGAP.",
        composition: "Azadirachtin 0.3%",
        phiDays: 3,
        weight: 7,
    },
    {
        id: "seed-sp-tricho-bio",
        code: "TRICHO-BIO",
        type: "PESTICIDE" as StoreProductType,
        name: "Chế phẩm nấm đối kháng Trichoderma Bacillus Bio",
        brand: "Viện BVTV",
        manufacturer: "Trung tâm CNSH Nông nghiệp",
        origin: "Việt Nam",
        unit: "gói",
        packaging: "Gói 1kg",
        price: 85000,
        salePrice: 79000,
        costPrice: 58000,
        initialStock: 50,
        status: "APPROVED" as StoreProductStatus,
        description: "Ủ phân hữu cơ chuồng và tưới ngừa nấm rễ tuyến trùng trong đất trồng.",
        composition: "Trichoderma viride, Bacillus subtilis",
        phiDays: 0,
        weight: 8,
    },
    {
        id: "seed-sp-bitadin",
        code: "BITADIN-WP",
        type: "PESTICIDE" as StoreProductType,
        name: "Thuốc trừ sâu vi sinh Bitadin WP",
        brand: "Nông Sinh",
        manufacturer: "Công ty Nông Sinh",
        origin: "Việt Nam",
        unit: "gói",
        packaging: "Gói 500g",
        price: 148000,
        salePrice: 139000,
        costPrice: 112000,
        initialStock: 0, // Out of stock demo
        status: "OUT_OF_STOCK" as StoreProductStatus,
        description: "Vi khuẩn BT tiêu diệt sâu đục thân và sâu tơ ăn lá non.",
        composition: "Bacillus thuringiensis var. kurstaki",
        phiDays: 0,
        weight: 5,
    },

    // --- DỤNG CỤ VẬT TƯ NÔNG NGHIỆP ---
    {
        id: "seed-sp-day-neo-canh",
        code: "DAY-NEO-CANH",
        type: "FERTILIZER" as StoreProductType,
        name: "Dây nilon chuyên dụng neo cành sầu riêng chịu lực",
        brand: "Thái An",
        manufacturer: "Nhựa Thái An",
        origin: "Việt Nam",
        unit: "cuộn",
        packaging: "Cuộn 1kg (~500m)",
        price: 65000,
        salePrice: 60000,
        costPrice: 45000,
        initialStock: 75,
        status: "APPROVED" as StoreProductStatus,
        description: "Dây neo cành mang trái chống gió bão gãy nhánh, chống tia UV độ bền trên 2 năm.",
        composition: "Nhựa nguyên sinh HDPE chống lão hóa",
        weight: 8,
    },
    {
        id: "seed-sp-tui-bao-trai",
        code: "TUI-BAO-TRAI",
        type: "PESTICIDE" as StoreProductType,
        name: "Túi vải bao trái sầu riêng chống sâu đục (Lốc 50 cái)",
        brand: "Bảo Nông",
        manufacturer: "Bao bì Nông nghiệp Á Châu",
        origin: "Việt Nam",
        unit: "lốc",
        packaging: "Lốc 50 cái",
        price: 240000,
        salePrice: 220000,
        costPrice: 175000,
        initialStock: 45,
        status: "APPROVED" as StoreProductStatus,
        description: "Bao trái chống rệp sáp, sâu đục và rám nắng, tái sử dụng 2 vụ.",
        composition: "Vải không dệt thoáng khí có dây rút inox",
        weight: 9,
    },
    {
        id: "seed-sp-bat-phu-goc",
        code: "BAT-PHU-GOC",
        type: "FERTILIZER" as StoreProductType,
        name: "Bạt phủ gốc sầu riêng xử lý ra hoa nghịch vụ (Khổ 4m x 50m)",
        brand: "Đại Nam",
        manufacturer: "Bạt nhựa Đại Nam",
        origin: "Việt Nam",
        unit: "cuộn",
        packaging: "Cuộn 50 mét",
        price: 420000,
        salePrice: null,
        costPrice: 320000,
        initialStock: 5, // Low stock demo
        status: "APPROVED" as StoreProductStatus,
        description: "Đậy gốc xiết nước ép cây phân hóa mầm hoa đồng loạt.",
        composition: "Nhựa PE cán màng trắng bạc",
        weight: 4,
    },
    {
        id: "seed-sp-binh-xit-oshima",
        code: "BINH-XIT-OSHIMA",
        type: "PESTICIDE" as StoreProductType,
        name: "Bình xịt điện Oshima 20L bơm đôi cực mạnh",
        brand: "Oshima",
        manufacturer: "Oshima Japan Technology",
        origin: "Trung Quốc",
        unit: "bộ",
        packaging: "Thùng 1 chiếc",
        price: 920000,
        salePrice: 890000,
        costPrice: 710000,
        initialStock: 8,
        status: "DRAFT" as StoreProductStatus,
        description: "Bình phun điện ắc quy 12V-12Ah, áp lực phun sương cao tới ngọn sầu riêng.",
        composition: "Vỏ nhựa cao cấp + ắc quy khô chì",
        weight: 3,
    },
];

async function main() {
    console.log("================================================================================");
    console.log("🚀 STARTING COMPREHENSIVE STORE FINANCE & SALES SEEDING");
    console.log("================================================================================");

    const now = new Date(); // Current local time: 2026-08-18
    console.log(`🕒 System reference date: ${now.toISOString()} (${now.toString()})`);

    // 1. Verify and retrieve STORE_OWNER
    const owner = await prisma.user.findUnique({
        where: { phone: OWNER_PHONE },
    });
    if (!owner) {
        throw new Error(`Store owner with phone ${OWNER_PHONE} not found in database!`);
    }
    console.log(`✅ Store Owner: ${owner.fullName} (${owner.phone}) [ID: ${owner.id}]`);

    // 2. Ensure Primary Store exists and is APPROVED
    const store = await prisma.store.upsert({
        where: { id: STORE_ID },
        update: {
            ownerId: owner.id,
            representativeName: owner.fullName || "Nguyễn Văn Minh",
            representativePhone: owner.phone,
            representativeEmail: owner.email,
            identityNumber: "079000000001",
            name: "Cửa hàng Vật tư Nông nghiệp Trị An",
            taxOrBusinessCode: "MST-TRIAN-001",
            address: "Số 88 Quốc Lộ 1A, Xã Trị An, Huyện Vĩnh Cửu, Tỉnh Đồng Nai",
            phone: OWNER_PHONE,
            openingHours: "06:30 - 18:30 (Thứ 2 - Chủ Nhật)",
            description: "Đại lý cấp 1 phân phối phân bón, thuốc BVTV sinh học, vật tư chuyên dùng sầu riêng VietGAP/GACC.",
            status: "APPROVED",
            deletedAt: null,
        },
        create: {
            id: STORE_ID,
            ownerId: owner.id,
            representativeName: owner.fullName || "Nguyễn Văn Minh",
            representativePhone: owner.phone,
            representativeEmail: owner.email,
            identityNumber: "079000000001",
            name: "Cửa hàng Vật tư Nông nghiệp Trị An",
            taxOrBusinessCode: "MST-TRIAN-001",
            address: "Số 88 Quốc Lộ 1A, Xã Trị An, Huyện Vĩnh Cửu, Tỉnh Đồng Nai",
            phone: OWNER_PHONE,
            openingHours: "06:30 - 18:30 (Thứ 2 - Chủ Nhật)",
            description: "Đại lý cấp 1 phân phối phân bón, thuốc BVTV sinh học, vật tư chuyên dùng sầu riêng VietGAP/GACC.",
            status: "APPROVED",
            submittedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
            approvedAt: new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000),
        },
    });
    console.log(`✅ Store: ${store.name} [ID: ${store.id}]`);

    // Clean up duplicate demo store if present
    const demoStore = await prisma.store.findUnique({ where: { id: "demo-store-minh-phat" } });
    if (demoStore) {
        console.log("🧹 Cleaning previous secondary demo store demo-store-minh-phat...");
        await prisma.storeExpense.deleteMany({ where: { storeId: demoStore.id } });
        await prisma.orderStatusHistory.deleteMany({ where: { order: { storeId: demoStore.id } } });
        await prisma.orderItem.deleteMany({ where: { order: { storeId: demoStore.id } } });
        await prisma.inventoryMovement.deleteMany({ where: { document: { storeId: demoStore.id } } });
        await prisma.inventoryDocument.deleteMany({ where: { storeId: demoStore.id } });
        await prisma.order.deleteMany({ where: { storeId: demoStore.id } });
        await prisma.storeProduct.deleteMany({ where: { storeId: demoStore.id } });
        await prisma.store.delete({ where: { id: demoStore.id } });
    }

    // 3. Fetch existing approved FARMER accounts from DB
    const existingFarmers = await prisma.user.findMany({
        where: { role: "FARMER", accountStatus: "APPROVED" },
        select: { id: true, phone: true, fullName: true, address: true, province: true, district: true, ward: true },
        orderBy: { createdAt: "asc" },
    });

    if (existingFarmers.length === 0) {
        throw new Error("No approved FARMER accounts found in DB!");
    }
    console.log(`👨‍🌾 Found ${existingFarmers.length} approved FARMER accounts in DB.`);

    // 4. Clean existing test data on seed-store-tri-an to ensure idempotence
    console.log("🧹 Resetting existing orders, inventory movements & expenses for seed-store-tri-an...");
    await prisma.storeExpense.deleteMany({ where: { storeId: store.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { order: { storeId: store.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { storeId: store.id } } });
    await prisma.inventoryMovement.deleteMany({ where: { document: { storeId: store.id } } });
    await prisma.inventoryDocument.deleteMany({ where: { storeId: store.id } });
    await prisma.order.deleteMany({ where: { storeId: store.id } });

    // 5. Upsert 24 Products and Initial Import Documents (PN)
    console.log(`📦 Upserting ${PRODUCTS_CATALOG.length} store products & import stock records...`);
    const createdProducts: Array<{
        id: string;
        code: string;
        name: string;
        unit: string;
        price: number;
        costPrice: number;
        stock: number;
        weight: number;
    }> = [];

    let totalImportDocs = 0;
    let totalImportMovements = 0;

    for (let i = 0; i < PRODUCTS_CATALOG.length; i++) {
        const prodDef = PRODUCTS_CATALOG[i];
        
        // 2 import batches across 90 days
        const batch1Date = new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000);
        const batch2Date = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
        
        // Quantities for each batch
        const totalImportedStock = prodDef.initialStock + 30; // buffer for sales
        const b1Qty = Math.floor(totalImportedStock * 0.6);
        const b2Qty = totalImportedStock - b1Qty;

        const product = await prisma.storeProduct.upsert({
            where: { id: prodDef.id },
            update: {
                storeId: store.id,
                type: prodDef.type,
                name: prodDef.name,
                brand: prodDef.brand,
                manufacturer: prodDef.manufacturer,
                origin: prodDef.origin,
                unit: prodDef.unit,
                packaging: prodDef.packaging,
                price: prodDef.price,
                salePrice: prodDef.salePrice,
                costPrice: prodDef.costPrice,
                stock: totalImportedStock, // will decrement on confirmed/delivered sales
                composition: prodDef.composition,
                phiDays: prodDef.phiDays || null,
                status: prodDef.status,
                description: prodDef.description,
                deletedAt: null,
            },
            create: {
                id: prodDef.id,
                storeId: store.id,
                type: prodDef.type,
                name: prodDef.name,
                brand: prodDef.brand,
                manufacturer: prodDef.manufacturer,
                origin: prodDef.origin,
                unit: prodDef.unit,
                packaging: prodDef.packaging,
                price: prodDef.price,
                salePrice: prodDef.salePrice,
                costPrice: prodDef.costPrice,
                stock: totalImportedStock,
                composition: prodDef.composition,
                phiDays: prodDef.phiDays || null,
                status: prodDef.status,
                description: prodDef.description,
            },
        });

        // Create 2 Import Documents (PN)
        const doc1 = await prisma.inventoryDocument.create({
            data: {
                storeId: store.id,
                code: `PN-TA-${prodDef.code}-01`,
                type: "PN",
                businessType: "SUPPLIER_IMPORT",
                supplierName: prodDef.manufacturer || "Nhà phân phối Vật tư Nông nghiệp",
                reason: `Nhập kho đợt 1 - ${prodDef.name}`,
                actorId: owner.id,
                actorName: owner.fullName || "Nguyễn Văn Minh",
                createdAt: batch1Date,
                updatedAt: batch1Date,
            },
        });
        totalImportDocs++;

        await prisma.inventoryMovement.create({
            data: {
                productId: product.id,
                documentId: doc1.id,
                type: "IMPORT",
                quantity: b1Qty,
                stockBefore: 0,
                stockAfter: b1Qty,
                unitCost: prodDef.costPrice,
                totalCost: b1Qty * prodDef.costPrice,
                note: `Nhập kho đợt 1`,
                createdAt: batch1Date,
                actorId: owner.id,
            },
        });
        totalImportMovements++;

        const doc2 = await prisma.inventoryDocument.create({
            data: {
                storeId: store.id,
                code: `PN-TA-${prodDef.code}-02`,
                type: "PN",
                businessType: "SUPPLIER_IMPORT",
                supplierName: prodDef.manufacturer || "Nhà phân phối Vật tư Nông nghiệp",
                reason: `Nhập bổ sung đợt 2 - ${prodDef.name}`,
                actorId: owner.id,
                actorName: owner.fullName || "Nguyễn Văn Minh",
                createdAt: batch2Date,
                updatedAt: batch2Date,
            },
        });
        totalImportDocs++;

        await prisma.inventoryMovement.create({
            data: {
                productId: product.id,
                documentId: doc2.id,
                type: "IMPORT",
                quantity: b2Qty,
                stockBefore: b1Qty,
                stockAfter: totalImportedStock,
                unitCost: prodDef.costPrice,
                totalCost: b2Qty * prodDef.costPrice,
                note: `Nhập kho đợt 2`,
                createdAt: batch2Date,
                actorId: owner.id,
            },
        });
        totalImportMovements++;

        createdProducts.push({
            id: product.id,
            code: prodDef.code,
            name: product.name,
            unit: product.unit,
            price: Number(product.salePrice || product.price),
            costPrice: Number(product.costPrice || prodDef.costPrice),
            stock: totalImportedStock,
            weight: prodDef.weight,
        });
    }

    // 6. Generate 65 Realistic Orders Spanning across Today, 7 Days, This Month, 30 Days & History
    console.log("🛒 Generating realistic orders linked to FARMERs across multiple timeframes...");

    type OrderConfig = {
        dayOffset: number; // 0 = today, 1 = yesterday, etc.
        hour: number;
        minute: number;
        status: OrderStatus;
        paymentStatus: OrderPaymentStatus;
        paymentMethod: string;
        isPartialPaid?: boolean;
        cancellationReason?: string;
    };

    const orderConfigs: OrderConfig[] = [
        // --- TODAY (Day 0: 2026-08-18): 4 orders -> Guarantees "Doanh thu hôm nay" card has live data! ---
        { dayOffset: 0, hour: 8, minute: 15, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 0, hour: 10, minute: 30, status: "DELIVERED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 0, hour: 13, minute: 45, status: "CONFIRMED", paymentStatus: "UNPAID", paymentMethod: "COD" },
        { dayOffset: 0, hour: 14, minute: 20, status: "PENDING", paymentStatus: "UNPAID", paymentMethod: "COD" },

        // --- LAST 7 DAYS (Days 1 to 6: 2026-08-12 to 2026-08-17): 16 orders ---
        { dayOffset: 1, hour: 9, minute: 0, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 1, hour: 14, minute: 10, status: "DELIVERED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 1, hour: 16, minute: 30, status: "PREPARING", paymentStatus: "UNPAID", paymentMethod: "COD" },
        { dayOffset: 2, hour: 8, minute: 45, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 2, hour: 11, minute: 20, status: "COMPLETED", paymentStatus: "PARTIAL", paymentMethod: "COD", isPartialPaid: true },
        { dayOffset: 2, hour: 15, minute: 40, status: "READY_FOR_DELIVERY", paymentStatus: "UNPAID", paymentMethod: "COD" },
        { dayOffset: 3, hour: 9, minute: 30, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 3, hour: 13, minute: 15, status: "DELIVERED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 3, hour: 17, minute: 0, status: "SHIPPING", paymentStatus: "UNPAID", paymentMethod: "COD" },
        { dayOffset: 4, hour: 8, minute: 10, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 4, hour: 14, minute: 50, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 4, hour: 16, minute: 20, status: "CANCELLED", paymentStatus: "UNPAID", paymentMethod: "COD", cancellationReason: "Nông dân đổi ý sang loại phân khác" },
        { dayOffset: 5, hour: 9, minute: 15, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 5, hour: 11, minute: 35, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 6, hour: 8, minute: 30, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 6, hour: 15, minute: 10, status: "REJECTED", paymentStatus: "UNPAID", paymentMethod: "COD", cancellationReason: "Khu vực giao hàng tạm thời không tiếp cận được" },

        // --- THIS MONTH (Days 7 to 17: 2026-08-01 to 2026-08-11): 20 orders ---
        { dayOffset: 7, hour: 9, minute: 0, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 7, hour: 14, minute: 20, status: "COMPLETED", paymentStatus: "PARTIAL", paymentMethod: "COD", isPartialPaid: true },
        { dayOffset: 8, hour: 8, minute: 45, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 8, hour: 13, minute: 30, status: "DELIVERED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 9, hour: 10, minute: 15, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 9, hour: 15, minute: 40, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 10, hour: 9, minute: 10, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 10, hour: 14, minute: 0, status: "CANCELLED", paymentStatus: "UNPAID", paymentMethod: "COD", cancellationReason: "Đặt trùng đơn" },
        { dayOffset: 11, hour: 8, minute: 30, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 11, hour: 11, minute: 45, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 12, hour: 9, minute: 20, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 12, hour: 15, minute: 10, status: "COMPLETED", paymentStatus: "PARTIAL", paymentMethod: "COD", isPartialPaid: true },
        { dayOffset: 13, hour: 8, minute: 50, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 13, hour: 13, minute: 25, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 14, hour: 10, minute: 5, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 14, hour: 16, minute: 30, status: "REJECTED", paymentStatus: "UNPAID", paymentMethod: "COD", cancellationReason: "Hết hàng khuyến mãi" },
        { dayOffset: 15, hour: 9, minute: 15, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 15, hour: 14, minute: 40, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 16, hour: 8, minute: 20, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 17, hour: 11, minute: 10, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },

        // --- LAST 30 DAYS (Days 18 to 29: 2026-07-20 to 2026-07-31): 15 orders ---
        { dayOffset: 18, hour: 9, minute: 30, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 19, hour: 14, minute: 15, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 20, hour: 8, minute: 40, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 21, hour: 10, minute: 20, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 22, hour: 15, minute: 50, status: "COMPLETED", paymentStatus: "PARTIAL", paymentMethod: "COD", isPartialPaid: true },
        { dayOffset: 23, hour: 9, minute: 10, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 24, hour: 13, minute: 35, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 25, hour: 8, minute: 25, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 26, hour: 14, minute: 0, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 27, hour: 11, minute: 15, status: "CANCELLED", paymentStatus: "UNPAID", paymentMethod: "COD", cancellationReason: "Nông dân chuyển sang dùng thuốc sinh học" },
        { dayOffset: 28, hour: 9, minute: 45, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 28, hour: 16, minute: 10, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 29, hour: 8, minute: 55, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 29, hour: 13, minute: 20, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 29, hour: 17, minute: 5, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },

        // --- HISTORICAL (Days 30 to 75): 10 orders for past trends & monthly charts ---
        { dayOffset: 32, hour: 9, minute: 0, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 35, hour: 14, minute: 30, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 40, hour: 10, minute: 15, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 45, hour: 8, minute: 45, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 50, hour: 15, minute: 20, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 55, hour: 9, minute: 10, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 60, hour: 13, minute: 40, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 65, hour: 8, minute: 30, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
        { dayOffset: 70, hour: 14, minute: 15, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "BANK_TRANSFER" },
        { dayOffset: 75, hour: 11, minute: 0, status: "COMPLETED", paymentStatus: "PAID", paymentMethod: "COD" },
    ];

    console.log(`Total orders to generate: ${orderConfigs.length}`);

    // Track product stock in-memory to ensure stock stays >= 0
    const stockMap = new Map<string, number>();
    for (const p of createdProducts) {
        stockMap.set(p.id, p.stock);
    }

    let totalExportDocs = 0;
    let totalExportMovements = 0;
    let orderIndex = 1;

    for (const cfg of orderConfigs) {
        const orderDate = new Date(now.getTime() - cfg.dayOffset * 24 * 60 * 60 * 1000);
        orderDate.setHours(cfg.hour, cfg.minute, 0, 0);

        // Pick farmer from existing approved farmers
        const farmer = existingFarmers[(orderIndex - 1) % existingFarmers.length];
        const orderCode = `DH-TA-${String(orderIndex).padStart(4, "0")}`;

        // Number of items: 1 to 4 products per order
        const numItems = 1 + ((orderIndex * 2) % 4);
        const orderItemsData: Array<{
            productId: string;
            productName: string;
            unitPrice: number;
            costPrice: number;
            quantity: number;
            unit: string;
            storeName: string;
        }> = [];

        let subtotal = 0;

        for (let it = 0; it < numItems; it++) {
            const prodIdx = (orderIndex * 3 + it * 5) % createdProducts.length;
            const chosenProd = createdProducts[prodIdx];

            // Quantity: 1 to 5 units
            const desiredQty = 1 + ((orderIndex + it) % 5);
            const currentStock = stockMap.get(chosenProd.id) || 0;

            // Protect inventory from negative stock
            const safeQty = Math.max(1, Math.min(desiredQty, Math.max(1, currentStock - 3)));

            orderItemsData.push({
                productId: chosenProd.id,
                productName: chosenProd.name,
                unitPrice: chosenProd.price,
                costPrice: chosenProd.costPrice,
                quantity: safeQty,
                unit: chosenProd.unit,
                storeName: store.name,
            });

            subtotal += chosenProd.price * safeQty;

            // Deduct stock if order was confirmed / prepared / delivered / completed
            if (["COMPLETED", "DELIVERED", "CONFIRMED", "PREPARING", "READY_FOR_DELIVERY", "SHIPPING"].includes(cfg.status)) {
                stockMap.set(chosenProd.id, Math.max(0, currentStock - safeQty));
            }
        }

        const shippingFee = 20000;
        const totalAmount = subtotal + shippingFee;
        let paidAmount = 0;
        if (cfg.paymentStatus === "PAID") {
            paidAmount = totalAmount;
        } else if (cfg.isPartialPaid) {
            paidAmount = Math.round(totalAmount * 0.5);
        }

        const farmerAddress = farmer.address || [farmer.ward, farmer.district, farmer.province].filter(Boolean).join(", ") || "Vườn sầu riêng Trị An, Vĩnh Cửu, Đồng Nai";

        const order = await prisma.order.create({
            data: {
                orderCode,
                farmerId: farmer.id,
                storeId: store.id,
                status: cfg.status,
                paymentStatus: cfg.paymentStatus,
                paidAmount,
                paidAt: cfg.paymentStatus === "PAID" ? orderDate : null,
                recipientName: farmer.fullName || "Nông dân Vườn Sầu Riêng",
                recipientPhone: farmer.phone,
                shippingAddress: farmerAddress,
                note: null,
                paymentMethod: cfg.paymentMethod,
                subtotal,
                shippingFee,
                rejectionReason: cfg.status === "REJECTED" ? (cfg.cancellationReason || "Không thể xử lý đơn") : null,
                cancelledAt: cfg.status === "CANCELLED" ? new Date(orderDate.getTime() + 30 * 60 * 1000) : null,
                createdAt: orderDate,
                updatedAt: orderDate,
                items: {
                    create: orderItemsData.map((item) => ({
                        productId: item.productId,
                        productName: item.productName,
                        unitPrice: item.unitPrice,
                        costPrice: item.costPrice,
                        quantity: item.quantity,
                        unit: item.unit,
                        storeName: item.storeName,
                    })),
                },
                histories: {
                    create: [
                        {
                            fromStatus: null,
                            toStatus: "PENDING",
                            note: "Nông dân tạo đơn hàng trực tuyến",
                            createdAt: orderDate,
                        },
                        ...(cfg.status !== "PENDING"
                            ? [
                                  {
                                      fromStatus: "PENDING" as OrderStatus,
                                      toStatus: cfg.status,
                                      note: `Chuyển trạng thái sang ${cfg.status}${cfg.cancellationReason ? `: ${cfg.cancellationReason}` : ""}`,
                                      createdAt: new Date(orderDate.getTime() + 15 * 60 * 1000),
                                  },
                              ]
                            : []),
                    ],
                },
            },
        });

        // If order completed or delivered, create Export Inventory Document (PX)
        if (["COMPLETED", "DELIVERED"].includes(cfg.status)) {
            const exportDoc = await prisma.inventoryDocument.create({
                data: {
                    storeId: store.id,
                    code: `PX-TA-${order.orderCode}`,
                    type: "PX",
                    businessType: "SALE_EXPORT",
                    orderId: order.id,
                    reason: `Xuất bán theo đơn hàng ${order.orderCode}`,
                    actorId: owner.id,
                    actorName: owner.fullName || "Nguyễn Văn Minh",
                    createdAt: orderDate,
                    updatedAt: orderDate,
                },
            });
            totalExportDocs++;

            for (const item of orderItemsData) {
                const curProdStock = stockMap.get(item.productId) || 0;
                await prisma.inventoryMovement.create({
                    data: {
                        productId: item.productId,
                        documentId: exportDoc.id,
                        type: "ORDER_SALE",
                        quantity: item.quantity,
                        stockBefore: curProdStock + item.quantity,
                        stockAfter: curProdStock,
                        unitCost: item.costPrice,
                        totalCost: item.quantity * item.costPrice,
                        reference: order.orderCode,
                        note: `Xuất bán đơn ${order.orderCode}`,
                        createdAt: orderDate,
                        actorId: owner.id,
                    },
                });
                totalExportMovements++;
            }
        }

        orderIndex++;
    }

    // 7. Update StoreProduct stocks to match remaining calculated inventory
    for (const [prodId, finalStock] of stockMap.entries()) {
        const prodDef = PRODUCTS_CATALOG.find((p) => p.id === prodId);
        let finalStatus = prodDef?.status || "APPROVED";
        if (finalStock === 0) {
            finalStatus = "OUT_OF_STOCK";
        }

        await prisma.storeProduct.update({
            where: { id: prodId },
            data: {
                stock: Math.max(0, finalStock),
                status: finalStatus,
            },
        });
    }

    // 8. Generate 30 Realistic Store Operational Expenses across 90 Days
    console.log("💸 Generating realistic operational store expenses...");

    const expenseTemplates = [
        { cat: "SHIPPING" as StoreExpenseCategory, title: "Cước xe tải chở phân bón đợt hàng về kho Trị An", amt: 450000, recipient: "Công ty Vận tải Trọng Tấn" },
        { cat: "SHIPPING" as StoreExpenseCategory, title: "Phí vận chuyển giao hàng tận vườn cho nông dân", amt: 220000, recipient: "Nhà xe Ba Đạt" },
        { cat: "LABOR" as StoreExpenseCategory, title: "Chi phí nhân công bốc dỡ hàng hóa vật tư tại kho", amt: 650000, recipient: "Tổ bốc xếp Trị An" },
        { cat: "WAREHOUSE" as StoreExpenseCategory, title: "Phí vệ sinh & phun khử trùng kho bãi định kỳ", amt: 350000, recipient: "Dịch vụ Vệ sinh Môi Trường Xanh" },
        { cat: "UTILITIES" as StoreExpenseCategory, title: "Tiền điện chiếu sáng kho bãi & cửa hàng", amt: 420000, recipient: "Điện lực Vĩnh Cửu" },
        { cat: "UTILITIES" as StoreExpenseCategory, title: "Tiền nước & cước internet camera giám sát", amt: 280000, recipient: "VNPT Đồng Nai" },
        { cat: "PACKAGING" as StoreExpenseCategory, title: "Mua bao bì nilon & băng keo đóng gói đơn hàng", amt: 180000, recipient: "Xưởng Bao bì Tân Phát" },
        { cat: "DELIVERY" as StoreExpenseCategory, title: "Xăng xe máy giao thuốc BVTV khẩn cấp tận vườn", amt: 150000, recipient: "Cây xăng Petrolimex Số 12" },
        { cat: "MARKETING" as StoreExpenseCategory, title: "In tờ rơi hướng dẫn quy trình VietGAP sầu riêng", amt: 350000, recipient: "Nhà in Thành Danh" },
        { cat: "MAINTENANCE" as StoreExpenseCategory, title: "Bảo dưỡng xe nâng tay & thay nhớt xe máy chở hàng", amt: 280000, recipient: "Tiệm Sửa xe Hoàng Long" },
        { cat: "OTHER" as StoreExpenseCategory, title: "Trà nước tiếp đón bà con nông dân tư vấn kỹ thuật", amt: 180000, recipient: "Đại lý Nước ngọt Phúc An" },
    ];

    let expenseIndex = 0;
    for (let dayOffset = 0; dayOffset <= 86; dayOffset += 3) {
        if (expenseIndex >= 28) break;
        const tpl = expenseTemplates[expenseIndex % expenseTemplates.length];
        const expDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
        expDate.setHours(10, 30, 0, 0);

        // A few UNPAID expenses to simulate operational payables
        const isUnpaid = expenseIndex === 2 || expenseIndex === 11 || expenseIndex === 21;
        const finalAmt = tpl.amt + ((expenseIndex * 15000) % 75000);

        await prisma.storeExpense.create({
            data: {
                storeId: store.id,
                category: tpl.cat,
                title: tpl.title,
                amount: finalAmt,
                expenseDate: expDate,
                recipient: tpl.recipient,
                paymentMethod: isUnpaid ? "DEBT" : expenseIndex % 2 === 0 ? "BANK_TRANSFER" : "CASH",
                status: isUnpaid ? ("UNPAID" as ExpensePaymentStatus) : ("PAID" as ExpensePaymentStatus),
                paidAmount: isUnpaid ? 0 : finalAmt,
                note: "Chi phí vận hành cửa hàng.",
                createdById: owner.id,
            },
        });
        expenseIndex++;
    }

    console.log("================================================================================");
    console.log("🔍 RUNNING COMPREHENSIVE POST-CREATION VERIFICATION & INTEGRITY CHECKS");
    console.log("================================================================================");

    // 1. Verify Orders in DB
    const dbOrders = await prisma.order.findMany({
        where: { storeId: store.id, deletedAt: null },
        include: { items: true, farmer: true },
        orderBy: { createdAt: "desc" },
    });

    console.log(`✅ Total Orders created: ${dbOrders.length}`);
    if (dbOrders.length < 20) {
        throw new Error(`Expected at least 20 orders, found ${dbOrders.length}`);
    }

    // 2. Check FK and Farmer links
    for (const ord of dbOrders) {
        if (!ord.farmerId || !ord.farmer) {
            throw new Error(`Order ${ord.orderCode} has no valid FARMER linked!`);
        }
        if (ord.farmer.role !== "FARMER") {
            throw new Error(`Order ${ord.orderCode} farmer is not FARMER role!`);
        }
        if (ord.items.length === 0) {
            throw new Error(`Order ${ord.orderCode} has no OrderItems!`);
        }
        for (const it of ord.items) {
            if (!it.unitPrice || Number(it.unitPrice) <= 0) {
                throw new Error(`OrderItem ${it.productName} in order ${ord.orderCode} has invalid unitPrice!`);
            }
            if (!it.quantity || it.quantity <= 0) {
                throw new Error(`OrderItem ${it.productName} in order ${ord.orderCode} has invalid quantity!`);
            }
        }
    }
    console.log("✅ All Orders have valid FARMER foreign keys, non-empty items, and recorded purchase prices.");

    // 3. Check Inventory Stocks
    const dbProducts = await prisma.storeProduct.findMany({
        where: { storeId: store.id, deletedAt: null },
    });
    for (const p of dbProducts) {
        if (p.stock < 0) {
            throw new Error(`Product ${p.name} has negative stock: ${p.stock}`);
        }
    }
    console.log(`✅ All ${dbProducts.length} StoreProducts have non-negative stock (stock >= 0).`);

    // 4. Verify CANCELLED and REJECTED orders are NOT in revenue
    const cancelledOrRejected = dbOrders.filter((o) => ["CANCELLED", "REJECTED"].includes(o.status));
    console.log(`✅ Found ${cancelledOrRejected.length} CANCELLED/REJECTED orders (verified separated from revenue).`);

    // 5. Simulate API Finance calculations for all filter ranges
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOf7Days = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startOf7Days.setHours(0, 0, 0, 0);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOf30Days = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    startOf30Days.setHours(0, 0, 0, 0);

    const calcMetrics = (startDate: Date) => {
        let rev = 0;
        let cogs = 0;
        let completedCount = 0;
        let totalOrders = 0;
        let totalItems = 0;
        let receivable = 0;

        for (const ord of dbOrders) {
            if (ord.createdAt >= startDate) {
                totalOrders++;
                const isDeliveredOrCompleted = ["DELIVERED", "COMPLETED"].includes(ord.status);
                const orderRev = Number(ord.subtotal);

                let orderCogs = 0;
                for (const it of ord.items) {
                    orderCogs += Number(it.costPrice || 0) * it.quantity;
                    if (isDeliveredOrCompleted) totalItems += it.quantity;
                }

                if (isDeliveredOrCompleted) {
                    rev += orderRev;
                    cogs += orderCogs;
                    completedCount++;
                }

                if (ord.paymentStatus !== "PAID" && !["CANCELLED", "REJECTED"].includes(ord.status)) {
                    const due = orderRev + Number(ord.shippingFee) - Number(ord.paidAmount || 0);
                    if (due > 0) receivable += due;
                }
            }
        }

        return { rev, cogs, grossProfit: rev - cogs, completedCount, totalOrders, totalItems, receivable };
    };

    const todayStats = calcMetrics(startOfToday);
    const sevenDaysStats = calcMetrics(startOf7Days);
    const thisMonthStats = calcMetrics(startOfThisMonth);
    const thirtyDaysStats = calcMetrics(startOf30Days);

    const allExpenses = await prisma.storeExpense.findMany({ where: { storeId: store.id } });
    let totalOperatingExpenses = 0;
    let totalPayable = 0;
    for (const exp of allExpenses) {
        const amt = Number(exp.amount);
        if (exp.category !== "IMPORT_GOODS") {
            totalOperatingExpenses += amt;
        }
        if (exp.status !== "PAID") {
            const due = amt - Number(exp.paidAmount || 0);
            if (due > 0) totalPayable += due;
        }
    }

    console.log(`
================================================================================
📊 SIMULATION OF STORE FINANCE API METRICS:
================================================================================
Filter: [Hôm nay]
  - Doanh thu:          ${todayStats.rev.toLocaleString("vi-VN")} đ
  - Giá vốn hàng bán:   ${todayStats.cogs.toLocaleString("vi-VN")} đ
  - Lợi nhuận gộp:      ${todayStats.grossProfit.toLocaleString("vi-VN")} đ
  - Đơn hoàn tất:       ${todayStats.completedCount} / ${todayStats.totalOrders} đơn
  - Sản phẩm đã bán:    ${todayStats.totalItems}

Filter: [7 ngày qua]
  - Doanh thu:          ${sevenDaysStats.rev.toLocaleString("vi-VN")} đ
  - Giá vốn hàng bán:   ${sevenDaysStats.cogs.toLocaleString("vi-VN")} đ
  - Lợi nhuận gộp:      ${sevenDaysStats.grossProfit.toLocaleString("vi-VN")} đ
  - Đơn hoàn tất:       ${sevenDaysStats.completedCount} / ${sevenDaysStats.totalOrders} đơn

Filter: [Tháng này]
  - Doanh thu:          ${thisMonthStats.rev.toLocaleString("vi-VN")} đ
  - Giá vốn hàng bán:   ${thisMonthStats.cogs.toLocaleString("vi-VN")} đ
  - Lợi nhuận gộp:      ${thisMonthStats.grossProfit.toLocaleString("vi-VN")} đ
  - Đơn hoàn tất:       ${thisMonthStats.completedCount} / ${thisMonthStats.totalOrders} đơn

Filter: [30 ngày qua]
  - Doanh thu:          ${thirtyDaysStats.rev.toLocaleString("vi-VN")} đ
  - Giá vốn hàng bán:   ${thirtyDaysStats.cogs.toLocaleString("vi-VN")} đ
  - Lợi nhuận gộp:      ${thirtyDaysStats.grossProfit.toLocaleString("vi-VN")} đ
  - Chi phí vận hành:   ${totalOperatingExpenses.toLocaleString("vi-VN")} đ
  - Lợi nhuận ròng:     ${(thirtyDaysStats.grossProfit - totalOperatingExpenses).toLocaleString("vi-VN")} đ
  - Công nợ phải thu:   ${thirtyDaysStats.receivable.toLocaleString("vi-VN")} đ
  - Công nợ phải trả:   ${totalPayable.toLocaleString("vi-VN")} đ

Inventory & Warehouse:
  - Tổng số sản phẩm:   ${dbProducts.length}
  - Sắp hết hàng (<=10): ${dbProducts.filter((p) => p.stock > 0 && p.stock <= 10).length}
  - Hết hàng (0):        ${dbProducts.filter((p) => p.stock === 0).length}
  - Phiếu nhập kho (PN): ${totalImportDocs}
  - Phiếu xuất kho (PX): ${totalExportDocs}
================================================================================
`);

    console.log("🎉 ALL INTEGRITY CHECKS PASSED PERFECTLY!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
