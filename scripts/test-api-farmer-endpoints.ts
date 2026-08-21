import { prisma } from "../src/lib/prisma";

async function testFarmer(phone: string) {
    const user = await prisma.user.findUnique({
        where: { phone },
        include: {
            farms: {
                include: {
                    cropSeasons: true,
                },
            },
            farmerSupplies: true,
            farmerSupplyTransactions: {
                include: { supply: true },
            },
            farmerExpenses: true,
        },
    });

    if (!user) {
        console.log(`❌ Không tìm thấy user có SĐT ${phone}`);
        return;
    }

    console.log(`\n==================================================`);
    console.log(`🧪 KIỂM TRA TÀI KHOẢN: ${user.fullName} (${user.phone})`);
    console.log(`   - Role: ${user.role} | AccountStatus: ${user.accountStatus} | Approved: ${user.isApproved}`);
    console.log(`   - Số vườn: ${user.farms.length}`);
    for (const f of user.farms) {
        console.log(`     * Vườn: ${f.farmName} (${f.farmCode})`);
        console.log(`       Vụ mùa: ${f.cropSeasons.map(s => `${s.name} [${s.status}] id=${s.id}`).join(", ")}`);
    }

    console.log(`   - Tồn kho vật tư: ${user.farmerSupplies.length} món`);
    user.farmerSupplies.slice(0, 3).forEach(s => {
        console.log(`     * ${s.name} (${s.type}): Tồn ${s.quantity} ${s.unit} - Giá: ${s.unitPrice}`);
    });

    console.log(`   - Giao dịch kho: ${user.farmerSupplyTransactions.length} GD (Nhập: ${user.farmerSupplyTransactions.filter(t => t.type === 'IN').length}, Xuất: ${user.farmerSupplyTransactions.filter(t => t.type === 'OUT').length})`);
    console.log(`   - Chi phí ngoài: ${user.farmerExpenses.length} khoản chi`);
    user.farmerExpenses.forEach(e => {
        console.log(`     * [${e.category}] ${e.title}: ${Number(e.amount).toLocaleString('vi-VN')} đ`);
    });
}

async function main() {
    await testFarmer("0912345678"); // Trần Văn Minh
    await testFarmer("0981000001"); // Nguyễn Văn An
    await testFarmer("0912345670"); // Nguyễn Văn Được
}

main().finally(() => prisma.$disconnect());
