"use client";

import { useCallback, useEffect, useState } from "react";
import {
    ArrowDownRight,
    ArrowUpRight,
    Boxes,
    History,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/order-status";

type SupplyItem = {
    id: string;
    name: string;
    type: "FERTILIZER" | "PESTICIDE" | "EQUIPMENT" | "OTHER";
    brand?: string | null;
    unit: string;
    quantity: number;
    unitPrice: number | string;
    phiDays?: number | null;
    activeIngredients?: string | null;
    notes?: string | null;
    updatedAt: string;
};

type SupplyTransaction = {
    id: string;
    type: "IN" | "OUT" | "ADJUSTMENT";
    quantity: number;
    unitPrice: number | string;
    totalAmount: number | string;
    stage?: string | null;
    activityType?: string | null;
    purpose?: string | null;
    actionDate: string;
    notes?: string | null;
    supply: { name: string; type: string; unit: string };
    farm?: { farmName: string } | null;
    cropSeason?: { name: string } | null;
};

type FarmOption = {
    id: string;
    farmName: string;
    cropSeasons: { id: string; name: string; status: string }[];
};

const SUPPLY_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
    FERTILIZER: { label: "Phân bón", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    PESTICIDE: { label: "Thuốc BVTV", badge: "bg-amber-50 text-amber-800 border-amber-200" },
    EQUIPMENT: { label: "Thiết bị", badge: "bg-blue-50 text-blue-800 border-blue-200" },
    OTHER: { label: "Khác", badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

interface FarmerInventoryTabProps {
    initialSupplies?: SupplyItem[];
    initialTransactions?: SupplyTransaction[];
    initialFarms?: FarmOption[];
}

export function FarmerInventoryTab({
    initialSupplies,
    initialTransactions,
    initialFarms,
}: FarmerInventoryTabProps = {}) {
    const [viewMode, setViewMode] = useState<"STOCK" | "HISTORY">("STOCK");
    const [supplies, setSupplies] = useState<SupplyItem[]>(initialSupplies || []);
    const [transactions, setTransactions] = useState<SupplyTransaction[]>(initialTransactions || []);
    const [farms, setFarms] = useState<FarmOption[]>(initialFarms || []);
    const [loading, setLoading] = useState(initialSupplies ? false : true);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedSupplyForExport, setSelectedSupplyForExport] = useState<SupplyItem | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form Add
    const [addForm, setAddForm] = useState({
        name: "",
        type: "FERTILIZER",
        brand: "",
        unit: "bao",
        quantity: 1,
        unitPrice: 0,
        phiDays: "",
        activeIngredients: "",
        notes: "",
    });

    // Form Export
    const [exportForm, setExportForm] = useState({
        supplyId: "",
        quantity: 1,
        farmId: "",
        cropSeasonId: "",
        stage: "FRUIT_GROWING",
        activityType: "FERTILIZE",
        purpose: "Sử dụng cho canh tác",
        notes: "",
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [suppliesRes, txRes, farmsRes] = await Promise.all([
                fetch("/api/farmer/supplies", { cache: "no-store" }),
                fetch("/api/farmer/supplies/transactions", { cache: "no-store" }),
                fetch("/api/crop-seasons", { cache: "no-store" }).catch(() => null),
            ]);

            if (suppliesRes.ok) {
                const suppliesData = await suppliesRes.json().catch(() => null);
                if (suppliesData?.data) setSupplies(suppliesData.data);
            }
            if (txRes.ok) {
                const txData = await txRes.json().catch(() => null);
                if (txData?.data) setTransactions(txData.data);
            }
            if (farmsRes && farmsRes.ok) {
                const fData = await farmsRes.json().catch(() => null);
                if (fData) setFarms(fData.farms || fData.data || []);
            }
        } catch (err) {
            console.error("Error loading inventory data:", err);
            setSupplies([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleSyncOrders = async () => {
        setSyncing(true);
        setMessage(null);
        try {
            const res = await fetch("/api/farmer/supplies/sync-orders", { method: "POST" });
            const payload = await res.json();
            if (res.ok) {
                setMessage({ text: payload.message || "Đã đồng bộ đơn mua thành công.", type: "success" });
                await loadData();
            } else {
                setMessage({ text: payload.message || "Lỗi khi đồng bộ đơn mua.", type: "error" });
            }
        } finally {
            setSyncing(false);
        }
    };

    const handleCreateSupply = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/farmer/supplies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...addForm,
                    phiDays: addForm.phiDays ? Number(addForm.phiDays) : null,
                }),
            });
            const payload = await res.json();
            if (res.ok) {
                setShowAddModal(false);
                setAddForm({
                    name: "",
                    type: "FERTILIZER",
                    brand: "",
                    unit: "bao",
                    quantity: 1,
                    unitPrice: 0,
                    phiDays: "",
                    activeIngredients: "",
                    notes: "",
                });
                await loadData();
            } else {
                alert(payload.message || "Không thể thêm vật tư.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportSupply = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/farmer/supplies/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...exportForm,
                    type: "OUT",
                }),
            });
            const payload = await res.json();
            if (res.ok) {
                setShowExportModal(false);
                setSelectedSupplyForExport(null);
                await loadData();
            } else {
                alert(payload.message || "Không thể xuất kho.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Filter supplies
    const filteredSupplies = supplies.filter((s) => {
        if (typeFilter !== "ALL" && s.type !== typeFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            return (
                s.name.toLowerCase().includes(q) ||
                (s.brand && s.brand.toLowerCase().includes(q)) ||
                (s.activeIngredients && s.activeIngredients.toLowerCase().includes(q))
            );
        }
        return true;
    });

    const totalStockValue = supplies.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0,
    );

    return (
        <div className="space-y-5">
            {/* Message alert */}
            {message && (
                <div
                    className={`flex items-center justify-between rounded-2xl p-4 text-sm ${
                        message.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                >
                    <span>{message.text}</span>
                    <button type="button" onClick={() => setMessage(null)}>
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Overview KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Mặt hàng tồn</span>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-slate-900">
                        {supplies.length} <span className="text-xs font-normal text-slate-400">loại</span>
                    </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Tổng giá trị tồn kho</span>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-brand-700">
                        {formatPrice(totalStockValue)}
                    </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Phân bón</span>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-700">
                        {supplies.filter((s) => s.type === "FERTILIZER").length}{" "}
                        <span className="text-xs font-normal text-slate-400">loại</span>
                    </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Thuốc BVTV</span>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-amber-700">
                        {supplies.filter((s) => s.type === "PESTICIDE").length}{" "}
                        <span className="text-xs font-normal text-slate-400">loại</span>
                    </p>
                </div>
            </div>

            {/* Action Bar & Mode Switcher */}
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setViewMode("STOCK")}
                        className={`rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                            viewMode === "STOCK"
                                ? "bg-brand-600 text-white shadow-soft"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        Tồn kho vật tư
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("HISTORY")}
                        className={`rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                            viewMode === "HISTORY"
                                ? "bg-brand-600 text-white shadow-soft"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        Lịch sử nhập / xuất
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={syncing}
                        onClick={handleSyncOrders}
                        className="rounded-2xl text-xs font-semibold"
                        title="Tự động nhập kho các mặt hàng từ đơn mua đã hoàn tất"
                    >
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                        <span>Đồng bộ từ Đơn mua</span>
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                        className="rounded-2xl bg-brand-600 text-xs font-bold text-white shadow-soft hover:bg-brand-700"
                    >
                        <Plus className="mr-1 h-4 w-4" />
                        <span>Nhập vật tư</span>
                    </Button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW MODE 1: TỒN KHO VẬT TƯ */}
            {/* ========================================================================= */}
            {viewMode === "STOCK" && (
                <div className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm theo tên vật tư, hoạt chất, thương hiệu..."
                                className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex gap-1.5 overflow-x-auto text-xs">
                            {["ALL", "FERTILIZER", "PESTICIDE", "EQUIPMENT", "OTHER"].map((typeKey) => (
                                <button
                                    key={typeKey}
                                    type="button"
                                    onClick={() => setTypeFilter(typeKey)}
                                    className={`shrink-0 rounded-full px-3.5 py-2 font-bold transition ${
                                        typeFilter === typeKey
                                            ? "bg-slate-900 text-white"
                                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {typeKey === "ALL" ? "Tất cả" : SUPPLY_TYPE_LABELS[typeKey]?.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stock Table */}
                    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                            </div>
                        ) : filteredSupplies.length === 0 ? (
                            <div className="py-16 text-center text-slate-500">
                                <Boxes className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                <p className="font-bold text-slate-800">Kho chưa có vật tư nào</p>
                                <p className="mt-1 text-xs text-slate-400">
                                    Bấm &quot;Nhập vật tư&quot; hoặc &quot;Đồng bộ từ Đơn mua&quot; để thêm vật tư vào kho.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600">
                                        <tr>
                                            <th className="px-5 py-3">Tên vật tư</th>
                                            <th className="px-4 py-3">Phân loại</th>
                                            <th className="px-4 py-3 text-right">Tồn kho</th>
                                            <th className="px-4 py-3 text-right">Đơn giá nhập</th>
                                            <th className="px-4 py-3 text-right">Thành tiền tồn</th>
                                            <th className="px-5 py-3 text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredSupplies.map((item) => {
                                            const typeMeta = SUPPLY_TYPE_LABELS[item.type] || SUPPLY_TYPE_LABELS.OTHER;
                                            const totalItemValue = Number(item.unitPrice) * item.quantity;
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50">
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-bold text-slate-900">{item.name}</p>
                                                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-400">
                                                            {item.brand && <span>Hãng: {item.brand}</span>}
                                                            {item.activeIngredients && <span>Hoạt chất: {item.activeIngredients}</span>}
                                                            {item.phiDays != null && (
                                                                <span className="text-amber-700 font-medium">
                                                                    Cách ly: {item.phiDays} ngày
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeMeta.badge}`}>
                                                            {typeMeta.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-black text-slate-900">
                                                        {item.quantity}{" "}
                                                        <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right text-slate-700 font-medium">
                                                        {formatPrice(item.unitPrice)}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-bold text-brand-700">
                                                        {formatPrice(totalItemValue)}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedSupplyForExport(item);
                                                                setExportForm((prev) => ({
                                                                    ...prev,
                                                                    supplyId: item.id,
                                                                    activityType:
                                                                        item.type === "FERTILIZER"
                                                                            ? "FERTILIZE"
                                                                            : item.type === "PESTICIDE"
                                                                            ? "SPRAY_PESTICIDE"
                                                                            : "OTHER",
                                                                }));
                                                                setShowExportModal(true);
                                                            }}
                                                            disabled={item.quantity <= 0}
                                                            className="rounded-xl text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                                                        >
                                                            <ArrowUpRight className="mr-1 h-3.5 w-3.5 text-brand-600" />
                                                            Xuất dùng
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW MODE 2: LỊCH SỬ NHẬP / XUẤT */}
            {/* ========================================================================= */}
            {viewMode === "HISTORY" && (
                <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    {transactions.length === 0 ? (
                        <div className="py-16 text-center text-slate-500">
                            <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                            <p className="font-bold text-slate-800">Chưa có lịch sử giao dịch nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600">
                                    <tr>
                                        <th className="px-5 py-3">Thời gian</th>
                                        <th className="px-4 py-3">Loại GD</th>
                                        <th className="px-4 py-3">Vật tư</th>
                                        <th className="px-4 py-3 text-right">Số lượng</th>
                                        <th className="px-4 py-3 text-right">Thành tiền</th>
                                        <th className="px-5 py-3">Vườn / Vụ mùa / Mục đích</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map((tx) => {
                                        const isOut = tx.type === "OUT";
                                        return (
                                            <tr key={tx.id} className="hover:bg-slate-50/50">
                                                <td className="px-5 py-3 text-xs text-slate-500 font-mono">
                                                    {new Date(tx.actionDate).toLocaleString("vi-VN")}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                            isOut
                                                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        }`}
                                                    >
                                                        {isOut ? (
                                                            <>
                                                                <ArrowUpRight className="h-3 w-3" />
                                                                Xuất dùng
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ArrowDownRight className="h-3 w-3" />
                                                                Nhập kho
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-slate-900">
                                                    {tx.supply.name}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                    {isOut ? `-${tx.quantity}` : `+${tx.quantity}`} {tx.supply.unit}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                                    {formatPrice(tx.totalAmount)}
                                                </td>
                                                <td className="px-5 py-3 text-xs text-slate-600">
                                                    {tx.farm && <span className="font-semibold text-slate-800">{tx.farm.farmName}</span>}
                                                    {tx.cropSeason && <span> • {tx.cropSeason.name}</span>}
                                                    <p className="text-slate-400 mt-0.5">{tx.purpose || tx.notes || "Không có ghi chú"}</p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: NHẬP VẬT TƯ THỦ CÔNG */}
            {/* ========================================================================= */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">Nhập vật tư vào kho</h3>
                            <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSupply} className="mt-4 space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-slate-700">Tên vật tư *</label>
                                <Input
                                    required
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    placeholder="Ví dụ: NPK 16-16-8, Champion 77WP..."
                                    className="mt-1 rounded-2xl"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Phân loại *</label>
                                    <select
                                        value={addForm.type}
                                        onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                                        className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                                    >
                                        <option value="FERTILIZER">Phân bón</option>
                                        <option value="PESTICIDE">Thuốc BVTV</option>
                                        <option value="EQUIPMENT">Thiết bị</option>
                                        <option value="OTHER">Khác</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Thương hiệu / Hãng</label>
                                    <Input
                                        value={addForm.brand}
                                        onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                                        placeholder="Ví dụ: Đầu Trâu, Bayer..."
                                        className="mt-1 rounded-2xl"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Đơn vị tính *</label>
                                    <Input
                                        required
                                        value={addForm.unit}
                                        onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                                        placeholder="bao, gói, chai..."
                                        className="mt-1 rounded-2xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Số lượng *</label>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        required
                                        value={addForm.quantity}
                                        onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) })}
                                        className="mt-1 rounded-2xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Đơn giá nhập (đ)</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={addForm.unitPrice}
                                        onChange={(e) => setAddForm({ ...addForm, unitPrice: Number(e.target.value) })}
                                        className="mt-1 rounded-2xl"
                                    />
                                </div>
                            </div>

                            {addForm.type === "PESTICIDE" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Thời gian cách ly PHI (ngày)</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={addForm.phiDays}
                                            onChange={(e) => setAddForm({ ...addForm, phiDays: e.target.value })}
                                            placeholder="7, 14..."
                                            className="mt-1 rounded-2xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Hoạt chất chính</label>
                                        <Input
                                            value={addForm.activeIngredients}
                                            onChange={(e) => setAddForm({ ...addForm, activeIngredients: e.target.value })}
                                            placeholder="Copper Hydroxide..."
                                            className="mt-1 rounded-2xl"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700">Ghi chú</label>
                                <Input
                                    value={addForm.notes}
                                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                    placeholder="Ghi chú thêm..."
                                    className="mt-1 rounded-2xl"
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl">
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={submitting} className="rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700">
                                    {submitting ? "Đang lưu..." : "Xác nhận nhập kho"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: XUẤT KHO SỬ DỤNG CHO CANH TÁC */}
            {/* ========================================================================= */}
            {showExportModal && selectedSupplyForExport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Xuất kho sử dụng</h3>
                                <p className="text-xs text-slate-500">
                                    {selectedSupplyForExport.name} • Tồn kho: <b>{selectedSupplyForExport.quantity} {selectedSupplyForExport.unit}</b>
                                </p>
                            </div>
                            <button type="button" onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleExportSupply} className="mt-4 space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-slate-700">Số lượng xuất *</label>
                                <div className="mt-1 flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="0.01"
                                        max={selectedSupplyForExport.quantity}
                                        step="any"
                                        required
                                        value={exportForm.quantity}
                                        onChange={(e) => setExportForm({ ...exportForm, quantity: Number(e.target.value) })}
                                        className="rounded-2xl"
                                    />
                                    <span className="font-bold text-slate-700">{selectedSupplyForExport.unit}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Vườn sử dụng</label>
                                    <select
                                        value={exportForm.farmId}
                                        onChange={(e) => {
                                            const fId = e.target.value;
                                            const farm = farms.find((f) => f.id === fId);
                                            const activeS = farm?.cropSeasons.find((s) => s.status === "ACTIVE") || farm?.cropSeasons[0];
                                            setExportForm({
                                                ...exportForm,
                                                farmId: fId,
                                                cropSeasonId: activeS?.id || "",
                                            });
                                        }}
                                        className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                                    >
                                        <option value="">-- Chọn vườn --</option>
                                        {farms.map((f) => (
                                            <option key={f.id} value={f.id}>{f.farmName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Vụ mùa</label>
                                    <select
                                        value={exportForm.cropSeasonId}
                                        onChange={(e) => setExportForm({ ...exportForm, cropSeasonId: e.target.value })}
                                        className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                                    >
                                        <option value="">-- Chọn vụ mùa --</option>
                                        {farms
                                            .find((f) => f.id === exportForm.farmId)
                                            ?.cropSeasons.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Giai đoạn sinh trưởng</label>
                                    <select
                                        value={exportForm.stage}
                                        onChange={(e) => setExportForm({ ...exportForm, stage: e.target.value })}
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
                                    <label className="block text-xs font-bold text-slate-700">Hoạt động canh tác</label>
                                    <select
                                        value={exportForm.activityType}
                                        onChange={(e) => setExportForm({ ...exportForm, activityType: e.target.value })}
                                        className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                                    >
                                        <option value="FERTILIZE">Bón phân</option>
                                        <option value="FOLIAR_FERTILIZING">Bón phân qua lá</option>
                                        <option value="SPRAY_PESTICIDE">Phun thuốc BVTV</option>
                                        <option value="BASE_FERTILIZING">Bón phân gốc</option>
                                        <option value="OTHER">Hoạt động khác</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700">Mục đích / Ghi chú</label>
                                <Input
                                    value={exportForm.purpose}
                                    onChange={(e) => setExportForm({ ...exportForm, purpose: e.target.value })}
                                    placeholder="Ví dụ: Bón thúc đợt 2 cho cây nuôi trái..."
                                    className="mt-1 rounded-2xl"
                                />
                            </div>

                            <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200/60">
                                Thành tiền xuất kho dự kiến:{" "}
                                <b>{formatPrice(Number(selectedSupplyForExport.unitPrice) * exportForm.quantity)}</b>.
                                Khoản này sẽ được tự động tính vào chi phí của Vụ mùa đã chọn!
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowExportModal(false)} className="rounded-xl">
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={submitting} className="rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700">
                                    {submitting ? "Đang xuất..." : "Xác nhận xuất kho"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
