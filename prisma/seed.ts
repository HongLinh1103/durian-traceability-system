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

    const storeOwner = await prisma.user.upsert({
        where: { phone: "0909000001" },
        update: { role: "STORE_OWNER", isApproved: true, accountStatus: "APPROVED", isLocked: false },
        create: { phone: "0909000001", email: "store.owner@triviet.vn", password: await bcryptjs.hash("123456", SALT_ROUNDS), fullName: "Chủ cửa hàng Vật tư Trị An", role: "STORE_OWNER", isApproved: true, accountStatus: "APPROVED", approvedAt: new Date() },
    });
    const store = await prisma.store.upsert({
        where: { id: "seed-store-tri-an" },
        update: { status: "APPROVED", deletedAt: null },
        create: { id: "seed-store-tri-an", ownerId: storeOwner.id, representativeName: storeOwner.fullName || "Chủ cửa hàng", representativePhone: storeOwner.phone, representativeEmail: storeOwner.email, identityNumber: "079000000001", name: "Cửa hàng Vật tư Nông nghiệp Trị An", taxOrBusinessCode: "MST-TRIAN-001", address: "Trị An, Vĩnh Cửu, Đồng Nai", phone: "0909000001", openingHours: "07:00 - 18:00", description: "Cửa hàng vật tư mẫu phục vụ kiểm thử hệ thống.", status: "APPROVED", submittedAt: new Date(), approvedAt: new Date() },
    });
    await prisma.storeProduct.upsert({
        where: { id: "seed-store-product-npk" },
        update: { status: "APPROVED", deletedAt: null },
        create: { id: "seed-store-product-npk", storeId: store.id, type: "FERTILIZER", name: "Đầu Trâu NPK 20-20-15", brand: "Đầu Trâu", manufacturer: "Bình Điền", origin: "Việt Nam", usagePurpose: "Bổ sung cân đối đạm, lân và kali cho cây trồng.", usageInstructions: "Dùng theo hướng dẫn trên bao bì và tư vấn kỹ thuật.", packaging: "Bao 25 kg", price: 520000, salePrice: 499000, stock: 30, unit: "bao", composition: "NPK 20-20-15", safetyWarnings: "Bảo quản khô ráo, tránh xa trẻ em.", status: "APPROVED" },
    });

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

