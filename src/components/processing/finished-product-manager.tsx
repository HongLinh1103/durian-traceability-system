"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
    Boxes,
    CheckCircle2,
    PackageCheck,
    QrCode,
    Truck,
    X,
    ExternalLink,
    AlertTriangle,
    Warehouse,
    FileCheck,
    Clock,
    Scale,
    Thermometer,
    Layers,
    Calendar,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatusBadgeVariant } from "@/lib/processing-facility";

export type FinishedProductLotItem = {
    id: string;
    lotCode: string;
    productName: string;
    productType: string;
    processingBatchId: string;
    sourceProcessingBatchCode: string;
    manufacturedAt: string | Date;
    expiryDate?: string | Date | null;
    packaging?: string | null;
    storageCondition?: string | null;
    warehouseLocation?: string | null;
    quantity: number;
    netWeight: number;
    remainingWeight: number;
    allocatedWeight: number;
    status: string;
    commercialLots: Array<{
        id: string;
        lotCode: string;
        productName: string;
        quantity: number;
        unit: string;
        status: string;
        destinationName: string;
        traceabilityCode?: {
            id: string;
            publicToken: string;
            status: string;
        } | null;
    }>;
    batchDetails: {
        method: string;
        totalInputWeight: number;
        totalOutputWeight: number;
        yieldPercent: number;
        rawLots: Array<{
            code: string;
            farmName: string;
            variety: string;
            qcResult: string;
        }>;
    };
};

