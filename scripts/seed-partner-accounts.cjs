const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

const accounts = [
    // ==========================================
    // 3 VỰA THU MUA (COLLECTOR)
    // ==========================================
    {
        phone: "0909111001",
        email: "hoanglong.collector@triviet.vn",
        password: "ThuMua@123",
        fullName: "Hoàng Văn Long",
        role: "COLLECTOR",
        facility: {
            type: "COLLECTOR",
            representativeName: "Hoàng Văn Long",
            representativePhone: "0909111001",
            representativeEmail: "hoanglong.collector@triviet.vn",
            identityNumber: "079203000011",
            name: "Vựa Sầu riêng Hoàng Long",
            organizationType: "Hợp tác xã",
            taxCode: "3603999011",
            businessCode: "HTX-HL-2026",
            phone: "0909111001",
            email: "hoanglong.collector@triviet.vn",
            address: "Ấp 3, Xã Phú Riềng, Huyện Phú Riềng, Tỉnh Bình Phước",
            province: "Bình Phước",
            ward: "Xã Phú Riềng",
            contactPerson: "Hoàng Văn Long",
            purchasingAreas: ["Bình Phước", "Đắk Nông", "Tây Ninh"],
            processingTypes: [],
            expectedCapacity: 65,
            capacityUnit: "tấn/ngày",
            imageUrls: [
                "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80"
            ],
            description: "Hợp tác xã thu mua nông sản chuyên nghiệp, liên kết bền vững với hơn 80 hộ nông dân vùng Bình Phước, cam kết bao tiêu đầu ra ổn định.",
        },
    },
    {
        phone: "0909111002",
        email: "taynguyen.collector@triviet.vn",
        password: "ThuMua@123",
        fullName: "Đặng Quốc Thái",
        role: "COLLECTOR",
        facility: {
            type: "COLLECTOR",
            representativeName: "Đặng Quốc Thái",
            representativePhone: "0909111002",
            representativeEmail: "taynguyen.collector@triviet.vn",
            identityNumber: "079203000012",
            name: "Vựa Thu Mua Nông Sản Tây Nguyên",
            organizationType: "Doanh nghiệp tư nhân",
            taxCode: "3603999012",
            businessCode: "DNTN-TN-2026",
            phone: "0909111002",
            email: "taynguyen.collector@triviet.vn",
            address: "Km 19, Quốc Lộ 26, Xã Ea Knuếc, Huyện Krông Pắc, Tỉnh Đắk Lắk",
            province: "Đắk Lắk",
            ward: "Xã Ea Knuếc",
            contactPerson: "Đặng Quốc Thái",
            purchasingAreas: ["Đắk Lắk", "Gia Lai", "Lâm Đồng", "Đắk Nông"],
            processingTypes: [],
            expectedCapacity: 80,
            capacityUnit: "tấn/ngày",
            imageUrls: [
                "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=600&q=80"
            ],
            description: "Đầu mối thu mua sầu riêng Dona & Ri6 trọng điểm Tây Nguyên, trang bị hệ thống phân loại quang học và kiểm định chất lượng tại vựa.",
        },
    },
    {
        phone: "0909111003",
        email: "mekong.collector@triviet.vn",
        password: "ThuMua@123",
        fullName: "Lê Thị Mai",
        role: "COLLECTOR",
        facility: {
            type: "COLLECTOR",
            representativeName: "Lê Thị Mai",
            representativePhone: "0909111003",
            representativeEmail: "mekong.collector@triviet.vn",
            identityNumber: "079203000013",
            name: "Vựa Sầu riêng Mekong Fruit",
            organizationType: "Hộ kinh doanh",
            taxCode: "3603999013",
            businessCode: "HKD-MK-2026",
            phone: "0909111003",
            email: "mekong.collector@triviet.vn",
            address: "Ấp 4, Xã Ngũ Hiệp, Huyện Cai Lậy, Tỉnh Tiền Giang",
            province: "Tiền Giang",
            ward: "Xã Ngũ Hiệp",
            contactPerson: "Lê Thị Mai",
            purchasingAreas: ["Tiền Giang", "Bến Tre", "Vĩnh Long", "Cần Thơ"],
            processingTypes: [],
            expectedCapacity: 60,
            capacityUnit: "tấn/ngày",
            imageUrls: [
                "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80"
            ],
            description: "Vựa thu mua sầu riêng uy tín tại vương quốc sầu riêng Ngũ Hiệp - Cai Lậy, thu mua sầu riêng chín cây và sầu riêng cắt xuất khẩu chất lượng cao.",
        },
    },

    // ==========================================
    // 3 CƠ SỞ CHẾ BIẾN - ĐÓNG GÓI (PROCESSING_FACILITY)
    // ==========================================
    {
        phone: "0909222001",
        email: "dongphu.factory@triviet.vn",
        password: "CheBien@123",
        fullName: "Phạm Thanh Hải",
        role: "PROCESSING_FACILITY",
        facility: {
            type: "PROCESSING_FACILITY",
            representativeName: "Phạm Thanh Hải",
            representativePhone: "0909222001",
            representativeEmail: "dongphu.factory@triviet.vn",
            identityNumber: "079203000021",
            name: "Nhà máy Chế biến & Đóng gói Sầu riêng Đồng Phú",
            organizationType: "Công ty Cổ phần",
            taxCode: "3603999021",
            businessCode: "CP-DP-2026",
            phone: "0909222001",
            email: "dongphu.factory@triviet.vn",
            address: "KCN Nam Đồng Phú, Xã Tân Lập, Huyện Đồng Phú, Tỉnh Bình Phước",
            province: "Bình Phước",
            ward: "Xã Tân Lập",
            contactPerson: "Phạm Thanh Hải",
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
                "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80"
            ],
            description: "Nhà máy chế biến và đóng gói hiện đại với dây chuyền tự động hóa 100%, sở hữu mã cơ sở đóng gói xuất khẩu chính ngạch sang Trung Quốc.",
        },
    },
    {
        phone: "0909222002",
        email: "krongpac.factory@triviet.vn",
        password: "CheBien@123",
        fullName: "Vũ Đức Trọng",
        role: "PROCESSING_FACILITY",
        facility: {
            type: "PROCESSING_FACILITY",
            representativeName: "Vũ Đức Trọng",
            representativePhone: "0909222002",
            representativeEmail: "krongpac.factory@triviet.vn",
            identityNumber: "079203000022",
            name: "Trung tâm Chế biến Nông sản Xuất khẩu Krông Pắc",
            organizationType: "Công ty TNHH MTV",
            taxCode: "3603999022",
            businessCode: "DN-KP-2026",
            phone: "0909222002",
            email: "krongpac.factory@triviet.vn",
            address: "Cụm Công nghiệp Tân An, Xã Ea Đar, Huyện Ea Kar, Tỉnh Đắk Lắk",
            province: "Đắk Lắk",
            ward: "Xã Ea Đar",
            contactPerson: "Vũ Đức Trọng",
            purchasingAreas: ["Đắk Lắk", "Gia Lai", "Kon Tum"],
            processingTypes: [
                "Cấp đông nitơ lỏng nguyên trái",
                "Tách múi đông sâu -40°C",
                "Đóng khay chân không cao cấp"
            ],
            expectedCapacity: 45,
            capacityUnit: "tấn/ngày",
            imageUrls: [
                "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80"
            ],
            description: "Trung tâm chế biến công nghệ cao vùng Tây Nguyên, chuyên dòng sản phẩm sầu riêng cấp đông sâu giữ trọn 99% hương vị tự nhiên.",
        },
    },
    {
        phone: "0909222003",
        email: "mientay.factory@triviet.vn",
        password: "CheBien@123",
        fullName: "Võ Hoàng Nam",
        role: "PROCESSING_FACILITY",
        facility: {
            type: "PROCESSING_FACILITY",
            representativeName: "Võ Hoàng Nam",
            representativePhone: "0909222003",
            representativeEmail: "mientay.factory@triviet.vn",
            identityNumber: "079203000023",
            name: "Nhà máy Đóng gói Trái cây Miền Tây Nam Bộ",
            organizationType: "Công ty Cổ phần",
            taxCode: "3603999023",
            businessCode: "CP-MT-2026",
            phone: "0909222003",
            email: "mientay.factory@triviet.vn",
            address: "QL1A, Xã Long Định, Huyện Châu Thành, Tỉnh Tiền Giang",
            province: "Tiền Giang",
            ward: "Xã Long Định",
            contactPerson: "Võ Hoàng Nam",
            purchasingAreas: ["Tiền Giang", "Bến Tre", "Vĩnh Long", "Hậu Giang"],
            processingTypes: [
                "Xử lý chiếu xạ kiểm dịch thực vật",
                "Dán tem QR truy xuất nguồn gốc",
                "Đóng container lạnh xuất khẩu"
            ],
            expectedCapacity: 40,
            capacityUnit: "tấn/ngày",
            imageUrls: [
                "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
            ],
            description: "Hệ thống nhà máy đóng gói chuẩn GlobalGAP, kết nối trực tiếp các cảng biển xuất khẩu phục vụ thị trường Trung Quốc, Nhật Bản, Hoa Kỳ.",
        },
    },
];

