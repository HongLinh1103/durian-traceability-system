const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    const region = await prisma.growingRegion.upsert({
        where: { code: "MSVT-DN-TRIAN-001" },
        update: { name: "Vùng trồng sầu riêng Trị An", province: "Đồng Nai", district: "Vĩnh Cửu", ward: "Trị An", cropVarieties: ["Ri6", "Monthong", "Dona"], isActive: true, approvedAt: new Date(), validUntil: null },
        create: { code: "MSVT-DN-TRIAN-001", name: "Vùng trồng sầu riêng Trị An", province: "Đồng Nai", district: "Vĩnh Cửu", ward: "Trị An", cropVarieties: ["Ri6", "Monthong", "Dona"], isActive: true, approvedAt: new Date() },
    });
    const password = await bcryptjs.hash("Truongban@123", 10);
    const user = await prisma.user.upsert({
        where: { phone: "0909123456" },
        update: { email: "truongban.trian@triviet.vn", password, fullName: "Nguyễn Văn Thành", address: "Trung tâm Xã Trị An", province: "Đồng Nai", district: "Vĩnh Cửu", ward: "Trị An", role: "AREA_MANAGER", isApproved: true, isLocked: false, accountStatus: "APPROVED", approvedAt: new Date(), deletedAt: null },
        create: { phone: "0909123456", email: "truongban.trian@triviet.vn", password, fullName: "Nguyễn Văn Thành", address: "Trung tâm Xã Trị An", province: "Đồng Nai", district: "Vĩnh Cửu", ward: "Trị An", role: "AREA_MANAGER", isApproved: true, isLocked: false, accountStatus: "APPROVED", approvedAt: new Date() },
    });
    const managedRegion = { id: region.id, code: region.code, name: region.name, province: region.province, district: region.district, ward: region.ward, areaSize: 120, farmerCount: 45, durianVarieties: region.cropVarieties };
    const profile = { identityNumber: "075086001234", identityIssuedDate: new Date("2021-06-15"), identityIssuedPlace: "Cục Cảnh sát QLHC về TTXH", identityFrontKey: "seed/area-manager-tri-an/cccd-front.jpg", identityBackKey: "seed/area-manager-tri-an/cccd-back.jpg", organizationName: "Ban quản lý vùng trồng sầu riêng Trị An", taxCode: "3601234567", position: "Trưởng BQL", officeProvince: "Đồng Nai", officeDistrict: "Vĩnh Cửu", officeWard: "Trị An", officeDetailedAddress: "Trung tâm Xã Trị An", authorityDocumentKey: "seed/area-manager-tri-an/quyet-dinh-bo-nhiem.pdf", managedRegions: [managedRegion] };
    await prisma.areaManagerApplication.upsert({ where: { userId: user.id }, update: profile, create: { userId: user.id, ...profile } });
    console.log("Seeded AREA_MANAGER 0909123456 and region MSVT-DN-TRIAN-001.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
