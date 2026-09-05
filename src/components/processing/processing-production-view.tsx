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
import { formatVietnameseDateTime } from "@/lib/date-format";

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
    method?: "PEELING" | "FREEZING" | "FURTHER_PROCESSING" | string;
    inputWeight: number;
    fruitCount?: number;
    outputProduct?: string;
    outputWeight?: number;
    completedAt?: string | Date | null;
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

            const cleanedLots = lots.filter(
                (lot) =>
                    lot &&
                    !String(lot.id).startsWith("demo-") &&
                    !String(lot.code).includes("TH-DEMO-20260817-002")
            );
            if (cleanedLots.length !== lots.length) {
                localStorage.setItem("processing_classified_lots", JSON.stringify(cleanedLots));
            }

            setFreshItems((prev) => {
                const existingLotIds = new Set(prev.map((i) => i.rawLotId || i.id));
                const newFresh: FreshProductItem[] = [];

                cleanedLots.forEach((lot) => {
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
                            outputWeight: undefined,
                            packagingDate: lot.classifiedAt || new Date().toISOString().slice(0, 10),
                            boxCount: undefined,
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

                cleanedLots.forEach((lot) => {
                    const procW = Number(lot.processingWeight || 0);
                    if (procW > 0 && !existingLotIds.has(lot.id)) {
                        newProc.push({
                            id: `raw-proc-${lot.id}`,
                            code: `PROC-${lot.code}`,
                            sourceRawCode: lot.code,
                            rawLotId: lot.id,
                            farmName: lot.farmName || "Vườn liên kết",
                            method: undefined,
                            inputWeight: procW,
                            fruitCount: Number(lot.processingFruitCount) || (procW > 0 ? Math.round(procW / 3) : undefined),
                            outputProduct: undefined,
                            status: "PENDING",
                        });
                    }
                });

                return newProc.length > 0 ? [...newProc, ...prev] : prev;
            });
        } catch { }
    }, []);

    // Auto-sync all packaged lots (status READY_FOR_EXPORT or COMPLETED) to localStorage
    // so Step 3 (Xuất hàng) instantly sees every lot marked "Đã đóng gói"
    useEffect(() => {
        try {
            const packagedLots: any[] = [];
            freshItems.forEach((f) => {
                if (f.status === "READY_FOR_EXPORT" || f.status === "COMPLETED") {
                    packagedLots.push({
                        id: f.id,
                        lotCode: f.code,
                        productName: "Sầu riêng tươi xuất khẩu",
                        remainingWeight: Number(f.outputWeight || f.inputWeight || 0),
                        packaging: f.packagingSpec || "Thùng 5-6 trái / 18kg",
                        farmName: f.farmName,
                        rawLotCode: f.sourceRawCode || f.code,
                        status: "READY_FOR_DISTRIBUTION",
                    });
                }
            });
            processedItems.forEach((p) => {
                if (p.status === "COMPLETED") {
                    packagedLots.push({
                        id: p.id,
                        lotCode: p.code,
                        productName: p.outputProduct || "Cơm sầu riêng bóc múi",
                        remainingWeight: Number(p.outputWeight || Math.round(p.inputWeight * 0.32)),
                        packaging: "Khay hút chân không 500g",
                        farmName: p.farmName,
                        rawLotCode: p.sourceRawCode || p.code,
                        status: "READY_FOR_DISTRIBUTION",
                    });
                }
            });
            if (packagedLots.length > 0) {
                const existing = JSON.parse(localStorage.getItem("processing_packaged_lots") || "[]");
                const existingMap = new Map<string, any>();
                if (Array.isArray(existing)) {
                    existing.forEach((x: any) => {
                        const key = x.lotCode || x.id;
                        if (key && key !== "FPL-20260826-001" && x.lotCode !== "FPL-20260826-001" && x.id !== "FPL-20260826-001") {
                            existingMap.set(key, x);
                        }
                    });
                }

                const finalLots: any[] = [];
                packagedLots.forEach((lot) => {
                    const key = lot.lotCode || lot.id;
                    const prev = existingMap.get(key) || {};
                    // If lot was previously dispatched in part, keep remainingWeight if smaller
                    const remWeight =
                        prev.remainingWeight !== undefined && Number(prev.remainingWeight) < Number(lot.remainingWeight)
                            ? Number(prev.remainingWeight)
                            : lot.remainingWeight;

                    finalLots.push({
                        ...lot,
                        ...prev,
                        id: lot.id,
                        lotCode: lot.lotCode,
                        productName: lot.productName,
                        remainingWeight: remWeight,
                        packaging: lot.packaging || prev.packaging,
                        farmName: lot.farmName || prev.farmName,
                        rawLotCode: lot.rawLotCode || prev.rawLotCode,
                        status: lot.status || prev.status || "READY_FOR_DISTRIBUTION",
                    });
                });

                localStorage.setItem("processing_packaged_lots", JSON.stringify(finalLots));
            } else {
                // If no packaged lots exist, clear or purge ghost lots
                try {
                    const existing = JSON.parse(localStorage.getItem("processing_packaged_lots") || "[]");
                    if (Array.isArray(existing)) {
                        const cleaned = existing.filter(
                            (x: any) => x.lotCode !== "FPL-20260826-001" && x.id !== "FPL-20260826-001"
                        );
                        localStorage.setItem("processing_packaged_lots", JSON.stringify(cleaned));
                    }
                } catch { }
            }
        } catch { }
    }, [freshItems, processedItems]);

    // Helper for datetime-local strings
    const getLocalDateTimeString = (dateInput?: Date | string | null) => {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (Number.isNaN(d.getTime())) {
            const now = new Date();
            return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    // Fresh packaging drawer
    const [selectedFresh, setSelectedFresh] = useState<FreshProductItem | null>(null);
    const [freshOutputWeight, setFreshOutputWeight] = useState<number | string>("");
    const [freshBoxCount, setFreshBoxCount] = useState<number | string>("");
    const [freshPackagingSpec, setFreshPackagingSpec] = useState("");
    const [freshCompleteDate, setFreshCompleteDate] = useState(() => getLocalDateTimeString());
    const [freshNote, setFreshNote] = useState("");
    const [submittingFresh, setSubmittingFresh] = useState(false);

    // Processing batch drawer
    const [selectedProc, setSelectedProc] = useState<ProcessedBatchItem | null>(null);
    const [procProductName, setProcProductName] = useState("");
    const [procMethod, setProcMethod] = useState("Bóc múi & cấp đông");
    const [procOutputWeight, setProcOutputWeight] = useState<number | string>("");
    const [procDate, setProcDate] = useState(() => getLocalDateTimeString());
    const [procNote, setProcNote] = useState("");
    const [submittingProc, setSubmittingProc] = useState(false);

    // Handler: Open Fresh Packaging Drawer
    const handleOpenFreshDrawer = (item: FreshProductItem) => {
        setSelectedFresh(item);
        const isDone = item.status === "READY_FOR_EXPORT";
        setFreshOutputWeight(isDone && item.outputWeight ? item.outputWeight : "");
        setFreshBoxCount(isDone && item.boxCount ? item.boxCount : "");
        setFreshPackagingSpec(isDone && item.packagingSpec ? item.packagingSpec : "");
        setFreshCompleteDate(getLocalDateTimeString(isDone && item.packagingDate ? item.packagingDate : new Date()));
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
            let savedFinishedLot: any = null;
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
                if (res.ok && data.success) {
                    savedFinishedLot = data.data?.finishedLot || data.data;
                }
            } catch {
                // Fallback for demo or offline mode
            }

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
                const filtered = existing.filter((x: any) => x.id !== packagedEntry.id && x.lotCode !== packagedEntry.lotCode);
                localStorage.setItem("processing_packaged_lots", JSON.stringify([...filtered, packagedEntry]));
            } catch { }

            toast({
                title: "Đóng gói hoàn tất",
                description: `Lô ${savedLotCode} (${outW.toLocaleString("vi-VN")} kg · ${boxes} thùng) đã chuyển sang trạng thái Đã đóng gói.`,
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
        const isDone = item.status === "COMPLETED";
        setProcMethod(item.method || "Bóc múi & cấp đông");
        setProcProductName(isDone && item.outputProduct ? item.outputProduct : "");
        setProcOutputWeight(isDone && item.outputWeight ? item.outputWeight : "");
        setProcDate(getLocalDateTimeString(isDone && item.completedAt ? item.completedAt : new Date()));
        setProcNote("");
    };

    // Handler: Confirm Processing Batch
    const handleConfirmProcBatch = async () => {
        if (!selectedProc) return;
        if (!procProductName.trim()) {
            toast({ title: "Thiếu thông tin", description: "Vui lòng nhập tên thành phẩm sau chế biến.", variant: "destructive" });
            return;
        }
        const outW = Number(procOutputWeight);
        if (!outW || outW <= 0) {
            toast({ title: "Khối lượng không hợp lệ", description: "Vui lòng nhập khối lượng thành phẩm.", variant: "destructive" });
            return;
        }

        setSubmittingProc(true);
        try {
            let savedFinishedLot: any = null;
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
                if (res.ok && data.success) {
                    savedFinishedLot = data.data?.finishedLot;
                }
            } catch {
                // Fallback for demo or offline mode
            }

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
                            completedAt: procDate,
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
                const filtered = existing.filter((x: any) => x.id !== packagedEntry.id && x.lotCode !== packagedEntry.lotCode);
                localStorage.setItem("processing_packaged_lots", JSON.stringify([...filtered, packagedEntry]));
            } catch { }

            toast({
                title: "Mẻ chế biến hoàn tất",
                description: `Đã hoàn tất sản xuất ${procProductName} (${outW.toLocaleString("vi-VN")} kg thành phẩm). Lô đã chuyển sang trạng thái Đã đóng gói.`,
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
                        Nhận các lô đã được phân loại từ bước trước, ghi nhận quy cách đóng gói xuất khẩu hoặc hướng chế biến sâu và tự động chuyển thành Lô thành phẩm ở trạng thái Đã đóng gói.
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
                                    <th className="px-5 py-4 whitespace-nowrap text-center">Hoàn tất lúc</th>
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
                                            <td className="px-5 py-3 whitespace-nowrap text-right font-bold text-slate-700 text-xs sm:text-sm">
                                                {isReady && item.outputWeight ? (
                                                    <span className="font-black text-emerald-700">
                                                        {item.outputWeight.toLocaleString("vi-VN")} kg
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>

                                            {/* Số thùng */}
                                            <td className="px-5 py-3 text-center whitespace-nowrap font-bold text-slate-700 text-xs">
                                                {isReady && item.boxCount ? `${item.boxCount} thùng` : "-"}
                                            </td>

                                            {/* Hoàn tất lúc */}
                                            <td className="px-5 py-3 text-center whitespace-nowrap text-xs font-semibold text-slate-700">
                                                {isReady && item.packagingDate ? (
                                                    <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-800">
                                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                        {formatVietnameseDateTime(item.packagingDate)}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="px-5 py-3 text-center whitespace-nowrap">
                                                {isReady ? (
                                                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                        Đã đóng gói
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
                                        <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
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
                                    <th className="px-5 py-4 whitespace-nowrap text-center">Hoàn tất lúc</th>
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
                                            <td className="px-5 py-3 whitespace-nowrap text-xs font-bold text-slate-700">
                                                {isDone ? (
                                                    <span className="text-indigo-800">
                                                        {item.method === "PEELING" || item.method === "Bóc múi / Tách múi"
                                                            ? "Bóc múi & cấp đông"
                                                            : item.method === "FREEZING" || item.method === "Cơm sầu đông lạnh IQF"
                                                                ? "Cấp đông nguyên trái"
                                                                : item.method || "Bóc múi & cấp đông"}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
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
                                            <td className="px-5 py-3 whitespace-nowrap text-right font-bold text-slate-700 text-xs sm:text-sm">
                                                {isDone && item.outputWeight ? (
                                                    <span className="font-black text-emerald-700">
                                                        {item.outputWeight.toLocaleString("vi-VN")} kg ({item.outputProduct || "Cơm sầu"})
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>

                                            {/* Hoàn tất lúc */}
                                            <td className="px-5 py-3 text-center whitespace-nowrap text-xs font-semibold text-slate-700">
                                                {isDone && item.completedAt ? (
                                                    <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-800">
                                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                        {formatVietnameseDateTime(item.completedAt)}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="px-5 py-3 text-center whitespace-nowrap">
                                                {isDone ? (
                                                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                        Đã đóng gói
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
                                                    {isDone ? "Chi tiết / Sửa" : "Chế biến"}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredProc.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
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
                                    <h2 className="text-xl font-black text-slate-900">ĐÓNG GÓI LÔ THÀNH PHẨM</h2>
                                    <p className="mt-1 text-xs italic font-bold text-red-600">
                                        {formatVietnameseDateTime(freshCompleteDate)}
                                    </p>
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
                                            onChange={(e) => setFreshOutputWeight(e.target.value)}
                                            placeholder="Nhập khối lượng thành phẩm..."
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Số thùng</label>
                                        <input
                                            type="number"
                                            value={freshBoxCount}
                                            onChange={(e) => setFreshBoxCount(e.target.value)}
                                            placeholder="Nhập số thùng..."
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
                                    <h2 className="text-xl font-black text-slate-900">CHẾ BIẾN SẢN PHẨM LÔ CHẾ BIẾN</h2>
                                    <p className="mt-1 text-xs italic font-bold text-red-600">
                                        {formatVietnameseDateTime(procDate)}
                                    </p>
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
                                                placeholder="Nhập khối lượng thành phẩm..."
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
                                                <option value="Bóc múi & cấp đông">Bóc múi & cấp đông</option>
                                                <option value="Cấp đông nguyên trái">Cấp đông nguyên trái</option>
                                                <option value="Sấy thăng hoa">Sấy thăng hoa</option>
                                                <option value="Chế biến khác">Chế biến khác</option>
                                            </select>
                                        </div>
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
