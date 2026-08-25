"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
    CalendarDays,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    MapPin,
    Scale,
    Sprout,
    X,
    ShieldCheck,
    ArrowRight,
    Truck,
    Warehouse,
    FileCheck,
    Factory,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    QC_APPEARANCE_OPTIONS,
    QC_RIPENESS_OPTIONS,
    QC_GRADE_OPTIONS,
    QC_RESIDUE_OPTIONS,
    QC_REJECT_REASONS,
    PRODUCTION_LINES,
    FREEZING_METHODS,
    formatStatusLabel,
} from "@/lib/processing-facility";

export type HarvestRow = {
    id: string;
    code: string;
    status: string;
    expectedWeight: string | number;
    actualWeight?: string | number | null;
    deliveredWeight?: string | number | null;
    receivedWeight?: string | number | null;
    weightUnit: string;
    expectedHarvestDate: string;
    expectedPricePerKg?: string | number | null;
    farmerDeliveredAt?: string | null;
    farm: {
        farmName: string;
        farmCode?: string;
        address: string;
        durianVariety: string;
        region?: { code: string } | null;
    };
    farmer?: { fullName: string; phone: string };
};

export type RawLot = {
    id: string;
    code: string;
    status: string;
    sourceCode: string;
    farmName: string;
    variety?: string;
    supplierName: string;
    receivedAt: string;
    sentWeight: number;
    actualReceivedWeight: number;
    acceptedWeight?: number;
    currentWeight?: number;
    rejectedWeight?: number;
    qualityResult?: string | null;
    warehouseLocation?: string | null;
    inspection?: {
        id: string;
        result: string;
        inspectedAt: string;
        qualityGrade?: string | null;
        appearance?: string | null;
        residueResult?: string | null;
        damageRate?: number;
        note?: string | null;
        inspectorName?: string | null;
    } | null;
    batches?: Array<{ id: string; code: string; targetProduct: string; status: string }>;
};

const processingTabs = [
    ["all", "Tất cả"],
    ["new", "Mới / Chờ xác nhận"],
    ["upcoming", "Sắp giao"],
    ["transit", "Đang vận chuyển"],
    ["qc", "Chờ QC"],
    ["ready", "Sẵn sàng chế biến"],
    ["quarantined", "Cách ly"],
    ["rejected", "Không đạt"],
];

const collectorTabs = [
    ["all", "Tất cả"],
    ["WAITING_CONFIRMATION", "Mới / Chờ xác nhận"],
    ["CONFIRMED", "Đã xác nhận"],
    ["upcoming", "Sắp thu hoạch"],
    ["HARVESTED", "Đã thu hoạch"],
    ["REJECTED", "Đã từ chối"],
];

