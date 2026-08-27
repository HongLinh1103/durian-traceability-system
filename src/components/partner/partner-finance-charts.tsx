"use client";

import { useMemo, useState } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import {
    TrendingUp,
    BarChart3,
    PieChart as PieIcon,
    DollarSign,
    Scale,
    Users,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    Layers,
    Factory,
    Truck,
    Package,
    Calendar,
    Wallet,
} from "lucide-react";

export type PartnerChartData = {
    role: "COLLECTOR" | "PROCESSING_FACILITY";
    monthlyData: Array<{
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
        inputWeight?: number;
        outputWeight?: number;
        lossPercent?: number;
    }>;
    expenseStructure: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    customerDebts: Array<{
        name: string;
        debtAmount: number;
        paidAmount: number;
        totalAmount: number;
    }>;
    payableDebts: Array<{
        name: string;
        debtAmount: number;
        paidAmount: number;
        totalAmount: number;
    }>;
    customerRevenue: Array<{
        name: string;
        revenue: number;
        weight: number;
    }>;
    productRevenue: Array<{
        name: string;
        revenue: number;
        weight: number;
    }>;
    paymentMethods: Array<{
        name: string;
        value: number;
        count: number;
        color: string;
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

const formatVND = (val: number) => `${Number(val || 0).toLocaleString("vi-VN")} đ`;
const formatKg = (val: number) => `${Number(val || 0).toLocaleString("vi-VN")} kg`;

const CustomTooltip = ({ active, payload, label, unit = "đ" }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-xs text-xs">
                <p className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-2">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 font-medium text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                                {item.name}:
                            </span>
                            <span className="font-bold text-slate-900">
                                {unit === "đ"
                                    ? formatVND(item.value)
                                    : unit === "kg"
                                    ? formatKg(item.value)
                                    : unit === "%"
                                    ? `${item.value}%`
                                    : item.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export function PartnerFinanceCharts({ data, role }: { data: PartnerChartData; role: "COLLECTOR" | "PROCESSING_FACILITY" }) {
    const isCollector = role === "COLLECTOR";
    const [activeView, setActiveView] = useState<"summary" | "flow" | "breakdown">("summary");

    return (
        <div className="space-y-6">
            {/* Header info & view toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 font-black">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900">
                            {isCollector ? "Biểu Đồ Thống Kê Tài Chính Vựa Thu Mua" : "Biểu Đồ Thống Kê Tài Chính Cơ Sở Chế Biến"}
                        </h2>
                        <p className="text-xs text-slate-500">
                            6 biểu đồ phân tích trực quan: Doanh thu, Thu - Chi, Công nợ, Cơ cấu chi phí và Khối lượng vận hành
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActiveView("summary")}
                        className={`rounded-xl px-3 py-1.5 transition ${
                            activeView === "summary" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Tổng quan mua bán
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView("flow")}
                        className={`rounded-xl px-3 py-1.5 transition ${
                            activeView === "flow" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Dòng tiền & Công nợ
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView("breakdown")}
                        className={`rounded-xl px-3 py-1.5 transition ${
                            activeView === "breakdown" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Cơ cấu & Sản lượng
                    </button>
                </div>
            </div>

            {/* 6 CORE CHARTS GRID */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* ----------------- CHART 1: DOANH THU THEO THỜI GIAN & GIÁ TRỊ MUA BÁN ----------------- */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">
                                    {isCollector ? "1. Giá Trị Thu Mua vs Doanh Thu Xuất Bán" : "1. Doanh Thu Bán Hàng vs Tổng Chi Phí"}
                                </h3>
                                <p className="text-[11px] text-slate-500">So sánh tổng giá trị mua vào và xuất bán theo tháng</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                            Đơn vị: VNĐ
                        </span>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                <Tooltip content={<CustomTooltip unit="đ" />} />
                                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                                <Bar
                                    dataKey={isCollector ? "purchaseCost" : "totalExpense"}
                                    name={isCollector ? "Giá trị thu mua" : "Tổng chi phí"}
                                    fill="#f59e0b"
                                    radius={[6, 6, 0, 0]}
                                    barSize={24}
                                />
                                <Bar
                                    dataKey="revenue"
                                    name="Doanh thu xuất bán"
                                    fill="#059669"
                                    radius={[6, 6, 0, 0]}
                                    barSize={24}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="profit"
                                    name="Lợi nhuận gộp"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#2563eb" }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ----------------- CHART 2: THU - CHI THỰC TẾ (CASH-IN vs CASH-OUT) ----------------- */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">
                                    2. Dòng Tiền Thực Thu vs Thực Chi (Cashflow)
                                </h3>
                                <p className="text-[11px] text-slate-500">Tiền mặt/chuyển khoản thực nhận từ khách và thực chi trả</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                            Dòng tiền thực tế
                        </span>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                <Tooltip content={<CustomTooltip unit="đ" />} />
                                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                                <Bar dataKey="cashIn" name="Thực thu (Đã nhận)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={22} />
                                <Bar dataKey="cashOut" name="Thực chi (Đã thanh toán)" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ----------------- CHART 3: CÔNG NỢ PHẢI THU & PHẢI TRẢ ----------------- */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                <Wallet className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">
                                    {isCollector ? "3. Công Nợ Phải Thu Theo Khách Hàng" : "3. Công Nợ Phải Thu Theo Bên Mua / Nhà Phân Phối"}
                                </h3>
                                <p className="text-[11px] text-slate-500">Số tiền khách hàng còn nợ sau các đợt xuất bán</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl">
                            Công nợ khách hàng
                        </span>
                    </div>

                    <div className="h-72 w-full">
                        {data.customerDebts.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={data.customerDebts}
                                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "#334155" }} />
                                    <Tooltip content={<CustomTooltip unit="đ" />} />
                                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                                    <Bar dataKey="paidAmount" name="Đã thanh toán" stackId="a" fill="#10b981" barSize={18} />
                                    <Bar dataKey="debtAmount" name="Còn phải thu (Nợ)" stackId="a" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                Chưa có dữ liệu công nợ khách hàng
                            </div>
                        )}
                    </div>
                </div>

                {/* ----------------- CHART 4: CƠ CẤU CHI PHÍ (DONUT CHART) ----------------- */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                                <PieIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">
                                    {isCollector ? "4. Cơ Cấu Chi Phí Vựa Thu Mua" : "4. Cơ Cấu Chi Phí Chế Biến & Kho Bãi"}
                                </h3>
                                <p className="text-[11px] text-slate-500">Tỷ trọng các nhóm chi phí thu mua và vận hành</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl">
                            Tỷ trọng %
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center h-72">
                        <div className="h-full w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.expenseStructure}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {data.expenseStructure.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip unit="đ" />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {data.expenseStructure.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2 font-medium text-slate-700 truncate">
                                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="truncate">{item.name}</span>
                                    </span>
                                    <span className="font-bold text-slate-900 shrink-0">{formatVND(item.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ----------------- CHART 5: KHỐI LƯỢNG MUA - BÁN / SẢN LƯỢNG CHẾ BIẾN ----------------- */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                {isCollector ? <Scale className="h-4 w-4" /> : <Factory className="h-4 w-4" />}
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">
                                    {isCollector
                                        ? "5. Khối Lượng Thu Mua vs Xuất Bán (kg)"
                                        : "5. Sản Lượng Đầu Vào vs Thành Phẩm Thu Hồi (kg)"}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {isCollector ? "Cân đối sản lượng kg nông sản nhập và xuất theo tháng" : "So sánh kg nguyên liệu và thành phẩm đạt chuẩn"}
                                </p>
                            </div>
                        </div>
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl">
                            Đơn vị: kg
                        </span>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} tấn`} />
                                <Tooltip content={<CustomTooltip unit="kg" />} />
                                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                                <Bar
                                    dataKey={isCollector ? "purchaseWeight" : "inputWeight"}
                                    name={isCollector ? "Khối lượng thu mua" : "Nguyên liệu đầu vào"}
                                    fill="#0ea5e9"
                                    radius={[6, 6, 0, 0]}
                                    barSize={22}
                                />
                                <Bar
                                    dataKey={isCollector ? "salesWeight" : "outputWeight"}
                                    name={isCollector ? "Khối lượng xuất bán" : "Thành phẩm thu hồi"}
                                    fill="#10b981"
                                    radius={[6, 6, 0, 0]}
                                    barSize={22}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ----------------- CHART 6: TOP KHÁCH HÀNG / DOANH THU THEO SẢN PHẨM ----------------- */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                                <Users className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">
                                    {isCollector ? "6. Doanh Thu Theo Bên Mua / Điểm Bán" : "6. Doanh Thu Theo Loại Thành Phẩm"}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {isCollector ? "Các đối tác mua hàng tạo doanh thu cao nhất cho vựa" : "Doanh thu từ từng mặt hàng sầu riêng chế biến"}
                                </p>
                            </div>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl">
                            Xếp hạng cao nhất
                        </span>
                    </div>

                    <div className="h-72 w-full">
                        {(isCollector ? data.customerRevenue : data.productRevenue).length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={isCollector ? data.customerRevenue : data.productRevenue}
                                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#334155" }} />
                                    <Tooltip content={<CustomTooltip unit="đ" />} />
                                    <Bar dataKey="revenue" name="Doanh thu" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                Chưa có dữ liệu doanh thu
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ----------------- EXTRA SECTION: PHƯƠNG THỨC THANH TOÁN & HAO HỤT CHẾ BIẾN ----------------- */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Phương thức thanh toán */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">Phương Thức Thanh Toán</h3>
                                <p className="text-[11px] text-slate-500">Tỷ trọng tiền mặt, chuyển khoản và ghi nhận công nợ</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center h-56">
                        <div className="h-full w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.paymentMethods}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {data.paymentMethods.map((entry, index) => (
                                            <Cell key={`cell-pm-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip unit="đ" />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-2">
                            {data.paymentMethods.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50">
                                    <span className="flex items-center gap-2 font-medium text-slate-700">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        {item.name} ({item.count} giao dịch)
                                    </span>
                                    <span className="font-bold text-slate-900">{formatVND(item.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Hao hụt chế biến hoặc Công nợ phải trả */}
                {isCollector ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                                    <Truck className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Công Nợ Phải Trả Nhà Cung Cấp & Nông Dân</h3>
                                    <p className="text-[11px] text-slate-500">Các khoản tiền mua nông sản và dịch vụ vựa còn phải trả</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-56 w-full">
                            {data.payableDebts.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={data.payableDebts}
                                        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#334155" }} />
                                        <Tooltip content={<CustomTooltip unit="đ" />} />
                                        <Bar dataKey="debtAmount" name="Còn phải trả" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                    Không có công nợ phải trả tồn đọng
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                    <Factory className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Tỷ Lệ Thu Hồi & Hao Hụt Chế Biến (%)</h3>
                                    <p className="text-[11px] text-slate-500">Hiệu suất thu hồi thành phẩm sầu riêng theo từng mẻ / tháng</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-56 w-full">
                            {data.processingBatches && data.processingBatches.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.processingBatches} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="batchCode" tick={{ fontSize: 10, fill: "#64748b" }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                                        <Tooltip content={<CustomTooltip unit="%" />} />
                                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                                        <Line type="monotone" dataKey="yieldPercent" name="Tỷ lệ thu hồi (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="lossPercent" name="Tỷ lệ hao hụt (%)" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                    Chưa có dữ liệu mẻ chế biến
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
