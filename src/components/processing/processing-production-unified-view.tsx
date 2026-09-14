'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    Sparkles,
    Layers,
    PackageCheck,
    Clock,
    CheckCircle2,
    Boxes,
    Package,
    ArrowRight,
    Search,
    X,
    Trees,
    Factory,
    Truck,
    Info,
    AlertCircle,
    Calendar,
    Eye,
} from "lucide-react";
import { useProcessingWorkflow } from "@/hooks/use-processing-workflow";
import { GradingRecord, FinishedProductLot } from "@/lib/processing-workflow";
import { useToast } from "@/components/ui/toast";
import { ModalPortal } from "@/components/ui/modal-portal";

export function ProcessingProductionUnifiedView() {
    const { state, isLoaded, packFreshLot, processDeepLot } = useProcessingWorkflow();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const initialTab = searchParams.get("tab") || "fresh";
    const [activeTab, setActiveTab] = useState<"fresh" | "processed" | "finished">(
        initialTab === "processed" ? "processed" : initialTab === "finished" ? "finished" : "fresh"
    );

    // Modal state for Tab 1 (Packing Fresh)
    const [packingGrading, setPackingGrading] = useState<GradingRecord | null>(null);
    const [freshInputWeight, setFreshInputWeight] = useState<number | "">("");
    const [freshPackagingSpec, setFreshPackagingSpec] = useState("Thùng 18kg");
    const [freshPackageCount, setFreshPackageCount] = useState<number | "">("");
    const [freshFruitCount, setFreshFruitCount] = useState<number | "">(5);
    const [freshNetWeight, setFreshNetWeight] = useState<number | "">("");
    const [freshPackingDate, setFreshPackingDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
    const [freshNotes, setFreshNotes] = useState("");

    // Modal state for Tab 2 (Deep Processing)
    const [processingGrading, setProcessingGrading] = useState<GradingRecord | null>(null);
    const [deepInputWeight, setDeepInputWeight] = useState<number | "">("");
    const [deepMethod, setDeepMethod] = useState<string>("Bóc múi & cấp đông");
    const [deepProductName, setDeepProductName] = useState("Sầu riêng múi cấp đông IQF");
    const [deepPackagingSpec, setDeepPackagingSpec] = useState("Khay 1kg");
    const [deepPackageCount, setDeepPackageCount] = useState<number | "">("");
    const [deepNetWeight, setDeepNetWeight] = useState<number | "">("");
    const [deepProcessDate, setDeepProcessDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
    const [deepNotes, setDeepNotes] = useState("");

    // Modal state for Traceability backward link in Tab 3
    const [selectedTraceLot, setSelectedTraceLot] = useState<FinishedProductLot | null>(null);

    // Tab 1: Waiting Fresh Packing list
    const waitingFreshList = useMemo(() => {
        return state.gradings.filter((g) => g.freshWeight > 0 && g.freshStatus === "WAITING_PACKAGING");
    }, [state.gradings]);

    // Tab 2: Waiting Deep Processing list
    const waitingProcessedList = useMemo(() => {
        return state.gradings.filter((g) => g.processedWeight > 0 && g.processedStatus === "WAITING_PROCESSING");
    }, [state.gradings]);

    // Filter for Tab 3 (Finished products)
    const [finishedSearch, setFinishedSearch] = useState("");
    const [finishedTypeFilter, setFinishedTypeFilter] = useState("ALL");
    const [finishedStatusFilter, setFinishedStatusFilter] = useState("ALL");

    const filteredFinishedLots = useMemo(() => {
        return state.finishedLots.filter((l) => {
            const matchesSearch =
                l.productCode.toLowerCase().includes(finishedSearch.toLowerCase()) ||
                l.productName.toLowerCase().includes(finishedSearch.toLowerCase()) ||
                l.sellerName.toLowerCase().includes(finishedSearch.toLowerCase()) ||
                l.pucCode.toLowerCase().includes(finishedSearch.toLowerCase());

            const matchesType = finishedTypeFilter === "ALL" || l.type === finishedTypeFilter;
            const matchesStatus = finishedStatusFilter === "ALL" || l.status === finishedStatusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [state.finishedLots, finishedSearch, finishedTypeFilter, finishedStatusFilter]);

    // Calculations for Tab 1 Modal
    const freshLossKg = useMemo(() => {
        const inp = typeof freshInputWeight === "number" ? freshInputWeight : 0;
        const out = typeof freshNetWeight === "number" ? freshNetWeight : 0;
        return Math.max(0, Math.round((inp - out) * 100) / 100);
    }, [freshInputWeight, freshNetWeight]);

    // Auto calculate net weight when spec & count change
    const handleFreshCountChange = (count: number | "") => {
        setFreshPackageCount(count);
        if (typeof count === "number" && count > 0) {
            const kgPerBox = freshPackagingSpec.includes("18") ? 18 : freshPackagingSpec.includes("10") ? 10 : 0;
            if (kgPerBox > 0) {
                setFreshNetWeight(count * kgPerBox);
            }
        }
    };

    // Open Tab 1 Modal
    const handleOpenFreshPacking = (grading: GradingRecord) => {
        setPackingGrading(grading);
        setFreshInputWeight(grading.freshWeight);
        setFreshPackagingSpec("Thùng 18kg");
        const defaultBoxes = Math.floor(grading.freshWeight / 18.5);
        setFreshPackageCount(defaultBoxes);
        setFreshFruitCount(5);
        setFreshNetWeight(defaultBoxes * 18);
        setFreshPackingDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
        setFreshNotes("");
    };

    // Save Tab 1 Fresh Packing
    const handleSaveFreshPacking = (e: React.FormEvent) => {
        e.preventDefault();
        if (!packingGrading) return;

        const inputW = Number(freshInputWeight);
        const netW = Number(freshNetWeight);
        const boxes = Number(freshPackageCount);

        if (inputW <= 0 || netW <= 0 || boxes <= 0) {
            toast({ title: "Thiếu thông tin", description: "Vui lòng nhập đầy đủ khối lượng và số thùng!", variant: "destructive" });
            return;
        }

        try {
            const lot = packFreshLot({
                gradingId: packingGrading.id,
                inputWeightKg: inputW,
                packagingSpec: freshPackagingSpec,
                packageCount: boxes,
                fruitCount: Number(freshFruitCount) || 5,
                netWeightKg: netW,
                completionDate: freshPackingDate,
                notes: freshNotes.trim() || undefined,
            });

            toast({
                title: "Hoàn thành đóng gói Trái tươi!",
                description: `Tạo Lô thành phẩm ${lot.productCode} (${netW.toLocaleString("vi-VN")} kg, ${boxes} thùng) sẵn sàng xuất!`,
                variant: "success",
            });

            setPackingGrading(null);
            setActiveTab("finished");
        } catch (err: unknown) {
            toast({ title: "Lỗi", description: err instanceof Error ? err.message : "Đã có lỗi xảy ra", variant: "destructive" });
        }
    };

    // Calculations for Tab 2 Modal
    const deepYieldPercent = useMemo(() => {
        const inp = typeof deepInputWeight === "number" ? deepInputWeight : 0;
        const out = typeof deepNetWeight === "number" ? deepNetWeight : 0;
        if (inp <= 0) return 0;
        return Math.round((out / inp) * 1000) / 10;
    }, [deepInputWeight, deepNetWeight]);

    const deepLossKg = useMemo(() => {
        const inp = typeof deepInputWeight === "number" ? deepInputWeight : 0;
        const out = typeof deepNetWeight === "number" ? deepNetWeight : 0;
        return Math.max(0, Math.round((inp - out) * 100) / 100);
    }, [deepInputWeight, deepNetWeight]);

    const handleMethodSelect = (method: string) => {
        setDeepMethod(method);
        if (method === "Bóc múi & cấp đông") {
            setDeepProductName("Sầu riêng múi cấp đông IQF");
            setDeepPackagingSpec("Khay 1kg");
            if (typeof deepInputWeight === "number") {
                const estYield = Math.round(deepInputWeight * 0.32);
                setDeepNetWeight(estYield);
                setDeepPackageCount(estYield);
            }
        } else if (method === "Cấp đông nguyên trái") {
            setDeepProductName("Sầu riêng nguyên quả cấp đông");
            setDeepPackagingSpec("Thùng 20kg");
            if (typeof deepInputWeight === "number") {
                setDeepNetWeight(deepInputWeight);
                setDeepPackageCount(Math.floor(deepInputWeight / 20));
            }
        } else if (method === "Sấy thăng hoa") {
            setDeepProductName("Sầu riêng sấy thăng hoa giòn");
            setDeepPackagingSpec("Túi 100g");
            if (typeof deepInputWeight === "number") {
                const estYield = Math.round(deepInputWeight * 0.1);
                setDeepNetWeight(estYield);
                setDeepPackageCount(estYield * 10);
            }
        } else {
            setDeepProductName("Sản phẩm sầu riêng chế biến khác");
            setDeepPackagingSpec("Khác");
        }
    };

    // Open Tab 2 Modal
    const handleOpenDeepProcessing = (grading: GradingRecord) => {
        setProcessingGrading(grading);
        setDeepInputWeight(grading.processedWeight);
        setDeepMethod("Bóc múi & cấp đông");
        setDeepProductName(`Sầu riêng ${grading.durianVariety} múi cấp đông IQF`);
        setDeepPackagingSpec("Khay 1kg");
        const estYield = Math.round(grading.processedWeight * 0.32);
        setDeepNetWeight(estYield);
        setDeepPackageCount(estYield);
        setDeepProcessDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
        setDeepNotes("");
    };

    // Save Tab 2 Deep Processing
    const handleSaveDeepProcessing = (e: React.FormEvent) => {
        e.preventDefault();
        if (!processingGrading) return;

        const inputW = Number(deepInputWeight);
        const netW = Number(deepNetWeight);
        const pkgs = Number(deepPackageCount);

        if (inputW <= 0 || netW <= 0 || pkgs <= 0) {
            toast({ title: "Thiếu thông tin", description: "Vui lòng nhập đầy đủ nguyên liệu, thành phẩm và số gói/khay!", variant: "destructive" });
            return;
        }

        try {
            const lot = processDeepLot({
                gradingId: processingGrading.id,
                inputWeightKg: inputW,
                processingMethod: deepMethod,
                productName: deepProductName,
                packagingSpec: deepPackagingSpec,
                packageCount: pkgs,
                netWeightKg: netW,
                completionDate: deepProcessDate,
                notes: deepNotes.trim() || undefined,
            });

            toast({
                title: "Hoàn thành chế biến!",
                description: `Tạo Lô thành phẩm ${lot.productCode} (${netW.toLocaleString("vi-VN")} kg, tỉ lệ thu hồi ${lot.recoveryRatePercent}%)!`,
                variant: "success",
            });

            setProcessingGrading(null);
            setActiveTab("finished");
        } catch (err: unknown) {
            toast({ title: "Lỗi", description: err instanceof Error ? err.message : "Đã có lỗi xảy ra", variant: "destructive" });
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span>Đang nạp quy trình chế biến & đóng gói...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Chế biến & Đóng gói</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Vận hành sản xuất 2 nhánh: Đóng thùng trái tươi & Chế biến sâu theo phương pháp cụ thể. Tất cả quy tụ tại kho Lô thành phẩm sẵn sàng xuất.
                    </p>
                </div>
            </div>

            {/* 3 Unified Tabs */}
            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1.5 sm:inline-flex">
                <button
                    onClick={() => setActiveTab("fresh")}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === "fresh"
                            ? "bg-white text-emerald-800 shadow-md shadow-slate-200/50"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span>Trái tươi ({waitingFreshList.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("processed")}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === "processed"
                            ? "bg-white text-amber-800 shadow-md shadow-slate-200/50"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <Layers className="h-4 w-4 text-amber-600" />
                    <span>Chế biến khác ({waitingProcessedList.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("finished")}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === "finished"
                            ? "bg-white text-teal-800 shadow-md shadow-slate-200/50"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <PackageCheck className="h-4 w-4 text-teal-600" />
                    <span>Lô thành phẩm ({state.finishedLots.length})</span>
                </button>
            </div>

            {/* TAB 1: TRÁI TƯƠI */}
            {activeTab === "fresh" && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-emerald-950 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-emerald-600" />
                                    Bảng chờ đóng gói Trái tươi
                                </h2>
                                <p className="text-xs text-emerald-800 mt-1">
                                    Dành cho hàng đạt chuẩn đi thẳng sang đóng thùng, không qua chế biến sâu. Sau khi đóng thùng sẽ sinh Lô thành phẩm.
                                </p>
                            </div>
                            <span className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
                                {waitingFreshList.length} lô chờ đóng gói
                            </span>
                        </div>

                        <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-100 bg-white">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-emerald-50/80 text-xs font-bold uppercase tracking-wider text-emerald-900 border-b border-emerald-100">
                                    <tr>
                                        <th className="px-4 py-3">Mã lô PL</th>
                                        <th className="px-4 py-3">Mã TM gốc</th>
                                        <th className="px-4 py-3">Khối lượng đưa vào</th>
                                        <th className="px-4 py-3">Giống</th>
                                        <th className="px-4 py-3">Bên bán & Vườn trồng</th>
                                        <th className="px-4 py-3">Mã vùng trồng (PUC)</th>
                                        <th className="px-4 py-3 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {waitingFreshList.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                                Không có lô trái tươi nào đang chờ đóng gói
                                            </td>
                                        </tr>
                                    ) : (
                                        waitingFreshList.map((g) => (
                                            <tr key={g.id} className="hover:bg-emerald-50/30 transition">
                                                <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                                                    {g.gradingCode}
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-slate-600">{g.purchaseCode}</td>
                                                <td className="px-4 py-3.5 font-mono font-black text-slate-900">
                                                    {g.freshWeight.toLocaleString("vi-VN")} kg
                                                </td>
                                                <td className="px-4 py-3.5 font-medium text-slate-800">{g.durianVariety}</td>
                                                <td className="px-4 py-3.5">
                                                    <span className="font-bold text-slate-900">{g.sellerName}</span>
                                                    <span className="block text-xs text-slate-500">{g.farmName}</span>
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-xs text-brand-700">{g.pucCode}</td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleOpenFreshPacking(g)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition whitespace-nowrap shrink-0"
                                                    >
                                                        <Package className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="whitespace-nowrap">Đóng gói</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: CHẾ BIẾN KHÁC */}
            {activeTab === "processed" && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-amber-950 flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-amber-600" />
                                    Bảng chờ chế biến sâu
                                </h2>
                                <p className="text-xs text-amber-800 mt-1">
                                    Chọn phương pháp cụ thể: <strong>Bóc múi & cấp đông</strong>, <strong>Cấp đông nguyên trái</strong>, <strong>Sấy thăng hoa</strong> hoặc <strong>Khác</strong>. Tự động tính tỉ lệ thu hồi %.
                                </p>
                            </div>
                            <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 whitespace-nowrap shrink-0">
                                {waitingProcessedList.length} lô chờ chế biến
                            </span>
                        </div>

                        <div className="mt-5 overflow-x-auto rounded-2xl border border-amber-100 bg-white">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-amber-50/80 text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-100">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">Mã lô PL</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Mã TM gốc</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Khối lượng nguyên liệu</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Giống</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Bên bán & Vườn trồng</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Mã vùng trồng (PUC)</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {waitingProcessedList.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                                Không có lô nào đang chờ chế biến sâu
                                            </td>
                                        </tr>
                                    ) : (
                                        waitingProcessedList.map((g) => (
                                            <tr key={g.id} className="hover:bg-amber-50/30 transition">
                                                <td className="px-4 py-3.5 font-mono font-bold text-amber-800 whitespace-nowrap">
                                                    {g.gradingCode}
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">{g.purchaseCode}</td>
                                                <td className="px-4 py-3.5 font-mono font-black text-slate-900 whitespace-nowrap">
                                                    {g.processedWeight.toLocaleString("vi-VN")} kg
                                                </td>
                                                <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">{g.durianVariety}</td>
                                                <td className="px-4 py-3.5 min-w-[150px]">
                                                    <span className="font-bold text-slate-900 whitespace-nowrap">{g.sellerName}</span>
                                                    <span className="block text-xs text-slate-500 whitespace-nowrap">{g.farmName}</span>
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-xs text-brand-700 whitespace-nowrap">{g.pucCode}</td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleOpenDeepProcessing(g)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition whitespace-nowrap shrink-0"
                                                    >
                                                        <Factory className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="whitespace-nowrap">Chế biến & Đóng gói</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: LÔ THÀNH PHẨM */}
            {activeTab === "finished" && (
                <div className="space-y-6">
                    {/* Header + Search/Filters */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <PackageCheck className="h-5 w-5 text-teal-600" />
                                    Kho Lô thành phẩm (Gom kết quả cả 2 nhánh)
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Mỗi lô thành phẩm đều lưu vết liên kết ngược: Lô TP ➔ Lô PL ➔ Lô TM ➔ Bên bán / Vườn trồng ➔ Mã vùng trồng (PUC) & Mã CSĐG (PHC).
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={finishedSearch}
                                    onChange={(e) => setFinishedSearch(e.target.value)}
                                    placeholder="Tìm theo mã lô TP, tên sản phẩm, bên bán, PUC..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <select
                                    value={finishedTypeFilter}
                                    onChange={(e) => setFinishedTypeFilter(e.target.value)}
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="ALL">Tất cả loại hình</option>
                                    <option value="FRESH">Trái tươi</option>
                                    <option value="PROCESSED">Chế biến sâu</option>
                                </select>

                                <select
                                    value={finishedStatusFilter}
                                    onChange={(e) => setFinishedStatusFilter(e.target.value)}
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="ALL">Tất cả trạng thái</option>
                                    <option value="READY">Sẵn sàng xuất</option>
                                    <option value="SHIPPED">Đã xuất</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Mã lô TP</th>
                                        <th className="px-4 py-3">Loại</th>
                                        <th className="px-4 py-3">Tên sản phẩm</th>
                                        <th className="px-4 py-3">Khối lượng (kg)</th>
                                        <th className="px-4 py-3">Quy cách</th>
                                        <th className="px-4 py-3">Số thùng/khay</th>
                                        <th className="px-4 py-3">Ngày hoàn tất</th>
                                        <th className="px-4 py-3">Trạng thái</th>
                                        <th className="px-4 py-3 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredFinishedLots.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                                Chưa có lô thành phẩm nào phù hợp
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredFinishedLots.map((lot) => (
                                            <tr key={lot.id} className="hover:bg-slate-50/60 transition">
                                                <td className="px-4 py-3.5 font-mono font-bold text-teal-800">
                                                    {lot.productCode}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {lot.type === "FRESH" ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800 whitespace-nowrap">
                                                            <Sparkles className="h-3 w-3 shrink-0" />
                                                            <span className="whitespace-nowrap">Trái tươi</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800 whitespace-nowrap">
                                                            <Layers className="h-3 w-3 shrink-0" />
                                                            <span className="whitespace-nowrap">Chế biến</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 min-w-[150px]">
                                                    <span className="font-bold text-slate-900 whitespace-nowrap">{lot.productName}</span>
                                                    {lot.processingMethod && (
                                                        <span className="block text-[11px] text-slate-400 whitespace-nowrap">
                                                            PP: {lot.processingMethod}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 font-mono font-black text-slate-900 whitespace-nowrap">
                                                    {lot.netWeightKg.toLocaleString("vi-VN")} kg
                                                </td>
                                                <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">{lot.packagingSpec}</td>
                                                <td className="px-4 py-3.5 font-mono text-slate-800 whitespace-nowrap">
                                                    {lot.packageCount.toLocaleString("vi-VN")} {lot.type === "FRESH" ? "thùng" : "khay/gói"}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{lot.completionDate}</td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {lot.status === "READY" ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-800 whitespace-nowrap">
                                                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                            <span className="whitespace-nowrap">Sẵn sàng xuất</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 whitespace-nowrap">
                                                            <Truck className="h-3 w-3 shrink-0" />
                                                            <span className="whitespace-nowrap">Đã xuất hàng</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                                        <button
                                                            onClick={() => setSelectedTraceLot(lot)}
                                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm whitespace-nowrap shrink-0"
                                                            title="Xem liên kết nguồn gốc ngược"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                            <span className="whitespace-nowrap">Chuỗi truy xuất</span>
                                                        </button>

                                                        {lot.status === "READY" && (
                                                            <Link
                                                                href={`/dashboard/processing/shipments?lotId=${lot.id}`}
                                                                className="inline-flex items-center gap-1 rounded-xl bg-teal-600 hover:bg-teal-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                                                                title="Lập hợp đồng xuất hàng"
                                                            >
                                                                <Truck className="h-3.5 w-3.5 shrink-0" />
                                                                <span className="whitespace-nowrap">Xuất hàng</span>
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: FORM ĐÓNG GÓI TRÁI TƯƠI */}
            {packingGrading && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Đóng gói Trái tươi ({packingGrading.gradingCode})
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Nguyên liệu từ lô thu mua {packingGrading.purchaseCode} ({packingGrading.sellerName})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPackingGrading(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveFreshPacking} className="mt-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                                    <div>
                                        <span className="text-[11px] font-bold text-emerald-800 uppercase">Mã lô phân loại</span>
                                        <p className="font-mono font-bold text-emerald-950 mt-0.5">{packingGrading.gradingCode}</p>
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold text-emerald-800 uppercase">Khối lượng đưa vào (kg)</span>
                                        <input
                                            type="number"
                                            value={freshInputWeight}
                                            onChange={(e) => setFreshInputWeight(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            className="w-full mt-0.5 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-sm font-mono font-bold text-emerald-950"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Quy cách đóng gói</label>
                                        <select
                                            value={freshPackagingSpec}
                                            onChange={(e) => setFreshPackagingSpec(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                        >
                                            <option value="Thùng 18kg">Thùng 18kg (Tiêu chuẩn xuất khẩu)</option>
                                            <option value="Thùng 10kg">Thùng 10kg</option>
                                            <option value="Khác">Quy cách khác</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Số trái / thùng</label>
                                        <input
                                            type="number"
                                            value={freshFruitCount}
                                            onChange={(e) => setFreshFruitCount(e.target.value === "" ? "" : Number(e.target.value))}
                                            placeholder="VD: 5"
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Số lượng thùng hoàn thành *</label>
                                        <input
                                            type="number"
                                            value={freshPackageCount}
                                            onChange={(e) => handleFreshCountChange(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            placeholder="VD: 188"
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Khối lượng thành phẩm (kg) *</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={freshNetWeight}
                                            onChange={(e) => setFreshNetWeight(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            placeholder="VD: 3384"
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-black text-emerald-800"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-600">Hao hụt tự tính:</span>
                                    <span className="font-mono font-bold text-slate-900">{freshLossKg.toLocaleString("vi-VN")} kg</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ngày đóng gói</label>
                                    <input
                                        type="date"
                                        value={freshPackingDate}
                                        onChange={(e) => setFreshPackingDate(e.target.value)}
                                        required
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ghi chú</label>
                                    <textarea
                                        rows={2}
                                        value={freshNotes}
                                        onChange={(e) => setFreshNotes(e.target.value)}
                                        placeholder="Nhập ghi chú độ chín, dán tem QR từng thùng..."
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setPackingGrading(null)}
                                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-700 shadow-md"
                                    >
                                        Hoàn thành đóng gói
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL 2: FORM CHẾ BIẾN KHÁC */}
            {processingGrading && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Ghi nhận Chế biến & Đóng gói ({processingGrading.gradingCode})
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Nguyên liệu từ lô thu mua {processingGrading.purchaseCode} ({processingGrading.durianVariety})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setProcessingGrading(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveDeepProcessing} className="mt-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5">
                                    <div>
                                        <span className="text-[11px] font-bold text-amber-800 uppercase">Mã lô phân loại</span>
                                        <p className="font-mono font-bold text-amber-950 mt-0.5">{processingGrading.gradingCode}</p>
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold text-amber-800 uppercase">Khối lượng nguyên liệu (kg)</span>
                                        <input
                                            type="number"
                                            value={deepInputWeight}
                                            onChange={(e) => setDeepInputWeight(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            className="w-full mt-0.5 rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm font-mono font-bold text-amber-950"
                                        />
                                    </div>
                                </div>

                                {/* Specific processing method */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Phương pháp chế biến cụ thể *</label>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {["Bóc múi & cấp đông", "Cấp đông nguyên trái", "Sấy thăng hoa", "Khác"].map((m) => (
                                            <button
                                                type="button"
                                                key={m}
                                                onClick={() => handleMethodSelect(m)}
                                                className={`rounded-xl border p-2.5 text-xs font-bold text-left transition ${deepMethod === m
                                                        ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-600/20"
                                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Tên sản phẩm đầu ra *</label>
                                        <input
                                            type="text"
                                            value={deepProductName}
                                            onChange={(e) => setDeepProductName(e.target.value)}
                                            required
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Quy cách đóng gói</label>
                                        <select
                                            value={deepPackagingSpec}
                                            onChange={(e) => setDeepPackagingSpec(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                        >
                                            <option value="Khay 1kg">Khay 1kg</option>
                                            <option value="Túi 500g">Túi 500g</option>
                                            <option value="Túi 100g">Túi 100g</option>
                                            <option value="Thùng 5kg">Thùng 5kg</option>
                                            <option value="Thùng 20kg">Thùng 20kg</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Số lượng gói / khay / thùng *</label>
                                        <input
                                            type="number"
                                            value={deepPackageCount}
                                            onChange={(e) => setDeepPackageCount(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            placeholder="VD: 480"
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700">Khối lượng thành phẩm (kg) *</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={deepNetWeight}
                                            onChange={(e) => setDeepNetWeight(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            placeholder="VD: 480"
                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-black text-amber-900"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-bold text-amber-900">Tỉ lệ thu hồi (%):</span>
                                        <p className="text-[11px] text-amber-700">Tự tính = Thành phẩm / Nguyên liệu × 100</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-base font-mono font-black text-amber-950">{deepYieldPercent}%</span>
                                        <span className="block text-[11px] text-slate-500">Hao hụt vỏ/hạt: {deepLossKg.toLocaleString("vi-VN")} kg</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ngày thực hiện</label>
                                    <input
                                        type="date"
                                        value={deepProcessDate}
                                        onChange={(e) => setDeepProcessDate(e.target.value)}
                                        required
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Ghi chú</label>
                                    <textarea
                                        rows={2}
                                        value={deepNotes}
                                        onChange={(e) => setDeepNotes(e.target.value)}
                                        placeholder="Ghi chú quy trình cấp đông, nhiệt độ bảo quản..."
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setProcessingGrading(null)}
                                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-amber-600 px-6 py-2 text-sm font-bold text-white hover:bg-amber-700 shadow-md"
                                    >
                                        Hoàn thành chế biến
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL 3: XEM CHUỖI NGUỒN GỐC NGƯỢC (TRACEABILITY BACKWARD LINK) */}
            {selectedTraceLot && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Chuỗi truy xuất nguồn gốc ngược
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Lô thành phẩm: <strong className="font-mono text-teal-800">{selectedTraceLot.productCode}</strong>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedTraceLot(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="mt-6 space-y-4">
                                {/* Step 1: Thành phẩm */}
                                <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
                                    <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider">
                                        1. Lô thành phẩm
                                    </span>
                                    <h4 className="font-bold text-base text-slate-900 mt-1">{selectedTraceLot.productName}</h4>
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600 font-mono">
                                        <div>Khối lượng: <strong>{selectedTraceLot.netWeightKg.toLocaleString("vi-VN")} kg</strong></div>
                                        <div>Quy cách: <strong>{selectedTraceLot.packagingSpec}</strong></div>
                                        <div>Số lượng: <strong>{selectedTraceLot.packageCount}</strong></div>
                                    </div>
                                </div>

                                {/* Step 2: Lô phân loại */}
                                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                                    <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                                        2. Lô phân loại nguyên liệu
                                    </span>
                                    <div className="mt-1 flex items-center justify-between text-sm">
                                        <span className="font-mono font-bold text-slate-900">{selectedTraceLot.gradingCode}</span>
                                        <span className="text-xs font-semibold text-amber-800">
                                            {selectedTraceLot.type === "FRESH" ? "Nhánh Trái tươi" : "Nhánh Chế biến sâu"}
                                        </span>
                                    </div>
                                </div>

                                {/* Step 3: Lô thu mua */}
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                                        3. Lô thu mua gốc & Nhà vườn
                                    </span>
                                    <div className="mt-1 flex items-center justify-between text-sm">
                                        <span className="font-mono font-bold text-slate-900">{selectedTraceLot.purchaseCode}</span>
                                        <span className="text-xs font-semibold text-slate-700">Giống {selectedTraceLot.durianVariety}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-600">
                                        <p>Bên bán: <strong>{selectedTraceLot.sellerName}</strong></p>
                                        <p className="mt-0.5">Vườn trồng: <strong>{selectedTraceLot.farmName}</strong></p>
                                    </div>
                                </div>

                                {/* Step 4: Mã chuẩn quốc tế PUC + PHC */}
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                                    <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">
                                        4. Định danh quốc tế (GACC / ISO)
                                    </span>
                                    <div className="mt-2 space-y-1.5 text-xs font-mono">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Mã vùng trồng (PUC):</span>
                                            <strong className="text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                                                {selectedTraceLot.pucCode}
                                            </strong>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Mã cơ sở đóng gói (PHC):</span>
                                            <strong className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                {selectedTraceLot.phcCode}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end">
                                <button
                                    onClick={() => setSelectedTraceLot(null)}
                                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
