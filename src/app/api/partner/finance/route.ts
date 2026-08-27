import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerExpenseCategory, ExpensePaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createExpenseSchema = z.object({
    category: z.nativeEnum(PartnerExpenseCategory),
    title: z.string().trim().min(2).max(200),
    amount: z.coerce.number().positive(),
    paidAmount: z.coerce.number().min(0).default(0),
    status: z.nativeEnum(ExpensePaymentStatus).optional(),
    expenseDate: z.coerce.date().default(() => new Date()),
    paymentMethod: z.string().trim().default("CHUYEN_KHOAN"),
    recipient: z.string().trim().optional(),
    note: z.string().trim().max(500).optional(),
    receiptImageUrl: z.string().trim().optional(),
});

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role)) {
        return NextResponse.json({ success: false, error: "Không có quyền truy cập" }, { status: 403 });
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, deletedAt: null },
    });

    if (!facility) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin đơn vị" }, { status: 404 });
    }

    // 1. Fetch all sales dispatches (Commercial Lots)
    const commercialLots = await prisma.commercialLot.findMany({
        where: { ownerId: facility.id },
        include: {
            destination: true,
            traceabilityCode: true,
            paymentRecords: { orderBy: { paymentDate: "desc" } },
        },
        orderBy: { createdAt: "desc" },
    });

    // 2. Fetch raw material purchases from farmers (Harvest records)
    const harvestPurchases = await prisma.harvestRecord.findMany({
        where: {
            buyerUserId: session.user.id,
            status: { notIn: ["REJECTED", "CANCELLED"] },
        },
        include: {
            farm: { select: { farmName: true, farmer: { select: { fullName: true, phone: true } } } },
        },
        orderBy: { expectedHarvestDate: "desc" },
    });

    // 3. Fetch operating expenses
    const expenses = await prisma.partnerExpense.findMany({
        where: { facilityId: facility.id },
        include: {
            payments: { orderBy: { paymentDate: "desc" } },
        },
        orderBy: { expenseDate: "desc" },
    });

    // 4. Fetch all payment records (Cashflow)
    const paymentRecords = await prisma.partnerPaymentRecord.findMany({
        where: { facilityId: facility.id },
        include: {
            commercialLot: { select: { lotCode: true, productName: true, buyerName: true } },
            expense: { select: { title: true, category: true } },
        },
        orderBy: { paymentDate: "desc" },
    });

    // 5. Fetch processing batches (if facility is PROCESSING_FACILITY)
    const processingBatches = facility.type === "PROCESSING_FACILITY"
        ? await prisma.processingBatch.findMany({
              where: { facilityId: facility.id },
              orderBy: { startedAt: "desc" },
          })
        : [];

    // Compute Overall KPIs
    let totalRevenue = 0;
    let totalReceived = 0;
    let totalReceivable = 0;

    commercialLots.forEach((lot) => {
        const total = lot.totalAmount ? Number(lot.totalAmount) : (lot.unitPrice ? Number(lot.unitPrice) * Number(lot.quantity) - Number(lot.discount || 0) : 0);
        const paid = Number(lot.paidAmount || 0);
        const debt = Math.max(0, total - paid);
        totalRevenue += total;
        totalReceived += paid;
        totalReceivable += debt;
    });

    // Material purchase costs from farmers
    let totalMaterialCost = 0;
    harvestPurchases.forEach((rec) => {
        const weight = Number(rec.receivedWeight ?? rec.actualWeight ?? rec.expectedWeight);
        const price = Number(rec.expectedPricePerKg ?? 0);
        totalMaterialCost += weight * price;
    });

    // Operating expenses
    let totalOperatingExpense = 0;
    let totalPaidExpense = 0;
    let totalPayable = 0;

    expenses.forEach((exp) => {
        const amt = Number(exp.amount);
        const paid = Number(exp.paidAmount || 0);
        const debt = Math.max(0, amt - paid);
        totalOperatingExpense += amt;
        totalPaidExpense += paid;
        totalPayable += debt;
    });

    const totalExpense = totalMaterialCost + totalOperatingExpense;
    const estimatedProfit = totalRevenue - totalExpense;

    // -------------------------------------------------------------
    // STATISTICAL CHART AGGREGATION
    // -------------------------------------------------------------

    // Helper: format Date to YYYY-MM
    const getMonthKey = (date: Date) => {
        const d = new Date(date);
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const y = d.getFullYear();
        return `T${m}/${y}`;
    };

    const monthlyMap = new Map<string, {
        month: string;
        revenue: number;
        purchaseCost: number;
        operatingExpense: number;
        totalExpense: number;
        profit: number;
        cashIn: number;
        cashOut: number;
        purchaseWeight: number;
        salesWeight: number;
        inputWeight: number;
        outputWeight: number;
        lossPercent: number;
    }>();

    // Initialize with recent 4 months up to current
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = getMonthKey(d);
        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                month: key,
                revenue: 0,
                purchaseCost: 0,
                operatingExpense: 0,
                totalExpense: 0,
                profit: 0,
                cashIn: 0,
                cashOut: 0,
                purchaseWeight: 0,
                salesWeight: 0,
                inputWeight: 0,
                outputWeight: 0,
                lossPercent: 0,
            });
        }
    }

    // Add Sales to monthly data
    commercialLots.forEach((lot) => {
        const date = lot.dispatchedAt ? new Date(lot.dispatchedAt) : new Date(lot.createdAt);
        const key = getMonthKey(date);
        const total = lot.totalAmount ? Number(lot.totalAmount) : (lot.unitPrice ? Number(lot.unitPrice) * Number(lot.quantity) - Number(lot.discount || 0) : 0);
        const qty = Number(lot.quantity || 0);

        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                month: key,
                revenue: 0,
                purchaseCost: 0,
                operatingExpense: 0,
                totalExpense: 0,
                profit: 0,
                cashIn: 0,
                cashOut: 0,
                purchaseWeight: 0,
                salesWeight: 0,
                inputWeight: 0,
                outputWeight: 0,
                lossPercent: 0,
            });
        }
        const item = monthlyMap.get(key)!;
        item.revenue += total;
        item.salesWeight += qty;
    });

    // Add Purchases to monthly data
    harvestPurchases.forEach((rec) => {
        const date = rec.completedAt ?? rec.buyerReceivedAt ?? rec.expectedHarvestDate;
        const key = getMonthKey(date);
        const weight = Number(rec.receivedWeight ?? rec.actualWeight ?? rec.expectedWeight);
        const price = Number(rec.expectedPricePerKg ?? 0);
        const cost = weight * price;

        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                month: key,
                revenue: 0,
                purchaseCost: 0,
                operatingExpense: 0,
                totalExpense: 0,
                profit: 0,
                cashIn: 0,
                cashOut: 0,
                purchaseWeight: 0,
                salesWeight: 0,
                inputWeight: 0,
                outputWeight: 0,
                lossPercent: 0,
            });
        }
        const item = monthlyMap.get(key)!;
        item.purchaseCost += cost;
        item.purchaseWeight += weight;
    });

    // Add Expenses to monthly data
    expenses.forEach((exp) => {
        const date = new Date(exp.expenseDate);
        const key = getMonthKey(date);
        const amt = Number(exp.amount || 0);

        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                month: key,
                revenue: 0,
                purchaseCost: 0,
                operatingExpense: 0,
                totalExpense: 0,
                profit: 0,
                cashIn: 0,
                cashOut: 0,
                purchaseWeight: 0,
                salesWeight: 0,
                inputWeight: 0,
                outputWeight: 0,
                lossPercent: 0,
            });
        }
        const item = monthlyMap.get(key)!;
        item.operatingExpense += amt;
    });

    // Add Cash Payments (Cashflow In/Out) to monthly data
    paymentRecords.forEach((p) => {
        const date = new Date(p.paymentDate);
        const key = getMonthKey(date);
        const amt = Number(p.amount || 0);

        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                month: key,
                revenue: 0,
                purchaseCost: 0,
                operatingExpense: 0,
                totalExpense: 0,
                profit: 0,
                cashIn: 0,
                cashOut: 0,
                purchaseWeight: 0,
                salesWeight: 0,
                inputWeight: 0,
                outputWeight: 0,
                lossPercent: 0,
            });
        }
        const item = monthlyMap.get(key)!;
        if (p.type === "RECEIPT") item.cashIn += amt;
        else item.cashOut += amt;
    });

    // Add Processing Batches to monthly data
    processingBatches.forEach((batch) => {
        const date = new Date(batch.startedAt);
        const key = getMonthKey(date);
        const inWeight = Number(batch.totalInputWeight || 0);
        const outWeight = Number(batch.totalOutputWeight || 0);

        if (monthlyMap.has(key)) {
            const item = monthlyMap.get(key)!;
            item.inputWeight += inWeight;
            item.outputWeight += outWeight;
        }
    });

    // Calculate Totals & Profit for each month
    const monthlyData = Array.from(monthlyMap.values()).map((m) => {
        const totalExp = m.purchaseCost + m.operatingExpense;
        const lossWeight = Math.max(0, m.inputWeight - m.outputWeight);
        const lossPercent = m.inputWeight > 0 ? Number(((lossWeight / m.inputWeight) * 100).toFixed(1)) : 0;
        return {
            ...m,
            totalExpense: totalExp,
            profit: m.revenue - totalExp,
            lossPercent,
        };
    });

    // Expense Structure breakdown
    const categoryTotals: Record<string, number> = {
        RAW_MATERIAL: totalMaterialCost,
        PROCESSING_LABOR: 0,
        PACKAGING: 0,
        COLD_STORAGE_ELECTRICITY: 0,
        LOGISTICS_TRANSPORT: 0,
        EQUIPMENT_MAINTENANCE: 0,
        FACTORY_OVERHEAD: 0,
        OTHER: 0,
    };

    expenses.forEach((exp) => {
        if (categoryTotals[exp.category] !== undefined) {
            categoryTotals[exp.category] += Number(exp.amount || 0);
        } else {
            categoryTotals.OTHER += Number(exp.amount || 0);
        }
    });

    const categoryNames: Record<string, { label: string; color: string }> = {
        RAW_MATERIAL: { label: facility.type === "COLLECTOR" ? "Thu mua nông sản tươi" : "Nguyên liệu sầu riêng tươi", color: "#10b981" },
        PROCESSING_LABOR: { label: "Nhân công bóc múi & chế biến", color: "#3b82f6" },
        PACKAGING: { label: "Bao bì đóng gói & khay hút chân không", color: "#8b5cf6" },
        COLD_STORAGE_ELECTRICITY: { label: "Điện kho lạnh bảo quản (-18°C)", color: "#06b6d4" },
        LOGISTICS_TRANSPORT: { label: "Vận chuyển & Logistics xe lạnh", color: "#f59e0b" },
        EQUIPMENT_MAINTENANCE: { label: "Bảo dưỡng thiết bị & Kiểm định QC", color: "#ec4899" },
        FACTORY_OVERHEAD: { label: "Chi phí vận hành xưởng", color: "#64748b" },
        OTHER: { label: "Chi phí khác", color: "#94a3b8" },
    };

    const expenseStructure = Object.entries(categoryTotals)
        .filter(([_, val]) => val > 0)
        .map(([cat, val]) => ({
            name: categoryNames[cat]?.label || cat,
            value: val,
            color: categoryNames[cat]?.color || "#64748b",
        }));

    // Customer Debts Breakdown
    const customerDebtsMap = new Map<string, { name: string; debtAmount: number; paidAmount: number; totalAmount: number }>();
    commercialLots.forEach((lot) => {
        const name = lot.buyerName || lot.destination?.name || "Khách hàng";
        const total = lot.totalAmount ? Number(lot.totalAmount) : (lot.unitPrice ? Number(lot.unitPrice) * Number(lot.quantity) - Number(lot.discount || 0) : 0);
        const paid = Number(lot.paidAmount || 0);
        const debt = Math.max(0, total - paid);

        if (!customerDebtsMap.has(name)) {
            customerDebtsMap.set(name, { name, debtAmount: 0, paidAmount: 0, totalAmount: 0 });
        }
        const c = customerDebtsMap.get(name)!;
        c.debtAmount += debt;
        c.paidAmount += paid;
        c.totalAmount += total;
    });
    const customerDebts = Array.from(customerDebtsMap.values())
        .sort((a, b) => b.debtAmount - a.debtAmount)
        .slice(0, 6);

    // Payable Debts Breakdown (Suppliers / Farmers)
    const payableDebtsMap = new Map<string, { name: string; debtAmount: number; paidAmount: number; totalAmount: number }>();
    expenses.forEach((exp) => {
        const name = exp.recipient || categoryNames[exp.category]?.label || "Đối tác";
        const total = Number(exp.amount || 0);
        const paid = Number(exp.paidAmount || 0);
        const debt = Math.max(0, total - paid);

        if (debt > 0) {
            if (!payableDebtsMap.has(name)) {
                payableDebtsMap.set(name, { name, debtAmount: 0, paidAmount: 0, totalAmount: 0 });
            }
            const p = payableDebtsMap.get(name)!;
            p.debtAmount += debt;
            p.paidAmount += paid;
            p.totalAmount += total;
        }
    });
    const payableDebts = Array.from(payableDebtsMap.values()).slice(0, 6);

    // Customer Revenue Breakdown
    const customerRevenueMap = new Map<string, { name: string; revenue: number; weight: number }>();
    commercialLots.forEach((lot) => {
        const name = lot.buyerName || lot.destination?.name || "Khách hàng";
        const total = lot.totalAmount ? Number(lot.totalAmount) : (lot.unitPrice ? Number(lot.unitPrice) * Number(lot.quantity) - Number(lot.discount || 0) : 0);
        const weight = Number(lot.quantity || 0);

        if (!customerRevenueMap.has(name)) {
            customerRevenueMap.set(name, { name, revenue: 0, weight: 0 });
        }
        const cr = customerRevenueMap.get(name)!;
        cr.revenue += total;
        cr.weight += weight;
    });
    const customerRevenue = Array.from(customerRevenueMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

    // Product Revenue Breakdown
    const productRevenueMap = new Map<string, { name: string; revenue: number; weight: number }>();
    commercialLots.forEach((lot) => {
        const name = lot.productName || "Sầu riêng";
        const total = lot.totalAmount ? Number(lot.totalAmount) : (lot.unitPrice ? Number(lot.unitPrice) * Number(lot.quantity) - Number(lot.discount || 0) : 0);
        const weight = Number(lot.quantity || 0);

        if (!productRevenueMap.has(name)) {
            productRevenueMap.set(name, { name, revenue: 0, weight: 0 });
        }
        const pr = productRevenueMap.get(name)!;
        pr.revenue += total;
        pr.weight += weight;
    });
    const productRevenue = Array.from(productRevenueMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

    // Payment Methods Breakdown
    const paymentMethodsMap = new Map<string, { name: string; value: number; count: number; color: string }>();
    const pmColors: Record<string, string> = {
        "Chuyển khoản": "#059669",
        "Tiền mặt": "#0284c7",
        "Công nợ": "#f59e0b",
        "Ví điện tử": "#8b5cf6",
        "Khác": "#94a3b8",
    };

    commercialLots.forEach((lot) => {
        const pm = lot.paymentMethod || "Chuyển khoản";
        const total = lot.totalAmount ? Number(lot.totalAmount) : (lot.unitPrice ? Number(lot.unitPrice) * Number(lot.quantity) - Number(lot.discount || 0) : 0);
        if (!paymentMethodsMap.has(pm)) {
            paymentMethodsMap.set(pm, {
                name: pm,
                value: 0,
                count: 0,
                color: pmColors[pm] || "#64748b",
            });
        }
        const item = paymentMethodsMap.get(pm)!;
        item.value += total;
        item.count += 1;
    });
    const paymentMethods = Array.from(paymentMethodsMap.values());

    // Processing batches yield and loss percent
    const batchYieldList = processingBatches.map((b) => {
        const inW = Number(b.totalInputWeight || 0);
        const outW = Number(b.totalOutputWeight || 0);
        const lossW = Number(b.lossWeight || Math.max(0, inW - outW));
        const yieldP = b.yieldPercent ? Number(b.yieldPercent) : (inW > 0 ? Number(((outW / inW) * 100).toFixed(1)) : 0);
        const lossP = inW > 0 ? Number(((lossW / inW) * 100).toFixed(1)) : 0;
        return {
            batchCode: b.batchCode,
            date: b.startedAt.toISOString().slice(0, 10),
            inputWeight: inW,
            outputWeight: outW,
            lossWeight: lossW,
            yieldPercent: yieldP,
            lossPercent: lossP,
        };
    });

    const chartData = {
        role: facility.type as "COLLECTOR" | "PROCESSING_FACILITY",
        monthlyData,
        expenseStructure,
        customerDebts,
        payableDebts,
        customerRevenue,
        productRevenue,
        paymentMethods,
        processingBatches: batchYieldList,
    };

    return NextResponse.json({
        success: true,
        data: {
            facility: {
                id: facility.id,
                name: facility.name,
                type: facility.type,
                representativeName: facility.representativeName,
            },
            kpis: {
                totalRevenue,
                totalReceived,
                totalReceivable,
                totalMaterialCost,
                totalOperatingExpense,
                totalExpense,
                totalPaidExpense,
                totalPayable,
                estimatedProfit,
            },
            chartData,
            sales: commercialLots.map((lot) => {
                const qty = Number(lot.quantity);
                const unitPrice = lot.unitPrice ? Number(lot.unitPrice) : 0;
                const subtotal = lot.subtotal ? Number(lot.subtotal) : (unitPrice * qty);
                const discount = Number(lot.discount || 0);
                const totalAmount = lot.totalAmount ? Number(lot.totalAmount) : Math.max(0, subtotal - discount);
                const paidAmount = Number(lot.paidAmount || 0);
                const debtAmount = Number(lot.debtAmount || Math.max(0, totalAmount - paidAmount));

                return {
                    id: lot.id,
                    lotCode: lot.lotCode,
                    productName: lot.productName,
                    quantity: qty,
                    remainingQuantity: Number(lot.remainingQuantity),
                    unit: lot.unit,
                    stockBeforeDispatch: lot.stockBeforeDispatch ? Number(lot.stockBeforeDispatch) : null,
                    buyerName: lot.buyerName || lot.destination?.name || "Khách hàng",
                    buyerPhone: lot.buyerPhone || lot.destination?.contactPhone || null,
                    buyerAddress: lot.buyerAddress || lot.destination?.address || null,
                    destinationName: lot.destination?.name || null,
                    unitPrice,
                    subtotal,
                    discount,
                    totalAmount,
                    paidAmount,
                    debtAmount,
                    paymentStatus: lot.paymentStatus,
                    paymentMethod: lot.paymentMethod || "Chuyển khoản",
                    dispatchedAt: lot.dispatchedAt ? lot.dispatchedAt.toISOString() : lot.createdAt.toISOString(),
                    status: lot.status,
                    traceabilityCode: lot.traceabilityCode ? {
                        id: lot.traceabilityCode.id,
                        code: lot.traceabilityCode.code,
                        publicToken: lot.traceabilityCode.publicToken,
                        status: lot.traceabilityCode.status,
                    } : null,
                    payments: lot.paymentRecords.map((p) => ({
                        id: p.id,
                        amount: Number(p.amount),
                        paymentDate: p.paymentDate.toISOString(),
                        paymentMethod: p.paymentMethod,
                        payerName: p.payerName,
                        note: p.note,
                    })),
                };
            }),
            expenses: expenses.map((exp) => ({
                id: exp.id,
                category: exp.category,
                title: exp.title,
                amount: Number(exp.amount),
                paidAmount: Number(exp.paidAmount || 0),
                debtAmount: Math.max(0, Number(exp.amount) - Number(exp.paidAmount || 0)),
                status: exp.status,
                expenseDate: exp.expenseDate.toISOString(),
                paymentMethod: exp.paymentMethod,
                recipient: exp.recipient,
                note: exp.note,
                receiptImageUrl: exp.receiptImageUrl,
                payments: exp.payments.map((p) => ({
                    id: p.id,
                    amount: Number(p.amount),
                    paymentDate: p.paymentDate.toISOString(),
                    paymentMethod: p.paymentMethod,
                    receiverName: p.receiverName,
                    note: p.note,
                })),
            })),
            harvestPurchases: harvestPurchases.map((rec) => {
                const weight = Number(rec.receivedWeight ?? rec.actualWeight ?? rec.expectedWeight);
                const price = Number(rec.expectedPricePerKg ?? 0);
                return {
                    id: rec.id,
                    code: rec.code,
                    farmerName: rec.farm.farmer.fullName,
                    farmerPhone: rec.farm.farmer.phone,
                    farmName: rec.farm.farmName,
                    durianVariety: rec.durianVariety,
                    status: rec.status,
                    weight,
                    pricePerKg: price,
                    totalCost: weight * price,
                    date: (rec.completedAt ?? rec.buyerReceivedAt ?? rec.expectedHarvestDate).toISOString(),
                };
            }),
            paymentHistory: paymentRecords.map((p) => ({
                id: p.id,
                type: p.type,
                amount: Number(p.amount),
                paymentDate: p.paymentDate.toISOString(),
                paymentMethod: p.paymentMethod,
                payerName: p.payerName,
                receiverName: p.receiverName,
                note: p.note,
                commercialLotCode: p.commercialLot?.lotCode,
                commercialProductName: p.commercialLot?.productName,
                expenseTitle: p.expense?.title,
                expenseCategory: p.expense?.category,
            })),
        },
    });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role)) {
        return NextResponse.json({ success: false, error: "Không có quyền truy cập" }, { status: 403 });
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, deletedAt: null },
    });

    if (!facility) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin đơn vị" }, { status: 404 });
    }

    try {
        const body = await request.json();
        const parsed = createExpenseSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ",
            }, { status: 400 });
        }

        const { amount, paidAmount } = parsed.data;
        let status: ExpensePaymentStatus = "UNPAID";
        if (paidAmount >= amount) status = "PAID";
        else if (paidAmount > 0) status = "PARTIAL";

        const expense = await prisma.partnerExpense.create({
            data: {
                facilityId: facility.id,
                category: parsed.data.category,
                title: parsed.data.title,
                amount: parsed.data.amount,
                paidAmount: parsed.data.paidAmount,
                status: parsed.data.status || status,
                expenseDate: parsed.data.expenseDate,
                paymentMethod: parsed.data.paymentMethod,
                recipient: parsed.data.recipient,
                note: parsed.data.note,
                receiptImageUrl: parsed.data.receiptImageUrl,
            },
        });

        if (paidAmount > 0) {
            await prisma.partnerPaymentRecord.create({
                data: {
                    facilityId: facility.id,
                    expenseId: expense.id,
                    type: "DISBURSEMENT",
                    amount: paidAmount,
                    paymentDate: parsed.data.expenseDate,
                    paymentMethod: parsed.data.paymentMethod,
                    receiverName: parsed.data.recipient,
                    note: `Chi trả: ${parsed.data.title}`,
                },
            });
        }

        return NextResponse.json({ success: true, data: expense });
    } catch (err: any) {
        console.error("Failed to create partner expense:", err);
        return NextResponse.json({ success: false, error: err.message || "Không thể tạo khoản chi phí" }, { status: 500 });
    }
}
