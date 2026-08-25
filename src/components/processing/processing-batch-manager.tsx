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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatusBadgeVariant, calculateYield } from "@/lib/processing-facility";

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

export type ProcessingBatchItem = {
    id: string;
    batchCode: string;
    method: string;
    targetProduct: string;
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
    }>;
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

const METHOD_PRESETS = [
    "Tách múi & Cấp đông nhanh (IQF)",
    "Sơ chế & Làm sạch",
    "Cấp đông nguyên trái",
    "Sấy thăng hoa (Freeze-dried)",
    "Sấy dẻo cao cấp",
    "Đóng gói tươi hút chân không",
];

const PRODUCT_PRESETS = [
    "Sầu riêng Dona tách múi cấp đông",
    "Sầu riêng Ri6 tách múi cấp đông",
    "Sầu riêng cấp đông nguyên trái",
    "Sầu riêng sấy thăng hoa giòn",
    "Sầu riêng sấy dẻo",
    "Sầu riêng tươi đóng thùng xuất khẩu",
];

const PACKAGING_PRESETS = [
    "Hộp 500g",
    "Túi hút chân không 1kg",
    "Hộp 1kg",
    "Thùng carton 10kg",
    "Thùng xốp 18kg",
    "Gói 100g sấy thăng hoa",
];

