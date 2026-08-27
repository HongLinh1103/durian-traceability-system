import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerFinanceManager } from "@/components/partner/partner-finance-manager";
import { computePartnerChartData } from "@/lib/partner-finance-analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role)) {
        redirect("/login");
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, deletedAt: null },
    });

    if (!facility) {
        redirect("/dashboard/partner");
    }

    // Fetch Commercial Lots (Sales)
    const commercialLots = await prisma.commercialLot.findMany({
        where: { ownerId: facility.id },
        include: {
            destination: true,
            traceabilityCode: true,
            paymentRecords: { orderBy: { paymentDate: "desc" } },
        },
        orderBy: { createdAt: "desc" },
    });

    // Fetch Raw Material Purchases from Farmers
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

    // Fetch Operating Expenses
    const expenses = await prisma.partnerExpense.findMany({
        where: { facilityId: facility.id },
        include: {
            payments: { orderBy: { paymentDate: "desc" } },
        },
        orderBy: { expenseDate: "desc" },
    });

    // Fetch Cashflow Payments
    const paymentRecords = await prisma.partnerPaymentRecord.findMany({
        where: { facilityId: facility.id },
        include: {
            commercialLot: { select: { lotCode: true, productName: true, buyerName: true } },
            expense: { select: { title: true, category: true } },
        },
        orderBy: { paymentDate: "desc" },
    });

    // Fetch Processing Batches (if PROCESSING_FACILITY)
    const processingBatches = facility.type === "PROCESSING_FACILITY"
        ? await prisma.processingBatch.findMany({
              where: { facilityId: facility.id },
              orderBy: { startedAt: "desc" },
          })
        : [];

    // Compute KPIs
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

    let totalMaterialCost = 0;
    harvestPurchases.forEach((rec) => {
        const weight = Number(rec.receivedWeight ?? rec.actualWeight ?? rec.expectedWeight);
        const price = Number(rec.expectedPricePerKg ?? 0);
        totalMaterialCost += weight * price;
    });

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

    const formattedSales = commercialLots.map((lot) => {
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
    });

    const formattedExpenses = expenses.map((exp) => ({
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
    }));

    const formattedHarvestPurchases = harvestPurchases.map((rec) => {
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
    });

    const formattedPaymentHistory = paymentRecords.map((p) => ({
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
    }));

    const formattedBatches = processingBatches.map((b) => {
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

    const chartData = computePartnerChartData({
        facilityType: facility.type as "COLLECTOR" | "PROCESSING_FACILITY",
        commercialLots: formattedSales,
        harvestPurchases: formattedHarvestPurchases,
        expenses: formattedExpenses,
        paymentRecords: formattedPaymentHistory,
        processingBatches: formattedBatches,
        totalMaterialCost,
    });

    const financeData = {
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
        sales: formattedSales,
        expenses: formattedExpenses,
        harvestPurchases: formattedHarvestPurchases,
        paymentHistory: formattedPaymentHistory,
        processingBatches: formattedBatches,
    };

    return (
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6">
            <header className="rounded-3xl border bg-gradient-to-r from-emerald-800 to-teal-900 p-6 shadow-sm text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                            {session.user.role === "COLLECTOR" ? "Vựa Thu Mua Nông Sản" : "Cơ Sở Chế Biến & Đóng Gói"}
                        </p>
                        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
                            Quản Lý Tài Chính & Công Nợ
                        </h1>
                        <p className="mt-1 text-sm text-emerald-100 font-medium">
                            {facility.name} · Báo cáo doanh thu xuất bán, dòng tiền thu chi, công nợ và biểu đồ thống kê chuyên sâu
                        </p>
                    </div>
                </div>
            </header>

            <PartnerFinanceManager
                initialData={financeData}
                role={session.user.role as "COLLECTOR" | "PROCESSING_FACILITY"}
            />
        </main>
    );
}
