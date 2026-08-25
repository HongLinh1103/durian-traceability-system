"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, useEffect } from "react";
import {
    ArrowRight,
    Boxes,
    CheckCircle2,
    Factory,
    Pause,
    PauseCircle,
    Play,
    PlayCircle,
    Plus,
    Settings2,
    X,
    XCircle,
    PackageCheck,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    PROCESSING_STEPS_CONFIG,
    REJECT_REMOVAL_REASONS,
    PACKAGING_OPTIONS,
    FREEZING_METHODS,
    FINISHED_QC_RESULTS,
    PRODUCTION_LINES,
    getStatusBadgeVariant,
    calculateYield,
    type ProcessingStepKey,
} from "@/lib/processing-facility";

export type AvailableRawLot = {
    id: string;
    code: string;
    variety: string;
    farmName: string;
    sourceCode: string;
    qualityGrade: string;
    residueResult: string;
    warehouseLocation?: string | null;
    acceptedWeight: number;
    currentWeight: number;
};

export type ProcessingStepItem = {
    id: string;
    stepType: ProcessingStepKey;
    stepOrder: number;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
    startedAt?: string | Date | null;
    completedAt?: string | Date | null;
    inputWeight?: number | null;
    outputWeight?: number | null;
    lossWeight?: number | null;
    performedBy?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown> | null;
};

export type ProcessingBatchItem = {
    id: string;
    batchCode: string;
    method: string;
    targetProduct: string;
    lineName?: string | null;
    startedAt: string | Date;
    completedAt?: string | Date | null;
    totalInputWeight: number;
    totalOutputWeight: number;
    lossWeight: number;
    yieldPercent: number;
    status: string;
    note?: string | null;
    supervisor: string;
    inputs: Array<{
        id: string;
        rawMaterialLotId: string;
        rawMaterialLotCode: string;
        inputWeight: number;
        farmName: string;
        variety?: string;
    }>;
    steps: ProcessingStepItem[];
    finishedLots: Array<{
        id: string;
        lotCode: string;
        productName: string;
        quantity: number;
        netWeight: number;
        remainingWeight: number;
        status: string;
    }>;
};

