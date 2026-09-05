"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Activity,
    BarChart3,
    ChevronRight,
    CircleDollarSign,
    FlaskConical,
    Leaf,
    Loader2,
    Plus,
    RefreshCw,
    ShieldAlert,
    Sprout,
    Truck,
    Wallet,
    Wrench,
    X,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/order-status";
import { formatVietnameseDate } from "@/lib/date-format";

type DetailItem = {
    id: string;
    actionDate: string;
    activityType: string;
    activityLabel: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalAmount: number;
    stage: string | null;
    stageLabel: string;
    notes?: string | null;
    purpose?: string | null;
};

type SupplyStatItem = {
    name: string;
    brand?: string | null;
    unit: string;
    usagesCount: number;
    totalQuantity: number;
    totalCost: number;
    mainStage: string;
    details: DetailItem[];
};

type StageBreakdownItem = {
    stageKey: string;
    stageLabel: string;
    amount: number;
    percentage: number;
};

type ExpenseCategoryItem = {
    categoryKey: string;
    label: string;
    transactionCount: number;
    totalAmount: number;
    percentage: number;
    items: Array<{
        id: string;
        title: string;
        date: string;
        amount: number;
        stageLabel?: string;
        notes?: string | null;
    }>;
};

type FarmOption = {
    id: string;
    farmName: string;
    farmCode: string;
    cropSeasons: Array<{
        id: string;
        name: string;
        year: number;
        status: string;
        startedAt: string;
        closedAt?: string | null;
    }>;
};

const EXPENSE_ICONS: Record<string, any> = {
    FERTILIZER: Leaf,
    PESTICIDE: FlaskConical,
    EQUIPMENT: Wrench,
    LABOR: Activity,
    ELECTRICITY_WATER: Zap,
    MACHINERY: Wrench,
    TRANSPORT: Truck,
    HARVESTING: Sprout,
    TESTING: ShieldAlert,
    OTHER: CircleDollarSign,
};

interface FarmerStatisticsViewProps {
    initialData?: {
        farms?: FarmOption[];
        selectedFarm?: { id: string; farmName: string; farmCode: string };
        selectedSeason?: { id: string; name: string; year: number; status: string } | null;
        pesticides?: { kpis: any; items: SupplyStatItem[] };
        fertilizers?: { kpis: any; items: SupplyStatItem[]; stageBreakdown: StageBreakdownItem[] };
        expenses?: { kpis: any; categories: ExpenseCategoryItem[] };
    };
}

