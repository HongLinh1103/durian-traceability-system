const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

const nurseryAccounts = [
    {
        phone: "0909333001",
        email: "minhphat.seedling@triviet.vn",
        password: "TraiGiong@123",
        fullName: "Hoàng Minh Phát",
        role: "STORE_OWNER",
        store: {
            representativeName: "Hoàng Minh Phát",
            representativePhone: "0909333001",
            representativeEmail: "minhphat.seedling@triviet.vn",
            identityNumber: "079203000031",
            name: "Trại giống sầu riêng Minh Phát",
            taxOrBusinessCode: "3603999031",
            address: "45 Đường CMT8, Phường Xuân Bình, TP. Long Khánh, Tỉnh Đồng Nai",
            phone: "0909333001",
            openingHours: "06:30 - 18:00 (Hàng ngày)",
            description: "Chuyên nhân giống và cung ứng các loại cây giống sầu riêng Ri6, Monthong Dona, Sáu Hữu thuần chủng chất lượng F1 tại Long Khánh - Đồng Nai.",
            status: "APPROVED",
        },
    },
    {
        phone: "0909333002",
        email: "tanphu.seedling@triviet.vn",
        password: "TraiGiong@123",
        fullName: "Nguyễn Văn Tân",
        role: "STORE_OWNER",
        store: {
            representativeName: "Nguyễn Văn Tân",
            representativePhone: "0909333002",
            representativeEmail: "tanphu.seedling@triviet.vn",
            identityNumber: "079203000032",
            name: "Trại cây giống Tân Phú Bến Tre",
            taxOrBusinessCode: "3603999032",
            address: "Quốc lộ 57, Xã Phú Sơn, Huyện Chợ Lách, Tỉnh Bến Tre",
            phone: "0909333002",
            openingHours: "06:00 - 18:30 (Hàng ngày)",
            description: "Trung tâm cây giống Chợ Lách Bến Tre, chuyên dòng cây giống cao cấp Musang King D197, Black Thorn D200, Chuồng Bò và Monthong cây lỡ tán dù.",
            status: "APPROVED",
        },
    },
];

async function main() {
    console.log("Seeding Nursery Accounts...");
    for (const acc of nurseryAccounts) {
        const password = await bcryptjs.hash(acc.password, 10);
        const user = await prisma.user.upsert({
            where: { phone: acc.phone },
            update: {
                email: acc.email,
                password,
                fullName: acc.fullName,
                role: acc.role,
                isApproved: true,
                accountStatus: "APPROVED",
                approvedAt: new Date(),
                isLocked: false,
                deletedAt: null,
            },
            create: {
                phone: acc.phone,
                email: acc.email,
                password,
                fullName: acc.fullName,
                role: acc.role,
                isApproved: true,
                accountStatus: "APPROVED",
                approvedAt: new Date(),
            },
        });

        const existingStore = await prisma.store.findFirst({
            where: { ownerId: user.id },
        });

        if (existingStore) {
            await prisma.store.update({
                where: { id: existingStore.id },
                data: {
                    ...acc.store,
                    status: "APPROVED",
                    approvedAt: new Date(),
                    deletedAt: null,
                },
            });
        } else {
            await prisma.store.create({
                data: {
                    ownerId: user.id,
                    ...acc.store,
                    status: "APPROVED",
                    approvedAt: new Date(),
                },
            });
        }

        console.log(`[OK] Trại giống: ${acc.store.name} | SĐT: ${acc.phone} | Email: ${acc.email}`);
    }
    console.log("Seeding nursery accounts completed!");
}

main()
    .catch((err) => {
        console.error("Error seeding nursery accounts:", err);
    })
    .finally(() => prisma.$disconnect());