export function ProcessingBatchManager({
    initialBatches,
    availableRawLots,
    currentUserName,
}: {
    initialBatches: ProcessingBatchItem[];
    availableRawLots: AvailableRawLot[];
    currentUserName?: string;
}) {
    const searchParams = useSearchParams();
    const sourceParam = searchParams.get("source");

    const [batches, setBatches] = useState<ProcessingBatchItem[]>(initialBatches);
    const [rawLots, setRawLots] = useState<AvailableRawLot[]>(availableRawLots);
    const [tab, setTab] = useState("all");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedRawLotId, setSelectedRawLotId] = useState<string>("");

    // Stepper modal states
    const [activeStepBatch, setActiveStepBatch] = useState<ProcessingBatchItem | null>(null);
    const [activeStepType, setActiveStepType] = useState<ProcessingStepKey | null>(null);
    const [viewBatch, setViewBatch] = useState<ProcessingBatchItem | null>(null);

    useEffect(() => {
        if (sourceParam) {
            const found = rawLots.find((lot) => lot.id === sourceParam || lot.code === sourceParam);
            if (found) {
                setSelectedRawLotId(found.id);
                setCreateModalOpen(true);
            }
        }
    }, [sourceParam, rawLots]);

    const activeRawLots = useMemo(
        () => rawLots.filter((lot) => lot.currentWeight > 0),
        [rawLots]
    );

    const filteredBatches = useMemo(() => {
        if (tab === "all") return batches;
        if (tab === "in_progress") return batches.filter((b) => b.status === "IN_PROGRESS");
        if (tab === "paused") return batches.filter((b) => b.status === "PAUSED");
        if (tab === "completed") return batches.filter((b) => b.status === "COMPLETED");
        return batches;
    }, [batches, tab]);

    // Handle Create Batch (Bắt đầu chế biến & Xuất kho NVL)
    const handleCreateBatch = async (data: {
        rawMaterialLotId: string;
        inputWeight: number;
        method: string;
        targetProduct: string;
        lineName: string;
        startedAt: string;
        supervisorName: string;
        note: string;
    }) => {
        setBusy("create");
        setError("");
        setSuccessMessage("");
        try {
            const response = await fetch("/api/processing/batches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!result.success) {
                setError(result.message || "Tạo mẻ chế biến thất bại.");
                setBusy(null);
                return;
            }

            const created = result.data;
            const chosenRawLot = rawLots.find((l) => l.id === data.rawMaterialLotId);

            // Re-fetch batches or construct state
            const initialSteps: ProcessingStepItem[] = PROCESSING_STEPS_CONFIG.map((cfg) => ({
                id: "step-" + cfg.order + "-" + Date.now(),
                stepType: cfg.type,
                stepOrder: cfg.order,
                status: cfg.type === "RAW_MATERIAL_ISSUE" ? "COMPLETED" : cfg.type === "CLEANING" ? "IN_PROGRESS" : "PENDING",
                startedAt: data.startedAt,
                completedAt: cfg.type === "RAW_MATERIAL_ISSUE" ? data.startedAt : null,
                inputWeight: data.inputWeight,
                outputWeight: cfg.type === "RAW_MATERIAL_ISSUE" ? data.inputWeight : null,
                lossWeight: cfg.type === "RAW_MATERIAL_ISSUE" ? 0 : null,
                performedBy: data.supervisorName || currentUserName || "Người phụ trách",
                metadata: {
                    rawMaterialLotCode: chosenRawLot?.code,
                    warehouseLocation: chosenRawLot?.warehouseLocation,
                },
            }));

            const newBatchItem: ProcessingBatchItem = {
                id: created.id,
                batchCode: created.batchCode,
                method: created.method,
                targetProduct: created.targetProduct,
                lineName: data.lineName,
                startedAt: created.startedAt,
                completedAt: null,
                totalInputWeight: Number(created.totalInputWeight),
                totalOutputWeight: 0,
                lossWeight: 0,
                yieldPercent: 0,
                status: created.status,
                note: created.note,
                supervisor: data.supervisorName || currentUserName || "Người phụ trách",
                inputs: [
                    {
                        id: "inp-" + Date.now(),
                        rawMaterialLotId: data.rawMaterialLotId,
                        rawMaterialLotCode: chosenRawLot?.code || "RM-NL",
                        inputWeight: data.inputWeight,
                        farmName: chosenRawLot?.farmName || "Vườn sầu riêng",
                        variety: chosenRawLot?.variety || "Sầu riêng Dona",
                    },
                ],
                steps: initialSteps,
                finishedLots: [],
            };

            setBatches((prev) => [newBatchItem, ...prev]);
            setRawLots((prev) =>
                prev.map((lot) =>
                    lot.id === data.rawMaterialLotId
                        ? { ...lot, currentWeight: Math.max(0, lot.currentWeight - data.inputWeight) }
                        : lot
                )
            );

            setCreateModalOpen(false);
            setSuccessMessage(`Đã khởi tạo thành công mẻ chế biến ${created.batchCode} trên ${data.lineName}!`);
            setTimeout(() => setSuccessMessage(""), 5000);
        } catch {
            setError("Lỗi kết nối máy chủ khi tạo mẻ chế biến.");
        } finally {
            setBusy(null);
        }
    };

    // Handle Batch Status Changes (PAUSE, RESUME, CANCEL)
    const handleBatchAction = async (batchId: string, action: "PAUSE" | "RESUME" | "CANCEL", note?: string) => {
        setBusy(batchId);
        setError("");
        try {
            const response = await fetch(`/api/processing/batches/${batchId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, note }),
            });
            const result = await response.json();
            if (!result.success) {
                alert(result.message || "Thao tác không thành công.");
                setBusy(null);
                return;
            }

            const updatedStatus = result.data.status;
            setBatches((prev) =>
                prev.map((b) => (b.id === batchId ? { ...b, status: updatedStatus } : b))
            );
        } catch {
            alert("Lỗi kết nối khi cập nhật mẻ chế biến.");
        } finally {
            setBusy(null);
        }
    };

    // Handle Step Execution (Submit Step Form)
    const handleExecuteStep = async (
        batchId: string,
        stepType: ProcessingStepKey,
        data: {
            startedAt?: string;
            completedAt?: string;
            inputWeight?: number;
            outputWeight?: number;
            lossWeight?: number;
            note?: string;
            metadata?: Record<string, unknown>;
        }
    ) => {
        setBusy(batchId + "-" + stepType);
        setError("");
        try {
            const response = await fetch(`/api/processing/batches/${batchId}/steps/${stepType}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "COMPLETE", ...data }),
            });
            const result = await response.json();
            if (!result.success) {
                setError(result.message || "Thực hiện công đoạn thất bại.");
                setBusy(null);
                return;
            }

            const { step: updatedStep, finishedLot } = result.data;

            // Update batch in local state
            setBatches((prev) =>
                prev.map((b) => {
                    if (b.id !== batchId) return b;

                    const nextSteps = b.steps.map((s) => {
                        if (s.stepType === stepType) {
                            return {
                                ...s,
                                status: "COMPLETED" as const,
                                startedAt: data.startedAt || s.startedAt,
                                completedAt: data.completedAt || new Date().toISOString(),
                                inputWeight: data.inputWeight ?? s.inputWeight,
                                outputWeight: data.outputWeight ?? s.outputWeight,
                                lossWeight: data.lossWeight ?? s.lossWeight,
                                note: data.note ?? s.note,
                                metadata: data.metadata ?? s.metadata,
                            };
                        }
                        // If next step, activate it to IN_PROGRESS
                        if (s.stepOrder === updatedStep.stepOrder + 1 && s.status === "PENDING") {
                            return {
                                ...s,
                                status: "IN_PROGRESS" as const,
                                startedAt: data.completedAt || new Date().toISOString(),
                                inputWeight: data.outputWeight ?? s.inputWeight,
                            };
                        }
                        return s;
                    });

                    // If step was Step 9 (Nhập kho TP), batch becomes COMPLETED
                    if (stepType === "FINISHED_PRODUCT_WAREHOUSE_IN" && finishedLot) {
                        const totalIn = b.totalInputWeight;
                        const finalOut = Number(data.outputWeight || 0);
                        const { lossWeight: totalLoss, yieldPercent } = calculateYield(totalIn, finalOut);

                        return {
                            ...b,
                            status: "COMPLETED",
                            completedAt: data.completedAt || new Date().toISOString(),
                            totalOutputWeight: finalOut,
                            lossWeight: totalLoss,
                            yieldPercent,
                            steps: nextSteps,
                            finishedLots: [
                                {
                                    id: finishedLot.id,
                                    lotCode: finishedLot.lotCode,
                                    productName: finishedLot.productName,
                                    quantity: Number(finishedLot.quantity),
                                    netWeight: Number(finishedLot.netWeight),
                                    remainingWeight: Number(finishedLot.remainingWeight),
                                    status: finishedLot.status,
                                },
                            ],
                        };
                    }

                    return { ...b, steps: nextSteps };
                })
            );

            setActiveStepBatch(null);
            setActiveStepType(null);

            const cfg = PROCESSING_STEPS_CONFIG.find((c) => c.type === stepType);
            if (stepType === "FINISHED_PRODUCT_WAREHOUSE_IN" && finishedLot) {
                setSuccessMessage(
                    `Chúc mừng! Mẻ chế biến đã hoàn tất toàn bộ 9 công đoạn. Lô thành phẩm ${finishedLot.lotCode} (${Number(
                        finishedLot.netWeight
                    ).toLocaleString("vi-VN")} kg) đã nhập kho thành công!`
                );
            } else {
                setSuccessMessage(`Đã hoàn tất công đoạn ${cfg?.name || stepType}! Công đoạn tiếp theo đã sẵn sàng.`);
            }
            setTimeout(() => setSuccessMessage(""), 6000);
        } catch {
            setError("Lỗi kết nối máy chủ khi lưu công đoạn.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-6">
            {successMessage && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <Link
                        href="/dashboard/processing/finished-products"
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
                    >
                        Xem Thành phẩm <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            )}

            {/* SECTION 1: NGUYÊN LIỆU SẴN SÀNG CHẾ BIẾN (Section XVII) */}
            <section className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 via-white to-brand-50/30 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                <Boxes className="h-4 w-4" />
                            </span>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Nguyên liệu sẵn sàng chế biến
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Các lô nguyên liệu đã tiếp nhận, QC đạt điều kiện và đang lưu kho chờ sản xuất.
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setSelectedRawLotId("");
                            setError("");
                            setCreateModalOpen(true);
                        }}
                        className="rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm"
                    >
                        <Plus className="mr-1.5 h-4 w-4" /> Tạo lô chế biến
                    </Button>
                </div>

                {activeRawLots.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {activeRawLots.map((lot) => (
                            <article
                                key={lot.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2 border-b pb-2">
                                    <div>
                                        <p className="text-xs font-bold font-mono text-brand-700">{lot.code}</p>
                                        <h3 className="font-bold text-sm text-slate-900 truncate" title={lot.variety}>
                                            {lot.variety}
                                        </h3>
                                    </div>
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                        <CheckCircle2 className="h-3 w-3" /> QC Đạt
                                    </span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Khối lượng khả dụng:</span>
                                        <b className="text-emerald-700 text-sm font-black">
                                            {lot.currentWeight.toLocaleString("vi-VN")} kg
                                        </b>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Nguồn:</span>
                                        <span className="font-medium text-slate-700 truncate max-w-[140px]" title={lot.farmName}>
                                            {lot.farmName}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Kho lưu:</span>
                                        <span className="font-medium text-slate-700">
                                            {lot.warehouseLocation || "KHO-NVL-01"}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setSelectedRawLotId(lot.id);
                                        setError("");
                                        setCreateModalOpen(true);
                                    }}
                                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                >
                                    Tạo lô chế biến
                                </Button>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-xs text-slate-500">
                        Chưa có lô nguyên liệu khả dụng nào đã QC đạt. Vui lòng vào trang{" "}
                        <Link href="/dashboard/processing/raw-materials" className="font-bold text-brand-600 hover:underline">
                            Nguyên liệu
                        </Link>{" "}
                        để tiếp nhận và thực hiện QC trước.
                    </div>
                )}
            </section>

            {/* SECTION 2: 4 KPIS (Section XVI) */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <MetricCard icon={Factory} label="Tổng lô chế biến" value={batches.length} variant="slate" />
                <MetricCard
                    icon={PlayCircle}
                    label="Đang chế biến"
                    value={batches.filter((lot) => lot.status === "IN_PROGRESS").length}
                    variant="sky"
                />
                <MetricCard
                    icon={PauseCircle}
                    label="Tạm dừng"
                    value={batches.filter((lot) => lot.status === "PAUSED").length}
                    variant="amber"
                />
                <MetricCard
                    icon={Settings2}
                    label="Hoàn tất"
                    value={batches.filter((lot) => lot.status === "COMPLETED").length}
                    variant="emerald"
                />
            </section>

            {/* SECTION 3: DANH SÁCH LÔ CHẾ BIẾN & DÂY CHUYỀN 9 BƯỚC */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex flex-wrap gap-2">
                        {[
                            ["all", "Tất cả"],
                            ["in_progress", "Đang chế biến"],
                            ["paused", "Tạm dừng"],
                            ["completed", "Hoàn tất"],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`rounded-full px-4 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                                    tab === key
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4">
                    {filteredBatches.map((lot) => {
                        const badge = getStatusBadgeVariant(lot.status);
                        const isRunning = lot.status === "IN_PROGRESS";
                        const isPaused = lot.status === "PAUSED";
                        const isDone = lot.status === "COMPLETED";

                        const completedStepsCount = lot.steps.filter((s) => s.status === "COMPLETED").length;
                        const currentStep =
                            lot.steps.find((s) => s.status === "IN_PROGRESS") ||
                            lot.steps.find((s) => s.status === "PENDING") ||
                            lot.steps[lot.steps.length - 1];

                        const progressPercent = Math.round((completedStepsCount / 9) * 100);
                        const currentStepConfig = PROCESSING_STEPS_CONFIG.find((c) => c.type === currentStep?.stepType);

                        return (
                            <article
                                key={lot.id}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition space-y-4"
                            >
                                {/* HEADER CARD */}
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-mono font-bold tracking-wide text-brand-700">
                                                {lot.batchCode}
                                            </p>
                                            <span
                                                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-0.5 text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                                            >
                                                {badge.label}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                                {lot.lineName || "Dây chuyền 1"}
                                            </span>
                                        </div>
                                        <h3 className="mt-1.5 text-lg font-black text-slate-900">
                                            {lot.targetProduct}
                                        </h3>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Phương pháp: <b className="text-slate-700">{lot.method}</b> · Nguồn:{" "}
                                            <span className="font-semibold text-emerald-800">
                                                {lot.inputs.map((i) => i.rawMaterialLotCode).join(", ")}
                                            </span>
                                        </p>
                                    </div>

                                    {/* PROGRESS KPI */}
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-500">
                                            Tiến độ: <b className="text-brand-700 font-black">{completedStepsCount} / 9</b> công đoạn
                                        </p>
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <div className="h-2.5 w-32 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${
                                                        isDone ? "bg-emerald-600" : "bg-brand-600"
                                                    }`}
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-black text-slate-800">{progressPercent}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* STEPPER PREVIEW (9 STEPS) */}
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                        <span>Dây chuyền 9 công đoạn chế biến:</span>
                                        {currentStepConfig && !isDone && (
                                            <span className="text-brand-700">
                                                Đang thực hiện: <b>{currentStepConfig.name}</b>
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 pt-1">
                                        {PROCESSING_STEPS_CONFIG.map((cfg) => {
                                            const stepState = lot.steps.find((s) => s.stepType === cfg.type);
                                            const isStepDone = stepState?.status === "COMPLETED";
                                            const isStepActive = stepState?.status === "IN_PROGRESS";

                                            return (
                                                <div
                                                    key={cfg.type}
                                                    title={`${cfg.order}. ${cfg.name} (${stepState?.status || "PENDING"})`}
                                                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center text-[10px] border transition ${
                                                        isStepDone
                                                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                                                            : isStepActive
                                                            ? "bg-sky-50 border-sky-300 text-sky-800 font-black ring-2 ring-sky-400/30 animate-pulse"
                                                            : "bg-white border-slate-200 text-slate-400 font-medium"
                                                    }`}
                                                >
                                                    <span className="text-xs mb-0.5">
                                                        {isStepDone ? "✓" : isStepActive ? "⚙" : cfg.order}
                                                    </span>
                                                    <span className="truncate w-full">{cfg.shortName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* METRICS SUMMARY */}
                                <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Đầu vào (Input)</dt>
                                        <dd className="mt-1 text-sm font-black text-slate-800">
                                            {lot.totalInputWeight.toLocaleString("vi-VN")} kg
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Bắt đầu / Giám sát</dt>
                                        <dd className="mt-1 text-xs font-bold text-slate-700">
                                            {new Date(lot.startedAt).toLocaleString("vi-VN")}
                                            <br />
                                            <span className="text-slate-500 font-normal">{lot.supervisor}</span>
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">
                                            {isDone ? "Đầu ra thành phẩm" : "Hao hụt ước tính"}
                                        </dt>
                                        <dd className="mt-1 text-sm font-black text-emerald-700">
                                            {isDone
                                                ? `${lot.totalOutputWeight.toLocaleString("vi-VN")} kg`
                                                : `${lot.steps.reduce((sum, s) => sum + (s.lossWeight || 0), 0).toLocaleString("vi-VN")} kg`}
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">
                                            {isDone ? "Hiệu suất (Yield)" : "Trạng thái mẻ"}
                                        </dt>
                                        <dd className="mt-1 text-xs font-bold text-slate-800">
                                            {isDone ? `${lot.yieldPercent}%` : badge.label}
                                        </dd>
                                    </div>
                                </dl>

                                {/* FINISHED PRODUCT LOT BADGE IF COMPLETED */}
                                {lot.finishedLots.length > 0 && (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2">
                                            <PackageCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                                            <span>
                                                Lô thành phẩm:{" "}
                                                <b className="font-mono text-emerald-900">
                                                    {lot.finishedLots.map((f) => f.lotCode).join(", ")}
                                                </b>{" "}
                                                ({lot.finishedLots.map((f) => f.netWeight).reduce((a, b) => a + b, 0).toLocaleString("vi-VN")}{" "}
                                                kg)
                                            </span>
                                        </div>
                                        <Link
                                            href="/dashboard/processing/finished-products"
                                            className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                                        >
                                            Xem lô thành phẩm <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                )}

                                {/* ACTION BUTTONS */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold"
                                        onClick={() => setViewBatch(lot)}
                                    >
                                        Xem chi tiết & Dây chuyền
                                    </Button>

                                    {isRunning && currentStep && currentStep.stepType !== "RAW_MATERIAL_ISSUE" && (
                                        <Button
                                            size="sm"
                                            className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm"
                                            onClick={() => {
                                                setError("");
                                                setActiveStepBatch(lot);
                                                setActiveStepType(currentStep.stepType);
                                            }}
                                        >
                                            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Thực hiện bước:{" "}
                                            {currentStepConfig?.name || currentStep.stepType}
                                        </Button>
                                    )}

                                    {isRunning && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl text-amber-700 border-amber-200 hover:bg-amber-50 font-bold"
                                            disabled={busy === lot.id}
                                            onClick={() => handleBatchAction(lot.id, "PAUSE")}
                                        >
                                            <Pause className="mr-1 h-3.5 w-3.5" /> Tạm dừng
                                        </Button>
                                    )}

                                    {isPaused && (
                                        <>
                                            <Button
                                                size="sm"
                                                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold"
                                                disabled={busy === lot.id}
                                                onClick={() => handleBatchAction(lot.id, "RESUME")}
                                            >
                                                <Play className="mr-1 h-3.5 w-3.5" /> Tiếp tục chế biến
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-xl text-rose-700 border-rose-200 hover:bg-rose-50"
                                                disabled={busy === lot.id}
                                                onClick={() => {
                                                    if (confirm("Bạn có chắc chắn muốn hủy mẻ này? Khối lượng nguyên liệu chưa chế biến sẽ được hoàn trả.")) {
                                                        handleBatchAction(lot.id, "CANCEL", "Hủy từ bảng điều khiển");
                                                    }
                                                }}
                                            >
                                                <XCircle className="mr-1 h-3.5 w-3.5" /> Hủy mẻ
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </article>
                        );
                    })}

                    {!filteredBatches.length && (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                            Chưa có lô chế biến nào trong nhóm này.
                        </div>
                    )}
                </div>
            </section>

            {/* MODAL: TẠO LÔ CHẾ BIẾN (Section XVIII) */}
            {createModalOpen && (
                <CreateBatchModal
                    availableLots={activeRawLots}
                    preselectedLotId={selectedRawLotId}
                    currentUserName={currentUserName}
                    busy={busy === "create"}
                    error={error}
                    onClose={() => setCreateModalOpen(false)}
                    onSubmit={handleCreateBatch}
                />
            )}

            {/* MODAL: THỰC HIỆN TỪNG CÔNG ĐOẠN (9 Steps Form) */}
            {activeStepBatch && activeStepType && (
                <StepExecutionModal
                    batch={activeStepBatch}
                    stepType={activeStepType}
                    busy={busy === `${activeStepBatch.id}-${activeStepType}`}
                    error={error}
                    currentUserName={currentUserName}
                    onClose={() => {
                        setActiveStepBatch(null);
                        setActiveStepType(null);
                    }}
                    onSubmit={(data) => handleExecuteStep(activeStepBatch.id, activeStepType, data)}
                />
            )}

            {/* MODAL: XEM CHI TIẾT LÔ CHẾ BIẾN & STEPPER TỔNG THỂ */}
            {viewBatch && (
                <BatchDetailModal
                    batch={viewBatch}
                    onClose={() => setViewBatch(null)}
                    onOpenStep={(stepType) => {
                        const target = viewBatch;
                        setViewBatch(null);
                        setActiveStepBatch(target);
                        setActiveStepType(stepType);
                    }}
                />
            )}
        </div>
    );
}

// ---------------------- SUB-MODAL COMPONENTS ----------------------

function CreateBatchModal({
    availableLots,
    preselectedLotId,
    currentUserName,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    availableLots: AvailableRawLot[];
    preselectedLotId?: string;
    currentUserName?: string;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (data: {
        rawMaterialLotId: string;
        inputWeight: number;
        method: string;
        targetProduct: string;
        lineName: string;
        startedAt: string;
        supervisorName: string;
        note: string;
    }) => void;
}) {
    const [rawLotId, setRawLotId] = useState(preselectedLotId || availableLots[0]?.id || "");
    const selectedLot = availableLots.find((l) => l.id === rawLotId);

    const [inputWeight, setInputWeight] = useState(
        selectedLot ? String(selectedLot.currentWeight) : "0"
    );
    const [method, setMethod] = useState("Tách múi & Cấp đông nhanh (IQF)");
    const [lineName, setLineName] = useState<string>(PRODUCTION_LINES[0]);
    const [targetProduct, setTargetProduct] = useState(
        selectedLot ? `${selectedLot.variety} tách múi cấp đông` : "Sầu riêng Dona tách múi cấp đông"
    );
    const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [supervisorName, setSupervisorName] = useState(currentUserName || "");
    const [note, setNote] = useState("");

    const handleLotChange = (newId: string) => {
        setRawLotId(newId);
        const lot = availableLots.find((l) => l.id === newId);
        if (lot) {
            setInputWeight(String(lot.currentWeight));
            setTargetProduct(`${lot.variety} tách múi cấp đông`);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit({
            rawMaterialLotId: rawLotId,
            inputWeight: Number(inputWeight) || 0,
            method,
            targetProduct,
            lineName,
            startedAt,
            supervisorName,
            note,
        });
    };

    return (
        <Modal title="TẠO LÔ CHẾ BIẾN" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
                        {error}
                    </p>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Nguồn nguyên liệu *
                    </label>
                    <select
                        value={rawLotId}
                        onChange={(e) => handleLotChange(e.target.value)}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    >
                        <option value="">-- Chọn lô nguyên liệu đã QC --</option>
                        {availableLots.map((lot) => (
                            <option key={lot.id} value={lot.id}>
                                {lot.code} · {lot.variety} ({lot.currentWeight.toLocaleString("vi-VN")} kg khả dụng)
                            </option>
                        ))}
                    </select>
                </div>

                {selectedLot && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Vườn nguồn:</span>
                            <b className="text-slate-800">{selectedLot.farmName}</b>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Phân hạng / Kho:</span>
                            <b className="text-slate-800">
                                {selectedLot.qualityGrade} · {selectedLot.warehouseLocation || "KHO-NVL-01"}
                            </b>
                        </div>
                        <div className="flex justify-between text-sm pt-1 border-t border-emerald-100">
                            <span className="font-bold text-emerald-800">Khối lượng khả dụng:</span>
                            <b className="font-black text-brand-700">
                                {selectedLot.currentWeight.toLocaleString("vi-VN")} kg
                            </b>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Khối lượng xuất kho cho chế biến (kg) *
                    </label>
                    <input
                        type="number"
                        min="0.1"
                        max={selectedLot?.currentWeight}
                        step="0.1"
                        value={inputWeight}
                        onChange={(e) => setInputWeight(e.target.value)}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-black text-brand-700 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                        Tối đa {selectedLot ? `${selectedLot.currentWeight.toLocaleString("vi-VN")} kg` : "0 kg"}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Dây chuyền sản xuất *
                        </label>
                        <select
                            value={lineName}
                            onChange={(e) => setLineName(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        >
                            {PRODUCTION_LINES.map((line) => (
                                <option key={line} value={line}>
                                    {line}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Phương pháp chế biến *
                        </label>
                        <input
                            type="text"
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Sản phẩm mục tiêu *
                    </label>
                    <input
                        type="text"
                        value={targetProduct}
                        onChange={(e) => setTargetProduct(e.target.value)}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Ngày giờ xuất kho & bắt đầu *
                        </label>
                        <input
                            type="datetime-local"
                            value={startedAt}
                            onChange={(e) => setStartedAt(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Người phụ trách
                        </label>
                        <input
                            type="text"
                            value={supervisorName}
                            onChange={(e) => setSupervisorName(e.target.value)}
                            placeholder="Người giám sát"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Ghi chú
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Ghi chú quy trình hoặc thông số vận hành..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        disabled={busy || !selectedLot || Number(inputWeight) <= 0}
                        className="flex-1 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold"
                    >
                        {busy ? "Đang khởi tạo..." : "Xuất kho & Bắt đầu chế biến"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function StepExecutionModal({
    batch,
    stepType,
    busy,
    error,
    currentUserName,
    onClose,
    onSubmit,
}: {
    batch: ProcessingBatchItem;
    stepType: ProcessingStepKey;
    busy: boolean;
    error: string;
    currentUserName?: string;
    onClose: () => void;
    onSubmit: (data: {
        startedAt?: string;
        completedAt?: string;
        inputWeight?: number;
        outputWeight?: number;
        lossWeight?: number;
        note?: string;
        metadata?: Record<string, unknown>;
    }) => void;
}) {
    const stepConfig = PROCESSING_STEPS_CONFIG.find((c) => c.type === stepType);
    const existingStep = batch.steps.find((s) => s.stepType === stepType);

    // Compute default input weight from previous step output or batch totalInputWeight
    const prevStep = batch.steps.find((s) => s.stepOrder === (stepConfig?.order ?? 1) - 1);
    const defaultInput = Number(prevStep?.outputWeight ?? existingStep?.inputWeight ?? batch.totalInputWeight);

    // Common fields
    const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [completedAt, setCompletedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [performedBy, setPerformedBy] = useState(currentUserName || "Người vận hành");
    const [note, setNote] = useState("");

    // Step 2: CLEANING
    const [cleaningOutput, setCleaningOutput] = useState(String(defaultInput * 0.98));

    // Step 3: PEELING_PULP_SEPARATION
    const [pulpWeight, setPulpWeight] = useState(String((defaultInput * 0.75).toFixed(1).replace(/\.0$/, "")));
    const [peelWeight, setPeelWeight] = useState(String((defaultInput * 0.25).toFixed(1).replace(/\.0$/, "")));

    // Step 4: REJECT_REMOVAL
    const [rejectWeight, setRejectWeight] = useState("0");
    const [rejectReason, setRejectReason] = useState<string>(REJECT_REMOVAL_REASONS[0]);

    // Step 5: FINAL_WEIGHING
    const [finalWeight, setFinalWeight] = useState(String(defaultInput));

    // Step 6: PACKAGING
    const [packagingSpec, setPackagingSpec] = useState<string>(PACKAGING_OPTIONS[1]); // 500g/túi
    const [packageCount, setPackageCount] = useState(String(Math.round(defaultInput / 0.5)));
    const [packagingType, setPackagingType] = useState("Túi PA/PE hút chân không");

    // Step 7: FREEZING
    const [freezingMethod, setFreezingMethod] = useState<string>(FREEZING_METHODS[0]);
    const [targetTemperature, setTargetTemperature] = useState("-18°C");
    const [actualTemperature, setActualTemperature] = useState("-19°C");
    const [freezingResult, setFreezingResult] = useState("Đạt");

    // Step 8: FINISHED_PRODUCT_QC
    const [qcResult, setQcResult] = useState<string>(FINISHED_QC_RESULTS[0]);
    const [appearance, setAppearance] = useState("Múi vàng đều, không sượng");
    const [color, setColor] = useState("Vàng tươi đặc trưng");
    const [odor, setOdor] = useState("Thơm nồng tự nhiên");
    const [packagingQuality, setPackagingQuality] = useState("Kín, hút chân không đạt");
    const [netWeightChecked, setNetWeightChecked] = useState("Đạt chuẩn 500g ± 5g");
    const [storageTempChecked, setStorageTempChecked] = useState("Âm sâu ≤ -18°C");
    const [microbiologyResult, setMicrobiologyResult] = useState("Đạt tiêu chuẩn an toàn thực phẩm");
    const [testCertCode, setTestCertCode] = useState("");

    // Step 9: FINISHED_PRODUCT_WAREHOUSE_IN
    const [productName, setProductName] = useState(batch.targetProduct);
    const [warehouseLocation, setWarehouseLocation] = useState("KHO-TP-01");
    const [warehouseShelve, setWarehouseShelve] = useState("Kệ Đông A-01");
    const [storageCondition, setStorageCondition] = useState("Âm sâu -18°C");
    const [expiryDate, setExpiryDate] = useState(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().slice(0, 10);
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const inputWeight = defaultInput;
        let outputWeight = defaultInput;
        let lossWeight = 0;
        let metadata: Record<string, unknown> = { performedBy };

        if (stepType === "CLEANING") {
            outputWeight = Number(cleaningOutput) || defaultInput;
            lossWeight = Math.max(0, inputWeight - outputWeight);
            metadata = { ...metadata, cleaningMethod: "Rửa sục khí Ozone & diệt khuẩn" };
        } else if (stepType === "PEELING_PULP_SEPARATION") {
            outputWeight = Number(pulpWeight) || defaultInput;
            lossWeight = Number(peelWeight) || Math.max(0, inputWeight - outputWeight);
            metadata = { ...metadata, pulpWeight: outputWeight, peelWeight: lossWeight };
        } else if (stepType === "REJECT_REMOVAL") {
            const rej = Number(rejectWeight) || 0;
            outputWeight = Math.max(0, inputWeight - rej);
            lossWeight = rej;
            metadata = { ...metadata, rejectedWeight: rej, rejectionReason: rejectReason };
        } else if (stepType === "FINAL_WEIGHING") {
            outputWeight = Number(finalWeight) || defaultInput;
            lossWeight = Math.max(0, inputWeight - outputWeight);
            metadata = { ...metadata, actualWeighedWeight: outputWeight };
        } else if (stepType === "PACKAGING") {
            outputWeight = defaultInput;
            lossWeight = 0;
            metadata = {
                ...metadata,
                packagingSpec,
                packageCount: Number(packageCount) || 0,
                packagingType,
            };
        } else if (stepType === "FREEZING") {
            if (freezingResult === "Không đạt") {
                alert("Kết quả cấp đông không đạt. Vui lòng xử lý nhiệt độ trước khi chuyển tiếp công đoạn.");
                return;
            }
            outputWeight = defaultInput;
            lossWeight = 0;
            metadata = {
                ...metadata,
                freezingMethod,
                targetTemperature,
                actualTemperature,
                freezingResult,
            };
        } else if (stepType === "FINISHED_PRODUCT_QC") {
            if (qcResult === "Không đạt") {
                alert("QC thành phẩm không đạt. Không thể nhập kho thành phẩm.");
                return;
            }
            outputWeight = defaultInput;
            lossWeight = 0;
            metadata = {
                ...metadata,
                result: qcResult === "Đạt" ? "PASSED" : qcResult === "Đạt có điều kiện" ? "CONDITIONAL" : "FAILED",
                appearance,
                color,
                odor,
                packagingQuality,
                netWeightChecked,
                storageTemperatureChecked: storageTempChecked,
                microbiologyResult,
                testCertificateCode: testCertCode,
            };
        } else if (stepType === "FINISHED_PRODUCT_WAREHOUSE_IN") {
            outputWeight = defaultInput;
            lossWeight = 0;
            metadata = {
                ...metadata,
                productName,
                packaging: packagingSpec,
                packageCount: Number(packageCount) || 0,
                warehouseLocation: `${warehouseLocation} (${warehouseShelve})`,
                storageCondition,
                expiryDate,
            };
        }

        onSubmit({
            startedAt,
            completedAt,
            inputWeight,
            outputWeight,
            lossWeight,
            note: note.trim(),
            metadata,
        });
    };

    return (
        <Modal title={`CÔNG ĐOẠN: ${stepConfig?.name || stepType}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700">
                        {error}
                    </p>
                )}

                <div className="rounded-2xl border bg-slate-50 p-3.5 text-xs space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Mã mẻ chế biến:</span>
                        <b className="font-mono text-brand-700">{batch.batchCode}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Sản phẩm mục tiêu:</span>
                        <b className="text-slate-800">{batch.targetProduct}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Khối lượng đầu vào công đoạn:</span>
                        <b className="text-emerald-700 font-bold">{defaultInput.toLocaleString("vi-VN")} kg</b>
                    </div>
                </div>

                {/* FORM FIELDS BY STEP TYPE */}

                {/* STEP 2: LÀM SẠCH */}
                {stepType === "CLEANING" && (
                    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase text-brand-700">Thông số làm sạch</legend>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                Khối lượng sau làm sạch (kg) *
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max={defaultInput}
                                value={cleaningOutput}
                                onChange={(e) => setCleaningOutput(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-black text-emerald-700 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-slate-400">
                                Hao hụt ước tính:{" "}
                                <b className="text-rose-700">
                                    {Math.max(0, defaultInput - (Number(cleaningOutput) || 0)).toFixed(1)} kg
                                </b>
                            </p>
                        </div>
                    </fieldset>
                )}

                {/* STEP 3: TÁCH VỎ - TÁCH MÚI */}
                {stepType === "PEELING_PULP_SEPARATION" && (
                    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase text-brand-700">Tách vỏ & Tách múi</legend>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                Khối lượng múi thu được (kg) *
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max={defaultInput}
                                value={pulpWeight}
                                onChange={(e) => {
                                    setPulpWeight(e.target.value);
                                    const num = Number(e.target.value) || 0;
                                    setPeelWeight(Math.max(0, defaultInput - num).toFixed(1));
                                }}
                                required
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-black text-emerald-700 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                Khối lượng vỏ / hạt / phần bỏ (kg)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={peelWeight}
                                onChange={(e) => setPeelWeight(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-rose-700 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </fieldset>
                )}

                {/* STEP 4: LOẠI BỎ PHẦN KHÔNG ĐẠT */}
                {stepType === "REJECT_REMOVAL" && (
                    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase text-brand-700">Loại bỏ khuyết tật</legend>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                Khối lượng loại bỏ (kg) *
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max={defaultInput}
                                value={rejectWeight}
                                onChange={(e) => setRejectWeight(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-rose-700 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Khối lượng còn đạt chuẩn:{" "}
                                <b className="text-emerald-700 font-bold">
                                    {Math.max(0, defaultInput - (Number(rejectWeight) || 0)).toFixed(1)} kg
                                </b>
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                Lý do loại bỏ *
                            </label>
                            <select
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                {REJECT_REMOVAL_REASONS.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </fieldset>
                )}

                {/* STEP 5: CÂN THÀNH PHẨM */}
                {stepType === "FINAL_WEIGHING" && (
                    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase text-brand-700">Cân định lượng</legend>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                Khối lượng thành phẩm thực tế (kg) *
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={finalWeight}
                                onChange={(e) => setFinalWeight(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-black text-emerald-700 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-slate-400">
                                Chênh lệch: {Math.abs(defaultInput - (Number(finalWeight) || 0)).toFixed(1)} kg
                            </p>
                        </div>
                    </fieldset>
                )}

                {/* STEP 6: ĐÓNG GÓI */}
                {stepType === "PACKAGING" && (
                    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase text-brand-700">Quy cách đóng gói</legend>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                    Quy cách đóng gói *
                                </label>
                                <select
                                    value={packagingSpec}
                                    onChange={(e) => {
                                        setPackagingSpec(e.target.value);
                                        const weightPerPack = e.target.value.includes("250g")
                                            ? 0.25
                                            : e.target.value.includes("500g")
                                            ? 0.5
                                            : e.target.value.includes("1kg")
                                            ? 1.0
                                            : 5.0;
                                        setPackageCount(String(Math.round(defaultInput / weightPerPack)));
                                    }}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                >
                                    {PACKAGING_OPTIONS.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                    Số lượng gói / thùng *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={packageCount}
                                    onChange={(e) => setPackageCount(e.target.value)}
                                    required
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                Loại bao bì
                            </label>
                            <input
                                type="text"
                                value={packagingType}
                                onChange={(e) => setPackagingType(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </fieldset>
                )}

                {/* STEP 7: CẤP ĐÔNG */}
                {stepType === "FREEZING" && (
                    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase text-brand-700">Thông số cấp đông</legend>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                    Phương pháp *
                                </label>
                                <select
                                    value={freezingMethod}
                                    onChange={(e) => setFreezingMethod(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                >
                                    {FREEZING_METHODS.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                    Kết quả cấp đông *
                                </label>
                                <select
                                    value={freezingResult}
                                    onChange={(e) => setFreezingResult(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                >
                                    <option value="Đạt">Đạt</option>
                                    <option value="Không đạt">Không đạt</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                    Nhiệt độ mục tiêu
                                </label>
                                <input
                                    type="text"
                                    value={targetTemperature}
                                    onChange={(e) => setTargetTemperature(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                    Nhiệt độ thực tế khi hoàn tất
                                </label>
                                <input
                                    type="text"
                                    value={actualTemperature}
                                    onChange={(e) => setActualTemperature(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-emerald-700 shadow-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </fieldset>
                )}

                {/* STEP 8: QC THÀNH PHẨM */}
                {stepType === "FINISHED_PRODUCT_QC" && (
                    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase text-brand-700">Đánh giá QC thành phẩm</legend>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                                Kết quả QC thành phẩm *
                            </label>
                            <select
                                value={qcResult}
                                onChange={(e) => setQcResult(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                {FINISHED_QC_RESULTS.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Ngoại quan</label>
                                <input
                                    type="text"
                                    value={appearance}
                                    onChange={(e) => setAppearance(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Màu sắc</label>
                                <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Mùi vị</label>
                                <input
                                    type="text"
                                    value={odor}
                                    onChange={(e) => setOdor(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Vi sinh & Dư lượng</label>
                                <input
                                    type="text"
                                    value={microbiologyResult}
                                    onChange={(e) => setMicrobiologyResult(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Mã phiếu kiểm nghiệm</label>
                            <input
                                type="text"
                                placeholder="TEST-TP-202608-001"
                                value={testCertCode}
                                onChange={(e) => setTestCertCode(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono text-slate-800"
                            />
                        </div>
                    </fieldset>
                )}

                {/* STEP 9: NHẬP KHO THÀNH PHẨM */}
                {stepType === "FINISHED_PRODUCT_WAREHOUSE_IN" && (
                    <fieldset className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase text-emerald-800">
                            Nhập kho thành phẩm & Chốt mẻ
                        </legend>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Tên thành phẩm *</label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Kho thành phẩm *</label>
                                <input
                                    type="text"
                                    value={warehouseLocation}
                                    onChange={(e) => setWarehouseLocation(e.target.value)}
                                    required
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Vị trí kho *</label>
                                <input
                                    type="text"
                                    value={warehouseShelve}
                                    onChange={(e) => setWarehouseShelve(e.target.value)}
                                    required
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Điều kiện bảo quản</label>
                                <input
                                    type="text"
                                    value={storageCondition}
                                    onChange={(e) => setStorageCondition(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Hạn sử dụng *</label>
                                <input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    required
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                                />
                            </div>
                        </div>
                    </fieldset>
                )}

                {/* COMMON TIMING & PERFORMER */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Ngày giờ hoàn tất *</label>
                        <input
                            type="datetime-local"
                            value={completedAt}
                            onChange={(e) => setCompletedAt(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Người thực hiện</label>
                        <input
                            type="text"
                            value={performedBy}
                            onChange={(e) => setPerformedBy(e.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Ghi chú công đoạn</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Ghi chú chi tiết thông số vận hành..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        disabled={busy}
                        className="flex-1 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold"
                    >
                        {busy ? "Đang xử lý..." : stepType === "FINISHED_PRODUCT_WAREHOUSE_IN" ? "Nhập kho TP & Hoàn tất mẻ" : "Hoàn tất công đoạn"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function BatchDetailModal({
    batch,
    onClose,
    onOpenStep,
}: {
    batch: ProcessingBatchItem;
    onClose: () => void;
    onOpenStep: (stepType: ProcessingStepKey) => void;
}) {
    const badge = getStatusBadgeVariant(batch.status);

    const totalInput = batch.totalInputWeight || 0;
    const currentOutput = batch.totalOutputWeight || batch.steps[batch.steps.length - 1]?.outputWeight || 0;
    const currentLoss = batch.lossWeight || batch.steps.reduce((sum, s) => sum + (s.lossWeight || 0), 0);
    const currentYield = batch.yieldPercent || (totalInput > 0 ? Number(((currentOutput / totalInput) * 100).toFixed(1)) : 0);

    return (
        <Modal title={`Dây chuyền Chế biến ${batch.batchCode}`} onClose={onClose}>
            <div className="space-y-5 text-sm">
                {/* HEADER INFO */}
                <div className="flex items-center justify-between border-b pb-2">
                    <div>
                        <span className="font-mono font-bold text-brand-700">{batch.batchCode}</span>
                        <h3 className="font-black text-slate-900 text-base">{batch.targetProduct}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                    </span>
                </div>

                {/* GENERAL DETAILS */}
                <div className="rounded-2xl border bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Dây chuyền:</span>
                        <b className="text-slate-800">{batch.lineName || "Dây chuyền 1"}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Phương pháp:</span>
                        <b className="text-slate-800">{batch.method}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Thời gian bắt đầu:</span>
                        <b className="text-slate-800">{new Date(batch.startedAt).toLocaleString("vi-VN")}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Giám sát phụ trách:</span>
                        <b className="text-slate-800">{batch.supervisor || "Chưa cập nhật"}</b>
                    </div>
                </div>

                {/* 9 STEPS TIMELINE & DETAILS (Section XX, XXI-XXIX) */}
                <div className="space-y-3">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700">
                        Chi tiết 9 công đoạn chế biến
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {PROCESSING_STEPS_CONFIG.map((cfg) => {
                            const stepState = batch.steps.find((s) => s.stepType === cfg.type);
                            const isStepDone = stepState?.status === "COMPLETED";
                            const isStepActive = stepState?.status === "IN_PROGRESS";

                            return (
                                <div
                                    key={cfg.type}
                                    className={`rounded-2xl border p-3 text-xs space-y-1.5 transition ${
                                        isStepDone
                                            ? "bg-emerald-50/60 border-emerald-200"
                                            : isStepActive
                                            ? "bg-sky-50 border-sky-300 ring-2 ring-sky-300/30"
                                            : "bg-slate-50/50 border-slate-200 text-slate-400"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                                    isStepDone
                                                        ? "bg-emerald-600 text-white"
                                                        : isStepActive
                                                        ? "bg-sky-600 text-white"
                                                        : "bg-slate-200 text-slate-600"
                                                }`}
                                            >
                                                {isStepDone ? "✓" : cfg.order}
                                            </span>
                                            <span className="font-black text-slate-800 text-xs">
                                                {cfg.order}. {cfg.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    isStepDone
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : isStepActive
                                                        ? "bg-sky-100 text-sky-800"
                                                        : "bg-slate-100 text-slate-500"
                                                }`}
                                            >
                                                {isStepDone ? "Hoàn tất" : isStepActive ? "Đang xử lý" : "Chờ thực hiện"}
                                            </span>
                                            {isStepActive && batch.status === "IN_PROGRESS" && (
                                                <Button
                                                    size="sm"
                                                    className="h-7 px-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
                                                    onClick={() => onOpenStep(cfg.type)}
                                                >
                                                    Thực hiện
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {isStepDone && (
                                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600 border-t border-slate-200/60">
                                            <div>
                                                <span>Đầu vào: </span>
                                                <b>{stepState?.inputWeight?.toLocaleString("vi-VN") ?? "-"} kg</b>
                                            </div>
                                            <div>
                                                <span>Đầu ra / Múi: </span>
                                                <b className="text-emerald-700 font-bold">
                                                    {stepState?.outputWeight?.toLocaleString("vi-VN") ?? "-"} kg
                                                </b>
                                            </div>
                                            {stepState?.lossWeight !== null && stepState?.lossWeight !== undefined && (
                                                <div>
                                                    <span>Hao hụt: </span>
                                                    <b className="text-rose-700">{stepState.lossWeight.toLocaleString("vi-VN")} kg</b>
                                                </div>
                                            )}
                                            {stepState?.performedBy && (
                                                <div>
                                                    <span>Người làm: </span>
                                                    <b>{stepState.performedBy}</b>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* TỔNG HỢP HIỆU SUẤT (Section XXXI) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                    <h4 className="font-bold uppercase text-slate-700">Tổng hợp mẻ chế biến</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="rounded-xl bg-white p-2.5 border">
                            <span className="text-slate-400 block">Input:</span>
                            <b className="text-sm font-black text-slate-800">{totalInput.toLocaleString("vi-VN")} kg</b>
                        </div>
                        <div className="rounded-xl bg-white p-2.5 border">
                            <span className="text-slate-400 block">Output hiện tại:</span>
                            <b className="text-sm font-black text-emerald-700">{currentOutput.toLocaleString("vi-VN")} kg</b>
                        </div>
                        <div className="rounded-xl bg-white p-2.5 border">
                            <span className="text-slate-400 block">Hao hụt:</span>
                            <b className="text-sm font-black text-rose-700">{currentLoss.toLocaleString("vi-VN")} kg</b>
                        </div>
                        <div className="rounded-xl bg-white p-2.5 border">
                            <span className="text-slate-400 block">Tỷ lệ thu hồi (Yield):</span>
                            <b className="text-sm font-black text-brand-700">{currentYield}%</b>
                        </div>
                    </div>
                </div>

                {/* FINISHED LOT IF COMPLETE */}
                {batch.finishedLots.length > 0 && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                            <b className="text-emerald-900 uppercase font-black">Lô thành phẩm đã tạo:</b>
                            <Link
                                href="/dashboard/processing/finished-products"
                                className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                            >
                                Quản lý thành phẩm <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                        {batch.finishedLots.map((f) => (
                            <div key={f.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100">
                                <div>
                                    <b className="font-mono text-emerald-800 block">{f.lotCode}</b>
                                    <span className="text-slate-600">{f.productName}</span>
                                </div>
                                <b className="text-sm font-black text-brand-700">{f.netWeight.toLocaleString("vi-VN")} kg</b>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={onClose} className="rounded-2xl">
                        Đóng
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    variant,
}: {
    icon: typeof Factory;
    label: string;
    value: number;
    variant: "slate" | "sky" | "amber" | "emerald";
}) {
    const bgMap = {
        slate: "bg-slate-50 text-slate-700",
        sky: "bg-sky-50 text-sky-700",
        amber: "bg-amber-50 text-amber-700",
        emerald: "bg-emerald-50 text-emerald-700",
    };

    return (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-slate-500 sm:text-sm">{label}</span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${bgMap[variant]}`}>
                    <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                </span>
            </div>
            <p className="mt-2 truncate text-xl font-black text-slate-900 sm:text-2xl">
                {value.toLocaleString("vi-VN")}
            </p>
        </article>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div
            className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        type="button"
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
