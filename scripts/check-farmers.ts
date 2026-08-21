import { prisma } from "../src/lib/prisma";

async function main() {
    const users = await prisma.user.findMany({
        where: { role: "FARMER" },
        select: {
            id: true,
            phone: true,
            fullName: true,
            farms: {
                select: {
                    id: true,
                    farmName: true,
                    farmCode: true,
                    cropSeasons: {
                        select: { id: true, name: true, status: true },
                    },
                },
            },
            _count: {
                select: {
                    farmerSupplies: true,
                    farmerSupplyTransactions: true,
                    farmerExpenses: true,
                    orders: true,
                },
            },
        },
    });

    console.log(`Tìm thấy ${users.length} tài khoản FARMER:`);
    for (const u of users) {
        console.log(`\n- SĐT: [${u.phone}] | Tên: [${u.fullName}] | ID: ${u.id}`);
        console.log(`  + Kho vật tư: ${u._count.farmerSupplies} món`);
        console.log(`  + Giao dịch kho: ${u._count.farmerSupplyTransactions} GD`);
        console.log(`  + Chi phí ngoài: ${u._count.farmerExpenses} khoản`);
        console.log(`  + Đơn mua: ${u._count.orders} đơn`);
        console.log(`  + Số vườn: ${u.farms.length}`);
        for (const f of u.farms) {
            console.log(`    * Vườn: ${f.farmName} (${f.farmCode}) - Vụ: ${f.cropSeasons.map(s => `${s.name} [${s.status}]`).join(", ")}`);
        }
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
