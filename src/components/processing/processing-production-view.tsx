'use client';

import { useMemo, useState } from "react";
import {
    Boxes,
    Calendar,
    CheckCircle2,
    Clock,
    Factory,
    Layers,
    Loader2,
    Package,
    PackageCheck,
    Search,
    Truck,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export type FreshProductItem = {
    id: string;
    code: string;
    sourceRawCode?: string;
    farmName: string;
    inputWeight: number;
    outputWeight?: number;
    packagingDate?: string | Date | null;
    boxCount?: number;
    packagingSpec?: string;
    status: "PENDING_PACKAGING" | "IN_PROGRESS" | "COMPLETED" | "READY_FOR_EXPORT";
};

export type ProcessedBatchItem = {
    id: string;
    code: string;
    sourceRawCode: string;
    rawLotId: string;
    farmName: string;
    method: "PEELING" | "FREEZING" | "FURTHER_PROCESSING" | string;
    inputWeight: number;
    outputProduct?: string;
    outputWeight?: number;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
};

interface ProcessingProductionViewProps {
    initialFreshItems: FreshProductItem[];
    initialProcessedItems: ProcessedBatchItem[];
}

export function ProcessingProductionView({
    initialFreshItems,
    initialProcessedItems,
}: ProcessingProductionViewProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<"FRESH" | "PROCESSED">("FRESH");
    const [freshItems, setFreshItems] = useState<FreshProductItem[]>(initialFreshItems);
    const [processedItems, setProcessedItems] = useState<ProcessedBatchItem[]>(initialProcessedItems);

    // Fresh packaging drawer
    const [selectedFresh, setSelectedFresh] = useState<FreshProductItem | null>(null);
    const [freshOutputWeight, setFreshOutputWeight] = useState<number | string>("");
    const [freshBoxCount, setFreshBoxCount] = useState<number | string>("");
    const [freshPackagingSpec, setFreshPackagingSpec] = useState("Thùng 5-6 trái / 18kg");
    const [freshCompleteDate, setFreshCompleteDate] = useState(new Date().toISOString().slice(0, 10));
    const [submittingFresh, setSubmittingFresh] = useState(false);

    // Processing batch drawer
    const [selectedProc, setSelectedProc] = useState<ProcessedBatchItem | null>(null);
    const [procProductName, setProcProductName] = useState("Cơm sầu riêng bóc múi");
    const [procMethod, setProcMethod] = useState("Bóc múi / Tách múi");
    const [procOutputWeight, setProcOutputWeight] = useState<number | string>("");
    const [procDate, setProcDate] = useState(new Date().toISOString().slice(0, 10));
    const [procNote, setProcNote] = useState("");
    const [submittingProc, setSubmittingProc] = useState(false);

    const handleOpenFreshDrawer = (item: FreshProductItem) => {
        setSelectedFresh(item);
        setFreshOutputWeight(item.outputWeight || item.inputWeight);
        setFreshBoxCount(item.boxCount || Math.round(item.inputWeight / 18));
        setFreshPackagingSpec(item.packagingSpec || "Thùng 5-6 trái / 18kg");
        setFreshCompleteDate(new Date().toISOString().slice(0, 10));
    };

    const handleConfirmFreshPackaging = async () => {
        if (!selectedFresh) return;
        const outW = Number(freshOutputWeight);
        const boxes = Number(freshBoxCount);
        if (!outW || outW <= 0) {
            toast({ title: "Khối lượng không hợp lệ", description: "Vui lòng nhập khối lượng thành phẩm.", variant: "destructive" });
            return;
        }
        setSubmittingFresh(true);
        try {
            setFreshItems((prev) =>
                prev.map((item) =>
                    item.id === selectedFresh.id
                        ? {
                              ...item,
                              outputWeight: outW,
                              boxCount: boxes,
                              packagingSpec: freshPackagingSpec,
                              packagingDate: freshCompleteDate,
                              status: "READY_FOR_EXPORT",
                          }
                        : item
                )
            );
            toast({ title: "Đóng gói hoàn tất", description: `Lô ${selectedFresh.code} đã sẵn sàng xuất hàng.`, variant: "success" });
            setSelectedFresh(null);
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message || "Không thể lưu thông tin đóng gói.", variant: "destructive" });
        } finally {
            setSubmittingFresh(false);
        }
    };

    const handleOpenProcDrawer = (item: ProcessedBatchItem) => {
        setSelectedProc(item);
        setProcMethod(item.method || "Bóc múi / Tách múi");
        setProcProductName(item.outputProduct || "Cơm sầu riêng bóc múi");
        setProcOutputWeight(item.outputWeight || Math.round(item.inputWeight * 0.32));
        setProcDate(new Date().toISOString().slice(0, 10));
        setProcNote("");
    };

    const handleConfirmProcBatch = async () => {
        if (!selectedProc) return;
        const outW = Number(procOutputWeight);
        if (!outW || outW <= 0) {
            toast({ title: "Khối lượng không hợp lệ", description: "Vui lòng nhập khối lượng thành phẩm.", variant: "destructive" });
            return;
        }
        setSubmittingProc(true);
        try {
            const res = await fetch("/api/processing/production", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rawMaterialLotId: selectedProc.rawLotId,
                    inputWeight: selectedProc.inputWeight,
                    outputWeight: outW,
                    productName: procProductName,
                    method: procMethod,
                    manufacturedAt: procDate,
                    note: procNote,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Lỗi tạo mẻ chế biến.");

            setProcessedItems((prev) =>
                prev.map((item) =>
                    item.id === selectedProc.id
                        ? {
                              ...item,
                              outputProduct: procProductName,
                              outputWeight: outW,
                              method: procMethod,
                              status: "COMPLETED",
                          }
                        : item
                )
            );
            toast({ title: "Mẻ chế biến hoàn tất", description: `Đã hoàn tất sản xuất ${procProductName}.`, variant: "success" });
            setSelectedProc(null);
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message || "Không thể hoàn tất mẻ chế biến.", variant: "destructive" });
        } finally {
            setSubmittingProc(false);
        }
    };

    return (
        <div className="space-y-6">
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Cơ sở chế biến</span>
                <span>/</span>
                <span className="text-emerald-700 font-bold">Chế biến & Đóng gói</span>
            </nav>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Chế biến & Đóng gói</h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Quản lý các lô đóng gói trái tươi xuất khẩu và các mẻ bóc múi, cấp đông sau phân loại.
                </p>

                {/* 2 Tab Lớn */}
                <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab("FRESH")}
                        className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition ${
                            activeTab === "FRESH"
                                ? "bg-emerald-600 text-white shadow-soft"
                                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        <Package className="h-4 w-4" />
                        <span>Trái tươi xuất khẩu</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === "FRESH" ? "bg-emerald-700 text-emerald-100" : "bg-slate-200 text-slate-700"}`}>
                            {freshItems.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("PROCESSED")}
                        className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition ${
                            activeTab === "PROCESSED"
                                ? "bg-indigo-600 text-white shadow-soft"
                                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        <Factory className="h-4 w-4" />
                        <span>Chuyển chế biến</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === "PROCESSED" ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 text-slate-700"}`}>
                            {processedItems.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* TAB 1: TRÁI TƯƠI XUẤT KHẨU */}
            {activeTab === "FRESH" && (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th className="px-5 py-4 whitespace-nowrap">Mã lô</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Nguồn nguyên liệu</th>
                                    <th className="px-5 py-4 whitespace-nowrap text-right">Khối lượng</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Ngày đóng gói</th>
                                    <th className="px-5 py-4 whitespace-nowrap text-center">Số thùng</th>
                                    <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái</th>
                                    <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {freshItems.map((item) => {
                                    const isReady = item.status === "READY_FOR_EXPORT" || item.status === "COMPLETED";
                                    return (
                                        <tr key={item.id} className="h-14 hover:bg-slate-50/70 transition">
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className="font-mono font-bold text-slate-900 text-xs">{item.code}</span>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <p className="font-bold text-slate-800 text-xs sm:text-sm">{item.farmName}</p>
                                                {item.sourceRawCode && (
                                                    <span className="text-[10px] text-slate-400 font-mono">Nguồn: {item.sourceRawCode}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-right font-black text-slate-900 text-xs sm:text-sm">
                                                {(item.outputWeight || item.inputWeight).toLocaleString("vi-VN")} kg
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">
                                                {item.packagingDate ? new Date(item.packagingDate).toLocaleDateString("vi-VN") : "—"}
                                            </td>
                                            <td className="px-5 py-3 text-center whitespace-nowrap font-bold text-slate-700 text-xs">
                                                {item.boxCount ? `${item.boxCount} thùng` : "—"}
                                            </td>
                                            <td className="px-5 py-3 text-center whitespace-nowrap">
                                                {isReady ? (
                                                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                        Sẵn sàng xuất hàng
                                                    </span>
                                                ) : item.status === "IN_PROGRESS" ? (
                                                    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                                                        Đang xử lý
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                                        Chờ đóng gói
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right whitespace-nowrap">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenFreshDrawer(item)}
                                                    variant={isReady ? "outline" : "default"}
                                                    className={`h-8 rounded-xl text-xs font-bold ${
                                                        isReady
                                                            ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                                                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft"
                                                    }`}
                                                >
                                                    {isReady ? "Chi tiết" : "Đóng gói"}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {freshItems.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                                            Chưa có lô trái tươi xuất khẩu nào. Vui lòng phân loại lô ở bước Tiếp nhận & Phân loại.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: CHUYỂN CHẾ BIẾN */}
            {activeTab === "PROCESSED" && (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th className="px-5 py-4 whitespace-nowrap">Mã lô</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Nguồn</th>
                                    <th className="px-5 py-4 whitespace-nowrap">Hướng xử lý</th>
                                    <th className="px-5 py-4 whitespace-nowrap text-right">Khối lượng đầu vào</th>
                                    <th className="px-5 py-4 whitespace-nowrap text-right">Thành phẩm thu được</th>
                                    <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái</th>
                                    <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {processedItems.map((item) => {
                                    const isDone = item.status === "COMPLETED";
                                    return (
                                        <tr key={item.id} className="h-14 hover:bg-slate-50/70 transition">
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className="font-mono font-bold text-slate-900 text-xs">{item.code}</span>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <p className="font-bold text-slate-800 text-xs sm:text-sm">{item.farmName}</p>
                                                <span className="text-[10px] text-slate-400 font-mono">Nguồn: {item.sourceRawCode}</span>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-xs font-bold text-indigo-800">
                                                {item.method === "PEELING" ? "Bóc múi / Tách múi" : item.method === "FREEZING" ? "Cơm sầu đông lạnh" : item.method || "Bóc múi / Tách múi"}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-right font-black text-slate-900 text-xs sm:text-sm">
                                                {item.inputWeight.toLocaleString("vi-VN")} kg
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-right font-black text-emerald-700 text-xs sm:text-sm">
                                                {item.outputWeight ? `${item.outputWeight.toLocaleString("vi-VN")} kg (${item.outputProduct || "Cơm sầu"})` : "—"}
                                            </td>
                                            <td className="px-5 py-3 text-center whitespace-nowrap">
                                                {isDone ? (
                                                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                        Đã hoàn tất
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                                        Chờ xử lý
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right whitespace-nowrap">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenProcDrawer(item)}
                                                    variant={isDone ? "outline" : "default"}
                                                    className={`h-8 rounded-xl text-xs font-bold ${
                                                        isDone
                                                            ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                                                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-soft"
                                                    }`}
                                                >
                                                    {isDone ? "Chi tiết" : "Ghi nhận sản xuất"}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {processedItems.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                                            Chưa có lô chuyển chế biến nào. Vui lòng phân loại lô ở bước Tiếp nhận & Phân loại.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DRAWER: LÔ ĐÓNG GÓI TRÁI TƯƠI */}
            {selectedFresh && (
                <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/40 backdrop-blur-sm transition">
                    <div className="relative flex h-full w-full max-w-md flex-col justify-between border-l border-slate-200 bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Đóng gói xuất khẩu</span>
                                    <h2 className="text-xl font-black text-slate-900">LÔ ĐÓNG GÓI</h2>
                                </div>
                                <button type="button" onClick={() => setSelectedFresh(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 space-y-1.5 text-xs text-slate-700">
                                <p className="flex justify-between"><span className="text-slate-500">Nguồn:</span><span className="font-mono font-bold text-slate-900">{selectedFresh.sourceRawCode || selectedFresh.code}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Farm:</span><span className="font-bold text-slate-800">{selectedFresh.farmName}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Khối lượng đầu vào:</span><span className="font-black text-slate-900">{selectedFresh.inputWeight.toLocaleString("vi-VN")} kg</span></p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng thành phẩm (kg)</label>
                                    <input
                                        type="number"
                                        value={freshOutputWeight}
                                        onChange={(e) => {
                                            setFreshOutputWeight(e.target.value);
                                            const w = Number(e.target.value);
                                            if (w > 0) setFreshBoxCount(Math.round(w / 18));
                                        }}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Số thùng</label>
                                    <input
                                        type="number"
                                        value={freshBoxCount}
                                        onChange={(e) => setFreshBoxCount(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Quy cách đóng gói</label>
                                    <input
                                        type="text"
                                        value={freshPackagingSpec}
                                        onChange={(e) => setFreshPackagingSpec(e.target.value)}
                                        placeholder="Ví dụ: Thùng 5-6 trái / 18kg"
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Ngày hoàn tất</label>
                                    <input
                                        type="date"
                                        value={freshCompleteDate}
                                        onChange={(e) => setFreshCompleteDate(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 border-t border-slate-100 pt-4">
                            <Button type="button" variant="outline" onClick={() => setSelectedFresh(null)} className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200">Hủy</Button>
                            <Button type="button" onClick={handleConfirmFreshPackaging} disabled={submittingFresh} className="flex-1 rounded-2xl h-11 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft">{submittingFresh ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hoàn tất đóng gói"}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* DRAWER: MẺ CHẾ BIẾN */}
            {selectedProc && (
                <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/40 backdrop-blur-sm transition">
                    <div className="relative flex h-full w-full max-w-md flex-col justify-between border-l border-slate-200 bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Chế biến sâu</span>
                                    <h2 className="text-xl font-black text-slate-900">MẺ CHẾ BIẾN</h2>
                                </div>
                                <button type="button" onClick={() => setSelectedProc(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 space-y-1.5 text-xs text-slate-700">
                                <p className="flex justify-between"><span className="text-slate-500">Nguồn:</span><span className="font-mono font-bold text-slate-900">{selectedProc.sourceRawCode || selectedProc.code}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Farm:</span><span className="font-bold text-slate-800">{selectedProc.farmName}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Khối lượng đầu vào:</span><span className="font-black text-slate-900">{selectedProc.inputWeight.toLocaleString("vi-VN")} kg</span></p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Hướng xử lý</label>
                                    <select
                                        value={procMethod}
                                        onChange={(e) => {
                                            setProcMethod(e.target.value);
                                            if (e.target.value.includes("Bóc múi")) setProcProductName("Cơm sầu riêng bóc múi");
                                            else if (e.target.value.includes("Đông lạnh")) setProcProductName("Sầu riêng cấp đông IQF");
                                            else setProcProductName("Sầu riêng sấy giòn");
                                        }}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                    >
                                        <option value="Bóc múi / Tách múi">Bóc múi / Tách múi</option>
                                        <option value="Đông lạnh">Cơm sầu đông lạnh IQF</option>
                                        <option value="Chế biến tiếp">Sấy thăng hoa / Chế biến tiếp</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên sản phẩm thành phẩm</label>
                                    <input
                                        type="text"
                                        value={procProductName}
                                        onChange={(e) => setProcProductName(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng thành phẩm thu được (kg)</label>
                                    <input
                                        type="number"
                                        value={procOutputWeight}
                                        onChange={(e) => setProcOutputWeight(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-indigo-700 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Ngày hoàn tất</label>
                                    <input
                                        type="date"
                                        value={procDate}
                                        onChange={(e) => setProcDate(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 border-t border-slate-100 pt-4">
                            <Button type="button" variant="outline" onClick={() => setSelectedProc(null)} className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200">Hủy</Button>
                            <Button type="button" onClick={handleConfirmProcBatch} disabled={submittingProc} className="flex-1 rounded-2xl h-11 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-soft">{submittingProc ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hoàn tất mẻ chế biến"}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
