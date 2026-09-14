'use client';

import { useState, useMemo } from "react";
import {
    Boxes,
    Sparkles,
    Layers,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    X,
    ChevronRight,
    Scale,
    Tag,
    Phone,
} from "lucide-react";
import { useProcessingWorkflow } from "@/hooks/use-processing-workflow";
import { PurchaseRecord, generateGradingCode } from "@/lib/processing-workflow";
import { useToast } from "@/components/ui/toast";
import { ModalPortal } from "@/components/ui/modal-portal";

export function ProcessingGradingView() {
    const { state, isLoaded, performGrading } = useProcessingWorkflow();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<"pending" | "fresh" | "processed">("pending");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal state
    const [gradingPurchase, setGradingPurchase] = useState<PurchaseRecord | null>(null);

    // Form states for grading modal
    const [gradingDate, setGradingDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
    const [freshWeightInput, setFreshWeightInput] = useState<number | "">("");
    const [processedWeightInput, setProcessedWeightInput] = useState<number | "">("");
    const [notes, setNotes] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Pending list (purchases with gradingStatus === "PENDING")
    const pendingPurchases = useMemo(() => {
        return state.purchases.filter((p) => p.gradingStatus === "PENDING");
    }, [state.purchases]);

    // Graded lists
    const freshGradings = useMemo(() => {
        return state.gradings.filter((g) => g.freshWeight > 0);
    }, [state.gradings]);

    const processedGradings = useMemo(() => {
        return state.gradings.filter((g) => g.processedWeight > 0);
    }, [state.gradings]);

    // Calculations inside Modal
    const totalLotWeight = gradingPurchase ? gradingPurchase.weightKg : 0;
    const currentFreshWeight = typeof freshWeightInput === "number" ? freshWeightInput : 0;
    const currentProcessedWeight = typeof processedWeightInput === "number" ? processedWeightInput : 0;
    const sumInput = currentFreshWeight + currentProcessedWeight;
    const difference = Math.round((sumInput - totalLotWeight) * 100) / 100;
    const isBalanced = Math.abs(difference) < 0.001 && sumInput > 0;

    const handleOpenGradingModal = (purchase: PurchaseRecord) => {
        setGradingPurchase(purchase);
        setGradingDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
        setFreshWeightInput("");
        setProcessedWeightInput("");
        setNotes("");
        setErrorMessage("");
    };

    const handleSaveGrading = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");

        if (!gradingPurchase) return;
        if (!isBalanced) {
            setErrorMessage(
                `Tổng khối lượng phân loại (${sumInput.toLocaleString("vi-VN")} kg) phải khớp hoàn toàn với khối lượng lô thu mua (${totalLotWeight.toLocaleString("vi-VN")} kg)!`
            );
            return;
        }

        try {
            const newGrading = performGrading({
                purchaseId: gradingPurchase.id,
                freshWeight: currentFreshWeight,
                processedWeight: currentProcessedWeight,
                gradingDate,
                notes: notes.trim() || undefined,
            });

            toast({
                title: "Phân loại thành công!",
                description: `Đã phân lô ${newGrading.gradingCode}: ${currentFreshWeight.toLocaleString("vi-VN")} kg Trái tươi và ${currentProcessedWeight.toLocaleString("vi-VN")} kg Chế biến khác!`,
                variant: "success",
            });

            setGradingPurchase(null);
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu");
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span>Đang nạp dữ liệu phân loại...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Phân loại nguyên liệu</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tại cơ sở chỉ có 2 hướng phân loại: <strong>Trái tươi</strong> (đủ chuẩn xuất trái tươi, chuyển sang đóng gói) và <strong>Chế biến khác</strong> (đưa vào bóc múi cấp đông, sấy...).
                </p>
            </div>

            {/* SECTION 4.1: Danh sách chờ phân loại */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">

                        <div>
                            <h2 className="text-lg font-black text-slate-900">Danh sách chờ phân loại</h2>
                            <p className="text-xs text-slate-500">
                                Các lô sầu riêng thu mua vừa nhập bãi, cần thực hiện phân loại khối lượng 2 nhánh
                            </p>
                        </div>
                    </div>
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800 whitespace-nowrap">
                        {pendingPurchases.length} lô đang chờ
                    </span>
                </div>

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
                                <th className="px-5 py-4 text-center whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendingPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                        Hiện không có lô nào chờ phân loại. Mọi lô thu mua đều đã được phân loại đầy đủ!
                                    </td>
                                </tr>
                            ) : (
                                pendingPurchases.map((p) => (
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
                                        <td className="px-5 py-4 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => handleOpenGradingModal(p)}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition whitespace-nowrap"
                                            >
                                                <Scale className="h-3.5 w-3.5 shrink-0" />
                                                <span className="whitespace-nowrap">Phân loại</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* SECTION 4.2: Danh sách đã phân loại */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Danh sách đã phân loại</h2>
                        <p className="text-xs text-slate-500">
                            Kết quả phân loại tự động chuyển tới trang Chế biến & Đóng gói
                        </p>
                    </div>

                    {/* 2 Tabs: [ Trái tươi ] | [ Chế biến khác ] */}
                    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                        <button
                            onClick={() => setActiveTab("fresh")}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${activeTab === "fresh"
                                ? "bg-white text-emerald-800 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                        >
                            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="whitespace-nowrap">Trái tươi ({freshGradings.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("processed")}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${activeTab === "processed"
                                ? "bg-white text-amber-800 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                        >
                            <Layers className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <span className="whitespace-nowrap">Chế biến khác ({processedGradings.length})</span>
                        </button>
                    </div>
                </div>

                {/* Tab Content: Trái tươi */}
                {activeTab === "fresh" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-emerald-50/60 text-xs font-bold uppercase tracking-wider text-emerald-900 border-b border-emerald-100">
                                <tr>
                                    <th className="px-5 py-4 whitespace-nowrap">Mã lô PL</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Mã lô TM gốc</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Khối lượng (kg)</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Ngày phân loại</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {freshGradings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                                            Chưa có lô phân loại trái tươi nào
                                        </td>
                                    </tr>
                                ) : (
                                    freshGradings.map((g) => (
                                        <tr key={g.id} className="hover:bg-slate-50/60 transition">
                                            <td className="px-5 py-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                                                {g.gradingCode}
                                            </td>
                                            <td className="px-5 py-4 font-mono text-slate-600 whitespace-nowrap">{g.purchaseCode}</td>
                                            <td className="px-5 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                {g.freshWeight.toLocaleString("vi-VN")}
                                                <span className="block text-[11px] font-normal text-slate-400 whitespace-nowrap">
                                                    Giống {g.durianVariety}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{g.gradingDate}</td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {g.freshStatus === "WAITING_PACKAGING" ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 whitespace-nowrap">
                                                        <Clock className="h-3 w-3 shrink-0" />
                                                        <span className="whitespace-nowrap">Chờ đóng gói</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 whitespace-nowrap">
                                                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                        <span className="whitespace-nowrap">Đã đóng gói</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab Content: Chế biến khác */}
                {activeTab === "processed" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-amber-50/60 text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-100">
                                <tr>
                                    <th className="px-5 py-4 whitespace-nowrap">Mã lô PL</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Mã lô TM gốc</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Khối lượng (kg)</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Ngày phân loại</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {processedGradings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                                            Chưa có lô phân loại chế biến khác nào
                                        </td>
                                    </tr>
                                ) : (
                                    processedGradings.map((g) => (
                                        <tr key={g.id} className="hover:bg-slate-50/60 transition">
                                            <td className="px-5 py-4 font-mono font-bold text-amber-800 whitespace-nowrap">
                                                {g.gradingCode}
                                            </td>
                                            <td className="px-5 py-4 font-mono text-slate-600 whitespace-nowrap">{g.purchaseCode}</td>
                                            <td className="px-5 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                {g.processedWeight.toLocaleString("vi-VN")}
                                                <span className="block text-[11px] font-normal text-slate-400 whitespace-nowrap">
                                                    Giống {g.durianVariety}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{g.gradingDate}</td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {g.processedStatus === "WAITING_PROCESSING" ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 whitespace-nowrap">
                                                        <Clock className="h-3 w-3 shrink-0" />
                                                        <span className="whitespace-nowrap">Chờ chế biến</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 whitespace-nowrap">
                                                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                        <span className="whitespace-nowrap">Đã chế biến</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Modal: Form Phân loại với Validation bắt buộc */}
            {gradingPurchase && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Phân loại lô {gradingPurchase.purchaseCode}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Bên bán: {gradingPurchase.sellerName} | Giống: {gradingPurchase.durianVariety}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setGradingPurchase(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {errorMessage && (
                                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <form onSubmit={handleSaveGrading} className="mt-5 space-y-4">
                                {/* Fixed info banner */}
                                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase">Mã lô TM (Cố định)</span>
                                        <p className="mt-0.5 font-mono font-bold text-slate-900">{gradingPurchase.purchaseCode}</p>
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng khối lượng lô (Cố định)</span>
                                        <p className="mt-0.5 font-mono font-black text-lg text-emerald-800">
                                            {gradingPurchase.weightKg.toLocaleString("vi-VN")} kg
                                        </p>
                                    </div>
                                </div>

                                {/* Date and Auto-Code Banner */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Ngày phân loại</label>
                                        <input
                                            type="date"
                                            value={gradingDate}
                                            onChange={(e) => setGradingDate(e.target.value)}
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Mã lô PL (Tự sinh)</label>
                                        <input
                                            type="text"
                                            value={generateGradingCode(state.gradings, gradingDate)}
                                            readOnly
                                            className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm font-mono font-bold text-emerald-800 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Two inputs: Trái tươi vs Chế biến khác */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                                        <label className="block text-xs font-black text-emerald-900 uppercase tracking-wider">
                                            1. Trái tươi (kg) *
                                        </label>
                                        <p className="text-[11px] text-emerald-700 mt-0.5">Đạt chuẩn đóng thùng xuất khẩu</p>
                                        <input
                                            type="number"
                                            step="any"
                                            value={freshWeightInput}
                                            onChange={(e) => {
                                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                                setFreshWeightInput(val);
                                            }}
                                            required
                                            placeholder="VD: 3500"
                                            className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-base font-mono font-bold text-emerald-950 focus:border-emerald-600 focus:outline-none"
                                        />
                                    </div>

                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                                        <label className="block text-xs font-black text-amber-900 uppercase tracking-wider">
                                            2. Chế biến khác (kg) *
                                        </label>
                                        <p className="text-[11px] text-amber-700 mt-0.5">Bóc múi cấp đông, sấy thăng hoa...</p>
                                        <input
                                            type="number"
                                            step="any"
                                            value={processedWeightInput}
                                            onChange={(e) => {
                                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                                setProcessedWeightInput(val);
                                            }}
                                            required
                                            placeholder="VD: 1500"
                                            className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-base font-mono font-bold text-amber-950 focus:border-amber-600 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Realtime Validation Banner */}
                                <div
                                    className={`rounded-2xl border p-4 transition ${isBalanced
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                        : sumInput === 0
                                            ? "border-slate-200 bg-slate-50 text-slate-700"
                                            : "border-rose-300 bg-rose-50 text-rose-900"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {isBalanced ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                            ) : sumInput === 0 ? (
                                                <Scale className="h-5 w-5 text-slate-400" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-rose-600" />
                                            )}
                                            <span className="text-xs font-bold uppercase">
                                                {isBalanced
                                                    ? "Cân đối 100% hợp lệ"
                                                    : sumInput === 0
                                                        ? "Chờ nhập khối lượng phân loại"
                                                        : "Chưa cân đối khối lượng"}
                                            </span>
                                        </div>
                                        <span className="font-mono font-bold text-sm">
                                            Tổng: {sumInput.toLocaleString("vi-VN")} / {totalLotWeight.toLocaleString("vi-VN")} kg
                                        </span>
                                    </div>

                                    {!isBalanced && (
                                        <p className={`mt-2 text-xs ${sumInput === 0 ? "text-slate-500" : "text-rose-700"}`}>
                                            {sumInput === 0
                                                ? `Vui lòng nhập khối lượng cho 2 mục bên trên sao cho tổng bằng ${totalLotWeight.toLocaleString("vi-VN")} kg.`
                                                : difference > 0
                                                    ? `Tổng đang thừa ${difference.toLocaleString("vi-VN")} kg so với khối lượng lô ban đầu.`
                                                    : `Tổng đang thiếu ${Math.abs(difference).toLocaleString("vi-VN")} kg so với khối lượng lô ban đầu.`}
                                            {" "}Bắt buộc: <strong>Trái tươi + Chế biến khác = Khối lượng lô thu mua</strong>.
                                        </p>
                                    )}

                                    {isBalanced && (
                                        <p className="mt-1 text-xs text-emerald-700">
                                            Khối lượng đã cân đối chính xác với lô thu mua. Sẵn sàng lưu vào hệ thống!
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ghi chú phân loại</label>
                                    <textarea
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Ghi chú thêm về lý do phân loại, chất lượng trái..."
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setGradingPurchase(null)}
                                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!isBalanced}
                                        className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition whitespace-nowrap shrink-0 ${isBalanced
                                            ? "bg-emerald-600 hover:bg-emerald-700"
                                            : "bg-slate-300 cursor-not-allowed text-slate-500"
                                            }`}
                                    >
                                        Hoàn tất phân loại
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
