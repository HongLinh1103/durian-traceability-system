"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
    WalletCards, 
    CircleDollarSign, 
    TrendingUp, 
    Receipt, 
    CreditCard, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Plus, 
    Printer, 
    QrCode, 
    Search, 
    Filter, 
    Building2, 
    DollarSign, 
    Layers, 
    Coins, 
    ArrowUpRight, 
    ArrowDownRight,
    FileText,
    Download,
    BarChart3,
    Sparkles,
    Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalesDispatchSlip, SalesDispatchData } from "./sales-dispatch-slip";
import { PartnerFinanceCharts, PartnerChartData } from "./partner-finance-charts";
import { computePartnerChartData } from "@/lib/partner-finance-analytics";

export type FinanceData = {
    facility: {
        id: string;
        name: string;
        type: string;
        representativeName: string;
    };
    kpis: {
        totalRevenue: number;
        totalReceived: number;
        totalReceivable: number;
        totalMaterialCost: number;
        totalOperatingExpense: number;
        totalExpense: number;
        totalPaidExpense: number;
        totalPayable: number;
        estimatedProfit: number;
    };
    chartData?: PartnerChartData;
    sales: Array<{
        id: string;
        lotCode: string;
        productName: string;
        quantity: number;
        remainingQuantity: number;
        unit: string;
        stockBeforeDispatch: number | null;
        buyerName: string | null;
        buyerPhone: string | null;
        buyerAddress: string | null;
        destinationName: string | null;
        unitPrice: number;
        subtotal: number;
        discount: number;
        totalAmount: number;
        paidAmount: number;
        debtAmount: number;
        paymentStatus: "PAID" | "PARTIAL" | "UNPAID" | string | null;
        paymentMethod: string;
        dispatchedAt: string | Date;
        status: string;
        traceabilityCode: {
            id: string;
            code: string;
            publicToken: string;
            status: string;
        } | null;
        payments: Array<{
            id: string;
            amount: number;
            paymentDate: string | Date;
            paymentMethod: string;
            payerName?: string | null;
            note?: string | null;
        }>;
    }>;
    expenses: Array<{
        id: string;
        category: string;
        title: string;
        amount: number;
        paidAmount: number;
        debtAmount: number;
        status: "PAID" | "PARTIAL" | "UNPAID" | string;
        expenseDate: string | Date;
        paymentMethod: string;
        recipient?: string | null;
        note?: string | null;
        receiptImageUrl?: string | null;
        payments: Array<{
            id: string;
            amount: number;
            paymentDate: string | Date;
            paymentMethod: string;
            receiverName?: string | null;
            note?: string | null;
        }>;
    }>;
    harvestPurchases: Array<{
        id: string;
        code: string;
        farmerName?: string | null;
        farmerPhone?: string | null;
        farmName: string;
        durianVariety: string;
        status: string;
        weight: number;
        pricePerKg: number;
        totalCost: number;
        date: string | Date;
    }>;
    paymentHistory: Array<{
        id: string;
        type: string;
        amount: number;
        paymentDate: string | Date;
        paymentMethod: string;
        payerName?: string | null;
        receiverName?: string | null;
        note?: string | null;
        commercialLotCode?: string | null;
        commercialProductName?: string | null;
        expenseTitle?: string | null;
        expenseCategory?: string | null;
    }>;
    processingBatches?: Array<{
        batchCode: string;
        date: string;
        inputWeight: number;
        outputWeight: number;
        lossWeight: number;
        yieldPercent: number;
        lossPercent: number;
    }>;
};

const EXPENSE_CATEGORY_NAMES: Record<string, string> = {
    RAW_MATERIAL: "Thu mua nguyên liệu",
    PROCESSING_LABOR: "Nhân công chế biến / Bốc xếp",
    PACKAGING: "Vật tư & Bao bì đóng gói",
    COLD_STORAGE_ELECTRICITY: "Điện kho lạnh bảo quản",
    LOGISTICS_TRANSPORT: "Vận chuyển & Giao nhận",
    EQUIPMENT_MAINTENANCE: "Bảo dưỡng máy & Kiểm nghiệm",
    FACTORY_OVERHEAD: "Chi phí vận hành xưởng",
    OTHER: "Chi phí khác",
};

