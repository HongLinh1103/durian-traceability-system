const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { parseEnv } = require('node:util');

async function main() {
    console.log("=== BẮT ĐẦU XỬ LÝ XÓA TÀI KHOẢN NÔNG DÂN ĐÃ KHÓA TRÊN PRODUCTION ===");

    const targetFile = path.resolve('.env.production.local');
    if (!fs.existsSync(targetFile)) {
        throw new Error('Không tìm thấy file .env.production.local chứa cấu hình Production.');
    }
    const envData = parseEnv(fs.readFileSync(targetFile, 'utf8'));
    const prodUrl = envData.DATABASE_URL;

    if (!prodUrl) {
        throw new Error('DATABASE_URL trong .env.production.local không tồn tại.');
    }

    console.log("Kết nối tới Production DB:", prodUrl.split('@')[1] || "...");

    const prismaProd = new PrismaClient({
        datasources: { db: { url: prodUrl } },
    });

    try {
        // 1. Tìm tất cả tài khoản nông dân có trạng thái đã khóa (isLocked: true) trên Production
        const lockedFarmers = await prismaProd.user.findMany({
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

        console.log(`[PROD] Tìm thấy ${lockedFarmers.length} tài khoản nông dân ở trạng thái "đã khóa".`);

        if (lockedFarmers.length === 0) {
            console.log("[PROD] Không có tài khoản nông dân đã khóa nào cần xóa trên Production.");
            return;
        }

        const farmerIds = lockedFarmers.map((f) => f.id);
        const farmIds = lockedFarmers.flatMap((f) => f.farms.map((farm) => farm.id));

        // 2. Sao lưu dữ liệu Production trước khi xóa
        const backupDir = path.join(process.cwd(), 'scratch', 'backup-deleted-accounts');
        fs.mkdirSync(backupDir, { recursive: true });
        const backupFile = path.join(backupDir, `backup-prod-locked-farmers-${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(lockedFarmers, null, 2), 'utf-8');
        console.log(`[PROD] Đã sao lưu ${lockedFarmers.length} tài khoản vào: ${backupFile}`);

        // 3. Thực hiện xóa an toàn trong transaction trên Production DB
        const result = await prismaProd.$transaction(async (tx) => {
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
        }, { timeout: 60000 });

        console.log(`[PROD] Đã xóa thành công:`);
        console.log(`- Số vườn liên kết đã xóa trên Production: ${result.deletedFarmsCount}`);
        console.log(`- Số tài khoản nông dân đã xóa trên Production: ${result.deletedUsersCount}`);

        // 4. Kiểm tra lại dữ liệu Production sau khi xóa
        const remainingLocked = await prismaProd.user.count({
            where: {
                isLocked: true,
                deletedAt: null,
            },
        });
        const totalFarmers = await prismaProd.user.count({
            where: {
                role: "FARMER",
                deletedAt: null,
            },
        });
        const totalUsers = await prismaProd.user.count({
            where: {
                deletedAt: null,
            },
        });
        const roleBreakdown = await prismaProd.user.groupBy({
            by: ['role'],
            where: { deletedAt: null },
            _count: true,
        });

        console.log("\n=== KẾT QUẢ KIỂM TRA PRODUCTION SAU KHI XÓA ===");
        console.log(`- Số tài khoản đang bị khóa còn lại trên Production: ${remainingLocked}`);
        console.log(`- Số tài khoản nông dân đang hoạt động còn lại trên Production: ${totalFarmers}`);
        console.log(`- Tổng số tài khoản người dùng hợp lệ còn lại trên Production: ${totalUsers}`);
        console.log("- Phân bổ theo vai trò trên Production:", roleBreakdown);

    } finally {
        await prismaProd.$disconnect();
    }
}

main().catch((err) => {
    console.error("[PROD] Lỗi trong quá trình xóa tài khoản trên Production:", err);
    process.exit(1);
});
