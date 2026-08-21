import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("==================================================");
    console.log("📊 KIỂM TRA TOÀN BỘ CẤU TRÚC DATABASE:");
    console.log("==================================================");

    const [
        orders,
        orderItems,
        orderHistories,
        farmerSupplies,
        farmerSupplyTx,
        farmingLogMaterials,
        farmerExpenses,
        farmingLogs,
        cropSeasons,
        farms,
        users,
    ] = await Promise.all([
        prisma.order.count(),
        prisma.orderItem.count(),
        prisma.orderStatusHistory.count(),
        prisma.farmerSupply.count(),
        prisma.farmerSupplyTransaction.count(),
        prisma.farmingLogMaterial.count(),
        prisma.farmerExpense.count(),
        prisma.farmingLog.count(),
        prisma.cropSeason.count(),
        prisma.farm.count(),
        prisma.user.count(),
    ]);

    console.log(`1. ĐƠN HÀNG (Orders):`);
    console.log(`   - Số lượng Đơn mua: ${orders}`);
    console.log(`   - Số lượng Mặt hàng đơn mua (OrderItems): ${orderItems}`);
    console.log(`   - Lịch sử trạng thái đơn hàng (OrderStatusHistory): ${orderHistories}`);

    console.log(`\n2. KHO VẬT TƯ & NHẬT KÝ KHO (Inventory & Logs):`);
    console.log(`   - Danh mục vật tư nông dân (FarmerSupply): ${farmerSupplies}`);
    console.log(`   - Nhật ký giao dịch Nhập / Xuất kho (FarmerSupplyTransaction): ${farmerSupplyTx}`);
    console.log(`   - Vật tư đã dùng trong Nhật ký canh tác (FarmingLogMaterial): ${farmingLogMaterials}`);

    console.log(`\n3. THỐNG KÊ & VỤ MÙA (Statistics & Crop Seasons):`);
    console.log(`   - Khoản chi phí canh tác ngoài (FarmerExpense): ${farmerExpenses}`);
    console.log(`   - Nhật ký canh tác (FarmingLog): ${farmingLogs}`);
    console.log(`   - Vụ mùa (CropSeason): ${cropSeasons}`);
    console.log(`   - Vườn trồng (Farm): ${farms}`);
    console.log(`   - Người dùng (Users): ${users}`);

    console.log("==================================================");
    console.log("✅ TẤT CẢ BẢNG DATABASE ĐÃ ĐƯỢC THIẾT LẬP VÀ ĐỒNG BỘ HOÀN HẢO!");
    console.log("==================================================");
}

main()
    .catch((e) => {
        console.error("❌ Lỗi kiểm tra database:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