export function PartnerFinanceManager({
    initialData,
    role = "COLLECTOR",
}: {
    initialData: FinanceData;
    role?: "COLLECTOR" | "PROCESSING_FACILITY";
}) {
    const [data, setData] = useState<FinanceData>(initialData);
    const [activeTab, setActiveTab] = useState<"ANALYTICS" | "SALES" | "EXPENSES" | "HISTORY">("ANALYTICS");
    const [selectedSaleForSlip, setSelectedSaleForSlip] = useState<SalesDispatchData | null>(null);
    const [issuingQr, setIssuingQr] = useState(false);

    // Debt collection modal
    const [selectedSaleForDebt, setSelectedSaleForDebt] = useState<FinanceData["sales"][0] | null>(null);
    const [debtCollectAmount, setDebtCollectAmount] = useState("");
    const [debtCollectMethod, setDebtCollectMethod] = useState("Chuyển khoản");
    const [debtCollectPayer, setDebtCollectPayer] = useState("");
    const [debtCollectNote, setDebtCollectNote] = useState("");
    const [submittingPayment, setSubmittingPayment] = useState(false);

    // Add expense modal
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [expenseCategory, setExpenseCategory] = useState("PROCESSING_LABOR");
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expensePaidAmount, setExpensePaidAmount] = useState("");
    const [expenseMethod, setExpenseMethod] = useState("Chuyển khoản");
    const [expenseRecipient, setExpenseRecipient] = useState("");
    const [expenseNote, setExpenseNote] = useState("");
    const [submittingExpense, setSubmittingExpense] = useState(false);

    // Filter states
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const isProcessing = role === "PROCESSING_FACILITY";

    async function refreshFinanceData() {
        try {
            const res = await fetch("/api/partner/finance");
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
            }
        } catch (err) {
            console.error("Failed to refresh finance data:", err);
        }
    }

    async function handleIssueQr(lotId: string) {
        setIssuingQr(true);
        try {
            const res = await fetch("/api/traceability/codes", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ commercialLotId: lotId }),
            });
            const result = await res.json();
            if (result.success) {
                await refreshFinanceData();
                if (selectedSaleForSlip && selectedSaleForSlip.id === lotId) {
                    setSelectedSaleForSlip((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  traceabilityCode: {
                                      id: result.data.id,
                                      code: result.data.code,
                                      publicToken: result.data.publicToken,
                                      status: result.data.status,
                                  },
                              }
                            : null
                    );
                }
            } else {
                alert(result.error || "Không thể tạo mã QR");
            }
        } catch (err) {
            alert("Lỗi khi tạo mã QR");
        } finally {
            setIssuingQr(false);
        }
    }

    async function handleCollectDebt(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedSaleForDebt) return;
        const amount = Number(debtCollectAmount.replace(/\D/g, ""));
        if (!amount || amount <= 0) {
            alert("Vui lòng nhập số tiền hợp lệ");
            return;
        }

        setSubmittingPayment(true);
        try {
            const res = await fetch("/api/partner/finance/payments", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    type: "RECEIPT",
                    commercialLotId: selectedSaleForDebt.id,
                    amount,
                    paymentMethod: debtCollectMethod,
                    payerName: debtCollectPayer || selectedSaleForDebt.buyerName || "Khách hàng",
                    note: debtCollectNote,
                }),
            });
            const result = await res.json();
            if (result.success) {
                await refreshFinanceData();
                setSelectedSaleForDebt(null);
                setDebtCollectAmount("");
                setDebtCollectNote("");
            } else {
                alert(result.error || "Không thể ghi nhận thanh toán");
            }
        } catch (err) {
            alert("Lỗi khi ghi nhận thanh toán");
        } finally {
            setSubmittingPayment(false);
        }
    }

    async function handleCreateExpense(e: React.FormEvent) {
        e.preventDefault();
        const amount = Number(expenseAmount.replace(/\D/g, ""));
        if (!expenseTitle.trim() || !amount || amount <= 0) {
            alert("Vui lòng nhập đầy đủ tên và số tiền chi phí");
            return;
        }
        const paidAmount = expensePaidAmount ? Number(expensePaidAmount.replace(/\D/g, "")) : amount;

        setSubmittingExpense(true);
        try {
            const res = await fetch("/api/partner/finance", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    category: expenseCategory,
                    title: expenseTitle.trim(),
                    amount,
                    paidAmount,
                    paymentMethod: expenseMethod,
                    recipient: expenseRecipient.trim() || undefined,
                    note: expenseNote.trim() || undefined,
                }),
            });
            const result = await res.json();
            if (result.success) {
                await refreshFinanceData();
                setShowAddExpenseModal(false);
                setExpenseTitle("");
                setExpenseAmount("");
                setExpensePaidAmount("");
                setExpenseRecipient("");
                setExpenseNote("");
            } else {
                alert(result.error || "Không thể tạo chi phí");
            }
        } catch (err) {
            alert("Lỗi khi tạo chi phí");
        } finally {
            setSubmittingExpense(false);
        }
    }

    const filteredSales = useMemo(() => {
        return data.sales.filter((sale) => {
            if (filterStatus !== "ALL" && sale.paymentStatus !== filterStatus) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = sale.lotCode.toLowerCase().includes(q);
                const matchProduct = sale.productName.toLowerCase().includes(q);
                const matchBuyer = (sale.buyerName || "").toLowerCase().includes(q);
                if (!matchCode && !matchProduct && !matchBuyer) return false;
            }
            return true;
        });
    }, [data.sales, filterStatus, searchQuery]);

    // Compute or format chartData
    const chartData = useMemo<PartnerChartData>(() => {
        if (data.chartData) return data.chartData;
        return computePartnerChartData({
            facilityType: role,
            commercialLots: data.sales,
            harvestPurchases: data.harvestPurchases,
            expenses: data.expenses,
            paymentRecords: data.paymentHistory,
            processingBatches: data.processingBatches,
            totalMaterialCost: data.kpis.totalMaterialCost,
        });
    }, [data, role]);

    const { kpis } = data;

    return (
        <div className="space-y-6">
            {/* CONCEPT CLARIFICATION BANNER */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 shadow-2xs">
                <div className="flex items-center gap-2 font-bold">
                    <Info className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Quy chuẩn chỉ số tài chính:</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                    <span><b>Doanh thu:</b> Giá trị hàng đã bán sau điều chỉnh/chiết khấu</span>
                    <span><b>Đã thu:</b> Tiền thực tế khách đã trả</span>
                    <span><b>Công nợ phải thu:</b> Tiền khách còn nợ</span>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Revenue Card */}
                <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-xs transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            {data.sales.length} lô xuất bán
                        </span>
                    </div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        1. Doanh thu xuất bán
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                        {kpis.totalRevenue.toLocaleString("vi-VN")} đ
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span>Đã thu: <b className="text-emerald-700 font-bold">{kpis.totalReceived.toLocaleString("vi-VN")} đ</b></span>
                        <span className="text-[11px] font-semibold text-emerald-600">
                            {kpis.totalRevenue > 0 ? `${Math.round((kpis.totalReceived / kpis.totalRevenue) * 100)}%` : "0%"}
                        </span>
                    </div>
                </div>

                {/* Receivables Card */}
                <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-xs transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <WalletCards className="h-6 w-6" />
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            kpis.totalReceivable > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                            {kpis.totalReceivable > 0 ? "Còn công nợ" : "Đã thu hết"}
                        </span>
                    </div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        2. Công nợ phải thu (Khách nợ)
                    </p>
                    <p className={`mt-1 text-2xl font-black ${kpis.totalReceivable > 0 ? "text-amber-600" : "text-slate-900"}`}>
                        {kpis.totalReceivable.toLocaleString("vi-VN")} đ
                    </p>
                    <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Chưa thu: {data.sales.filter((s) => s.debtAmount > 0).length} phiếu xuất</span>
                        <span className="font-bold text-amber-700">Cần thu hồi</span>
                    </div>
                </div>

                {/* Expenses Card */}
                <div className="rounded-3xl border border-rose-100 bg-white p-5 shadow-xs transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                            <Receipt className="h-6 w-6" />
                        </div>
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                            Thu mua + Vận hành
                        </span>
                    </div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        3. Tổng chi phí đầu vào & xưởng
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                        {kpis.totalExpense.toLocaleString("vi-VN")} đ
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span>Tiền sầu: <b>{kpis.totalMaterialCost.toLocaleString("vi-VN")} đ</b></span>
                        <span>Vận hành: <b>{kpis.totalOperatingExpense.toLocaleString("vi-VN")} đ</b></span>
                    </div>
                </div>

                {/* Profit Card */}
                <div className={`rounded-3xl border p-5 shadow-xs transition hover:shadow-md ${
                    kpis.estimatedProfit >= 0 ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"
                }`}>
                    <div className="flex items-center justify-between">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                            kpis.estimatedProfit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                            <CircleDollarSign className="h-6 w-6" />
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            kpis.estimatedProfit >= 0 ? "bg-emerald-200/70 text-emerald-900" : "bg-rose-200/70 text-rose-900"
                        }`}>
                            {kpis.estimatedProfit >= 0 ? "Lãi ước tính" : "Tạm lỗ"}
                        </span>
                    </div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-600">
                        4. Lợi nhuận ước tính (Gộp)
                    </p>
                    <p className={`mt-1 text-2xl font-black ${
                        kpis.estimatedProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}>
                        {kpis.estimatedProfit.toLocaleString("vi-VN")} đ
                    </p>
                    <div className="mt-2 text-xs text-slate-600 pt-2 border-t border-emerald-200/50">
                        Doanh thu ({kpis.totalRevenue.toLocaleString("vi-VN")} đ) - Chi phí ({kpis.totalExpense.toLocaleString("vi-VN")} đ)
                    </div>
                </div>
            </div>

            {/* Navigation Tabs & Actions Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab("ANALYTICS")}
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition whitespace-nowrap ${
                            activeTab === "ANALYTICS"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                        <BarChart3 className="h-4 w-4" />
                        Biểu Đồ Thống Kê (6 Biểu đồ)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("SALES")}
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition whitespace-nowrap ${
                            activeTab === "SALES"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                        <FileText className="h-4 w-4" />
                        Phiếu Xuất Bán & Công Nợ ({data.sales.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("EXPENSES")}
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition whitespace-nowrap ${
                            activeTab === "EXPENSES"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                        <Receipt className="h-4 w-4" />
                        Chi Phí & Công Nợ Phải Trả ({data.expenses.length + data.harvestPurchases.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("HISTORY")}
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition whitespace-nowrap ${
                            activeTab === "HISTORY"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                        <Clock className="h-4 w-4" />
                        Nhật Ký Dòng Tiền ({data.paymentHistory.length})
                    </button>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                        type="button"
                        onClick={() => setShowAddExpenseModal(true)}
                        className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold rounded-2xl text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5"
                    >
                        <Plus className="h-4 w-4 text-emerald-600" />
                        Thêm Khoản Chi
                    </Button>
                    <Link
                        href={isProcessing ? "/dashboard/processing/traceability" : "/dashboard/partner/traceability"}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-800 transition"
                    >
                        <FileText className="h-4 w-4" />
                        Xuất Lô Bán Hàng Mới
                    </Link>
                </div>
            </div>

            {/* TAB 0: BIỂU ĐỒ THỐNG KÊ (6 BIỂU ĐỒ) */}
            {activeTab === "ANALYTICS" && (
                <div className="space-y-6">
                    <PartnerFinanceCharts data={chartData} role={role} />
                </div>
            )}

            {/* TAB 1: PHIẾU XUẤT BÁN & CÔNG NỢ KHÁCH HÀNG */}
            {activeTab === "SALES" && (
                <div className="space-y-4">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-3xl border shadow-2xs">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm theo mã lô, sản phẩm, bên mua..."
                                className="pl-9 rounded-2xl text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto">
                            <span className="text-xs font-bold text-slate-400 shrink-0">Lọc theo:</span>
                            {["ALL", "PAID", "PARTIAL", "UNPAID"].map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setFilterStatus(st)}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                                        filterStatus === st
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {st === "ALL" && "Tất cả"}
                                    {st === "PAID" && "Đã thanh toán đủ"}
                                    {st === "PARTIAL" && "Thanh toán một phần"}
                                    {st === "UNPAID" && "Chưa thanh toán"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sales Table / Cards */}
                    <div className="grid gap-4">
                        {filteredSales.map((sale) => (
                            <div
                                key={sale.id}
                                className="rounded-3xl border bg-white p-5 shadow-xs hover:shadow-md transition space-y-4"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                                {sale.lotCode}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                sale.paymentStatus === "PAID"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : sale.paymentStatus === "PARTIAL"
                                                    ? "bg-amber-100 text-amber-800"
                                                    : "bg-rose-100 text-rose-800"
                                            }`}>
                                                {sale.paymentStatus === "PAID" && "Đã thanh toán đủ"}
                                                {sale.paymentStatus === "PARTIAL" && "Thanh toán 1 phần"}
                                                {sale.paymentStatus === "UNPAID" && "Chưa thanh toán"}
                                            </span>
                                        </div>
                                        <h3 className="mt-1.5 text-base font-black text-slate-900">{sale.productName}</h3>
                                        <p className="text-xs text-slate-500">
                                            Bên mua: <b className="text-slate-800">{sale.buyerName || sale.destinationName || "Chưa xác định"}</b>
                                            {sale.buyerPhone && ` · SĐT: ${sale.buyerPhone}`}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedSaleForSlip({
                                                id: sale.id,
                                                lotCode: sale.lotCode,
                                                productName: sale.productName,
                                                quantity: sale.quantity,
                                                unit: sale.unit,
                                                stockBeforeDispatch: sale.stockBeforeDispatch,
                                                buyerName: sale.buyerName || sale.destinationName,
                                                buyerPhone: sale.buyerPhone,
                                                buyerAddress: sale.buyerAddress,
                                                unitPrice: sale.unitPrice,
                                                subtotal: sale.subtotal,
                                                discount: sale.discount,
                                                totalAmount: sale.totalAmount,
                                                paidAmount: sale.paidAmount,
                                                debtAmount: sale.debtAmount,
                                                paymentStatus: sale.paymentStatus,
                                                paymentMethod: sale.paymentMethod,
                                                dispatchedAt: sale.dispatchedAt,
                                                ownerName: data.facility.name,
                                                ownerType: role,
                                                traceabilityCode: sale.traceabilityCode,
                                            })}
                                            className="rounded-xl text-xs font-bold h-8"
                                        >
                                            <FileText className="mr-1 h-3.5 w-3.5" />
                                            Xem & In Phiếu
                                        </Button>

                                        {sale.debtAmount > 0 && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedSaleForDebt(sale);
                                                    setDebtCollectAmount(sale.debtAmount.toLocaleString("vi-VN"));
                                                    setDebtCollectPayer(sale.buyerName || "");
                                                }}
                                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-8"
                                            >
                                                <Coins className="mr-1 h-3.5 w-3.5" />
                                                Thu nợ
                                            </Button>
                                        )}

                                        {sale.traceabilityCode ? (
                                            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8">
                                                <Link target="_blank" href={`/trace/${sale.traceabilityCode.publicToken}`}>
                                                    <QrCode className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                                    Mã QR
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={issuingQr}
                                                onClick={() => handleIssueQr(sale.id)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8"
                                            >
                                                <QrCode className="mr-1 h-3.5 w-3.5" />
                                                Tạo QR
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Financial Details Grid */}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs bg-slate-50 p-3.5 rounded-2xl">
                                    <div>
                                        <span className="text-slate-400 block">Khối lượng xuất:</span>
                                        <span className="font-bold text-slate-800">
                                            {sale.quantity.toLocaleString("vi-VN")} {sale.unit}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Đơn giá xuất:</span>
                                        <span className="font-bold text-slate-800">
                                            {sale.unitPrice > 0 ? `${sale.unitPrice.toLocaleString("vi-VN")} đ/${sale.unit}` : "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Tổng phải thu:</span>
                                        <span className="font-black text-slate-900">
                                            {sale.totalAmount.toLocaleString("vi-VN")} đ
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Đã thanh toán:</span>
                                        <span className="font-bold text-emerald-700">
                                            {sale.paidAmount.toLocaleString("vi-VN")} đ
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Còn nợ:</span>
                                        <span className={`font-black ${sale.debtAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                            {sale.debtAmount > 0 ? `${sale.debtAmount.toLocaleString("vi-VN")} đ` : "0 đ (Tất toán)"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!filteredSales.length && (
                            <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500">
                                Không tìm thấy phiếu xuất bán nào phù hợp.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: CHI PHÍ & CÔNG NỢ PHẢI TRẢ */}
            {activeTab === "EXPENSES" && (
                <div className="space-y-6">
                    {/* Raw Material Purchases from Farmers */}
                    <div className="rounded-3xl border bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                                    <Coins className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Tiền Mua Sầu Riêng Từ Nhà Vườn ({data.harvestPurchases.length})
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Tổng giá trị thu mua nguyên liệu: <b>{kpis.totalMaterialCost.toLocaleString("vi-VN")} đ</b>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {data.harvestPurchases.map((rec) => (
                                <div key={rec.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                                    <div>
                                        <span className="font-mono text-emerald-800 font-bold">{rec.code}</span> ·{" "}
                                        <b className="text-slate-800">{rec.farmName}</b> ({rec.farmerName || "Nông dân"})
                                        <p className="text-slate-500 mt-0.5">
                                            Giống: {rec.durianVariety} · Ngày nhận: {new Date(rec.date).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900 text-sm">
                                            {rec.totalCost.toLocaleString("vi-VN")} đ
                                        </p>
                                        <p className="text-slate-500">
                                            {rec.weight.toLocaleString("vi-VN")} kg × {rec.pricePerKg.toLocaleString("vi-VN")} đ/kg
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {!data.harvestPurchases.length && (
                                <p className="py-6 text-center text-slate-400">Chưa có giao dịch thu mua sầu riêng từ vườn.</p>
                            )}
                        </div>
                    </div>

                    {/* Operating Expenses */}
                    <div className="rounded-3xl border bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold">
                                    <Receipt className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Chi Phí Vận Hành Xưởng & Kho ({data.expenses.length})
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Tổng chi phí vận hành: <b>{kpis.totalOperatingExpense.toLocaleString("vi-VN")} đ</b>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {data.expenses.map((exp) => (
                                <div key={exp.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                                    <div>
                                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                            {EXPENSE_CATEGORY_NAMES[exp.category] || exp.category}
                                        </span>
                                        <h4 className="mt-1 font-bold text-slate-800 text-sm">{exp.title}</h4>
                                        <p className="text-slate-500">
                                            Người nhận: <b>{exp.recipient || "—"}</b> · Ngày chi: {new Date(exp.expenseDate).toLocaleDateString("vi-VN")} · {exp.paymentMethod}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900 text-sm">
                                            {exp.amount.toLocaleString("vi-VN")} đ
                                        </p>
                                        <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            exp.status === "PAID"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-amber-100 text-amber-800"
                                        }`}>
                                            {exp.status === "PAID" ? "Đã chi đủ" : `Còn nợ ${exp.debtAmount.toLocaleString("vi-VN")} đ`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {!data.expenses.length && (
                                <p className="py-6 text-center text-slate-400">Chưa có khoản chi phí vận hành nào.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: NHẬT KÝ DÒNG TIỀN */}
            {activeTab === "HISTORY" && (
                <div className="rounded-3xl border bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div>
                            <h3 className="text-base font-black text-slate-900">
                                Lịch Sử Thu / Chi Thực Tế ({data.paymentHistory.length})
                            </h3>
                            <p className="text-xs text-slate-500">
                                Theo dõi mọi dòng tiền ra vào qua tài khoản ngân hàng hoặc tiền mặt
                            </p>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {data.paymentHistory.map((pm) => (
                            <div key={pm.id} className="py-3 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
                                        pm.type === "RECEIPT" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                    }`}>
                                        {pm.type === "RECEIPT" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">
                                            {pm.type === "RECEIPT" ? "Thu tiền bán hàng" : "Chi trả chi phí"}
                                        </p>
                                        <p className="text-slate-500">
                                            {pm.commercialLotCode ? `Lô: ${pm.commercialLotCode} (${pm.commercialProductName})` : pm.expenseTitle}
                                            {pm.payerName && ` · Đối tác: ${pm.payerName}`}
                                            {pm.receiverName && ` · Người nhận: ${pm.receiverName}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-sm ${pm.type === "RECEIPT" ? "text-emerald-700" : "text-rose-700"}`}>
                                        {pm.type === "RECEIPT" ? "+" : "-"}{pm.amount.toLocaleString("vi-VN")} đ
                                    </p>
                                    <p className="text-slate-400 text-[11px]">
                                        {new Date(pm.paymentDate).toLocaleDateString("vi-VN")} · {pm.paymentMethod}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {!data.paymentHistory.length && (
                            <p className="py-8 text-center text-slate-400">Chưa có bản ghi dòng tiền nào.</p>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: SALES DISPATCH SLIP */}
            {selectedSaleForSlip && (
                <SalesDispatchSlip
                    data={selectedSaleForSlip}
                    onClose={() => setSelectedSaleForSlip(null)}
                    onIssueQr={handleIssueQr}
                    issuingQr={issuingQr}
                />
            )}

            {/* MODAL: COLLECT DEBT */}
            {selectedSaleForDebt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <form onSubmit={handleCollectDebt} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-black text-slate-900">Thu Nợ Bán Hàng</h3>
                            <button type="button" onClick={() => setSelectedSaleForDebt(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="text-xs bg-slate-50 p-3 rounded-2xl space-y-1">
                            <p>Mã lô: <b>{selectedSaleForDebt.lotCode}</b></p>
                            <p>Khách hàng: <b>{selectedSaleForDebt.buyerName || "—"}</b></p>
                            <p>Còn phải thu: <b className="text-rose-600">{selectedSaleForDebt.debtAmount.toLocaleString("vi-VN")} đ</b></p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Số tiền khách trả (đ) *</label>
                            <Input
                                required
                                value={debtCollectAmount}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    setDebtCollectAmount(val ? Number(val).toLocaleString("vi-VN") : "");
                                }}
                                placeholder="VD: 60.000.000"
                                className="rounded-xl font-bold text-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Phương thức thanh toán</label>
                            <select
                                value={debtCollectMethod}
                                onChange={(e) => setDebtCollectMethod(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2 text-sm"
                            >
                                <option value="Chuyển khoản">Chuyển khoản</option>
                                <option value="Tiền mặt">Tiền mặt</option>
                                <option value="Ví điện tử">Ví điện tử</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                            <Input
                                value={debtCollectNote}
                                onChange={(e) => setDebtCollectNote(e.target.value)}
                                placeholder="Thanh toán đợt 2 qua Vietcombank..."
                                className="rounded-xl text-sm"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setSelectedSaleForDebt(null)}>Hủy</Button>
                            <Button type="submit" disabled={submittingPayment} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                                {submittingPayment ? "Đang xử lý..." : "Xác nhận thu nợ"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: ADD EXPENSE */}
            {showAddExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <form onSubmit={handleCreateExpense} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-black text-slate-900">Thêm Khoản Chi Phí Mới</h3>
                            <button type="button" onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Danh mục chi phí *</label>
                                <select
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                    className="w-full rounded-xl border px-3 py-2 text-sm"
                                >
                                    <option value="PROCESSING_LABOR">Nhân công bóc múi / Bốc xếp</option>
                                    <option value="PACKAGING">Bao bì & khay hút chân không</option>
                                    <option value="COLD_STORAGE_ELECTRICITY">Điện kho lạnh bảo quản</option>
                                    <option value="LOGISTICS_TRANSPORT">Vận chuyển & xe lạnh</option>
                                    <option value="EQUIPMENT_MAINTENANCE">Bảo dưỡng thiết bị / QC</option>
                                    <option value="FACTORY_OVERHEAD">Chi phí vận hành xưởng</option>
                                    <option value="OTHER">Chi phí khác</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tên khoản chi *</label>
                                <Input
                                    required
                                    value={expenseTitle}
                                    onChange={(e) => setExpenseTitle(e.target.value)}
                                    placeholder="VD: Tiền nhân công bóc tách sầu..."
                                    className="rounded-xl text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tổng số tiền chi (đ) *</label>
                                <Input
                                    required
                                    value={expenseAmount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setExpenseAmount(val ? Number(val).toLocaleString("vi-VN") : "");
                                    }}
                                    placeholder="VD: 12.000.000"
                                    className="rounded-xl font-bold text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Số tiền đã trả (đ)</label>
                                <Input
                                    value={expensePaidAmount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setExpensePaidAmount(val ? Number(val).toLocaleString("vi-VN") : "");
                                    }}
                                    placeholder="Mặc định trả đủ nếu để trống"
                                    className="rounded-xl text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Người nhận / Đối tác</label>
                                <Input
                                    value={expenseRecipient}
                                    onChange={(e) => setExpenseRecipient(e.target.value)}
                                    placeholder="VD: Tổ bóc tách Trị An..."
                                    className="rounded-xl text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Phương thức thanh toán</label>
                                <select
                                    value={expenseMethod}
                                    onChange={(e) => setExpenseMethod(e.target.value)}
                                    className="w-full rounded-xl border px-3 py-2 text-sm"
                                >
                                    <option value="Chuyển khoản">Chuyển khoản</option>
                                    <option value="Tiền mặt">Tiền mặt</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                            <Input
                                value={expenseNote}
                                onChange={(e) => setExpenseNote(e.target.value)}
                                placeholder="Ghi chú chi tiết khoản chi..."
                                className="rounded-xl text-sm"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowAddExpenseModal(false)}>Hủy</Button>
                            <Button type="submit" disabled={submittingExpense} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                                {submittingExpense ? "Đang lưu..." : "Lưu khoản chi"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