export function FarmerStatisticsView({ initialData }: FarmerStatisticsViewProps = {}) {
    const [farms, setFarms] = useState<FarmOption[]>(initialData?.farms || []);
    const [selectedFarmId, setSelectedFarmId] = useState<string>(
        initialData?.selectedFarm?.id || initialData?.farms?.[0]?.id || "",
    );
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
        initialData?.selectedSeason?.id || initialData?.farms?.[0]?.cropSeasons?.[0]?.id || "",
    );
    const [dateRangeMode, setDateRangeMode] = useState<"ALL" | "30DAYS" | "90DAYS" | "CUSTOM">("ALL");
    const [customStartDate, setCustomStartDate] = useState<string>("");
    const [customEndDate, setCustomEndDate] = useState<string>("");

    const [activeTab, setActiveTab] = useState<"PESTICIDE" | "FERTILIZER" | "EXPENSE">("PESTICIDE");
    const [loading, setLoading] = useState(initialData ? false : true);

    // Data from API
    const [pesticidesData, setPesticidesData] = useState<{ kpis: any; items: SupplyStatItem[] }>(
        initialData?.pesticides || {
            kpis: { typesCount: 0, usagesCount: 0, totalCost: 0, stagesCount: 0 },
            items: [],
        },
    );
    const [fertilizersData, setFertilizersData] = useState<{
        kpis: any;
        items: SupplyStatItem[];
        stageBreakdown: StageBreakdownItem[];
    }>(
        initialData?.fertilizers || {
            kpis: { typesCount: 0, usagesCount: 0, totalCost: 0, stagesCount: 0 },
            items: [],
            stageBreakdown: [],
        },
    );
    const [expensesData, setExpensesData] = useState<{
        kpis: any;
        categories: ExpenseCategoryItem[];
    }>(
        initialData?.expenses || {
            kpis: { totalCost: 0, materialCost: 0, outsideCost: 0, avgMonthlyCost: 0 },
            categories: [],
        },
    );

    // Modals
    const [selectedSupplyForDetail, setSelectedSupplyForDetail] = useState<SupplyStatItem | null>(null);
    const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<ExpenseCategoryItem | null>(null);
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [submittingExpense, setSubmittingExpense] = useState(false);

    // Form add outside expense
    const [expenseForm, setExpenseForm] = useState({
        category: "LABOR",
        title: "",
        amount: 0,
        expenseDate: new Date().toISOString().split("T")[0],
        stage: "FRUIT_GROWING",
        notes: "",
    });

    // Load Data
    const loadStatistics = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedFarmId) params.set("farmId", selectedFarmId);
            if (selectedSeasonId) params.set("cropSeasonId", selectedSeasonId);

            if (dateRangeMode === "30DAYS") {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                params.set("startDate", d.toISOString().split("T")[0]);
            } else if (dateRangeMode === "90DAYS") {
                const d = new Date();
                d.setDate(d.getDate() - 90);
                params.set("startDate", d.toISOString().split("T")[0]);
            } else if (dateRangeMode === "CUSTOM") {
                if (customStartDate) params.set("startDate", customStartDate);
                if (customEndDate) params.set("endDate", customEndDate);
            }

            const res = await fetch(`/api/farmer/statistics?${params.toString()}`, { cache: "no-store" });
            if (!res.ok) {
                console.warn("Statistics API returned status:", res.status);
                return;
            }
            const text = await res.text();
            if (!text) return;
            const payload = JSON.parse(text);

            if (payload && payload.success) {
                setFarms(payload.farms || []);
                if (payload.selectedFarm && !selectedFarmId) {
                    setSelectedFarmId(payload.selectedFarm.id);
                }
                if (payload.selectedSeason && !selectedSeasonId) {
                    setSelectedSeasonId(payload.selectedSeason.id);
                }
                setPesticidesData(payload.pesticides || { kpis: {}, items: [] });
                setFertilizersData(payload.fertilizers || { kpis: {}, items: [], stageBreakdown: [] });
                setExpensesData(payload.expenses || { kpis: {}, categories: [] });
            }
        } catch (err) {
            console.error("Error loading statistics:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedFarmId, selectedSeasonId, dateRangeMode, customStartDate, customEndDate]);

    useEffect(() => {
        void loadStatistics();
    }, [loadStatistics]);

    // Handle Farm Change
    const handleFarmChange = (fId: string) => {
        setSelectedFarmId(fId);
        const farm = farms.find((f) => f.id === fId);
        const activeS = farm?.cropSeasons.find((s) => s.status === "ACTIVE") || farm?.cropSeasons[0];
        setSelectedSeasonId(activeS?.id || "");
    };

    const currentFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
    const currentSeason = currentFarm?.cropSeasons.find((s) => s.id === selectedSeasonId);

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFarmId || !selectedSeasonId) return;
        setSubmittingExpense(true);
        try {
            const res = await fetch("/api/farmer/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    farmId: selectedFarmId,
                    cropSeasonId: selectedSeasonId,
                    ...expenseForm,
                }),
            });
            if (res.ok) {
                setShowAddExpenseModal(false);
                setExpenseForm({
                    category: "LABOR",
                    title: "",
                    amount: 0,
                    expenseDate: new Date().toISOString().split("T")[0],
                    stage: "FRUIT_GROWING",
                    notes: "",
                });
                await loadStatistics();
            } else {
                const payload = await res.json();
                alert(payload.message || "Không thể thêm chi phí.");
            }
        } finally {
            setSubmittingExpense(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-6 sm:px-6">
            {/* Top Navigation & Title */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Thống kê vụ mùa</h1>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        Tổng hợp lượng vật tư đã dùng, chi phí thực tế và tỷ trọng ngân sách theo vụ mùa.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadStatistics()}
                        disabled={loading}
                        className="rounded-2xl text-xs font-semibold"
                    >
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span>Làm mới số liệu</span>
                    </Button>
                </div>
            </div>

            {/* Selector Bar: Vườn + Vụ mùa + Khoảng thời gian */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* Chọn Vườn */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Vườn</label>
                        <select
                            value={selectedFarmId}
                            onChange={(e) => handleFarmChange(e.target.value)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        >
                            {farms.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.farmName} ({f.farmCode})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chọn Vụ mùa */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Vụ mùa</label>
                        <select
                            value={selectedSeasonId}
                            onChange={(e) => setSelectedSeasonId(e.target.value)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        >
                            {currentFarm?.cropSeasons.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} {s.status === "ACTIVE" ? "(Đang hoạt động)" : "(Đã đóng)"}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chọn Khoảng thời gian */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Thời gian</label>
                        <select
                            value={dateRangeMode}
                            onChange={(e) => setDateRangeMode(e.target.value as any)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        >
                            <option value="ALL">Toàn vụ mùa</option>
                            <option value="30DAYS">30 ngày gần nhất</option>
                            <option value="90DAYS">90 ngày gần nhất</option>
                            <option value="CUSTOM">Tùy chọn ngày...</option>
                        </select>
                    </div>
                </div>

                {/* Custom Date Picker if selected */}
                {dateRangeMode === "CUSTOM" && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Từ ngày:</span>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="h-9 rounded-xl border border-slate-200 px-3 text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Đến ngày:</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="h-9 rounded-xl border border-slate-200 px-3 text-xs"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 3 Main Tab Buttons */}
            <div className="grid grid-cols-3 gap-2 rounded-3xl bg-slate-100 p-1.5 text-center text-xs sm:text-sm font-bold shadow-inner">
                <button
                    type="button"
                    onClick={() => setActiveTab("PESTICIDE")}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 transition ${activeTab === "PESTICIDE"
                        ? "bg-white text-amber-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <FlaskConical className="h-4 w-4 text-amber-600" />
                    <span>Thuốc BVTV</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("FERTILIZER")}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 transition ${activeTab === "FERTILIZER"
                        ? "bg-white text-emerald-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <Leaf className="h-4 w-4 text-emerald-600" />
                    <span>Phân bón</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("EXPENSE")}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 transition ${activeTab === "EXPENSE"
                        ? "bg-white text-brand-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <Wallet className="h-4 w-4 text-brand-600" />
                    <span>Tổng chi phí</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                </div>
            ) : (
                <>
                    {/* ========================================================================= */}
                    {/* TAB 1: THUỐC BVTV */}
                    {/* ========================================================================= */}
                    {activeTab === "PESTICIDE" && (
                        <div className="space-y-5">
                            {/* 4 KPIs */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Loại thuốc dùng</span>
                                    <p className="mt-1 text-2xl font-black text-slate-900">
                                        {pesticidesData.kpis.typesCount || 0}{" "}
                                        <span className="text-xs font-normal text-slate-400">loại</span>
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Số lần sử dụng</span>
                                    <p className="mt-1 text-2xl font-black text-amber-700">
                                        {pesticidesData.kpis.usagesCount || 0}{" "}
                                        <span className="text-xs font-normal text-slate-400">lần phun</span>
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Tổng chi phí thuốc</span>
                                    <p className="mt-1 text-2xl font-black text-brand-700">
                                        {formatPrice(pesticidesData.kpis.totalCost)}
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Giai đoạn có dùng</span>
                                    <p className="mt-1 text-2xl font-black text-slate-800">
                                        {pesticidesData.kpis.stagesCount || 0}{" "}
                                        <span className="text-xs font-normal text-slate-400">giai đoạn</span>
                                    </p>
                                </div>
                            </div>

                            {/* Pesticide Table (Desktop) / Cards (Mobile) */}
                            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                                    <h2 className="text-base font-bold text-slate-900">
                                        Danh sách thuốc bảo vệ thực vật đã sử dụng
                                    </h2>
                                </div>

                                {pesticidesData.items.length === 0 ? (
                                    <div className="py-16 text-center text-slate-500">
                                        <FlaskConical className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                        <p className="font-bold text-slate-800">Chưa có dữ liệu thuốc BVTV trong vụ này</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Dữ liệu tự động phát sinh khi bạn xuất kho vật tư hoặc ghi nhật ký canh tác.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop Table */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600">
                                                    <tr>
                                                        <th className="px-5 py-3">Thuốc BVTV</th>
                                                        <th className="px-4 py-3 text-center">Số lần dùng</th>
                                                        <th className="px-4 py-3 text-right">Tổng lượng</th>
                                                        <th className="px-4 py-3 text-center">Đơn vị</th>
                                                        <th className="px-4 py-3 text-right">Chi phí</th>
                                                        <th className="px-5 py-3">Giai đoạn dùng nhiều</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {pesticidesData.items.map((item, idx) => (
                                                        <tr
                                                            key={idx}
                                                            onClick={() => setSelectedSupplyForDetail(item)}
                                                            className="cursor-pointer hover:bg-amber-50/40 transition"
                                                        >
                                                            <td className="px-5 py-3.5">
                                                                <p className="font-bold text-slate-900">{item.name}</p>
                                                                {item.brand && (
                                                                    <p className="text-xs text-slate-400">Hãng: {item.brand}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                                                                {item.usagesCount}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right font-black text-slate-900">
                                                                {item.totalQuantity}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center text-slate-600">
                                                                {item.unit}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right font-bold text-amber-700">
                                                                {formatPrice(item.totalCost)}
                                                            </td>
                                                            <td className="px-5 py-3.5 text-slate-700">
                                                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                                                    {item.mainStage}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile List Compact */}
                                        <div className="space-y-2 p-3 sm:hidden divide-y divide-slate-100">
                                            {pesticidesData.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setSelectedSupplyForDetail(item)}
                                                    className="pt-3 first:pt-0 cursor-pointer space-y-1.5"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 text-sm leading-snug">
                                                                {item.name}
                                                            </h3>
                                                            <p className="text-xs text-slate-500">
                                                                {item.usagesCount} lần • {item.totalQuantity} {item.unit}
                                                            </p>
                                                        </div>
                                                        <span className="font-bold text-amber-700 text-sm">
                                                            {formatPrice(item.totalCost)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                                        <span>Giai đoạn: <b className="text-slate-700">{item.mainStage}</b></span>
                                                        <span className="text-brand-600 font-semibold flex items-center">
                                                            Xem chi tiết <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: PHÂN BÓN */}
                    {/* ========================================================================= */}
                    {activeTab === "FERTILIZER" && (
                        <div className="space-y-5">
                            {/* 4 KPIs */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Loại phân dùng</span>
                                    <p className="mt-1 text-2xl font-black text-slate-900">
                                        {fertilizersData.kpis.typesCount || 0}{" "}
                                        <span className="text-xs font-normal text-slate-400">loại</span>
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Số lần bón phân</span>
                                    <p className="mt-1 text-2xl font-black text-emerald-700">
                                        {fertilizersData.kpis.usagesCount || 0}{" "}
                                        <span className="text-xs font-normal text-slate-400">lần</span>
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Tổng chi phí phân bón</span>
                                    <p className="mt-1 text-2xl font-black text-brand-700">
                                        {formatPrice(fertilizersData.kpis.totalCost)}
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Giai đoạn sử dụng</span>
                                    <p className="mt-1 text-2xl font-black text-slate-800">
                                        {fertilizersData.kpis.stagesCount || 0}{" "}
                                        <span className="text-xs font-normal text-slate-400">giai đoạn</span>
                                    </p>
                                </div>
                            </div>

                            {/* Biểu đồ nhỏ / Tiến trình chi phí phân bón theo giai đoạn */}
                            {fertilizersData.stageBreakdown.length > 0 && (
                                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <BarChart3 className="h-4 w-4 text-emerald-600" />
                                        <span>Phân bổ chi phí phân bón theo giai đoạn sinh trưởng</span>
                                    </h2>

                                    <div className="space-y-2.5 pt-1">
                                        {fertilizersData.stageBreakdown.map((stage) => (
                                            <div key={stage.stageKey} className="space-y-1 text-xs">
                                                <div className="flex justify-between items-center font-medium">
                                                    <span className="text-slate-700">{stage.stageLabel}</span>
                                                    <span className="font-bold text-slate-900">
                                                        {formatPrice(stage.amount)}{" "}
                                                        <span className="text-slate-400 font-normal">
                                                            ({stage.percentage.toFixed(1)}%)
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                                        style={{ width: `${Math.min(100, stage.percentage)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Fertilizer Table (Desktop) / Cards (Mobile) */}
                            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                                    <h2 className="text-base font-bold text-slate-900">
                                        Danh sách phân bón đã sử dụng
                                    </h2>
                                </div>

                                {fertilizersData.items.length === 0 ? (
                                    <div className="py-16 text-center text-slate-500">
                                        <Leaf className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                        <p className="font-bold text-slate-800">Chưa có dữ liệu phân bón trong vụ này</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Dữ liệu tự động phát sinh khi bạn xuất kho hoặc ghi nhật ký canh tác.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop Table */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600">
                                                    <tr>
                                                        <th className="px-5 py-3">Phân bón</th>
                                                        <th className="px-4 py-3 text-center">Số lần bón</th>
                                                        <th className="px-4 py-3 text-right">Tổng lượng</th>
                                                        <th className="px-4 py-3 text-center">Đơn vị</th>
                                                        <th className="px-4 py-3 text-right">Chi phí</th>
                                                        <th className="px-5 py-3">Giai đoạn chính</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {fertilizersData.items.map((item, idx) => (
                                                        <tr
                                                            key={idx}
                                                            onClick={() => setSelectedSupplyForDetail(item)}
                                                            className="cursor-pointer hover:bg-emerald-50/40 transition"
                                                        >
                                                            <td className="px-5 py-3.5">
                                                                <p className="font-bold text-slate-900">{item.name}</p>
                                                                {item.brand && (
                                                                    <p className="text-xs text-slate-400">Hãng: {item.brand}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                                                                {item.usagesCount}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right font-black text-slate-900">
                                                                {item.totalQuantity}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center text-slate-600">
                                                                {item.unit}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                                                                {formatPrice(item.totalCost)}
                                                            </td>
                                                            <td className="px-5 py-3.5 text-slate-700">
                                                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                                                    {item.mainStage}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile List Compact */}
                                        <div className="space-y-2 p-3 sm:hidden divide-y divide-slate-100">
                                            {fertilizersData.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setSelectedSupplyForDetail(item)}
                                                    className="pt-3 first:pt-0 cursor-pointer space-y-1.5"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 text-sm leading-snug">
                                                                {item.name}
                                                            </h3>
                                                            <p className="text-xs text-slate-500">
                                                                {item.usagesCount} lần • {item.totalQuantity} {item.unit}
                                                            </p>
                                                        </div>
                                                        <span className="font-bold text-emerald-700 text-sm">
                                                            {formatPrice(item.totalCost)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                                        <span>Giai đoạn: <b className="text-slate-700">{item.mainStage}</b></span>
                                                        <span className="text-brand-600 font-semibold flex items-center">
                                                            Xem chi tiết <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 3: TỔNG CHI PHÍ */}
                    {/* ========================================================================= */}
                    {activeTab === "EXPENSE" && (
                        <div className="space-y-5">
                            {/* 4 KPIs */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Tổng chi phí vụ</span>
                                    <p className="mt-1 text-2xl font-black text-brand-700">
                                        {formatPrice(expensesData.kpis.totalCost)}
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Chi phí vật tư</span>
                                    <p className="mt-1 text-2xl font-black text-slate-900">
                                        {formatPrice(expensesData.kpis.materialCost)}
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Chi phí ngoài</span>
                                    <p className="mt-1 text-2xl font-black text-slate-800">
                                        {formatPrice(expensesData.kpis.outsideCost)}
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500">Bình quân / tháng</span>
                                    <p className="mt-1 text-2xl font-black text-slate-900">
                                        {formatPrice(expensesData.kpis.avgMonthlyCost)}{" "}
                                        <span className="text-xs font-normal text-slate-400">/tháng</span>
                                    </p>
                                </div>
                            </div>

                            {/* Categories Breakdown Table & Progress Bars */}
                            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">
                                            Cơ cấu các nhóm chi phí vụ mùa
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            Bấm vào từng nhóm chi phí để xem danh sách giao dịch chi tiết
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setShowAddExpenseModal(true)}
                                        className="rounded-2xl bg-brand-600 text-xs font-bold text-white hover:bg-brand-700"
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        <span>Ghi nhận chi phí ngoài</span>
                                    </Button>
                                </div>

                                {expensesData.categories.length === 0 ? (
                                    <div className="py-16 text-center text-slate-500">
                                        <Wallet className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                        <p className="font-bold text-slate-800">Chưa có chi phí nào phát sinh</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Xuất kho vật tư hoặc bấm &quot;Ghi nhận chi phí ngoài&quot; để bổ sung chi phí nhân công, điện nước...
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {expensesData.categories.map((cat) => {
                                            const Icon = EXPENSE_ICONS[cat.categoryKey] || CircleDollarSign;
                                            return (
                                                <div
                                                    key={cat.categoryKey}
                                                    onClick={() => setSelectedCategoryForDetail(cat)}
                                                    className="p-4 sm:p-5 hover:bg-slate-50/70 cursor-pointer transition space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                                                <Icon className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm sm:text-base">
                                                                    {cat.label}
                                                                </p>
                                                                <p className="text-xs text-slate-400">
                                                                    {cat.transactionCount} giao dịch / lần chi
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="font-black text-slate-900 text-base sm:text-lg">
                                                                {formatPrice(cat.totalAmount)}
                                                            </p>
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                {cat.percentage.toFixed(1)}% tổng chi
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Progress bar */}
                                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-brand-600 transition-all duration-500"
                                                            style={{ width: `${Math.min(100, cat.percentage)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ========================================================================= */}
            {/* MODAL: CHI TIẾT SỬ DỤNG VẬT TƯ (THUỐC / PHÂN) */}
            {/* ========================================================================= */}
            {selectedSupplyForDetail && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{selectedSupplyForDetail.name}</h3>
                                <p className="text-xs text-slate-500">
                                    Tổng dùng: <b>{selectedSupplyForDetail.totalQuantity} {selectedSupplyForDetail.unit}</b> ({selectedSupplyForDetail.usagesCount} lần) • Chi phí: <b>{formatPrice(selectedSupplyForDetail.totalCost)}</b>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedSupplyForDetail(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-3 flex-1">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">Lịch sử các lần sử dụng:</h4>
                            {selectedSupplyForDetail.details.map((d, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700 space-y-1"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-900 text-sm">
                                            {formatVietnameseDate(d.actionDate)} • {d.activityLabel}
                                        </span>
                                        <span className="font-bold text-brand-700 text-sm">
                                            {formatPrice(d.totalAmount)}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 text-slate-500">
                                        <span>Số lượng: <b className="text-slate-800">{d.quantity} {d.unit}</b></span>
                                        <span>Đơn giá: {formatPrice(d.unitPrice)}</span>
                                        <span>Giai đoạn: <b className="text-slate-800">{d.stageLabel}</b></span>
                                    </div>
                                    {d.notes && <p className="text-slate-600 italic mt-1">&quot;{d.notes}&quot;</p>}
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedSupplyForDetail(null)}
                                className="rounded-xl"
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: CHI TIẾT GIAO DỊCH CỦA NHÓM CHI PHÍ */}
            {/* ========================================================================= */}
            {selectedCategoryForDetail && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Chi tiết nhóm: {selectedCategoryForDetail.label}</h3>
                                <p className="text-xs text-slate-500">
                                    Tổng cộng: <b>{formatPrice(selectedCategoryForDetail.totalAmount)}</b> ({selectedCategoryForDetail.transactionCount} khoản chi)
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCategoryForDetail(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
                            {selectedCategoryForDetail.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                                >
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                                        <p className="text-slate-400 mt-0.5">
                                            {formatVietnameseDate(item.date)} • Giai đoạn: {item.stageLabel || "Chung"}
                                        </p>
                                        {item.notes && <p className="text-slate-500 italic mt-0.5">{item.notes}</p>}
                                    </div>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {formatPrice(item.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedCategoryForDetail(null)}
                                className="rounded-xl"
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: THÊM CHI PHÍ NGOÀI */}
            {/* ========================================================================= */}
            {showAddExpenseModal && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Ghi nhận chi phí ngoài</h3>
                                <p className="text-xs text-slate-500">
                                    Vườn: <b>{currentFarm?.farmName}</b> • Vụ: <b>{currentSeason?.name}</b>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddExpenseModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="mt-4 space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-slate-700">Loại chi phí *</label>
                                <select
                                    value={expenseForm.category}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                                >
                                    <option value="LABOR">Nhân công</option>
                                    <option value="ELECTRICITY_WATER">Điện / nước</option>
                                    <option value="MACHINERY">Máy móc / Cơ giới</option>
                                    <option value="TRANSPORT">Vận chuyển</option>
                                    <option value="HARVESTING">Thu hoạch</option>
                                    <option value="TESTING">Kiểm nghiệm</option>
                                    <option value="OTHER">Chi phí khác</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700">Tên khoản chi / Nội dung *</label>
                                <Input
                                    required
                                    value={expenseForm.title}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                                    placeholder="Ví dụ: Thuê nhân công tỉa cành, Tiền điện bơm nước tháng 8..."
                                    className="mt-1 rounded-2xl"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Số tiền (đ) *</label>
                                    <Input
                                        type="number"
                                        min="1000"
                                        step="1000"
                                        required
                                        value={expenseForm.amount}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                                        className="mt-1 rounded-2xl font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ngày chi</label>
                                    <Input
                                        type="date"
                                        value={expenseForm.expenseDate}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                                        className="mt-1 rounded-2xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700">Giai đoạn sinh trưởng</label>
                                <select
                                    value={expenseForm.stage}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, stage: e.target.value })}
                                    className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                                >
                                    <option value="POST_HARVEST_RECOVERY">Phục hồi sau thu hoạch</option>
                                    <option value="MAKING_SPROUT">Làm đọt</option>
                                    <option value="FLOWER_INDUCTION">Xử lý ra hoa</option>
                                    <option value="FLOWERING">Ra hoa</option>
                                    <option value="FRUIT_SETTING">Đậu trái</option>
                                    <option value="FRUIT_GROWING">Nuôi trái</option>
                                    <option value="PRE_HARVEST">Trước thu hoạch</option>
                                    <option value="HARVEST">Thu hoạch</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700">Ghi chú</label>
                                <Input
                                    value={expenseForm.notes}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                                    placeholder="Ghi chú thêm..."
                                    className="mt-1 rounded-2xl"
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAddExpenseModal(false)}
                                    className="rounded-xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingExpense}
                                    className="rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700"
                                >
                                    {submittingExpense ? "Đang lưu..." : "Lưu khoản chi"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
