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
    Info,
    Calendar,
    ArrowRight,
    Eye,
    X,
    Banknote,
    History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalPortal } from "@/components/ui/modal-portal";
import { SalesDispatchSlip, SalesDispatchData } from "./sales-dispatch-slip";
import { PartnerFinanceCharts, PartnerChartData } from "./partner-finance-charts";
import { computePartnerChartData } from "@/lib/partner-finance-analytics";
import { QrCodeViewerModal, QrModalData } from "@/components/traceability/qr-code-viewer-modal";

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
            referenceCode?: string | null;
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
            referenceCode?: string | null;
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
        paidAmount?: number;
        debtAmount?: number;
        paymentStatus?: "PAID" | "PARTIAL" | "UNPAID" | string;
        expenseId?: string | null;
        payments?: Array<{
            id: string;
            amount: number;
            paymentDate: string | Date;
            paymentMethod: string;
            receiverName?: string | null;
            referenceCode?: string | null;
            note?: string | null;
        }>;
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
        referenceCode?: string | null;
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
    
    // Slips & QR modals
    const [selectedSaleForSlip, setSelectedSaleForSlip] = useState<SalesDispatchData | null>(null);
    const [selectedQrData, setSelectedQrData] = useState<QrModalData | null>(null);
    const [issuingQr, setIssuingQr] = useState(false);

    // Filter states
    const [salesFilterStatus, setSalesFilterStatus] = useState<string>("ALL");
    const [salesSearchQuery, setSalesSearchQuery] = useState("");
    const [expenseFilterStatus, setExpenseFilterStatus] = useState<string>("UNPAID");
    const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
    const [historyFilterType, setHistoryFilterType] = useState<"ALL" | "RECEIPT" | "PAYMENT">("ALL");

    // Modal: GHI NHẬN THU TIỀN (Bán hàng)
    const [selectedSaleForCollect, setSelectedSaleForCollect] = useState<FinanceData["sales"][0] | null>(null);
    const [collectAmount, setCollectAmount] = useState("");
    const [collectDate, setCollectDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [collectMethod, setCollectMethod] = useState("Chuyển khoản");
    const [collectPayer, setCollectPayer] = useState("");
    const [collectRef, setCollectRef] = useState("");
    const [collectNote, setCollectNote] = useState("");
    const [submittingCollect, setSubmittingCollect] = useState(false);

    // Modal: GHI NHẬN THANH TOÁN (Khoản chi vận hành hoặc Mua sầu riêng từ nhà vườn)
    const [selectedPayable, setSelectedPayable] = useState<{
        type: "HARVEST" | "EXPENSE";
        id: string; // harvest purchase id or expense id
        title: string;
        recipient: string;
        totalAmount: number;
        paidAmount: number;
        debtAmount: number;
    } | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [payMethod, setPayMethod] = useState("Chuyển khoản");
    const [payReceiver, setPayReceiver] = useState("");
    const [payRef, setPayRef] = useState("");
    const [payNote, setPayNote] = useState("");
    const [submittingPay, setSubmittingPay] = useState(false);

    // Modal: XEM CHI TIẾT & LỊCH SỬ THANH TOÁN
    const [detailItem, setDetailItem] = useState<{
        categoryName: string;
        title: string;
        code?: string;
        partnerName: string;
        partnerPhone?: string;
        totalAmount: number;
        paidAmount: number;
        debtAmount: number;
        status: string;
        date: string | Date;
        paymentMethod?: string;
        note?: string | null;
        payments: Array<{
            id: string;
            amount: number;
            paymentDate: string | Date;
            paymentMethod: string;
            receiverName?: string | null;
            payerName?: string | null;
            referenceCode?: string | null;
            note?: string | null;
        }>;
        onTriggerPay?: () => void;
        payActionLabel?: string;
    } | null>(null);

    // Modal: THÊM CHI PHÍ MỚI
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [expenseCategory, setExpenseCategory] = useState("PROCESSING_LABOR");
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expensePaidAmount, setExpensePaidAmount] = useState("");
    const [expenseMethod, setExpenseMethod] = useState("Chuyển khoản");
    const [expenseRecipient, setExpenseRecipient] = useState("");
    const [expenseNote, setExpenseNote] = useState("");
    const [submittingExpense, setSubmittingExpense] = useState(false);

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

    // Xử lý Thu tiền bán hàng
    async function handleConfirmCollect(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedSaleForCollect) return;
        const amount = Number(collectAmount.replace(/\D/g, ""));
        if (!amount || amount <= 0) {
            alert("Vui lòng nhập số tiền thu hợp lệ");
            return;
        }

        setSubmittingCollect(true);
        try {
            const res = await fetch("/api/partner/finance/payments", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    type: "RECEIPT",
                    commercialLotId: selectedSaleForCollect.id,
                    amount,
                    paymentDate: collectDate ? new Date(collectDate) : new Date(),
                    paymentMethod: collectMethod,
                    payerName: collectPayer || selectedSaleForCollect.buyerName || "Khách hàng",
                    referenceCode: collectRef.trim() || undefined,
                    note: collectNote.trim() || undefined,
                }),
            });
            const result = await res.json();
            if (result.success) {
                await refreshFinanceData();
                setSelectedSaleForCollect(null);
                setCollectAmount("");
                setCollectRef("");
                setCollectNote("");
            } else {
                alert(result.error || "Không thể ghi nhận thu tiền");
            }
        } catch (err) {
            alert("Lỗi khi ghi nhận thu tiền");
        } finally {
            setSubmittingCollect(false);
        }
    }

    // Xử lý Thanh toán chi phí hoặc Tiền sầu riêng
    async function handleConfirmPayment(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedPayable) return;
        const amount = Number(payAmount.replace(/\D/g, ""));
        if (!amount || amount <= 0) {
            alert("Vui lòng nhập số tiền thanh toán hợp lệ");
            return;
        }

        setSubmittingPay(true);
        try {
            const payload: any = {
                type: "PAYMENT",
                amount,
                paymentDate: payDate ? new Date(payDate) : new Date(),
                paymentMethod: payMethod,
                receiverName: payReceiver || selectedPayable.recipient,
                referenceCode: payRef.trim() || undefined,
                note: payNote.trim() || undefined,
            };

            if (selectedPayable.type === "HARVEST") {
                payload.harvestRecordId = selectedPayable.id;
            } else {
                payload.expenseId = selectedPayable.id;
            }

            const res = await fetch("/api/partner/finance/payments", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (result.success) {
                await refreshFinanceData();
                setSelectedPayable(null);
                setPayAmount("");
                setPayRef("");
                setPayNote("");
            } else {
                alert(result.error || "Không thể ghi nhận thanh toán");
            }
        } catch (err) {
            alert("Lỗi khi ghi nhận thanh toán");
        } finally {
            setSubmittingPay(false);
        }
    }

    // Tạo khoản chi phí mới
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

    // Filter Sales
    const filteredSales = useMemo(() => {
        return data.sales.filter((sale) => {
            if (salesFilterStatus !== "ALL" && sale.paymentStatus !== salesFilterStatus) return false;
            if (salesSearchQuery.trim()) {
                const q = salesSearchQuery.toLowerCase().trim();
                const matchCode = sale.lotCode.toLowerCase().includes(q);
                const matchProduct = sale.productName.toLowerCase().includes(q);
                const matchBuyer = (sale.buyerName || "").toLowerCase().includes(q);
                if (!matchCode && !matchProduct && !matchBuyer) return false;
            }
            return true;
        });
    }, [data.sales, salesFilterStatus, salesSearchQuery]);

    // Filter Harvest Purchases
    const filteredHarvestPurchases = useMemo(() => {
        return data.harvestPurchases.filter((hp) => {
            const status = hp.paymentStatus || (hp.debtAmount && hp.debtAmount > 0 ? (hp.paidAmount && hp.paidAmount > 0 ? "PARTIAL" : "UNPAID") : "PAID");
            if (expenseFilterStatus !== "ALL" && status !== expenseFilterStatus) return false;
            if (expenseSearchQuery.trim()) {
                const q = expenseSearchQuery.toLowerCase().trim();
                const matchCode = hp.code.toLowerCase().includes(q);
                const matchFarm = hp.farmName.toLowerCase().includes(q);
                const matchFarmer = (hp.farmerName || "").toLowerCase().includes(q);
                if (!matchCode && !matchFarm && !matchFarmer) return false;
            }
            return true;
        });
    }, [data.harvestPurchases, expenseFilterStatus, expenseSearchQuery]);

    // Filter Operating Expenses
    const filteredExpenses = useMemo(() => {
        return data.expenses.filter((exp) => {
            if (expenseFilterStatus !== "ALL" && exp.status !== expenseFilterStatus) return false;
            if (expenseSearchQuery.trim()) {
                const q = expenseSearchQuery.toLowerCase().trim();
                const matchTitle = exp.title.toLowerCase().includes(q);
                const matchRecipient = (exp.recipient || "").toLowerCase().includes(q);
                if (!matchTitle && !matchRecipient) return false;
            }
            return true;
        });
    }, [data.expenses, expenseFilterStatus, expenseSearchQuery]);

    // Filter History (Cashflow)
    const filteredHistory = useMemo(() => {
        return data.paymentHistory.filter((pm) => {
            if (historyFilterType === "ALL") return true;
            return pm.type === historyFilterType;
        });
    }, [data.paymentHistory, historyFilterType]);

    // Chart Data
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

    // Cashflow summary calculations
    const cashflowTotalIn = useMemo(() => {
        return data.paymentHistory
            .filter((p) => p.type === "RECEIPT")
            .reduce((sum, p) => sum + Number(p.amount), 0);
    }, [data.paymentHistory]);

    const cashflowTotalOut = useMemo(() => {
        return data.paymentHistory
            .filter((p) => p.type !== "RECEIPT")
            .reduce((sum, p) => sum + Number(p.amount), 0);
    }, [data.paymentHistory]);

    return (
        <div className="space-y-6">
            {/* CONCEPT CLARIFICATION BANNER */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 shadow-2xs">
                <div className="flex items-center gap-2 font-bold">
                    <Info className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Quy chuẩn chỉ số tài chính & dòng tiền:</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                    <span><b>Doanh thu:</b> Giá trị hàng đã bán</span>
                    <span><b>Đã thu:</b> Tiền khách đã trả</span>
                    <span><b>Công nợ phải thu:</b> Tiền khách còn nợ</span>
                    <span><b>Chi phí & Nợ phải trả:</b> Tiền mua sầu riêng & xưởng vận hành</span>
                </div>
            </div>

            {/* Top KPI Cards (4 columns) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* 1. Doanh thu xuất bán */}
                <div className="rounded-2xl sm:rounded-3xl border border-emerald-100 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600">
                            <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold text-emerald-800">
                            {data.sales.length} lô xuất
                        </span>
                    </div>
                    <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                        1. Doanh thu xuất bán
                    </p>
                    <p className="mt-1 text-base sm:text-2xl font-black text-slate-900 truncate">
                        {kpis.totalRevenue.toLocaleString("vi-VN")} đ
                    </p>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-xs text-slate-500 pt-2 border-t border-slate-100 gap-0.5">
                        <span className="truncate">Đã thu: <b className="text-emerald-700 font-bold">{kpis.totalReceived.toLocaleString("vi-VN")} đ</b></span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600">
                            {kpis.totalRevenue > 0 ? `${Math.round((kpis.totalReceived / kpis.totalRevenue) * 100)}%` : "0%"}
                        </span>
                    </div>
                </div>

                {/* 2. Công nợ phải thu */}
                <div className="rounded-2xl sm:rounded-3xl border border-amber-100 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600">
                            <WalletCards className="h-4 w-4 sm:h-6 sm:w-6" />
                        </div>
                        <span className={`rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold ${
                            kpis.totalReceivable > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                            {kpis.totalReceivable > 0 ? "Còn nợ" : "Đã thu hết"}
                        </span>
                    </div>
                    <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                        2. Công nợ phải thu
                    </p>
                    <p className={`mt-1 text-base sm:text-2xl font-black truncate ${kpis.totalReceivable > 0 ? "text-amber-600" : "text-slate-900"}`}>
                        {kpis.totalReceivable.toLocaleString("vi-VN")} đ
                    </p>
                    <div className="mt-2 text-[10px] sm:text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="truncate">Chưa thu: {data.sales.filter((s) => s.debtAmount > 0).length} phiếu</span>
                        <span className="font-bold text-amber-700 text-[10px] sm:text-xs">Cần thu tiền</span>
                    </div>
                </div>

                {/* 3. Tổng chi phí */}
                <div className="rounded-2xl sm:rounded-3xl border border-rose-100 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600">
                            <Receipt className="h-4 w-4 sm:h-6 sm:w-6" />
                        </div>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold text-rose-800">
                            {kpis.totalPayable > 0 ? `Nợ ${kpis.totalPayable.toLocaleString("vi-VN")} đ` : "Đã trả hết"}
                        </span>
                    </div>
                    <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                        3. Tổng chi phí
                    </p>
                    <p className="mt-1 text-base sm:text-2xl font-black text-slate-900 truncate">
                        {kpis.totalExpense.toLocaleString("vi-VN")} đ
                    </p>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-xs text-slate-500 pt-2 border-t border-slate-100 gap-0.5">
                        <span className="truncate">Nguyên liệu: <b>{kpis.totalMaterialCost.toLocaleString("vi-VN")} đ</b></span>
                        <span className="truncate">Vận hành: <b>{kpis.totalOperatingExpense.toLocaleString("vi-VN")} đ</b></span>
                    </div>
                </div>

                {/* 4. Lợi nhuận (Gộp) */}
                <div className={`rounded-2xl sm:rounded-3xl border p-3.5 sm:p-5 shadow-xs transition hover:shadow-md ${
                    kpis.estimatedProfit >= 0 ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"
                }`}>
                    <div className="flex items-center justify-between">
                        <div className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl ${
                            kpis.estimatedProfit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                            <CircleDollarSign className="h-4 w-4 sm:h-6 sm:w-6" />
                        </div>
                        <span className={`rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold ${
                            kpis.estimatedProfit >= 0 ? "bg-emerald-200/70 text-emerald-900" : "bg-rose-200/70 text-rose-900"
                        }`}>
                            {kpis.estimatedProfit >= 0 ? "Lãi ước tính" : "Tạm lỗ"}
                        </span>
                    </div>
                    <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">
                        4. Lợi nhuận (Gộp)
                    </p>
                    <p className={`mt-1 text-base sm:text-2xl font-black truncate ${
                        kpis.estimatedProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}>
                        {kpis.estimatedProfit.toLocaleString("vi-VN")} đ
                    </p>
                    <div className="mt-2 text-[10px] sm:text-xs text-slate-600 pt-2 border-t border-emerald-200/50 truncate">
                        Doanh thu - Tổng chi phí
                    </div>
                </div>
            </div>

            {/* TAB BAR CHUẨN THU - CHI THEO YÊU CẦU NGƯỜI DÙNG */}
            <div className="border-b border-slate-200 pb-3">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden py-1">
                    {/* Tab 0: Biểu đồ thống kê */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("ANALYTICS")}
                        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition shrink-0 whitespace-nowrap ${
                            activeTab === "ANALYTICS"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                        <BarChart3 className="h-4 w-4" />
                        Biểu đồ thống kê
                    </button>

                    {/* Tab 1: Bán hàng & Thu tiền */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("SALES")}
                        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition shrink-0 whitespace-nowrap ${
                            activeTab === "SALES"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                        <FileText className="h-4 w-4" />
                        Bán hàng & Thu tiền
                    </button>

                    {/* Tab 2: Chi phí & Thanh toán */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("EXPENSES")}
                        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition shrink-0 whitespace-nowrap ${
                            activeTab === "EXPENSES"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                        <Receipt className="h-4 w-4" />
                        Chi phí & Thanh toán
                    </button>

                    {/* Tab 3: Nhật ký dòng tiền */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("HISTORY")}
                        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition shrink-0 whitespace-nowrap ${
                            activeTab === "HISTORY"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                        <Clock className="h-4 w-4" />
                        Nhật ký dòng tiền
                    </button>
                </div>
            </div>

            {/* TAB 0: BIỂU ĐỒ THỐNG KÊ */}
            {activeTab === "ANALYTICS" && (
                <div className="space-y-6">
                    <PartnerFinanceCharts data={chartData} role={role} />
                </div>
            )}

            {/* TAB 1: BÁN HÀNG & THU TIỀN */}
            {activeTab === "SALES" && (
                <div className="space-y-4">
                    {/* Header Filters & Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-3xl border shadow-2xs">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={salesSearchQuery}
                                onChange={(e) => setSalesSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm theo mã lô, sản phẩm, khách mua..."
                                className="pl-9 rounded-2xl text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">Trạng thái:</span>
                            {[
                                { key: "ALL", label: "Tất cả" },
                                { key: "UNPAID", label: "Chưa thanh toán" },
                                { key: "PARTIAL", label: "Thanh toán một phần" },
                                { key: "PAID", label: "Đã thanh toán" },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setSalesFilterStatus(tab.key)}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                                        salesFilterStatus === tab.key
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sales Lots List */}
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
                                                {sale.paymentStatus === "PAID" && "Đã thanh toán"}
                                                {sale.paymentStatus === "PARTIAL" && "Thanh toán một phần"}
                                                {(!sale.paymentStatus || sale.paymentStatus === "UNPAID") && "Chưa thanh toán"}
                                            </span>
                                        </div>
                                        <h3 className="mt-1.5 text-base font-black text-slate-900">{sale.productName}</h3>
                                        <p className="text-xs text-slate-500">
                                            Khách hàng: <b className="text-slate-800">{sale.buyerName || sale.destinationName || "Chưa xác định"}</b>
                                            {sale.buyerPhone && ` · SĐT: ${sale.buyerPhone}`}
                                            {sale.buyerAddress && ` · Nơi giao: ${sale.buyerAddress}`}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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

                                        {/* Action Thu Tiền nếu còn nợ */}
                                        {sale.debtAmount > 0 ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedSaleForCollect(sale);
                                                    setCollectAmount(sale.debtAmount.toLocaleString("vi-VN"));
                                                    setCollectPayer(sale.buyerName || "");
                                                    setCollectRef("");
                                                    setCollectNote("");
                                                }}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8 shadow-xs"
                                            >
                                                <Coins className="mr-1 h-3.5 w-3.5" />
                                                Thu tiền
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDetailItem({
                                                    categoryName: "Lô hàng xuất bán",
                                                    title: sale.productName,
                                                    code: sale.lotCode,
                                                    partnerName: sale.buyerName || "Khách hàng",
                                                    partnerPhone: sale.buyerPhone || undefined,
                                                    totalAmount: sale.totalAmount,
                                                    paidAmount: sale.paidAmount,
                                                    debtAmount: sale.debtAmount,
                                                    status: "PAID",
                                                    date: sale.dispatchedAt,
                                                    paymentMethod: sale.paymentMethod,
                                                    payments: sale.payments,
                                                })}
                                                className="rounded-xl text-xs h-8 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                                            >
                                                <History className="mr-1 h-3.5 w-3.5" />
                                                Xem chi tiết
                                            </Button>
                                        )}

                                        {sale.traceabilityCode ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setSelectedQrData({
                                                        token: sale.traceabilityCode!.publicToken,
                                                        lotCode: sale.lotCode,
                                                        productName: sale.productName,
                                                        quantity: sale.quantity,
                                                        unit: sale.unit,
                                                        issuerName: data.facility.name,
                                                        destinationName: sale.buyerName || undefined,
                                                        issuedAt: sale.dispatchedAt,
                                                        status: sale.traceabilityCode!.status,
                                                    })
                                                }
                                                className="rounded-xl text-xs h-8 border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-bold gap-1"
                                            >
                                                <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                                                Mã QR
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={issuingQr}
                                                onClick={() => handleIssueQr(sale.id)}
                                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-8"
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
                                        <span className="text-slate-400 block">Đơn giá:</span>
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
                                        <span className="text-slate-400 block">Đã thu:</span>
                                        <span className="font-bold text-emerald-700">
                                            {sale.paidAmount.toLocaleString("vi-VN")} đ
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Còn phải thu:</span>
                                        <span className={`font-black ${sale.debtAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                            {sale.debtAmount > 0 ? `${sale.debtAmount.toLocaleString("vi-VN")} đ` : "0 đ (Đã tất toán)"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!filteredSales.length && (
                            <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500">
                                Không tìm thấy lô hàng xuất bán nào phù hợp bộ lọc.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: CHI PHÍ & THANH TOÁN */}
            {activeTab === "EXPENSES" && (
                <div className="space-y-6">
                    {/* Header Filter Chips & Search Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-3xl border shadow-2xs">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={expenseSearchQuery}
                                onChange={(e) => setExpenseSearchQuery(e.target.value)}
                                placeholder="Tìm theo tên khoản chi, nhà vườn, đối tác..."
                                className="pl-9 rounded-2xl text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">Bộ lọc:</span>
                            {[
                                { key: "ALL", label: "Tất cả" },
                                { key: "UNPAID", label: "Chưa thanh toán" },
                                { key: "PARTIAL", label: "Thanh toán một phần" },
                                { key: "PAID", label: "Đã thanh toán" },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setExpenseFilterStatus(tab.key)}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                                        expenseFilterStatus === tab.key
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <Button
                            type="button"
                            onClick={() => setShowAddExpenseModal(true)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
                        >
                            <Plus className="h-4 w-4" />
                            Thêm Chi Phí Mới
                        </Button>
                    </div>

                    {/* SECTION 1: TIỀN MUA SẦU RIÊNG TỪ NHÀ VƯỜN */}
                    <div className="rounded-3xl border bg-white p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                                    <Coins className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        TIỀN MUA SẦU RIÊNG TỪ NHÀ VƯỜN ({filteredHarvestPurchases.length})
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Tổng giá trị thu mua: <b>{kpis.totalMaterialCost.toLocaleString("vi-VN")} đ</b>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {filteredHarvestPurchases.map((rec) => {
                                const paid = rec.paidAmount || 0;
                                const debt = rec.debtAmount !== undefined ? rec.debtAmount : Math.max(0, rec.totalCost - paid);
                                const status = rec.paymentStatus || (debt === 0 ? "PAID" : (paid > 0 ? "PARTIAL" : "UNPAID"));

                                return (
                                    <div
                                        key={rec.id}
                                        className="rounded-2xl border border-slate-200 p-4 hover:border-emerald-200 hover:bg-emerald-50/20 transition space-y-3 text-xs"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                                        {rec.code}
                                                    </span>
                                                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                        status === "PAID"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : status === "PARTIAL"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-rose-100 text-rose-800"
                                                    }`}>
                                                        {status === "PAID" && "Đã thanh toán"}
                                                        {status === "PARTIAL" && "Thanh toán một phần"}
                                                        {status === "UNPAID" && "Chưa thanh toán"}
                                                    </span>
                                                </div>
                                                <h4 className="mt-1 font-bold text-slate-900 text-sm">
                                                    {rec.farmName} {rec.farmerName && `· Chủ vườn: ${rec.farmerName}`}
                                                    {rec.farmerPhone && ` (${rec.farmerPhone})`}
                                                </h4>
                                                <p className="text-slate-500 mt-0.5">
                                                    Giống sầu riêng: <b>{rec.durianVariety}</b> · Ngày nhận xưởng: {new Date(rec.date).toLocaleDateString("vi-VN")}
                                                </p>
                                            </div>

                                            {/* Action Thanh toán */}
                                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                                {debt > 0 ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedPayable({
                                                                type: "HARVEST",
                                                                id: rec.id,
                                                                title: `Mua nguyên liệu - ${rec.code}`,
                                                                recipient: rec.farmerName || rec.farmName,
                                                                totalAmount: rec.totalCost,
                                                                paidAmount: paid,
                                                                debtAmount: debt,
                                                            });
                                                            setPayAmount(debt.toLocaleString("vi-VN"));
                                                            setPayReceiver(rec.farmerName || rec.farmName);
                                                            setPayRef("");
                                                            setPayNote(`Thanh toán tiền mua sầu riêng phiếu ${rec.code}`);
                                                        }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8 shadow-xs"
                                                    >
                                                        <CreditCard className="mr-1 h-3.5 w-3.5" />
                                                        Thanh toán
                                                    </Button>
                                                ) : (
                                                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                        <CheckCircle2 className="h-4 w-4" /> Đã trả đủ
                                                    </span>
                                                )}

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDetailItem({
                                                        categoryName: "Tiền mua sầu riêng từ vườn",
                                                        title: `Phiếu thu mua sầu riêng ${rec.code}`,
                                                        code: rec.code,
                                                        partnerName: `${rec.farmName} (${rec.farmerName || "Chủ vườn"})`,
                                                        partnerPhone: rec.farmerPhone || undefined,
                                                        totalAmount: rec.totalCost,
                                                        paidAmount: paid,
                                                        debtAmount: debt,
                                                        status: status,
                                                        date: rec.date,
                                                        payments: rec.payments || [],
                                                        onTriggerPay: debt > 0 ? () => {
                                                            setSelectedPayable({
                                                                type: "HARVEST",
                                                                id: rec.id,
                                                                title: `Mua nguyên liệu - ${rec.code}`,
                                                                recipient: rec.farmerName || rec.farmName,
                                                                totalAmount: rec.totalCost,
                                                                paidAmount: paid,
                                                                debtAmount: debt,
                                                            });
                                                            setPayAmount(debt.toLocaleString("vi-VN"));
                                                            setPayReceiver(rec.farmerName || rec.farmName);
                                                        } : undefined,
                                                        payActionLabel: "Thanh toán tiếp",
                                                    })}
                                                    className="rounded-xl text-xs h-8 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                                                >
                                                    <History className="mr-1 h-3.5 w-3.5" />
                                                    Xem chi tiết
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Financial detail boxes */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Khối lượng & Đơn giá:</span>
                                                <span className="font-bold text-slate-800">
                                                    {rec.weight.toLocaleString("vi-VN")} kg × {rec.pricePerKg.toLocaleString("vi-VN")} đ
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Tổng phải trả:</span>
                                                <span className="font-black text-slate-900">
                                                    {rec.totalCost.toLocaleString("vi-VN")} đ
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Đã thanh toán:</span>
                                                <span className="font-bold text-emerald-700">
                                                    {paid.toLocaleString("vi-VN")} đ
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Còn phải trả:</span>
                                                <span className={`font-black ${debt > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                                    {debt > 0 ? `${debt.toLocaleString("vi-VN")} đ` : "0 đ"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {!filteredHarvestPurchases.length && (
                                <p className="py-6 text-center text-slate-400">Không có giao dịch mua sầu riêng nào trong bộ lọc này.</p>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: CHI PHÍ VẬN HÀNH XƯỞNG & KHO */}
                    <div className="rounded-3xl border bg-white p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold">
                                    <Receipt className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        CHI PHÍ VẬN HÀNH XƯỞNG & KHO ({filteredExpenses.length})
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Tổng chi phí vận hành: <b>{kpis.totalOperatingExpense.toLocaleString("vi-VN")} đ</b>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {filteredExpenses.map((exp) => (
                                <div
                                    key={exp.id}
                                    className="rounded-2xl border border-slate-200 p-4 hover:border-purple-200 hover:bg-purple-50/20 transition space-y-3 text-xs"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                                                    {EXPENSE_CATEGORY_NAMES[exp.category] || exp.category}
                                                </span>
                                                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                    exp.status === "PAID"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : exp.status === "PARTIAL"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-rose-100 text-rose-800"
                                                }`}>
                                                    {exp.status === "PAID" && "Đã thanh toán"}
                                                    {exp.status === "PARTIAL" && "Thanh toán một phần"}
                                                    {exp.status === "UNPAID" && "Chưa thanh toán"}
                                                </span>
                                            </div>
                                            <h4 className="mt-1 font-bold text-slate-900 text-sm">{exp.title}</h4>
                                            <p className="text-slate-500 mt-0.5">
                                                Người nhận: <b className="text-slate-800">{exp.recipient || "—"}</b> · Ngày chi: {new Date(exp.expenseDate).toLocaleDateString("vi-VN")} · {exp.paymentMethod}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            {exp.debtAmount > 0 ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedPayable({
                                                            type: "EXPENSE",
                                                            id: exp.id,
                                                            title: exp.title,
                                                            recipient: exp.recipient || "Người nhận",
                                                            totalAmount: exp.amount,
                                                            paidAmount: exp.paidAmount,
                                                            debtAmount: exp.debtAmount,
                                                        });
                                                        setPayAmount(exp.debtAmount.toLocaleString("vi-VN"));
                                                        setPayReceiver(exp.recipient || "");
                                                        setPayRef("");
                                                        setPayNote(`Thanh toán: ${exp.title}`);
                                                    }}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8 shadow-xs"
                                                >
                                                    <CreditCard className="mr-1 h-3.5 w-3.5" />
                                                    Thanh toán
                                                </Button>
                                            ) : (
                                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                    <CheckCircle2 className="h-4 w-4" /> Đã chi đủ
                                                </span>
                                            )}

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDetailItem({
                                                    categoryName: EXPENSE_CATEGORY_NAMES[exp.category] || exp.category,
                                                    title: exp.title,
                                                    partnerName: exp.recipient || "—",
                                                    totalAmount: exp.amount,
                                                    paidAmount: exp.paidAmount,
                                                    debtAmount: exp.debtAmount,
                                                    status: exp.status,
                                                    date: exp.expenseDate,
                                                    paymentMethod: exp.paymentMethod,
                                                    note: exp.note,
                                                    payments: exp.payments,
                                                    onTriggerPay: exp.debtAmount > 0 ? () => {
                                                        setSelectedPayable({
                                                            type: "EXPENSE",
                                                            id: exp.id,
                                                            title: exp.title,
                                                            recipient: exp.recipient || "Người nhận",
                                                            totalAmount: exp.amount,
                                                            paidAmount: exp.paidAmount,
                                                            debtAmount: exp.debtAmount,
                                                        });
                                                        setPayAmount(exp.debtAmount.toLocaleString("vi-VN"));
                                                        setPayReceiver(exp.recipient || "");
                                                    } : undefined,
                                                    payActionLabel: "Thanh toán tiếp",
                                                })}
                                                className="rounded-xl text-xs h-8 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                                            >
                                                <History className="mr-1 h-3.5 w-3.5" />
                                                Xem chi tiết
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Financial detail boxes */}
                                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-slate-400 block text-[11px]">Tổng chi phí:</span>
                                            <span className="font-black text-slate-900">
                                                {exp.amount.toLocaleString("vi-VN")} đ
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[11px]">Đã thanh toán:</span>
                                            <span className="font-bold text-emerald-700">
                                                {exp.paidAmount.toLocaleString("vi-VN")} đ
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[11px]">Còn phải trả:</span>
                                            <span className={`font-black ${exp.debtAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                                {exp.debtAmount > 0 ? `${exp.debtAmount.toLocaleString("vi-VN")} đ` : "0 đ"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {!filteredExpenses.length && (
                                <p className="py-6 text-center text-slate-400">Không có khoản chi phí nào trong bộ lọc này.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: NHẬT KÝ DÒNG TIỀN (LỊCH SỬ TỔNG HỢP TỰ ĐỘNG THU / CHI) */}
            {activeTab === "HISTORY" && (
                <div className="space-y-4">
                    {/* Header Banner & Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                                Tiền thực thu (Vào)
                            </span>
                            <p className="text-xl font-black text-emerald-700 mt-1">
                                +{cashflowTotalIn.toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-[11px] text-emerald-600">Từ thanh toán các lô xuất bán</span>
                        </div>

                        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                                Tiền thực chi (Ra)
                            </span>
                            <p className="text-xl font-black text-rose-700 mt-1">
                                -{cashflowTotalOut.toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-[11px] text-rose-600">Chi trả nguyên liệu & vận hành</span>
                        </div>

                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">
                                Dòng tiền thuần (Thu - Chi)
                            </span>
                            <p className={`text-xl font-black mt-1 ${cashflowTotalIn >= cashflowTotalOut ? "text-indigo-700" : "text-rose-700"}`}>
                                {(cashflowTotalIn - cashflowTotalOut).toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-[11px] text-indigo-600">Chênh lệch dòng tiền thực tế</span>
                        </div>
                    </div>

                    <div className="rounded-3xl border bg-white p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    Nhật Ký Dòng Tiền Tự Động ({filteredHistory.length})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Lịch sử tổng hợp tự động mỗi lần doanh nghiệp Thu tiền bán hàng hoặc Chi trả các khoản chi
                                </p>
                            </div>

                            {/* Filter Chips */}
                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setHistoryFilterType("ALL")}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                        historyFilterType === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Tất cả
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHistoryFilterType("RECEIPT")}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                        historyFilterType === "RECEIPT" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Tiền vào (Thu)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHistoryFilterType("PAYMENT")}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                        historyFilterType === "PAYMENT" ? "bg-rose-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Tiền ra (Chi)
                                </button>
                            </div>
                        </div>

                        {/* Transaction List */}
                        <div className="divide-y divide-slate-100">
                            {filteredHistory.map((pm) => {
                                const isReceipt = pm.type === "RECEIPT";
                                return (
                                    <div key={pm.id} className="py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/70 rounded-xl px-2 transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold ${
                                                isReceipt ? "bg-emerald-100/70 text-emerald-800" : "bg-rose-100/70 text-rose-800"
                                            }`}>
                                                {isReceipt ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                                                        isReceipt ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                                    }`}>
                                                        {isReceipt ? "THU" : "CHI"}
                                                    </span>
                                                    <p className="font-bold text-slate-900 text-sm">
                                                        {isReceipt ? "Thu tiền bán hàng" : "Thanh toán chi phí"}
                                                    </p>
                                                </div>
                                                <p className="text-slate-600 mt-0.5">
                                                    {pm.commercialLotCode ? (
                                                        <span>Lô: <b>{pm.commercialLotCode}</b> ({pm.commercialProductName})</span>
                                                    ) : (
                                                        <span>{pm.expenseTitle || "Khoản chi hoạt động"}</span>
                                                    )}
                                                    {pm.payerName && ` · Người trả: ${pm.payerName}`}
                                                    {pm.receiverName && ` · Người nhận: ${pm.receiverName}`}
                                                    {pm.referenceCode && ` · Mã tham chiếu: ${pm.referenceCode}`}
                                                </p>
                                                {pm.note && <p className="text-slate-400 italic text-[11px] mt-0.5">"{pm.note}"</p>}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className={`font-black text-sm sm:text-base ${isReceipt ? "text-emerald-700" : "text-rose-700"}`}>
                                                {isReceipt ? "+" : "-"}{pm.amount.toLocaleString("vi-VN")} đ
                                            </p>
                                            <p className="text-slate-400 text-[11px] mt-0.5">
                                                {new Date(pm.paymentDate).toLocaleDateString("vi-VN")} · {pm.paymentMethod}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            {!filteredHistory.length && (
                                <p className="py-8 text-center text-slate-400">Chưa có giao dịch dòng tiền nào trong bộ lọc này.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 1: GHI NHẬN THANH TOÁN (Khoản chi vận hành hoặc Mua sầu riêng)      */}
            {/* ========================================================================= */}
            {selectedPayable && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                        <form
                            onSubmit={handleConfirmPayment}
                            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8"
                        >
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">GHI NHẬN THANH TOÁN</h3>
                                    <p className="text-xs text-slate-500">Cho phép thanh toán toàn bộ hoặc thanh toán một phần</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPayable(null)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Info Box */}
                            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-200/70">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Khoản chi:</span>
                                    <span className="font-bold text-slate-900">{selectedPayable.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Người nhận:</span>
                                    <span className="font-bold text-slate-900">{selectedPayable.recipient}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                                    <span className="text-slate-500">Tổng phải trả:</span>
                                    <span className="font-black text-slate-900">{selectedPayable.totalAmount.toLocaleString("vi-VN")} đ</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Đã thanh toán:</span>
                                    <span className="font-bold text-emerald-700">{selectedPayable.paidAmount.toLocaleString("vi-VN")} đ</span>
                                </div>
                                <div className="flex justify-between font-bold text-rose-600">
                                    <span>Còn phải trả:</span>
                                    <span className="text-sm font-black">{selectedPayable.debtAmount.toLocaleString("vi-VN")} đ</span>
                                </div>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Số tiền thanh toán (đ) *
                                    </label>
                                    <Input
                                        required
                                        value={payAmount}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            setPayAmount(val ? Number(val).toLocaleString("vi-VN") : "");
                                        }}
                                        placeholder="VD: 100.000.000"
                                        className="rounded-xl font-bold text-slate-900 text-sm h-11"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Nhập số tiền nhỏ hơn để ghi nhận <b>Thanh toán một phần</b>, hoặc thanh toán đủ để chuyển trạng thái <b>Đã thanh toán</b>.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">
                                            Ngày thanh toán *
                                        </label>
                                        <Input
                                            type="date"
                                            required
                                            value={payDate}
                                            onChange={(e) => setPayDate(e.target.value)}
                                            className="rounded-xl text-xs h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">
                                            Phương thức *
                                        </label>
                                        <select
                                            value={payMethod}
                                            onChange={(e) => setPayMethod(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs h-10 bg-white"
                                        >
                                            <option value="Chuyển khoản">Chuyển khoản</option>
                                            <option value="Tiền mặt">Tiền mặt</option>
                                            <option value="Ví điện tử">Ví điện tử</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Mã giao dịch / Tham chiếu
                                    </label>
                                    <Input
                                        value={payRef}
                                        onChange={(e) => setPayRef(e.target.value)}
                                        placeholder="VD: VCB-982103984 / Hợp đồng..."
                                        className="rounded-xl text-xs h-10"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Ghi chú
                                    </label>
                                    <Input
                                        value={payNote}
                                        onChange={(e) => setPayNote(e.target.value)}
                                        placeholder="Ghi chú chi tiết đợt thanh toán này..."
                                        className="rounded-xl text-xs h-10"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedPayable(null)}
                                    className="rounded-xl font-bold"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingPay}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                                >
                                    {submittingPay ? "Đang xử lý..." : "Xác nhận thanh toán"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ModalPortal>
            )}

            {/* ========================================================================= */}
            {/* MODAL 2: GHI NHẬN THU TIỀN (Bán hàng)                                     */}
            {/* ========================================================================= */}
            {selectedSaleForCollect && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                        <form
                            onSubmit={handleConfirmCollect}
                            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8"
                        >
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">GHI NHẬN THU TIỀN</h3>
                                    <p className="text-xs text-slate-500">Thu tiền thanh toán từ khách hàng cho lô xuất bán</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSaleForCollect(null)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-200/70">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Lô xuất bán:</span>
                                    <span className="font-bold text-slate-900">{selectedSaleForCollect.lotCode} - {selectedSaleForCollect.productName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Khách hàng:</span>
                                    <span className="font-bold text-slate-900">{selectedSaleForCollect.buyerName || "Khách hàng"}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                                    <span className="text-slate-500">Tổng giá trị lô:</span>
                                    <span className="font-black text-slate-900">{selectedSaleForCollect.totalAmount.toLocaleString("vi-VN")} đ</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Đã thu:</span>
                                    <span className="font-bold text-emerald-700">{selectedSaleForCollect.paidAmount.toLocaleString("vi-VN")} đ</span>
                                </div>
                                <div className="flex justify-between font-bold text-rose-600">
                                    <span>Còn phải thu:</span>
                                    <span className="text-sm font-black">{selectedSaleForCollect.debtAmount.toLocaleString("vi-VN")} đ</span>
                                </div>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Số tiền khách trả đợt này (đ) *
                                    </label>
                                    <Input
                                        required
                                        value={collectAmount}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            setCollectAmount(val ? Number(val).toLocaleString("vi-VN") : "");
                                        }}
                                        placeholder="VD: 50.000.000"
                                        className="rounded-xl font-bold text-slate-900 text-sm h-11"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Có thể thu một phần hoặc thu toàn bộ số tiền còn nợ.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">
                                            Ngày thu tiền *
                                        </label>
                                        <Input
                                            type="date"
                                            required
                                            value={collectDate}
                                            onChange={(e) => setCollectDate(e.target.value)}
                                            className="rounded-xl text-xs h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">
                                            Phương thức *
                                        </label>
                                        <select
                                            value={collectMethod}
                                            onChange={(e) => setCollectMethod(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs h-10 bg-white"
                                        >
                                            <option value="Chuyển khoản">Chuyển khoản</option>
                                            <option value="Tiền mặt">Tiền mặt</option>
                                            <option value="Thư tín dụng (L/C)">Thư tín dụng (L/C)</option>
                                            <option value="Ví điện tử">Ví điện tử</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Mã giao dịch / Tham chiếu
                                    </label>
                                    <Input
                                        value={collectRef}
                                        onChange={(e) => setCollectRef(e.target.value)}
                                        placeholder="Mã giao dịch ngân hàng / Ủy nhiệm chi..."
                                        className="rounded-xl text-xs h-10"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Ghi chú
                                    </label>
                                    <Input
                                        value={collectNote}
                                        onChange={(e) => setCollectNote(e.target.value)}
                                        placeholder="Khách thanh toán đợt 2 qua Vietcombank..."
                                        className="rounded-xl text-xs h-10"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedSaleForCollect(null)}
                                    className="rounded-xl font-bold"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingCollect}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                                >
                                    {submittingCollect ? "Đang xử lý..." : "Xác nhận thu tiền"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ModalPortal>
            )}

            {/* ========================================================================= */}
            {/* MODAL 3: XEM CHI TIẾT & LỊCH SỬ THANH TOÁN                                */}
            {/* ========================================================================= */}
            {detailItem && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                                        {detailItem.categoryName}
                                    </span>
                                    <h3 className="text-base font-black text-slate-900 mt-1">{detailItem.title}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetailItem(null)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Summary Details */}
                            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs space-y-2 border border-slate-200/70">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Đối tác / Người nhận:</span>
                                    <span className="font-bold text-slate-900">{detailItem.partnerName} {detailItem.partnerPhone && `(${detailItem.partnerPhone})`}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Tổng giá trị:</span>
                                        <span className="font-black text-slate-900">{detailItem.totalAmount.toLocaleString("vi-VN")} đ</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Đã thanh toán:</span>
                                        <span className="font-bold text-emerald-700">{detailItem.paidAmount.toLocaleString("vi-VN")} đ</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Còn nợ:</span>
                                        <span className={`font-black ${detailItem.debtAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                            {detailItem.debtAmount > 0 ? `${detailItem.debtAmount.toLocaleString("vi-VN")} đ` : "0 đ"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* History timeline */}
                            <div className="space-y-2 text-xs">
                                <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <History className="h-4 w-4 text-emerald-600" />
                                    Lịch sử các đợt thanh toán ({detailItem.payments.length})
                                </h4>

                                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto rounded-xl border border-slate-100 p-2">
                                    {detailItem.payments.map((p, idx) => (
                                        <div key={p.id || idx} className="py-2.5 flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-bold text-slate-800">
                                                    Đợt {idx + 1}: {Number(p.amount).toLocaleString("vi-VN")} đ
                                                </p>
                                                <p className="text-slate-400 text-[11px]">
                                                    {new Date(p.paymentDate).toLocaleDateString("vi-VN")} · {p.paymentMethod}
                                                    {p.referenceCode && ` · Mã: ${p.referenceCode}`}
                                                </p>
                                                {p.note && <p className="text-slate-500 italic text-[11px]">"{p.note}"</p>}
                                            </div>
                                            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                                                Thành công
                                            </span>
                                        </div>
                                    ))}

                                    {!detailItem.payments.length && (
                                        <p className="py-4 text-center text-slate-400">Chưa có bản ghi thanh toán nào.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDetailItem(null)}
                                    className="rounded-xl font-bold"
                                >
                                    Đóng
                                </Button>
                                {detailItem.debtAmount > 0 && detailItem.onTriggerPay && (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            const trigger = detailItem.onTriggerPay;
                                            setDetailItem(null);
                                            if (trigger) trigger();
                                        }}
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                                    >
                                        {detailItem.payActionLabel || "Thanh toán"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* ========================================================================= */}
            {/* MODAL 4: THÊM CHI PHÍ MỚI                                                 */}
            {/* ========================================================================= */}
            {showAddExpenseModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                        <form
                            onSubmit={handleCreateExpense}
                            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8"
                        >
                            <div className="flex items-center justify-between border-b pb-3">
                                <h3 className="text-lg font-black text-slate-900">Thêm Khoản Chi Phí Mới</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAddExpenseModal(false)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Danh mục chi phí *</label>
                                    <select
                                        value={expenseCategory}
                                        onChange={(e) => setExpenseCategory(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs h-10 bg-white"
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
                                    <label className="block font-bold text-slate-700 mb-1">Tên khoản chi *</label>
                                    <Input
                                        required
                                        value={expenseTitle}
                                        onChange={(e) => setExpenseTitle(e.target.value)}
                                        placeholder="VD: Tiền nhân công bóc tách sầu..."
                                        className="rounded-xl text-xs h-10"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Tổng số tiền chi (đ) *</label>
                                    <Input
                                        required
                                        value={expenseAmount}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            setExpenseAmount(val ? Number(val).toLocaleString("vi-VN") : "");
                                        }}
                                        placeholder="VD: 12.000.000"
                                        className="rounded-xl font-bold text-slate-900 text-xs h-10"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Số tiền đã trả ngay (đ)</label>
                                    <Input
                                        value={expensePaidAmount}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            setExpensePaidAmount(val ? Number(val).toLocaleString("vi-VN") : "");
                                        }}
                                        placeholder="Để trống nếu đã trả đủ"
                                        className="rounded-xl text-xs h-10"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Người nhận / Đối tác</label>
                                    <Input
                                        value={expenseRecipient}
                                        onChange={(e) => setExpenseRecipient(e.target.value)}
                                        placeholder="VD: Tổ bóc tách Trị An..."
                                        className="rounded-xl text-xs h-10"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Phương thức thanh toán</label>
                                    <select
                                        value={expenseMethod}
                                        onChange={(e) => setExpenseMethod(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs h-10 bg-white"
                                    >
                                        <option value="Chuyển khoản">Chuyển khoản</option>
                                        <option value="Tiền mặt">Tiền mặt</option>
                                    </select>
                                </div>
                            </div>

                            <div className="text-xs">
                                <label className="block font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                                <Input
                                    value={expenseNote}
                                    onChange={(e) => setExpenseNote(e.target.value)}
                                    placeholder="Ghi chú chi tiết khoản chi..."
                                    className="rounded-xl text-xs h-10"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAddExpenseModal(false)}
                                    className="rounded-xl font-bold"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingExpense}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                                >
                                    {submittingExpense ? "Đang lưu..." : "Lưu khoản chi"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ModalPortal>
            )}

            {/* Sales Slip Modal */}
            {selectedSaleForSlip && (
                <SalesDispatchSlip
                    data={selectedSaleForSlip}
                    onClose={() => setSelectedSaleForSlip(null)}
                    onIssueQr={handleIssueQr}
                    issuingQr={issuingQr}
                />
            )}

            {/* QR Code Viewer Modal */}
            {selectedQrData && (
                <QrCodeViewerModal
                    data={selectedQrData}
                    onClose={() => setSelectedQrData(null)}
                />
            )}
        </div>
    );
}
