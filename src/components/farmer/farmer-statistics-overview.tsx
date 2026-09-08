"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
    Activity,
    ArrowRight,
    ArrowUpRight,
    Award,
    BadgeDollarSign,
    BarChart3,
    Calendar,
    CheckCircle2,
    CircleDollarSign,
    Coins,
    ExternalLink,
    FileText,
    FlaskConical,
    Layers,
    Leaf,
    Loader2,
    Percent,
    PieChart as PieIcon,
    PiggyBank,
    RefreshCw,
    Scale,
    ShieldAlert,
    Sprout,
    TrendingDown,
    TrendingUp,
    Truck,
    Wallet,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { FarmerOverviewStats, MonthlyFinancialPoint } from "@/lib/farmer-statistics-service";

interface FarmerStatisticsOverviewProps {
    initialData: FarmerOverviewStats;
}

function formatVND(amount: number): string {
    return (amount || 0).toLocaleString("vi-VN") + " đ";
}

function formatMillion(amount: number): string {
    if (!amount) return "0 đ";
    if (Math.abs(amount) >= 1_000_000_000) {
        return (amount / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tỷ";
    }
    if (Math.abs(amount) >= 1_000_000) {
        return (amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " triệu";
    }
    return (amount || 0).toLocaleString("vi-VN") + " đ";
}

function formatShortMillion(amount: number): string {
    if (!amount) return "0 tr";
    return (amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr";
}

function formatKg(weight: number): string {
    return (weight || 0).toLocaleString("vi-VN") + " kg";
}

export function FarmerStatisticsOverview({ initialData }: FarmerStatisticsOverviewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<FarmerOverviewStats>(initialData);
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Filter states
    const [selectedFarmId, setSelectedFarmId] = useState<string>(
        searchParams.get("farmId") || initialData.filters.farmId || "ALL",
    );
    const [selectedYear, setSelectedYear] = useState<string>(
        searchParams.get("year") || String(initialData.filters.year || 2026),
    );

    // Fetch updated data on filter change
    const reloadData = async (farmId: string, year: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (farmId) params.set("farmId", farmId);
            if (year) params.set("year", year);
            params.set("view", "overview");

            const res = await fetch(`/api/farmer/statistics?${params.toString()}`, { cache: "no-store" });
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setData(json);
                }
            }
        } catch (err) {
            console.error("Error fetching overview statistics:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFarmChange = (newFarmId: string) => {
        setSelectedFarmId(newFarmId);
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (newFarmId && newFarmId !== "ALL") params.set("farmId", newFarmId);
            else params.delete("farmId");
            router.replace(`/dashboard/farmer/statistics?${params.toString()}`, { scroll: false });
        });
        void reloadData(newFarmId, selectedYear);
    };

    const handleYearChange = (newYear: string) => {
        setSelectedYear(newYear);
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (newYear && newYear !== "ALL") params.set("year", newYear);
            else params.delete("year");
            router.replace(`/dashboard/farmer/statistics?${params.toString()}`, { scroll: false });
        });
        void reloadData(selectedFarmId, newYear);
    };

    // Prepare monthly data for Recharts (units in million VNĐ for clean axes)
    const chartMonthlyData = (data.financial.monthlyTrends || []).map((pt) => ({
        month: pt.month,
        label: pt.label,
        revenue: Math.round((pt.revenue / 1_000_000) * 10) / 10,
        cost: Math.round((pt.cost / 1_000_000) * 10) / 10,
        profit: Math.round((pt.profit / 1_000_000) * 10) / 10,
        pesticideCost: Math.round((pt.pesticideCost / 1_000_000) * 10) / 10,
        fertilizerCost: Math.round((pt.fertilizerCost / 1_000_000) * 10) / 10,
        otherCost: Math.round((pt.otherCost / 1_000_000) * 10) / 10,
        rawRevenue: pt.revenue,
        rawCost: pt.cost,
        rawProfit: pt.profit,
    }));

    // Find months that actually have activity or show full 12 months
    const activeMonths = chartMonthlyData.filter((m) => m.revenue > 0 || m.cost > 0);
    const displayChartData = chartMonthlyData.length > 0 ? chartMonthlyData : [];

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-6 sm:px-6">
            {/* Top Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-0.5 text-xs font-bold text-brand-700">
                        <Coins className="h-3.5 w-3.5" />
                        Báo cáo sản xuất & Tài chính
                    </span>
                    <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">THỐNG KÊ</h1>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        Theo dõi mức sử dụng vật tư và hiệu quả tài chính trong quá trình sản xuất
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void reloadData(selectedFarmId, selectedYear)}
                        disabled={loading || isPending}
                        className="rounded-2xl text-xs font-semibold"
                    >
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span>Làm mới số liệu</span>
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs Bar: [Tổng quan] [Thuốc BVTV] [Phân bón] [Tổng chi phí] */}
            <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1.5 text-center text-xs font-bold shadow-inner sm:grid-cols-4 sm:text-sm">
                <Link
                    href="/dashboard/farmer/statistics"
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-brand-900 shadow-sm transition"
                >
                    <BarChart3 className="h-4 w-4 text-brand-600" />
                    <span>Tổng quan</span>
                </Link>

                <Link
                    href={`/dashboard/farmer/statistics/pesticides${selectedFarmId !== "ALL" ? `?farmId=${selectedFarmId}` : ""}`}
                    className="flex items-center justify-center gap-1.5 rounded-2xl py-3 text-slate-600 transition hover:bg-white/60 hover:text-slate-900"
                >
                    <FlaskConical className="h-4 w-4 text-amber-600" />
                    <span>Thuốc BVTV</span>
                </Link>

                <Link
                    href={`/dashboard/farmer/statistics/fertilizers${selectedFarmId !== "ALL" ? `?farmId=${selectedFarmId}` : ""}`}
                    className="flex items-center justify-center gap-1.5 rounded-2xl py-3 text-slate-600 transition hover:bg-white/60 hover:text-slate-900"
                >
                    <Leaf className="h-4 w-4 text-emerald-600" />
                    <span>Phân bón</span>
                </Link>

                <Link
                    href={`/dashboard/farmer/statistics/expenses${selectedFarmId !== "ALL" ? `?farmId=${selectedFarmId}` : ""}`}
                    className="flex items-center justify-center gap-1.5 rounded-2xl py-3 text-slate-600 transition hover:bg-white/60 hover:text-slate-900"
                >
                    <Wallet className="h-4 w-4 text-rose-600" />
                    <span>Chi phí</span>
                </Link>
            </div>

            {/* Selector Filter Bar: [Vườn: Tất cả] [Thời gian: Năm 2026] */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Bộ lọc Vườn */}
                    <div>
                        <label className="mb-1 block text-xs font-bold text-slate-500">Vườn canh tác</label>
                        <select
                            value={selectedFarmId}
                            onChange={(e) => handleFarmChange(e.target.value)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        >
                            <option value="ALL">Tất cả các vườn ({data.farms.length} vườn)</option>
                            {data.farms.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.farmName} ({f.farmCode})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Bộ lọc Thời gian */}
                    <div>
                        <label className="mb-1 block text-xs font-bold text-slate-500">Thời gian thống kê</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        >
                            {data.availableYears.map((yr) => (
                                <option key={yr} value={String(yr)}>
                                    Năm {yr}
                                </option>
                            ))}
                            <option value="ALL">Tất cả các năm</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                    <span className="ml-2 text-xs font-medium text-slate-500">Đang cập nhật số liệu...</span>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 5 TOP KPI CARDS */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {/* 1. THUỐC BVTV */}
                <div className="group relative rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Thuốc BVTV</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <FlaskConical className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-black text-slate-900">{formatMillion(data.kpis.pesticideCost)}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-800">
                            <span>{data.kpis.pesticideUsages} lần sử dụng</span>
                        </p>
                    </div>
                </div>

                {/* 2. PHÂN BÓN */}
                <div className="group relative rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Phân bón</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <Leaf className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-black text-slate-900">{formatMillion(data.kpis.fertilizerCost)}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-800">
                            <span>{data.kpis.fertilizerUsages} lần sử dụng</span>
                        </p>
                    </div>
                </div>

                {/* 3. TỔNG CHI PHÍ */}
                <div className="group relative rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Tổng chi phí</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-black text-slate-900">{formatMillion(data.kpis.totalCost)}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                            Vật tư + Nhân công + Vận hành
                        </p>
                    </div>
                </div>

                {/* 4. DOANH THU */}
                <div className="group relative rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Doanh thu</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-black text-slate-900">{formatMillion(data.kpis.totalRevenue)}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-800">
                            <span>{formatKg(data.kpis.totalSoldWeightKg)} đã bán</span>
                        </p>
                    </div>
                </div>

                {/* 5. LỢI NHUẬN ƯỚC TÍNH */}
                <div className="group relative rounded-3xl border border-brand-300 bg-gradient-to-br from-brand-50 to-emerald-50/30 p-4 shadow-sm transition hover:shadow-md sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-800">Lợi nhuận ước tính</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">
                            <PiggyBank className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className={`text-2xl font-black ${data.kpis.estimatedProfit >= 0 ? "text-brand-900" : "text-rose-600"}`}>
                            {formatMillion(data.kpis.estimatedProfit)}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-700">
                            <span>{data.kpis.profitMargin}% doanh thu</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. THỐNG KÊ THUỐC BVTV */}
            {/* ========================================================================= */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                <FlaskConical className="h-4 w-4" />
                            </span>
                            <h2 className="text-lg font-black text-slate-900">1. THỐNG KÊ THUỐC BVTV</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Tổng chi phí: <strong className="text-slate-900 font-bold">{formatVND(data.pesticides.totalCost)}</strong>
                            {" • "}
                            <span>{data.pesticides.usagesCount} lần sử dụng</span>
                            {" • "}
                            <span>{data.pesticides.typesCount} loại thuốc</span>
                        </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="rounded-2xl border-amber-300 text-xs font-bold text-amber-800 hover:bg-amber-50">
                        <Link href="/dashboard/farmer/statistics/pesticides" className="inline-flex items-center gap-1">
                            <span>Xem chi tiết Thuốc BVTV</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* CHI PHÍ THUỐC BVTV THEO THỜI GIAN */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
                            <span>Chi phí thuốc BVTV theo thời gian</span>
                            <span className="text-[11px] font-normal text-slate-400">Đơn vị: Triệu VNĐ</span>
                        </h3>
                        {isMounted && displayChartData.length > 0 ? (
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={displayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                                        <Tooltip
                                            formatter={(value: any) => [`${value} tr (${formatVND(Number(value) * 1_000_000)})`, "Chi phí Thuốc"]}
                                            labelFormatter={(label) => `Tháng ${label}`}
                                            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                                        />
                                        <Bar dataKey="pesticideCost" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-slate-400">Chưa có số liệu theo tháng</div>
                        )}
                    </div>

                    {/* THUỐC SỬ DỤNG NHIỀU */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                            Thuốc sử dụng nhiều
                        </h3>
                        {data.pesticides.topSupplies.length > 0 ? (
                            <div className="space-y-2.5">
                                {data.pesticides.topSupplies.map((item, idx) => {
                                    const maxUses = data.pesticides.topSupplies[0]?.usagesCount || 1;
                                    const percent = Math.round((item.usagesCount / maxUses) * 100);
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-800 truncate max-w-[220px]">
                                                    {item.name}
                                                </span>
                                                <div className="flex items-center gap-2 text-right">
                                                    <span className="font-bold text-amber-800">{item.usagesCount} lần</span>
                                                    <span className="text-slate-400 font-normal">({formatShortMillion(item.totalCost)})</span>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                                                <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-slate-400">Chưa ghi nhận lượt dùng thuốc</div>
                        )}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 2. THỐNG KÊ PHÂN BÓN */}
            {/* ========================================================================= */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                <Leaf className="h-4 w-4" />
                            </span>
                            <h2 className="text-lg font-black text-slate-900">2. THỐNG KÊ PHÂN BÓN</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Tổng chi phí: <strong className="text-slate-900 font-bold">{formatVND(data.fertilizers.totalCost)}</strong>
                            {" • "}
                            <span>Số lần bón: {data.fertilizers.usagesCount}</span>
                            {" • "}
                            <span>Tổng lượng: {formatKg(data.fertilizers.totalWeightKg)}</span>
                            {" • "}
                            <span>{data.fertilizers.typesCount} loại phân</span>
                        </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="rounded-2xl border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                        <Link href="/dashboard/farmer/statistics/fertilizers" className="inline-flex items-center gap-1">
                            <span>Xem chi tiết Phân bón</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* CHI PHÍ PHÂN BÓN THEO THỜI GIAN */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
                            <span>Chi phí phân bón theo thời gian</span>
                            <span className="text-[11px] font-normal text-slate-400">Đơn vị: Triệu VNĐ</span>
                        </h3>
                        {isMounted && displayChartData.length > 0 ? (
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={displayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                                        <Tooltip
                                            formatter={(value: any) => [`${value} tr (${formatVND(Number(value) * 1_000_000)})`, "Chi phí Phân bón"]}
                                            labelFormatter={(label) => `Tháng ${label}`}
                                            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                                        />
                                        <Bar dataKey="fertilizerCost" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-slate-400">Chưa có số liệu theo tháng</div>
                        )}
                    </div>

                    {/* CƠ CẤU PHÂN BÓN */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                            Cơ cấu phân bón sử dụng
                        </h3>
                        <div className="space-y-3">
                            {data.fertilizers.composition.map((group, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                                            <span className="font-semibold text-slate-800">{group.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-right">
                                            <span className="font-bold text-slate-900">{formatKg(group.weightKg)}</span>
                                            <span className="text-slate-400">({group.percentage}%)</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, Math.max(group.percentage, 3))}%`, backgroundColor: group.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 3. THỐNG KÊ CHI PHÍ */}
            {/* ========================================================================= */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                                <Wallet className="h-4 w-4" />
                            </span>
                            <h2 className="text-lg font-black text-slate-900">3. THỐNG KÊ CHI PHÍ SẢN XUẤT</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Tổng chi phí toàn vụ: <strong className="text-slate-900 font-bold text-base">{formatVND(data.expenses.totalCost)}</strong>
                        </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="rounded-2xl border-rose-300 text-xs font-bold text-rose-800 hover:bg-rose-50">
                        <Link href="/dashboard/farmer/statistics/expenses" className="inline-flex items-center gap-1">
                            <span>Xem chi tiết Chi phí</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* CƠ CẤU CHI PHÍ (Phân bón, Chi phí khác, Thuốc BVTV) */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                                Cơ cấu phân bổ chi phí
                            </h3>

                            {/* Proportional bar */}
                            <div className="h-4 w-full overflow-hidden rounded-full flex bg-slate-200 mb-4 shadow-inner">
                                <div
                                    title={`Phân bón: ${data.expenses.structure.fertilizer.percentage}%`}
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${data.expenses.structure.fertilizer.percentage}%` }}
                                />
                                <div
                                    title={`Chi phí khác: ${data.expenses.structure.other.percentage}%`}
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${data.expenses.structure.other.percentage}%` }}
                                />
                                <div
                                    title={`Thuốc BVTV: ${data.expenses.structure.pesticide.percentage}%`}
                                    className="h-full bg-amber-500 transition-all"
                                    style={{ width: `${data.expenses.structure.pesticide.percentage}%` }}
                                />
                            </div>

                            {/* 3 Main Groups */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-bold text-slate-800">Phân bón</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-slate-900">{formatShortMillion(data.expenses.structure.fertilizer.amount)}</span>
                                        <span className="ml-1 text-[11px] font-semibold text-emerald-600">({data.expenses.structure.fertilizer.percentage}%)</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full bg-blue-500" />
                                        <span className="text-xs font-bold text-slate-800">Chi phí khác (Nhân công, điện nước...)</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-slate-900">{formatShortMillion(data.expenses.structure.other.amount)}</span>
                                        <span className="ml-1 text-[11px] font-semibold text-blue-600">({data.expenses.structure.other.percentage}%)</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full bg-amber-500" />
                                        <span className="text-xs font-bold text-slate-800">Thuốc BVTV</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-slate-900">{formatShortMillion(data.expenses.structure.pesticide.amount)}</span>
                                        <span className="ml-1 text-[11px] font-semibold text-amber-600">({data.expenses.structure.pesticide.percentage}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400 italic">
                            * Giúp nhận biết tỷ trọng vật tư và chi phí vận hành ngoài vườn.
                        </p>
                    </div>

                    {/* CHI PHÍ THEO THỜI GIAN (XU HƯỚNG THEO THÁNG) */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
                            <span>Xu hướng chi phí theo thời gian</span>
                            <span className="text-[11px] font-normal text-slate-400">Đơn vị: Triệu VNĐ</span>
                        </h3>
                        {isMounted && displayChartData.length > 0 ? (
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={displayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                                        <Tooltip
                                            formatter={(value: any) => [`${value} tr (${formatVND(Number(value) * 1_000_000)})`, "Tổng chi phí"]}
                                            labelFormatter={(label) => `Tháng ${label}`}
                                            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                                        />
                                        <Bar dataKey="cost" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-slate-400">Chưa có số liệu chi phí theo tháng</div>
                        )}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 4. THỐNG KÊ DOANH THU */}
            {/* ========================================================================= */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                <TrendingUp className="h-4 w-4" />
                            </span>
                            <h2 className="text-lg font-black text-slate-900">4. DOANH THU BÁN HÀNG</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Dữ liệu đồng bộ trực tiếp từ các giao dịch bán đã được Vựa / Cơ sở chế biến xác nhận
                        </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="rounded-2xl border-blue-300 text-xs font-bold text-blue-800 hover:bg-blue-50">
                        <Link href="/dashboard/farmer/harvests" className="inline-flex items-center gap-1">
                            <span>Xem phiếu thu hoạch</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>

                {/* 4 KPI Doanh thu */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-3.5">
                        <span className="text-xs font-semibold text-slate-500">Tổng doanh thu</span>
                        <p className="mt-1 text-lg font-black text-blue-900 sm:text-xl">{formatVND(data.revenue.totalRevenue)}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                        <span className="text-xs font-semibold text-slate-500">Khối lượng đã bán</span>
                        <p className="mt-1 text-lg font-black text-slate-900 sm:text-xl">{formatKg(data.revenue.totalWeightKg)}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                        <span className="text-xs font-semibold text-slate-500">Giá bán trung bình</span>
                        <p className="mt-1 text-lg font-black text-slate-900 sm:text-xl">
                            {formatVND(data.revenue.avgPricePerKg)}<span className="text-xs font-normal text-slate-400">/kg</span>
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                        <span className="text-xs font-semibold text-slate-500">Số lần bán</span>
                        <p className="mt-1 text-lg font-black text-slate-900 sm:text-xl">
                            {data.revenue.salesCount} <span className="text-xs font-normal text-slate-400">giao dịch</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* DOANH THU THEO THỜI GIAN */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
                            <span>Doanh thu theo thời gian</span>
                            <span className="text-[11px] font-normal text-slate-400">Đơn vị: Triệu VNĐ</span>
                        </h3>
                        {isMounted && displayChartData.length > 0 ? (
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={displayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                                        <Tooltip
                                            formatter={(value: any) => [`${value} tr (${formatVND(Number(value) * 1_000_000)})`, "Doanh thu"]}
                                            labelFormatter={(label) => `Tháng ${label}`}
                                            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                                        />
                                        <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-slate-400">Chưa có giao dịch bán theo tháng</div>
                        )}
                    </div>

                    {/* GIAO DỊCH BÁN GẦN ĐÂY */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                            Giao dịch bán gần đây
                        </h3>
                        {data.revenue.recentTransactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase">
                                            <th className="pb-2">Ngày</th>
                                            <th className="pb-2">Đơn vị mua</th>
                                            <th className="pb-2 text-right">Khối lượng</th>
                                            <th className="pb-2 text-right">Doanh thu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.revenue.recentTransactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-white/80 transition-colors">
                                                <td className="py-2.5 font-bold text-slate-700">{tx.date}</td>
                                                <td className="py-2.5">
                                                    <span className="font-semibold text-slate-900">{tx.buyerName}</span>
                                                    <span className="block text-[10px] text-slate-400">{tx.variety} • {tx.code}</span>
                                                </td>
                                                <td className="py-2.5 text-right font-medium text-slate-700">{formatKg(tx.weightKg)}</td>
                                                <td className="py-2.5 text-right font-bold text-blue-700">{formatShortMillion(tx.totalAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-slate-400">Chưa có giao dịch bán nào hoàn tất</div>
                        )}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 5. THỐNG KÊ LỢI NHUẬN & HIỆU QUẢ TÀI CHÍNH */}
            {/* ========================================================================= */}
            <section className="rounded-3xl border border-brand-200 bg-white p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft">
                        <Award className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-lg font-black text-slate-900">5. HIỆU QUẢ TÀI CHÍNH & LỢI NHUẬN</h2>
                        <p className="text-xs text-slate-500">Kết nối tổng thể Chi phí và Doanh thu sản xuất của nông hộ</p>
                    </div>
                </div>

                {/* Phương trình tài chính: DOANH THU - CHI PHÍ = LỢI NHUẬN ƯỚC TÍNH */}
                <div className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50/70 via-emerald-50/40 to-blue-50/50 p-4 sm:p-6 shadow-sm">
                    <div className="grid grid-cols-1 items-center gap-4 text-center sm:grid-cols-5">
                        {/* DOANH THU */}
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">DOANH THU</span>
                            <p className="text-xl font-black text-slate-900 sm:text-2xl">{formatVND(data.financial.totalRevenue)}</p>
                        </div>

                        {/* DẤU TRỪ */}
                        <div className="flex justify-center text-2xl font-black text-slate-400 sm:text-3xl">-</div>

                        {/* CHI PHÍ */}
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">TỔNG CHI PHÍ</span>
                            <p className="text-xl font-black text-slate-900 sm:text-2xl">{formatVND(data.financial.totalCost)}</p>
                        </div>

                        {/* DẤU BẰNG */}
                        <div className="flex justify-center text-2xl font-black text-slate-400 sm:text-3xl">=</div>

                        {/* LỢI NHUẬN ƯỚC TÍNH */}
                        <div className="space-y-1 rounded-2xl bg-white/90 p-3 shadow-sm border border-brand-200">
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-800">LỢI NHUẬN ƯỚC TÍNH</span>
                            <p className={`text-xl font-black sm:text-2xl ${data.financial.estimatedProfit >= 0 ? "text-brand-700" : "text-rose-600"}`}>
                                {formatVND(data.financial.estimatedProfit)}
                            </p>
                        </div>
                    </div>

                    {/* Hai chỉ số phụ: Biên lợi nhuận & Lợi nhuận / kg */}
                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-brand-200/50 pt-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-2xl bg-white/80 p-3 border border-slate-200/60">
                            <span className="text-xs font-semibold text-slate-600">Biên lợi nhuận</span>
                            <span className="text-sm font-black text-brand-700">
                                {data.financial.profitMargin}% <span className="text-[11px] font-normal text-slate-400">doanh thu</span>
                            </span>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl bg-white/80 p-3 border border-slate-200/60">
                            <span className="text-xs font-semibold text-slate-600">Lợi nhuận trên mỗi kg</span>
                            <span className="text-sm font-black text-emerald-700">
                                {formatVND(data.financial.profitPerKg)}<span className="text-[11px] font-normal text-slate-400">/kg</span>
                            </span>
                        </div>
                    </div>

                    <p className="mt-3 text-[11px] text-slate-500 italic text-center">
                        * Ghi nhận là Lợi nhuận ước tính dựa trên doanh thu từ các giao dịch bán đã xác nhận và chi phí vật tư, canh tác đã ghi nhận trong vụ.
                    </p>
                </div>

                {/* BIỂU ĐỒ TỔNG HỢP CUỐI TRANG: HIỆU QUẢ TÀI CHÍNH THEO THỜI GIAN */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                                <BarChart3 className="h-4 w-4 text-brand-600" />
                                <span>HIỆU QUẢ TÀI CHÍNH THEO THỜI GIAN</span>
                            </h3>
                            <p className="text-xs text-slate-500">So sánh Doanh thu, Chi phí và Lợi nhuận lũy kế qua các tháng trong năm</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">Đơn vị: Triệu đồng (tr)</span>
                    </div>

                    {isMounted && displayChartData.length > 0 ? (
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={displayChartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                                    <Tooltip
                                        formatter={(val: any, name: string) => {
                                            const labels: Record<string, string> = {
                                                revenue: "Doanh thu",
                                                cost: "Chi phí",
                                                profit: "Lợi nhuận",
                                            };
                                            return [`${val} tr (${formatVND(Number(val) * 1_000_000)})`, labels[name] || name];
                                        }}
                                        labelFormatter={(lbl) => `Tháng ${lbl}`}
                                        contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                                    />
                                    <Legend
                                        formatter={(val) => {
                                            const labels: Record<string, string> = {
                                                revenue: "Doanh thu",
                                                cost: "Chi phí",
                                                profit: "Lợi nhuận ước tính",
                                            };
                                            return <span className="text-xs font-bold text-slate-700">{labels[val] || val}</span>;
                                        }}
                                    />
                                    <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="revenue" />
                                    <Bar dataKey="cost" fill="#F43F5E" radius={[4, 4, 0, 0]} name="cost" />
                                    <Line type="monotone" dataKey="profit" stroke="#0284C7" strokeWidth={3} dot={{ r: 4, fill: "#0284C7" }} name="profit" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex h-48 items-center justify-center text-xs text-slate-400">Chưa có số liệu tài chính để hiển thị biểu đồ</div>
                    )}
                </div>
            </section>
        </div>
    );
}