export function PartnerHarvests({
    initial,
    mode = "COLLECTOR",
    rawLots = [],
    initialTab = "all",
}: {
    initial: HarvestRow[];
    mode?: "COLLECTOR" | "PROCESSING_FACILITY";
    rawLots?: RawLot[];
    initialTab?: string;
}) {
    const { data: session } = useSession();
    const [rows, setRows] = useState(initial);
    const [lots, setLots] = useState(rawLots);
    const [tab, setTab] = useState(initialTab);
    const [busy, setBusy] = useState<string | null>(null);
    const [receiveRow, setReceiveRow] = useState<HarvestRow | null>(null);
    const [qcLot, setQcLot] = useState<RawLot | null>(null);
    const [viewLot, setViewLot] = useState<RawLot | null>(null);
    const [viewHarvestRow, setViewHarvestRow] = useState<HarvestRow | null>(null);
    const [issueLot, setIssueLot] = useState<RawLot | null>(null);
    const [issuedBatchInfo, setIssuedBatchInfo] = useState<{ batchCode: string; lotCode: string } | null>(null);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            if (tab === "all") return true;
            if (tab === "action-required") return ["WAITING_CONFIRMATION", "DELIVERY_CONFIRMED"].includes(row.status);
            if (mode === "COLLECTOR") {
                return tab === "upcoming" ? ["CONFIRMED", "HARVESTING"].includes(row.status) : row.status === tab;
            }
            if (tab === "new") return row.status === "WAITING_CONFIRMATION" || row.status === "PENDING";
            if (tab === "upcoming") return ["CONFIRMED", "HARVESTING", "HARVESTED"].includes(row.status);
            if (tab === "transit") return ["DELIVERY_CONFIRMED", "DISPATCHED", "IN_TRANSIT"].includes(row.status);
            if (tab === "rejected") return ["REJECTED", "CANCELLED"].includes(row.status);
            return false;
        });
    }, [rows, tab, mode]);

    const filteredLots = useMemo(() => {
        return lots.filter((lot) => {
            if (tab === "all") return true;
            if (tab === "action-required") return lot.status === "PENDING_QC";
            if (tab === "qc") return lot.status === "PENDING_QC";
            if (tab === "ready") return ["AVAILABLE", "PARTIALLY_USED"].includes(lot.status) && (lot.currentWeight ?? lot.actualReceivedWeight) > 0;
            if (tab === "quarantined") return lot.status === "QUARANTINED" || lot.qualityResult === "CONDITIONAL";
            if (tab === "rejected") return lot.status === "REJECTED" || lot.qualityResult === "FAILED";
            return false;
        });
    }, [lots, tab]);

    // Action: Xác nhận tiếp nhận nguồn / Từ chối nguồn
    async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
        const reason = action === "REJECT" ? prompt("Lý do từ chối nguồn nguyên liệu:")?.trim() : undefined;
        if (action === "REJECT" && !reason) return false;
        setBusy(id);
        setError("");
        setSuccessMessage("");
        try {
            const response = await fetch(`/api/harvests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, rejectReason: reason, ...extra }),
            });
            const result = await response.json();
            if (!result.success) {
                alert(result.message || "Thao tác không thành công.");
                return false;
            }
            setRows((prev) => prev.map((item) => (item.id === id ? { ...item, status: result.data.status } : item)));
            setSuccessMessage(action === "CONFIRM" ? "Đã đồng ý tiếp nhận nguồn nguyên liệu. Đang chờ đối tác giao hàng." : "Đã cập nhật trạng thái phiếu.");
            setTimeout(() => setSuccessMessage(""), 5000);
            return true;
        } catch {
            alert("Lỗi kết nối máy chủ.");
            return false;
        } finally {
            setBusy(null);
        }
    }

    // Submit Tiếp nhận thực tế -> Tạo RawMaterialReceipt + RawMaterialLot (PENDING_QC)
    const submitReceipt = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!receiveRow) return;
        setBusy(receiveRow.id);
        setError("");
        setSuccessMessage("");
        const form = new FormData(event.currentTarget);
        const receivedWeight = Number(form.get("receivedWeight") || 0);
        const rejectedWeight = Number(form.get("rejectedWeight") || 0);
        const receivedAt = String(form.get("receivedAt") || "");
        const receiverName = String(form.get("receiverName") || "");
        const weightDifferenceReason = String(form.get("weightDifferenceReason") || "");
        const warehouseLocation = String(form.get("warehouseLocation") || "");
        const note = String(form.get("note") || "");

        try {
            const response = await fetch(`/api/harvests/${receiveRow.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "RECEIVE",
                    receivedWeight,
                    rejectedWeight,
                    receivedAt,
                    receiverName,
                    weightDifferenceReason,
                    warehouseLocation,
                    note,
                }),
            });
            const result = await response.json();
            if (!result.success) {
                setError(result.message || "Tiếp nhận nguyên liệu thất bại.");
                setBusy(null);
                return;
            }

            const updatedHarvest = result.data;
            setRows((prev) => prev.map((item) => (item.id === receiveRow.id ? { ...item, status: updatedHarvest.status } : item)));

            // Add newly created RawMaterialLot into lots list
            const newLotCode = `RM-${receiveRow.code}`;
            const createdLot: RawLot = {
                id: "lot-" + Date.now(),
                code: newLotCode,
                status: "PENDING_QC",
                sourceCode: `HL-${receiveRow.code}`,
                farmName: receiveRow.farm.farmName,
                variety: receiveRow.farm.durianVariety,
                supplierName: receiveRow.farmer?.fullName || "Nông hộ",
                receivedAt: receivedAt || new Date().toISOString(),
                sentWeight: Number(receiveRow.deliveredWeight ?? receiveRow.actualWeight ?? receiveRow.expectedWeight ?? 0),
                actualReceivedWeight: receivedWeight,
                acceptedWeight: receivedWeight,
                currentWeight: receivedWeight,
                rejectedWeight,
                warehouseLocation: warehouseLocation || "Kho tạm chờ QC",
                qualityResult: null,
                inspection: null,
                batches: [],
            };

            setLots((prev) => [createdLot, ...prev]);
            setReceiveRow(null);
            setSuccessMessage(`Đã tiếp nhận thành công ${receivedWeight.toLocaleString("vi-VN")} kg. Lô ${newLotCode} đã được tạo và chuyển sang Chờ QC!`);
            setTab("qc");
            setTimeout(() => setSuccessMessage(""), 6000);
        } catch {
            setError("Lỗi kết nối máy chủ khi lưu tiếp nhận.");
        } finally {
            setBusy(null);
        }
    };

    // Submit QC Lô Nguyên Liệu
    const submitQc = async (data: Record<string, unknown>) => {
        if (!qcLot) return;
        setBusy(qcLot.id);
        setError("");
        setSuccessMessage("");
        try {
            const response = await fetch(`/api/processing/raw-materials/${qcLot.id}/qc`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!result.success) {
                setError(result.message || "Cập nhật QC thất bại.");
                setBusy(null);
                return;
            }

            const resStatus = data.result === "PASSED" ? "AVAILABLE" : data.result === "CONDITIONAL" ? "QUARANTINED" : "REJECTED";
            const accKg = Number(data.acceptedWeight) || 0;
            const rejKg = Number(data.rejectedWeight) || 0;
            const wh = String(data.warehouseLocation || qcLot.warehouseLocation || "Kho NVL-01");

            setLots((prev) =>
                prev.map((item) =>
                    item.id === qcLot.id
                        ? {
                              ...item,
                              status: resStatus,
                              qualityResult: String(data.result),
                              acceptedWeight: accKg,
                              currentWeight: accKg,
                              rejectedWeight: rejKg,
                              warehouseLocation: wh,
                              inspection: {
                                  id: "insp-" + Date.now(),
                                  result: String(data.result),
                                  inspectedAt: String(data.inspectedAt || new Date().toISOString()),
                                  qualityGrade: String(data.qualityGrade || "Loại A"),
                                  appearance: String(data.appearance || "Đạt"),
                                  residueResult: String(data.residueResult || "Đạt"),
                                  damageRate: Number(data.damageRate || 0),
                                  note: String(data.note || ""),
                                  inspectorName: String(data.inspectorName || "Người kiểm tra"),
                              },
                          }
                        : item
                )
            );

            setQcLot(null);
            setSuccessMessage(
                data.result === "PASSED"
                    ? `QC Đạt! Lô ${qcLot.code} (${accKg.toLocaleString("vi-VN")} kg) đã nhập kho ${wh} và sẵn sàng chế biến.`
                    : data.result === "CONDITIONAL"
                    ? `QC Đạt có điều kiện. Lô ${qcLot.code} đã được chuyển sang khu vực Cách ly.`
                    : `QC Không đạt. Lô ${qcLot.code} đã bị từ chối và cách ly.`
            );
            setTimeout(() => setSuccessMessage(""), 6000);
        } catch {
            setError("Lỗi kết nối máy chủ khi lưu kết quả QC.");
        } finally {
            setBusy(null);
        }
    };

    // Submit Xuất kho nguyên liệu & Tạo ProcessingBatch
    const submitIssue = async (data: {
        rawMaterialLotId: string;
        inputWeight: number;
        lineName: string;
        targetProduct: string;
        method: string;
        startedAt: string;
        supervisorName: string;
        note: string;
    }) => {
        if (!issueLot) return;
        setBusy(issueLot.id);
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
                setError(result.message || "Xuất kho nguyên liệu thất bại.");
                setBusy(null);
                return;
            }

            const createdBatch = result.data;
            const availableKg = issueLot.currentWeight ?? issueLot.actualReceivedWeight;
            const remainingKg = Math.max(0, availableKg - data.inputWeight);

            setLots((prev) =>
                prev.map((item) =>
                    item.id === issueLot.id
                        ? {
                              ...item,
                              currentWeight: remainingKg,
                              status: remainingKg === 0 ? "USED" : "PARTIALLY_USED",
                          }
                        : item
                )
            );

            setIssuedBatchInfo({ batchCode: createdBatch.batchCode, lotCode: issueLot.code });
            setIssueLot(null);
            setSuccessMessage(`Đã xuất kho nguyên liệu và tạo lô chế biến ${createdBatch.batchCode}!`);
        } catch {
            setError("Lỗi kết nối máy chủ khi xuất kho.");
        } finally {
            setBusy(null);
        }
    };

    const currentInspectorName = session?.user?.fullName || session?.user?.phone || "Người phụ trách";

    return (
        <section className="space-y-6">
            {successMessage && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    {tab === "qc" && (
                        <button
                            onClick={() => setTab("ready")}
                            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
                        >
                            Xem lô sẵn sàng <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* TAB TRẠNG THÁI */}
            <div className="flex flex-wrap gap-2 border-b pb-4">
                {(mode === "PROCESSING_FACILITY" ? processingTabs : collectorTabs).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition whitespace-nowrap shrink-0 ${
                            tab === key
                                ? "bg-brand-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* GRID DANH SÁCH THẺ NGUYÊN LIỆU */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* 1. NGUỒN GIAO CHƯA HOÀN TẤT NHẬN */}
                {filteredRows.map((item) => {
                    const isNew = item.status === "WAITING_CONFIRMATION" || item.status === "PENDING";
                    const isDispatched = item.status === "DELIVERY_CONFIRMED" || item.status === "DISPATCHED" || item.status === "IN_TRANSIT";
                    const isUpcoming = item.status === "CONFIRMED" || item.status === "HARVESTING" || item.status === "HARVESTED";

                    return (
                        <Card key={item.id} className="overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition">
                            <CardHeader className="border-b bg-slate-50/70 p-4 sm:p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-mono font-bold tracking-wide text-brand-700">{item.code}</p>
                                        <CardTitle className="mt-1 text-lg font-black text-slate-900">{item.farm.farmName}</CardTitle>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Nguồn: <span className="font-semibold text-slate-700">HL-{item.code}</span> · Giống:{" "}
                                            <span className="font-semibold text-emerald-700">{item.farm.durianVariety}</span>
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-bold ${
                                            isNew
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : isDispatched
                                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                                : "bg-slate-100 text-slate-700 border-slate-200"
                                        }`}
                                    >
                                        {formatStatusLabel(item.status)}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 sm:p-5">
                                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                                    <Info
                                        icon={Scale}
                                        label={isDispatched ? "Khối lượng giao" : "Dự kiến"}
                                        value={`${Number(item.deliveredWeight ?? item.actualWeight ?? item.expectedWeight).toLocaleString("vi-VN")} ${item.weightUnit}`}
                                    />
                                    <Info
                                        icon={CalendarDays}
                                        label={isDispatched ? "Giao lúc" : "Ngày giao dự kiến"}
                                        value={
                                            item.farmerDeliveredAt
                                                ? new Date(item.farmerDeliveredAt).toLocaleString("vi-VN")
                                                : new Date(item.expectedHarvestDate).toLocaleDateString("vi-VN")
                                        }
                                    />
                                    <Info
                                        icon={MapPin}
                                        label="Vùng trồng / Vị trí"
                                        value={item.farm.region?.code || item.farm.address}
                                    />
                                    <Info
                                        icon={Sprout}
                                        label="Nông dân / Nguồn"
                                        value={item.farmer?.fullName || item.farmer?.phone || "Chưa cập nhật"}
                                    />
                                </div>

                                {mode === "PROCESSING_FACILITY" && isNew && (
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl font-bold"
                                            onClick={() => setViewHarvestRow(item)}
                                        >
                                            Xem chi tiết
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold"
                                            disabled={busy === item.id}
                                            onClick={() => void act(item.id, "CONFIRM")}
                                        >
                                            Xác nhận tiếp nhận
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                                            disabled={busy === item.id}
                                            onClick={() => void act(item.id, "REJECT")}
                                        >
                                            Từ chối
                                        </Button>
                                    </div>
                                )}

                                {mode === "PROCESSING_FACILITY" && isDispatched && (
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl font-bold"
                                            onClick={() => setViewHarvestRow(item)}
                                        >
                                            Xem chi tiết
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm"
                                            onClick={() => {
                                                setError("");
                                                setReceiveRow(item);
                                            }}
                                        >
                                            <Truck className="mr-1.5 h-4 w-4" /> Xác nhận nhận nguyên liệu
                                        </Button>
                                    </div>
                                )}

                                {mode === "PROCESSING_FACILITY" && isUpcoming && (
                                    <div className="flex justify-between items-center pt-2 border-t text-xs text-slate-500">
                                        <span>Đã đồng ý tiếp nhận. Đang chờ nông dân thu hoạch & vận chuyển.</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl"
                                            onClick={() => setViewHarvestRow(item)}
                                        >
                                            Xem chi tiết
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {/* 2. CÁC LÔ NGUYÊN LIỆU ĐÃ TIẾP NHẬN & QC (RawMaterialLot) */}
                {mode === "PROCESSING_FACILITY" &&
                    filteredLots.map((lot) => {
                        const isPendingQc = lot.status === "PENDING_QC";
                        const isPassed = lot.qualityResult === "PASSED" || ["AVAILABLE", "PARTIALLY_USED", "USED"].includes(lot.status);
                        const isConditional = lot.qualityResult === "CONDITIONAL" || lot.status === "QUARANTINED";
                        const isFailed = lot.qualityResult === "FAILED" || lot.status === "REJECTED";

                        const availableKg = lot.currentWeight ?? lot.acceptedWeight ?? lot.actualReceivedWeight;
                        const acceptedKg = lot.acceptedWeight ?? (isFailed ? 0 : lot.actualReceivedWeight);
                        const rejectedKg = lot.rejectedWeight ?? (isFailed ? lot.actualReceivedWeight : Math.max(0, lot.actualReceivedWeight - acceptedKg));

                        return (
                            <Card key={lot.id} className="overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition">
                                <CardHeader className="border-b bg-slate-50/70 p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-mono font-bold tracking-wide text-brand-700">{lot.code}</p>
                                            <CardTitle className="mt-1 text-lg font-black text-slate-900">{lot.farmName}</CardTitle>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Nguồn: <span className="font-semibold text-slate-700">{lot.sourceCode}</span> · Giống:{" "}
                                                <span className="font-semibold text-emerald-700">{lot.variety || "Sầu riêng Dona"}</span>
                                            </p>
                                        </div>
                                        {isPendingQc ? (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                                                <AlertTriangle className="h-3.5 w-3.5" /> Chờ QC
                                            </span>
                                        ) : isPassed ? (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> QC đạt
                                            </span>
                                        ) : isConditional ? (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                                                <AlertTriangle className="h-3.5 w-3.5" /> QC đạt có điều kiện
                                            </span>
                                        ) : (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700">
                                                <XCircle className="h-3.5 w-3.5" /> QC không đạt
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 p-4 sm:p-5">
                                    <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                                        <Info icon={Scale} label="Thực nhận" value={`${lot.actualReceivedWeight.toLocaleString("vi-VN")} kg`} />
                                        <Info
                                            icon={ShieldCheck}
                                            label="Chấp nhận / Từ chối"
                                            value={`${acceptedKg.toLocaleString("vi-VN")} kg / ${rejectedKg.toLocaleString("vi-VN")} kg`}
                                        />
                                        <Info
                                            icon={Warehouse}
                                            label="Còn khả dụng"
                                            value={`${availableKg.toLocaleString("vi-VN")} kg`}
                                            highlight={isPassed && availableKg > 0}
                                        />
                                        <Info
                                            icon={CalendarDays}
                                            label="Grade / Kho"
                                            value={`${lot.inspection?.qualityGrade || "N/A"} · ${lot.warehouseLocation || "Kho NVL"}`}
                                        />
                                    </div>

                                    {lot.inspection?.note && (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-xs text-slate-600">
                                            <span className="font-semibold text-slate-700">Ghi chú QC: </span>
                                            {lot.inspection.note}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl font-bold"
                                            onClick={() => setViewLot(lot)}
                                        >
                                            Xem chi tiết
                                        </Button>

                                        {isPendingQc && (
                                            <Button
                                                size="sm"
                                                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm"
                                                onClick={() => {
                                                    setError("");
                                                    setQcLot(lot);
                                                }}
                                            >
                                                <FileCheck className="mr-1.5 h-4 w-4" /> Thực hiện QC
                                            </Button>
                                        )}

                                        {isPassed && availableKg > 0 ? (
                                            <Button
                                                size="sm"
                                                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                                                onClick={() => {
                                                    setError("");
                                                    setIssueLot(lot);
                                                }}
                                            >
                                                Xuất kho chế biến <ArrowRight className="ml-1.5 h-4 w-4" />
                                            </Button>
                                        ) : isPassed && (
                                            <span className="flex-1 text-center py-1.5 text-xs font-bold text-slate-400 bg-slate-100 rounded-xl">
                                                Đã sử dụng hết
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                {!filteredRows.length && !filteredLots.length && (
                    <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                        Không có dữ liệu nguyên liệu nào trong nhóm trạng thái này.
                    </div>
                )}
            </div>

            {/* MODAL: XÁC NHẬN NHẬN NGUYÊN LIỆU (Section IX) */}
            {receiveRow && (
                <ReceiveModal
                    row={receiveRow}
                    inspectorName={currentInspectorName}
                    busy={busy === receiveRow.id}
                    error={error}
                    onClose={() => setReceiveRow(null)}
                    onSubmit={submitReceipt}
                />
            )}

            {/* MODAL: FORM QC NGUYÊN LIỆU (Section XI, XII, XIII, XIV) */}
            {qcLot && (
                <QcFormModal
                    lot={qcLot}
                    inspectorName={currentInspectorName}
                    busy={busy === qcLot.id}
                    error={error}
                    onClose={() => setQcLot(null)}
                    onSubmit={submitQc}
                />
            )}

            {/* MODAL: XUẤT KHO NGUYÊN LIỆU (Section 3) */}
            {issueLot && (
                <IssueRawMaterialModal
                    lot={issueLot}
                    inspectorName={currentInspectorName}
                    busy={busy === issueLot.id}
                    error={error}
                    onClose={() => setIssueLot(null)}
                    onSubmit={submitIssue}
                />
            )}

            {/* MODAL: THÔNG BÁO XUẤT KHO THÀNH CÔNG */}
            {issuedBatchInfo && (
                <Modal title="Xuất kho nguyên liệu thành công" onClose={() => setIssuedBatchInfo(null)}>
                    <div className="space-y-4 text-center py-2">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Đã tạo lô chế biến thành công!</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                Mã lô chế biến: <span className="font-mono font-bold text-emerald-700">{issuedBatchInfo.batchCode}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">Nguồn: {issuedBatchInfo.lotCode}</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={() => setIssuedBatchInfo(null)}>
                                Ở lại trang này
                            </Button>
                            <Link
                                href="/dashboard/processing/processing"
                                className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-sm shadow-sm transition"
                            >
                                Đi đến lô chế biến <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL: XEM CHI TIẾT LÔ NGUYÊN LIỆU (Biên bản QC & Lô chế biến) */}
            {viewLot && (
                <LotDetailModal
                    lot={viewLot}
                    onClose={() => setViewLot(null)}
                    onOpenQc={() => {
                        const target = viewLot;
                        setViewLot(null);
                        setQcLot(target);
                    }}
                />
            )}

            {/* MODAL: XEM CHI TIẾT PHIẾU THU HOẠCH NGUỒN */}
            {viewHarvestRow && (
                <HarvestRowDetailModal row={viewHarvestRow} onClose={() => setViewHarvestRow(null)} />
            )}
        </section>
    );
}

// ---------------------- SUB-MODAL COMPONENTS ----------------------

function ReceiveModal({
    row,
    inspectorName,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    row: HarvestRow;
    inspectorName: string;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
    const delivered = Number(row.deliveredWeight ?? row.actualWeight ?? row.expectedWeight ?? 0);
    const [receivedWeight, setReceivedWeight] = useState(String(delivered));
    const [rejectedWeight, setRejectedWeight] = useState("0");

    const handleReceivedChange = (val: string) => {
        setReceivedWeight(val);
        const num = Number(val) || 0;
        const rej = Math.max(0, delivered - num);
        setRejectedWeight(rej.toFixed(1).replace(/\.0$/, ""));
    };

    return (
        <Modal title="XÁC NHẬN NHẬN NGUYÊN LIỆU" onClose={onClose}>
            <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                    <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700">
                        {error}
                    </p>
                )}

                <div className="rounded-2xl border bg-slate-50 p-3.5 text-xs space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Mã phiếu / Nguồn:</span>
                        <b className="font-mono text-brand-700">{row.code}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Vườn nguồn:</span>
                        <b className="text-slate-800">{row.farm.farmName}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Giống sầu riêng:</span>
                        <b className="text-emerald-700">{row.farm.durianVariety}</b>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                        Khối lượng bên gửi giao
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={`${delivered.toLocaleString("vi-VN")} kg`}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 text-sm font-bold text-slate-700"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Khối lượng thực nhận (kg) *
                    </label>
                    <input
                        type="number"
                        name="receivedWeight"
                        step="0.1"
                        min="0.1"
                        value={receivedWeight}
                        onChange={(e) => handleReceivedChange(e.target.value)}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-black text-brand-700 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Khối lượng từ chối / loại bỏ ngay (kg)
                    </label>
                    <input
                        type="number"
                        name="rejectedWeight"
                        step="0.1"
                        min="0"
                        value={rejectedWeight}
                        onChange={(e) => setRejectedWeight(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-rose-700 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Ngày giờ nhận *
                        </label>
                        <input
                            type="datetime-local"
                            name="receivedAt"
                            defaultValue={new Date().toISOString().slice(0, 16)}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Người nhận
                        </label>
                        <input
                            type="text"
                            name="receiverName"
                            defaultValue={inspectorName}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Vị trí kho tạm chờ QC
                    </label>
                    <input
                        type="text"
                        name="warehouseLocation"
                        placeholder="KHO-NVL-TẠM hoặc Kệ A-01"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Lý do chênh lệch (nếu có)
                    </label>
                    <textarea
                        name="weightDifferenceReason"
                        rows={2}
                        placeholder="Hao hụt vận chuyển, loại bỏ quả dập nát..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Ghi chú tiếp nhận
                    </label>
                    <textarea
                        name="note"
                        rows={2}
                        placeholder="Ghi chú về tình trạng xe, biển số, bao bì..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        disabled={busy || Number(receivedWeight) <= 0}
                        className="flex-1 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold"
                    >
                        {busy ? "Đang lưu..." : "Xác nhận & Tạo lô Chờ QC"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function QcFormModal({
    lot,
    inspectorName,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    lot: RawLot;
    inspectorName: string;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => void;
}) {
    const totalWeight = lot.actualReceivedWeight || 0;
    const [result, setResult] = useState<"PASSED" | "CONDITIONAL" | "FAILED">("PASSED");
    const [inspectedAt, setInspectedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [appearance, setAppearance] = useState<string>(QC_APPEARANCE_OPTIONS[0]);
    const [ripeness, setRipeness] = useState<string>(QC_RIPENESS_OPTIONS[0]);
    const [qualityGrade, setQualityGrade] = useState<string>(QC_GRADE_OPTIONS[0]);
    const [damageRate, setDamageRate] = useState("0");
    const [residueResult, setResidueResult] = useState<string>(QC_RESIDUE_OPTIONS[0]);
    const [testCertificateCode, setTestCertificateCode] = useState("");
    const [acceptedWeight, setAcceptedWeight] = useState(String(totalWeight));
    const [rejectedWeight, setRejectedWeight] = useState("0");
    const [rejectionReasonPreset, setRejectionReasonPreset] = useState<string>(QC_REJECT_REASONS[0]);
    const [rejectionReasonDetail, setRejectionReasonDetail] = useState("");
    const [warehouseLocation, setWarehouseLocation] = useState("KHO-NVL-01");
    const [warehouseShelve, setWarehouseShelve] = useState("Kệ A-01");
    const [storageCondition, setStorageCondition] = useState("Nhiệt độ phòng mát 15 - 20°C");
    const [note, setNote] = useState("");

    const handleResultChange = (newResult: "PASSED" | "CONDITIONAL" | "FAILED") => {
        setResult(newResult);
        if (newResult === "FAILED") {
            setAcceptedWeight("0");
            setRejectedWeight(String(totalWeight));
        } else if (newResult === "PASSED") {
            setAcceptedWeight(String(totalWeight));
            setRejectedWeight("0");
        }
    };

    const handleAcceptedChange = (val: string) => {
        setAcceptedWeight(val);
        const num = Number(val) || 0;
        const rej = Math.max(0, totalWeight - num);
        setRejectedWeight(rej.toFixed(1).replace(/\.0$/, ""));
    };

    const handleRejectedChange = (val: string) => {
        setRejectedWeight(val);
        const num = Number(val) || 0;
        const acc = Math.max(0, totalWeight - num);
        setAcceptedWeight(acc.toFixed(1).replace(/\.0$/, ""));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const fullRejectionReason =
            result !== "PASSED" || Number(rejectedWeight) > 0
                ? [rejectionReasonPreset, rejectionReasonDetail.trim()].filter(Boolean).join(" - ")
                : "";

        onSubmit({
            result,
            inspectedAt,
            appearance,
            ripeness,
            qualityGrade,
            damageRate: Number(damageRate) || 0,
            residueResult,
            testCertificateCode: testCertificateCode.trim(),
            acceptedWeight: Number(acceptedWeight) || 0,
            rejectedWeight: Number(rejectedWeight) || 0,
            rejectionReason: fullRejectionReason,
            warehouseLocation: warehouseLocation.trim(),
            warehouseShelve: warehouseShelve.trim(),
            storageCondition: storageCondition.trim(),
            note: note.trim(),
        });
    };

    return (
        <Modal title={`QC LÔ NGUYÊN LIỆU ${lot.code}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
                        {error}
                    </p>
                )}

                {/* 1. THÔNG TIN KIỂM TRA */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        1. Thông tin kiểm tra
                    </legend>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Kết quả QC *
                        </label>
                        <select
                            value={result}
                            onChange={(e) => handleResultChange(e.target.value as "PASSED" | "CONDITIONAL" | "FAILED")}
                            required
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        >
                            <option value="PASSED">Đạt</option>
                            <option value="CONDITIONAL">Đạt có điều kiện</option>
                            <option value="FAILED">Không đạt</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Ngày giờ kiểm tra *
                            </label>
                            <input
                                type="datetime-local"
                                value={inspectedAt}
                                onChange={(e) => setInspectedAt(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Người kiểm tra
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={inspectorName}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700"
                            />
                        </div>
                    </div>
                </fieldset>

                {/* 2. ĐÁNH GIÁ CHẤT LƯỢNG */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        2. Đánh giá chất lượng
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Ngoại quan *
                            </label>
                            <select
                                value={appearance}
                                onChange={(e) => setAppearance(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                {QC_APPEARANCE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Độ chín
                            </label>
                            <select
                                value={ripeness}
                                onChange={(e) => setRipeness(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                {QC_RIPENESS_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Phân hạng / Grade
                            </label>
                            <select
                                value={qualityGrade}
                                onChange={(e) => setQualityGrade(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                {QC_GRADE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Tỷ lệ hư hỏng (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={damageRate}
                                onChange={(e) => setDamageRate(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </fieldset>

                {/* 3. AN TOÀN / DƯ LƯỢNG */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        3. An toàn & Dư lượng
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Kết quả kiểm tra dư lượng
                            </label>
                            <select
                                value={residueResult}
                                onChange={(e) => setResidueResult(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                {QC_RESIDUE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Mã phiếu kiểm nghiệm
                            </label>
                            <input
                                type="text"
                                placeholder="TEST-202608-001"
                                value={testCertificateCode}
                                onChange={(e) => setTestCertificateCode(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-mono text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </fieldset>

                {/* 4. KẾT QUẢ XỬ LÝ & KHỐI LƯỢNG */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        4. Kết quả xử lý & Khối lượng
                    </legend>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                            Khối lượng thực nhận
                        </label>
                        <input
                            type="text"
                            readOnly
                            value={`${totalWeight.toLocaleString("vi-VN")} kg`}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 text-sm font-bold text-slate-700"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Khối lượng chấp nhận (kg) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={totalWeight}
                                step="0.1"
                                value={acceptedWeight}
                                onChange={(e) => handleAcceptedChange(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-black text-emerald-700 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Khối lượng từ chối (kg)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={totalWeight}
                                step="0.1"
                                value={rejectedWeight}
                                onChange={(e) => handleRejectedChange(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-rose-700 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {(result !== "PASSED" || Number(rejectedWeight) > 0) && (
                        <div className="space-y-2 pt-1 border-t border-slate-200">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                    Lý do không đạt / điều kiện
                                </label>
                                <select
                                    value={rejectionReasonPreset}
                                    onChange={(e) => setRejectionReasonPreset(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                >
                                    {QC_REJECT_REASONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Chi tiết lý do hoặc điều kiện cách ly..."
                                    value={rejectionReasonDetail}
                                    onChange={(e) => setRejectionReasonDetail(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}
                </fieldset>

                {/* 5. NHẬP KHO NGUYÊN LIỆU (Chỉ khi QC Đạt / Chấp nhận > 0) */}
                {result === "PASSED" && Number(acceptedWeight) > 0 && (
                    <fieldset className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                        <legend className="px-2 text-xs font-black uppercase tracking-wider text-emerald-800">
                            5. Nhập kho nguyên liệu
                        </legend>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                    Kho nguyên liệu *
                                </label>
                                <input
                                    type="text"
                                    value={warehouseLocation}
                                    onChange={(e) => setWarehouseLocation(e.target.value)}
                                    required
                                    placeholder="KHO-NVL-01"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                    Vị trí kho *
                                </label>
                                <input
                                    type="text"
                                    value={warehouseShelve}
                                    onChange={(e) => setWarehouseShelve(e.target.value)}
                                    required
                                    placeholder="Kệ A-01"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                                Điều kiện bảo quản
                            </label>
                            <input
                                type="text"
                                value={storageCondition}
                                onChange={(e) => setStorageCondition(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </fieldset>
                )}

                {/* 6. GHI CHÚ */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                        Ghi chú QC
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Ghi chú thêm về kiểm tra chất lượng..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
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
                        {busy ? "Đang lưu..." : result === "PASSED" ? "Lưu QC & Nhập kho NVL" : "Lưu kết quả QC"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function LotDetailModal({
    lot,
    onClose,
    onOpenQc,
}: {
    lot: RawLot;
    onClose: () => void;
    onOpenQc: () => void;
}) {
    const isPendingQc = lot.status === "PENDING_QC";
    const isPassed = lot.qualityResult === "PASSED" || ["AVAILABLE", "PARTIALLY_USED", "USED"].includes(lot.status);
    const availableKg = lot.currentWeight ?? lot.acceptedWeight ?? lot.actualReceivedWeight;

    return (
        <Modal title={`Biên bản Lô nguyên liệu ${lot.code}`} onClose={onClose}>
            <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-mono font-bold text-brand-700">{lot.code}</span>
                    <span
                        className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                            isPendingQc
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : isPassed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                    >
                        {formatStatusLabel(lot.status)}
                    </span>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Nguồn gốc:</span>
                        <b className="text-slate-800">{lot.farmName}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Giống sầu riêng:</span>
                        <b className="text-emerald-700">{lot.variety || "Sầu riêng Dona"}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Người giao/Nông dân:</span>
                        <b className="text-slate-800">{lot.supplierName}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Thời gian nhận:</span>
                        <b className="text-slate-800">{new Date(lot.receivedAt).toLocaleString("vi-VN")}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Khối lượng thực nhận:</span>
                        <b className="text-slate-900 font-bold">{lot.actualReceivedWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Khối lượng chấp nhận:</span>
                        <b className="text-emerald-700 font-bold">
                            {(lot.acceptedWeight ?? lot.actualReceivedWeight).toLocaleString("vi-VN")} kg
                        </b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Khối lượng khả dụng còn lại:</span>
                        <b className="text-brand-700 font-black">{availableKg.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Vị trí kho lưu trữ:</span>
                        <b className="text-slate-800">{lot.warehouseLocation || "Chưa nhập kho chính thức"}</b>
                    </div>
                </div>

                {lot.inspection && (
                    <div className="rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                        <h4 className="font-bold uppercase text-slate-700">Chi tiết kiểm tra chất lượng (QC)</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-slate-400">Kết quả:</span>
                                <b className="ml-1 text-slate-800">{lot.inspection.result}</b>
                            </div>
                            <div>
                                <span className="text-slate-400">Phân hạng:</span>
                                <b className="ml-1 text-slate-800">{lot.inspection.qualityGrade || "N/A"}</b>
                            </div>
                            <div>
                                <span className="text-slate-400">Ngoại quan:</span>
                                <b className="ml-1 text-slate-800">{lot.inspection.appearance || "N/A"}</b>
                            </div>
                            <div>
                                <span className="text-slate-400">Dư lượng BVTV:</span>
                                <b className="ml-1 text-slate-800">{lot.inspection.residueResult || "N/A"}</b>
                            </div>
                            <div>
                                <span className="text-slate-400">Tỷ lệ hư hỏng:</span>
                                <b className="ml-1 text-slate-800">{lot.inspection.damageRate ?? 0}%</b>
                            </div>
                            <div>
                                <span className="text-slate-400">Người kiểm tra:</span>
                                <b className="ml-1 text-slate-800">{lot.inspection.inspectorName || "N/A"}</b>
                            </div>
                        </div>
                        {lot.inspection.note && (
                            <p className="mt-2 border-t pt-2 text-slate-600">
                                <b>Ghi chú:</b> {lot.inspection.note}
                            </p>
                        )}
                    </div>
                )}

                {lot.batches && lot.batches.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                        <h4 className="font-bold uppercase text-slate-700">Các mẻ chế biến đã sử dụng</h4>
                        <ul className="space-y-1.5">
                            {lot.batches.map((batch) => (
                                <li key={batch.id} className="flex justify-between items-center rounded-xl bg-slate-50 p-2.5 border">
                                    <span className="font-mono font-bold text-brand-700">{batch.code}</span>
                                    <span className="text-slate-700 font-medium">{batch.targetProduct}</span>
                                    <span className="font-semibold text-slate-500">{formatStatusLabel(batch.status)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 rounded-2xl" onClick={onClose}>
                        Đóng
                    </Button>
                    {isPendingQc && (
                        <Button
                            className="flex-1 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            onClick={onOpenQc}
                        >
                            Thực hiện QC
                        </Button>
                    )}
                    {isPassed && availableKg > 0 && (
                        <Link
                            href={`/dashboard/processing/processing?source=${lot.id}`}
                            className="flex-1 inline-flex items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm font-bold shadow-sm transition"
                        >
                            Đưa vào chế biến <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Link>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function HarvestRowDetailModal({ row, onClose }: { row: HarvestRow; onClose: () => void }) {
    return (
        <Modal title={`Chi tiết Nguồn hàng ${row.code}`} onClose={onClose}>
            <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-mono font-bold text-brand-700">{row.code}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-700">
                        {formatStatusLabel(row.status)}
                    </span>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Vườn nguồn:</span>
                        <b className="text-slate-800">{row.farm.farmName}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Địa chỉ:</span>
                        <b className="text-slate-800">{row.farm.address}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Mã vùng trồng:</span>
                        <b className="text-brand-700 font-mono">{row.farm.region?.code || "Chưa cấp"}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Giống sầu riêng:</span>
                        <b className="text-emerald-700">{row.farm.durianVariety}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Nông dân:</span>
                        <b className="text-slate-800">{row.farmer?.fullName || row.farmer?.phone || "Chưa cập nhật"}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Khối lượng dự kiến:</span>
                        <b className="text-slate-900 font-bold">
                            {Number(row.expectedWeight).toLocaleString("vi-VN")} {row.weightUnit}
                        </b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Ngày thu hoạch / giao dự kiến:</span>
                        <b className="text-slate-800">{new Date(row.expectedHarvestDate).toLocaleDateString("vi-VN")}</b>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="outline" className="rounded-2xl" onClick={onClose}>
                        Đóng
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function Info({
    icon: Icon,
    label,
    value,
    highlight = false,
}: {
    icon: typeof Scale;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`font-bold truncate ${highlight ? "text-emerald-700 text-sm font-black" : "text-slate-800"}`} title={value}>
                    {value}
                </p>
            </div>
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

function IssueRawMaterialModal({
    lot,
    inspectorName,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    lot: RawLot;
    inspectorName: string;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (data: {
        rawMaterialLotId: string;
        inputWeight: number;
        lineName: string;
        targetProduct: string;
        method: string;
        startedAt: string;
        supervisorName: string;
        note: string;
    }) => void;
}) {
    const availableKg = lot.currentWeight ?? lot.acceptedWeight ?? lot.actualReceivedWeight;
    const [inputWeight, setInputWeight] = useState(String(availableKg));
    const [lineName, setLineName] = useState<string>(PRODUCTION_LINES[0]);
    const [targetProduct, setTargetProduct] = useState(
        lot.variety ? `${lot.variety} tách múi cấp đông` : "Sầu riêng Dona tách múi cấp đông"
    );
    const [method, setMethod] = useState<string>("Tách múi & Cấp đông nhanh (IQF)");
    const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [supervisorName, setSupervisorName] = useState(inspectorName);
    const [note, setNote] = useState("");
    const [localError, setLocalError] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const weightNum = Number(inputWeight);
        if (!weightNum || weightNum <= 0) {
            setLocalError("Khối lượng xuất phải lớn hơn 0 kg.");
            return;
        }
        if (weightNum > availableKg) {
            setLocalError(`Khối lượng xuất không được vượt quá ${availableKg.toLocaleString("vi-VN")} kg.`);
            return;
        }
        setLocalError("");
        onSubmit({
            rawMaterialLotId: lot.id,
            inputWeight: weightNum,
            lineName,
            targetProduct,
            method,
            startedAt: new Date(startedAt).toISOString(),
            supervisorName,
            note,
        });
    };

    return (
        <Modal title="XUẤT KHO NGUYÊN LIỆU" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {(error || localError) && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                        {error || localError}
                    </div>
                )}

                {/* Readonly Info Summary */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Lô nguyên liệu:</span>
                        <span className="font-mono font-bold text-brand-700">{lot.code}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Kho hiện tại:</span>
                        <span className="font-semibold text-slate-800">{lot.warehouseLocation || "KHO-NVL-01"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Khối lượng khả dụng:</span>
                        <span className="font-black text-emerald-700">{availableKg.toLocaleString("vi-VN")} kg</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">
                            Khối lượng xuất (kg) <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="number"
                            step="any"
                            min="0.1"
                            max={availableKg}
                            required
                            value={inputWeight}
                            onChange={(e) => setInputWeight(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">Tối đa khả dụng: {availableKg.toLocaleString("vi-VN")} kg</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">
                            Dây chuyền <span className="text-rose-600">*</span>
                        </label>
                        <select
                            value={lineName}
                            onChange={(e) => setLineName(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        >
                            {PRODUCTION_LINES.map((line) => (
                                <option key={line} value={line}>{line}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">
                            Sản phẩm dự kiến <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={targetProduct}
                            onChange={(e) => setTargetProduct(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">
                            Phương pháp chế biến <span className="text-rose-600">*</span>
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        >
                            {FREEZING_METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">
                            Ngày giờ xuất <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={startedAt}
                            onChange={(e) => setStartedAt(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">
                            Người phụ trách <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={supervisorName}
                            onChange={(e) => setSupervisorName(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Ghi chú xuất kho</label>
                        <textarea
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ghi chú thêm về lô xuất kho hoặc yêu cầu kỹ thuật..."
                            className="mt-1 w-full rounded-2xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1 rounded-2xl font-bold" onClick={onClose} disabled={busy}>
                        Hủy
                    </Button>
                    <Button type="submit" className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold" disabled={busy}>
                        {busy ? "Đang xuất kho..." : "Xuất kho & tạo lô chế biến"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
