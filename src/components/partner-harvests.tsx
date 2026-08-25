"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarDays, MapPin, Scale, Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HarvestRow = {
    id: string;
    code: string;
    status: string;
    expectedWeight: string | number;
    actualWeight?: string | number | null;
    deliveredWeight?: string | number | null;
    weightUnit: string;
    expectedHarvestDate: string;
    expectedPricePerKg?: string | number | null;
    farm: { farmName: string; farmCode?: string; address: string; durianVariety: string; region?: { code: string } | null };
    farmer?: { fullName: string; phone: string };
};

type RawLot = {
    id: string;
    code: string;
    status: string;
    sourceCode: string;
    farmName: string;
    supplierName: string;
    receivedAt: string;
    sentWeight: number;
    actualReceivedWeight: number;
    qualityResult?: string | null;
    warehouseLocation?: string | null;
};

const statusLabels: Record<string, string> = {
    WAITING_CONFIRMATION: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận / Sắp thu hoạch",
    REJECTED: "Đã từ chối",
    HARVESTING: "Đang thu hoạch",
    HARVESTED: "Chờ giao",
    DELIVERY_CONFIRMED: "Đang vận chuyển",
    COMPLETED: "Đã nhận / Chờ QC",
    CANCELLED: "Đã hủy",
    PENDING_QC: "Đã nhận / Chờ QC",
    AVAILABLE: "Đã tiếp nhận",
    QUARANTINED: "QC có điều kiện",
};

