import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_TAG = "STORE_FINANCE_DEMO";
const STORE_ID = "demo-store-minh-phat";
const OWNER_PHONE = "0909000001"; // Standard store owner login phone
const OWNER_EMAIL = "store.owner@triviet.vn";

// 24 Real agricultural products
const DEMO_PRODUCTS = [
    // --- PHÂN BÓN (FERTILIZER) ---
    {
        code: "NPK-16168",
        type: "FERTILIZER" as const,
        name: "Phân bón Đầu Trâu NPK 16-16-8+TE",
        brand: "Đầu Trâu",
        manufacturer: "Công ty CP Phân bón Bình Điền",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 50kg",
        price: 395000,
        salePrice: 385000,
        baseCost: 310000,
        initialStockTarget: 48,
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Cung cấp đạm, lân, kali cân đối giúp cây sinh trưởng khỏe mạnh, bung đọt đồng loạt.",
        composition: "N: 16%, P2O5: 16%, K2O: 8% + Vi lượng (TE)",
        weightWeight: 10, // top seller
    },
    {
        code: "NPK-202015",
        type: "FERTILIZER" as const,
        name: "Phân bón NPK 20-20-15 Bình Điền",
        brand: "Đầu Trâu",
        manufacturer: "Công ty CP Phân bón Bình Điền",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 520000,
        salePrice: 499000,
        baseCost: 420000,
        initialStockTarget: 35,
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Dinh dưỡng cao cấp nuôi trái lớn nhanh, tăng độ ngọt và phẩm chất cơm sầu riêng.",
        composition: "N: 20%, P2O5: 20%, K2O: 15%",
        weightWeight: 9, // top seller
    },
    {
        code: "NPK-15520",
        type: "FERTILIZER" as const,
        name: "Phân bón YaraMila Complex 15-5-20",
        brand: "Yara",
        manufacturer: "Yara International ASA",
        origin: "Na Uy",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 590000,
        salePrice: 575000,
        baseCost: 485000,
        initialStockTarget: 28,
        minStock: 8,
        targetStatus: "APPROVED" as const,
        description: "Phân khoáng cao cấp nhập khẩu chuyên dùng giai đoạn vào cơm, chống sượng múi.",
        composition: "N: 15%, P2O5: 5%, K2O: 20% + S, Mg",
        weightWeight: 8,
    },
    {
        code: "HC-SONGGIANH",
        type: "FERTILIZER" as const,
        name: "Phân hữu cơ vi sinh Sông Gianh",
        brand: "Sông Gianh",
        manufacturer: "Tổng Công ty Sông Gianh",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 195000,
        salePrice: 185000,
        baseCost: 150000,
        initialStockTarget: 65,
        minStock: 15,
        targetStatus: "APPROVED" as const,
        description: "Cải tạo đất chai cứng, tăng độ phì nhiêu và kích thích hệ vi sinh vật có ích.",
        composition: "Hữu cơ: 23%, Vi sinh vật cố định đạm, phân giải lân",
        weightWeight: 9, // top seller
    },
    {
        code: "HC-QUELAM",
        type: "FERTILIZER" as const,
        name: "Phân hữu cơ khoáng Quế Lâm 01",
        brand: "Quế Lâm",
        manufacturer: "Tập đoàn Quế Lâm",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 225000,
        salePrice: 215000,
        baseCost: 175000,
        initialStockTarget: 40,
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Bổ sung axit humic và fulvic giúp bộ rễ phát triển cực mạnh.",
        composition: "Hữu cơ: 15%, NPK: 3-5-2 + Acid Humic",
        weightWeight: 7,
    },
    {
        code: "DAP-PHILIP",
        type: "FERTILIZER" as const,
        name: "Phân DAP Philippines 18-46-0",
        brand: "Philphos",
        manufacturer: "Philippine Phosphate Fertilizer Corp",
        origin: "Philippines",
        unit: "bao",
        packaging: "Bao 50kg",
        price: 960000,
        salePrice: 940000,
        baseCost: 810000,
        initialStockTarget: 22,
        minStock: 5,
        targetStatus: "APPROVED" as const,
        description: "Cung cấp đạm và lân tan nhanh, kích thích phân hóa mầm hoa và đâm rễ non.",
        composition: "N: 18%, P2O5: 46%",
        weightWeight: 6,
    },
    {
        code: "K2SO4-HAIFA",
        type: "FERTILIZER" as const,
        name: "Phân Kali Sulphate K2SO4 Haifa Multi-K",
        brand: "Haifa",
        manufacturer: "Haifa Chemicals",
        origin: "Israel",
        unit: "bao",
        packaging: "Bao 25kg",
        price: 760000,
        salePrice: 740000,
        baseCost: 630000,
        initialStockTarget: 18,
        minStock: 5,
        targetStatus: "APPROVED" as const,
        description: "Kali trắng không chứa clo, giúp sầu riêng lên màu vàng đều, dẻo ngọt đặc trưng.",
        composition: "K2O: 52%, S: 18%",
        weightWeight: 7,
    },
    {
        code: "LAN-VANDIEN",
        type: "FERTILIZER" as const,
        name: "Phân lân nung chảy Văn Điển",
        brand: "Văn Điển",
        manufacturer: "Công ty CP Phân lân nung chảy Văn Điển",
        origin: "Việt Nam",
        unit: "bao",
        packaging: "Bao 50kg",
        price: 270000,
        salePrice: 260000,
        baseCost: 210000,
        initialStockTarget: 50,
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Khử chua hạ phèn, bổ sung canxi và magie giúp cứng cây, dày lá.",
        composition: "P2O5: 16%, CaO: 30%, MgO: 15%, SiO2: 24%",
        weightWeight: 5,
    },
    {
        code: "CANXI-BO",
        type: "FERTILIZER" as const,
        name: "Phân bón lá Canxi Bo Sữa Chống Rụng Trái",
        brand: "AgriTech",
        manufacturer: "Công ty Nông nghiệp Xanh",
        origin: "Việt Nam",
        unit: "chai",
        packaging: "Chai 500ml",
        price: 135000,
        salePrice: 125000,
        baseCost: 95000,
        initialStockTarget: 5, // LOW STOCK test
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Tăng độ dai cuống, chống rụng hoa và trái non sinh lý hiệu quả.",
        composition: "Canxi: 12%, Bo: 20.000 ppm",
        weightWeight: 9, // top seller
    },
    {
        code: "HUMIC-USA",
        type: "FERTILIZER" as const,
        name: "Axit Humic Diamond Grow 99% Kích Rễ",
        brand: "Diamond Grow",
        manufacturer: "Humic Growth Solutions",
        origin: "Mỹ",
        unit: "gói",
        packaging: "Gói 1kg",
        price: 120000,
        salePrice: 110000,
        baseCost: 85000,
        initialStockTarget: 4, // LOW STOCK test
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Phục hồi cây sau thu hoạch, giải độc phèn ngộ độc hữu cơ.",
        composition: "Potassium Humate: 99%, Acid Humic: 85%",
        weightWeight: 8,
    },
    {
        code: "AMINO-SEAWEED",
        type: "FERTILIZER" as const,
        name: "Phân sinh học Amino Rong Biển Canada",
        brand: "Acadian",
        manufacturer: "Acadian Seaplants",
        origin: "Canada",
        unit: "chai",
        packaging: "Chai 1 lít",
        price: 280000,
        salePrice: null,
        baseCost: 215000,
        initialStockTarget: 0, // OUT OF STOCK test
        minStock: 8,
        targetStatus: "OUT_OF_STOCK" as const,
        description: "Dưỡng đọt mập, bóng lá, giải nhiệt cho cây trong mùa nắng hạn.",
        composition: "Chiết xuất rong biển hữu cơ 100% + 17 loại Axit Amin",
        weightWeight: 6,
    },
    {
        code: "FERT-MICRONUTRIENT",
        type: "FERTILIZER" as const,
        name: "Vi lượng Chelate Combi Fetrilon",
        brand: "Bayer",
        manufacturer: "Bayer CropScience",
        origin: "Đức",
        unit: "gói",
        packaging: "Gói 25g",
        price: 45000,
        salePrice: 40000,
        baseCost: 28000,
        initialStockTarget: 80,
        minStock: 20,
        targetStatus: "APPROVED" as const,
        description: "Phòng ngừa hiện tượng vàng lá do thiếu hụt vi lượng kẽm, sắt, mangan.",
        composition: "Fe, Zn, Mn, Cu, Mo dạng chelate",
        weightWeight: 5,
    },

    // --- THUỐC BVTV & CHẾ PHẨM SINH HỌC (PESTICIDE) ---
    {
        code: "AMISTAR-TOP",
        type: "PESTICIDE" as const,
        name: "Thuốc trừ bệnh Amistar Top 325SC",
        brand: "Syngenta",
        manufacturer: "Syngenta Crop Protection AG",
        origin: "Thụy Sĩ",
        unit: "chai",
        packaging: "Chai 250ml",
        price: 245000,
        salePrice: 235000,
        baseCost: 190000,
        initialStockTarget: 32,
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Đặc trị thán thư, đốm lá mắt cua và nấm hồng trên cành lá sầu riêng.",
        composition: "Azoxystrobin 200g/l + Difenoconazole 125g/l",
        phiDays: 14,
        weightWeight: 9, // top seller
    },
    {
        code: "RIDOMIL-GOLD",
        type: "PESTICIDE" as const,
        name: "Thuốc trừ nấm Ridomil Gold 68WG",
        brand: "Syngenta",
        manufacturer: "Syngenta Crop Protection AG",
        origin: "Thụy Sĩ",
        unit: "gói",
        packaging: "Gói 100g",
        price: 55000,
        salePrice: 50000,
        baseCost: 39000,
        initialStockTarget: 45,
        minStock: 15,
        targetStatus: "APPROVED" as const,
        description: "Quét vết thương thân xì mủ, tưới gốc trị thối rễ do Phytophthora.",
        composition: "Metalaxyl-M 40g/kg + Mancozeb 640g/kg",
        phiDays: 14,
        weightWeight: 8,
    },
    {
        code: "CHAMPION-77WP",
        type: "PESTICIDE" as const,
        name: "Thuốc trừ nấm gốc đồng Champion 77WP",
        brand: "Nufarm",
        manufacturer: "Nufarm Vietnam",
        origin: "Úc",
        unit: "gói",
        packaging: "Gói 1kg",
        price: 215000,
        salePrice: 205000,
        baseCost: 168000,
        initialStockTarget: 25,
        minStock: 8,
        targetStatus: "APPROVED" as const,
        description: "Rửa vườn sau thu hoạch, phòng trừ rong rêu mảng bám trên thân cây.",
        composition: "Copper Hydroxide 77% w/w",
        phiDays: 7,
        weightWeight: 6,
    },
    {
        code: "RADIANT-60SC",
        type: "PESTICIDE" as const,
        name: "Thuốc trừ rầy bọ trĩ Radiant 60SC",
        brand: "Corteva",
        manufacturer: "Corteva Agriscience",
        origin: "Mỹ",
        unit: "chai",
        packaging: "Chai 100ml",
        price: 145000,
        salePrice: 138000,
        baseCost: 110000,
        initialStockTarget: 3, // LOW STOCK test
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Thuốc sinh học diệt trừ bọ trĩ, sâu đục trái, sâu ăn bông thế hệ mới.",
        composition: "Spinetoram 60g/L",
        phiDays: 3,
        weightWeight: 8,
    },
    {
        code: "TRANG-XANH",
        type: "PESTICIDE" as const,
        name: "Chế phẩm nấm ký sinh côn trùng Trắng Xanh WP",
        brand: "Đức Thành",
        manufacturer: "Công ty TNHH Đức Thành",
        origin: "Việt Nam",
        unit: "gói",
        packaging: "Gói 500g",
        price: 165000,
        salePrice: null,
        baseCost: 125000,
        initialStockTarget: 26,
        minStock: 8,
        targetStatus: "APPROVED" as const,
        description: "Nấm xanh nấm trắng ký sinh tiêu diệt rầy phấn trắng, bọ cánh cứng an toàn sinh học.",
        composition: "Beauveria bassiana + Metarhizium anisopliae",
        phiDays: 0,
        weightWeight: 6,
    },
    {
        code: "NEEM-GREEN",
        type: "PESTICIDE" as const,
        name: "Thuốc trừ sâu thảo mộc NeemNim Green 0.3EC",
        brand: "Ngân Anh",
        manufacturer: "Công ty TNHH Ngân Anh",
        origin: "Việt Nam",
        unit: "chai",
        packaging: "Chai 400ml",
        price: 195000,
        salePrice: 185000,
        baseCost: 145000,
        initialStockTarget: 30,
        minStock: 8,
        targetStatus: "APPROVED" as const,
        description: "Chiết xuất tinh dầu hạt neem xua đuổi côn trùng chích hút, an toàn chuẩn VietGAP.",
        composition: "Azadirachtin 0.3%",
        phiDays: 3,
        weightWeight: 5,
    },
    {
        code: "TRICHO-BIO",
        type: "PESTICIDE" as const,
        name: "Chế phẩm nấm đối kháng Trichoderma Bacillus Bio",
        brand: "Viện BVTV",
        manufacturer: "Trung tâm CNSH Nông nghiệp",
        origin: "Việt Nam",
        unit: "gói",
        packaging: "Gói 1kg",
        price: 85000,
        salePrice: 79000,
        baseCost: 58000,
        initialStockTarget: 50,
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Ủ phân hữu cơ chuồng và tưới ngừa nấm rễ tuyến trùng trong đất trồng.",
        composition: "Trichoderma viride, Bacillus subtilis",
        phiDays: 0,
        weightWeight: 7,
    },
    {
        code: "BITADIN-WP",
        type: "PESTICIDE" as const,
        name: "Thuốc trừ sâu vi sinh Bitadin WP",
        brand: "Nông Sinh",
        manufacturer: "Công ty Nông Sinh",
        origin: "Việt Nam",
        unit: "gói",
        packaging: "Gói 500g",
        price: 148000,
        salePrice: 139000,
        baseCost: 112000,
        initialStockTarget: 0, // OUT OF STOCK test
        minStock: 10,
        targetStatus: "OUT_OF_STOCK" as const,
        description: "Vi khuẩn BT tiêu diệt sâu đục thân và sâu tơ ăn lá non.",
        composition: "Bacillus thuringiensis var. kurstaki",
        phiDays: 0,
        weightWeight: 4,
    },

    // --- VẬT TƯ NÔNG NGHIỆP KHÁC ---
    {
        code: "DAY-NEO-CANH",
        type: "FERTILIZER" as const, // stored in current schema enum
        name: "Dây nilon chuyên dụng neo cành sầu riêng chịu lực",
        brand: "Thái An",
        manufacturer: "Nhựa Thái An",
        origin: "Việt Nam",
        unit: "cuộn",
        packaging: "Cuộn 1kg (~500m)",
        price: 65000,
        salePrice: 60000,
        baseCost: 45000,
        initialStockTarget: 60,
        minStock: 15,
        targetStatus: "APPROVED" as const,
        description: "Dây neo cành mang trái chống gió bão gãy nhánh, chống tia UV độ bền trên 2 năm.",
        composition: "Nhựa nguyên sinh HDPE chống lão hóa",
        weightWeight: 7,
    },
    {
        code: "TUI-BAO-TRAI",
        type: "PESTICIDE" as const,
        name: "Túi vải bao trái sầu riêng chống sâu đục (Lốc 50 cái)",
        brand: "Bảo Nông",
        manufacturer: "Bao bì Nông nghiệp Á Châu",
        origin: "Việt Nam",
        unit: "lốc",
        packaging: "Lốc 50 cái",
        price: 240000,
        salePrice: 220000,
        baseCost: 175000,
        initialStockTarget: 38,
        minStock: 10,
        targetStatus: "APPROVED" as const,
        description: "Bao trái chống rệp sáp, sâu đục và rám nắng, tái sử dụng 2 vụ.",
        composition: "Vải không dệt thoáng khí có dây rút inox",
        weightWeight: 8,
    },
    {
        code: "BAT-PHU-GOC",
        type: "FERTILIZER" as const,
        name: "Bạt phủ gốc sầu riêng xử lý ra hoa nghịch vụ (Khổ 4m x 50m)",
        brand: "Đại Nam",
        manufacturer: "Bạt nhựa Đại Nam",
        origin: "Việt Nam",
        unit: "cuộn",
        packaging: "Cuộn 50 mét",
        price: 420000,
        salePrice: null,
        baseCost: 320000,
        initialStockTarget: 6, // LOW STOCK test
        minStock: 5,
        targetStatus: "APPROVED" as const,
        description: "Đậy gốc xiết nước ép cây phân hóa mầm hoa đồng loạt.",
        composition: "Nhựa PE cán màng trắng bạc",
        weightWeight: 3, // slow moving item test
    },
    {
        code: "BINH-XIT-OSHIMA",
        type: "PESTICIDE" as const,
        name: "Bình xịt điện Oshima 20L bơm đôi cực mạnh",
        brand: "Oshima",
        manufacturer: "Oshima Japan Technology",
        origin: "Trung Quốc",
        unit: "bộ",
        packaging: "Thùng 1 chiếc",
        price: 920000,
        salePrice: 890000,
        baseCost: 710000,
        initialStockTarget: 8,
        minStock: 3,
        targetStatus: "DRAFT" as const, // DRAFT test
        description: "Bình phun điện ắc quy 12V-12Ah, áp lực phun sương cao tới đọt sầu riêng.",
        composition: "Vỏ nhựa cao cấp + ắc quy khô chì",
        weightWeight: 2, // low volume
    },
];

