'use client';

import { useState, useMemo } from "react";
import {
    CircleDollarSign,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Search,
    Plus,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    ArrowDownRight,
    ArrowUpRight,
    Wallet,
    CreditCard,
    Building2,
    PiggyBank,
    BarChart3,
    PieChart as PieChartIcon,
} from "lucide-react";
import { useProcessingWorkflow } from "@/hooks/use-processing-workflow";
import { ReceivableRecord, PayableRecord } from "@/lib/processing-workflow";
import { useToast } from "@/components/ui/toast";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

export function ProcessingFinanceView() {
    const {
        state,
        isLoaded,
        recordReceivablePayment,
        recordPayablePayment,
        addOtherCashFlow,
    } = useProcessingWorkflow();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<"receivables" | "payables" | "cashflow" | "analytics">("receivables");

    // Modal state for Thu tiền (Receivable)
    const [collectingReceivable, setCollectingReceivable] = useState<ReceivableRecord | null>(null);
    const [collectAmount, setCollectAmount] = useState<number | "">("");
    const [collectDate, setCollectDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
    const [collectMethod, setCollectMethod] = useState<"BANK" | "CASH">("BANK");
    const [collectNote, setCollectNote] = useState("");

    // Modal state for Trả tiền (Payable)
    const [payingPayable, setPayingPayable] = useState<PayableRecord | null>(null);
    const [payAmount, setPayAmount] = useState<number | "">("");
    const [payDate, setPayDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
    const [payMethod, setPayMethod] = useState<"BANK" | "CASH">("BANK");
    const [payNote, setPayNote] = useState("");

    // Modal state for Ghi nhận thu/chi khác
    const [isOtherCashFlowOpen, setIsOtherCashFlowOpen] = useState(false);
    const [otherType, setOtherType] = useState<"INFLOW" | "OUTFLOW">("OUTFLOW");
    const [otherDesc, setOtherDesc] = useState("");
    const [otherAmount, setOtherAmount] = useState<number | "">("");
    const [otherDate, setOtherDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
    const [otherMethod, setOtherMethod] = useState<"BANK" | "CASH">("BANK");

    // Totals for Receivables
    const totalSalesRevenue = useMemo(
        () => state.receivables.reduce((sum, r) => sum + r.totalAmount, 0),
        [state.receivables]
    );
    const totalSalesCollected = useMemo(
        () => state.receivables.reduce((sum, r) => sum + r.paidAmount, 0),
        [state.receivables]
    );
    const totalSalesRemaining = useMemo(
        () => state.receivables.reduce((sum, r) => sum + r.remainingAmount, 0),
        [state.receivables]
    );

    // Totals for Payables
    const totalPurchaseCost = useMemo(
        () => state.payables.reduce((sum, p) => sum + p.totalAmount, 0),
        [state.payables]
    );
    const totalPurchasePaid = useMemo(
        () => state.payables.reduce((sum, p) => sum + p.paidAmount, 0),
        [state.payables]
    );
    const totalPurchaseRemaining = useMemo(
        () => state.payables.reduce((sum, p) => sum + p.remainingAmount, 0),
        [state.payables]
    );

    // Totals for Cashflow
    const totalInflow = useMemo(
        () => state.cashFlowLogs.filter((c) => c.type === "INFLOW").reduce((s, c) => s + c.amount, 0),
        [state.cashFlowLogs]
    );
    const totalOutflow = useMemo(
        () => state.cashFlowLogs.filter((c) => c.type === "OUTFLOW").reduce((s, c) => s + c.amount, 0),
        [state.cashFlowLogs]
    );
    const currentCashBalance = useMemo(() => {
        if (state.cashFlowLogs.length === 0) return 1500000000;
        return state.cashFlowLogs[state.cashFlowLogs.length - 1].balanceAfter;
    }, [state.cashFlowLogs]);

    // Estimated Gross Profit
    const estimatedGrossProfit = totalSalesRevenue - totalPurchaseCost;
    const grossMarginPercent =
        totalSalesRevenue > 0 ? Math.round((estimatedGrossProfit / totalSalesRevenue) * 1000) / 10 : 0;

    // Handlers for Collecting (Thu tiền)
    const handleOpenCollect = (rec: ReceivableRecord) => {
        setCollectingReceivable(rec);
        setCollectAmount(rec.remainingAmount);
        setCollectDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
        setCollectMethod("BANK");
        setCollectNote(`Thu tiền hợp đồng ${rec.shipmentCode} (${rec.buyerName})`);
    };

    const handleSaveCollect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!collectingReceivable || typeof collectAmount !== "number") return;

        try {
            recordReceivablePayment({
                receivableId: collectingReceivable.id,
                amount: collectAmount,
                date: collectDate,
                method: collectMethod,
                note: collectNote.trim() || undefined,
            });

            toast({
                title: "Ghi nhận thu tiền thành công!",
                description: `Đã thu ${collectAmount.toLocaleString("vi-VN")} đ cho hợp đồng ${collectingReceivable.shipmentCode} và ghi nhận vào Nhật ký dòng tiền!`,
                variant: "success",
            });

            setCollectingReceivable(null);
        } catch (err: unknown) {
            toast({
                title: "Lỗi",
                description: err instanceof Error ? err.message : "Đã có lỗi xảy ra",
                variant: "destructive",
            });
        }
    };

    // Handlers for Paying (Thanh toán)
    const handleOpenPay = (pay: PayableRecord) => {
        setPayingPayable(pay);
        setPayAmount(pay.remainingAmount);
        setPayDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
        setPayMethod("BANK");
        setPayNote(`Thanh toán tiền thu mua lô ${pay.purchaseCode} cho ${pay.sellerName}`);
    };

    const handleSavePay = (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingPayable || typeof payAmount !== "number") return;

        try {
            recordPayablePayment({
                payableId: payingPayable.id,
                amount: payAmount,
                date: payDate,
                method: payMethod,
                note: payNote.trim() || undefined,
            });

            toast({
                title: "Thanh toán thành công!",
                description: `Đã trả ${payAmount.toLocaleString("vi-VN")} đ cho lô ${payingPayable.purchaseCode} và ghi nhận chi vào Nhật ký dòng tiền!`,
                variant: "success",
            });

            setPayingPayable(null);
        } catch (err: unknown) {
            toast({
                title: "Lỗi",
                description: err instanceof Error ? err.message : "Đã có lỗi xảy ra",
                variant: "destructive",
            });
        }
    };

    // Handler for Other Cash Flow
    const handleSaveOtherCashFlow = (e: React.FormEvent) => {
        e.preventDefault();
        if (!otherDesc.trim() || typeof otherAmount !== "number" || otherAmount <= 0) {
            toast({ title: "Lỗi", description: "Vui lòng nhập nội dung và số tiền hợp lệ", variant: "destructive" });
            return;
        }

        try {
            addOtherCashFlow({
                date: otherDate,
                type: otherType,
                description: otherDesc.trim(),
                amount: otherAmount,
                method: otherMethod,
            });

            toast({
                title: "Đã lưu dòng tiền!",
                description: `Ghi nhận ${otherType === "INFLOW" ? "Thu" : "Chi"} ${otherAmount.toLocaleString("vi-VN")} đ thành công`,
                variant: "success",
            });

            setIsOtherCashFlowOpen(false);
            setOtherDesc("");
            setOtherAmount("");
        } catch (err: unknown) {
            toast({ title: "Lỗi", description: err instanceof Error ? err.message : "Có lỗi xảy ra", variant: "destructive" });
        }
    };

    // Chart data for Tab 4
    const monthlyComparisonData = useMemo(() => {
        return [
            { month: "T01/2026", doanhThu: 450000000, chiPhi: 320000000 },
            { month: "T02/2026", doanhThu: 720000000, chiPhi: 510000000 },
            { month: "T03/2026", doanhThu: totalSalesRevenue || 541440000, chiPhi: totalPurchaseCost || 425000000 },
        ];
    }, [totalSalesRevenue, totalPurchaseCost]);

    if (!isLoaded) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span>Đang nạp dữ liệu tài chính...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Tài chính cơ sở chế biến</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tự động đồng bộ từ Hồ sơ thu mua (sinh Khoản phải trả) và Xuất hàng (sinh Khoản phải thu). Quản lý dòng tiền ra/vào và phân tích tài chính hiệu quả.
                </p>
            </div>

            {/* 4 Tabs Navigation */}
            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1.5 sm:inline-flex">
                <button
                    onClick={() => setActiveTab("receivables")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${activeTab === "receivables"
                            ? "bg-white text-emerald-800 shadow-md shadow-slate-200/50"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                    <span>Bán hàng & Thu tiền ({state.receivables.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("payables")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${activeTab === "payables"
                            ? "bg-white text-rose-800 shadow-md shadow-slate-200/50"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <ArrowUpRight className="h-4 w-4 text-rose-600" />
                    <span>Chi phí & Thanh toán ({state.payables.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("cashflow")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${activeTab === "cashflow"
                            ? "bg-white text-blue-800 shadow-md shadow-slate-200/50"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <Wallet className="h-4 w-4 text-blue-600" />
                    <span>NHẬT KÝ DÒNG TIỀN ({state.cashFlowLogs.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("analytics")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${activeTab === "analytics"
                            ? "bg-white text-purple-800 shadow-md shadow-slate-200/50"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span>Biểu đồ thống kê</span>
                </button>
            </div>

            {/* TAB 1: BÁN HÀNG & THU TIỀN (RECEIVABLES) */}
            {activeTab === "receivables" && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng doanh thu bán hàng</span>
                            <p className="mt-2 text-2xl font-black text-slate-900">
                                {totalSalesRevenue.toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-xs text-slate-400 mt-1 block">Từ {state.receivables.length} hợp đồng xuất hàng</span>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Đã thu tiền</span>
                            <p className="mt-2 text-2xl font-black text-emerald-950">
                                {totalSalesCollected.toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-xs text-emerald-700 mt-1 block">
                                {totalSalesRevenue > 0 ? Math.round((totalSalesCollected / totalSalesRevenue) * 100) : 0}% tổng doanh thu
                            </span>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Còn phải thu</span>
                            <p className="mt-2 text-2xl font-black text-amber-950">
                                {totalSalesRemaining.toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-xs text-amber-700 mt-1 block">Công nợ khách hàng cần theo dõi</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Danh sách công nợ bán hàng</h3>
                                <p className="text-xs text-slate-500">Tự động đồng bộ từ các hợp đồng xuất hàng</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-slate-300 text-left text-sm text-slate-600">
                                    <thead className="bg-slate-100/90 text-xs text-slate-700">
                                        <tr>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Mã hồ sơ XH</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Ngày xuất</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap align-middle">Khách hàng & Thị trường</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Thành tiền (đ)</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Đã thu (đ)</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Còn lại (đ)</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Trạng thái</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold text-center whitespace-nowrap align-middle">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {state.receivables.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="border border-slate-200 px-5 py-10 text-center text-slate-400">
                                                    Chưa có khoản phải thu nào từ xuất hàng
                                                </td>
                                            </tr>
                                        ) : (
                                            state.receivables.map((r) => (
                                                <tr key={r.id} className="hover:bg-slate-50/70 transition">
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-teal-800 text-center">
                                                        {r.shipmentCode}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-slate-700 text-center">{r.date}</td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5">
                                                        <span className="font-bold text-slate-900">{r.buyerName}</span>
                                                        <span className="block text-xs text-slate-500">{r.market}</span>
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-slate-900 text-right">
                                                        {r.totalAmount.toLocaleString("vi-VN")} đ
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono text-emerald-700 font-semibold text-right">
                                                        {r.paidAmount.toLocaleString("vi-VN")} đ
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-amber-700 text-right">
                                                        {r.remainingAmount.toLocaleString("vi-VN")} đ
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-center">
                                                        {r.status === "PAID" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Đã thanh toán
                                                            </span>
                                                        ) : r.status === "PARTIAL" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900">
                                                                <Clock className="h-3 w-3" />
                                                                TT 1 phần
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-800">
                                                                <AlertCircle className="h-3 w-3" />
                                                                Chưa thanh toán
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-center">
                                                        {r.remainingAmount > 0 ? (
                                                            <button
                                                                onClick={() => handleOpenCollect(r)}
                                                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                                                            >
                                                                <DollarSign className="h-3.5 w-3.5" />
                                                                <span>Ghi nhận thu tiền</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-emerald-600">Đã hoàn tất</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: CHI PHÍ & THANH TOÁN (PAYABLES) */}
            {activeTab === "payables" && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng chi phí thu mua</span>
                            <p className="mt-2 text-2xl font-black text-slate-900">
                                {totalPurchaseCost.toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-xs text-slate-400 mt-1 block">Từ {state.payables.length} lô thu mua</span>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Đã thanh toán</span>
                            <p className="mt-2 text-2xl font-black text-emerald-950">
                                {totalPurchasePaid.toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-xs text-emerald-700 mt-1 block">
                                {totalPurchaseCost > 0 ? Math.round((totalPurchasePaid / totalPurchaseCost) * 100) : 0}% chi phí đã trả
                            </span>
                        </div>

                        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
                            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Còn phải trả bên bán</span>
                            <p className="mt-2 text-2xl font-black text-rose-950">
                                {totalPurchaseRemaining.toLocaleString("vi-VN")} đ
                            </p>
                            <span className="text-xs text-rose-700 mt-1 block">Khoản nợ nông dân/vựa cần thanh toán</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Danh sách các khoản phải trả thu mua</h3>
                                <p className="text-xs text-slate-500">Tự động đồng bộ từ Hồ sơ thu mua nguyên liệu</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-slate-300 text-left text-sm text-slate-600">
                                    <thead className="bg-slate-100/90 text-xs text-slate-700">
                                        <tr>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Mã lô TM</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Ngày mua</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap align-middle">Bên bán & SĐT</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Thành tiền (đ)</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Đã trả (đ)</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Còn lại (đ)</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Trạng thái</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold text-center whitespace-nowrap align-middle">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {state.payables.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="border border-slate-200 px-5 py-10 text-center text-slate-400">
                                                    Chưa có khoản phải trả nào
                                                </td>
                                            </tr>
                                        ) : (
                                            state.payables.map((p) => (
                                                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-emerald-800 text-center">
                                                        {p.purchaseCode}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-slate-700 text-center">{p.date}</td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5">
                                                        <span className="font-bold text-slate-900">{p.sellerName}</span>
                                                        <span className="block text-xs text-slate-500">{p.sellerPhone}</span>
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-slate-900 text-right">
                                                        {p.totalAmount.toLocaleString("vi-VN")} đ
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono text-emerald-700 font-semibold text-right">
                                                        {p.paidAmount.toLocaleString("vi-VN")} đ
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-rose-700 text-right">
                                                        {p.remainingAmount.toLocaleString("vi-VN")} đ
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-center">
                                                        {p.status === "PAID" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Đã thanh toán
                                                            </span>
                                                        ) : p.status === "PARTIAL" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900">
                                                                <Clock className="h-3 w-3" />
                                                                TT 1 phần
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-800">
                                                                <AlertCircle className="h-3 w-3" />
                                                                Chưa thanh toán
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-center">
                                                        {p.remainingAmount > 0 ? (
                                                            <button
                                                                onClick={() => handleOpenPay(p)}
                                                                className="inline-flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                                                            >
                                                                <CreditCard className="h-3.5 w-3.5" />
                                                                <span>Thanh toán tiền mua</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-emerald-600">Đã tất toán</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: NHẬT KÝ DÒNG TIỀN (CASH FLOW) */}
            {activeTab === "cashflow" && (
                <div className="space-y-6">
                    {/* Cashflow metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                                Tổng thu vào
                            </span>
                            <p className="mt-2 text-xl font-black text-emerald-950">
                                +{totalInflow.toLocaleString("vi-VN")} đ
                            </p>
                        </div>

                        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
                            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                                <ArrowUpRight className="h-4 w-4 text-rose-600" />
                                Tổng chi ra
                            </span>
                            <p className="mt-2 text-xl font-black text-rose-950">
                                -{totalOutflow.toLocaleString("vi-VN")} đ
                            </p>
                        </div>

                        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
                            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                Dòng tiền ròng (Net)
                            </span>
                            <p className={`mt-2 text-xl font-black ${totalInflow >= totalOutflow ? "text-blue-950" : "text-rose-950"}`}>
                                {(totalInflow - totalOutflow).toLocaleString("vi-VN")} đ
                            </p>
                        </div>

                        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm">
                            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                                <Wallet className="h-4 w-4 text-teal-600" />
                                Số dư ngân quỹ hiện tại
                            </span>
                            <p className="mt-2 text-xl font-black text-teal-950">
                                {currentCashBalance.toLocaleString("vi-VN")} đ
                            </p>
                        </div>
                    </div>

                    {/* Table Cash Flow */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Bảng tổng hợp dòng tiền ra / vào</h3>
                                <p className="text-xs text-slate-500">Mọi thao tác thu tiền bán hàng và chi trả thu mua đều được ghi nhận tức thì</p>
                            </div>

                            <button
                                onClick={() => setIsOtherCashFlowOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>+ Ghi nhận thu / chi khác</span>
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-slate-300 text-left text-sm text-slate-600">
                                    <thead className="bg-slate-100/90 text-xs text-slate-700">
                                        <tr>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Ngày GD</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Loại giao dịch</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap align-middle">Diễn giải nội dung</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">Hình thức</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Thu (đ)</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Chi (đ)</th>
                                            <th className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-right align-middle">Số dư lũy kế (đ)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {state.cashFlowLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="border border-slate-200 px-5 py-10 text-center text-slate-400">
                                                    Chưa có giao dịch dòng tiền nào
                                                </td>
                                            </tr>
                                        ) : (
                                            state.cashFlowLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-slate-700 font-medium text-center">{log.date}</td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-center">
                                                        {log.type === "INFLOW" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                                                <ArrowDownRight className="h-3 w-3" />
                                                                Thu bán hàng
                                                            </span>
                                                        ) : log.category === "PURCHASE" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                                                                <ArrowUpRight className="h-3 w-3" />
                                                                Chi thu mua
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                                                Chi khác
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5">
                                                        <span className="text-slate-800 font-medium">{log.description}</span>
                                                        {log.referenceCode && (
                                                            <span className="block font-mono text-[11px] text-slate-400">
                                                                Mã tham chiếu: {log.referenceCode}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 font-medium text-center">
                                                        {log.paymentMethod === "BANK" ? "Chuyển khoản" : "Tiền mặt"}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-emerald-700 text-right">
                                                        {log.type === "INFLOW" ? `+${log.amount.toLocaleString("vi-VN")} đ` : "-"}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-rose-700 text-right">
                                                        {log.type === "OUTFLOW" ? `-${log.amount.toLocaleString("vi-VN")} đ` : "-"}
                                                    </td>
                                                    <td className="border border-slate-200 px-3.5 py-2.5 font-mono font-black text-slate-900 text-right">
                                                        {log.balanceAfter.toLocaleString("vi-VN")} đ
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: BIỂU ĐỒ THỐNG KÊ (ANALYTICS) */}
            {activeTab === "analytics" && (
                <div className="space-y-6">
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="text-xs font-bold text-slate-500">Doanh thu niên vụ</span>
                            <p className="mt-1 text-xl font-black text-emerald-800">
                                {totalSalesRevenue.toLocaleString("vi-VN")} đ
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="text-xs font-bold text-slate-500">Chi phí thu mua</span>
                            <p className="mt-1 text-xl font-black text-rose-800">
                                {totalPurchaseCost.toLocaleString("vi-VN")} đ
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="text-xs font-bold text-slate-500">Lợi nhuận gộp ước tính</span>
                            <p className={`mt-1 text-xl font-black ${estimatedGrossProfit >= 0 ? "text-teal-800" : "text-rose-800"}`}>
                                {estimatedGrossProfit.toLocaleString("vi-VN")} đ
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="text-xs font-bold text-slate-500">Biên lợi nhuận gộp</span>
                            <p className="mt-1 text-xl font-black text-teal-700">
                                {grossMarginPercent}%
                            </p>
                        </div>
                    </div>

                    {/* 2 Big Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Chart 1: Doanh thu & Chi phí theo tháng */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="border-b border-slate-100 pb-3 mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                                    Doanh thu & Chi phí thu mua theo tháng
                                </h3>
                                <p className="text-xs text-slate-500">So sánh doanh thu xuất hàng và chi phí mua nguyên liệu (VNĐ)</p>
                            </div>

                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Tr`}
                                        />
                                        <RechartsTooltip
                                            formatter={(val: number, name: string) => [
                                                `${val.toLocaleString("vi-VN")} đ`,
                                                name === "doanhThu" ? "Doanh thu" : "Chi phí thu mua",
                                            ]}
                                        />
                                        <Legend
                                            formatter={(val) => (val === "doanhThu" ? "Doanh thu xuất" : "Chi phí thu mua")}
                                        />
                                        <Bar dataKey="doanhThu" name="doanhThu" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="chiPhi" name="chiPhi" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 2: Tỉ lệ công nợ phải thu & phải trả */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                            <div className="border-b border-slate-100 pb-3">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <PieChartIcon className="h-4 w-4 text-teal-600" />
                                    Tỉ lệ công nợ phải thu / phải trả
                                </h3>
                                <p className="text-xs text-slate-500">Mức độ thu hồi tiền bán hàng và thanh toán cho nhà vườn</p>
                            </div>

                            {/* Debt 1: Phải thu */}
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                                    <span>Công nợ phải thu (Khách hàng):</span>
                                    <span>
                                        Đã thu: {totalSalesCollected.toLocaleString("vi-VN")} đ / Còn lại: {totalSalesRemaining.toLocaleString("vi-VN")} đ
                                    </span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
                                    <div
                                        className="bg-emerald-500"
                                        style={{ width: `${totalSalesRevenue > 0 ? (totalSalesCollected / totalSalesRevenue) * 100 : 0}%` }}
                                    />
                                    <div
                                        className="bg-amber-400"
                                        style={{ width: `${totalSalesRevenue > 0 ? (totalSalesRemaining / totalSalesRevenue) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Đã thu ({totalSalesRevenue > 0 ? Math.round((totalSalesCollected / totalSalesRevenue) * 100) : 0}%)
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                                        Còn phải thu ({totalSalesRevenue > 0 ? Math.round((totalSalesRemaining / totalSalesRevenue) * 100) : 0}%)
                                    </span>
                                </div>
                            </div>

                            {/* Debt 2: Phải trả */}
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                                    <span>Công nợ phải trả (Nhà vườn):</span>
                                    <span>
                                        Đã trả: {totalPurchasePaid.toLocaleString("vi-VN")} đ / Còn nợ: {totalPurchaseRemaining.toLocaleString("vi-VN")} đ
                                    </span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
                                    <div
                                        className="bg-teal-600"
                                        style={{ width: `${totalPurchaseCost > 0 ? (totalPurchasePaid / totalPurchaseCost) * 100 : 0}%` }}
                                    />
                                    <div
                                        className="bg-rose-500"
                                        style={{ width: `${totalPurchaseCost > 0 ? (totalPurchaseRemaining / totalPurchaseCost) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-teal-600" />
                                        Đã trả ({totalPurchaseCost > 0 ? Math.round((totalPurchasePaid / totalPurchaseCost) * 100) : 0}%)
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                                        Còn nợ ({totalPurchaseCost > 0 ? Math.round((totalPurchaseRemaining / totalPurchaseCost) * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: GHI NHẬN THU TIỀN BÁN HÀNG */}
            {collectingReceivable && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Ghi nhận thu tiền bán hàng</h3>
                                    <p className="text-xs text-slate-500">Hợp đồng: {collectingReceivable.shipmentCode}</p>
                                </div>
                                <button
                                    onClick={() => setCollectingReceivable(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveCollect} className="mt-4 space-y-4">
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Khách hàng:</span>
                                        <strong className="text-slate-900">{collectingReceivable.buyerName}</strong>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-slate-500">Tổng thành tiền:</span>
                                        <strong className="font-mono text-slate-900">{collectingReceivable.totalAmount.toLocaleString("vi-VN")} đ</strong>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-slate-500">Số tiền còn lại cần thu:</span>
                                        <strong className="font-mono text-emerald-800 font-black">
                                            {collectingReceivable.remainingAmount.toLocaleString("vi-VN")} đ
                                        </strong>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Số tiền thu đợt này (đ) *</label>
                                    <input
                                        type="number"
                                        value={collectAmount}
                                        onChange={(e) => setCollectAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                        required
                                        max={collectingReceivable.remainingAmount}
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-black text-emerald-900 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ngày thu tiền *</label>
                                    <input
                                        type="date"
                                        value={collectDate}
                                        onChange={(e) => setCollectDate(e.target.value)}
                                        required
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Hình thức thanh toán</label>
                                    <select
                                        value={collectMethod}
                                        onChange={(e) => setCollectMethod(e.target.value as "BANK" | "CASH")}
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                    >
                                        <option value="BANK">Chuyển khoản ngân hàng</option>
                                        <option value="CASH">Tiền mặt</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ghi chú giao dịch</label>
                                    <input
                                        type="text"
                                        value={collectNote}
                                        onChange={(e) => setCollectNote(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setCollectingReceivable(null)}
                                        className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md"
                                    >
                                        Xác nhận thu tiền
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL: THANH TOÁN TIỀN MUA CHO BÊN BÁN */}
            {payingPayable && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Thanh toán tiền thu mua</h3>
                                    <p className="text-xs text-slate-500">Mã lô: {payingPayable.purchaseCode}</p>
                                </div>
                                <button
                                    onClick={() => setPayingPayable(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSavePay} className="mt-4 space-y-4">
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Bên bán:</span>
                                        <strong className="text-slate-900">{payingPayable.sellerName}</strong>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-slate-500">Tổng tiền thu mua:</span>
                                        <strong className="font-mono text-slate-900">{payingPayable.totalAmount.toLocaleString("vi-VN")} đ</strong>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-slate-500">Số tiền còn nợ cần trả:</span>
                                        <strong className="font-mono text-rose-800 font-black">
                                            {payingPayable.remainingAmount.toLocaleString("vi-VN")} đ
                                        </strong>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Số tiền trả đợt này (đ) *</label>
                                    <input
                                        type="number"
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                        required
                                        max={payingPayable.remainingAmount}
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-black text-rose-900 focus:border-rose-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ngày thanh toán *</label>
                                    <input
                                        type="date"
                                        value={payDate}
                                        onChange={(e) => setPayDate(e.target.value)}
                                        required
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Hình thức thanh toán</label>
                                    <select
                                        value={payMethod}
                                        onChange={(e) => setPayMethod(e.target.value as "BANK" | "CASH")}
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                    >
                                        <option value="BANK">Chuyển khoản ngân hàng</option>
                                        <option value="CASH">Tiền mặt</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ghi chú giao dịch</label>
                                    <input
                                        type="text"
                                        value={payNote}
                                        onChange={(e) => setPayNote(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setPayingPayable(null)}
                                        className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-md"
                                    >
                                        Xác nhận chi trả
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL: GHI NHẬN THU / CHI KHÁC */}
            {isOtherCashFlowOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-lg font-black text-slate-900">Ghi nhận Thu / Chi khác</h3>
                                <button
                                    onClick={() => setIsOtherCashFlowOpen(false)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveOtherCashFlow} className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOtherType("OUTFLOW")}
                                        className={`rounded-xl p-2.5 text-xs font-bold transition ${otherType === "OUTFLOW"
                                                ? "bg-rose-600 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        Chi phí khác
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOtherType("INFLOW")}
                                        className={`rounded-xl p-2.5 text-xs font-bold transition ${otherType === "INFLOW"
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        Khoản thu khác
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Nội dung chi tiết *</label>
                                    <input
                                        type="text"
                                        value={otherDesc}
                                        onChange={(e) => setOtherDesc(e.target.value)}
                                        required
                                        placeholder="VD: Mua thùng carton, tiền điện kho lạnh..."
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Số tiền (đ) *</label>
                                    <input
                                        type="number"
                                        value={otherAmount}
                                        onChange={(e) => setOtherAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                        required
                                        placeholder="VD: 15000000"
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-900"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Ngày giao dịch</label>
                                        <input
                                            type="date"
                                            value={otherDate}
                                            onChange={(e) => setOtherDate(e.target.value)}
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Hình thức</label>
                                        <select
                                            value={otherMethod}
                                            onChange={(e) => setOtherMethod(e.target.value as "BANK" | "CASH")}
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                        >
                                            <option value="BANK">Chuyển khoản</option>
                                            <option value="CASH">Tiền mặt</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsOtherCashFlowOpen(false)}
                                        className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-md"
                                    >
                                        Lưu dòng tiền
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