async function seed() {
    console.log("==> Bắt đầu seed 3 Vựa Thu Mua & 3 Cơ Sở Chế Biến...");

    for (const acc of accounts) {
        const hashedPassword = await bcryptjs.hash(acc.password, 10);

        const user = await prisma.user.upsert({
            where: { phone: acc.phone },
            update: {
                email: acc.email,
                fullName: acc.fullName,
                password: hashedPassword,
                role: acc.role,
                isApproved: true,
                accountStatus: "APPROVED",
                province: acc.facility.province,
                ward: acc.facility.ward,
                address: acc.facility.address,
            },
            create: {
                phone: acc.phone,
                email: acc.email,
                fullName: acc.fullName,
                password: hashedPassword,
                role: acc.role,
                isApproved: true,
                accountStatus: "APPROVED",
                province: acc.facility.province,
                ward: acc.facility.ward,
                address: acc.facility.address,
            },
        });

        console.log(`[USER OK] ${acc.role} - ${acc.fullName} (${acc.phone})`);

        const existingFacility = await prisma.partnerFacility.findFirst({
            where: { ownerId: user.id },
        });

        if (existingFacility) {
            await prisma.partnerFacility.update({
                where: { id: existingFacility.id },
                data: {
                    type: acc.facility.type,
                    representativeName: acc.facility.representativeName,
                    representativePhone: acc.facility.representativePhone,
                    representativeEmail: acc.facility.representativeEmail,
                    identityNumber: acc.facility.identityNumber,
                    name: acc.facility.name,
                    organizationType: acc.facility.organizationType,
                    taxCode: acc.facility.taxCode,
                    businessCode: acc.facility.businessCode,
                    phone: acc.facility.phone,
                    email: acc.facility.email,
                    address: acc.facility.address,
                    province: acc.facility.province,
                    ward: acc.facility.ward,
                    contactPerson: acc.facility.contactPerson,
                    purchasingAreas: acc.facility.purchasingAreas,
                    processingTypes: acc.facility.processingTypes,
                    expectedCapacity: acc.facility.expectedCapacity,
                    capacityUnit: acc.facility.capacityUnit,
                    imageUrls: acc.facility.imageUrls,
                    description: acc.facility.description,
                    status: "APPROVED",
                },
            });
            console.log(`  └─ [FACILITY UPDATED] ${acc.facility.name}`);
        } else {
            await prisma.partnerFacility.create({
                data: {
                    ownerId: user.id,
                    type: acc.facility.type,
                    representativeName: acc.facility.representativeName,
                    representativePhone: acc.facility.representativePhone,
                    representativeEmail: acc.facility.representativeEmail,
                    identityNumber: acc.facility.identityNumber,
                    name: acc.facility.name,
                    organizationType: acc.facility.organizationType,
                    taxCode: acc.facility.taxCode,
                    businessCode: acc.facility.businessCode,
                    phone: acc.facility.phone,
                    email: acc.facility.email,
                    address: acc.facility.address,
                    province: acc.facility.province,
                    ward: acc.facility.ward,
                    contactPerson: acc.facility.contactPerson,
                    purchasingAreas: acc.facility.purchasingAreas,
                    processingTypes: acc.facility.processingTypes,
                    expectedCapacity: acc.facility.expectedCapacity,
                    capacityUnit: acc.facility.capacityUnit,
                    imageUrls: acc.facility.imageUrls,
                    description: acc.facility.description,
                    status: "APPROVED",
                },
            });
            console.log(`  └─ [FACILITY CREATED] ${acc.facility.name}`);
        }
    }

    console.log("==> Hoàn tất seed đối tác thu mua & chế biến.");
}

seed()
    .catch((e) => {
        console.error("Lỗi khi seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
