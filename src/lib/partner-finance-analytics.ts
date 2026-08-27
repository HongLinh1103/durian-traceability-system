import { PartnerChartData } from "@/components/partner/partner-finance-charts";

export function computePartnerChartData({
    facilityType,
    commercialLots,
    harvestPurchases,
    expenses,
    paymentRecords,
    processingBatches = [],
    totalMaterialCost = 0,
}: {
    facilityType: "COLLECTOR" | "PROCESSING_FACILITY";
    commercialLots: any[];
    harvestPurchases: any[];
    expenses: any[];
    paymentRecords: any[];
    processingBatches?: any[];
    totalMaterialCost?: number;
}): PartnerChartData {
    const getMonthKey = (dateInput: any) => {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "T08/2026";
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

    // Initialize with recent 4 months up to current (e.g. T05, T06, T07, T08)
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
        const date = rec.completedAt ?? rec.buyerReceivedAt ?? rec.expectedHarvestDate ?? rec.date;
        const key = getMonthKey(date);
        const weight = Number(rec.receivedWeight ?? rec.actualWeight ?? rec.expectedWeight ?? rec.weight ?? 0);
        const price = Number(rec.expectedPricePerKg ?? rec.pricePerKg ?? 0);
        const cost = rec.totalCost ? Number(rec.totalCost) : weight * price;

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

    // Add Operating Expenses to monthly data
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

    // Add Cash Payments to monthly data
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
        const date = new Date(batch.startedAt || batch.date);
        const key = getMonthKey(date);
        const inWeight = Number(batch.totalInputWeight || batch.inputWeight || 0);
        const outWeight = Number(batch.totalOutputWeight || batch.outputWeight || 0);

        if (monthlyMap.has(key)) {
            const item = monthlyMap.get(key)!;
            item.inputWeight += inWeight;
            item.outputWeight += outWeight;
        }
    });

    // Compute month totals & sort chronologically
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

    // Expense Structure Breakdown
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
        RAW_MATERIAL: { label: facilityType === "COLLECTOR" ? "Thu mua nông sản tươi" : "Nguyên liệu sầu riêng tươi", color: "#10b981" },
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

    // Payable Debts Breakdown
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

    // Batch yields list
    const batchYieldList = processingBatches.map((b) => {
        const inW = Number(b.totalInputWeight || b.inputWeight || 0);
        const outW = Number(b.totalOutputWeight || b.outputWeight || 0);
        const lossW = Number(b.lossWeight || Math.max(0, inW - outW));
        const yieldP = b.yieldPercent ? Number(b.yieldPercent) : (inW > 0 ? Number(((outW / inW) * 100).toFixed(1)) : 0);
        const lossP = inW > 0 ? Number(((lossW / inW) * 100).toFixed(1)) : 0;
        const dateStr = b.startedAt instanceof Date ? b.startedAt.toISOString().slice(0, 10) : (b.date || "");
        return {
            batchCode: b.batchCode,
            date: dateStr,
            inputWeight: inW,
            outputWeight: outW,
            lossWeight: lossW,
            yieldPercent: yieldP,
            lossPercent: lossP,
        };
    });

    return {
        role: facilityType,
        monthlyData,
        expenseStructure,
        customerDebts,
        payableDebts,
        customerRevenue,
        productRevenue,
        paymentMethods,
        processingBatches: batchYieldList,
    };
}
