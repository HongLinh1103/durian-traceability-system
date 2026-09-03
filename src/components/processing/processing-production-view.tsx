'use client';

import { useEffect, useMemo, useState } from "react";
import {
    Boxes,
    Calendar,
    CheckCircle2,
    Clock,
    Factory,
    FileText,
    Layers,
    Loader2,
    Package,
    PackageCheck,
    Search,
    SlidersHorizontal,
    Sparkles,
    Truck,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ModalPortal } from "@/components/ui/modal-portal";

export type FreshProductItem = {
    id: string;
    code: string;
    sourceRawCode?: string;
    rawLotId?: string;
    farmName: string;
    inputWeight: number;
    fruitCount?: number;
    outputWeight?: number;
    packagingDate?: string | Date | null;
    boxCount?: number;
    packagingSpec?: string;
    status: "PENDING_PACKAGING" | "IN_PROGRESS" | "COMPLETED" | "READY_FOR_EXPORT" | "NOT_READY_FOR_EXPORT";
};

export type ProcessedBatchItem = {
    id: string;
    code: string;
    sourceRawCode: string;
    rawLotId: string;
    farmName: string;
    method: "PEELING" | "FREEZING" | "FURTHER_PROCESSING" | string;
    inputWeight: number;
    fruitCount?: number;
    outputProduct?: string;
    outputWeight?: number;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NOT_READY_FOR_EXPORT";
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
    const [searchQuery, setSearchQuery] = useState("");

    // Hydrate newly classified tickets from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem("processing_classified_lots");
            if (!raw) return;
            const lots: any[] = JSON.parse(raw);
            if (!Array.isArray(lots) || lots.length === 0) return;

            setFreshItems((prev) => {
                const existingLotIds = new Set(prev.map((i) => i.rawLotId || i.id));
                const newFresh: FreshProductItem[] = [];

                lots.forEach((lot) => {
                    const freshW = Number(lot.freshExportWeight || 0);
                    if (freshW > 0 && !existingLotIds.has(lot.id)) {
                        newFresh.push({
                            id: `raw-fresh-${lot.id}`,
                            code: `PK-${lot.code}`,
                            sourceRawCode: lot.code,
                            rawLotId: lot.id,
                            farmName: lot.farmName || "Vườn liên kết",
                            inputWeight: freshW,
                            fruitCount: Number(lot.freshExportFruitCount) || (freshW > 0 ? Math.round(freshW / 3) : undefined),
                            outputWeight: freshW,
                            packagingDate: lot.classifiedAt || new Date().toISOString().slice(0, 10),
                            boxCount: Math.round(freshW / 18) || 1,
                            packagingSpec: "Thùng 5-6 trái / 18kg",
                            status: "PENDING_PACKAGING",
                        });
                    }
                });

                return newFresh.length > 0 ? [...newFresh, ...prev] : prev;
            });

            setProcessedItems((prev) => {
                const existingLotIds = new Set(prev.map((i) => i.rawLotId || i.id));
                const newProc: ProcessedBatchItem[] = [];

                lots.forEach((lot) => {
                    const procW = Number(lot.processingWeight || 0);
                    if (procW > 0 && !existingLotIds.has(lot.id)) {
                        newProc.push({
                            id: `raw-proc-${lot.id}`,
                            code: `PROC-${lot.code}`,
                            sourceRawCode: lot.code,
                            rawLotId: lot.id,
                            farmName: lot.farmName || "Vườn liên kết",
                            method: "Bóc múi / Tách múi",
                            inputWeight: procW,
                            fruitCount: Number(lot.processingFruitCount) || (procW > 0 ? Math.round(procW / 3) : undefined),
                            outputProduct: "Cơm sầu riêng bóc múi",
                            status: "PENDING",
                        });
                    }
                });

                return newProc.length > 0 ? [...newProc, ...prev] : prev;
            });
        } catch { }
    }, []);

    // Fresh packaging drawer
    const [selectedFresh, setSelectedFresh] = useState<FreshProductItem | null>(null);
    const [freshOutputWeight, setFreshOutputWeight] = useState<number | string>("");
    const [freshBoxCount, setFreshBoxCount] = useState<number | string>("");
    const [freshPackagingSpec, setFreshPackagingSpec] = useState("Thùng 5-6 trái / 18kg");
    const [freshCompleteDate, setFreshCompleteDate] = useState(new Date().toISOString().slice(0, 10));
    const [freshNote, setFreshNote] = useState("");
    const [submittingFresh, setSubmittingFresh] = useState(false);

    // Processing batch drawer
    const [selectedProc, setSelectedProc] = useState<ProcessedBatchItem | null>(null);
    const [procProductName, setProcProductName] = useState("Cơm sầu riêng bóc múi");
    const [procMethod, setProcMethod] = useState("Bóc múi / Tách múi");
    const [procOutputWeight, setProcOutputWeight] = useState<number | string>("");
    const [procDate, setProcDate] = useState(new Date().toISOString().slice(0, 10));
    const [procNote, setProcNote] = useState("");
    const [submittingProc, setSubmittingProc] = useState(false);

    // Handler: Open Fresh Packaging Drawer
    const handleOpenFreshDrawer = (item: FreshProductItem) => {
        setSelectedFresh(item);
        const w = item.outputWeight || item.inputWeight;
        setFreshOutputWeight(w);
        setFreshBoxCount(item.boxCount || Math.max(1, Math.round(w / 18)));
        setFreshPackagingSpec(item.packagingSpec || "Thùng 5-6 trái / 18kg");
        setFreshCompleteDate(new Date().toISOString().slice(0, 10));
        setFreshNote("");
    };

    // Handler: Confirm Fresh Packaging
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
            const res = await fetch("/api/processing/fresh-packaging", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lotId: selectedFresh.id,
                    rawMaterialLotId: selectedFresh.rawLotId,
                    outputWeight: outW,
                    boxCount: boxes,
                    packagingSpec: freshPackagingSpec,
                    completedAt: freshCompleteDate,
                    note: freshNote,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Không thể lưu thông tin đóng gói.");
            }

            const savedFinishedLot = data.data?.finishedLot || data.data;
            const savedLotId = savedFinishedLot?.id || selectedFresh.id;
            const savedLotCode = savedFinishedLot?.lotCode || selectedFresh.code;

            setFreshItems((prev) =>
                prev.map((item) =>
                    item.id === selectedFresh.id
                        ? {
                            ...item,
                            id: savedLotId,
                            code: savedLotCode,
                            outputWeight: outW,
                            boxCount: boxes,
                            packagingSpec: freshPackagingSpec,
                            packagingDate: freshCompleteDate,
                            status: "READY_FOR_EXPORT",
                        }
                        : item
                )
            );

            // Sync to localStorage under processing_packaged_lots
            try {
                const existing = JSON.parse(localStorage.getItem("processing_packaged_lots") || "[]");
                const packagedEntry = {
                    id: savedLotId,
                    lotCode: savedLotCode,
                    productName: "Sầu riêng tươi xuất khẩu",
                    remainingWeight: outW,
                    packaging: freshPackagingSpec,
                    farmName: selectedFresh.farmName,
                    rawLotCode: selectedFresh.sourceRawCode || selectedFresh.code,
                    status: "READY_FOR_DISTRIBUTION",
                };
                const filtered = existing.filter((x: any) => x.id !== packagedEntry.id);
                localStorage.setItem("processing_packaged_lots", JSON.stringify([...filtered, packagedEntry]));
            } catch { }

            toast({
                title: "Đóng gói hoàn tất",
                description: `Lô ${selectedFresh.code} (${outW.toLocaleString("vi-VN")} kg · ${boxes} thùng) đã chuyển sang trạng thái Sẵn sàng xuất hàng.`,
                variant: "success",
            });
            setSelectedFresh(null);
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message || "Không thể lưu thông tin đóng gói.", variant: "destructive" });
        } finally {
            setSubmittingFresh(false);
        }
    };

    // Handler: Open Processing Drawer
    const handleOpenProcDrawer = (item: ProcessedBatchItem) => {
        setSelectedProc(item);
        setProcMethod(item.method || "Bóc múi / Tách múi");
        setProcProductName(item.outputProduct || "Cơm sầu riêng bóc múi");
        setProcOutputWeight(item.outputWeight || Math.round(item.inputWeight * 0.32));
        setProcDate(new Date().toISOString().slice(0, 10));
        setProcNote("");
    };

    // Handler: Confirm Processing Batch
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

            const savedFinishedLot = data.data?.finishedLot;
            const savedLotId = savedFinishedLot?.id || selectedProc.id;
            const savedLotCode = savedFinishedLot?.lotCode || selectedProc.code;

            setProcessedItems((prev) =>
                prev.map((item) =>
                    item.id === selectedProc.id
                        ? {
                            ...item,
                            id: savedLotId,
                            code: savedLotCode,
                            outputProduct: procProductName,
                            outputWeight: outW,
                            method: procMethod,
                            status: "COMPLETED",
                        }
                        : item
                )
            );

            // Sync to localStorage under processing_packaged_lots
            try {
                const existing = JSON.parse(localStorage.getItem("processing_packaged_lots") || "[]");
                const packagedEntry = {
                    id: savedLotId,
                    lotCode: savedLotCode,
                    productName: procProductName,
                    remainingWeight: outW,
                    packaging: "Khay hút chân không 500g",
                    farmName: selectedProc.farmName,
                    rawLotCode: selectedProc.sourceRawCode || selectedProc.code,
                    status: "READY_FOR_DISTRIBUTION",
                };
                const filtered = existing.filter((x: any) => x.id !== packagedEntry.id);
                localStorage.setItem("processing_packaged_lots", JSON.stringify([...filtered, packagedEntry]));
            } catch { }

            toast({
                title: "Mẻ chế biến hoàn tất",
                description: `Đã hoàn tất sản xuất ${procProductName} (${outW.toLocaleString("vi-VN")} kg thành phẩm). Lô đã sẵn sàng xuất hàng.`,
                variant: "success",
            });
            setSelectedProc(null);
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message || "Không thể hoàn tất mẻ chế biến.", variant: "destructive" });
        } finally {
            setSubmittingProc(false);
        }
    };

    // Filter fresh items
    const filteredFresh = useMemo(() => {
        if (!searchQuery.trim()) return freshItems;
        const q = searchQuery.toLowerCase().trim();
        return freshItems.filter(
            (i) => i.code.toLowerCase().includes(q) || (i.sourceRawCode && i.sourceRawCode.toLowerCase().includes(q)) || i.farmName.toLowerCase().includes(q)
        );
    }, [freshItems, searchQuery]);

    // Filter processed items
    const filteredProc = useMemo(() => {
        if (!searchQuery.trim()) return processedItems;
        const q = searchQuery.toLowerCase().trim();
        return processedItems.filter(
            (i) => i.code.toLowerCase().includes(q) || i.sourceRawCode.toLowerCase().includes(q) || i.farmName.toLowerCase().includes(q) || (i.outputProduct && i.outputProduct.toLowerCase().includes(q))
        );
    }, [processedItems, searchQuery]);

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Cơ sở chế biến</span>
                <span>/</span>
                <span className="text-emerald-700 font-bold"></span>
            </nav>

            {/* Header */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Chế biến & Đóng gói</h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                        Nhận các lô đã được phân loại từ bước trước, ghi nhận quy cách đóng gói xuất khẩu hoặc hướng chế biến sâu và tự động chuyển thành Lô thành phẩm sẵn sàng xuất hàng.
                    </p>
                </div>

                {/* 2 Tab Lớn */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("FRESH")}
                            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition ${activeTab === "FRESH"
                                ? "bg-emerald-600 text-white shadow-soft"
                                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            <Package className="h-4 w-4" />
                            <span>[ Trái tươi ]</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === "FRESH" ? "bg-emerald-700 text-emerald-100" : "bg-slate-200 text-slate-700"}`}>
                                {freshItems.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("PROCESSED")}
                            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition ${activeTab === "PROCESSED"
                                ? "bg-indigo-600 text-white shadow-soft"
                                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            <Factory className="h-4 w-4" />
                            <span>[ Chế biến khác ]</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === "PROCESSED" ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 text-slate-700"}`}>
                                {processedItems.length}
                            </span>
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm mã lô, Farm..."
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        />
                    </div>
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
                                    <th className="px-5 py-4 whitespace-nowrap">Nguồn</th>
                                    <th className="px-5 py-4 whitespace-nowrap text-right">KL đầu vào</th>
                                    <th className="px-5 py-4 whitespace-nowrap text-right">KL thành phẩm</th>
                                    <th className="px-5 py-4 whitespace-nowrap text-center">Số thùng</th>
                                    <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái</th>
                                    <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredFresh.map((item) => {
                                    const isReady = item.status === "READY_FOR_EXPORT" || item.status === "COMPLETED";
                                    const isUnavailable = item.status === "NOT_READY_FOR_EXPORT";

                                    return (
                                        <tr key={item.id} className="h-14 hover:bg-slate-50/70 transition">
                                            {/* Mã lô */}
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className="font-mono font-bold text-slate-900 text-xs">{item.code}</span>
                                            </td>

                                            {/* Nguồn */}
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <p className="font-bold text-slate-800 text-xs sm:text-sm">{item.farmName}</p>
                                                {item.sourceRawCode && (
                                                    <span className="text-[10px] text-slate-400 font-mono">Nguồn: {item.sourceRawCode}</span>
                                                )}
                                            </td>

                                            {/* KL đầu vào */}
                                            <td className="px-5 py-3 whitespace-nowrap text-right text-xs sm:text-sm">
                                                <div className="font-mono font-bold text-slate-800">{item.inputWeight.toLocaleString("vi-VN")} kg</div>
                                                {item.fruitCount && (
                                                    <span className="block text-[11px] font-semibold text-emerald-700">
                                                        {item.fruitCount.toLocaleString("vi-VN")} trái
                                                    </span>
                                                )}
                                            </td>

                                            {/* KL thành phẩm */}
                                            <td className="px-5 py-3 whitespace-nowrap text-right font-black text-emerald-700 text-xs sm:text-sm">
                                                {(item.outputWeight || item.inputWeight).toLocaleString("vi-VN")} kg
                                            </td>

                                            {/* Số thùng */}
                                            <td className="px-5 py-3 text-center whitespace-nowrap font-bold text-slate-700 text-xs">
                                                {item.boxCount ? `${item.boxCount} thùng` : "—"}
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="px-5 py-3 text-center whitespace-nowrap">
                                                {isReady ? (
                                                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                        Sẵn sàng xuất hàng
                                                    </span>
                                                ) : isUnavailable ? (
                                                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                                        Không còn đủ điều kiện xuất
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

                                            {/* Thao tác */}
                                            <td className="px-5 py-3 text-right whitespace-nowrap">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenFreshDrawer(item)}
                                                    disabled={isUnavailable}
                                                    variant={isReady ? "outline" : "default"}
                                                    className={`h-8 rounded-xl text-xs font-bold ${isReady
                                                        ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                                                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft"
                                                        }`}
                                                >
                                                    {isReady ? "Chi tiết / Sửa" : "Đóng gói"}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredFresh.length === 0 && (
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
                                    <th className="px-5 py-4 whitespace-nowrap text-right">KL đầu vào</th>
                                    <th className="px-5 py-4 whitespace-nowrap text-right">Thành phẩm thu được</th>
                                    <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái</th>
                                    <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredProc.map((item) => {
                                    const isDone = item.status === "COMPLETED";
                                    const isUnavailable = item.status === "NOT_READY_FOR_EXPORT";

                                    return (
                                        <tr key={item.id} className="h-14 hover:bg-slate-50/70 transition">
                                            {/* Mã lô */}
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className="font-mono font-bold text-slate-900 text-xs">{item.code}</span>
                                            </td>

                                            {/* Nguồn */}
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <p className="font-bold text-slate-800 text-xs sm:text-sm">{item.farmName}</p>
                                                <span className="text-[10px] text-slate-400 font-mono">Nguồn: {item.sourceRawCode}</span>
                                            </td>

                                            {/* Hướng xử lý */}
                                            <td className="px-5 py-3 whitespace-nowrap text-xs font-bold text-indigo-800">
                                                {item.method === "PEELING"
                                                    ? "Bóc múi / Tách múi"
                                                    : item.method === "FREEZING"
                                                        ? "Cơm sầu đông lạnh IQF"
                                                        : item.method || "Bóc múi / Tách múi"}
                                            </td>

                                            {/* KL đầu vào */}
                                            <td className="px-5 py-3 whitespace-nowrap text-right text-xs sm:text-sm">
                                                <div className="font-mono font-bold text-slate-800">{item.inputWeight.toLocaleString("vi-VN")} kg</div>
                                                {item.fruitCount && (
                                                    <span className="block text-[11px] font-semibold text-indigo-700">
                                                        {item.fruitCount.toLocaleString("vi-VN")} trái
                                                    </span>
                                                )}
                                            </td>

                                            {/* Thành phẩm thu được */}
                                            <td className="px-5 py-3 whitespace-nowrap text-right font-black text-emerald-700 text-xs sm:text-sm">
                                                {item.outputWeight ? `${item.outputWeight.toLocaleString("vi-VN")} kg (${item.outputProduct || "Cơm sầu"})` : "—"}
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="px-5 py-3 text-center whitespace-nowrap">
                                                {isDone ? (
                                                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                        Sẵn sàng xuất hàng
                                                    </span>
                                                ) : isUnavailable ? (
                                                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                                        Không còn đủ điều kiện xuất
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                                        Chờ xử lý
                                                    </span>
                                                )}
                                            </td>

                                            {/* Thao tác */}
                                            <td className="px-5 py-3 text-right whitespace-nowrap">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenProcDrawer(item)}
                                                    disabled={isUnavailable}
                                                    variant={isDone ? "outline" : "default"}
                                                    className={`h-8 rounded-xl text-xs font-bold ${isDone
                                                        ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                                                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-soft"
                                                        }`}
                                                >
                                                    {isDone ? "Chi tiết / Sửa" : "Ghi nhận mẻ"}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredProc.length === 0 && (
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

            {/* MODAL: LÔ ĐÓNG GÓI TRÁI TƯƠI (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {selectedFresh && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Đóng gói thành phẩm</span>
                                    <h2 className="text-xl font-black text-slate-900">HOÀN TẤT ĐÓNG GÓI</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFresh(null)}
                                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
                                <div className="rounded-2xl bg-slate-50 p-4 space-y-1.5 text-xs text-slate-700 border border-slate-200">
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Mã lô nguồn:</span>
                                        <span className="font-mono font-bold text-slate-900">{selectedFresh.sourceRawCode || selectedFresh.code}</span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Farm / Vùng:</span>
                                        <span className="font-bold text-slate-800">{selectedFresh.farmName}</span>
                                    </p>
                                    <p className="flex justify-between border-t border-slate-200/60 pt-1 font-bold">
                                        <span className="text-slate-700">Khối lượng đầu vào:</span>
                                        <span className="font-black text-emerald-700">
                                            {selectedFresh.inputWeight.toLocaleString("vi-VN")} kg
                                            {selectedFresh.fruitCount ? ` (${selectedFresh.fruitCount.toLocaleString("vi-VN")} trái)` : ""}
                                        </span>
                                    </p>
                                </div>

                                <div className="space-y-3 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Khối lượng thành phẩm (kg) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={freshOutputWeight}
                                            onChange={(e) => {
                                                setFreshOutputWeight(e.target.value);
                                                const w = Number(e.target.value);
                                                if (w > 0) setFreshBoxCount(Math.max(1, Math.round(w / 18)));
                                            }}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Số thùng</label>
                                        <input
                                            type="number"
                                            value={freshBoxCount}
                                            onChange={(e) => setFreshBoxCount(e.target.value)}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
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

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                                        <input
                                            type="text"
                                            value={freshNote}
                                            onChange={(e) => setFreshNote(e.target.value)}
                                            placeholder="Ghi chú thêm nếu có..."
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-2 border-t border-slate-100 p-5 sm:p-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedFresh(null)}
                                    className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleConfirmFreshPackaging}
                                    disabled={submittingFresh}
                                    className="flex-1 rounded-2xl h-11 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                >
                                    {submittingFresh ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hoàn tất đóng gói"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL: MẺ CHẾ BIẾN (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {selectedProc && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Chế biến sâu</span>
                                    <h2 className="text-xl font-black text-slate-900">MẺ CHẾ BIẾN</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProc(null)}
                                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
                                <div className="rounded-2xl bg-slate-50 p-4 space-y-1.5 text-xs text-slate-700 border border-slate-200">
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Mã lô nguồn:</span>
                                        <span className="font-mono font-bold text-slate-900">{selectedProc.sourceRawCode || selectedProc.code}</span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Farm / Vùng:</span>
                                        <span className="font-bold text-slate-800">{selectedProc.farmName}</span>
                                    </p>
                                    <p className="flex justify-between border-t border-slate-200/60 pt-1 font-bold">
                                        <span className="text-slate-700">Khối lượng đầu vào:</span>
                                        <span className="font-black text-indigo-700">
                                            {selectedProc.inputWeight.toLocaleString("vi-VN")} kg
                                            {selectedProc.fruitCount ? ` (${selectedProc.fruitCount.toLocaleString("vi-VN")} trái)` : ""}
                                        </span>
                                    </p>
                                </div>

                                <div className="space-y-3 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Tên thành phẩm sau chế biến <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={procProductName}
                                            onChange={(e) => setProcProductName(e.target.value)}
                                            placeholder="Ví dụ: Cơm sầu riêng bóc múi hút chân không (Khay 500g)"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Khối lượng thành phẩm (kg) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={procOutputWeight}
                                                onChange={(e) => setProcOutputWeight(e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Phương pháp chế biến</label>
                                            <select
                                                value={procMethod}
                                                onChange={(e) => setProcMethod(e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                            >
                                                <option value="Bóc múi / Tách múi">Bóc múi / Tách múi</option>
                                                <option value="Cấp đông nhanh (IQF)">Cấp đông nhanh (IQF)</option>
                                                <option value="Sấy thăng hoa (Freeze Drying)">Sấy thăng hoa (Freeze Drying)</option>
                                                <option value="Chế biến sâu khác">Chế biến sâu khác</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ngày sản xuất</label>
                                        <input
                                            type="date"
                                            value={procDate}
                                            onChange={(e) => setProcDate(e.target.value)}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú mẻ chế biến</label>
                                        <input
                                            type="text"
                                            value={procNote}
                                            onChange={(e) => setProcNote(e.target.value)}
                                            placeholder="Ghi chú thêm về quy trình, phụ liệu..."
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-2 border-t border-slate-100 p-5 sm:p-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedProc(null)}
                                    className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleConfirmProcBatch}
                                    disabled={submittingProc}
                                    className="flex-1 rounded-2xl h-11 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-soft"
                                >
                                    {submittingProc ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hoàn tất chế biến"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