const processingTabs = [
    ["all", "Tất cả"],
    ["new", "Mới / Chờ xác nhận"],
    ["upcoming", "Sắp giao"],
    ["transit", "Đang vận chuyển"],
    ["qc", "Đã nhận / Chờ QC"],
    ["accepted", "Đã tiếp nhận"],
    ["rejected", "Từ chối"],
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
    const [error, setError] = useState("");

    const filteredRows = useMemo(() => rows.filter((row) => {
        if (tab === "all") return true;
        if (tab === "action-required") return ["WAITING_CONFIRMATION", "DELIVERY_CONFIRMED"].includes(row.status);
        if (mode === "COLLECTOR") return tab === "upcoming" ? ["CONFIRMED", "HARVESTING"].includes(row.status) : row.status === tab;
        if (tab === "new") return row.status === "WAITING_CONFIRMATION";
        if (tab === "upcoming") return ["CONFIRMED", "HARVESTING", "HARVESTED"].includes(row.status);
        if (tab === "transit") return row.status === "DELIVERY_CONFIRMED";
        if (tab === "rejected") return ["REJECTED", "CANCELLED"].includes(row.status);
        return false;
    }), [rows, tab, mode]);

    const filteredLots = useMemo(() => lots.filter((lot) => {
        if (tab === "all") return true;
        if (tab === "action-required") return lot.status === "PENDING_QC";
        if (tab === "qc") return ["PENDING_QC", "QUARANTINED"].includes(lot.status);
        if (tab === "accepted") return lot.status === "AVAILABLE";
        if (tab === "rejected") return lot.status === "REJECTED";
        return false;
    }), [lots, tab]);

    async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
        const reason = action === "REJECT" ? prompt("Lý do từ chối")?.trim() : undefined;
        if (action === "REJECT" && !reason) return false;
        setBusy(id);
        setError("");
        try {
            const response = await fetch(`/api/harvests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, reason, ...extra }),
            });
            const result = await response.json();
            if (!result.success) {
                alert(result.message || "Thao tác không thành công.");
                return false;
            }
            setRows((prev) => prev.map((item) => (item.id === id ? { ...item, status: result.data.status } : item)));
            return true;
        } catch {
            alert("Lỗi kết nối máy chủ.");
            return false;
        } finally {
            setBusy(null);
        }
    }

    const submitReceipt = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!receiveRow) return;
        setBusy(receiveRow.id);
        setError("");
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
                setError(result.message || "Xác nhận nhận nguyên liệu thất bại.");
                setBusy(null);
                return;
            }
            setRows((prev) => prev.map((item) => (item.id === receiveRow.id ? { ...item, status: result.data.status } : item)));
            if (result.data?.lot) {
                setLots((prev) => [result.data.lot, ...prev.filter((l) => l.id !== result.data.lot.id)]);
            }
            setReceiveRow(null);
        } catch {
            setError("Lỗi kết nối máy chủ.");
        } finally {
            setBusy(null);
        }
    };

    const submitQc = async (data: Record<string, unknown>) => {
        if (!qcLot) return;
        setBusy(qcLot.id);
        setError("");
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
            setLots((prev) => prev.map((item) => (item.id === qcLot.id ? { ...item, status: result.data.status } : item)));
            setQcLot(null);
        } catch {
            setError("Lỗi kết nối máy chủ khi lưu kết quả QC.");
        } finally {
            setBusy(null);
        }
    };

    const currentInspectorName = session?.user?.fullName || session?.user?.phone || "Người kiểm tra";

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap gap-2 border-b pb-4">
                {(mode === "PROCESSING_FACILITY" ? processingTabs : collectorTabs).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition whitespace-nowrap shrink-0 ${
                            tab === key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {filteredRows.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                        <CardHeader className="border-b bg-slate-50">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-brand-600">{item.code}</p>
                                    <CardTitle className="mt-1">{item.farm.farmName}</CardTitle>
                                    <p className="mt-1 text-sm text-slate-500">{item.farm.durianVariety}</p>
                                </div>
                                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                                    {statusLabels[item.status] ?? item.status}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-5">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <Info icon={Scale} label="Khối lượng dự kiến" value={`${Number(item.expectedWeight).toLocaleString("vi-VN")} ${item.weightUnit}`} />
                                <Info icon={CalendarDays} label="Ngày thu hoạch" value={new Date(item.expectedHarvestDate).toLocaleDateString("vi-VN")} />
                                <Info icon={MapPin} label="Vị trí" value={item.farm.address} />
                                <Info icon={Sprout} label="Nông dân" value={item.farmer?.fullName || item.farmer?.phone || "Chưa cập nhật"} />
                            </div>

                            {mode === "COLLECTOR" && item.status === "WAITING_CONFIRMATION" && (
                                <div className="flex gap-2">
                                    <Button className="flex-1" disabled={busy === item.id} onClick={() => void act(item.id, "CONFIRM")}>
                                        Xác nhận thu mua
                                    </Button>
                                    <Button variant="outline" className="flex-1 text-rose-600" disabled={busy === item.id} onClick={() => void act(item.id, "REJECT")}>
                                        Từ chối
                                    </Button>
                                </div>
                            )}

                            {mode === "PROCESSING_FACILITY" && item.status === "WAITING_CONFIRMATION" && (
                                <div className="flex gap-2">
                                    <Button className="flex-1" disabled={busy === item.id} onClick={() => void act(item.id, "CONFIRM")}>
                                        Xác nhận tiếp nhận nguồn
                                    </Button>
                                    <Button variant="outline" className="flex-1 text-rose-600" disabled={busy === item.id} onClick={() => void act(item.id, "REJECT")}>
                                        Từ chối
                                    </Button>
                                </div>
                            )}

                            {mode === "PROCESSING_FACILITY" && item.status === "DELIVERY_CONFIRMED" && (
                                <Button className="w-full" onClick={() => { setError(""); setReceiveRow(item); }}>
                                    Xác nhận nhận nguyên liệu và tạo lô QC
                                </Button>
                            )}

                            {mode === "COLLECTOR" && item.status === "HARVESTED" && (
                                <Button className="w-full" disabled={busy === item.id} onClick={() => {
                                    const receivedWeight = Number(prompt("Khối lượng thực nhận (kg)") || 0);
                                    if (receivedWeight) void act(item.id, "RECEIVE", { receivedWeight });
                                }}>
                                    Xác nhận đã nhận hàng
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {mode === "PROCESSING_FACILITY" && filteredLots.map((lot) => (
                    <Card key={lot.id} className="overflow-hidden">
                        <CardHeader className="border-b bg-slate-50">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-brand-600">{lot.code}</p>
                                    <CardTitle className="mt-1">{lot.farmName}</CardTitle>
                                    <p className="mt-1 text-sm text-slate-500">Nguồn: {lot.sourceCode} · {lot.supplierName}</p>
                                </div>
                                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                                    {statusLabels[lot.status] ?? lot.status}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-5">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <p><span className="text-slate-400">Nông dân giao</span><br/><b>{lot.sentWeight.toLocaleString("vi-VN")} kg</b></p>
                                <p><span className="text-slate-400">Thực nhận</span><br/><b>{lot.actualReceivedWeight.toLocaleString("vi-VN")} kg</b></p>
                                <p><span className="text-slate-400">Ngày nhận</span><br/><b>{new Date(lot.receivedAt).toLocaleString("vi-VN")}</b></p>
                                <p><span className="text-slate-400">Kho lưu</span><br/><b>{lot.warehouseLocation || "Chưa cập nhật"}</b></p>
                            </div>
                            {["PENDING_QC", "QUARANTINED"].includes(lot.status) && (
                                <Button className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold" onClick={() => { setError(""); setQcLot(lot); }}>
                                    Kiểm tra chất lượng (QC)
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {!filteredRows.length && !filteredLots.length && (
                    <p className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500 lg:col-span-2">
                        Không có nguồn nguyên liệu trong nhóm này.
                    </p>
                )}
            </div>

            {/* Modal Xác nhận tiếp nhận nguyên liệu */}
            {receiveRow && (
                <Modal title="Xác nhận nhận nguyên liệu" onClose={() => setReceiveRow(null)}>
                    <form onSubmit={submitReceipt} className="space-y-4">
                        {error && (
                            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
                        )}
                        <ReadOnly
                            label="Khối lượng Farmer giao"
                            value={`${Number(receiveRow.deliveredWeight ?? receiveRow.actualWeight ?? receiveRow.expectedWeight ?? 0).toLocaleString("vi-VN")} kg`}
                        />
                        <Field
                            name="receivedWeight"
                            label="Khối lượng thực nhận (kg) *"
                            type="number"
                            required
                            defaultValue={String(Number(receiveRow.deliveredWeight ?? receiveRow.actualWeight ?? receiveRow.expectedWeight ?? 0))}
                        />
                        <Field name="rejectedWeight" label="Khối lượng từ chối (kg)" type="number" defaultValue="0" />
                        <Field
                            name="receivedAt"
                            label="Ngày/giờ nhận *"
                            type="datetime-local"
                            required
                            defaultValue={new Date().toISOString().slice(0, 16)}
                        />
                        <Field name="receiverName" label="Người nhận" defaultValue={currentInspectorName} />
                        <Field name="weightDifferenceReason" label="Lý do chênh lệch" />
                        <Field name="warehouseLocation" label="Vị trí kho" />
                        <Field name="note" label="Ghi chú" />
                        <Button type="submit" className="w-full" disabled={busy === receiveRow.id}>
                            {busy === receiveRow.id ? "Đang lưu tiếp nhận..." : "Lưu tiếp nhận và chuyển chờ QC"}
                        </Button>
                    </form>
                </Modal>
            )}

            {/* Modal Form Kiểm tra chất lượng QC */}
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
        </section>
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
    const [appearance, setAppearance] = useState("Tốt");
    const [qualityGrade, setQualityGrade] = useState("Loại A");
    const [damageRate, setDamageRate] = useState("0");
    const [residueResult, setResidueResult] = useState("Đạt");
    const [testCertificateCode, setTestCertificateCode] = useState("");
    const [acceptedWeight, setAcceptedWeight] = useState(String(totalWeight));
    const [rejectedWeight, setRejectedWeight] = useState("0");
    const [rejectionReasonPreset, setRejectionReasonPreset] = useState("Không đạt tiêu chuẩn dư lượng");
    const [rejectionReasonDetail, setRejectionReasonDetail] = useState("");
    const [warehouseLocation, setWarehouseLocation] = useState(lot.warehouseLocation || "");
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
        const fullRejectionReason = (result !== "PASSED" || Number(rejectedWeight) > 0)
            ? [rejectionReasonPreset, rejectionReasonDetail.trim()].filter(Boolean).join(" - ")
            : "";

        onSubmit({
            result,
            inspectedAt,
            appearance,
            qualityGrade,
            damageRate: Number(damageRate) || 0,
            residueResult,
            testCertificateCode: testCertificateCode.trim(),
            acceptedWeight: Number(acceptedWeight) || 0,
            rejectedWeight: Number(rejectedWeight) || 0,
            rejectionReason: fullRejectionReason,
            warehouseLocation: warehouseLocation.trim(),
            note: note.trim(),
        });
    };

    return (
        <Modal title={`QC LÔ ${lot.code}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700 border border-rose-200">{error}</p>
                )}

                {/* 1. THÔNG TIN KIỂM TRA */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        1. Thông tin kiểm tra
                    </legend>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
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
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
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
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                                    Người kiểm tra
                                </label>
                                <input
                                    type="text"
                                    value={inspectorName}
                                    readOnly
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 text-sm font-semibold text-slate-600 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* 2. ĐÁNH GIÁ CHẤT LƯỢNG */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        2. Đánh giá chất lượng
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                                Ngoại quan
                            </label>
                            <select
                                value={appearance}
                                onChange={(e) => setAppearance(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                <option value="Tốt">Tốt</option>
                                <option value="Khá">Khá</option>
                                <option value="Trung bình">Trung bình</option>
                                <option value="Kém">Kém</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                                Phân hạng / Grade
                            </label>
                            <select
                                value={qualityGrade}
                                onChange={(e) => setQualityGrade(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                <option value="Loại A">Loại A</option>
                                <option value="Loại B">Loại B</option>
                                <option value="Loại C">Loại C</option>
                                <option value="Không phân hạng">Không phân hạng</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                                Tỷ lệ hư hỏng (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={damageRate}
                                onChange={(e) => setDamageRate(e.target.value)}
                                placeholder="0 - 100"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </fieldset>

                {/* 3. AN TOÀN / DƯ LƯỢNG */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        3. An toàn / Dư lượng
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                                Kết quả dư lượng
                            </label>
                            <select
                                value={residueResult}
                                onChange={(e) => setResidueResult(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                <option value="Đạt">Đạt</option>
                                <option value="Không đạt">Không đạt</option>
                                <option value="Chờ kết quả">Chờ kết quả</option>
                                <option value="Chưa kiểm tra">Chưa kiểm tra</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                                Mã phiếu kiểm nghiệm
                            </label>
                            <input
                                type="text"
                                value={testCertificateCode}
                                onChange={(e) => setTestCertificateCode(e.target.value)}
                                placeholder="Nhập nếu có"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </fieldset>

                {/* 4. KẾT QUẢ XỬ LÝ */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        4. Kết quả xử lý
                    </legend>
                    <div className="text-xs text-slate-500 mb-2">
                        Tổng khối lượng thực nhận: <b className="text-slate-800">{totalWeight.toLocaleString("vi-VN")} kg</b>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                                Khối lượng chấp nhận (kg)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={totalWeight}
                                step="0.1"
                                value={acceptedWeight}
                                onChange={(e) => handleAcceptedChange(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-emerald-700 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
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
                        <div className="space-y-2 pt-2">
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                                Lý do từ chối / điều kiện
                            </label>
                            <select
                                value={rejectionReasonPreset}
                                onChange={(e) => setRejectionReasonPreset(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            >
                                <option value="Không đạt tiêu chuẩn dư lượng">Không đạt tiêu chuẩn dư lượng</option>
                                <option value="Tỷ lệ dập nát/hư hỏng cao">Tỷ lệ dập nát/hư hỏng cao</option>
                                <option value="Trái sượng/chưa đạt độ chín">Trái sượng/chưa đạt độ chín</option>
                                <option value="Kém chất lượng ngoại quan">Kém chất lượng ngoại quan</option>
                                <option value="Khác">Khác</option>
                            </select>
                            <textarea
                                value={rejectionReasonDetail}
                                onChange={(e) => setRejectionReasonDetail(e.target.value)}
                                rows={2}
                                placeholder="Chi tiết lý do từ chối hoặc điều kiện tiếp nhận (nếu có)..."
                                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    )}
                </fieldset>

                {/* 5. GHI CHÚ */}
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-brand-700">
                        5. Ghi chú
                    </legend>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                            Vị trí lưu kho
                        </label>
                        <input
                            type="text"
                            value={warehouseLocation}
                            onChange={(e) => setWarehouseLocation(e.target.value)}
                            placeholder="Ví dụ: Kho lạnh A1, Kệ B2"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                            Ghi chú QC
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder="Nội dung bổ sung..."
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                </fieldset>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">
                        Hủy
                    </Button>
                    <Button type="submit" disabled={busy} className="flex-1 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold">
                        {busy ? "Đang lưu..." : "Lưu kết quả QC"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function Info({ icon: Icon, label, value }: { icon: typeof Sprout; label: string; value: string }) {
    return (
        <p className="flex gap-2">
            <Icon className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="min-w-0">
                <small className="text-slate-400">{label}</small><br/>
                <b className="break-words">{value}</b>
            </span>
        </p>
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

function Field({
    name,
    label,
    type = "text",
    required,
    defaultValue,
}: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
}) {
    return (
        <label className="block text-sm font-semibold">
            {label}
            <input
                name={name}
                type={type}
                required={required}
                defaultValue={defaultValue}
                min={type === "number" ? 0 : undefined}
                step={type === "number" ? "0.01" : undefined}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
        </label>
    );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-bold text-slate-900">{value}</p>
        </div>
    );
}
