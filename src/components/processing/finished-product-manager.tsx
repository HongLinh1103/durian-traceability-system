"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    Boxes,
    CheckCircle2,
    PackageCheck,
    QrCode,
    Truck,
    X,
    ExternalLink,
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
}: {
    initialLots: FinishedProductLotItem[];
}) {
    const [lots] = useState<FinishedProductLotItem[]>(initialLots);
    const [tab, setTab] = useState("all");
    const [viewLot, setViewLot] = useState<FinishedProductLotItem | null>(null);

    const filteredLots = useMemo(() => {
        if (tab === "all") return lots;
        if (tab === "ready") return lots.filter((l) => ["READY_FOR_DISTRIBUTION", "AVAILABLE"].includes(l.status) && l.remainingWeight > 0);
        if (tab === "partial") return lots.filter((l) => l.status === "PARTIALLY_DISTRIBUTED");
        if (tab === "distributed") return lots.filter((l) => l.status === "DISTRIBUTED" || l.remainingWeight <= 0);
        return lots;
    }, [lots, tab]);

    // 4 KPI Stats according to Section XXXV
    const stats = useMemo(() => {
        const total = lots.length;
        const ready = lots.filter(
            (l) => ["READY_FOR_DISTRIBUTION", "AVAILABLE"].includes(l.status) && l.remainingWeight > 0
        ).length;
        const partial = lots.filter((l) => l.status === "PARTIALLY_DISTRIBUTED").length;
        const distributed = lots.filter((l) => l.status === "DISTRIBUTED" || l.remainingWeight <= 0).length;
        return { total, ready, partial, distributed };
    }, [lots]);

    return (
        <div className="space-y-6">
            {/* SECTION 1: 4 KPIS (Section XXXV) */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <MetricCard icon={Boxes} label="Tổng lô thành phẩm" value={stats.total} variant="slate" />
                <MetricCard
                    icon={PackageCheck}
                    label="Sẵn sàng phân phối"
                    value={stats.ready}
                    variant="emerald"
                />
                <MetricCard
                    icon={Truck}
                    label="Đã phân bổ một phần"
                    value={stats.partial}
                    variant="sky"
                />
                <MetricCard
                    icon={CheckCircle2}
                    label="Đã phân phối"
                    value={stats.distributed}
                    variant="slate"
                />
            </section>

            {/* SECTION 2: TABS LỌC TRẠNG THÁI */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex flex-wrap gap-2">
                        {[
                            ["all", "Tất cả"],
                            ["ready", "Sẵn sàng phân phối"],
                            ["partial", "Đã phân bổ một phần"],
                            ["distributed", "Đã phân phối"],
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

                {/* GRID THẺ THÀNH PHẨM (Section XXXVI, XXXVII, XXXVIII) */}
                <div className="grid gap-4 md:grid-cols-2">
                    {filteredLots.map((lot) => {
                        const badge = getStatusBadgeVariant(lot.status);
                        const hasRemaining = lot.remainingWeight > 0;

                        return (
                            <article
                                key={lot.id}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition space-y-4"
                            >
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
                                            Phương pháp: <span className="font-medium text-slate-700">{lot.productType}</span>
                                        </p>
                                    </div>
                                </div>

                                <dl className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Khối lượng ban đầu</dt>
                                        <dd className="mt-1 text-sm font-bold text-slate-800">
                                            {lot.netWeight.toLocaleString("vi-VN")} kg
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                        <dt className="text-slate-400 font-semibold uppercase">Đã phân bổ xuất</dt>
                                        <dd className="mt-1 text-sm font-bold text-slate-600">
                                            {lot.allocatedWeight.toLocaleString("vi-VN")} kg
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-emerald-50/80 p-2.5 border border-emerald-200 col-span-2 sm:col-span-1">
                                        <dt className="text-emerald-700 font-bold uppercase">Còn khả dụng</dt>
                                        <dd className="mt-1 text-base font-black text-emerald-800">
                                            {lot.remainingWeight.toLocaleString("vi-VN")} kg
                                        </dd>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 col-span-2 sm:col-span-1">
                                        <dt className="text-slate-400 font-semibold uppercase">Quy cách đóng gói</dt>
                                        <dd className="mt-1 text-xs font-bold text-slate-800">
                                            {lot.packaging || "Chưa cập nhật"}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                                    <div>
                                        <span className="text-slate-400 block">Kho lưu trữ:</span>
                                        <b className="text-slate-800">{lot.warehouseLocation || "KHO-TP-01"}</b>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Điều kiện bảo quản:</span>
                                        <b className="text-slate-800">{lot.storageCondition || "Âm sâu -18°C"}</b>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Ngày sản xuất:</span>
                                        <span className="font-medium text-slate-800">
                                            {new Date(lot.manufacturedAt).toLocaleDateString("vi-VN")}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Hạn sử dụng:</span>
                                        <span className="font-medium text-slate-800">
                                            {lot.expiryDate
                                                ? new Date(lot.expiryDate).toLocaleDateString("vi-VN")
                                                : "12 tháng"}
                                        </span>
                                    </div>
                                </div>

                                {/* PARTIAL COMMERCIAL LOTS & ISSUED QR LIST */}
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

                                {/* ACTIONS */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold"
                                        onClick={() => setViewLot(lot)}
                                    >
                                        Xem chi tiết & Phả hệ
                                    </Button>

                                    {hasRemaining && (
                                        <Link
                                            href={`/dashboard/processing/traceability?source=${lot.id}`}
                                            className="flex-1 inline-flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-sm transition"
                                        >
                                            <QrCode className="mr-1.5 h-4 w-4" /> Tạo QR xuất bán
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

            {/* MODAL: XEM CHI TIẾT & CÂY PHẢ HỆ TRUY XUẤT NGUỒN GỐC */}
            {viewLot && <FinishedLotDetailModal lot={viewLot} onClose={() => setViewLot(null)} />}
        </div>
    );
}

// ---------------------- SUB-MODAL COMPONENTS ----------------------

function FinishedLotDetailModal({
    lot,
    onClose,
}: {
    lot: FinishedProductLotItem;
    onClose: () => void;
}) {
    const badge = getStatusBadgeVariant(lot.status);
    const hasRemaining = lot.remainingWeight > 0;

    return (
        <Modal title={`Phả hệ Lô thành phẩm ${lot.lotCode}`} onClose={onClose}>
            <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                    <div>
                        <span className="font-mono font-bold text-brand-700">{lot.lotCode}</span>
                        <h3 className="font-black text-slate-900 uppercase text-base">{lot.productName}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                    </span>
                </div>

                {/* BASIC INFO */}
                <div className="rounded-2xl border bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Khối lượng ban đầu:</span>
                        <b className="text-slate-800">{lot.netWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Đã phân bổ xuất:</span>
                        <b className="text-slate-600">{lot.allocatedWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
                        <span className="font-bold text-emerald-800">Khối lượng khả dụng còn lại:</span>
                        <b className="font-black text-emerald-700">{lot.remainingWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Quy cách & Bao bì:</span>
                        <b className="text-slate-800">{lot.packaging || "Chưa cập nhật"}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Kho & Điều kiện:</span>
                        <b className="text-slate-800">
                            {lot.warehouseLocation || "Kho TP"} · {lot.storageCondition || "-18°C"}
                        </b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Ngày sản xuất:</span>
                        <b className="text-slate-800">{new Date(lot.manufacturedAt).toLocaleString("vi-VN")}</b>
                    </div>
                </div>

                {/* LINEAGE TRACING TREE (Farm -> Harvest -> Batch -> Finished) */}
                <div className="space-y-3">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700">
                        Cây phả hệ truy xuất nguồn gốc
                    </h4>

                    <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-200">
                        {/* 1. NGUỒN NÔNG HỘ / VƯỜN */}
                        {lot.batchDetails.rawLots.map((raw, idx) => (
                            <div key={idx} className="relative rounded-2xl border bg-white p-3 text-xs space-y-1 shadow-sm">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
                                        1
                                    </span>
                                    <span>Vườn trồng & Thu hoạch: {raw.farmName}</span>
                                </div>
                                <p className="text-slate-600">
                                    Giống sầu riêng: <b>{raw.variety}</b> · Lô nguyên liệu nguồn:{" "}
                                    <b className="font-mono text-brand-700">{raw.code}</b>
                                </p>
                            </div>
                        ))}

                        {/* 2. MẺ CHẾ BIẾN */}
                        <div className="relative rounded-2xl border bg-white p-3 text-xs space-y-1 shadow-sm">
                            <div className="flex items-center gap-1.5 font-bold text-brand-800">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white">
                                    2
                                </span>
                                <span>Mẻ chế biến: {lot.sourceProcessingBatchCode}</span>
                            </div>
                            <p className="text-slate-600">
                                Phương pháp: <b>{lot.batchDetails.method}</b> · Đầu vào:{" "}
                                <b>{lot.batchDetails.totalInputWeight.toLocaleString("vi-VN")} kg</b> · Tỷ lệ thu hồi:{" "}
                                <b className="text-emerald-700">{lot.batchDetails.yieldPercent}%</b>
                            </p>
                        </div>

                        {/* 3. LÔ THÀNH PHẨM */}
                        <div className="relative rounded-2xl border border-emerald-300 bg-emerald-50/50 p-3 text-xs space-y-1 shadow-sm">
                            <div className="flex items-center gap-1.5 font-black text-emerald-900">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 text-[10px] text-white">
                                    3
                                </span>
                                <span>Lô thành phẩm hoàn tất: {lot.lotCode}</span>
                            </div>
                            <p className="text-slate-700">
                                Đóng gói <b>{lot.packaging}</b> · Khối lượng: <b>{lot.netWeight.toLocaleString("vi-VN")} kg</b>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 rounded-2xl" onClick={onClose}>
                        Đóng
                    </Button>
                    {hasRemaining && (
                        <Link
                            href={`/dashboard/processing/traceability?source=${lot.id}`}
                            className="flex-1 inline-flex items-center justify-center rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 text-sm font-bold shadow-sm transition"
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
    variant,
}: {
    icon: typeof Boxes;
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
