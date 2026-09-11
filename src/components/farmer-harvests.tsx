"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    AlertTriangle,
    Building2,
    Calendar,
    ChevronDown,
    DollarSign,
    Pencil,
    Plus,
    Scale,
    Search,
    Trash2,
    Wheat,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { formatSeasonName } from "@/lib/crop-season";

export type HarvestRow = {
    id: string;
    code: string;
    cropSeasonId?: string | null;
    cropSeason?: {
        id: string;
        name: string;
        year: number;
        status: string;
    } | null;
    actualWeight?: number | string | null;
    expectedWeight?: number | string | null;
    expectedPricePerKg?: number | string | null;
    buyerFacility?: {
        id: string;
        name: string;
        phone?: string | null;
    } | null;
    transactionNote?: string | null;
    farm?: {
        id: string;
        farmName: string;
        durianVariety?: string | null;
    } | null;
    createdAt?: string | Date;
};

export type SeasonOption = {
    id: string;
    name: string;
    year: number;
    status: string;
    farmId: string;
    farmName: string;
};

export type PartnerFacilityOption = {
    id: string;
    name: string;
    type: string;
    representativeName?: string | null;
    phone?: string | null;
};

interface FarmerHarvestsProps {
    initialRows: HarvestRow[];
    seasons: SeasonOption[];
    facilities: PartnerFacilityOption[];
}

function formatKg(weight: number | string | null | undefined): string {
    const num = Number(weight || 0);
    return `${num.toLocaleString("vi-VN")} kg`;
}

function formatPricePerKg(price: number | string | null | undefined): string {
    const num = Number(price || 0);
    return `${num.toLocaleString("vi-VN")} đ/kg`;
}

function formatTotal(weight: number | string | null | undefined, price: number | string | null | undefined): string {
    const total = Math.round(Number(weight || 0) * Number(price || 0));
    return `${total.toLocaleString("vi-VN")} đ`;
}

function getBuyerName(item: HarvestRow): string {
    return (item.buyerFacility?.name || item.transactionNote || "Chưa xác định").trim();
}

