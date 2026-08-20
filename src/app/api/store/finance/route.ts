import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const store = await prisma.store.findFirst({
            where: { ownerId: session.user.id, deletedAt: null },
        });

        if (!store) {
            return NextResponse.json({ success: false, message: "Không tìm thấy cửa hàng." }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "30days";
        const customFrom = searchParams.get("from");
        const customTo = searchParams.get("to");
        const categoryFilter = searchParams.get("category") || "ALL";

        // Determine date filter
        const now = new Date();
        let startDate: Date;
        let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (range === "today") {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        } else if (range === "7days") {
            startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
        } else if (range === "thisMonth") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        } else if (range === "custom" && customFrom) {
            startDate = new Date(`${customFrom}T00:00:00.000Z`);
            if (customTo) {
                endDate = new Date(`${customTo}T23:59:59.999Z`);
            }
        } else {
            // Default 30 days
            startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
        }

        // Fetch products for reference & inventory calculations
        const products = await prisma.storeProduct.findMany({
            where: { storeId: store.id, deletedAt: null },
            select: {
                id: true,
                name: true,
                type: true,
                price: true,
                salePrice: true,
                costPrice: true,
                stock: true,
                unit: true,
                imageUrls: true,
            },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        // Fetch Orders in store
        const orders = await prisma.order.findMany({
            where: {
                storeId: store.id,
                deletedAt: null,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                items: true,
                farmer: {
                    select: {
                        fullName: true,
                        phone: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Fetch Expenses in store
        const expenses = await prisma.storeExpense.findMany({
            where: {
                storeId: store.id,
                expenseDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { expenseDate: "desc" },
        });

        // 1. Calculations for Orders, Revenue, COGS, and Receivables
        let totalRevenue = 0;
        let totalCogs = 0;
        let completedOrderCount = 0;
        let totalItemsSold = 0;
        let totalReceivable = 0; // Phải thu khách hàng

        const orderReports = orders.map((order) => {
            const isDeliveredOrCompleted = ["DELIVERED", "COMPLETED"].includes(order.status);
            const orderRevenue = isDeliveredOrCompleted ? Number(order.subtotal) : 0;
            
            // Calculate COGS for this order
            let orderCogs = 0;
            for (const item of order.items) {
                const prod = item.productId ? productMap.get(item.productId) : null;
                const itemCostPrice = Number(item.costPrice || prod?.costPrice || (Number(item.unitPrice) * 0.7)); // fallback 70% if no cost price recorded
                const itemQuantity = item.quantity;
                if (isDeliveredOrCompleted) {
                    orderCogs += itemCostPrice * itemQuantity;
                }

                if (isDeliveredOrCompleted) {
                    totalItemsSold += itemQuantity;
                }
            }

            const orderProfit = orderRevenue - orderCogs;
            const marginPercent = orderRevenue > 0 ? (orderProfit / orderRevenue) * 100 : 0;

            if (isDeliveredOrCompleted) {
                totalRevenue += orderRevenue;
                totalCogs += orderCogs;
                completedOrderCount += 1;
            }

            // Phải thu
            if (order.paymentStatus !== "PAID" && !["CANCELLED", "REJECTED"].includes(order.status)) {
                const paid = Number(order.paidAmount || 0);
                const due = (orderRevenue + Number(order.shippingFee || 0)) - paid;
                if (due > 0) {
                    totalReceivable += due;
                }
            }

            return {
                id: order.id,
                orderCode: order.orderCode,
                createdAt: order.createdAt.toISOString(),
                farmerName: order.farmer?.fullName || order.recipientName,
                farmerPhone: order.farmer?.phone || order.recipientPhone,
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                paidAmount: order.paidAmount ? Number(order.paidAmount) : 0,
                revenue: orderRevenue,
                cogs: orderCogs,
                profit: orderProfit,
                marginPercent: Math.round(marginPercent * 10) / 10,
                itemCount: order.items.length,
            };
        });

        // 2. Calculations for Expenses & Payables
        let operationalExpenses = 0;
        let importGoodsExpenses = 0;
        let totalPayable = 0; // Phải trả

        const expenseCategoriesCount: Record<string, number> = {};

        for (const exp of expenses) {
            const amount = Number(exp.amount);
            if (exp.category === "IMPORT_GOODS") {
                importGoodsExpenses += amount;
            } else {
                operationalExpenses += amount;
            }

            expenseCategoriesCount[exp.category] = (expenseCategoriesCount[exp.category] || 0) + amount;

            if (exp.status !== "PAID") {
                const paid = Number(exp.paidAmount || 0);
                const due = amount - paid;
                if (due > 0) {
                    totalPayable += due;
                }
            }
        }

        // 3. Gross & Net Profit
        const grossProfit = totalRevenue - totalCogs;
        const netProfit = grossProfit - operationalExpenses;
        const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        const averageOrderValue = completedOrderCount > 0 ? totalRevenue / completedOrderCount : 0;

        // 4. Daily Chart Breakdown
        const dailyMap = new Map<string, { date: string; revenue: number; cogs: number; expenses: number; profit: number }>();

        // Pre-fill days in range
        const dayCursor = new Date(startDate);
        while (dayCursor <= endDate) {
            const dayKey = dayCursor.toISOString().slice(0, 10);
            dailyMap.set(dayKey, {
                date: dayKey,
                revenue: 0,
                cogs: 0,
                expenses: 0,
                profit: 0,
            });
            dayCursor.setDate(dayCursor.getDate() + 1);
        }

        for (const order of orders) {
            if (["DELIVERED", "COMPLETED"].includes(order.status)) {
                const dayKey = order.createdAt.toISOString().slice(0, 10);
                const entry = dailyMap.get(dayKey) || { date: dayKey, revenue: 0, cogs: 0, expenses: 0, profit: 0 };
                const rev = Number(order.subtotal);
                let cg = 0;
                for (const item of order.items) {
                    const prod = item.productId ? productMap.get(item.productId) : null;
                    const itemCost = Number(item.costPrice || prod?.costPrice || (Number(item.unitPrice) * 0.7));
                    cg += itemCost * item.quantity;
                }
                entry.revenue += rev;
                entry.cogs += cg;
                entry.profit += (rev - cg);
                dailyMap.set(dayKey, entry);
            }
        }

        for (const exp of expenses) {
            const dayKey = exp.expenseDate.toISOString().slice(0, 10);
            const entry = dailyMap.get(dayKey) || { date: dayKey, revenue: 0, cogs: 0, expenses: 0, profit: 0 };
            const amount = Number(exp.amount);
            if (exp.category !== "IMPORT_GOODS") {
                entry.expenses += amount;
                entry.profit -= amount;
            }
            dailyMap.set(dayKey, entry);
        }

        const chartData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // 5. Product Sales Performance
        const productStatsMap = new Map<
            string,
            { id: string; name: string; type: string; unit: string; soldQty: number; revenue: number; cogs: number; profit: number; stock: number; costPrice: number }
        >();

        for (const p of products) {
            productStatsMap.set(p.id, {
                id: p.id,
                name: p.name,
                type: p.type,
                unit: p.unit,
                soldQty: 0,
                revenue: 0,
                cogs: 0,
                profit: 0,
                stock: p.stock,
                costPrice: Number(p.costPrice || (Number(p.price) * 0.7)),
            });
        }

        for (const order of orders) {
            if (["DELIVERED", "COMPLETED"].includes(order.status)) {
                for (const item of order.items) {
                    if (item.productId && productStatsMap.has(item.productId)) {
                        const stat = productStatsMap.get(item.productId)!;
                        const qty = item.quantity;
                        const rev = Number(item.unitPrice) * qty;
                        const cg = Number(item.costPrice || stat.costPrice) * qty;
                        stat.soldQty += qty;
                        stat.revenue += rev;
                        stat.cogs += cg;
                        stat.profit += (rev - cg);
                    }
                }
            }
        }

        let productReports = Array.from(productStatsMap.values());
        if (categoryFilter !== "ALL") {
            productReports = productReports.filter((p) => p.type === categoryFilter);
        }

        const topSellingProducts = [...productReports]
            .sort((a, b) => b.soldQty - a.soldQty)
            .slice(0, 10);

        const topProfitProducts = [...productReports]
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);

        // 6. Inventory Valuation
        let totalInventoryValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        const inventoryItems = products.map((p) => {
            const costPrice = Number(p.costPrice || (Number(p.price) * 0.7));
            const inventoryValue = p.stock * costPrice;
            totalInventoryValue += inventoryValue;

            if (p.stock === 0) {
                outOfStockCount += 1;
            } else if (p.stock <= 10) {
                lowStockCount += 1;
            }

            return {
                id: p.id,
                name: p.name,
                type: p.type,
                stock: p.stock,
                unit: p.unit,
                price: Number(p.price),
                costPrice,
                inventoryValue,
                isLowStock: p.stock > 0 && p.stock <= 10,
                isOutOfStock: p.stock === 0,
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalCogs,
                    grossProfit,
                    grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
                    operationalExpenses,
                    importGoodsExpenses,
                    totalExpenses: totalCogs + operationalExpenses,
                    netProfit,
                    netMarginPercent: Math.round(netMarginPercent * 10) / 10,
                    completedOrderCount,
                    totalOrdersCount: orders.length,
                    averageOrderValue: Math.round(averageOrderValue),
                    totalItemsSold,
                    totalReceivable,
                    totalPayable,
                    totalInventoryValue,
                    lowStockCount,
                    outOfStockCount,
                    totalProductsCount: products.length,
                },
                chartData,
                orderReports,
                productReports,
                topSellingProducts,
                topProfitProducts,
                inventoryItems,
                expenses: expenses.map((e) => ({
                    id: e.id,
                    category: e.category,
                    expenseDate: e.expenseDate.toISOString(),
                    amount: Number(e.amount),
                    title: e.title,
                    note: e.note,
                    recipient: e.recipient,
                    paymentMethod: e.paymentMethod,
                    status: e.status,
                    paidAmount: e.paidAmount ? Number(e.paidAmount) : Number(e.amount),
                })),
                expenseCategoriesCount,
            },
        });
    } catch (error) {
        console.error("GET /api/store/finance error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải dữ liệu tài chính." }, { status: 500 });
    }
}
