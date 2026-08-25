"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    ExternalLink,
    Factory,
    PackageCheck,
    QrCode,
    Scale,
    ShieldCheck,
    Truck,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatusBadgeVariant } from "@/lib/processing-facility";

export type FinishedLotItem = {
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
        traceabilityCode: {
            id: string;
            publicToken: string;
            status: string;
        } | null;
    }>;
    batchDetails?: {
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
    } | null;
};

export function FinishedProductManager({
    initialLots,
}: {
    initialLots: FinishedLotItem[];
}) {
    const [lots] = useState<FinishedLotItem[]>(initialLots);
    const [tab, setTab] = useState("all");
    const [viewLot, setViewLot] = useState<FinishedLotItem | null>(null);

    const filteredLots = useMemo(() => {
        if (tab === "all") return lots;
        if (tab === "ready") return lots.filter((l) => l.status === "READY_FOR_DISTRIBUTION");
        if (tab === "partial") return lots.filter((l) => l.status === "PARTIALLY_DISTRIBUTED");
        if (tab === "distributed") return lots.filter((l) => l.status === "DISTRIBUTED");
        if (tab === "has_qr") return lots.filter((l) => l.commercialLots.some((c) => c.traceabilityCode));
        return lots;
    }, [lots, tab]);

    const totalWeight = useMemo(() => lots.reduce((acc, l) => acc + l.netWeight, 0), [lots]);
    const remainingWeight = useMemo(() => lots.reduce((acc, l) => acc + l.remainingWeight, 0), [lots]);

    return (
        <div className="space-y-6">
            {/* KPI STATS */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <MetricCard
                    icon={PackageCheck}
                    label="Tổng lô thành phẩm"
                    value={lots.length}
                    subValue={`${totalWeight.toLocaleString("vi-VN")} kg`}
                    variant="slate"
                />
                <MetricCard
                    icon={CheckCircle2}
                    label="Sẵn sàng phân phối"
                    value={lots.filter((l) => l.status === "READY_FOR_DISTRIBUTION").length}
                    subValue="Chưa xuất lô nào"
                    variant="emerald"
                />
                <MetricCard
                    icon={Scale}
                    label="Đang phân phối một phần"
                    value={lots.filter((l) => l.status === "PARTIALLY_DISTRIBUTED").length}
                    subValue={`Còn ${remainingWeight.toLocaleString("vi-VN")} kg`}
                    variant="sky"
                />
                <MetricCard
                    icon={Truck}
                    label="Đã phân phối hết"
                    value={lots.filter((l) => l.status === "DISTRIBUTED").length}
                    subValue="Xuất đủ 100%"
                    variant="amber"
                />
            </section>

            {/* TABS & LIST */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex flex-wrap gap-2">
                        {[
                            ["all", "Tất cả"],
                            ["ready", "Sẵn sàng phân phối"],
                            ["partial", "Đã phân bổ một phần"],
                            ["distributed", "Đã phân phối hết"],
                            ["has_qr", "Đã có mã QR"],
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

                <div className="grid gap-4 lg:grid-cols-2">
                    {filteredLots.map((lot) => {
                        const badge = getStatusBadgeVariant(lot.status);
                        const isAvailable = lot.remainingWeight > 0;

                        return (
                            <article
                                key={lot.id}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2 border-b pb-3">
                                        <div>
                                            <p className="text-xs font-mono font-bold tracking-wide text-brand-700">
                                                {lot.lotCode}
                                            </p>
                                            <h3 className="mt-1 text-lg font-black text-slate-900">
                                                {lot.productName}
                                            </h3>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                Nguồn chế biến:{" "}
                                                <b className="font-mono text-slate-700">
                                                    {lot.sourceProcessingBatchCode}
                                                </b>{" "}
                                                · Loại: <span className="font-semibold">{lot.productType}</span>
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex shrink-0 items-center rounded-full border px-3 py-0.5 text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                                        >
                                            {badge.label}
                                        </span>
                                    </div>

                                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                            <dt className="text-slate-400 font-semibold uppercase">Khối lượng ban đầu</dt>
                                            <dd className="mt-0.5 font-bold text-slate-800">
                                                {lot.netWeight.toLocaleString("vi-VN")} kg
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                            <dt className="text-slate-400 font-semibold uppercase">Đã phân bổ</dt>
                                            <dd className="mt-0.5 font-bold text-slate-700">
                                                {lot.allocatedWeight.toLocaleString("vi-VN")} kg
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 col-span-2 sm:col-span-1">
                                            <dt className="text-slate-400 font-semibold uppercase">Còn khả dụng</dt>
                                            <dd className="mt-0.5 font-black text-brand-700 text-sm">
                                                {lot.remainingWeight.toLocaleString("vi-VN")} kg
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                            <dt className="text-slate-400 font-semibold uppercase">Ngày sản xuất</dt>
                                            <dd className="mt-0.5 font-semibold text-slate-800">
                                                {new Date(lot.manufacturedAt).toLocaleDateString("vi-VN")}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                            <dt className="text-slate-400 font-semibold uppercase">Quy cách</dt>
                                            <dd className="mt-0.5 font-semibold text-slate-800 truncate" title={lot.packaging || "Chưa cập nhật"}>
                                                {lot.packaging || "Chưa cập nhật"}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                            <dt className="text-slate-400 font-semibold uppercase">Vị trí kho</dt>
                                            <dd className="mt-0.5 font-semibold text-slate-800 truncate" title={lot.warehouseLocation || "Kho TP"}>
                                                {lot.warehouseLocation || "Kho TP-01"}
                                            </dd>
                                        </div>
                                    </dl>

                                    {/* DANH SÁCH LÔ THƯƠNG MẠI / QR ĐÃ XUẤT */}
                                    {lot.commercialLots.length > 0 && (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <QrCode className="h-3.5 w-3.5" /> Các lô xuất / Mã QR ({lot.commercialLots.length})
                                                </span>
                                                <Link
                                                    href="/dashboard/processing/traceability"
                                                    className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                                                >
                                                    Quản lý QR <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </div>
                                            <div className="space-y-1.5">
                                                {lot.commercialLots.map((cm) => (
                                                    <div
                                                        key={cm.id}
                                                        className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-emerald-100"
                                                    >
                                                        <div>
                                                            <b className="font-mono text-emerald-900 block">{cm.lotCode}</b>
                                                            <span className="text-slate-500">
                                                                {cm.quantity.toLocaleString("vi-VN")} {cm.unit} · {cm.destinationName}
                                                            </span>
                                                        </div>
                                                        {cm.traceabilityCode ? (
                                                            <Link
                                                                target="_blank"
                                                                href={`/trace/${cm.traceabilityCode.publicToken}`}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800 transition"
                                                            >
                                                                {cm.traceabilityCode.publicToken} <ExternalLink className="h-3 w-3" />
                                                            </Link>
                                                        ) : (
                                                            <span className="text-amber-700 font-semibold text-xs">
                                                                Chờ tạo QR
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        className="flex-1 font-bold text-slate-700"
                                        onClick={() => setViewLot(lot)}
                                    >
                                        Xem chi tiết
                                    </Button>
                                    {isAvailable && (
                                        <Link
                                            href={`/dashboard/processing/traceability?source=${lot.id}`}
                                            className="flex-1 inline-flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 text-sm font-bold shadow-sm transition"
                                        >
                                            <QrCode className="mr-1.5 h-4 w-4" /> Tạo QR
                                        </Link>
                                    )}
                                </div>
                            </article>
                        );
                    })}

                    {!filteredLots.length && (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 lg:col-span-2">
                            Chưa có lô thành phẩm nào trong nhóm này.
                        </div>
                    )}
                </div>
            </section>

            {/* MODAL: CHI TIẾT LÔ THÀNH PHẨM & TRACE LINEAGE */}
            {viewLot && (
                <Modal title={`Chi tiết Lô thành phẩm ${viewLot.lotCode}`} onClose={() => setViewLot(null)}>
                    <div className="space-y-4 text-xs">
                        <div className="rounded-2xl border bg-slate-50 p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Mã lô thành phẩm:</span>
                                <b className="font-mono text-brand-700 text-sm">{viewLot.lotCode}</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tên sản phẩm:</span>
                                <b className="text-slate-800 text-sm">{viewLot.productName}</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Loại sản phẩm / Chế biến:</span>
                                <b className="text-slate-800">{viewLot.productType}</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Khối lượng ban đầu:</span>
                                <b className="text-slate-900">{viewLot.netWeight.toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Đã phân bổ xuất:</span>
                                <b className="text-slate-700">{viewLot.allocatedWeight.toLocaleString("vi-VN")} kg</b>
                            </div>
                            <div className="flex justify-between border-t pt-1">
                                <span className="font-bold text-slate-700">Khối lượng còn khả dụng:</span>
                                <b className="font-black text-emerald-700 text-sm">
                                    {viewLot.remainingWeight.toLocaleString("vi-VN")} kg
                                </b>
                            </div>
                        </div>

                        {/* NGUỒN GỐC CHẾ BIẾN & NGUYÊN LIỆU */}
                        <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
                            <h4 className="font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Factory className="h-4 w-4 text-brand-600" /> Nguồn gốc chế biến & Nguyên liệu
                            </h4>
                            <div className="flex justify-between items-center rounded-xl bg-slate-50 p-2.5 border">
                                <div>
                                    <span className="text-slate-400 block">Mã mẻ chế biến:</span>
                                    <b className="font-mono text-brand-700">{viewLot.sourceProcessingBatchCode}</b>
                                </div>
                                {viewLot.batchDetails && (
                                    <div className="text-right">
                                        <span className="text-slate-400 block">Hiệu suất thu hồi:</span>
                                        <b className="text-emerald-700 font-bold">{viewLot.batchDetails.yieldPercent}%</b>
                                    </div>
                                )}
                            </div>

                            {viewLot.batchDetails?.rawLots && viewLot.batchDetails.rawLots.length > 0 && (
                                <div className="space-y-1 pt-1">
                                    <span className="font-bold text-slate-600 block">Lô nguyên liệu & Vườn nguồn:</span>
                                    {viewLot.batchDetails.rawLots.map((raw, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                                            <div>
                                                <b className="font-mono text-emerald-900 block">{raw.code}</b>
                                                <span className="text-slate-600">{raw.farmName} ({raw.variety})</span>
                                            </div>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                                <ShieldCheck className="h-3 w-3" /> QC {raw.qcResult === "PASSED" ? "Đạt" : raw.qcResult}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* DANH SÁCH LÔ THƯƠNG MẠI */}
                        {viewLot.commercialLots.length > 0 && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                                <h4 className="font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                    <QrCode className="h-4 w-4" /> Các lô bán / QR đã phát hành
                                </h4>
                                <div className="space-y-1.5">
                                    {viewLot.commercialLots.map((cm) => (
                                        <div key={cm.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border">
                                            <div>
                                                <b className="font-mono text-slate-800 block">{cm.lotCode}</b>
                                                <span className="text-slate-500">{cm.quantity} {cm.unit} · {cm.destinationName}</span>
                                            </div>
                                            {cm.traceabilityCode && (
                                                <Link
                                                    target="_blank"
                                                    href={`/trace/${cm.traceabilityCode.publicToken}`}
                                                    className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 hover:underline"
                                                >
                                                    {cm.traceabilityCode.publicToken} <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setViewLot(null)}>
                                Đóng
                            </Button>
                            {viewLot.remainingWeight > 0 && (
                                <Link
                                    href={`/dashboard/processing/traceability?source=${viewLot.id}`}
                                    className="flex-1 inline-flex items-center justify-center rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 text-sm font-bold shadow-sm transition"
                                >
                                    <QrCode className="mr-1.5 h-4 w-4" /> Tạo QR xuất bán
                                </Link>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    subValue,
    variant,
}: {
    icon: typeof PackageCheck;
    label: string;
    value: number;
    subValue?: string;
    variant: "slate" | "emerald" | "sky" | "amber";
}) {
    const bgMap = {
        slate: "bg-slate-50 text-slate-700",
        emerald: "bg-emerald-50 text-emerald-700",
        sky: "bg-sky-50 text-sky-700",
        amber: "bg-amber-50 text-amber-700",
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
            {subValue && (
                <p className="mt-0.5 text-xs text-slate-400 truncate">{subValue}</p>
            )}
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