export function FarmerHarvests({ initialRows, seasons, facilities }: FarmerHarvestsProps) {
    const [rows, setRows] = useState<HarvestRow[]>(initialRows);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSeasonFilter, setSelectedSeasonFilter] = useState("ALL");

    // Modal state for Add/Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<HarvestRow | null>(null);

    // Modal state for Delete confirmation
    const [deletingItem, setDeletingItem] = useState<HarvestRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form inputs
    const [formSeasonId, setFormSeasonId] = useState("");
    const [formWeight, setFormWeight] = useState("");
    const [buyerMode, setBuyerMode] = useState<"FACILITY" | "CUSTOM">("FACILITY");
    const [formFacilityId, setFormFacilityId] = useState("");
    const [formBuyerName, setFormBuyerName] = useState("");
    const [formPrice, setFormPrice] = useState("");
    const [formBusy, setFormBusy] = useState(false);

    const { toast } = useToast();

    // Default active season ID
    const defaultSeasonId = useMemo(() => {
        const active = seasons.find(s => s.status === "ACTIVE");
        return active?.id || (seasons.length > 0 ? seasons[0].id : "");
    }, [seasons]);

    // Live auto-calculated total amount
    const computedTotalAmount = useMemo(() => {
        const w = parseFloat(formWeight);
        const p = parseFloat(formPrice);
        if (!isNaN(w) && w > 0 && !isNaN(p) && p > 0) {
            return Math.round(w * p);
        }
        return 0;
    }, [formWeight, formPrice]);

    // Filtered rows
    const filteredRows = useMemo(() => {
        return rows.filter(item => {
            // Season filter
            if (selectedSeasonFilter !== "ALL") {
                if (item.cropSeasonId !== selectedSeasonFilter && item.cropSeason?.id !== selectedSeasonFilter) {
                    return false;
                }
            }
            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const buyer = getBuyerName(item).toLowerCase();
                const seasonName = (item.cropSeason ? formatSeasonName(item.cropSeason) : "").toLowerCase();
                const weightStr = String(item.actualWeight ?? item.expectedWeight ?? "");
                const priceStr = String(item.expectedPricePerKg ?? "");
                if (
                    !buyer.includes(q) &&
                    !seasonName.includes(q) &&
                    !weightStr.includes(q) &&
                    !priceStr.includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [rows, selectedSeasonFilter, searchQuery]);

    // Summary statistics for displayed rows
    const summary = useMemo(() => {
        let totalWeight = 0;
        let totalMoney = 0;
        for (const row of filteredRows) {
            const w = Number(row.actualWeight ?? row.expectedWeight ?? 0);
            const p = Number(row.expectedPricePerKg ?? 0);
            totalWeight += w;
            totalMoney += w * p;
        }
        return {
            count: filteredRows.length,
            totalWeight,
            totalMoney: Math.round(totalMoney),
        };
    }, [filteredRows]);

    // Open Add Modal
    function openCreateModal() {
        setEditingItem(null);
        setFormSeasonId(defaultSeasonId);
        setFormWeight("");
        setBuyerMode(facilities.length > 0 ? "FACILITY" : "CUSTOM");
        setFormFacilityId(facilities.length > 0 ? facilities[0].id : "");
        setFormBuyerName("");
        setFormPrice("");
        setModalOpen(true);
    }

    // Open Edit Modal
    function openEditModal(row: HarvestRow) {
        setEditingItem(row);
        setFormSeasonId(row.cropSeasonId || (row.cropSeason?.id ?? defaultSeasonId));
        setFormWeight(String(row.actualWeight ?? row.expectedWeight ?? ""));
        setFormPrice(String(row.expectedPricePerKg ?? ""));

        if (row.buyerFacility?.id) {
            setBuyerMode("FACILITY");
            setFormFacilityId(row.buyerFacility.id);
            setFormBuyerName("");
        } else {
            setBuyerMode("CUSTOM");
            setFormFacilityId("");
            setFormBuyerName(row.transactionNote || "");
        }
        setModalOpen(true);
    }

    // Open Delete Modal
    function openDeleteModal(row: HarvestRow) {
        setDeletingItem(row);
    }

    // Submit Add or Edit Form
    async function handleSaveForm(e: React.FormEvent) {
        e.preventDefault();
        const weight = parseFloat(formWeight);
        if (isNaN(weight) || weight <= 0) {
            toast({
                title: "Lỗi nhập liệu",
                description: "Vui lòng nhập tổng sản lượng thu hoạch hợp lệ (> 0 kg).",
                variant: "destructive",
            });
            return;
        }

        const price = parseFloat(formPrice);
        if (isNaN(price) || price <= 0) {
            toast({
                title: "Lỗi nhập liệu",
                description: "Vui lòng nhập giá bán hợp lệ (> 0 đ/kg).",
                variant: "destructive",
            });
            return;
        }

        if (!formSeasonId) {
            toast({
                title: "Lỗi nhập liệu",
                description: "Vui lòng chọn niên vụ thu hoạch.",
                variant: "destructive",
            });
            return;
        }

        let buyerName = "";
        let buyerFacilityId: string | null = null;
        if (buyerMode === "FACILITY") {
            const fac = facilities.find(f => f.id === formFacilityId);
            if (!fac) {
                toast({
                    title: "Lỗi nhập liệu",
                    description: "Vui lòng chọn cơ sở đối tác thu mua.",
                    variant: "destructive",
                });
                return;
            }
            buyerName = fac.name;
            buyerFacilityId = fac.id;
        } else {
            buyerName = formBuyerName.trim();
            if (!buyerName) {
                toast({
                    title: "Lỗi nhập liệu",
                    description: "Vui lòng nhập tên bên mua.",
                    variant: "destructive",
                });
                return;
            }
        }

        setFormBusy(true);
        try {
            const isEditing = Boolean(editingItem);
            const url = isEditing ? `/api/harvests/${editingItem!.id}` : "/api/harvests";
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cropSeasonId: formSeasonId,
                    actualWeight: weight,
                    pricePerKg: price,
                    buyerName,
                    buyerFacilityId,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.message || "Không thể lưu hồ sơ thu hoạch.");
            }

            const savedRecord: HarvestRow = data.data;

            if (isEditing) {
                setRows(prev => prev.map(item => (item.id === savedRecord.id ? savedRecord : item)));
                toast({
                    title: "Thành công",
                    description: "Đã cập nhật hồ sơ thu hoạch.",
                    variant: "success",
                });
            } else {
                setRows(prev => [savedRecord, ...prev]);
                toast({
                    title: "Thành công",
                    description: "Đã thêm hồ sơ thu hoạch mới.",
                    variant: "success",
                });
            }

            setModalOpen(false);
        } catch (error) {
            toast({
                title: "Thao tác thất bại",
                description: error instanceof Error ? error.message : "Đã có lỗi xảy ra.",
                variant: "destructive",
            });
        } finally {
            setFormBusy(false);
        }
    }

    // Confirm Delete
    async function handleConfirmDelete() {
        if (!deletingItem) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/harvests/${deletingItem.id}`, {
                method: "DELETE",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.message || "Không thể xóa hồ sơ thu hoạch.");
            }

            setRows(prev => prev.filter(r => r.id !== deletingItem.id));
            toast({
                title: "Đã xóa",
                description: "Hồ sơ thu hoạch đã được xóa thành công.",
                variant: "success",
            });
            setDeletingItem(null);
        } catch (error) {
            toast({
                title: "Không thể xóa",
                description: error instanceof Error ? error.message : "Đã có lỗi xảy ra.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                            HỒ SƠ THU HOẠCH
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            Theo dõi sản lượng thu hoạch và kết quả bán ra theo từng niên vụ.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        {/* Search input */}
                        <div className="relative min-w-[180px] flex-1 sm:w-60 sm:flex-initial">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm..."
                                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Season filter */}
                        <div className="relative min-w-[160px]">
                            <select
                                value={selectedSeasonFilter}
                                onChange={e => setSelectedSeasonFilter(e.target.value)}
                                className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 pr-8 text-xs sm:text-sm font-medium text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer"
                            >
                                <option value="ALL">Tất cả niên vụ</option>
                                {seasons.map(s => {
                                    const clean = formatSeasonName(s);
                                    return (
                                        <option key={s.id} value={s.id}>
                                            {clean}
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>

                        {/* Add Button */}
                        <Button
                            onClick={openCreateModal}
                            className="h-10 rounded-2xl bg-brand-600 px-4 font-bold text-white shadow-soft hover:bg-brand-700 transition flex items-center gap-1.5 shrink-0 text-xs sm:text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Thêm hồ sơ</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Bảng danh sách chính */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600">
                                <th className="py-4 pl-6 pr-4">Niên vụ</th>
                                <th className="px-4 py-4">Tổng sản lượng</th>
                                <th className="px-4 py-4">Bên mua</th>
                                <th className="px-4 py-4">Giá bán</th>
                                <th className="px-4 py-4">Thành tiền</th>
                                <th className="py-4 pl-4 pr-6 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredRows.map(row => {
                                const weight = Number(row.actualWeight ?? row.expectedWeight ?? 0);
                                const price = Number(row.expectedPricePerKg ?? 0);
                                const buyer = getBuyerName(row);
                                const seasonName = row.cropSeason ? formatSeasonName(row.cropSeason) : "Chưa xác định";

                                return (
                                    <tr key={row.id} className="transition hover:bg-slate-50/60">
                                        {/* Niên vụ */}
                                        <td className="py-4 pl-6 pr-4 font-bold text-slate-900 whitespace-nowrap">
                                            {seasonName}
                                        </td>

                                        {/* Tổng sản lượng */}
                                        <td className="px-4 py-4 font-semibold text-slate-800 whitespace-nowrap">
                                            {formatKg(weight)}
                                        </td>

                                        {/* Bên mua */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="font-medium text-slate-900">{buyer}</span>
                                            </div>
                                        </td>

                                        {/* Giá bán */}
                                        <td className="px-4 py-4 text-slate-700 whitespace-nowrap">
                                            {formatPricePerKg(price)}
                                        </td>

                                        {/* Thành tiền */}
                                        <td className="px-4 py-4 font-black text-emerald-700 whitespace-nowrap text-base">
                                            {formatTotal(weight, price)}
                                        </td>

                                        {/* Thao tác */}
                                        <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditModal(row)}
                                                    className="h-8 rounded-xl px-2.5 text-xs font-bold text-brand-700 hover:bg-brand-50 hover:text-brand-800 transition"
                                                    title="Sửa hồ sơ"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 mr-1" />
                                                    Sửa
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDeleteModal(row)}
                                                    className="h-8 rounded-xl px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
                                                    title="Xóa hồ sơ"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                    Xóa
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredRows.length === 0 && (
                    <div className="py-16 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Wheat className="h-6 w-6" />
                        </div>
                        <p className="text-base font-bold text-slate-700">Chưa có hồ sơ thu hoạch nào</p>
                        <p className="mt-1 text-xs text-slate-500">
                            {searchQuery || selectedSeasonFilter !== "ALL"
                                ? "Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại."
                                : "Bấm vào nút “Thêm hồ sơ” ở phía trên để ghi nhận kết quả thu hoạch."}
                        </p>
                    </div>
                )}

                {/* Table Footer Summary */}
                {filteredRows.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
                        <div className="text-slate-500 font-medium">
                            Hiển thị <span className="font-bold text-slate-900">{summary.count}</span> hồ sơ thu hoạch
                        </div>
                        <div className="flex flex-wrap items-center gap-4 font-semibold text-slate-700">
                            <div>
                                Tổng sản lượng: <span className="font-bold text-slate-900">{summary.totalWeight.toLocaleString("vi-VN")} kg</span>
                            </div>
                            <div>
                                Tổng doanh thu: <span className="font-black text-emerald-700 text-sm sm:text-base">{summary.totalMoney.toLocaleString("vi-VN")} đ</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: THÊM / SỬA HỒ SƠ THU HOẠCH */}
            {modalOpen &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                        onMouseDown={e => {
                            if (e.target === e.currentTarget && !formBusy) setModalOpen(false);
                        }}
                    >
                        <div className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95 duration-150">
                            {/* Modal Header */}
                            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                                        Hồ sơ thu hoạch
                                    </span>
                                    <h2 className="mt-1 text-xl font-black text-slate-900">
                                        {editingItem ? "Chỉnh sửa hồ sơ thu hoạch" : "Thêm hồ sơ thu hoạch mới"}
                                    </h2>
                                </div>
                                <button
                                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                    onClick={() => !formBusy && setModalOpen(false)}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleSaveForm} className="space-y-4">
                                {/* 1. Niên vụ * */}
                                <div>
                                    <Label htmlFor="seasonSelect" className="text-xs font-bold uppercase text-slate-600">
                                        Niên vụ <span className="text-rose-500">*</span>
                                    </Label>
                                    <div className="relative mt-1">
                                        <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-600" />
                                        <select
                                            id="seasonSelect"
                                            value={formSeasonId}
                                            onChange={e => setFormSeasonId(e.target.value)}
                                            required
                                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        >
                                            {seasons.map(s => {
                                                const clean = formatSeasonName(s);
                                                return (
                                                    <option key={s.id} value={s.id}>
                                                        {clean}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>

                                {/* 2. Tổng sản lượng thu hoạch * */}
                                <div>
                                    <Label htmlFor="actualWeightInput" className="text-xs font-bold uppercase text-slate-600">
                                        Tổng sản lượng thu hoạch (kg) <span className="text-rose-500">*</span>
                                    </Label>
                                    <div className="relative mt-1">
                                        <Scale className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-600" />
                                        <Input
                                            id="actualWeightInput"
                                            type="number"
                                            min="1"
                                            step="any"
                                            placeholder="Ví dụ: 12500"
                                            value={formWeight}
                                            onChange={e => setFormWeight(e.target.value)}
                                            className="h-11 rounded-2xl pl-9 text-sm font-semibold text-slate-900"
                                            required
                                            autoFocus={!editingItem}
                                        />
                                        <span className="pointer-events-none absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                                            kg
                                        </span>
                                    </div>
                                </div>

                                {/* 3. Bên mua * */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase text-slate-600">
                                            Bên mua <span className="text-rose-500">*</span>
                                        </Label>
                                        <div className="flex items-center gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setBuyerMode("FACILITY")}
                                                className={`rounded-lg px-2 py-0.5 font-bold transition ${
                                                    buyerMode === "FACILITY"
                                                        ? "bg-brand-100 text-brand-800"
                                                        : "text-slate-500 hover:text-slate-800"
                                                }`}
                                            >
                                                Cơ sở đối tác
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => setBuyerMode("CUSTOM")}
                                                className={`rounded-lg px-2 py-0.5 font-bold transition ${
                                                    buyerMode === "CUSTOM"
                                                        ? "bg-brand-100 text-brand-800"
                                                        : "text-slate-500 hover:text-slate-800"
                                                }`}
                                            >
                                                Tự nhập tên
                                            </button>
                                        </div>
                                    </div>

                                    {buyerMode === "FACILITY" && (
                                        <div className="relative">
                                            <Building2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-600" />
                                            <select
                                                value={formFacilityId}
                                                onChange={e => setFormFacilityId(e.target.value)}
                                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                            >
                                                {facilities.map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.name} ({f.type === "COLLECTOR" ? "Vựa thu mua" : "Cơ sở chế biến"})
                                                    </option>
                                                ))}
                                                {facilities.length === 0 && (
                                                    <option value="">Chưa có đối tác trong hệ thống</option>
                                                )}
                                            </select>
                                        </div>
                                    )}

                                    {buyerMode === "CUSTOM" && (
                                        <div className="space-y-1.5">
                                            <div className="relative">
                                                <Building2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-600" />
                                                <Input
                                                    type="text"
                                                    placeholder="Nhập tên vựa, thương lái, cơ sở..."
                                                    value={formBuyerName}
                                                    onChange={e => setFormBuyerName(e.target.value)}
                                                    className="h-11 rounded-2xl pl-9 text-sm font-semibold text-slate-900"
                                                    required={buyerMode === "CUSTOM"}
                                                />
                                            </div>
                                            {/* Quick suggestion chips */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[11px] text-slate-400">Gợi ý nhanh:</span>
                                                {["Vựa Minh Phát", "Cơ sở chế biến A", "Vựa Thành Công"].map(chip => (
                                                    <button
                                                        key={chip}
                                                        type="button"
                                                        onClick={() => setFormBuyerName(chip)}
                                                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition"
                                                    >
                                                        {chip}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Giá bán * */}
                                <div>
                                    <Label htmlFor="priceInput" className="text-xs font-bold uppercase text-slate-600">
                                        Giá bán (đ/kg) <span className="text-rose-500">*</span>
                                    </Label>
                                    <div className="relative mt-1">
                                        <DollarSign className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-600" />
                                        <Input
                                            id="priceInput"
                                            type="number"
                                            min="0"
                                            step="1000"
                                            placeholder="Ví dụ: 78000"
                                            value={formPrice}
                                            onChange={e => setFormPrice(e.target.value)}
                                            className="h-11 rounded-2xl pl-9 text-sm font-semibold text-slate-900"
                                            required
                                        />
                                        <span className="pointer-events-none absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                                            đ/kg
                                        </span>
                                    </div>
                                </div>

                                {/* 5. Thành tiền (Tự tính, Read-only) */}
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                            Thành tiền (Doanh thu)
                                        </span>
                                        <span className="text-[11px] font-medium text-emerald-600">
                                            Tự động tính
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-baseline justify-between">
                                        <div className="text-xs text-slate-500">
                                            {parseFloat(formWeight) > 0 && parseFloat(formPrice) > 0 ? (
                                                <span>
                                                    {Number(formWeight).toLocaleString("vi-VN")} kg × {Number(formPrice).toLocaleString("vi-VN")} đ
                                                </span>
                                            ) : (
                                                <span>Nhập sản lượng và giá bán để tính</span>
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-emerald-700">
                                            {computedTotalAmount.toLocaleString("vi-VN")} đ
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex gap-3 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 h-11 rounded-2xl font-semibold text-slate-700"
                                        disabled={formBusy}
                                        onClick={() => setModalOpen(false)}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={formBusy}
                                        className="flex-1 h-11 rounded-2xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft transition"
                                    >
                                        {formBusy ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Lưu hồ sơ"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body,
                )}

            {/* MODAL: XÁC NHẬN XÓA */}
            {deletingItem &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                        onMouseDown={e => {
                            if (e.target === e.currentTarget && !isDeleting) setDeletingItem(null);
                        }}
                    >
                        <div className="my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    Xác nhận xóa hồ sơ thu hoạch
                                </h3>
                                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Bạn có chắc chắn muốn xóa hồ sơ thu hoạch niên vụ{" "}
                                    <b className="text-slate-900">{deletingItem.cropSeason?.name || "này"}</b> với bên mua{" "}
                                    <b className="text-slate-900">{getBuyerName(deletingItem)}</b>?
                                    <br />
                                    Dữ liệu doanh thu của hồ sơ này sẽ được cập nhật lại trong thống kê tài chính.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-11 rounded-2xl font-semibold text-slate-700"
                                    disabled={isDeleting}
                                    onClick={() => setDeletingItem(null)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={handleConfirmDelete}
                                    className="flex-1 h-11 rounded-2xl bg-rose-600 font-bold text-white hover:bg-rose-700 shadow-soft transition"
                                >
                                    {isDeleting ? "Đang xóa..." : "Xóa hồ sơ"}
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