const STORAGE_PRESETS = [
    "Âm sâu -18°C",
    "Kho lạnh 2 - 5°C",
    "Nhiệt độ phòng mát 15 - 20°C",
    "Nơi khô ráo thoáng mát",
];

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
    const [completeBatch, setCompleteBatch] = useState<ProcessingBatchItem | null>(null);
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

    // Handle Create Batch
    const handleCreateBatch = async (data: {
        rawMaterialLotId: string;
        inputWeight: number;
        method: string;
        targetProduct: string;
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

            // Update state
            const created = result.data;
            const chosenRawLot = rawLots.find((l) => l.id === data.rawMaterialLotId);
            const newBatchItem: ProcessingBatchItem = {
                id: created.id,
                batchCode: created.batchCode,
                method: created.method,
                targetProduct: created.targetProduct,
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
                        id: "temp-" + Date.now(),
                        rawMaterialLotId: data.rawMaterialLotId,
                        rawMaterialLotCode: chosenRawLot?.code || "RM-NL",
                        inputWeight: data.inputWeight,
                        farmName: chosenRawLot?.farmName || "Vườn",
                    },
                ],
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
            setSuccessMessage(`Đã khởi tạo thành công mẻ chế biến ${created.batchCode}!`);
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

    // Handle Complete Batch & Create Finished Product
    const handleCompleteBatch = async (
        batchId: string,
        data: {
            outputWeight: number;
            productName: string;
            productType: string;
            packaging: string;
            storageCondition: string;
            warehouseLocation: string;
            expiryDate: string;
            completedAt: string;
            note: string;
        }
    ) => {
        setBusy(batchId);
        setError("");
        try {
            const response = await fetch(`/api/processing/batches/${batchId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "COMPLETE", ...data }),
            });
            const result = await response.json();
            if (!result.success) {
                setError(result.message || "Hoàn tất mẻ chế biến thất bại.");
                setBusy(null);
                return;
            }

            const { batch: updatedBatch, finishedLot } = result.data;
            setBatches((prev) =>
                prev.map((b) =>
                    b.id === batchId
                        ? {
                              ...b,
                              status: "COMPLETED",
                              completedAt: updatedBatch.completedAt,
                              totalOutputWeight: Number(updatedBatch.totalOutputWeight),
                              lossWeight: Number(updatedBatch.lossWeight),
                              yieldPercent: Number(updatedBatch.yieldPercent),
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
                          }
                        : b
                )
            );

            setCompleteBatch(null);
            setSuccessMessage(
                `Hoàn tất mẻ chế biến ${updatedBatch.batchCode}! Lô thành phẩm ${finishedLot.lotCode} (${Number(
                    finishedLot.netWeight
                ).toLocaleString("vi-VN")} kg) đã sẵn sàng phân phối.`
            );
            setTimeout(() => setSuccessMessage(""), 7000);
        } catch {
            setError("Lỗi kết nối khi hoàn tất mẻ chế biến.");
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

            {/* SECTION 1: NGUYÊN LIỆU SẴN SÀNG CHẾ BIẾN */}
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
                            Các lô nguyên liệu đã tiếp nhận và QC đạt điều kiện đưa vào sản xuất.
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
                                        <span className="text-slate-400">Khả dụng:</span>
                                        <b className="text-emerald-700 text-sm font-black">
                                            {lot.currentWeight.toLocaleString("vi-VN")} kg
                                        </b>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Nguồn gốc:</span>
                                        <span className="font-medium text-slate-700 truncate max-w-[140px]" title={lot.farmName}>
                                            {lot.farmName}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Grade / Kho:</span>
                                        <span className="font-medium text-slate-700">
                                            {lot.qualityGrade} · {lot.warehouseLocation || "Kho NL"}
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

            {/* SECTION 2: KPIS */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <MetricCard
                    icon={Factory}
                    label="Tổng lô chế biến"
                    value={batches.length}
                    variant="slate"
                />
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

            {/* SECTION 3: DANH SÁCH LÔ CHẾ BIẾN */}
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

                        return (
                            <article
                                key={lot.id}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition space-y-4"
                            >
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
                                </div>

                                <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Đầu vào (Input)</dt>
                                        <dd className="mt-1 text-sm font-black text-slate-800">
                                            {lot.totalInputWeight.toLocaleString("vi-VN")} kg
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Thời gian bắt đầu</dt>
                                        <dd className="mt-1 text-xs font-bold text-slate-700">
                                            {new Date(lot.startedAt).toLocaleString("vi-VN")}
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">
                                            {isDone ? "Đầu ra thành phẩm" : "Người phụ trách"}
                                        </dt>
                                        <dd className="mt-1 text-sm font-black text-emerald-700">
                                            {isDone
                                                ? `${lot.totalOutputWeight.toLocaleString("vi-VN")} kg`
                                                : lot.supervisor || "Chưa cập nhật"}
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">
                                            {isDone ? "Hiệu suất (Yield) / Hao hụt" : "Trạng thái mẻ"}
                                        </dt>
                                        <dd className="mt-1 text-xs font-bold text-slate-800">
                                            {isDone
                                                ? `${lot.yieldPercent}% (Hao hụt ${lot.lossWeight.toLocaleString("vi-VN")} kg)`
                                                : badge.label}
                                        </dd>
                                    </div>
                                </dl>

                                {lot.note && (
                                    <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                                        <b>Ghi chú:</b> {lot.note}
                                    </p>
                                )}

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

                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold"
                                        onClick={() => setViewBatch(lot)}
                                    >
                                        Xem chi tiết
                                    </Button>

                                    {isRunning && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl text-amber-700 border-amber-200 hover:bg-amber-50 font-bold"
                                                disabled={busy === lot.id}
                                                onClick={() => handleBatchAction(lot.id, "PAUSE")}
                                            >
                                                <Pause className="mr-1 h-3.5 w-3.5" /> Tạm dừng
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                                                onClick={() => {
                                                    setError("");
                                                    setCompleteBatch(lot);
                                                }}
                                            >
                                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Hoàn tất chế biến
                                            </Button>
                                        </>
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

            {/* MODAL: TẠO LÔ CHẾ BIẾN */}
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

            {/* MODAL: HOÀN TẤT LÔ CHẾ BIẾN & TẠO THÀNH PHẨM */}
            {completeBatch && (
                <CompleteBatchModal
                    batch={completeBatch}
                    busy={busy === completeBatch.id}
                    error={error}
                    onClose={() => setCompleteBatch(null)}
                    onSubmit={(data) => handleCompleteBatch(completeBatch.id, data)}
                />
            )}

            {/* MODAL: XEM CHI TIẾT LÔ CHẾ BIẾN */}
            {viewBatch && (
                <BatchDetailModal batch={viewBatch} onClose={() => setViewBatch(null)} />
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
    const [method, setMethod] = useState(METHOD_PRESETS[0]);
    const [targetProduct, setTargetProduct] = useState(
        selectedLot ? `${selectedLot.variety} tách múi cấp đông` : PRODUCT_PRESETS[0]
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
                                {selectedLot.qualityGrade} · {selectedLot.warehouseLocation || "Kho NL-01"}
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
                        Khối lượng đưa vào chế biến (kg) *
                    </label>
                    <input
                        type="number"
                        min="0.1"
                        max={selectedLot?.currentWeight}
                        step="0.1"
                        value={inputWeight}
                        onChange={(e) => setInputWeight(e.target.value)}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-black text-brand-700 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                        Tối đa {selectedLot ? `${selectedLot.currentWeight.toLocaleString("vi-VN")} kg` : "0 kg"}
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Phương pháp chế biến *
                    </label>
                    <input
                        type="text"
                        list="methods-list"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        required
                        placeholder="Chọn hoặc nhập phương pháp"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                    <datalist id="methods-list">
                        {METHOD_PRESETS.map((p) => (
                            <option key={p} value={p} />
                        ))}
                    </datalist>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Sản phẩm mục tiêu *
                    </label>
                    <input
                        type="text"
                        list="products-list"
                        value={targetProduct}
                        onChange={(e) => setTargetProduct(e.target.value)}
                        required
                        placeholder="Chọn hoặc nhập tên sản phẩm mục tiêu"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                    <datalist id="products-list">
                        {PRODUCT_PRESETS.map((p) => (
                            <option key={p} value={p} />
                        ))}
                    </datalist>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Ngày giờ bắt đầu *
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
                            placeholder="Họ tên người vận hành/giám sát"
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
                        {busy ? "Đang khởi tạo..." : "Bắt đầu chế biến"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function CompleteBatchModal({
    batch,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    batch: ProcessingBatchItem;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (data: {
        outputWeight: number;
        productName: string;
        productType: string;
        packaging: string;
        storageCondition: string;
        warehouseLocation: string;
        expiryDate: string;
        completedAt: string;
        note: string;
    }) => void;
}) {
    const inputWeight = batch.totalInputWeight || 0;
    // Estimated 70% output by default
    const [outputWeight, setOutputWeight] = useState(
        String((inputWeight * 0.7).toFixed(1).replace(/\.0$/, ""))
    );
    const [productName, setProductName] = useState(batch.targetProduct);
    const [productType, setProductType] = useState(batch.method);
    const [packaging, setPackaging] = useState(PACKAGING_PRESETS[0]);
    const [storageCondition, setStorageCondition] = useState(STORAGE_PRESETS[0]);
    const [warehouseLocation, setWarehouseLocation] = useState("Kho lạnh TP-01");
    const [expiryDate, setExpiryDate] = useState(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().slice(0, 10);
    });
    const [completedAt, setCompletedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [note, setNote] = useState("");

    const numericOutput = Number(outputWeight) || 0;
    const { lossWeight, yieldPercent } = calculateYield(inputWeight, numericOutput);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit({
            outputWeight: numericOutput,
            productName,
            productType,
            packaging,
            storageCondition,
            warehouseLocation,
            expiryDate,
            completedAt,
            note,
        });
    };

    return (
        <Modal title="HOÀN TẤT LÔ CHẾ BIẾN" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
                        {error}
                    </p>
                )}

                <div className="rounded-2xl border bg-slate-50 p-4 text-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Mã lô chế biến:</span>
                        <b className="font-mono text-brand-700">{batch.batchCode}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Sản phẩm mục tiêu:</span>
                        <b className="text-slate-800">{batch.targetProduct}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Tổng khối lượng đầu vào:</span>
                        <b className="text-slate-900 font-bold">{inputWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                </div>

                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        1. Kết quả thu hồi & Hao hụt
                    </legend>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Khối lượng thành phẩm thực tế (kg) *
                        </label>
                        <input
                            type="number"
                            min="0.1"
                            max={inputWeight * 1.5}
                            step="0.1"
                            value={outputWeight}
                            onChange={(e) => setOutputWeight(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-black text-emerald-700 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="rounded-xl bg-white p-3 border">
                            <span className="text-slate-400 block">Khối lượng hao hụt:</span>
                            <b className="text-sm font-black text-rose-700">
                                {lossWeight.toLocaleString("vi-VN")} kg
                            </b>
                        </div>
                        <div className="rounded-xl bg-white p-3 border">
                            <span className="text-slate-400 block">Tỷ lệ thu hồi (Yield):</span>
                            <b className="text-sm font-black text-emerald-700">
                                {yieldPercent.toLocaleString("vi-VN")} %
                            </b>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        2. Thông tin Lô Thành Phẩm
                    </legend>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Tên thành phẩm *
                        </label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Loại sản phẩm
                        </label>
                        <input
                            type="text"
                            value={productType}
                            onChange={(e) => setProductType(e.target.value)}
                            placeholder="Tách múi cấp đông, sấy khô..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Quy cách đóng gói
                            </label>
                            <input
                                type="text"
                                list="pkg-list"
                                value={packaging}
                                onChange={(e) => setPackaging(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                            <datalist id="pkg-list">
                                {PACKAGING_PRESETS.map((p) => (
                                    <option key={p} value={p} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Điều kiện bảo quản
                            </label>
                            <input
                                type="text"
                                list="store-list"
                                value={storageCondition}
                                onChange={(e) => setStorageCondition(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                            <datalist id="store-list">
                                {STORAGE_PRESETS.map((p) => (
                                    <option key={p} value={p} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Vị trí kho thành phẩm
                            </label>
                            <input
                                type="text"
                                value={warehouseLocation}
                                onChange={(e) => setWarehouseLocation(e.target.value)}
                                placeholder="Kho lạnh TP-01"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Hạn sử dụng
                            </label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Ngày giờ hoàn tất *
                        </label>
                        <input
                            type="datetime-local"
                            value={completedAt}
                            onChange={(e) => setCompletedAt(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Ghi chú hoàn tất
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            placeholder="Ghi chú đánh giá cảm quan thành phẩm..."
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                </fieldset>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        disabled={busy || numericOutput <= 0}
                        className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                        {busy ? "Đang xử lý..." : "Hoàn tất & Tạo thành phẩm"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function BatchDetailModal({ batch, onClose }: { batch: ProcessingBatchItem; onClose: () => void }) {
    const badge = getStatusBadgeVariant(batch.status);
    return (
        <Modal title={`Chi tiết Lô chế biến ${batch.batchCode}`} onClose={onClose}>
            <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-mono font-bold text-brand-700">{batch.batchCode}</span>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                    </span>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Sản phẩm mục tiêu:</span>
                        <b className="text-slate-800">{batch.targetProduct}</b>
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
                        <span className="text-slate-500">Thời gian kết thúc:</span>
                        <b className="text-slate-800">
                            {batch.completedAt ? new Date(batch.completedAt).toLocaleString("vi-VN") : "Đang xử lý"}
                        </b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Người phụ trách:</span>
                        <b className="text-slate-800">{batch.supervisor || "Chưa cập nhật"}</b>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                    <h4 className="font-bold uppercase text-slate-600">Nguyên liệu đầu vào</h4>
                    {batch.inputs.map((inp) => (
                        <div key={inp.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                            <div>
                                <b className="font-mono text-brand-700 block">{inp.rawMaterialLotCode}</b>
                                <span className="text-slate-500">{inp.farmName}</span>
                            </div>
                            <b className="text-sm text-slate-800">{inp.inputWeight.toLocaleString("vi-VN")} kg</b>
                        </div>
                    ))}
                </div>

                {batch.status === "COMPLETED" && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2 text-xs">
                        <h4 className="font-bold uppercase text-emerald-800">Kết quả sản xuất & Lô thành phẩm</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                                <span className="text-slate-500">Đầu ra thành phẩm:</span>
                                <b className="block text-sm text-emerald-700">
                                    {batch.totalOutputWeight.toLocaleString("vi-VN")} kg
                                </b>
                            </div>
                            <div>
                                <span className="text-slate-500">Hao hụt / Tỷ lệ thu hồi:</span>
                                <b className="block text-sm text-slate-800">
                                    {batch.lossWeight.toLocaleString("vi-VN")} kg ({batch.yieldPercent}%)
                                </b>
                            </div>
                        </div>

                        {batch.finishedLots.length > 0 && (
                            <div className="mt-2 space-y-1.5 pt-2 border-t border-emerald-100">
                                {batch.finishedLots.map((f) => (
                                    <div
                                        key={f.id}
                                        className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100"
                                    >
                                        <div>
                                            <b className="font-mono text-emerald-800 block">{f.lotCode}</b>
                                            <span className="text-slate-600">{f.productName}</span>
                                        </div>
                                        <b className="text-sm font-black text-brand-700">
                                            {f.netWeight.toLocaleString("vi-VN")} kg
                                        </b>
                                    </div>
                                ))}
                            </div>
                        )}
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
