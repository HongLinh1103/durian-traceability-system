const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

const accounts = [
    {
        phone: "0909000002",
        email: "collector@triviet.vn",
        password: "ThuMua@123",
        fullName: "Nguyễn Thành Phát",
        role: "COLLECTOR",
        facility: {
            type: "COLLECTOR",
            representativeName: "Nguyễn Thành Phát",
            representativePhone: "0909000002",
            representativeEmail: "collector@triviet.vn",
            identityNumber: "079203000002",
            name: "Vựa Sầu riêng Thành Phát",
            organizationType: "Hộ kinh doanh",
            taxCode: "3603999002",
            businessCode: "HKD-TP-2026",
            phone: "0909000002",
            email: "collector@triviet.vn",
            address: "Long Khánh, Đồng Nai",
            province: "Đồng Nai",
            ward: "Phường Xuân Lập",
            contactPerson: "Nguyễn Thành Phát",
            purchasingAreas: ["Đồng Nai", "Bình Phước", "Lâm Đồng"],
            processingTypes: [],
            description: "Vựa thu mua sầu riêng trực tiếp từ nhà vườn.",
        },
    },
    {
        phone: "0909000003",
        email: "processing@triviet.vn",
        password: "CheBien@123",
        fullName: "Trần Minh Anh",
        role: "PROCESSING_FACILITY",
        facility: {
            type: "PROCESSING_FACILITY",
            representativeName: "Trần Minh Anh",
            representativePhone: "0909000003",
            representativeEmail: "processing@triviet.vn",
            identityNumber: "079203000003",
            name: "Cơ sở Chế biến Sầu riêng Trị An",
            organizationType: "Doanh nghiệp",
            taxCode: "3603999003",
            businessCode: "DN-CB-2026",
            phone: "0909000003",
            email: "processing@triviet.vn",
            website: "https://triviet.vn",
            address: "Trảng Bom, Đồng Nai",
            province: "Đồng Nai",
            ward: "Xã Sông Trầu",
            contactPerson: "Trần Minh Anh",
            purchasingAreas: ["Đồng Nai", "Bình Phước"],
            processingTypes: ["Sầu riêng nguyên trái", "Tách múi", "Cấp đông"],
            expectedCapacity: 20,
            capacityUnit: "tấn/ngày",
            description: "Cơ sở tiếp nhận, sơ chế và chế biến sầu riêng.",
        },
    },
];

async function main() {
    for (const account of accounts) {
        const password = await bcryptjs.hash(account.password, 10);
        const user = await prisma.user.upsert({
            where: { phone: account.phone },
            update: { email: account.email, password, fullName: account.fullName, role: account.role, isApproved: true, accountStatus: "APPROVED", approvedAt: new Date(), isLocked: false, deletedAt: null },
            create: { phone: account.phone, email: account.email, password, fullName: account.fullName, role: account.role, isApproved: true, accountStatus: "APPROVED", approvedAt: new Date() },
        });
        await prisma.partnerFacility.upsert({
            where: { ownerId: user.id },
            update: { ...account.facility, status: "APPROVED", reviewReason: null, approvedAt: new Date(), deletedAt: null },
            create: { ownerId: user.id, ...account.facility, status: "APPROVED", approvedAt: new Date() },
        });
        console.log(`${account.role}: ${account.email} / ${account.password}`);
    }
}

main().finally(() => prisma.$disconnect());
