"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    Factory,
    Pause,
    PauseCircle,
    Play,
    PlayCircle,
    Settings2,
    X,
    XCircle,
    PackageCheck,
    Sparkles,
    Scale,
    AlertCircle,
    Calendar,
    User,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    PROCESSING_STEPS_CONFIG,
    REJECT_REMOVAL_REASONS,
    PACKAGING_OPTIONS,
    getStatusBadgeVariant,
    calculateYield,
    type ProcessingStepKey,
} from "@/lib/processing-facility";

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
    currentUserName,
}: {
    initialBatches: ProcessingBatchItem[];
    availableRawLots?: unknown[];
    currentUserName?: string;
}) {
    const [batches, setBatches] = useState<ProcessingBatchItem[]>(initialBatches);
    const [tab, setTab] = useState("all");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Stepper modal states
    const [activeStepBatch, setActiveStepBatch] = useState<ProcessingBatchItem | null>(null);
    const [activeStepType, setActiveStepType] = useState<ProcessingStepKey | null>(null);
    const [viewBatch, setViewBatch] = useState<ProcessingBatchItem | null>(null);
    const [packagingSuccessInfo, setPackagingSuccessInfo] = useState<{
        batchCode: string;
        inputWeight: number;
        outputWeight: number;
        lossWeight: number;
        yieldPercent: number;
        finishedLotCode?: string;
    } | null>(null);

    const filteredBatches = useMemo(() => {
        if (tab === "all") return batches;
        if (tab === "in_progress") return batches.filter((b) => b.status === "IN_PROGRESS");
        if (tab === "paused") return batches.filter((b) => b.status === "PAUSED");
        if (tab === "waiting_qc") {
            return batches.filter((b) => b.status === "WAITING_FINISHED_QC" || b.status === "COMPLETED");
        }
        return batches;
    }, [batches, tab]);

    // Handle Batch Status Changes (PAUSE, RESUME)
    const handleBatchAction = async (batchId: string, action: "PAUSE" | "RESUME") => {
        setBusy(batchId);
        setError("");
        try {
            const response = await fetch(`/api/processing/batches/${batchId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
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

                    // If step was Step 5 (PACKAGING), batch becomes WAITING_FINISHED_QC
                    if (stepType === "PACKAGING" && finishedLot) {
                        const totalIn = b.totalInputWeight;
                        const finalOut = Number(data.outputWeight || 0);
                        const { lossWeight: totalLoss, yieldPercent } = calculateYield(totalIn, finalOut);

                        return {
                            ...b,
                            status: "WAITING_FINISHED_QC",
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
            if (stepType === "PACKAGING" && finishedLot) {
                const totalIn = activeStepBatch ? activeStepBatch.totalInputWeight : 0;
                const finalOut = Number(data.outputWeight || 0);
                const { lossWeight: totalLoss, yieldPercent } = calculateYield(totalIn, finalOut);

                setPackagingSuccessInfo({
                    batchCode: activeStepBatch?.batchCode || "",
                    inputWeight: totalIn,
                    outputWeight: finalOut,
                    lossWeight: totalLoss,
                    yieldPercent,
                    finishedLotCode: finishedLot.lotCode,
                });
            } else {
                setSuccessMessage(`Đã hoàn tất công đoạn ${cfg?.name || stepType}! Công đoạn tiếp theo đã sẵn sàng.`);
                setTimeout(() => setSuccessMessage(""), 5000);
            }
        } catch {
            setError("Lỗi kết nối máy chủ khi lưu công đoạn.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* MODULE HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <span className="text-xs font-bold font-mono tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        MODULE CHẾ BIẾN
                    </span>
                    <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Lô chế biến</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Theo dõi các lô đã được xuất kho nguyên liệu và thực hiện từng công đoạn chế biến.
                    </p>
                </div>
            </div>

            {successMessage && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                </div>
            )}

            {/* 4 KPIS */}
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
                    icon={PackageCheck}
                    label="Đã đóng gói / Chờ QC TP"
                    value={batches.filter((lot) => lot.status === "WAITING_FINISHED_QC" || lot.status === "COMPLETED").length}
                    variant="emerald"
                />
            </section>

            {/* TABS & BATCH LIST */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex flex-wrap gap-2">
                        {[
                            ["all", "Tất cả"],
                            ["in_progress", "Đang chế biến"],
                            ["paused", "Tạm dừng"],
                            ["waiting_qc", "Đã đóng gói / Chờ QC TP"],
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
                        const isDone = lot.status === "WAITING_FINISHED_QC" || lot.status === "COMPLETED";

                        const completedStepsCount = lot.steps.filter((s) => s.status === "COMPLETED").length;
                        const currentStep =
                            lot.steps.find((s) => s.status === "IN_PROGRESS") ||
                            lot.steps.find((s) => s.status === "PENDING") ||
                            lot.steps[lot.steps.length - 1];

                        const progressPercent = Math.round((completedStepsCount / 5) * 100);
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
                                            Nguồn:{" "}
                                            <span className="font-semibold text-emerald-800">
                                                {lot.inputs.map((i) => i.rawMaterialLotCode).join(", ")}
                                            </span>{" "}
                                            · Khối lượng đầu vào:{" "}
                                            <b className="text-slate-800 font-bold">{lot.totalInputWeight.toLocaleString("vi-VN")} kg</b>
                                        </p>
                                    </div>

                                    {/* PROGRESS KPI */}
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-500">
                                            Tiến độ: <b className="text-brand-700 font-black">{completedStepsCount} / 5</b> công đoạn
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
                                            <span className="text-xs font-black text-slate-700">{progressPercent}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* STEPPER 5 BƯỚC */}
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">
                                        Công đoạn hiện tại:{" "}
                                        <span className="font-bold text-brand-700">
                                            {isDone ? "Đã hoàn tất đóng gói" : currentStepConfig?.name || "Làm sạch"}
                                        </span>
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                        {PROCESSING_STEPS_CONFIG.map((cfg) => {
                                            const stepState = lot.steps.find((s) => s.stepType === cfg.type);
                                            const isStepDone = stepState?.status === "COMPLETED";
                                            const isStepActive = stepState?.status === "IN_PROGRESS";
                                            const isStepPending = !stepState || stepState.status === "PENDING";

                                            return (
                                                <button
                                                    key={cfg.type}
                                                    type="button"
                                                    disabled={isDone && !isStepDone}
                                                    onClick={() => {
                                                        setActiveStepBatch(lot);
                                                        setActiveStepType(cfg.type);
                                                        setError("");
                                                    }}
                                                    className={`flex flex-col items-start p-2.5 rounded-2xl border text-left transition ${
                                                        isStepDone
                                                            ? "bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70"
                                                            : isStepActive
                                                            ? "bg-sky-50 border-sky-300 ring-2 ring-sky-400/20 hover:bg-sky-100/70"
                                                            : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100/70"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span
                                                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                                                                isStepDone
                                                                    ? "bg-emerald-600 text-white"
                                                                    : isStepActive
                                                                    ? "bg-sky-600 text-white"
                                                                    : "bg-slate-200 text-slate-600"
                                                            }`}
                                                        >
                                                            {isStepDone ? "✓" : cfg.order}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold ${
                                                                isStepDone
                                                                    ? "text-emerald-700"
                                                                    : isStepActive
                                                                    ? "text-sky-700"
                                                                    : "text-slate-400"
                                                            }`}
                                                        >
                                                            {isStepDone ? "Hoàn tất" : isStepActive ? "Đang xử lý" : "Chờ"}
                                                        </span>
                                                    </div>
                                                    <p
                                                        className={`mt-1 text-xs font-bold truncate w-full ${
                                                            isStepDone
                                                                ? "text-slate-900"
                                                                : isStepActive
                                                                ? "text-sky-900"
                                                                : "text-slate-500"
                                                        }`}
                                                    >
                                                        {cfg.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {isStepDone && stepState.outputWeight
                                                            ? `${Number(stepState.outputWeight).toLocaleString("vi-VN")} kg`
                                                            : isStepActive && stepState.inputWeight
                                                            ? `Đầu vào: ${Number(stepState.inputWeight).toLocaleString("vi-VN")} kg`
                                                            : "—"}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* CARD FOOTER ACTIONS */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setViewBatch(lot)}
                                        className="rounded-xl font-bold text-xs"
                                    >
                                        <FileText className="mr-1.5 h-3.5 w-3.5" /> Xem chi tiết
                                    </Button>

                                    <div className="flex items-center gap-2">
                                        {isRunning && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={busy === lot.id}
                                                onClick={() => handleBatchAction(lot.id, "PAUSE")}
                                                className="rounded-xl text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 font-bold text-xs"
                                            >
                                                <Pause className="mr-1.5 h-3.5 w-3.5" /> Tạm dừng
                                            </Button>
                                        )}

                                        {isPaused && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={busy === lot.id}
                                                onClick={() => handleBatchAction(lot.id, "RESUME")}
                                                className="rounded-xl text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100 font-bold text-xs"
                                            >
                                                <Play className="mr-1.5 h-3.5 w-3.5" /> Tiếp tục
                                            </Button>
                                        )}

                                        {!isDone && currentStep && (
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setActiveStepBatch(lot);
                                                    setActiveStepType(currentStep.stepType);
                                                    setError("");
                                                }}
                                                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm"
                                            >
                                                Thực hiện: {currentStepConfig?.name || "Bước tiếp theo"}
                                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                            </Button>
                                        )}

                                        {isDone && (
                                            <Link
                                                href="/dashboard/processing/finished-products"
                                                className="inline-flex items-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs shadow-sm transition"
                                            >
                                                Xem lô thành phẩm <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}

                    {!filteredBatches.length && (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                            Không có lô chế biến nào trong mục này.
                        </div>
                    )}
                </div>
            </section>

            {/* MODAL: THỰC HIỆN CÔNG ĐOẠN 5 BƯỚC */}
            {activeStepBatch && activeStepType && (
                <StepExecutionModal
                    batch={activeStepBatch}
                    stepType={activeStepType}
                    currentUserName={currentUserName}
                    busy={busy === `${activeStepBatch.id}-${activeStepType}`}
                    error={error}
                    onClose={() => {
                        setActiveStepBatch(null);
                        setActiveStepType(null);
                    }}
                    onSubmit={(data) => handleExecuteStep(activeStepBatch.id, activeStepType, data)}
                />
            )}

            {/* MODAL: XEM CHI TIẾT LÔ CHẾ BIẾN */}
            {viewBatch && (
                <BatchDetailModal
                    batch={viewBatch}
                    onClose={() => setViewBatch(null)}
                    onOpenStep={(stepType) => {
                        const b = viewBatch;
                        setViewBatch(null);
                        setActiveStepBatch(b);
                        setActiveStepType(stepType);
                    }}
                />
            )}

            {/* MODAL SUCCESS: HOÀN TẤT CHẾ BIẾN (Section 13) */}
            {packagingSuccessInfo && (
                <Modal title="HOÀN TẤT CHẾ BIẾN" onClose={() => setPackagingSuccessInfo(null)}>
                    <div className="space-y-4 py-2">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Sparkles className="h-10 w-10" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-slate-900">Đã hoàn tất đóng gói mẻ chế biến!</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Lô: <b className="font-mono text-brand-700">{packagingSuccessInfo.batchCode}</b>
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng đầu vào:</span>
                                <b className="text-slate-800">{packagingSuccessInfo.inputWeight.toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng sau đóng gói:</span>
                                <b className="text-emerald-700 font-bold">{packagingSuccessInfo.outputWeight.toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Hao hụt tổng:</span>
                                <b className="text-amber-700">{packagingSuccessInfo.lossWeight.toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-slate-600 font-bold">Hiệu suất thu hồi (Yield):</span>
                                <b className="text-emerald-700 text-sm font-black">{packagingSuccessInfo.yieldPercent}%</b>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center text-xs font-semibold text-amber-800">
                            Lô thành phẩm đã được chuyển sang <span className="font-bold">THÀNH PHẨM - CHỜ QC</span>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-2xl font-bold"
                                onClick={() => setPackagingSuccessInfo(null)}
                            >
                                Đóng
                            </Button>
                            <Link
                                href="/dashboard/processing/finished-products"
                                className="flex-1 inline-flex items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-sm shadow-sm transition"
                            >
                                Xem lô thành phẩm <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ---------------------- STEP EXECUTION MODAL & FORMS (5 BƯỚC) ----------------------

function StepExecutionModal({
    batch,
    stepType,
    currentUserName,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    batch: ProcessingBatchItem;
    stepType: ProcessingStepKey;
    currentUserName?: string;
    busy: boolean;
    error: string;
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
    const stepState = batch.steps.find((s) => s.stepType === stepType);

    // Compute previous step output weight as default input
    const previousStep = batch.steps
        .filter((s) => s.stepOrder < (stepConfig?.order || 1))
        .sort((a, b) => b.stepOrder - a.stepOrder)[0];

    const defaultInputWeight =
        Number(stepState?.inputWeight) ||
        Number(previousStep?.outputWeight) ||
        batch.totalInputWeight;

    // STEP 1: CLEANING STATE
    const [cleaningInput, setCleaningInput] = useState(String(defaultInputWeight));
    const [cleaningOutput, setCleaningOutput] = useState(String(Number(stepState?.outputWeight) || Math.round(defaultInputWeight * 0.98)));
    const [cleaningStartedAt, setCleaningStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [cleaningCompletedAt, setCleaningCompletedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [cleaningPerformer, setCleaningPerformer] = useState(stepState?.performedBy || currentUserName || "Người thực hiện");
    const [cleaningNote, setCleaningNote] = useState(stepState?.note || "");

    // STEP 2: PEELING STATE
    const [peelingInput, setPeelingInput] = useState(String(defaultInputWeight));
    const [peelingPulpWeight, setPeelingPulpWeight] = useState(String(Number(stepState?.outputWeight) || Math.round(defaultInputWeight * 0.32)));
    const [peelingStartedAt, setPeelingStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [peelingCompletedAt, setPeelingCompletedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [peelingPerformer, setPeelingPerformer] = useState(stepState?.performedBy || currentUserName || "Người thực hiện");
    const [peelingNote, setPeelingNote] = useState(stepState?.note || "");

    // STEP 3: REJECT REMOVAL STATE
    const [rejectInput, setRejectInput] = useState(String(defaultInputWeight));
    const [rejectLossWeight, setRejectLossWeight] = useState(String(Number(stepState?.lossWeight) || 0));
    const [rejectReason, setRejectReason] = useState<string>(REJECT_REMOVAL_REASONS[0]);
    const [rejectStartedAt, setRejectStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [rejectCompletedAt, setRejectCompletedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [rejectPerformer, setRejectPerformer] = useState(stepState?.performedBy || currentUserName || "Người thực hiện");
    const [rejectNote, setRejectNote] = useState(stepState?.note || "");

    // STEP 4: FINAL WEIGHING STATE
    const [weighingInput, setWeighingInput] = useState(String(defaultInputWeight));
    const [weighingActualOutput, setWeighingActualOutput] = useState(String(Number(stepState?.outputWeight) || defaultInputWeight));
    const [weighingDate, setWeighingDate] = useState(() => new Date().toISOString().slice(0, 16));
    const [weighingPerformer, setWeighingPerformer] = useState(stepState?.performedBy || currentUserName || "Người cân");
    const [weighingNote, setWeighingNote] = useState(stepState?.note || "");

    // STEP 5: PACKAGING STATE
    const [packInput, setPackInput] = useState(String(defaultInputWeight));
    const [packagingSpec, setPackagingSpec] = useState<string>(PACKAGING_OPTIONS[1]); // 500g/túi
    const [packageCount, setPackageCount] = useState(() => {
        const specWeight = packagingSpec.includes("250g") ? 0.25 : packagingSpec.includes("500g") ? 0.5 : 1;
        return String(Math.round(defaultInputWeight / specWeight));
    });
    const [packagingActualWeight, setPackagingActualWeight] = useState(String(Number(stepState?.outputWeight) || defaultInputWeight));
    const [packagingType, setPackagingType] = useState("Túi hút chân không");
    const [packCompletedAt, setPackCompletedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [packPerformer, setPackPerformer] = useState(stepState?.performedBy || currentUserName || "Người phụ trách");
    const [packNote, setPackNote] = useState(stepState?.note || "");

    const [formError, setFormError] = useState("");

    const handlePackagingSpecChange = (val: string) => {
        setPackagingSpec(val);
        const specKg = val.includes("250g") ? 0.25 : val.includes("500g") ? 0.5 : val.includes("1kg") ? 1 : val.includes("5kg") ? 5 : 0.5;
        const inputNum = Number(packInput) || defaultInputWeight;
        setPackageCount(String(Math.max(1, Math.round(inputNum / specKg))));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError("");

        switch (stepType) {
            case "CLEANING": {
                const inKg = Number(cleaningInput) || defaultInputWeight;
                const outKg = Number(cleaningOutput) || 0;
                if (outKg <= 0 || outKg > inKg) {
                    setFormError("Khối lượng sau làm sạch phải > 0 và không vượt quá khối lượng đầu vào.");
                    return;
                }
                const lossKg = Math.max(0, inKg - outKg);
                onSubmit({
                    startedAt: new Date(cleaningStartedAt).toISOString(),
                    completedAt: new Date(cleaningCompletedAt).toISOString(),
                    inputWeight: inKg,
                    outputWeight: outKg,
                    lossWeight: lossKg,
                    note: cleaningNote,
                    metadata: { performer: cleaningPerformer },
                });
                break;
            }
            case "PEELING_PULP_SEPARATION": {
                const inKg = Number(peelingInput) || defaultInputWeight;
                const pulpKg = Number(peelingPulpWeight) || 0;
                if (pulpKg <= 0 || pulpKg > inKg) {
                    setFormError("Khối lượng múi thu được phải > 0 và không vượt quá khối lượng đầu vào.");
                    return;
                }
                const peelWaste = Math.max(0, inKg - pulpKg);
                onSubmit({
                    startedAt: new Date(peelingStartedAt).toISOString(),
                    completedAt: new Date(peelingCompletedAt).toISOString(),
                    inputWeight: inKg,
                    outputWeight: pulpKg,
                    lossWeight: peelWaste,
                    note: peelingNote,
                    metadata: { performer: peelingPerformer, wasteWeight: peelWaste },
                });
                break;
            }
            case "REJECT_REMOVAL": {
                const inKg = Number(rejectInput) || defaultInputWeight;
                const rejectKg = Number(rejectLossWeight) || 0;
                if (rejectKg < 0 || rejectKg > inKg) {
                    setFormError("Khối lượng loại bỏ không hợp lệ.");
                    return;
                }
                const passedKg = Math.max(0, inKg - rejectKg);
                onSubmit({
                    startedAt: new Date(rejectStartedAt).toISOString(),
                    completedAt: new Date(rejectCompletedAt).toISOString(),
                    inputWeight: inKg,
                    outputWeight: passedKg,
                    lossWeight: rejectKg,
                    note: rejectNote,
                    metadata: { rejectionReason: rejectReason, performer: rejectPerformer },
                });
                break;
            }
            case "FINAL_WEIGHING": {
                const inKg = Number(weighingInput) || defaultInputWeight;
                const actualKg = Number(weighingActualOutput) || 0;
                if (actualKg <= 0) {
                    setFormError("Khối lượng thành phẩm thực tế phải > 0.");
                    return;
                }
                const diffKg = Math.max(0, inKg - actualKg);
                onSubmit({
                    startedAt: new Date(weighingDate).toISOString(),
                    completedAt: new Date(weighingDate).toISOString(),
                    inputWeight: inKg,
                    outputWeight: actualKg,
                    lossWeight: diffKg,
                    note: weighingNote,
                    metadata: { performer: weighingPerformer },
                });
                break;
            }
            case "PACKAGING": {
                const inKg = Number(packInput) || defaultInputWeight;
                const actualPackKg = Number(packagingActualWeight) || inKg;
                const count = Number(packageCount) || 1;
                if (actualPackKg <= 0) {
                    setFormError("Khối lượng đóng gói thực tế phải > 0.");
                    return;
                }
                const lossKg = Math.max(0, inKg - actualPackKg);
                onSubmit({
                    startedAt: new Date(packCompletedAt).toISOString(),
                    completedAt: new Date(packCompletedAt).toISOString(),
                    inputWeight: inKg,
                    outputWeight: actualPackKg,
                    lossWeight: lossKg,
                    note: packNote,
                    metadata: {
                        packagingSpec,
                        packageCount: count,
                        packagingType,
                        performer: packPerformer,
                    },
                });
                break;
            }
        }
    };

    return (
        <Modal
            title={`${stepConfig?.order}. ${stepConfig?.name.toUpperCase()} - MẺ ${batch.batchCode}`}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {(error || formError) && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                        {error || formError}
                    </div>
                )}

                {/* STEP 1: LÀM SẠCH */}
                {stepType === "CLEANING" && (
                    <div className="space-y-3">
                        <div className="rounded-2xl bg-slate-50 p-3 text-xs border space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng đầu vào:</span>
                                <b className="text-slate-900 font-bold">{Number(cleaningInput).toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Hao hụt tự động:</span>
                                <b className="text-amber-700 font-bold">
                                    {Math.max(0, Number(cleaningInput) - Number(cleaningOutput)).toLocaleString("vi-VN")} kg
                                </b>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">
                                Khối lượng sau làm sạch (kg) <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                required
                                value={cleaningOutput}
                                onChange={(e) => setCleaningOutput(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700">Bắt đầu *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={cleaningStartedAt}
                                    onChange={(e) => setCleaningStartedAt(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700">Hoàn tất *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={cleaningCompletedAt}
                                    onChange={(e) => setCleaningCompletedAt(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">Người thực hiện *</label>
                            <input
                                type="text"
                                required
                                value={cleaningPerformer}
                                onChange={(e) => setCleaningPerformer(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                            <textarea
                                rows={2}
                                value={cleaningNote}
                                onChange={(e) => setCleaningNote(e.target.value)}
                                placeholder="Ghi chú thêm về quy trình làm sạch..."
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 2: TÁCH VỎ - TÁCH MÚI */}
                {stepType === "PEELING_PULP_SEPARATION" && (
                    <div className="space-y-3">
                        <div className="rounded-2xl bg-slate-50 p-3 text-xs border space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng đầu vào:</span>
                                <b className="text-slate-900 font-bold">{Number(peelingInput).toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng vỏ / hạt / phần bỏ:</span>
                                <b className="text-amber-700 font-bold">
                                    {Math.max(0, Number(peelingInput) - Number(peelingPulpWeight)).toLocaleString("vi-VN")} kg
                                </b>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">
                                Khối lượng múi thu được (kg) <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                required
                                value={peelingPulpWeight}
                                onChange={(e) => setPeelingPulpWeight(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700">Bắt đầu *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={peelingStartedAt}
                                    onChange={(e) => setPeelingStartedAt(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700">Hoàn tất *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={peelingCompletedAt}
                                    onChange={(e) => setPeelingCompletedAt(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">Người thực hiện *</label>
                            <input
                                type="text"
                                required
                                value={peelingPerformer}
                                onChange={(e) => setPeelingPerformer(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                            <textarea
                                rows={2}
                                value={peelingNote}
                                onChange={(e) => setPeelingNote(e.target.value)}
                                placeholder="Ghi chú về chất lượng múi sau tách vỏ..."
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 3: LOẠI BỎ PHẦN KHÔNG ĐẠT */}
                {stepType === "REJECT_REMOVAL" && (
                    <div className="space-y-3">
                        <div className="rounded-2xl bg-slate-50 p-3 text-xs border space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng đầu vào:</span>
                                <b className="text-slate-900 font-bold">{Number(rejectInput).toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng đạt chuẩn:</span>
                                <b className="text-emerald-700 font-black">
                                    {Math.max(0, Number(rejectInput) - Number(rejectLossWeight)).toLocaleString("vi-VN")} kg
                                </b>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">
                                Khối lượng loại bỏ (kg) <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                required
                                value={rejectLossWeight}
                                onChange={(e) => setRejectLossWeight(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">
                                Lý do loại bỏ <span className="text-rose-600">*</span>
                            </label>
                            <select
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold"
                            >
                                {REJECT_REMOVAL_REASONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700">Bắt đầu *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={rejectStartedAt}
                                    onChange={(e) => setRejectStartedAt(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700">Hoàn tất *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={rejectCompletedAt}
                                    onChange={(e) => setRejectCompletedAt(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                            <textarea
                                rows={2}
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Ghi chú chi tiết lý do và biện pháp xử lý..."
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 4: CÂN THÀNH PHẨM */}
                {stepType === "FINAL_WEIGHING" && (
                    <div className="space-y-3">
                        <div className="rounded-2xl bg-slate-50 p-3 text-xs border space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng trước cân:</span>
                                <b className="text-slate-900 font-bold">{Number(weighingInput).toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Chênh lệch:</span>
                                <b className="text-amber-700 font-bold">
                                    {Math.max(0, Number(weighingInput) - Number(weighingActualOutput)).toLocaleString("vi-VN")} kg
                                </b>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">
                                Khối lượng thành phẩm thực tế (kg) <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                required
                                value={weighingActualOutput}
                                onChange={(e) => setWeighingActualOutput(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700">Ngày giờ cân *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={weighingDate}
                                    onChange={(e) => setWeighingDate(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700">Người cân *</label>
                                <input
                                    type="text"
                                    required
                                    value={weighingPerformer}
                                    onChange={(e) => setWeighingPerformer(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                            <textarea
                                rows={2}
                                value={weighingNote}
                                onChange={(e) => setWeighingNote(e.target.value)}
                                placeholder="Ghi chú cân định lượng..."
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 5: ĐÓNG GÓI */}
                {stepType === "PACKAGING" && (
                    <div className="space-y-3">
                        <div className="rounded-2xl bg-slate-50 p-3 text-xs border space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Khối lượng thành phẩm đầu vào:</span>
                                <b className="text-slate-900 font-bold">{Number(packInput).toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Số lượng gói dự kiến:</span>
                                <b className="text-emerald-700 font-bold">
                                    {Math.max(1, Math.round(Number(packInput) / (packagingSpec.includes("250g") ? 0.25 : packagingSpec.includes("500g") ? 0.5 : 1)))} gói/túi
                                </b>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700">
                                    Quy cách đóng gói <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={packagingSpec}
                                    onChange={(e) => handlePackagingSpecChange(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold"
                                >
                                    {PACKAGING_OPTIONS.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700">
                                    Số lượng gói thực tế <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={packageCount}
                                    onChange={(e) => setPackageCount(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700">
                                    Khối lượng đóng gói thực tế (kg) <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    value={packagingActualWeight}
                                    onChange={(e) => setPackagingActualWeight(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700">
                                    Loại bao bì <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={packagingType}
                                    onChange={(e) => setPackagingType(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold"
                                >
                                    <option value="Túi hút chân không">Túi hút chân không</option>
                                    <option value="Khay màng co">Khay màng co</option>
                                    <option value="Hộp nhựa kín">Hộp nhựa kín</option>
                                    <option value="Thùng carton">Thùng carton</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700">Ngày giờ hoàn tất *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={packCompletedAt}
                                    onChange={(e) => setPackCompletedAt(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700">Người phụ trách *</label>
                                <input
                                    type="text"
                                    required
                                    value={packPerformer}
                                    onChange={(e) => setPackPerformer(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                            <textarea
                                rows={2}
                                value={packNote}
                                onChange={(e) => setPackNote(e.target.value)}
                                placeholder="Ghi chú đóng gói..."
                                className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                            />
                        </div>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1 rounded-2xl font-bold" onClick={onClose} disabled={busy}>
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        disabled={busy}
                        className={`flex-1 rounded-2xl text-white font-bold ${
                            stepType === "PACKAGING" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-600 hover:bg-brand-700"
                        }`}
                    >
                        {busy
                            ? "Đang lưu..."
                            : stepType === "PACKAGING"
                            ? "Hoàn tất đóng gói & Tạo Lô TP"
                            : "Hoàn tất công đoạn"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ---------------------- BATCH DETAIL MODAL ----------------------

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
    return (
        <Modal title={`CHI TIẾT MẺ CHẾ BIẾN: ${batch.batchCode}`} onClose={onClose}>
            <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-900">{batch.targetProduct}</span>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                    </span>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Dây chuyền:</span>
                        <b className="text-slate-800">{batch.lineName || "Dây chuyền 1"}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Phương pháp:</span>
                        <b className="text-slate-800">{batch.method}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Nguồn nguyên liệu:</span>
                        <b className="text-emerald-700">{batch.inputs.map((i) => i.rawMaterialLotCode).join(", ")}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Khối lượng đầu vào:</span>
                        <b className="text-slate-900 font-bold">{batch.totalInputWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Thời gian bắt đầu:</span>
                        <b className="text-slate-800">{new Date(batch.startedAt).toLocaleString("vi-VN")}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Giám sát:</span>
                        <b className="text-slate-800">{batch.supervisor}</b>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-2 uppercase tracking-wide">
                        Tiến độ 5 công đoạn chế biến
                    </h4>
                    <div className="space-y-2">
                        {PROCESSING_STEPS_CONFIG.map((cfg) => {
                            const step = batch.steps.find((s) => s.stepType === cfg.type);
                            const isDone = step?.status === "COMPLETED";
                            const isActive = step?.status === "IN_PROGRESS";

                            return (
                                <div
                                    key={cfg.type}
                                    className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs ${
                                        isDone
                                            ? "bg-emerald-50/70 border-emerald-200"
                                            : isActive
                                            ? "bg-sky-50 border-sky-200"
                                            : "bg-slate-50 border-slate-200 text-slate-400"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span
                                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                                                isDone
                                                    ? "bg-emerald-600 text-white"
                                                    : isActive
                                                    ? "bg-sky-600 text-white"
                                                    : "bg-slate-200 text-slate-600"
                                            }`}
                                        >
                                            {isDone ? "✓" : cfg.order}
                                        </span>
                                        <span className="font-bold text-slate-800 truncate">{cfg.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[11px] text-slate-500">
                                            {isDone && step.outputWeight
                                                ? `${Number(step.outputWeight).toLocaleString("vi-VN")} kg`
                                                : isDone
                                                ? "Hoàn tất"
                                                : isActive
                                                ? "Đang làm"
                                                : "Chờ"}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onOpenStep(cfg.type)}
                                            className="h-7 rounded-xl text-[10px] font-bold px-2 py-0"
                                        >
                                            {isDone ? "Xem" : "Thực hiện"}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="outline" className="rounded-2xl font-bold" onClick={onClose}>
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
    variant = "slate",
}: {
    icon: typeof Factory;
    label: string;
    value: number;
    variant?: "slate" | "sky" | "amber" | "emerald";
}) {
    const colorMap = {
        slate: "bg-slate-50 text-slate-700 border-slate-200",
        sky: "bg-sky-50 text-sky-700 border-sky-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };

    return (
        <div className={`rounded-3xl border p-4 sm:p-5 shadow-sm space-y-2 ${colorMap[variant]}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
                <Icon className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-2xl sm:text-3xl font-black">{value}</p>
        </div>
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
            <div className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
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
