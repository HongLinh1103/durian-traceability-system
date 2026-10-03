import { lockFarmerStock, rebuildMaterialFifo } from "@/lib/farmer-material-fifo";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function resolveFarmerId(session: any): Promise<string | null> {
    if (session?.user?.id) {
        const u = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
        });
        if (u) return u.id;
    }
    if (session?.user?.phone) {
        const u = await prisma.user.findUnique({
            where: { phone: session.user.phone },
            select: { id: true },
        });
        if (u) return u.id;
    }
    if (session?.user?.email) {
        const u = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (u) return u.id;
    }
    return null;
}

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const farmerId = await resolveFarmerId(session);
    if (!farmerId) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Tìm các đơn mua đã DELIVERED hoặc COMPLETED của nông dân
    const completedOrders = await prisma.order.findMany({
        where: {
            farmerId,
            status: { in: ["DELIVERED", "COMPLETED"] },
            deletedAt: null,
        },
        include: {
            store: { select: { name: true } },
            items: {
                include: {
                    product: true,
                    batches: { include: { productBatch: true } },
                },
            },
        },
    });

    if (completedOrders.length === 0) {
        return NextResponse.json({
            success: true,
            message: "Không có đơn mua nào đã hoàn tất cần nhập kho.",
            syncedCount: 0,
        });
    }

    // Lấy danh sách orderItemId đã từng nhập kho
    const existingSupplies = await prisma.farmerSupply.findMany({
        where: {
            farmerId: farmerId,
            orderItemId: { not: null },
        },
        select: { orderItemId: true },
    });

    const importedOrderItemIds = new Set(
        existingSupplies.map((s) => s.orderItemId).filter(Boolean),
    );

    let syncedCount = 0;

    await prisma.$transaction(async (tx) => {
        await lockFarmerStock(tx, farmerId);
        const imported = await tx.farmerSupply.findMany({ where: { farmerId, orderItemId: { not: null } }, select: { orderItemId: true } });
        for (const supply of imported) if (supply.orderItemId) importedOrderItemIds.add(supply.orderItemId);
        for (const order of completedOrders) {
            for (const item of order.items) {
                if (importedOrderItemIds.has(item.id)) continue;

                // Xác định loại vật tư dựa trên product hoặc tên
                let supplyType: "FERTILIZER" | "PESTICIDE" | "EQUIPMENT" | "OTHER" = "OTHER";
                if (item.product?.type === "FERTILIZER") supplyType = "FERTILIZER";
                else if (item.product?.type === "PESTICIDE") supplyType = "PESTICIDE";
                else if (item.product?.type === "EQUIPMENT") supplyType = "EQUIPMENT";
                else {
                    const lowerName = item.productName.toLowerCase();
                    if (lowerName.includes("phân") || lowerName.includes("npk") || lowerName.includes("hữu cơ")) {
                        supplyType = "FERTILIZER";
                    } else if (lowerName.includes("thuốc") || lowerName.includes("sâu") || lowerName.includes("bệnh") || lowerName.includes("trừ")) {
                        supplyType = "PESTICIDE";
                    } else if (lowerName.includes("bình") || lowerName.includes("kéo") || lowerName.includes("dây")) {
                        supplyType = "EQUIPMENT";
                    }
                }

                // Keep each receipt/batch separate; the UI aggregates the material, not the receipt.
                const receipts = item.batches.length ? item.batches.map(batch => ({ quantity: Number(batch.quantity), batch: batch.productBatch })) : [{ quantity: item.quantity, batch: null }];
                if (Math.abs(receipts.reduce((sum, receipt) => sum + receipt.quantity, 0) - item.quantity) > 0.000001) throw new Error("Phân bổ lô hàng không khớp số lượng đơn mua");
                for (const receipt of receipts) {
                    const supply = await tx.farmerSupply.create({ data: {
                        farmerId, name: item.productName, type: supplyType, brand: item.product?.brand || item.storeName,
                        unit: item.unit, quantity: receipt.quantity, unitPrice: item.unitPrice,
                        phiDays: item.product?.phiDays ?? null, orderItemId: item.id, productId: item.productId,
                        productBatchId: receipt.batch?.id || null, orderId: order.id, storeId: order.storeId,
                        sourceType: "STORE_PURCHASE", verified: true, notes: "Nhập tự động từ đơn mua " + order.orderCode,
                    } });
                    await tx.farmerSupplyTransaction.create({ data: {
                        supplyId: supply.id, farmerId, type: "IN", quantity: receipt.quantity,
                        unitPrice: item.unitPrice, totalAmount: Number(item.unitPrice) * receipt.quantity,
                        purpose: "Nhập từ đơn hàng " + order.orderCode, notes: "Đơn mua vật tư " + order.orderCode,
                        actionDate: order.createdAt, expiryDate: receipt.batch?.expiryDate || null,
                    } });
                }
                importedOrderItemIds.add(item.id);
                syncedCount++;
            }
        }
        await rebuildMaterialFifo(tx, farmerId);
    }, { timeout: 30000 });

    return NextResponse.json({
        success: true,
        message: `Đã nhập kho thành công ${syncedCount} mặt hàng từ đơn mua đã giao.`,
        syncedCount,
    });
}
