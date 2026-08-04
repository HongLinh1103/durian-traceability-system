import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const seedUsers = [
    {
        phone: "0348110676",
        email: "admin@triviet.vn",
        password: "Admin@123",
        fullName: "Quản trị viên Hệ thống",
        role: "ADMIN" as const,
        isApproved: true,
        accountStatus: "APPROVED" as const,
    },
    {
        phone: "0901234567",
        email: "area.manager@triviet.vn",
        password: "123456",
        fullName: "Nguyễn Văn Quản (HTX Phong Điền)",
        role: "AREA_MANAGER" as const,
        isApproved: true,
        accountStatus: "APPROVED" as const,
    },
].filter((user) => user.role === "ADMIN");

async function main() {
    console.log("🌱 Seeding database with 4 test accounts...");
    console.log("============================================");

    for (const userData of seedUsers) {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ phone: userData.phone }, { email: userData.email }],
            },
        });

        const hashedPassword = await bcryptjs.hash(userData.password, SALT_ROUNDS);

        if (existingUser) {
            console.log(`\n📝 Updating account: ${userData.fullName} (${userData.role})`);
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    phone: userData.phone,
                    email: userData.email,
                    password: hashedPassword,
                    fullName: userData.fullName,
                    role: userData.role,
                    isApproved: userData.isApproved,
                    accountStatus: userData.accountStatus,
                    approvedAt: new Date(),
                },
            });
            console.log(`   ✅ Updated successfully!`);
        } else {
            console.log(`\n📝 Creating account: ${userData.fullName} (${userData.role})`);
            await prisma.user.create({
                data: {
                    ...userData,
                    password: hashedPassword,
                    approvedAt: new Date(),
                },
            });
            console.log(`   ✅ Created successfully!`);
        }
    }

    // ─── Trưởng ban quản lý vùng trồng Trị An, Vĩnh Cửu, Đồng Nai ───
    const triAnRegion = await prisma.growingRegion.upsert({
        where: { code: "MSVT-DN-TRIAN-001" },
        update: {
            name: "Vùng trồng sầu riêng Trị An",
            province: "Đồng Nai",
            district: "Vĩnh Cửu",
            ward: "Trị An",
            cropVarieties: ["Ri6", "Monthong", "Dona"],
            isActive: true,
            approvedAt: new Date(),
            validUntil: null,
        },
        create: {
            code: "MSVT-DN-TRIAN-001",
            name: "Vùng trồng sầu riêng Trị An",
            province: "Đồng Nai",
            district: "Vĩnh Cửu",
            ward: "Trị An",
            cropVarieties: ["Ri6", "Monthong", "Dona"],
            isActive: true,
            approvedAt: new Date(),
        },
    });

    const managerPassword = await bcryptjs.hash("Truongban@123", SALT_ROUNDS);
    const triAnManager = await prisma.user.upsert({
        where: { phone: "0909123456" },
        update: {
            email: "truongban.trian@triviet.vn",
            password: managerPassword,
            fullName: "Nguyễn Văn Thành",
            address: "Trung tâm Xã Trị An",
            province: "Đồng Nai",
            district: "Vĩnh Cửu",
            ward: "Trị An",
            role: "AREA_MANAGER",
            isApproved: true,
            isLocked: false,
            accountStatus: "APPROVED",
            approvedAt: new Date(),
            deletedAt: null,
        },
        create: {
            phone: "0909123456",
            email: "truongban.trian@triviet.vn",
            password: managerPassword,
            fullName: "Nguyễn Văn Thành",
            address: "Trung tâm Xã Trị An",
            province: "Đồng Nai",
            district: "Vĩnh Cửu",
            ward: "Trị An",
            role: "AREA_MANAGER",
            isApproved: true,
            isLocked: false,
            accountStatus: "APPROVED",
            approvedAt: new Date(),
        },
    });

    const managedRegion = {
        id: triAnRegion.id,
        code: triAnRegion.code,
        name: triAnRegion.name,
        province: triAnRegion.province,
        district: triAnRegion.district,
        ward: triAnRegion.ward,
        areaSize: 120,
        farmerCount: 45,
        durianVarieties: triAnRegion.cropVarieties,
    };
    await prisma.areaManagerApplication.upsert({
        where: { userId: triAnManager.id },
        update: {
            identityNumber: "075086001234",
            identityIssuedDate: new Date("2021-06-15"),
            identityIssuedPlace: "Cục Cảnh sát QLHC về TTXH",
            identityFrontKey: "seed/area-manager-tri-an/cccd-front.jpg",
            identityBackKey: "seed/area-manager-tri-an/cccd-back.jpg",
            organizationName: "Ban quản lý vùng trồng sầu riêng Trị An",
            taxCode: "3601234567",
            position: "Trưởng BQL",
            officeProvince: "Đồng Nai",
            officeDistrict: "Vĩnh Cửu",
            officeWard: "Trị An",
            officeDetailedAddress: "Trung tâm Xã Trị An",
            authorityDocumentKey: "seed/area-manager-tri-an/quyet-dinh-bo-nhiem.pdf",
            managedRegions: [managedRegion],
        },
        create: {
            userId: triAnManager.id,
            identityNumber: "075086001234",
            identityIssuedDate: new Date("2021-06-15"),
            identityIssuedPlace: "Cục Cảnh sát QLHC về TTXH",
            identityFrontKey: "seed/area-manager-tri-an/cccd-front.jpg",
            identityBackKey: "seed/area-manager-tri-an/cccd-back.jpg",
            organizationName: "Ban quản lý vùng trồng sầu riêng Trị An",
            taxCode: "3601234567",
            position: "Trưởng BQL",
            officeProvince: "Đồng Nai",
            officeDistrict: "Vĩnh Cửu",
            officeWard: "Trị An",
            officeDetailedAddress: "Trung tâm Xã Trị An",
            authorityDocumentKey: "seed/area-manager-tri-an/quyet-dinh-bo-nhiem.pdf",
            managedRegions: [managedRegion],
        },
    });
    console.log("   ✅ Seeded AREA_MANAGER 0909123456 and region MSVT-DN-TRIAN-001");

    console.log("\n============================================");
    console.log("📋 All seed accounts created/updated:");
    console.log("────────────────────────────────────────────");
    console.log("│ # │ Role          │ Phone      │ Password   │ Name");
    console.log("│───│───────────────│────────────│────────────│──────────────────────────────");
    console.log("│ 1 │ ADMIN         │ 0348110676 │ Admin@123  │ Quản trị viên Hệ thống");
    console.log("│ 2 │ AREA_MANAGER  │ 0901234567 │ 123456     │ Nguyễn Văn Quản (HTX Phong Điền)");
    console.log("────────────────────────────────────────────");

    // ─── Seed Master Data: Giống sầu riêng (Demo) ─────────────
    console.log("\n🌱 Seeding master data: Durian Varieties (demo)...");

    const demoVarieties = [
        { code: "RI6", name: "Ri6", scientificName: "Durio zibethinus Ri6", origin: "Việt Nam (Vĩnh Long)", averageHarvestDays: 120 },
        { code: "MONTHONG", name: "Monthong", scientificName: "Durio zibethinus Monthong", origin: "Thái Lan", averageHarvestDays: 135 },
        { code: "MUSANG_KING", name: "Musang King", scientificName: "Durio zibethinus Musang King", origin: "Malaysia", averageHarvestDays: 130 },
        { code: "DONA", name: "Dona", scientificName: "Durio zibethinus Dona", origin: "Việt Nam (Đồng Nai)", averageHarvestDays: 125 },
        { code: "CHUONG_BO", name: "Chuồng Bò", scientificName: null, origin: "Việt Nam (Tiền Giang)", averageHarvestDays: 110 },
        { code: "KHO_QUA_XANH", name: "Khổ Qua Xanh", scientificName: null, origin: "Việt Nam", averageHarvestDays: null },
    ];

    for (const variety of demoVarieties) {
        const existing = await prisma.durianVariety.findUnique({ where: { code: variety.code } });
        if (!existing) {
            await prisma.durianVariety.create({
                data: {
                    ...variety,
                    description: `Giống sầu riêng ${variety.name} - Dữ liệu demo.`,
                    isActive: true,
                },
            });
            console.log(`   ✅ Created durian variety: ${variety.code} - ${variety.name}`);
        } else {
            console.log(`   ⏭️  Skipped (exists): ${variety.code} - ${variety.name}`);
        }
    }

    // ─── Seed Master Data: Phân bón (Demo) ────────────────────
    console.log("\n🌱 Seeding master data: Fertilizers (demo)...");

    const demoFertilizers = [
        { code: "FER-NPK-201515", name: "NPK 20-20-15", fertilizerType: "NPK", brand: "Đầu Trâu", manufacturer: "Công ty Phân bón Bình Điền", nutrientComposition: "N:20%, P:20%, K:15%" },
        { code: "FER-ORG-001", name: "Phân hữu cơ vi sinh", fertilizerType: "Hữu cơ", brand: "Sông Gianh", manufacturer: "Công ty CP Phân bón Sông Gianh", nutrientComposition: "Hữu cơ: 25%, Vi sinh: 10^8 CFU/g" },
        { code: "FER-KCL-001", name: "Kali Clorua (KCl)", fertilizerType: "Vô cơ", brand: "CNA", manufacturer: "Công ty Cổ phần Phân bón Miền Nam", nutrientComposition: "K2O: 60%" },
    ];

    const fertilizerDetails: Record<string, Record<string, unknown>> = {
        "FER-NPK-201515": {
            mainUses: "Cung cấp cân đối đạm, lân và kali, hỗ trợ phát triển rễ, thân cành và phục hồi cây sau thu hoạch.",
            targetCrops: "Nhiều loại cây trồng; với cây ăn trái dùng theo giai đoạn kiến thiết hoặc sau thu hoạch theo hướng dẫn trên nhãn.",
            usageInstructions: "Bón theo loại đất, tuổi cây và tình hình sinh trưởng; không áp dụng một liều cố định cho mọi vườn.",
            sourceReference: "https://binhdien.com/sanpham/npk-dau-trau/npk-dau-trau-20-20-15-1.html",
        },
        "FER-ORG-001": {
            mainUses: "Bổ sung chất hữu cơ và vi sinh vật hữu ích, cải tạo độ phì đất, hỗ trợ bộ rễ phát triển và tăng khả năng hấp thu dinh dưỡng.",
            targetCrops: "Dùng bón lót hoặc bón bổ sung cho nhiều loại cây trồng theo hướng dẫn trên bao bì.",
            usageInstructions: "Bón vào đất và phối hợp với chế độ dinh dưỡng phù hợp; liều lượng căn cứ nhãn sản phẩm và tình trạng vườn.",
            sourceReference: "https://songgianh.com.vn/phan-huu-co-vi-sinh-cao-cap-song-gianh-p265.html",
        },
        "FER-KCL-001": {
            mainUses: "Bổ sung kali, hỗ trợ vận chuyển đường và tổng hợp chất hữu cơ, giúp cây cứng khỏe và cải thiện năng suất, chất lượng nông sản.",
            targetCrops: "Cây trồng có nhu cầu kali và không mẫn cảm với clo; cần thận trọng với sầu riêng và cây nhạy cảm clo.",
            usageInstructions: "Chỉ bón theo kết quả phân tích đất, nhu cầu cây và hướng dẫn trên bao bì; không dùng thay thế kali sulphate cho cây nhạy cảm clo.",
            safetyWarnings: "Không bón quá liều hoặc sát gốc; với sầu riêng nên có tư vấn kỹ thuật trước khi sử dụng nguồn kali clorua.",
            sourceReference: "https://phanbonmiennam.com.vn/nha-nong/bai-3-kali-va-vai-tro-phan-kali-trong-canh-tac-nong-nghiep-con-nua/",
        },
    };

    for (const fert of demoFertilizers) {
        const fertilizerData = { ...fert, ...fertilizerDetails[fert.code], isActive: true };
        const existing = await prisma.fertilizer.findUnique({ where: { code: fert.code } });
        if (!existing) {
            await prisma.fertilizer.create({ data: fertilizerData });
            console.log(`   ✅ Created fertilizer: ${fert.code} - ${fert.name}`);
        } else {
            await prisma.fertilizer.update({ where: { code: fert.code }, data: fertilizerData });
            console.log(`   ⏭️  Skipped (exists): ${fert.code} - ${fert.name}`);
        }
    }

    // ─── Seed Master Data: Thuốc BVTV (Demo) ─────────────────
    // Lưu ý: Không seed dữ liệu GACC không có nguồn xác nhận. Đây chỉ là demo.
    console.log("\n🌱 Seeding master data: Pesticides (demo)...");

    const demoPesticides = [
        {
            code: "PEST-CONF-001",
            tradeName: "Confidor 100SL",
            activeIngredient: "Imidacloprid",
            category: "Thuốc trừ sâu",
            manufacturer: "Bayer",
            gaccStatus: "ALLOWED" as const,
            phiDays: 14,
        },
        {
            code: "PEST-AMIS-001",
            tradeName: "Amistar Top 325SC",
            activeIngredient: "Azoxystrobin + Difenoconazole",
            category: "Thuốc trừ bệnh",
            manufacturer: "Syngenta",
            gaccStatus: "ALLOWED" as const,
            phiDays: 7,
        },
        {
            code: "PEST-TRIC-001",
            tradeName: "Trichlorfon 90SP",
            activeIngredient: "Trichlorfon",
            category: "Thuốc trừ sâu",
            manufacturer: "Nufarm",
            gaccStatus: "PROHIBITED" as const,
            phiDays: 21,
            notes: "Demo: Thuốc bị cấm theo danh mục GACC (dữ liệu demo, cần xác nhận từ nguồn chính thức).",
        },
    ];

    for (const pest of demoPesticides) {
        const existing = await prisma.pesticide.findUnique({ where: { code: pest.code } });
        if (!existing) {
            await prisma.pesticide.create({ data: { ...pest, isActive: true } });
            console.log(`   ✅ Created pesticide: ${pest.code} - ${pest.tradeName}`);
        } else {
            console.log(`   ⏭️  Skipped (exists): ${pest.code} - ${pest.tradeName}`);
        }
    }

    console.log("\n============================================");
    console.log("🌱 Seed completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