// 20 FARMER Customers
const DEMO_FARMERS = [
    { name: "Nguyễn Văn An", phone: "0981000001", email: "farmer.an@triviet.vn", address: "Ấp 1, Xã Trị An, Huyện Vĩnh Cửu, Đồng Nai" },
    { name: "Trần Minh Hùng", phone: "0981000002", email: "farmer.hung@triviet.vn", address: "Ấp 3, Xã Mã Đà, Huyện Vĩnh Cửu, Đồng Nai" },
    { name: "Lê Hoàng Phúc", phone: "0981000003", email: "farmer.phuc@triviet.vn", address: "Ấp 2, Xã Hiếu Liêm, Huyện Vĩnh Cửu, Đồng Nai" },
    { name: "Phạm Quốc Bình", phone: "0981000004", email: "farmer.binh@triviet.vn", address: "Xã Tân An, Huyện Vĩnh Cửu, Đồng Nai" },
    { name: "Võ Văn Tấn", phone: "0981000005", email: "farmer.tan@triviet.vn", address: "Ấp Cây Gáo, Xã Cây Gáo, Trảng Bom, Đồng Nai" },
    { name: "Đỗ Thị Mai", phone: "0981000006", email: "farmer.mai@triviet.vn", address: "Xã Sông Thao, Huyện Trảng Bom, Đồng Nai" },
    { name: "Hoàng Văn Nam", phone: "0981000007", email: "farmer.nam@triviet.vn", address: "Xã Bàu Hàm, Huyện Thống Nhất, Đồng Nai" },
    { name: "Phan Văn Lộc", phone: "0981000008", email: "farmer.loc@triviet.vn", address: "Xã Gia Tân 1, Huyện Thống Nhất, Đồng Nai" },
    { name: "Bùi Thị Tuyết", phone: "0981000009", email: "farmer.tuyet@triviet.vn", address: "Xã Xuân Quế, Huyện Cẩm Mỹ, Đồng Nai" },
    { name: "Đặng Hữu Phước", phone: "0981000010", email: "farmer.phuoc@triviet.vn", address: "Xã Sông Ray, Huyện Cẩm Mỹ, Đồng Nai" },
    { name: "Vũ Đình Trọng", phone: "0981000011", email: "farmer.trong@triviet.vn", address: "Xã Long Giao, Huyện Cẩm Mỹ, Đồng Nai" },
    { name: "Trương Quốc Tuấn", phone: "0981000012", email: "farmer.tuan@triviet.vn", address: "Xã Phú Tân, Huyện Định Quán, Đồng Nai" },
    { name: "Ngô Văn Khang", phone: "0981000013", email: "farmer.khang@triviet.vn", address: "Xã La Ngà, Huyện Định Quán, Đồng Nai" },
    { name: "Lý Văn Dũng", phone: "0981000014", email: "farmer.dung@triviet.vn", address: "Xã Phú Vinh, Huyện Định Quán, Đồng Nai" },
    { name: "Đinh Thị Hạnh", phone: "0981000015", email: "farmer.hanh@triviet.vn", address: "Xã Phú Hòa, Huyện Định Quán, Đồng Nai" },
    { name: "Tạ Văn Cường", phone: "0981000016", email: "farmer.cuong@triviet.vn", address: "Xã Thanh Sơn, Huyện Định Quán, Đồng Nai" },
    { name: "Hồ Văn Long", phone: "0981000017", email: "farmer.long@triviet.vn", address: "Xã Phú An, Huyện Tân Phú, Đồng Nai" },
    { name: "Dương Thị Thu", phone: "0981000018", email: "farmer.thu@triviet.vn", address: "Xã Nam Cát Tiên, Huyện Tân Phú, Đồng Nai" },
    { name: "Mai Văn Thành", phone: "0981000019", email: "farmer.thanh@triviet.vn", address: "Xã Tà Lài, Huyện Tân Phú, Đồng Nai" },
    { name: "Cao Văn Đạt", phone: "0981000020", email: "farmer.dat@triviet.vn", address: "Thị trấn Tân Phú, Huyện Tân Phú, Đồng Nai" },
];

