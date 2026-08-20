import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
    console.log("[INFO] KIỂM TRA TOÀN DIỆN DỮ LIỆU TÀI CHÍNH CỬA HÀNG...");
    console.log("==================================================");

    // 1. Kiểm tra Cửa hàng & Chủ cửa hàng
    const store = await prisma.store.findFirst({
        where: { id: "seed-store-tri-an" },
        include: { owner: true },
    });

    if (!store) {
        throw new Error("Không tìm thấy cửa hàng seed-store-tri-an!");
    }
    console.log(`[OK] 1. Cửa hàng: "${store.name}" thuộc chủ sở hữu: ${store.owner.fullName} (${store.owner.phone})`);

    // 2. Kiểm tra Sản phẩm & Tồn kho không âm
    const products = await prisma.storeProduct.findMany({
        where: { storeId: store.id },
    });
    console.log(`[OK] 2. Tổng số sản phẩm trong cửa hàng: ${products.length}`);
    
    let hasNegativeStock = false;
    for (const p of products) {
        if (p.stock < 0) {
            console.error(`[ERROR] Sản phẩm ${p.name} có stock âm: ${p.stock}`);
            hasNegativeStock = true;
        }
    }
    if (!hasNegativeStock) {
        console.log("   [OK] Đảm bảo 100% sản phẩm có tồn kho >= 0 (không bị âm kho).");
    }

    // 3. Kiểm tra Nông dân (FARMER)
    const farmers = await prisma.user.findMany({
        where: { role: "FARMER", phone: { startsWith: "098100" } },
    });
    console.log(`[OK] 3. Số lượng nông dân (FARMER) mua hàng: ${farmers.length}`);

    // 4. Kiểm tra Đơn hàng & Liên kết nghiệp vụ
    const orders = await prisma.order.findMany({
        where: { storeId: store.id },
        include: {
            farmer: true,
            inventoryDocuments: { select: { code: true, type: true } },
            items: {
                include: { product: true },
            },
            histories: true,
        },
    });
    console.log(`[OK] 4. Tổng số đơn hàng: ${orders.length}`);

    // Trạng thái đơn hàng
    const statusCounts: Record<string, number> = {};
    let invalidFarmerFk = 0;
    let invalidProductFk = 0;
    let totalItems = 0;
    const completedWithoutExport: string[] = [];

    for (const o of orders) {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        if (["DELIVERED", "COMPLETED"].includes(o.status) && !o.inventoryDocuments.some((document) => document.type === "PX")) {
            completedWithoutExport.push(o.orderCode);
        }
        if (!o.farmer || o.farmer.role !== "FARMER") invalidFarmerFk++;
        for (const item of o.items) {
            totalItems++;
            if (!item.product || item.product.storeId !== store.id) invalidProductFk++;
        }
    }

    console.log("   Phân bố trạng thái đơn hàng:");
    for (const [st, count] of Object.entries(statusCounts)) {
        console.log(`   - ${st}: ${count} đơn`);
    }

    if (invalidFarmerFk === 0) {
        console.log("   [OK] 100% đơn hàng liên kết đúng tài khoản FARMER hợp lệ.");
    } else {
        console.error(`[ERROR] Có ${invalidFarmerFk} đơn hàng lỗi FK farmer!`);
    }

    if (invalidProductFk === 0) {
        console.log(`   [OK] 100% OrderItem (${totalItems} mục) liên kết đúng sản phẩm của cửa hàng.`);
    } else {
        console.error(`[ERROR] Có ${invalidProductFk} OrderItem lỗi FK product!`);
    }
    console.log(`   ${completedWithoutExport.length === 0 ? "[OK]" : "[ERROR]"} Đơn hoàn tất/đã giao thiếu phiếu PX: ${completedWithoutExport.length}${completedWithoutExport.length ? ` (${completedWithoutExport.join(", ")})` : ""}`);

    // 5. Kiểm tra Chứng từ kho (InventoryDocument & Movements)
    const invDocs = await prisma.inventoryDocument.findMany({
        where: { storeId: store.id },
        include: { movements: true },
    });
    const totalMovements = invDocs.reduce((s, d) => s + d.movements.length, 0);
    console.log(`[OK] 5. Tổng chứng từ kho: ${invDocs.length} phiếu (${totalMovements} dòng biến động nhập/xuất kho).`);

    // 6. Kiểm tra Chi phí vận hành (StoreExpense)
    const expenses = await prisma.storeExpense.findMany({
        where: { storeId: store.id },
    });
    const totalExpenseAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
    console.log(`[OK] 6. Tổng số khoản chi phí vận hành: ${expenses.length} khoản (Tổng chi: ${totalExpenseAmount.toLocaleString("vi-VN")} đ).`);

    // 7. Kiểm tra tính toán Doanh thu, Giá vốn & Lợi nhuận (Loại trừ CANCELLED/REJECTED)
    let validRevenue = 0;
    let validCogs = 0;
    let excludedRevenue = 0;

    for (const o of orders) {
        const isEligible = ["DELIVERED", "COMPLETED"].includes(o.status);
        if (isEligible) {
            validRevenue += Number(o.subtotal);
            for (const item of o.items) {
                validCogs += Number(item.costPrice || 0) * item.quantity;
            }
        } else if (["CANCELLED", "REJECTED"].includes(o.status)) {
            excludedRevenue += Number(o.subtotal);
        }
    }

    const grossProfit = validRevenue - validCogs;
    const netProfit = grossProfit - totalExpenseAmount;

    console.log(`
[INFO] BÁO CÁO TÀI CHÍNH HỢP LỆ (LOẠI BỎ ĐƠN HỦY/TỪ CHỐI):
--------------------------------------------------
- Doanh thu bán hàng (Đơn DELIVERED/COMPLETED): ${validRevenue.toLocaleString("vi-VN")} đ
- Doanh thu đơn HỦY/TỪ CHỐI (Bị loại bỏ):       ${excludedRevenue.toLocaleString("vi-VN")} đ (KHÔNG tính vào doanh thu)
- Giá vốn hàng bán (COGS):                     ${validCogs.toLocaleString("vi-VN")} đ
- Lợi nhuận gộp:                               ${grossProfit.toLocaleString("vi-VN")} đ (${Math.round((grossProfit / validRevenue) * 1000) / 10}%)
- Chi phí vận hành:                            ${totalExpenseAmount.toLocaleString("vi-VN")} đ
- Lợi nhuận ròng:                              ${netProfit.toLocaleString("vi-VN")} đ (${Math.round((netProfit / validRevenue) * 1000) / 10}%)
==================================================
`);
}

verify()
    .catch((e) => {
        console.error("[ERROR] Lỗi kiểm tra:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
