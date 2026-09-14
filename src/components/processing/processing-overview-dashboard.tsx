'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Boxes,
    PackageCheck,
    Truck,
    ArrowRight,
    TrendingUp,
    Calendar,
    Filter,
    RotateCcw,
    Layers,
    Sparkles,
    CheckCircle2,
    PieChart as PieChartIcon,
    BarChart3,
    Clock,
} from "lucide-react";
import { useProcessingWorkflow } from "@/hooks/use-processing-workflow";
import { DEFAULT_FACILITY_INFO } from "@/lib/processing-workflow";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
} from "recharts";

const PIE_COLORS = ["#10b981", "#f59e0b"]; // Emerald (Trái tươi) & Amber (Chế biến khác)

export function ProcessingOverviewDashboard() {
    const { state, isLoaded } = useProcessingWorkflow();

    const [seasonFilter, setSeasonFilter] = useState<string>("2025-2026");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const availableSeasons = useMemo(() => {
        const seasons = Array.from(new Set(state.purchases.map((p) => p.cropSeason)));
        if (!seasons.includes("2025-2026")) seasons.push("2025-2026");
        return seasons;
    }, [state.purchases]);

    // Filtered data
    const filteredPurchases = useMemo(() => {
        return state.purchases.filter((p) => {
            if (seasonFilter !== "ALL" && p.cropSeason !== seasonFilter) return false;
            if (fromDate && p.purchaseDate < fromDate) return false;
            if (toDate && p.purchaseDate > toDate) return false;
            return true;
        });
    }, [state.purchases, seasonFilter, fromDate, toDate]);

    const filteredGradings = useMemo(() => {
        return state.gradings.filter((g) => {
            if (fromDate && g.gradingDate < fromDate) return false;
            if (toDate && g.gradingDate > toDate) return false;
            return true;
        });
    }, [state.gradings, fromDate, toDate]);

    const filteredShipments = useMemo(() => {
        return state.shipments.filter((s) => {
            if (fromDate && s.shipmentDate < fromDate) return false;
            if (toDate && s.shipmentDate > toDate) return false;
            return true;
        });
    }, [state.shipments, fromDate, toDate]);

    // 5 KPIs
    const totalPurchaseWeight = useMemo(
        () => filteredPurchases.reduce((sum, p) => sum + p.weightKg, 0),
        [filteredPurchases]
    );

    const pendingGradingPurchases = useMemo(
        () => filteredPurchases.filter((p) => p.gradingStatus === "PENDING"),
        [filteredPurchases]
    );
    const pendingGradingWeight = useMemo(
        () => pendingGradingPurchases.reduce((sum, p) => sum + p.weightKg, 0),
        [pendingGradingPurchases]
    );

    const freshClassifiedWeight = useMemo(
        () => filteredGradings.reduce((sum, g) => sum + g.freshWeight, 0),
        [filteredGradings]
    );

    const processedClassifiedWeight = useMemo(
        () => filteredGradings.reduce((sum, g) => sum + g.processedWeight, 0),
        [filteredGradings]
    );

    const shippedWeight = useMemo(
        () => filteredShipments.reduce((sum, s) => sum + s.netWeightKg, 0),
        [filteredShipments]
    );

    // Chart 1: Cơ cấu phân loại
    const gradingChartData = useMemo(() => {
        const total = freshClassifiedWeight + processedClassifiedWeight;
        if (total === 0) {
            return [
                { name: "Trái tươi", value: 0, percent: 0 },
                { name: "Chế biến khác", value: 0, percent: 0 },
            ];
        }
        return [
            {
                name: "Trái tươi",
                value: freshClassifiedWeight,
                percent: Math.round((freshClassifiedWeight / total) * 1000) / 10,
            },
            {
                name: "Chế biến khác",
                value: processedClassifiedWeight,
                percent: Math.round((processedClassifiedWeight / total) * 1000) / 10,
            },
        ];
    }, [freshClassifiedWeight, processedClassifiedWeight]);

    // Chart 2: Thu mua / Xuất hàng theo thời gian (Grouped by purchase/shipment dates or weeks)
    const timeChartData = useMemo(() => {
        // Group into recent dates or default demonstration intervals
        const map = new Map<string, { label: string; purchase: number; shipment: number }>();

        // Sort purchases and shipments
        filteredPurchases.forEach((p) => {
            const dateStr = p.purchaseDate || "2026-03";
            const key = dateStr.slice(0, 10);
            const current = map.get(key) || { label: key, purchase: 0, shipment: 0 };
            current.purchase += p.weightKg;
            map.set(key, current);
        });

        filteredShipments.forEach((s) => {
            const dateStr = s.shipmentDate || "2026-03";
            const key = dateStr.slice(0, 10);
            const current = map.get(key) || { label: key, purchase: 0, shipment: 0 };
            current.shipment += s.netWeightKg;
            map.set(key, current);
        });

        const sorted = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));

        if (sorted.length === 0) {
            return [
                { label: "05/03/2026", purchase: 5000, shipment: 0 },
                { label: "08/03/2026", purchase: 7500, shipment: 0 },
                { label: "10/03/2026", purchase: 0, shipment: 3384 },
                { label: "12/03/2026", purchase: 3800, shipment: 0 },
                { label: "14/03/2026", purchase: 4200, shipment: 0 },
            ];
        }

        return sorted.map((item) => {
            const parts = item.label.split("-");
            const shortLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.label;
            return {
                ...item,
                label: shortLabel,
            };
        });
    }, [filteredPurchases, filteredShipments]);

    const handleResetFilters = () => {
        setSeasonFilter("2025-2026");
        setFromDate("");
        setToDate("");
    };

    if (!isLoaded) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span>Đang nạp dữ liệu quản trị cơ sở...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-100 backdrop-blur-sm">
                                Mã CSĐG: {DEFAULT_FACILITY_INFO.phcCode}
                            </span>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                                Tiêu chuẩn GACC & VietGAP
                            </span>
                        </div>
                        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
                            {DEFAULT_FACILITY_INFO.name}
                        </h1>
                        <p className="mt-1 text-sm text-emerald-100/90">
                            Bảng điều khiển trung tâm quản trị thu mua, phân loại, chế biến đóng gói, xuất khẩu và tài chính.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/processing/purchases"
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                        >
                            <span>+ Thu mua mới</span>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                        <Filter className="h-4 w-4 text-emerald-600" />
                        <span>Bộ lọc chỉ số quản trị:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Niên vụ Filter */}
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <span>Niên vụ:</span>
                            <select
                                value={seasonFilter}
                                onChange={(e) => setSeasonFilter(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                            >
                                <option value="ALL">Tất cả niên vụ</option>
                                {availableSeasons.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range Filters */}
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <span>Khoảng thời gian:</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
                                placeholder="Từ ngày"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
                                placeholder="Đến ngày"
                            />
                        </div>

                        {/* Reset button */}
                        {(seasonFilter !== "2025-2026" || fromDate || toDate) && (
                            <button
                                onClick={handleResetFilters}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span>Đặt lại</span>
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* 5 Core KPIs Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* KPI 1: Tổng thu mua */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng thu mua</span>
                        <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                            <Boxes className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
                        {totalPurchaseWeight.toLocaleString("vi-VN")} <span className="text-sm font-semibold text-slate-500">kg</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {filteredPurchases.length} lô ghi nhận trong Hồ sơ thu mua
                    </p>
                </div>

                {/* KPI 2: Chờ phân loại */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Chờ phân loại</span>
                        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                            <Clock className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-amber-900">
                        {pendingGradingWeight.toLocaleString("vi-VN")} <span className="text-sm font-semibold text-amber-700">kg</span>
                    </p>
                    <p className="mt-1 text-xs text-amber-700 font-medium">
                        {pendingGradingPurchases.length} lô cần phân loại kiểm định
                    </p>
                </div>

                {/* KPI 3: Trái tươi */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Trái tươi</span>
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                            <Sparkles className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-900">
                        {freshClassifiedWeight.toLocaleString("vi-VN")} <span className="text-sm font-semibold text-emerald-700">kg</span>
                    </p>
                    <p className="mt-1 text-xs text-emerald-700 font-medium">
                        {gradingChartData[0]?.percent || 0}% chuyển sang đóng gói thùng
                    </p>
                </div>

                {/* KPI 4: Chế biến khác */}
                <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-orange-700">Chế biến khác</span>
                        <div className="rounded-xl bg-orange-100 p-2 text-orange-700">
                            <Layers className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-orange-900">
                        {processedClassifiedWeight.toLocaleString("vi-VN")} <span className="text-sm font-semibold text-orange-700">kg</span>
                    </p>
                    <p className="mt-1 text-xs text-orange-700 font-medium">
                        {gradingChartData[1]?.percent || 0}% bóc múi cấp đông / sấy
                    </p>
                </div>

                {/* KPI 5: Đã xuất */}
                <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Đã xuất hàng</span>
                        <div className="rounded-xl bg-teal-100 p-2 text-teal-700">
                            <Truck className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-teal-900">
                        {shippedWeight.toLocaleString("vi-VN")} <span className="text-sm font-semibold text-teal-700">kg</span>
                    </p>
                    <p className="mt-1 text-xs text-teal-700 font-medium">
                        {filteredShipments.length} hợp đồng xuất đã hoàn tất
                    </p>
                </div>
            </section>

            {/* 2 Charts Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Chart 1: Cơ cấu phân loại (Trái tươi vs Chế biến khác) */}
                <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-emerald-600" />
                                Cơ cấu phân loại
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Tỉ lệ khối lượng Trái tươi vs Chế biến khác</p>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            Tổng: {(freshClassifiedWeight + processedClassifiedWeight).toLocaleString("vi-VN")} kg
                        </span>
                    </div>

                    <div className="mt-4 h-64 flex flex-col items-center justify-center">
                        {freshClassifiedWeight + processedClassifiedWeight > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={gradingChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {gradingChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(val: number) => [`${val.toLocaleString("vi-VN")} kg`, "Khối lượng"]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-sm text-slate-400">
                                Chưa có dữ liệu phân loại trong khoảng thời gian đã chọn
                            </div>
                        )}
                    </div>

                    {/* Legend Details */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                <span className="text-xs font-bold text-emerald-900">Trái tươi</span>
                            </div>
                            <p className="mt-1 text-base font-black text-emerald-950">
                                {freshClassifiedWeight.toLocaleString("vi-VN")} kg
                            </p>
                            <p className="text-xs font-semibold text-emerald-700">{gradingChartData[0]?.percent || 0}%</p>
                        </div>

                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-amber-500" />
                                <span className="text-xs font-bold text-amber-900">Chế biến khác</span>
                            </div>
                            <p className="mt-1 text-base font-black text-amber-950">
                                {processedClassifiedWeight.toLocaleString("vi-VN")} kg
                            </p>
                            <p className="text-xs font-semibold text-amber-700">{gradingChartData[1]?.percent || 0}%</p>
                        </div>
                    </div>
                </div>

                {/* Chart 2: Thu mua / Xuất hàng theo thời gian */}
                <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-emerald-600" />
                                Thu mua & Xuất hàng theo thời gian
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">So sánh khối lượng nhập vào và khối lượng xuất đi (kg)</p>
                        </div>
                    </div>

                    <div className="mt-4 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `${v / 1000}t`} />
                                <RechartsTooltip
                                    formatter={(val: number, name: string) => [
                                        `${val.toLocaleString("vi-VN")} kg`,
                                        name === "purchase" ? "Thu mua" : "Xuất hàng",
                                    ]}
                                />
                                <Legend
                                    formatter={(value) => (value === "purchase" ? "Thu mua (kg)" : "Xuất hàng (kg)")}
                                    wrapperStyle={{ paddingTop: "10px" }}
                                />
                                <Bar dataKey="purchase" name="purchase" fill="#0284c7" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="shipment" name="shipment" fill="#10b981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            {/* Quick Process Flow Links */}
            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Quy trình vận hành khép kín tại cơ sở</h3>
                        <p className="text-xs text-slate-500">Một dữ liệu chỉ nhập một lần, liên kết tự động xuyên suốt từ thu mua đến xuất hàng và tài chính</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <Link
                        href="/dashboard/processing/purchases"
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
                    >
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bước 1</span>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Hồ sơ thu mua</h4>
                            <p className="text-xs text-slate-500 mt-1">Ghi nhận lô, mã vùng trồng, sinh công nợ phải trả</p>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            Xem hồ sơ <ArrowRight className="h-3 w-3" />
                        </span>
                    </Link>

                    <Link
                        href="/dashboard/processing/grading"
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
                    >
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bước 2</span>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Phân loại</h4>
                            <p className="text-xs text-slate-500 mt-1">Cân đối 100%: Trái tươi vs Chế biến khác</p>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            Phân loại <ArrowRight className="h-3 w-3" />
                        </span>
                    </Link>

                    <Link
                        href="/dashboard/processing/processing"
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
                    >
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bước 3</span>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Chế biến & Đóng gói</h4>
                            <p className="text-xs text-slate-500 mt-1">Đóng thùng tươi, bóc múi cấp đông, sinh lô TP</p>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            Thực hiện <ArrowRight className="h-3 w-3" />
                        </span>
                    </Link>

                    <Link
                        href="/dashboard/processing/shipments"
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
                    >
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bước 4</span>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Xuất hàng & QR</h4>
                            <p className="text-xs text-slate-500 mt-1">Hồ sơ xuất hàng chứng từ, cấp QR chuẩn PUC+PHC</p>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            Xuất hàng <ArrowRight className="h-3 w-3" />
                        </span>
                    </Link>

                    <Link
                        href="/dashboard/processing/finance"
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
                    >
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bước 5</span>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Tài chính</h4>
                            <p className="text-xs text-slate-500 mt-1">Bán hàng thu tiền, chi thu mua, nhật ký dòng tiền</p>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            Tài chính <ArrowRight className="h-3 w-3" />
                        </span>
                    </Link>
                </div>
            </section>
        </div>
    );
}
