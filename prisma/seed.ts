import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { seedStoreDemo } from "./seed-store-demo";

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
    console.log("[INFO] Seeding database with accounts...");
    console.log("============================================");

    for (const userData of seedUsers) {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ phone: userData.phone }, { email: userData.email }],
            },
        });

        const hashedPassword = await bcryptjs.hash(userData.password, SALT_ROUNDS);

        if (existingUser) {
            console.log(`\n[INFO] Updating account: ${userData.fullName} (${userData.role})`);
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
            console.log(`   [OK] Updated successfully!`);
        } else {
            console.log(`\n[INFO] Creating account: ${userData.fullName} (${userData.role})`);
            await prisma.user.create({
                data: {
                    ...userData,
                    password: hashedPassword,
                    approvedAt: new Date(),
                },
            });
            console.log(`   [OK] Created successfully!`);
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
    console.log("   [OK] Seeded AREA_MANAGER 0909123456 and region MSVT-DN-TRIAN-001");

    console.log("\n============================================");
    console.log("[INFO] All seed accounts created/updated:");
    console.log("────────────────────────────────────────────");
    console.log("│ # │ Role          │ Phone      │ Password   │ Name");
    console.log("│───│───────────────│────────────│────────────│──────────────────────────────");
    console.log("│ 1 │ ADMIN         │ 0348110676 │ Admin@123  │ Quản trị viên Hệ thống");
    console.log("│ 2 │ AREA_MANAGER  │ 0901234567 │ 123456     │ Nguyễn Văn Quản (HTX Phong Điền)");
    console.log("────────────────────────────────────────────");

    // ─── Seed Master Data: Thuốc BVTV (Demo) ─────────────────
    // Lưu ý: Không seed dữ liệu GACC không có nguồn xác nhận. Đây chỉ là demo.
    console.log("\n[INFO] Seeding master data: Pesticides (demo)...");

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
            console.log(`   [OK] Created pesticide: ${pest.code} - ${pest.tradeName}`);
        } else {
            console.log(`   [SKIP]  Skipped (exists): ${pest.code} - ${pest.tradeName}`);
        }
    }

    // ─── Seed Store Owner, Products, Inventory Documents & Orders ───
    await seedStoreDemo();

    console.log("\n============================================");
    console.log("[INFO] Seed completed successfully!");
}

main()
    .catch((e) => {
        console.error("[ERROR] Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