// Helper random generator with seed reproducibility
function pseudoRandom(seed: number) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

async function main() {
    console.log("🌱 STARTING STORE FINANCE DEMO SEED");
    console.log("=================================================");

    const hashedPassword = await bcryptjs.hash("123456", 10);

    // 1. Create or Update STORE_OWNER user & Store
    const owner = await prisma.user.upsert({
        where: { phone: OWNER_PHONE },
        update: {
            email: OWNER_EMAIL,
            fullName: "Nguyễn Văn Minh",
            role: "STORE_OWNER",
            isApproved: true,
            accountStatus: "APPROVED",
            isLocked: false,
            approvedAt: new Date(),
        },
        create: {
            phone: OWNER_PHONE,
            email: OWNER_EMAIL,
            password: hashedPassword,
            fullName: "Nguyễn Văn Minh",
            role: "STORE_OWNER",
            isApproved: true,
            accountStatus: "APPROVED",
            approvedAt: new Date(),
        },
    });

    const store = await prisma.store.upsert({
        where: { id: STORE_ID },
        update: {
            ownerId: owner.id,
            representativeName: "Nguyễn Văn Minh",
            representativePhone: owner.phone,
            representativeEmail: owner.email,
            identityNumber: "075088012345",
            name: "Cửa hàng Vật tư Nông nghiệp Minh Phát",
            taxOrBusinessCode: "0314889988",
            address: "Số 88 Quốc Lộ 1A, Xã Trị An, Huyện Vĩnh Cửu, Tỉnh Đồng Nai",
            phone: OWNER_PHONE,
            openingHours: "06:30 - 18:30 (Thứ 2 - Chủ Nhật)",
            description: "Đại lý cấp 1 phân phối phân bón, thuốc BVTV sinh học, vật tư chuyên dùng sầu riêng VietGAP/GACC.",
            status: "APPROVED",
            submittedAt: new Date(),
            approvedAt: new Date(),
            deletedAt: null,
        },
        create: {
            id: STORE_ID,
            ownerId: owner.id,
            representativeName: "Nguyễn Văn Minh",
            representativePhone: owner.phone,
            representativeEmail: owner.email,
            identityNumber: "075088012345",
            name: "Cửa hàng Vật tư Nông nghiệp Minh Phát",
            taxOrBusinessCode: "0314889988",
            address: "Số 88 Quốc Lộ 1A, Xã Trị An, Huyện Vĩnh Cửu, Tỉnh Đồng Nai",
            phone: OWNER_PHONE,
            openingHours: "06:30 - 18:30 (Thứ 2 - Chủ Nhật)",
            description: "Đại lý cấp 1 phân phối phân bón, thuốc BVTV sinh học, vật tư chuyên dùng sầu riêng VietGAP/GACC.",
            status: "APPROVED",
            submittedAt: new Date(),
            approvedAt: new Date(),
        },
    });

    console.log(`✅ Store: ${store.name} (Owner: ${owner.fullName} - ${owner.phone})`);

    // 2. Clean previous DEMO data for this store to prevent duplicate growth
    console.log("🧹 Cleaning previous demo data for store...");
    await prisma.storeExpense.deleteMany({ where: { storeId: store.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { order: { storeId: store.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { storeId: store.id } } });
    await prisma.inventoryMovement.deleteMany({ where: { document: { storeId: store.id } } });
    await prisma.inventoryDocument.deleteMany({ where: { storeId: store.id } });
    await prisma.order.deleteMany({ where: { storeId: store.id } });
    await prisma.storeProduct.deleteMany({ where: { storeId: store.id } });

    // 3. Create Farmers
    console.log("👨‍🌾 Creating 20 Farmer accounts...");
    const farmerUsers: Array<{ id: string; fullName: string; phone: string; email: string; address: string }> = [];

    for (const f of DEMO_FARMERS) {
        const u = await prisma.user.upsert({
            where: { phone: f.phone },
            update: {
                fullName: f.name,
                email: f.email,
                role: "FARMER",
                isApproved: true,
                accountStatus: "APPROVED",
            },
            create: {
                phone: f.phone,
                email: f.email,
                password: hashedPassword,
                fullName: f.name,
                role: "FARMER",
                isApproved: true,
                accountStatus: "APPROVED",
            },
        });
        farmerUsers.push({ id: u.id, fullName: u.fullName || f.name, phone: u.phone || f.phone, email: u.email || f.email, address: f.address });
    }

    // 4. Create Products & Import Batches over 90 days
    console.log(`📦 Creating ${DEMO_PRODUCTS.length} Store Products and multi-batch import history...`);
    const now = new Date();
    const createdProducts: Array<{
        id: string;
        code: string;
        name: string;
        unit: string;
        price: number;
        costPrice: number;
        stock: number;
        weightWeight: number;
    }> = [];

    let totalImportDocsCount = 0;
    let totalImportMovementsCount = 0;

    for (let i = 0; i < DEMO_PRODUCTS.length; i++) {
        const p = DEMO_PRODUCTS[i];
        const prodId = `demo-prod-${p.code.toLowerCase()}`;

        // Generate 1 to 3 import batches across 90 days
        const batchCount = (i % 3) + 1;
        let totalImportedQty = 0;
        let totalImportedCost = 0;
        const importBatches: Array<{ date: Date; qty: number; unitCost: number }> = [];

        for (let b = 0; b < batchCount; b++) {
            const daysAgo = Math.floor(85 - (b * 28) + (i % 5));
            const importDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            importDate.setHours(8 + (b * 2), 30, 0, 0);

            // Import quantity
            let batchQty = Math.floor(p.initialStockTarget / batchCount) + 12;
            if (p.initialStockTarget === 0) {
                batchQty = b === 0 ? 6 : 4; // small batch that will be completely sold out
            }
            // Slight cost variation +/- 2%
            const costVariation = 1 + (((i * 3 + b * 7) % 7) - 3) * 0.01;
            const unitCost = Math.round(p.baseCost * costVariation);

            importBatches.push({ date: importDate, qty: batchQty, unitCost });
            totalImportedQty += batchQty;
            totalImportedCost += batchQty * unitCost;
        }

        // Weighted Average Cost Price
        const weightedCostPrice = Math.round(totalImportedCost / totalImportedQty);

        // Initial Product creation with total imported stock
        const createdProd = await prisma.storeProduct.create({
            data: {
                id: prodId,
                storeId: store.id,
                type: p.type,
                name: p.name,
                brand: p.brand,
                manufacturer: p.manufacturer,
                origin: p.origin,
                unit: p.unit,
                packaging: p.packaging,
                price: p.price,
                salePrice: p.salePrice,
                costPrice: weightedCostPrice,
                stock: totalImportedQty, // Will be decremented by sold orders later
                composition: p.composition,
                phiDays: (p as any).phiDays || null,
                status: p.targetStatus,
                description: p.description,
            },
        });

        // Create Inventory Documents & Movements for each batch
        let runningStock = 0;
        for (let b = 0; b < importBatches.length; b++) {
            const batch = importBatches[b];
            const stockBefore = runningStock;
            runningStock += batch.qty;

            const docCode = `PN-MP-${p.code}-${b + 1}`;
            const doc = await prisma.inventoryDocument.create({
                data: {
                    storeId: store.id,
                    code: docCode,
                    type: "PN",
                    businessType: "SUPPLIER_IMPORT",
                    supplierName: p.manufacturer || "Nhà phân phối Vật tư Nông nghiệp",
                    reason: `Nhập lô hàng đợt ${b + 1} - ${p.name}`,
                    createdAt: batch.date,
                    updatedAt: batch.date,
                    actorName: owner.fullName,
                    actorId: owner.id,
                },
            });
            totalImportDocsCount++;

            await prisma.inventoryMovement.create({
                data: {
                    productId: createdProd.id,
                    documentId: doc.id,
                    type: "IMPORT",
                    quantity: batch.qty,
                    stockBefore,
                    stockAfter: runningStock,
                    unitCost: batch.unitCost,
                    totalCost: batch.qty * batch.unitCost,
                    note: `Nhập kho ${batch.qty} ${p.unit}`,
                    createdAt: batch.date,
                    actorId: owner.id,
                },
            });
            totalImportMovementsCount++;
        }

        createdProducts.push({
            id: createdProd.id,
            code: p.code,
            name: createdProd.name,
            unit: createdProd.unit,
            price: Number(createdProd.salePrice || createdProd.price),
            costPrice: weightedCostPrice,
            stock: totalImportedQty,
            weightWeight: p.weightWeight,
        });
    }

    // 5. Generate 100 Orders over 90 Days
    console.log("🛒 Generating 100 realistic orders distributed across 90 days...");

    const totalOrdersToCreate = 100;
    const orderDistribution: Array<{
        dayOffset: number; // 0 = today, 1 = yesterday, etc.
        status: "COMPLETED" | "DELIVERED" | "CONFIRMED" | "PREPARING" | "PENDING" | "CANCELLED" | "REJECTED";
        paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
    }> = [];

    // TODAY (Day 0): 4 Orders ensuring TODAY's dashboard cards have realistic live numbers
    orderDistribution.push(
        { dayOffset: 0, status: "COMPLETED", paymentStatus: "PAID" },
        { dayOffset: 0, status: "DELIVERED", paymentStatus: "PAID" },
        { dayOffset: 0, status: "CONFIRMED", paymentStatus: "UNPAID" },
        { dayOffset: 0, status: "PENDING", paymentStatus: "UNPAID" }
    );

    // Days 1 to 7 (Last 7 days): 14 orders
    for (let d = 1; d <= 7; d++) {
        orderDistribution.push({ dayOffset: d, status: "COMPLETED", paymentStatus: "PAID" });
        orderDistribution.push({ dayOffset: d, status: d % 2 === 0 ? "DELIVERED" : "COMPLETED", paymentStatus: d % 3 === 0 ? "PARTIAL" : "PAID" });
    }
    orderDistribution.push({ dayOffset: 1, status: "PREPARING", paymentStatus: "UNPAID" });
    orderDistribution.push({ dayOffset: 2, status: "PENDING", paymentStatus: "UNPAID" });

    // Days 8 to 30 (Last 30 days): 38 orders
    for (let d = 8; d <= 30; d++) {
        orderDistribution.push({ dayOffset: d, status: "COMPLETED", paymentStatus: "PAID" });
        if (d % 3 === 0) {
            orderDistribution.push({ dayOffset: d, status: "COMPLETED", paymentStatus: d % 6 === 0 ? "PARTIAL" : "PAID" });
        }
        if (d % 7 === 0) {
            orderDistribution.push({ dayOffset: d, status: "CANCELLED", paymentStatus: "UNPAID" });
        }
    }

    // Days 31 to 90 (Historical): Remaining ~40 orders
    for (let d = 31; d <= 88; d += 2) {
        if (orderDistribution.length >= totalOrdersToCreate) break;
        const isCancel = d % 17 === 0;
        const isReject = d % 23 === 0;
        orderDistribution.push({
            dayOffset: d,
            status: isCancel ? "CANCELLED" : isReject ? "REJECTED" : "COMPLETED",
            paymentStatus: isCancel || isReject ? "UNPAID" : "PAID",
        });
    }

    // Sort order distributions
    let orderIndex = 1;
    let totalExportDocsCount = 0;

    // Track product stock deductions
    const productStockMap = new Map<string, number>();
    for (const p of createdProducts) {
        productStockMap.set(p.id, p.stock);
    }

    for (const ordConfig of orderDistribution) {
        const orderDate = new Date(now.getTime() - ordConfig.dayOffset * 24 * 60 * 60 * 1000);
        // Realistic hours: 7:00 to 17:30
        const randHour = 7 + (orderIndex % 10);
        const randMin = (orderIndex * 17) % 60;
        orderDate.setHours(randHour, randMin, 0, 0);

        const farmer = farmerUsers[orderIndex % farmerUsers.length];
        const orderCode = `DH-MP-${String(orderIndex).padStart(4, "0")}`;

        // Select 1 to 4 items with weighted selection
        const itemCount = 1 + (orderIndex % 3);
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

        for (let itemIdx = 0; itemIdx < itemCount; itemIdx++) {
            // Weighted selection: higher weightWeight gets selected more often
            const prodCandidateIdx = (orderIndex * 3 + itemIdx * 7) % createdProducts.length;
            const chosenProd = createdProducts[prodCandidateIdx];

            // Quantity: 1 to 6
            const qty = 1 + ((orderIndex + itemIdx) % 4);
            const currentAvailableStock = productStockMap.get(chosenProd.id) || 0;

            // Make sure we never sell more than available to keep stock >= target
            const safeQty = Math.max(1, Math.min(qty, Math.max(1, currentAvailableStock - 5)));

            const itemUnitPrice = chosenProd.price;
            const itemCostPrice = chosenProd.costPrice;

            orderItemsData.push({
                productId: chosenProd.id,
                productName: chosenProd.name,
                unitPrice: itemUnitPrice,
                costPrice: itemCostPrice,
                quantity: safeQty,
                unit: chosenProd.unit,
                storeName: store.name,
            });

            subtotal += itemUnitPrice * safeQty;

            // If order is completed/delivered/preparing/confirmed, deduct from stock
            if (["COMPLETED", "DELIVERED", "CONFIRMED", "PREPARING"].includes(ordConfig.status)) {
                productStockMap.set(chosenProd.id, Math.max(0, currentAvailableStock - safeQty));
            }
        }

        const shippingFee = 20000;
        const totalWithShipping = subtotal + shippingFee;
        let paidAmount = 0;
        if (ordConfig.paymentStatus === "PAID") {
            paidAmount = totalWithShipping;
        } else if (ordConfig.paymentStatus === "PARTIAL") {
            paidAmount = Math.round(totalWithShipping * 0.5);
        }

        const createdOrder = await prisma.order.create({
            data: {
                orderCode,
                farmerId: farmer.id,
                storeId: store.id,
                status: ordConfig.status,
                paymentStatus: ordConfig.paymentStatus,
                paidAmount,
                paidAt: ordConfig.paymentStatus === "PAID" ? orderDate : null,
                recipientName: farmer.fullName,
                recipientPhone: farmer.phone,
                shippingAddress: farmer.address,
                paymentMethod: "COD",
                subtotal,
                shippingFee,
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
                            note: "Khách hàng tạo đơn hàng",
                            createdAt: orderDate,
                        },
                        ...(ordConfig.status !== "PENDING"
                            ? [
                                  {
                                      fromStatus: "PENDING" as const,
                                      toStatus: ordConfig.status,
                                      note: `Chủ cửa hàng cập nhật trạng thái ${ordConfig.status}`,
                                      createdAt: new Date(orderDate.getTime() + 15 * 60 * 1000),
                                  },
                              ]
                            : []),
                    ],
                },
            },
        });

        // If completed or delivered, create export inventory document
        if (["COMPLETED", "DELIVERED"].includes(ordConfig.status)) {
            const exportDoc = await prisma.inventoryDocument.create({
                data: {
                    storeId: store.id,
                    code: `PX-MP-${createdOrder.orderCode}`,
                    type: "PX",
                    businessType: "SALE_EXPORT",
                    orderId: createdOrder.id,
                    reason: `Xuất bán đơn hàng ${createdOrder.orderCode}`,
                    actorName: owner.fullName,
                    actorId: owner.id,
                    createdAt: orderDate,
                    updatedAt: orderDate,
                },
            });
            totalExportDocsCount++;

            for (const item of orderItemsData) {
                await prisma.inventoryMovement.create({
                    data: {
                        productId: item.productId,
                        documentId: exportDoc.id,
                        type: "ORDER_SALE",
                        quantity: item.quantity,
                        stockBefore: (productStockMap.get(item.productId) || 0) + item.quantity,
                        stockAfter: productStockMap.get(item.productId) || 0,
                        unitCost: item.costPrice,
                        totalCost: item.quantity * item.costPrice,
                        note: `Xuất bán theo đơn ${createdOrder.orderCode}`,
                        createdAt: orderDate,
                        actorId: owner.id,
                    },
                });
            }
        }

        orderIndex++;
    }

    // 6. Update Product stocks to reflect final inventory
    for (const [prodId, finalStock] of productStockMap.entries()) {
        const prodDef = DEMO_PRODUCTS.find((p) => `demo-prod-${p.code.toLowerCase()}` === prodId);
        let finalStatus = prodDef?.targetStatus || "APPROVED";
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

    // 7. Create 32 Store Operational Expenses across 90 days
    console.log("💸 Creating 32 realistic operational expenses...");
    const expenseTemplates = [
        { cat: "SHIPPING" as const, title: "Cước xe tải giao phân bón đợt hàng về kho Trị An", amt: 450000, recipient: "Công ty Vận tải Trọng Tấn" },
        { cat: "SHIPPING" as const, title: "Phí vận chuyển giao hàng tận vườn cho nông dân", amt: 220000, recipient: "Nhà xe Ba Đạt" },
        { cat: "LABOR" as const, title: "Chi phí bốc dỡ hàng hóa vật tư tại kho", amt: 650000, recipient: "Tổ bốc xếp Trị An" },
        { cat: "WAREHOUSE" as const, title: "Phí vệ sinh & phun khử trùng kho bãi định kỳ", amt: 350000, recipient: "Dịch vụ Vệ sinh Môi Trường Xanh" },
        { cat: "UTILITIES" as const, title: "Tiền điện chiếu sáng kho bãi & cửa hàng", amt: 420000, recipient: "Điện lực Vĩnh Cửu" },
        { cat: "UTILITIES" as const, title: "Tiền nước & cước internet camera giám sát", amt: 280000, recipient: "VNPT Đồng Nai" },
        { cat: "PACKAGING" as const, title: "Mua bao bì nilon & băng keo đóng gói", amt: 180000, recipient: "Xưởng Bao bì Tân Phát" },
        { cat: "DELIVERY" as const, title: "Xăng xe máy giao thuốc BVTV khẩn cấp tận vườn", amt: 150000, recipient: "Cây xăng Petrolimex Số 12" },
        { cat: "MARKETING" as const, title: "In tờ rơi hướng dẫn quy trình VietGAP sầu riêng", amt: 350000, recipient: "Nhà in Thành Danh" },
        { cat: "MAINTENANCE" as const, title: "Bảo dưỡng xe nâng tay & thay nhớt xe máy chở hàng", amt: 280000, recipient: "Tiệm Sửa xe Hoàng Long" },
        { cat: "OTHER" as const, title: "Trà nước tiếp đón bà con nông dân tư vấn kỹ thuật", amt: 180000, recipient: "Đại lý Nước ngọt Phúc An" },
    ];

    let expenseCount = 0;
    for (let d = 3; d <= 88; d += 3) {
        if (expenseCount >= 30) break;
        const tpl = expenseTemplates[expenseCount % expenseTemplates.length];
        const expDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        expDate.setHours(10, 15, 0, 0);

        // 3 out of 30 expenses are UNPAID to simulate payables
        const isUnpaid = expenseCount === 2 || expenseCount === 12 || expenseCount === 22;
        const finalAmt = tpl.amt + ((expenseCount * 17000) % 80000);

        await prisma.storeExpense.create({
            data: {
                storeId: store.id,
                category: tpl.cat,
                title: tpl.title,
                amount: finalAmt,
                expenseDate: expDate,
                recipient: tpl.recipient,
                paymentMethod: isUnpaid ? "DEBT" : expenseCount % 2 === 0 ? "BANK_TRANSFER" : "CASH",
                status: isUnpaid ? "UNPAID" : "PAID",
                paidAmount: isUnpaid ? 0 : finalAmt,
                createdById: owner.id,
            },
        });
        expenseCount++;
    }

    console.log("=================================================");
    console.log("📊 COMPUTING LIVE SUMMARY METRICS FROM DATABASE...");

    // 8. Compute Live Metrics from Database for Validation & Output
    const allDbOrders = await prisma.order.findMany({
        where: { storeId: store.id, deletedAt: null },
        include: { items: true },
    });

    const allDbProducts = await prisma.storeProduct.findMany({
        where: { storeId: store.id, deletedAt: null },
    });

    const allDbExpenses = await prisma.storeExpense.findMany({
        where: { storeId: store.id },
    });

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOf7Days = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startOf7Days.setHours(0, 0, 0, 0);
    const startOf30Days = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    startOf30Days.setHours(0, 0, 0, 0);

    let revToday = 0;
    let rev7Days = 0;
    let rev30Days = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let totalReceivable = 0;

    for (const ord of allDbOrders) {
        const isDeliveredOrCompleted = ["DELIVERED", "COMPLETED"].includes(ord.status);
        const rev = Number(ord.subtotal);

        if (isDeliveredOrCompleted) {
            totalRevenue += rev;
            completedOrders++;

            if (ord.createdAt >= startOfToday) revToday += rev;
            if (ord.createdAt >= startOf7Days) rev7Days += rev;
            if (ord.createdAt >= startOf30Days) rev30Days += rev;

            for (const it of ord.items) {
                totalCogs += Number(it.costPrice || 0) * it.quantity;
            }
        }

        if (ord.status === "PENDING") {
            pendingOrders++;
        }

        if (ord.paymentStatus !== "PAID" && !["CANCELLED", "REJECTED"].includes(ord.status)) {
            const due = Number(ord.subtotal) + Number(ord.shippingFee) - Number(ord.paidAmount || 0);
            if (due > 0) totalReceivable += due;
        }
    }

    const grossProfit = totalRevenue - totalCogs;
    let operatingExpenses = 0;
    for (const exp of allDbExpenses) {
        operatingExpenses += Number(exp.amount);
    }
    const netProfit = grossProfit - operatingExpenses;

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalInventoryValue = 0;

    for (const p of allDbProducts) {
        const cost = Number(p.costPrice || 0);
        totalInventoryValue += p.stock * cost;
        if (p.stock === 0) outOfStockCount++;
        else if (p.stock <= 10) lowStockCount++;
    }

    console.log(`
=================================================
🎉 STORE DEMO DATA GENERATED SUCCESSFULLY!
=================================================
Store:               ${store.name}
Owner:               ${owner.fullName} (${owner.phone} / ${owner.email})

📦 Products:          ${allDbProducts.length} (Active/Approved: ${allDbProducts.filter((p) => p.status === "APPROVED").length})
👨‍🌾 Farmers:           ${farmerUsers.length}
🛒 Total Orders:      ${allDbOrders.length}
   - Completed:      ${completedOrders}
   - Pending:        ${pendingOrders}
   - Cancelled:      ${allDbOrders.filter((o) => o.status === "CANCELLED").length}

📋 Inventory Docs:    ${totalImportDocsCount + totalExportDocsCount} (Imports: ${totalImportDocsCount}, Exports: ${totalExportDocsCount})
💸 Expenses:          ${allDbExpenses.length} khoản chi

💵 REVENUE:
   - Today:          ${revToday.toLocaleString("vi-VN")} đ
   - Last 7 days:    ${rev7Days.toLocaleString("vi-VN")} đ
   - Last 30 days:   ${rev30Days.toLocaleString("vi-VN")} đ
   - Total Revenue:  ${totalRevenue.toLocaleString("vi-VN")} đ

📊 FINANCIAL PERFORMANCE:
   - COGS (Giá vốn): ${totalCogs.toLocaleString("vi-VN")} đ
   - Gross Profit:   ${grossProfit.toLocaleString("vi-VN")} đ (${Math.round((grossProfit / totalRevenue) * 1000) / 10}%)
   - Operating Exp:  ${operatingExpenses.toLocaleString("vi-VN")} đ
   - Net Profit:     ${netProfit.toLocaleString("vi-VN")} đ (${Math.round((netProfit / totalRevenue) * 1000) / 10}%)

💳 DEBTS & INVENTORY:
   - Phải thu (COD): ${totalReceivable.toLocaleString("vi-VN")} đ
   - Giá trị tồn:    ${totalInventoryValue.toLocaleString("vi-VN")} đ
   - Sắp hết hàng:   ${lowStockCount} sản phẩm (<= 10)
   - Hết hàng:       ${outOfStockCount} sản phẩm (0)
=================================================
`);
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
