"use client";

import { useCallback, useEffect, useState } from "react";
import {
    ArrowDownRight,
    Boxes,
    Building2,
    CheckCircle2,
    CircleDollarSign,
    DollarSign,
    LandPlot,
    Layers,
    Package,
    PackageCheck,
    Percent,
    Plus,
    Receipt,
    RefreshCw,
    Search,
    ShoppingCart,
    Tag,
    Trash2,
    TrendingUp,
    Truck,
    UserCheck,
    WalletCards,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";
import { formatVietnameseDate, formatVietnameseDateTime } from "@/lib/date-format";

const expenseCategoryLabels: Record<string, { label: string; icon: typeof Truck }> = {
    IMPORT_GOODS: { label: "Nhập hàng", icon: Package },
    SHIPPING: { label: "Vận chuyển", icon: Truck },
    LABOR: { label: "Nhân công", icon: UserCheck },
    WAREHOUSE: { label: "Kho bãi", icon: Building2 },
    UTILITIES: { label: "Điện / Nước / Mạng", icon: Layers },
    PACKAGING: { label: "Đóng gói / Bao bì", icon: Boxes },
    DELIVERY: { label: "Giao hàng cho khách", icon: Truck },
    MARKETING: { label: "Quảng cáo / Tiếp thị", icon: Tag },
    MAINTENANCE: { label: "Bảo trì / Sửa chữa", icon: RefreshCw },
    OTHER: { label: "Chi phí khác", icon: Receipt },
};

const orderStatusLabels: Record<string, { label: string; badgeBg: string }> = {
    PENDING: { label: "Chờ xác nhận", badgeBg: "bg-amber-50 text-amber-800 border-amber-200" },
    CONFIRMED: { label: "Đang chuẩn bị hàng", badgeBg: "bg-blue-50 text-blue-800 border-blue-200" },
    PREPARING: { label: "Đang chuẩn bị hàng", badgeBg: "bg-blue-50 text-blue-800 border-blue-200" },
    READY_FOR_DELIVERY: { label: "Đang chuẩn bị hàng", badgeBg: "bg-blue-50 text-blue-800 border-blue-200" },
    SHIPPING: { label: "Đang giao", badgeBg: "bg-purple-50 text-purple-800 border-purple-200" },
    DELIVERED: { label: "Hoàn tất", badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    COMPLETED: { label: "Hoàn tất", badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300" },
    CANCELLED: { label: "Đã hủy", badgeBg: "bg-slate-100 text-slate-600 border-slate-200" },
    REJECTED: { label: "Đã từ chối", badgeBg: "bg-red-50 text-red-700 border-red-200" },
};

type FinanceData = {
    summary: {
        totalRevenue: number;
        totalCogs: number;
        grossProfit: number;
        grossMarginPercent: number;
        operationalExpenses: number;
        importGoodsExpenses: number;
        totalExpenses: number;
        netProfit: number;
        netMarginPercent: number;
        completedOrderCount: number;
        totalOrdersCount: number;
        averageOrderValue: number;
        totalItemsSold: number;
        totalReceivable: number;
        totalPayable: number;
        totalInventoryValue: number;
        lowStockCount: number;
        outOfStockCount: number;
        totalProductsCount: number;
    };
    chartData: Array<{
        date: string;
        revenue: number;
        cogs: number;
        expenses: number;
        profit: number;
    }>;
    orderReports: Array<{
        id: string;
        orderCode: string;
        createdAt: string;
        farmerName: string;
        farmerPhone: string;
        status: string;
        paymentStatus: string;
        paymentMethod: string;
        paidAmount: number;
        revenue: number;
        cogs: number;
        profit: number;
        marginPercent: number;
        itemCount: number;
    }>;
    productReports: Array<{
        id: string;
        name: string;
        type: string;
        unit: string;
        soldQty: number;
        revenue: number;
        cogs: number;
        profit: number;
        stock: number;
        costPrice: number;
    }>;
    topSellingProducts: Array<{
        id: string;
        name: string;
        soldQty: number;
        revenue: number;
        profit: number;
        unit: string;
    }>;
    topProfitProducts: Array<{
        id: string;
        name: string;
        soldQty: number;
        revenue: number;
        profit: number;
        unit: string;
    }>;
    inventoryItems: Array<{
        id: string;
        name: string;
        type: string;
        stock: number;
        unit: string;
        price: number;
        costPrice: number;
        inventoryValue: number;
        isLowStock: boolean;
        isOutOfStock: boolean;
    }>;
    expenses: Array<{
        id: string;
        category: string;
        expenseDate: string;
        amount: number;
        title: string;
        note?: string | null;
        recipient?: string | null;
        paymentMethod: string;
        status: string;
        paidAmount: number;
    }>;
    expenseCategoriesCount: Record<string, number>;
};

export function StoreFinanceDashboard() {
    const { toast } = useToast();
    const [range, setRange] = useState<"today" | "7days" | "30days" | "thisMonth" | "custom">("30days");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [activeTab, setActiveTab] = useState<"overview" | "orders" | "expenses" | "products" | "debts_inventory">("overview");

    const [data, setData] = useState<FinanceData | null>(null);
    const [loading, setLoading] = useState(true);

    // Expense Modal
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [expenseCategory, setExpenseCategory] = useState("SHIPPING");
    const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseRecipient, setExpenseRecipient] = useState("");
    const [expenseNote, setExpenseNote] = useState("");
    const [expensePaymentMethod, setExpensePaymentMethod] = useState("CASH");
    const [submittingExpense, setSubmittingExpense] = useState(false);

    // Search filters within tabs
    const [orderSearch, setOrderSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");

    const loadFinanceData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("range", range);
            if (range === "custom") {
                if (customFrom) params.set("from", customFrom);
                if (customTo) params.set("to", customTo);
            }
            if (categoryFilter !== "ALL") {
                params.set("category", categoryFilter);
            }

            const response = await fetch(`/api/store/finance?${params.toString()}`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể tải dữ liệu tài chính.");
            }
            setData(result.data);
        } catch (error) {
            toast({
                title: "Lỗi tải dữ liệu",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [range, customFrom, customTo, categoryFilter, toast]);

    useEffect(() => {
        void loadFinanceData();
    }, [loadFinanceData]);

    async function handleCreateExpense(e: React.FormEvent) {
        e.preventDefault();
        const amt = Number(expenseAmount);
        if (!amt || amt <= 0) {
            return toast({ title: "Vui lòng nhập số tiền hợp lệ", variant: "destructive" });
        }
        if (!expenseTitle.trim()) {
            return toast({ title: "Vui lòng nhập nội dung chi phí", variant: "destructive" });
        }

        setSubmittingExpense(true);
        try {
            const response = await fetch("/api/store/finance/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: expenseCategory,
                    expenseDate,
                    amount: amt,
                    title: expenseTitle.trim(),
                    recipient: expenseRecipient.trim() || undefined,
                    note: expenseNote.trim() || undefined,
                    paymentMethod: expensePaymentMethod,
                    status: "PAID",
                }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể tạo chi phí.");
            }

            toast({ title: "Đã ghi nhận chi phí thành công", variant: "success" });
            setExpenseModalOpen(false);
            setExpenseAmount("");
            setExpenseTitle("");
            setExpenseRecipient("");
            setExpenseNote("");
            void loadFinanceData();
        } catch (error) {
            toast({
                title: "Không thể lưu chi phí",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSubmittingExpense(false);
        }
    }

    async function handleDeleteExpense(id: string) {
        if (!confirm("Bạn có chắc chắn muốn xóa khoản chi phí này?")) return;
        try {
            const response = await fetch(`/api/store/finance/expenses?id=${id}`, { method: "DELETE" });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể xóa chi phí.");
            }
            toast({ title: "Đã xóa khoản chi phí", variant: "success" });
            void loadFinanceData();
        } catch (error) {
            toast({
                title: "Không thể xóa",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        }
    }

    async function handleMarkOrderPaid(orderId: string) {
        try {
            const response = await fetch(`/api/store/finance/orders/${orderId}/payment`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentStatus: "PAID" }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể cập nhật.");
            }
            toast({ title: "Đã xác nhận thu tiền đơn hàng", variant: "success" });
            void loadFinanceData();
        } catch (error) {
            toast({
                title: "Không thể cập nhật",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        }
    }

    const summary = data?.summary || {
        totalRevenue: 0,
        totalCogs: 0,
        grossProfit: 0,
        grossMarginPercent: 0,
        operationalExpenses: 0,
        importGoodsExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
        netMarginPercent: 0,
        completedOrderCount: 0,
        totalOrdersCount: 0,
        averageOrderValue: 0,
        totalItemsSold: 0,
        totalReceivable: 0,
        totalPayable: 0,
        totalInventoryValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalProductsCount: 0,
    };

    const filteredOrders = (data?.orderReports || []).filter(
        (o) =>
            o.orderCode.toLowerCase().includes(orderSearch.toLowerCase()) ||
            o.farmerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
            o.farmerPhone.includes(orderSearch),
    );

    const filteredProducts = (data?.productReports || []).filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()),
    );

    return (
        <main className="mx-auto max-w-7xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">
            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                        <CircleDollarSign className="h-4 w-4" />
                        Quản lý cửa hàng
                    </span>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
                        Tài chính & Báo cáo bán hàng
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                        Theo dõi doanh thu, giá vốn, chi phí vận hành, lợi nhuận và công nợ.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={() => setExpenseModalOpen(true)}
                        className="h-11 rounded-2xl bg-brand-600 px-5 font-bold text-white hover:bg-brand-700 shadow-soft"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Ghi nhận chi phí
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => void loadFinanceData()}
                        disabled={loading}
                        className="h-11 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </header>

            {/* Filter Bar (Time range pills & Categories) */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Range Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { key: "today", label: "Hôm nay" },
                            { key: "7days", label: "7 ngày qua" },
                            { key: "30days", label: "30 ngày qua" },
                            { key: "thisMonth", label: "Tháng này" },
                            { key: "custom", label: "Tùy chọn" },
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setRange(item.key as "today" | "7days" | "30days" | "thisMonth" | "custom")}
                                className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold transition ${
                                    range === item.key
                                        ? "bg-brand-600 text-white shadow-soft"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Danh mục:</span>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs sm:text-sm font-bold text-slate-800 focus:border-brand-500 focus:outline-hidden"
                        >
                            <option value="ALL">Tất cả sản phẩm</option>
                            <option value="FERTILIZER">Phân bón</option>
                            <option value="PESTICIDE">Thuốc BVTV</option>
                            <option value="EQUIPMENT">Dụng cụ / Vật tư khác</option>
                        </select>
                    </div>
                </div>

                {/* Custom Date Range Picker */}
                {range === "custom" && (
                    <div className="grid gap-3 pt-2 border-t border-slate-100 sm:grid-cols-2 max-w-md">
                        <div>
                            <Label className="text-xs font-semibold text-slate-600">Từ ngày</Label>
                            <VietnameseDatePicker
                                value={customFrom}
                                onChange={setCustomFrom}
                                placeholder="Chọn ngày bắt đầu"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-600">Đến ngày</Label>
                            <VietnameseDatePicker
                                value={customTo}
                                onChange={setCustomTo}
                                placeholder="Chọn ngày kết thúc"
                                className="mt-1"
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Main Tabs Navigation */}
            <div className="flex overflow-x-auto border-b border-slate-200 pb-1 scrollbar-none gap-2">
                {[
                    { key: "overview", label: "Tổng quan", icon: LandPlot },
                    { key: "orders", label: "Doanh thu & Đơn hàng", icon: ShoppingCart },
                    { key: "expenses", label: "Chi phí vận hành", icon: Receipt },
                    { key: "products", label: "Lợi nhuận & Sản phẩm", icon: TrendingUp },
                    { key: "debts_inventory", label: "Công nợ & Tồn kho", icon: WalletCards },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key as "overview" | "orders" | "expenses" | "products" | "debts_inventory")}
                            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
                                isActive
                                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                                    : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: TỔNG QUAN (OVERVIEW) */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* 4 Core Financial Metrics */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <MetricCard
                            title="Doanh thu"
                            value={`${summary.totalRevenue.toLocaleString("vi-VN")} đ`}
                            subtext={`${summary.completedOrderCount} đơn hoàn tất`}
                            icon={DollarSign}
                            color="text-emerald-700"
                            bgColor="bg-emerald-50"
                            borderColor="border-emerald-100"
                        />
                        <MetricCard
                            title="Tổng chi phí"
                            value={`${summary.totalExpenses.toLocaleString("vi-VN")} đ`}
                            subtext={`Giá vốn: ${summary.totalCogs.toLocaleString("vi-VN")} đ`}
                            icon={ArrowDownRight}
                            color="text-amber-700"
                            bgColor="bg-amber-50"
                            borderColor="border-amber-100"
                        />
                        <MetricCard
                            title="Lợi nhuận ròng"
                            value={`${summary.netProfit.toLocaleString("vi-VN")} đ`}
                            subtext={`Gộp: ${summary.grossProfit.toLocaleString("vi-VN")} đ`}
                            icon={TrendingUp}
                            color="text-brand-700"
                            bgColor="bg-brand-50"
                            borderColor="border-brand-100"
                        />
                        <MetricCard
                            title="Biên lợi nhuận"
                            value={`${summary.netMarginPercent}%`}
                            subtext={`Biên gộp: ${summary.grossMarginPercent}%`}
                            icon={Percent}
                            color="text-blue-700"
                            bgColor="bg-blue-50"
                            borderColor="border-blue-100"
                        />
                    </div>

                    {/* Formula Explanation Card */}
                    <div className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50/60 via-emerald-50/30 to-white p-4 sm:p-5 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                            <div className="space-y-1">
                                <span className="font-bold text-slate-800">Cơ chế tính Lợi nhuận chuẩn xác:</span>
                                <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                    <span className="rounded-lg bg-white px-2.5 py-1 border border-slate-200 font-semibold">
                                        Doanh thu ({summary.totalRevenue.toLocaleString("vi-VN")} đ)
                                    </span>
                                    <span>-</span>
                                    <span className="rounded-lg bg-white px-2.5 py-1 border border-slate-200 font-semibold">
                                        Giá vốn hàng bán ({summary.totalCogs.toLocaleString("vi-VN")} đ)
                                    </span>
                                    <span>=</span>
                                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                                        Lợi nhuận gộp ({summary.grossProfit.toLocaleString("vi-VN")} đ)
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="font-bold text-slate-800">Khấu trừ chi phí vận hành:</span>
                                <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                                        LN Gộp ({summary.grossProfit.toLocaleString("vi-VN")} đ)
                                    </span>
                                    <span>-</span>
                                    <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-bold text-amber-800">
                                        Chi phí ngoài ({summary.operationalExpenses.toLocaleString("vi-VN")} đ)
                                    </span>
                                    <span>=</span>
                                    <span className="rounded-lg bg-brand-600 px-2.5 py-1 font-black text-white shadow-xs">
                                        LN Ròng ({summary.netProfit.toLocaleString("vi-VN")} đ)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4 Secondary Dashboard Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="rounded-3xl border-slate-200 shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Đơn hàng & Doanh số</span>
                                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-xl font-black text-slate-900">
                                    {summary.completedOrderCount} đơn hoàn tất
                                </p>
                                <p className="text-xs text-slate-500">
                                    Đơn trung bình: <b>{summary.averageOrderValue.toLocaleString("vi-VN")} đ</b>
                                </p>
                                <p className="text-xs text-slate-500">
                                    Đã bán: <b>{summary.totalItemsSold.toLocaleString("vi-VN")}</b> sản phẩm
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-slate-200 shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Công nợ phải thu</span>
                                    <WalletCards className="h-4 w-4 text-amber-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-xl font-black text-amber-700">
                                    {summary.totalReceivable.toLocaleString("vi-VN")} đ
                                </p>
                                <p className="text-xs text-slate-500">
                                    Từ đơn hàng COD chưa thu tiền
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("debts_inventory")}
                                    className="text-xs font-bold text-brand-700 hover:underline pt-1 block"
                                >
                                    Xem danh sách phải thu →
                                </button>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-slate-200 shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Tồn kho tài chính</span>
                                    <PackageCheck className="h-4 w-4 text-blue-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-xl font-black text-blue-700">
                                    {summary.totalInventoryValue.toLocaleString("vi-VN")} đ
                                </p>
                                <p className="text-xs text-slate-500">
                                    Tổng giá trị hàng đang tồn kho
                                </p>
                                {summary.lowStockCount > 0 && (
                                    <p className="text-xs font-bold text-red-600">
                                        ⚠️ {summary.lowStockCount} sản phẩm sắp hết hàng
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-slate-200 shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Chi phí vận hành</span>
                                    <Receipt className="h-4 w-4 text-purple-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-xl font-black text-purple-700">
                                    {summary.operationalExpenses.toLocaleString("vi-VN")} đ
                                </p>
                                <p className="text-xs text-slate-500">
                                    {data?.expenses.length || 0} khoản chi phí đã ghi nhận
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("expenses")}
                                    className="text-xs font-bold text-brand-700 hover:underline pt-1 block"
                                >
                                    Xem chi tiết chi phí →
                                </button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Products & Quick Visual Breakdown */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Top Selling Products */}
                        <Card className="rounded-3xl border-slate-200 shadow-xs">
                            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-brand-600" />
                                    <span>Top sản phẩm bán chạy</span>
                                </CardTitle>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("products")}
                                    className="text-xs font-bold text-brand-700 hover:underline"
                                >
                                    Xem tất cả
                                </button>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {data?.topSellingProducts && data.topSellingProducts.length > 0 ? (
                                    data.topSellingProducts.slice(0, 5).map((p, idx) => (
                                        <div key={p.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-xs sm:text-sm">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <p className="font-bold text-slate-900">{p.name}</p>
                                                    <p className="text-slate-500">Đã bán: <b>{p.soldQty} {p.unit}</b></p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-emerald-700">{p.revenue.toLocaleString("vi-VN")} đ</p>
                                                <p className="text-[11px] text-brand-700">Lãi: +{p.profit.toLocaleString("vi-VN")} đ</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="py-6 text-center text-xs text-slate-400">Chưa có dữ liệu bán hàng trong kỳ này.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Expense Categories Breakdown */}
                        <Card className="rounded-3xl border-slate-200 shadow-xs">
                            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Receipt className="h-5 w-5 text-amber-600" />
                                    <span>Cơ cấu chi phí vận hành</span>
                                </CardTitle>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("expenses")}
                                    className="text-xs font-bold text-brand-700 hover:underline"
                                >
                                    Quản lý chi phí
                                </button>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2.5">
                                {data?.expenseCategoriesCount && Object.keys(data.expenseCategoriesCount).length > 0 ? (
                                    Object.entries(data.expenseCategoriesCount).map(([cat, amt]) => {
                                        const catInfo = expenseCategoryLabels[cat] || { label: cat, icon: Receipt };
                                        const Icon = catInfo.icon;
                                        const percent = summary.operationalExpenses > 0 ? Math.round((amt / summary.operationalExpenses) * 100) : 0;
                                        return (
                                            <div key={cat} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                                                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                                                        {catInfo.label}
                                                    </span>
                                                    <span className="font-bold text-slate-900">
                                                        {amt.toLocaleString("vi-VN")} đ ({percent}%)
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, percent)}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="py-6 text-center text-xs text-slate-400">Chưa ghi nhận chi phí vận hành nào trong kỳ.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB 2: DOANH THU & ĐƠN HÀNG */}
            {activeTab === "orders" && (
                <div className="space-y-4">
                    {/* Search & Stats */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={orderSearch}
                                onChange={(e) => setOrderSearch(e.target.value)}
                                placeholder="Tìm mã đơn, tên khách, SĐT..."
                                className="pl-9 h-11 rounded-xl"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600">
                            <span>Tổng cộng: <b>{filteredOrders.length} đơn</b></span>
                            <span>Doanh thu: <b className="text-emerald-700">{filteredOrders.reduce((s, o) => s + o.revenue, 0).toLocaleString("vi-VN")} đ</b></span>
                        </div>
                    </div>

                    {/* Orders Table */}
                    <Card className="rounded-3xl border-slate-200 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="py-3 px-4 font-bold">Mã đơn & Ngày</th>
                                        <th className="py-3 px-4 font-bold">Khách hàng</th>
                                        <th className="py-3 px-4 font-bold text-right">Doanh thu</th>
                                        <th className="py-3 px-4 font-bold text-right">Giá vốn</th>
                                        <th className="py-3 px-4 font-bold text-right">Lợi nhuận</th>
                                        <th className="py-3 px-4 font-bold text-center">Trạng thái</th>
                                        <th className="py-3 px-4 font-bold text-center">Thanh toán</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredOrders.map((order) => {
                                        const statusInfo = orderStatusLabels[order.status] || { label: order.status, badgeBg: "bg-slate-100 text-slate-700" };
                                        const isPaid = order.paymentStatus === "PAID";
                                        return (
                                            <tr key={order.id} className="hover:bg-slate-50/60">
                                                <td className="py-3 px-4">
                                                    <p className="font-bold text-brand-800">{order.orderCode}</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {formatVietnameseDateTime(new Date(order.createdAt))}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-bold text-slate-900">{order.farmerName}</p>
                                                    <p className="text-[11px] text-slate-500">{order.farmerPhone}</p>
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-slate-900">
                                                    {order.revenue.toLocaleString("vi-VN")} đ
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium text-slate-500">
                                                    {order.cogs.toLocaleString("vi-VN")} đ
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-emerald-700">
                                                    +{order.profit.toLocaleString("vi-VN")} đ
                                                    <span className="block text-[10px] text-slate-400 font-normal">
                                                        ({order.marginPercent}%)
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.badgeBg}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {isPaid ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Đã thanh toán
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <span className="text-[11px] font-bold text-amber-700">
                                                                Chưa thu (COD)
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleMarkOrderPaid(order.id)}
                                                                className="h-7 rounded-lg border-emerald-300 bg-emerald-50 px-2 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                                                            >
                                                                Đã thu
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredOrders.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                Không tìm thấy đơn hàng nào trong khoảng thời gian đã chọn.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 3: CHI PHÍ VẬN HÀNH */}
            {activeTab === "expenses" && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Danh sách chi phí vận hành</h2>
                            <p className="text-xs text-slate-500">
                                Ghi chép các chi phí kho bãi, nhân công, vận chuyển và nhập hàng.
                            </p>
                        </div>
                        <Button
                            onClick={() => setExpenseModalOpen(true)}
                            className="h-10 rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft"
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            + Ghi chi phí
                        </Button>
                    </div>

                    <Card className="rounded-3xl border-slate-200 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="py-3 px-4 font-bold">Ngày</th>
                                        <th className="py-3 px-4 font-bold">Loại chi phí</th>
                                        <th className="py-3 px-4 font-bold">Nội dung</th>
                                        <th className="py-3 px-4 font-bold">Người nhận / Đơn vị</th>
                                        <th className="py-3 px-4 font-bold text-right">Số tiền</th>
                                        <th className="py-3 px-4 font-bold text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(data?.expenses || []).map((exp) => {
                                        const catInfo = expenseCategoryLabels[exp.category] || { label: exp.category, icon: Receipt };
                                        const Icon = catInfo.icon;
                                        return (
                                            <tr key={exp.id} className="hover:bg-slate-50/60">
                                                <td className="py-3 px-4 font-medium text-slate-700">
                                                    {formatVietnameseDate(new Date(exp.expenseDate))}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                                                        <Icon className="h-3.5 w-3.5" />
                                                        {catInfo.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-bold text-slate-900">{exp.title}</p>
                                                    {exp.note && <p className="text-[11px] text-slate-400 italic">{exp.note}</p>}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    {exp.recipient || "—"}
                                                </td>
                                                <td className="py-3 px-4 text-right font-black text-red-600">
                                                    -{exp.amount.toLocaleString("vi-VN")} đ
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteExpense(exp.id)}
                                                        className="h-8 w-8 rounded-lg p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {(!data?.expenses || data.expenses.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                Chưa có khoản chi phí vận hành nào được ghi nhận trong kỳ.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 4: LỢI NHUẬN & SẢN PHẨM */}
            {activeTab === "products" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Tìm tên sản phẩm..."
                                className="pl-9 h-11 rounded-xl"
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Giá vốn tính theo <b>Giá vốn bình quân</b> hoặc giá nhập đã thiết lập.
                        </p>
                    </div>

                    <Card className="rounded-3xl border-slate-200 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="py-3 px-4 font-bold">Sản phẩm</th>
                                        <th className="py-3 px-4 font-bold text-center">Đã bán</th>
                                        <th className="py-3 px-4 font-bold text-right">Doanh thu</th>
                                        <th className="py-3 px-4 font-bold text-right">Giá vốn</th>
                                        <th className="py-3 px-4 font-bold text-right">Lợi nhuận</th>
                                        <th className="py-3 px-4 font-bold text-right">Tồn kho</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProducts.map((prod) => (
                                        <tr key={prod.id} className="hover:bg-slate-50/60">
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-slate-900">{prod.name}</p>
                                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                                    {prod.type === "FERTILIZER" ? "Phân bón" : prod.type === "PESTICIDE" ? "Thuốc BVTV" : "Dụng cụ / Khác"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                                                {prod.soldQty} {prod.unit}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                                                {prod.revenue.toLocaleString("vi-VN")} đ
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium text-slate-500">
                                                {prod.cogs.toLocaleString("vi-VN")} đ
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-brand-700">
                                                +{prod.profit.toLocaleString("vi-VN")} đ
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-slate-700">
                                                {prod.stock} {prod.unit}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                Không có dữ liệu sản phẩm.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 5: CÔNG NỢ & TỒN KHO */}
            {activeTab === "debts_inventory" && (
                <div className="space-y-6">
                    {/* Debt summary cards */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="rounded-3xl border-amber-200 bg-amber-50/40 shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-amber-900 flex items-center justify-between">
                                    <span>Công nợ phải thu từ khách hàng</span>
                                    <WalletCards className="h-5 w-5 text-amber-700" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-2xl font-black text-amber-700">
                                    {summary.totalReceivable.toLocaleString("vi-VN")} đ
                                </p>
                                <p className="text-xs text-slate-600">
                                    Tiền COD hoặc đơn hàng đã giao chưa thu tiền
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-blue-200 bg-blue-50/40 shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-blue-900 flex items-center justify-between">
                                    <span>Tổng giá trị hàng tồn kho</span>
                                    <PackageCheck className="h-5 w-5 text-blue-700" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-2xl font-black text-blue-700">
                                    {summary.totalInventoryValue.toLocaleString("vi-VN")} đ
                                </p>
                                <p className="text-xs text-slate-600">
                                    Định giá theo giá vốn bình quân ({data?.inventoryItems.length || 0} sản phẩm)
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Inventory Financial Valuation Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Báo cáo tồn kho tài chính</h3>
                            <span className="text-xs text-slate-500">
                                Giá trị tồn = Số lượng tồn × Giá vốn bình quân
                            </span>
                        </div>

                        <Card className="rounded-3xl border-slate-200 overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="py-3 px-4 font-bold">Sản phẩm</th>
                                            <th className="py-3 px-4 font-bold text-center">Tồn kho</th>
                                            <th className="py-3 px-4 font-bold text-right">Giá bán</th>
                                            <th className="py-3 px-4 font-bold text-right">Giá vốn</th>
                                            <th className="py-3 px-4 font-bold text-right">Giá trị tồn kho</th>
                                            <th className="py-3 px-4 font-bold text-center">Tình trạng</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(data?.inventoryItems || []).map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/60">
                                                <td className="py-3 px-4">
                                                    <p className="font-bold text-slate-900">{item.name}</p>
                                                    <span className="text-[10px] text-slate-400">
                                                        {item.type === "FERTILIZER" ? "Phân bón" : item.type === "PESTICIDE" ? "Thuốc BVTV" : "Dụng cụ / Khác"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-slate-800">
                                                    {item.stock} {item.unit}
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium text-slate-600">
                                                    {item.price.toLocaleString("vi-VN")} đ
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold text-slate-700">
                                                    {item.costPrice.toLocaleString("vi-VN")} đ
                                                </td>
                                                <td className="py-3 px-4 text-right font-black text-blue-700">
                                                    {item.inventoryValue.toLocaleString("vi-VN")} đ
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {item.isOutOfStock ? (
                                                        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800">
                                                            Hết hàng
                                                        </span>
                                                    ) : item.isLowStock ? (
                                                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                                            Sắp hết ({item.stock})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                                            Đủ hàng
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Modal Ghi nhận chi phí */}
            {expenseModalOpen && (
                <div
                    className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setExpenseModalOpen(false);
                    }}
                >
                    <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                                    Chi phí vận hành
                                </span>
                                <h2 className="mt-1 text-xl font-black text-slate-900">
                                    Ghi nhận khoản chi mới
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setExpenseModalOpen(false)}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-xs font-bold text-slate-700">Loại chi phí *</Label>
                                    <select
                                        value={expenseCategory}
                                        onChange={(e) => setExpenseCategory(e.target.value)}
                                        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-hidden"
                                    >
                                        <option value="SHIPPING">Vận chuyển</option>
                                        <option value="IMPORT_GOODS">Nhập hàng</option>
                                        <option value="LABOR">Nhân công</option>
                                        <option value="WAREHOUSE">Kho bãi</option>
                                        <option value="UTILITIES">Điện / Nước / Mạng</option>
                                        <option value="PACKAGING">Bao bì / Đóng gói</option>
                                        <option value="DELIVERY">Giao hàng cho khách</option>
                                        <option value="MARKETING">Quảng cáo / Tiếp thị</option>
                                        <option value="MAINTENANCE">Bảo trì / Sửa chữa</option>
                                        <option value="OTHER">Chi phí khác</option>
                                    </select>
                                </div>

                                <div>
                                    <Label className="text-xs font-bold text-slate-700">Ngày chi *</Label>
                                    <VietnameseDatePicker
                                        value={expenseDate}
                                        onChange={setExpenseDate}
                                        placeholder="dd/mm/yyyy"
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-bold text-slate-700">Số tiền (VNĐ) *</Label>
                                <div className="relative mt-1">
                                    <Input
                                        type="number"
                                        min="1"
                                        step="1000"
                                        value={expenseAmount}
                                        onChange={(e) => setExpenseAmount(e.target.value)}
                                        placeholder="VD: 500000"
                                        required
                                        className="h-11 rounded-xl pr-12 text-sm font-bold text-red-600"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        VNĐ
                                    </span>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-bold text-slate-700">Nội dung chi phí *</Label>
                                <Input
                                    value={expenseTitle}
                                    onChange={(e) => setExpenseTitle(e.target.value)}
                                    placeholder="VD: Vận chuyển hàng từ nhà phân phối về kho"
                                    required
                                    className="mt-1 h-11 rounded-xl text-sm"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-xs font-bold text-slate-700">Người nhận / Đơn vị</Label>
                                    <Input
                                        value={expenseRecipient}
                                        onChange={(e) => setExpenseRecipient(e.target.value)}
                                        placeholder="VD: Công ty Vận tải ABC"
                                        className="mt-1 h-11 rounded-xl text-sm"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-bold text-slate-700">Hình thức thanh toán</Label>
                                    <select
                                        value={expensePaymentMethod}
                                        onChange={(e) => setExpensePaymentMethod(e.target.value)}
                                        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-hidden"
                                    >
                                        <option value="CASH">Tiền mặt</option>
                                        <option value="BANK_TRANSFER">Chuyển khoản</option>
                                        <option value="DEBT">Ghi nợ (Chưa thanh toán)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-bold text-slate-700">Ghi chú thêm</Label>
                                <Textarea
                                    rows={2}
                                    value={expenseNote}
                                    onChange={(e) => setExpenseNote(e.target.value)}
                                    placeholder="Chứng từ, số hóa đơn hoặc lưu ý khác..."
                                    className="mt-1 rounded-xl text-sm"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setExpenseModalOpen(false)}
                                    className="h-11 rounded-xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingExpense}
                                    className="h-11 rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft"
                                >
                                    {submittingExpense ? "Đang lưu..." : "Lưu khoản chi"}
                                </Button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}

function MetricCard({
    title,
    value,
    subtext,
    icon: Icon,
    color,
    bgColor,
    borderColor,
}: {
    title: string;
    value: string;
    subtext: string;
    icon: typeof DollarSign;
    color: string;
    bgColor: string;
    borderColor: string;
}) {
    return (
        <article className={`rounded-3xl border ${borderColor} bg-white p-4 sm:p-5 shadow-xs`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${bgColor} ${color}`}>
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <p className={`mt-3 text-base sm:text-2xl font-black whitespace-nowrap tracking-tight ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-500 whitespace-nowrap truncate">{subtext}</p>
        </article>
    );
}