export function FinishedProductManager({
    initialLots,
    currentUserName,
}: {
    initialLots: FinishedProductLotItem[];
    currentUserName?: string;
}) {
    const [lots, setLots] = useState<FinishedProductLotItem[]>(initialLots);
    const [tab, setTab] = useState("all");
    const [viewLot, setViewLot] = useState<FinishedProductLotItem | null>(null);
    const [qcLot, setQcLot] = useState<FinishedProductLotItem | null>(null);
    const [warehouseInLot, setWarehouseInLot] = useState<FinishedProductLotItem | null>(null);

    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // 4 KPI Stats according to Section 14
    const stats = useMemo(() => {
        const total = lots.length;
        const pendingQc = lots.filter((l) => l.status === "PENDING_QC" || l.status === "QC_HOLD").length;
        const waitingWarehouse = lots.filter(
            (l) => l.status === "WAITING_WAREHOUSE_IN" || l.status === "QC_PASSED"
        ).length;
        const ready = lots.filter(
            (l) => ["READY_FOR_DISTRIBUTION", "AVAILABLE", "PARTIALLY_DISTRIBUTED"].includes(l.status)
        ).length;
        return { total, pendingQc, waitingWarehouse, ready };
    }, [lots]);

    const filteredLots = useMemo(() => {
        if (tab === "all") return lots;
        if (tab === "pending_qc") {
            return lots.filter((l) => l.status === "PENDING_QC" || l.status === "QC_HOLD");
        }
        if (tab === "waiting_warehouse") {
            return lots.filter((l) => l.status === "WAITING_WAREHOUSE_IN" || l.status === "QC_PASSED");
        }
        if (tab === "ready") {
            return lots.filter(
                (l) => ["READY_FOR_DISTRIBUTION", "AVAILABLE", "PARTIALLY_DISTRIBUTED"].includes(l.status) && l.remainingWeight > 0
            );
        }
        if (tab === "distributed") {
            return lots.filter((l) => l.status === "DISTRIBUTED" || l.remainingWeight <= 0);
        }
        if (tab === "failed") {
            return lots.filter((l) => l.status === "QC_FAILED" || l.status === "RECALLED");
        }
        return lots;
    }, [lots, tab]);

    // Handle QC Submission
    const handleQcSubmit = async (data: {
        result: "PASSED" | "CONDITIONAL" | "FAILED";
        appearance?: string;
        color?: string;
        odor?: string;
        packagingQuality?: string;
        netWeightChecked?: string;
        storageTemperatureChecked?: string;
        microbiologyResult?: string;
        testCertificateCode?: string;
        inspectedAt?: string;
        inspectorName?: string;
        note?: string;
    }) => {
        if (!qcLot) return;
        setBusy(qcLot.id);
        setError("");
        setSuccessMessage("");
        try {
            const response = await fetch(`/api/processing/finished-products/${qcLot.id}/qc`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!result.success) {
                setError(result.message || "Lưu kết quả QC thất bại.");
                setBusy(null);
                return;
            }

            const updatedLot = result.data;
            setLots((prev) =>
                prev.map((lot) =>
                    lot.id === qcLot.id ? { ...lot, status: updatedLot.status } : lot
                )
            );

            setQcLot(null);
            setSuccessMessage(
                data.result === "PASSED"
                    ? `QC Đạt! Lô ${qcLot.lotCode} đã sẵn sàng nhập kho thành phẩm.`
                    : data.result === "CONDITIONAL"
                    ? `QC Đạt có điều kiện. Lô ${qcLot.lotCode} đã chuyển sang Tạm giữ QC.`
                    : `QC Không đạt. Lô ${qcLot.lotCode} đã bị từ chối nhập kho.`
            );
            setTimeout(() => setSuccessMessage(""), 5000);
        } catch {
            setError("Lỗi kết nối máy chủ khi lưu kết quả QC.");
        } finally {
            setBusy(null);
        }
    };

    // Handle Warehouse-In Submission
    const handleWarehouseInSubmit = async (data: {
        warehouseLocation: string;
        warehouseShelve?: string;
        storageCondition: string;
        expiryDate: string;
        warehousedAt?: string;
        receiverName?: string;
        note?: string;
    }) => {
        if (!warehouseInLot) return;
        setBusy(warehouseInLot.id);
        setError("");
        setSuccessMessage("");
        try {
            const response = await fetch(`/api/processing/finished-products/${warehouseInLot.id}/warehouse-in`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!result.success) {
                setError(result.message || "Nhập kho thành phẩm thất bại.");
                setBusy(null);
                return;
            }

            const updatedLot = result.data;
            const fullLocation = data.warehouseShelve
                ? `${data.warehouseLocation} (${data.warehouseShelve})`
                : data.warehouseLocation;

            setLots((prev) =>
                prev.map((lot) =>
                    lot.id === warehouseInLot.id
                        ? {
                              ...lot,
                              status: "READY_FOR_DISTRIBUTION",
                              warehouseLocation: fullLocation,
                              storageCondition: data.storageCondition,
                              expiryDate: data.expiryDate,
                          }
                        : lot
                )
            );

            setWarehouseInLot(null);
            setSuccessMessage(`Đã nhập kho thành công lô ${warehouseInLot.lotCode}! Lô đã sẵn sàng Tạo QR xuất bán.`);
            setTimeout(() => setSuccessMessage(""), 5000);
        } catch {
            setError("Lỗi kết nối máy chủ khi nhập kho thành phẩm.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <span className="text-xs font-bold font-mono tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        MODULE THÀNH PHẨM
                    </span>
                    <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Lô thành phẩm</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý thành phẩm sau chế biến, kiểm định chất lượng QC, nhập kho lạnh và tạo QR xuất bán.
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

            {/* SECTION 1: 4 KPIS (Section 14) */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <MetricCard icon={Boxes} label="Tổng lô thành phẩm" value={stats.total} variant="slate" />
                <MetricCard icon={Clock} label="Chờ QC" value={stats.pendingQc} variant="amber" />
                <MetricCard icon={Warehouse} label="Chờ nhập kho" value={stats.waitingWarehouse} variant="sky" />
                <MetricCard icon={PackageCheck} label="Sẵn sàng phân phối" value={stats.ready} variant="emerald" />
            </section>

            {/* SECTION 2: 6 TABS LỌC TRẠNG THÁI (Section 14) */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex flex-wrap gap-2">
                        {[
                            ["all", "Tất cả"],
                            ["pending_qc", "Chờ QC"],
                            ["waiting_warehouse", "QC đạt / Chờ nhập kho"],
                            ["ready", "Sẵn sàng phân phối"],
                            ["distributed", "Đã phân phối"],
                            ["failed", "Không đạt"],
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

                {/* GRID THẺ THÀNH PHẨM (Section 15, 17, 19) */}
                <div className="grid gap-4 md:grid-cols-2">
                    {filteredLots.map((lot) => {
                        const badge = getStatusBadgeVariant(lot.status);
                        const isPendingQc = lot.status === "PENDING_QC" || lot.status === "QC_HOLD";
                        const isWaitingWarehouse = lot.status === "WAITING_WAREHOUSE_IN" || lot.status === "QC_PASSED";
                        const isReady = ["READY_FOR_DISTRIBUTION", "AVAILABLE", "PARTIALLY_DISTRIBUTED"].includes(lot.status) && lot.remainingWeight > 0;
                        const isFailed = lot.status === "QC_FAILED" || lot.status === "RECALLED";
                        const isFullyDistributed = lot.status === "DISTRIBUTED" || (!isFailed && !isPendingQc && !isWaitingWarehouse && lot.remainingWeight <= 0);

                        return (
                            <article
                                key={lot.id}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition space-y-4"
                            >
                                {/* HEADER CARD */}
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-mono font-bold tracking-wide text-brand-700">
                                                {lot.lotCode}
                                            </p>
                                            <span
                                                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-0.5 text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </div>
                                        <h3 className="mt-1.5 text-lg font-black uppercase text-slate-900">
                                            {lot.productName}
                                        </h3>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Nguồn chế biến:{" "}
                                            <b className="font-mono text-brand-700">{lot.sourceProcessingBatchCode}</b>
                                            {" · "}
                                            Ngày sản xuất:{" "}
                                            <span className="font-semibold text-slate-800">
                                                {new Date(lot.manufacturedAt).toLocaleDateString("vi-VN")}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* THÔNG TIN TRỌNG SỐ & QUY CÁCH */}
                                <dl className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Khối lượng đóng gói</dt>
                                        <dd className="mt-1 text-sm font-bold text-slate-800">
                                            {lot.netWeight.toLocaleString("vi-VN")} kg
                                        </dd>
                                    </div>

                                    {isReady || isFullyDistributed ? (
                                        <div className="rounded-xl bg-emerald-50/80 p-2.5 border border-emerald-200">
                                            <dt className="text-emerald-700 font-bold uppercase">Còn khả dụng</dt>
                                            <dd className="mt-1 text-base font-black text-emerald-800">
                                                {lot.remainingWeight.toLocaleString("vi-VN")} kg
                                            </dd>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                            <dt className="text-slate-400 font-semibold uppercase">Số lượng gói/túi</dt>
                                            <dd className="mt-1 text-sm font-bold text-slate-800">
                                                {lot.quantity.toLocaleString("vi-VN")} gói
                                            </dd>
                                        </div>
                                    )}

                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Quy cách</dt>
                                        <dd className="mt-1 text-xs font-bold text-slate-800">
                                            {lot.packaging || "500g/túi"}
                                        </dd>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Kho / Điều kiện</dt>
                                        <dd className="mt-1 text-xs font-bold text-slate-800 truncate" title={`${lot.warehouseLocation || "Chưa nhập kho"} · ${lot.storageCondition || "Âm sâu -18°C"}`}>
                                            {lot.warehouseLocation || "Chưa nhập kho"}
                                        </dd>
                                    </div>
                                </dl>

                                {/* PHẦN HIỂN THỊ LÔ THƯƠNG MẠI ĐÃ CHIA (NẾU CÓ) */}
                                {lot.commercialLots.length > 0 && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700 uppercase">
                                                Lô thương mại đã chia ({lot.commercialLots.length}):
                                            </span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {lot.commercialLots.map((cm) => (
                                                <div
                                                    key={cm.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-slate-200"
                                                >
                                                    <div>
                                                        <b className="font-mono text-brand-700">{cm.lotCode}</b>
                                                        <span className="text-slate-500 ml-1.5">
                                                            ({cm.quantity.toLocaleString("vi-VN")} {cm.unit}) →{" "}
                                                            <b className="text-slate-800">{cm.destinationName}</b>
                                                        </span>
                                                    </div>
                                                    {cm.traceabilityCode ? (
                                                        <Link
                                                            href={`/trace/${cm.traceabilityCode.publicToken}`}
                                                            target="_blank"
                                                            className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline"
                                                        >
                                                            <QrCode className="h-3.5 w-3.5" /> Quét QR <ExternalLink className="h-3 w-3" />
                                                        </Link>
                                                    ) : (
                                                        <span className="text-amber-700">Chưa cấp QR</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ACTIONS THEO TỪNG GIAI ĐOẠN */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold"
                                        onClick={() => setViewLot(lot)}
                                    >
                                        Xem chi tiết
                                    </Button>

                                    {/* GIAI ĐOẠN 1: CHỜ QC */}
                                    {isPendingQc && (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setError("");
                                                setQcLot(lot);
                                            }}
                                            className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm"
                                        >
                                            <FileCheck className="mr-1.5 h-4 w-4" /> Thực hiện QC
                                        </Button>
                                    )}

                                    {/* GIAI ĐOẠN 2: QC ĐẠT / CHỜ NHẬP KHO */}
                                    {isWaitingWarehouse && (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setError("");
                                                setWarehouseInLot(lot);
                                            }}
                                            className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm"
                                        >
                                            <Warehouse className="mr-1.5 h-4 w-4" /> Nhập kho thành phẩm
                                        </Button>
                                    )}

                                    {/* GIAI ĐOẠN 3: SẴN SÀNG PHÂN PHỐI */}
                                    {isReady && (
                                        <Link
                                            href={`/dashboard/processing/traceability?source=${lot.id}`}
                                            className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-sm transition"
                                        >
                                            <QrCode className="mr-1.5 h-4 w-4" /> Xuất bán & Tạo QR <ArrowRight className="ml-1.5 h-4 w-4" />
                                        </Link>
                                    )}
                                </div>
                            </article>
                        );
                    })}

                    {!filteredLots.length && (
                        <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                            Chưa có lô thành phẩm nào trong nhóm trạng thái này.
                        </div>
                    )}
                </div>
            </section>

            {/* MODAL 1: QC THÀNH PHẨM (Section 16) */}
            {qcLot && (
                <FinishedQcModal
                    lot={qcLot}
                    inspectorName={currentUserName || "Người kiểm tra"}
                    busy={busy === qcLot.id}
                    error={error}
                    onClose={() => setQcLot(null)}
                    onSubmit={handleQcSubmit}
                />
            )}

            {/* MODAL 2: NHẬP KHO THÀNH PHẨM (Section 18) */}
            {warehouseInLot && (
                <WarehouseInModal
                    lot={warehouseInLot}
                    receiverName={currentUserName || "Người nhập kho"}
                    busy={busy === warehouseInLot.id}
                    error={error}
                    onClose={() => setWarehouseInLot(null)}
                    onSubmit={handleWarehouseInSubmit}
                />
            )}

            {/* MODAL: XEM CHI TIẾT & CÂY PHẢ HỆ TRUY XUẤT NGUỒN GỐC */}
            {viewLot && <FinishedLotDetailModal lot={viewLot} onClose={() => setViewLot(null)} />}
        </div>
    );
}

// ---------------------- MODAL QC THÀNH PHẨM (Section 16) ----------------------

function FinishedQcModal({
    lot,
    inspectorName,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    lot: FinishedProductLotItem;
    inspectorName: string;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (data: {
        result: "PASSED" | "CONDITIONAL" | "FAILED";
        appearance?: string;
        color?: string;
        odor?: string;
        packagingQuality?: string;
        netWeightChecked?: string;
        storageTemperatureChecked?: string;
        microbiologyResult?: string;
        testCertificateCode?: string;
        inspectedAt?: string;
        inspectorName?: string;
        note?: string;
    }) => void;
}) {
    const [result, setResult] = useState<"PASSED" | "CONDITIONAL" | "FAILED">("PASSED");
    const [appearance, setAppearance] = useState("Đạt yêu cầu");
    const [color, setColor] = useState("Vàng tươi đặc trưng");
    const [odor, setOdor] = useState("Thơm nồng tự nhiên");
    const [packagingQuality, setPackagingQuality] = useState("Kín, hút chân không đạt");
    const [netWeightChecked, setNetWeightChecked] = useState("Đạt chuẩn định lượng");
    const [storageTempChecked, setStorageTempChecked] = useState("Đạt chuẩn nhiệt độ (≤ -18°C)");
    const [microbiologyResult, setMicrobiologyResult] = useState("Đạt tiêu chuẩn ATVSTP");
    const [testCertCode, setTestCertCode] = useState("");
    const [inspectedAt, setInspectedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [inspector, setInspector] = useState(inspectorName);
    const [note, setNote] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit({
            result,
            appearance,
            color,
            odor,
            packagingQuality,
            netWeightChecked,
            storageTemperatureChecked: storageTempChecked,
            microbiologyResult,
            testCertificateCode: testCertCode,
            inspectedAt: new Date(inspectedAt).toISOString(),
            inspectorName: inspector,
            note,
        });
    };

    return (
        <Modal title="QC THÀNH PHẨM" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                        {error}
                    </div>
                )}

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Lô thành phẩm:</span>
                        <b className="font-mono text-brand-700">{lot.lotCode}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Sản phẩm:</span>
                        <b className="text-slate-900">{lot.productName}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Khối lượng / Quy cách:</span>
                        <b className="text-slate-900">
                            {lot.netWeight.toLocaleString("vi-VN")} kg · {lot.packaging || "500g/túi"}
                        </b>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">
                            Kết quả QC thành phẩm <span className="text-rose-600">*</span>
                        </label>
                        <select
                            value={result}
                            onChange={(e) => setResult(e.target.value as any)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-bold"
                        >
                            <option value="PASSED">Đạt chuẩn (Cho phép nhập kho)</option>
                            <option value="CONDITIONAL">Đạt có điều kiện (Tạm giữ QC)</option>
                            <option value="FAILED">Không đạt (Từ chối nhập kho)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Ngoại quan *</label>
                        <select
                            value={appearance}
                            onChange={(e) => setAppearance(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        >
                            <option value="Đạt yêu cầu">Đạt yêu cầu</option>
                            <option value="Khuyết tật nhẹ">Khuyết tật nhẹ</option>
                            <option value="Không đạt">Không đạt</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Màu sắc *</label>
                        <select
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        >
                            <option value="Vàng tươi đặc trưng">Vàng tươi đặc trưng</option>
                            <option value="Vàng nhạt">Vàng nhạt</option>
                            <option value="Biến màu / Sậm màu">Biến màu / Sậm màu</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Mùi *</label>
                        <select
                            value={odor}
                            onChange={(e) => setOdor(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        >
                            <option value="Thơm nồng tự nhiên">Thơm nồng tự nhiên</option>
                            <option value="Mùi thơm nhẹ">Mùi thơm nhẹ</option>
                            <option value="Có mùi lạ / Chua">Có mùi lạ / Chua</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Quy cách đóng gói *</label>
                        <select
                            value={packagingQuality}
                            onChange={(e) => setPackagingQuality(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        >
                            <option value="Kín, hút chân không đạt">Kín, hút chân không đạt</option>
                            <option value="Hút chân không chưa hoàn hảo">Hút chân không chưa hoàn hảo</option>
                            <option value="Hở bao bì / Không đạt">Hở bao bì / Không đạt</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Khối lượng tịnh *</label>
                        <select
                            value={netWeightChecked}
                            onChange={(e) => setNetWeightChecked(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        >
                            <option value="Đạt chuẩn định lượng">Đạt chuẩn định lượng (sai số &lt;1%)</option>
                            <option value="Sai số trong mức cho phép">Sai số trong mức cho phép (&lt;3%)</option>
                            <option value="Thiếu khối lượng">Thiếu khối lượng</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Nhiệt độ bảo quản *</label>
                        <select
                            value={storageTempChecked}
                            onChange={(e) => setStorageTempChecked(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        >
                            <option value="Đạt chuẩn nhiệt độ (≤ -18°C)">Đạt chuẩn nhiệt độ (≤ -18°C)</option>
                            <option value="Bảo quản mát (0°C - 4°C)">Bảo quản mát (0°C - 4°C)</option>
                            <option value="Không đạt nhiệt độ">Không đạt nhiệt độ</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Kết quả vi sinh / Dư lượng *</label>
                        <select
                            value={microbiologyResult}
                            onChange={(e) => setMicrobiologyResult(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        >
                            <option value="Đạt tiêu chuẩn ATVSTP">Đạt tiêu chuẩn ATVSTP</option>
                            <option value="Đạt chuẩn xuất khẩu">Đạt chuẩn xuất khẩu</option>
                            <option value="Không đạt">Không đạt</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Mã phiếu kiểm nghiệm</label>
                        <input
                            type="text"
                            value={testCertCode}
                            onChange={(e) => setTestCertCode(e.target.value)}
                            placeholder="VD: PKN-20260825-01"
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs font-mono"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Người kiểm tra *</label>
                        <input
                            type="text"
                            required
                            value={inspector}
                            onChange={(e) => setInspector(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs font-semibold"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Ngày giờ kiểm tra *</label>
                        <input
                            type="datetime-local"
                            required
                            value={inspectedAt}
                            onChange={(e) => setInspectedAt(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Ghi chú QC</label>
                        <textarea
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ghi chú thêm về kiểm định chất lượng..."
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1 rounded-2xl font-bold" onClick={onClose} disabled={busy}>
                        Hủy
                    </Button>
                    <Button type="submit" className="flex-1 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold" disabled={busy}>
                        {busy ? "Đang lưu..." : "Lưu kết quả QC"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ---------------------- MODAL NHẬP KHO THÀNH PHẨM (Section 18) ----------------------

function WarehouseInModal({
    lot,
    receiverName,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    lot: FinishedProductLotItem;
    receiverName: string;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (data: {
        warehouseLocation: string;
        warehouseShelve?: string;
        storageCondition: string;
        expiryDate: string;
        warehousedAt?: string;
        receiverName?: string;
        note?: string;
    }) => void;
}) {
    const [warehouseLocation, setWarehouseLocation] = useState("KHO-TP-01 (Kho đông)");
    const [warehouseShelve, setWarehouseShelve] = useState("Kệ A-01");
    const [storageCondition, setStorageCondition] = useState("Âm sâu ≤ -18°C");
    const [expiryDate, setExpiryDate] = useState(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1); // 12 months default
        return d.toISOString().slice(0, 10);
    });
    const [warehousedAt, setWarehousedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [receiver, setReceiver] = useState(receiverName);
    const [note, setNote] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit({
            warehouseLocation,
            warehouseShelve,
            storageCondition,
            expiryDate,
            warehousedAt: new Date(warehousedAt).toISOString(),
            receiverName: receiver,
            note,
        });
    };

    return (
        <Modal title="NHẬP KHO THÀNH PHẨM" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                        {error}
                    </div>
                )}

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Lô thành phẩm:</span>
                        <b className="font-mono text-brand-700">{lot.lotCode}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Tên sản phẩm:</span>
                        <b className="text-slate-900">{lot.productName}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Khối lượng / Số lượng:</span>
                        <b className="text-emerald-700 font-black">
                            {lot.netWeight.toLocaleString("vi-VN")} kg · {lot.quantity.toLocaleString("vi-VN")} gói
                        </b>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-bold text-slate-700">
                            Kho thành phẩm <span className="text-rose-600">*</span>
                        </label>
                        <select
                            value={warehouseLocation}
                            onChange={(e) => setWarehouseLocation(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold"
                        >
                            <option value="KHO-TP-01 (Kho đông)">KHO-TP-01 (Kho đông)</option>
                            <option value="KHO-TP-02 (Kho mát)">KHO-TP-02 (Kho mát)</option>
                            <option value="KHO-TP-03 (Kho trung chuyển)">KHO-TP-03 (Kho trung chuyển)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">
                            Vị trí kho / Kệ <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={warehouseShelve}
                            onChange={(e) => setWarehouseShelve(e.target.value)}
                            placeholder="VD: Kệ A-01"
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">
                            Điều kiện bảo quản <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={storageCondition}
                            onChange={(e) => setStorageCondition(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">
                            Hạn sử dụng <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="date"
                            required
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Ngày giờ nhập kho *</label>
                        <input
                            type="datetime-local"
                            required
                            value={warehousedAt}
                            onChange={(e) => setWarehousedAt(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">Người nhập kho *</label>
                        <input
                            type="text"
                            required
                            value={receiver}
                            onChange={(e) => setReceiver(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs font-semibold"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                        <textarea
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ghi chú nhập kho thành phẩm..."
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2 text-xs"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1 rounded-2xl font-bold" onClick={onClose} disabled={busy}>
                        Hủy
                    </Button>
                    <Button type="submit" className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold" disabled={busy}>
                        {busy ? "Đang xử lý..." : "Xác nhận nhập kho"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ---------------------- MODAL CHI TIẾT & PHẢ HỆ THÀNH PHẨM ----------------------

function FinishedLotDetailModal({
    lot,
    onClose,
}: {
    lot: FinishedProductLotItem;
    onClose: () => void;
}) {
    const badge = getStatusBadgeVariant(lot.status);

    return (
        <Modal title={`CHI TIẾT LÔ THÀNH PHẨM: ${lot.lotCode}`} onClose={onClose}>
            <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                    <div>
                        <span className="font-bold text-slate-900 text-base">{lot.productName}</span>
                        <p className="text-xs text-slate-500 font-mono">ID: {lot.id}</p>
                    </div>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                    </span>
                </div>

                {/* THÔNG TIN THÀNH PHẨM */}
                <div className="rounded-2xl border bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Mã mẻ chế biến nguồn:</span>
                        <b className="font-mono text-brand-700">{lot.sourceProcessingBatchCode}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Khối lượng ban đầu:</span>
                        <b className="text-slate-900">{lot.netWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Còn khả dụng:</span>
                        <b className="text-emerald-700 font-black text-sm">{lot.remainingWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Quy cách & Số lượng:</span>
                        <b className="text-slate-800">{lot.packaging || "500g/túi"} ({lot.quantity.toLocaleString("vi-VN")} gói)</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Kho & Điều kiện:</span>
                        <b className="text-slate-800">{lot.warehouseLocation || "Chưa nhập kho"} ({lot.storageCondition || "Âm sâu -18°C"})</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Ngày SX / Hạn SD:</span>
                        <b className="text-slate-800">
                            {new Date(lot.manufacturedAt).toLocaleDateString("vi-VN")} - {lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString("vi-VN") : "12 tháng"}
                        </b>
                    </div>
                </div>

                {/* CÂY PHẢ HỆ NGUỒN GỐC */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Cây phả hệ truy xuất nguồn gốc (Lineage)
                    </p>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            <span className="text-slate-600 font-medium">Nguồn nguyên liệu:</span>
                            <span className="font-bold text-slate-800">
                                {lot.batchDetails.rawLots.map((r) => `${r.code} (${r.farmName})`).join(", ") || "Lô nguyên liệu chuẩn"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            <span className="text-slate-600 font-medium">Mẻ chế biến:</span>
                            <span className="font-mono font-bold text-brand-700">{lot.sourceProcessingBatchCode}</span>
                            <span className="text-slate-500">
                                (Yield: {lot.batchDetails.yieldPercent}% | {lot.batchDetails.method})
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            <span className="text-slate-600 font-medium">Lô thành phẩm:</span>
                            <span className="font-mono font-bold text-emerald-800">{lot.lotCode}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" className="rounded-2xl font-bold" onClick={onClose}>
                        Đóng
                    </Button>
                    {lot.remainingWeight > 0 && (
                        <Link
                            href={`/dashboard/processing/traceability?source=${lot.id}`}
                            className="inline-flex items-center rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 text-xs transition"
                        >
                            <QrCode className="mr-1.5 h-4 w-4" /> Tạo QR xuất bán
                        </Link>
                    )}
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
    icon: typeof Boxes;
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
