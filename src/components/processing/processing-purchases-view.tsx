'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    FileText,
    Boxes,
    Phone,
    MapPin,
    ArrowRight,
    CircleDollarSign,
    Layers,
} from "lucide-react";
import { useProcessingWorkflow } from "@/hooks/use-processing-workflow";
import { PurchaseRecord, generatePurchaseCode } from "@/lib/processing-workflow";
import { useToast } from "@/components/ui/toast";
import { ModalPortal } from "@/components/ui/modal-portal";

const COMMON_PUC_CODES = [
    { code: "75-PUC-SR-00001-CHN", name: "Vườn Bác Ba - Trảng Bom, Đồng Nai" },
    { code: "67-PUC-SR-00002-CHN", name: "Vườn Hoàng Long - Đắk R'lấp, Đắk Nông" },
    { code: "82-PUC-SR-00001-CHN", name: "Vườn Chú Năm - Cai Lậy, Tiền Giang" },
    { code: "77-PUC-SR-00003-CHN", name: "Nông trại Hải Đăng - Tân Hưng, BR-VT" },
    { code: "66-PUC-SR-00004-CHN", name: "Hợp tác xã Krông Pắc - Đắk Lắk" },
];

export function ProcessingPurchasesView() {
    const { state, isLoaded, addPurchase, updatePurchase, deletePurchase } = useProcessingWorkflow();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [varietyFilter, setVarietyFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form state for creating
    const [cropSeason, setCropSeason] = useState("2025-2026");
    const [purchaseDate, setPurchaseDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
    const nextAutoCode = useMemo(() => generatePurchaseCode(state.purchases, purchaseDate), [state.purchases, purchaseDate]);
    const [sellerName, setSellerName] = useState("");
    const [sellerPhone, setSellerPhone] = useState("");
    const [sellerAddress, setSellerAddress] = useState("");
    const [durianVariety, setDurianVariety] = useState<"Ri6" | "Monthong" | "Khác">("Ri6");
    const [weightKg, setWeightKg] = useState<number | "">("");
    const [pricePerKg, setPricePerKg] = useState<number | "">("");
    const [farmName, setFarmName] = useState("");
    const [pucCode, setPucCode] = useState("75-PUC-SR-00001-CHN");
    const [customPuc, setCustomPuc] = useState("");
    const [notes, setNotes] = useState("");
    const [formError, setFormError] = useState("");

    // Calculated auto amount
    const totalAmount = useMemo(() => {
        const w = typeof weightKg === "number" ? weightKg : 0;
        const p = typeof pricePerKg === "number" ? pricePerKg : 0;
        return w * p;
    }, [weightKg, pricePerKg]);

    // Filter purchases
    const filteredPurchases = useMemo(() => {
        return state.purchases.filter((p) => {
            const matchesSearch =
                p.purchaseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sellerPhone.includes(searchTerm) ||
                p.farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.pucCode.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesVariety = varietyFilter === "ALL" || p.durianVariety === varietyFilter;
            const matchesStatus = statusFilter === "ALL" || p.gradingStatus === statusFilter;

            return matchesSearch && matchesVariety && matchesStatus;
        });
    }, [state.purchases, searchTerm, varietyFilter, statusFilter]);

    const handleOpenCreate = () => {
        setCropSeason("2025-2026");
        setPurchaseDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
        setSellerName("");
        setSellerPhone("");
        setSellerAddress("");
        setDurianVariety("Ri6");
        setWeightKg("");
        setPricePerKg("");
        setFarmName("");
        setPucCode("75-PUC-SR-00001-CHN");
        setCustomPuc("");
        setNotes("");
        setFormError("");
        setIsCreateOpen(true);
    };

    const handleSaveCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!sellerName.trim()) {
            setFormError("Vui lòng nhập họ tên bên bán");
            return;
        }
        if (!sellerPhone.trim()) {
            setFormError("Vui lòng nhập số điện thoại bên bán");
            return;
        }
        const finalWeight = Number(weightKg);
        if (isNaN(finalWeight) || finalWeight <= 0) {
            setFormError("Khối lượng thu mua phải lớn hơn 0");
            return;
        }
        const finalPrice = Number(pricePerKg);
        if (isNaN(finalPrice) || finalPrice <= 0) {
            setFormError("Giá mua phải lớn hơn 0");
            return;
        }
        if (!farmName.trim()) {
            setFormError("Vui lòng nhập tên vườn trồng / hộ dân");
            return;
        }
        const finalPuc = pucCode === "OTHER" ? customPuc.trim() : pucCode.trim();
        if (!finalPuc) {
            setFormError("Mã vùng trồng (PUC) là bắt buộc");
            return;
        }

        try {
            const record = addPurchase({
                cropSeason,
                purchaseDate,
                sellerName: sellerName.trim(),
                sellerPhone: sellerPhone.trim(),
                sellerAddress: sellerAddress.trim(),
                durianVariety,
                weightKg: finalWeight,
                pricePerKg: finalPrice,
                farmName: farmName.trim(),
                pucCode: finalPuc,
                notes: notes.trim() || undefined,
            });

            toast({
                title: "Đã lưu Hồ sơ thu mua!",
                description: `Tạo lô ${record.purchaseCode}, tự động sinh Lô chờ phân loại (${record.weightKg.toLocaleString("vi-VN")} kg) và Khoản phải trả trong Tài chính!`,
                variant: "success",
            });

            setIsCreateOpen(false);
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
        }
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPurchase) return;

        updatePurchase(editingPurchase.id, {
            sellerName: editingPurchase.sellerName,
            sellerPhone: editingPurchase.sellerPhone,
            sellerAddress: editingPurchase.sellerAddress,
            weightKg: Number(editingPurchase.weightKg),
            pricePerKg: Number(editingPurchase.pricePerKg),
            farmName: editingPurchase.farmName,
            pucCode: editingPurchase.pucCode,
            notes: editingPurchase.notes,
        });

        toast({
            title: "Cập nhật thành công!",
            description: `Đã lưu các thay đổi của lô ${editingPurchase.purchaseCode}`,
            variant: "success",
        });

        setEditingPurchase(null);
    };

    const handleConfirmDelete = () => {
        if (!deletingId) return;
        deletePurchase(deletingId);
        toast({
            title: "Đã xóa lô thu mua",
            description: "Đã xóa lô thu mua và đồng bộ khoản phải trả liên quan",
            variant: "default",
        });
        setDeletingId(null);
    };

    if (!isLoaded) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span>Đang tải hồ sơ thu mua...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Sổ thu mua</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Nơi dữ liệu bắt đầu đi vào hệ thống. Mỗi lô thu mua sẽ tự động tạo Lô chờ phân loại và Khoản phải trả trong module Tài chính.
                </p>
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Tổng số lô thu mua</span>
                    <p className="mt-1 text-2xl font-black text-slate-900">{state.purchases.length} lô</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Tổng khối lượng thu mua</span>
                    <p className="mt-1 text-2xl font-black text-blue-600">
                        {state.purchases.reduce((s, p) => s + p.weightKg, 0).toLocaleString("vi-VN")} kg
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Tổng giá trị thu mua</span>
                    <p className="mt-1 text-2xl font-black text-emerald-700">
                        {state.purchases.reduce((s, p) => s + p.totalAmount, 0).toLocaleString("vi-VN")} đ
                    </p>
                </div>
            </div>

            {/* Action row right below 3 stat cards */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">Danh sách hồ sơ thu mua</h2>
                    <p className="text-xs text-slate-500">Quản lý và theo dõi các lô nguyên liệu thu mua vào cơ sở</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 whitespace-nowrap shrink-0"
                >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Thêm hồ sơ thu mua</span>
                </button>
            </div>

            {/* Filters and search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo mã số lô, bên bán, số ĐT, vườn trồng..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span>Giống:</span>
                        <select
                            value={varietyFilter}
                            onChange={(e) => setVarietyFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="ALL">Tất cả giống</option>
                            <option value="Ri6">Ri6</option>
                            <option value="Monthong">Monthong</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span>Trạng thái:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="PENDING">Chờ phân loại</option>
                            <option value="COMPLETED">Đã phân loại</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-4 whitespace-nowrap">Mã lô TM</th>
                                <th className="px-5 py-4 whitespace-nowrap">Ngày thu mua</th>
                                <th className="px-5 py-4 whitespace-nowrap">Bên bán</th>
                                <th className="px-5 py-4 whitespace-nowrap">Khối lượng (kg)</th>
                                <th className="px-5 py-4 whitespace-nowrap">Giá mua (đ/kg)</th>
                                <th className="px-5 py-4 whitespace-nowrap">Thành tiền (đ)</th>
                                <th className="px-5 py-4 whitespace-nowrap">Trạng thái</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                                        Không tìm thấy hồ sơ thu mua nào phù hợp
                                    </td>
                                </tr>
                            ) : (
                                filteredPurchases.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-5 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                            {p.purchaseCode}
                                        </td>
                                        <td className="px-5 py-4 font-medium text-slate-700 whitespace-nowrap">{p.purchaseDate}</td>
                                        <td className="px-5 py-4 min-w-[150px]">
                                            <div className="font-bold text-slate-900 whitespace-nowrap">{p.sellerName}</div>
                                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                                                <Phone className="h-3 w-3 shrink-0" /> {p.sellerPhone}
                                            </div>
                                            {p.farmName && (
                                                <div className="mt-1 text-xs text-slate-600 font-medium whitespace-nowrap">
                                                    {p.farmName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                            {p.weightKg.toLocaleString("vi-VN")}
                                            <span className="block text-[11px] font-normal text-slate-400 whitespace-nowrap">Giống {p.durianVariety}</span>
                                        </td>
                                        <td className="px-5 py-4 font-mono text-slate-700 whitespace-nowrap">
                                            {p.pricePerKg.toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-5 py-4 font-mono font-black text-emerald-800 whitespace-nowrap">
                                            {p.totalAmount.toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            {p.gradingStatus === "PENDING" ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 whitespace-nowrap">
                                                    <Clock className="h-3 w-3 shrink-0" />
                                                    <span className="whitespace-nowrap">Chờ phân loại</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 whitespace-nowrap">
                                                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                    <span className="whitespace-nowrap">Đã phân loại</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                                <button
                                                    onClick={() => setEditingPurchase({ ...p })}
                                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition whitespace-nowrap shrink-0"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5 shrink-0" />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(p.id)}
                                                    className="inline-flex items-center justify-center rounded-xl border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 transition whitespace-nowrap shrink-0"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Thêm hồ sơ thu mua */}
            {isCreateOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">Thêm hồ sơ thu mua mới</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Mã lô sẽ tự động sinh và tự động tạo Lô chờ phân loại & Khoản phải trả trong Tài chính.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {formError && (
                                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <form onSubmit={handleSaveCreate} className="mt-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Niên vụ</label>
                                        <select
                                            value={cropSeason}
                                            onChange={(e) => setCropSeason(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                                        >
                                            <option value="2025-2026">2025-2026</option>
                                            <option value="2024-2025">2024-2025</option>
                                            <option value="2026-2027">2026-2027</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Mã lô TM (Tự sinh)</label>
                                        <input
                                            type="text"
                                            value={nextAutoCode}
                                            readOnly
                                            className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm font-mono font-bold text-emerald-800 cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Ngày thu mua</label>
                                        <input
                                            type="date"
                                            value={purchaseDate}
                                            onChange={(e) => setPurchaseDate(e.target.value)}
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Bên bán (Họ và tên) *</label>
                                        <input
                                            type="text"
                                            value={sellerName}
                                            onChange={(e) => setSellerName(e.target.value)}
                                            placeholder="VD: Nguyễn Văn Nam"
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Số điện thoại *</label>
                                        <input
                                            type="tel"
                                            value={sellerPhone}
                                            onChange={(e) => setSellerPhone(e.target.value)}
                                            placeholder="VD: 0912345678"
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Địa chỉ bên bán</label>
                                    <input
                                        type="text"
                                        value={sellerAddress}
                                        onChange={(e) => setSellerAddress(e.target.value)}
                                        placeholder="VD: Ấp 3, Xã Bình Lộc, TP. Long Khánh, Đồng Nai"
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Giống sầu riêng *</label>
                                        <select
                                            value={durianVariety}
                                            onChange={(e) => setDurianVariety(e.target.value as "Ri6" | "Monthong" | "Khác")}
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                                        >
                                            <option value="Ri6">Ri6</option>
                                            <option value="Monthong">Monthong</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Khối lượng (kg) *</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={weightKg}
                                            onChange={(e) => setWeightKg(e.target.value === "" ? "" : Number(e.target.value))}
                                            placeholder="VD: 5000"
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Giá mua (đ/kg) *</label>
                                        <input
                                            type="number"
                                            step="1000"
                                            value={pricePerKg}
                                            onChange={(e) => setPricePerKg(e.target.value === "" ? "" : Number(e.target.value))}
                                            placeholder="VD: 85000"
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Thành tiền tự động tính, không cho sửa tay */}
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                                Thành tiền (đ)
                                            </span>
                                            <p className="text-[11px] text-emerald-700 mt-0.5">
                                                Tự động tính = Khối lượng × Giá mua (không cho sửa tay)
                                            </p>
                                        </div>
                                        <span className="text-xl sm:text-2xl font-mono font-black text-emerald-900">
                                            {totalAmount.toLocaleString("vi-VN")} đ
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Vườn trồng / Hộ dân *</label>
                                        <input
                                            type="text"
                                            value={farmName}
                                            onChange={(e) => setFarmName(e.target.value)}
                                            placeholder="VD: Vườn Bác Ba"
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Mã vùng trồng (PUC) *</label>
                                        <select
                                            value={pucCode}
                                            onChange={(e) => setPucCode(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                                        >
                                            {COMMON_PUC_CODES.map((p) => (
                                                <option key={p.code} value={p.code}>
                                                    {p.code} - {p.name}
                                                </option>
                                            ))}
                                            <option value="OTHER">Nhập mã PUC khác...</option>
                                        </select>
                                        {pucCode === "OTHER" && (
                                            <input
                                                type="text"
                                                value={customPuc}
                                                onChange={(e) => setCustomPuc(e.target.value)}
                                                placeholder="VD: 75-PUC-SR-00005-CHN"
                                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ghi chú</label>
                                    <textarea
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Nhập ghi chú đặc điểm lô hàng, độ chín, màu cơm..."
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                                    <span>
                                        Khi bấm Lưu, hệ thống sẽ đồng thời: (1) Lưu Hồ sơ thu mua; (2) Tự động sinh Lô chờ phân loại tương ứng; (3) Tạo 1 Khoản phải trả trong module Tài chính ở trạng thái Chưa thanh toán.
                                    </span>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition"
                                    >
                                        Lưu hồ sơ thu mua
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Modal: Chỉnh sửa hồ sơ thu mua */}
            {editingPurchase && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h2 className="text-xl font-black text-slate-900">
                                    Sửa hồ sơ thu mua ({editingPurchase.purchaseCode})
                                </h2>
                                <button
                                    onClick={() => setEditingPurchase(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="mt-6 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Bên bán</label>
                                        <input
                                            type="text"
                                            value={editingPurchase.sellerName}
                                            onChange={(e) => setEditingPurchase({ ...editingPurchase, sellerName: e.target.value })}
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Số điện thoại</label>
                                        <input
                                            type="tel"
                                            value={editingPurchase.sellerPhone}
                                            onChange={(e) => setEditingPurchase({ ...editingPurchase, sellerPhone: e.target.value })}
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Khối lượng (kg)</label>
                                        <input
                                            type="number"
                                            value={editingPurchase.weightKg}
                                            onChange={(e) => setEditingPurchase({ ...editingPurchase, weightKg: Number(e.target.value) })}
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-900"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Giá mua (đ/kg)</label>
                                        <input
                                            type="number"
                                            value={editingPurchase.pricePerKg}
                                            onChange={(e) => setEditingPurchase({ ...editingPurchase, pricePerKg: Number(e.target.value) })}
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-900"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 flex justify-between items-center">
                                    <span className="text-xs font-bold text-emerald-800">Thành tiền tự tính</span>
                                    <span className="font-mono font-black text-emerald-900">
                                        {(editingPurchase.weightKg * editingPurchase.pricePerKg).toLocaleString("vi-VN")} đ
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Vườn trồng / Hộ dân</label>
                                    <input
                                        type="text"
                                        value={editingPurchase.farmName}
                                        onChange={(e) => setEditingPurchase({ ...editingPurchase, farmName: e.target.value })}
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Mã vùng trồng (PUC)</label>
                                    <input
                                        type="text"
                                        value={editingPurchase.pucCode}
                                        onChange={(e) => setEditingPurchase({ ...editingPurchase, pucCode: e.target.value })}
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setEditingPurchase(null)}
                                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                                    >
                                        Lưu thay đổi
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Modal: Xác nhận xóa */}
            {deletingId && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                            <h3 className="text-lg font-black text-slate-900">Xác nhận xóa lô thu mua?</h3>
                            <p className="mt-2 text-xs text-slate-500">
                                Thao tác này sẽ xóa lô thu mua và hủy bỏ khoản phải trả tương ứng trong module Tài chính.
                            </p>
                            <div className="mt-6 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setDeletingId(null)}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                                >
                                    Xóa vĩnh viễn
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
