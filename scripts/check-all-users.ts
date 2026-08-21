import { prisma } from "../src/lib/prisma";

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            phone: true,
            email: true,
            fullName: true,
            role: true,
            accountStatus: true,
            isApproved: true,
            _count: {
                select: {
                    farms: true,
                    farmerSupplies: true,
                    farmerSupplyTransactions: true,
                    farmerExpenses: true,
                    orders: true,
                },
            },
        },
        orderBy: [{ role: "asc" }, { phone: "asc" }],
    });

    console.log(`Tổng cộng ${users.length} tài khoản trong hệ thống:`);
    for (const u of users) {
        console.log(`- [${u.role}] SĐT: ${u.phone} | Email: ${u.email || "N/A"} | Tên: ${u.fullName} | Vườn: ${u._count.farms} | Vật tư: ${u._count.farmerSupplies} | GD kho: ${u._count.farmerSupplyTransactions} | Chi phí: ${u._count.farmerExpenses} | Đơn: ${u._count.orders}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
