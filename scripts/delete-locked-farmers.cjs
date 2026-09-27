const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== BẮT ĐẦU XỬ LÝ XÓA TÀI KHOẢN NÔNG DÂN ĐÃ KHÓA ===");

    // 1. Tìm tất cả tài khoản nông dân có trạng thái đã khóa (isLocked: true)
    const lockedFarmers = await prisma.user.findMany({
        where: {
            role: "FARMER",
            isLocked: true,
            deletedAt: null,
        },
        include: {
            farms: true,
            farmingPlans: true,
            createdHarvests: true,
            orders: true,
            cartItems: true,
            farmerCommercialLots: true,
            farmerExpenses: true,
            farmerSupplies: true,
        },
    });

    console.log(`Tìm thấy ${lockedFarmers.length} tài khoản nông dân ở trạng thái "đã khóa".`);

    if (lockedFarmers.length === 0) {
        console.log("Không có tài khoản nông dân đã khóa nào cần xóa.");
        return;
    }

    const farmerIds = lockedFarmers.map((f) => f.id);
    const farmIds = lockedFarmers.flatMap((f) => f.farms.map((farm) => farm.id));

    // 2. Sao lưu dữ liệu vào thư mục scratch trước khi xóa
    const backupDir = path.join(process.cwd(), 'scratch', 'backup-deleted-accounts');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `backup-locked-farmers-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(lockedFarmers, null, 2), 'utf-8');
    console.log(`Đã sao lưu ${lockedFarmers.length} tài khoản vào: ${backupFile}`);

    // 3. Thực hiện xóa an toàn trong transaction
    const result = await prisma.$transaction(async (tx) => {
        // Xóa các vườn (farm) liên kết
        const deletedFarms = await tx.farm.deleteMany({
            where: {
                farmerId: { in: farmerIds },
            },
        });

        // Xóa các tài khoản người dùng
        const deletedUsers = await tx.user.deleteMany({
            where: {
                id: { in: farmerIds },
            },
        });

        return {
            deletedFarmsCount: deletedFarms.count,
            deletedUsersCount: deletedUsers.count,
        };
    });

    console.log(`Đã xóa thành công:`);
    console.log(`- Số vườn liên kết đã xóa: ${result.deletedFarmsCount}`);
    console.log(`- Số tài khoản nông dân đã xóa: ${result.deletedUsersCount}`);

    // 4. Kiểm tra lại dữ liệu sau khi xóa
    const remainingLocked = await prisma.user.count({
        where: {
            isLocked: true,
            deletedAt: null,
        },
    });
    const totalFarmers = await prisma.user.count({
        where: {
            role: "FARMER",
            deletedAt: null,
        },
    });
    const totalUsers = await prisma.user.count({
        where: {
            deletedAt: null,
        },
    });

    console.log("\n=== KẾT QUẢ KIỂM TRA HỆ THỐNG SAU KHI XÓA ===");
    console.log(`- Số tài khoản đang bị khóa còn lại trong hệ thống: ${remainingLocked}`);
    console.log(`- Số tài khoản nông dân đang hoạt động còn lại: ${totalFarmers}`);
    console.log(`- Tổng số tài khoản người dùng hợp lệ còn lại: ${totalUsers}`);
}

main()
    .catch((err) => {
        console.error("Lỗi trong quá trình xóa tài khoản:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
