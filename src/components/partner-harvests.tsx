"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, MapPin, Scale, Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HarvestRow = {
    id: string; code: string; status: string; expectedWeight: string | number; actualWeight?: string | number | null;
    deliveredWeight?: string | number | null; weightUnit: string; expectedHarvestDate: string; expectedPricePerKg?: string | number | null;
    farm: { farmName: string; farmCode?: string; address: string; durianVariety: string; region?: { code: string } | null };
    farmer?: { fullName: string; phone: string };
};
type RawLot = { id: string; code: string; status: string; sourceCode: string; farmName: string; supplierName: string; receivedAt: string; sentWeight: number; actualReceivedWeight: number; qualityResult?: string | null; warehouseLocation?: string | null };

const statusLabels: Record<string, string> = {
    WAITING_CONFIRMATION: "Chờ xác nhận", CONFIRMED: "Đã xác nhận / Sắp thu hoạch", REJECTED: "Đã từ chối", HARVESTING: "Đang thu hoạch",
    HARVESTED: "Chờ giao", DELIVERY_CONFIRMED: "Đang vận chuyển", COMPLETED: "Đã nhận / Chờ QC", CANCELLED: "Đã hủy",
    PENDING_QC: "Đã nhận / Chờ QC", AVAILABLE: "Đã tiếp nhận", QUARANTINED: "QC có điều kiện",
};

const processingTabs = [
    ["all", "Tất cả"], ["new", "Mới / Chờ xác nhận"], ["upcoming", "Sắp giao"], ["transit", "Đang vận chuyển"],
    ["qc", "Đã nhận / Chờ QC"], ["accepted", "Đã tiếp nhận"], ["rejected", "Từ chối"],
];
const collectorTabs = [["all", "Tất cả"], ["WAITING_CONFIRMATION", "Mới / Chờ xác nhận"], ["CONFIRMED", "Đã xác nhận"], ["upcoming", "Sắp thu hoạch"], ["HARVESTED", "Đã thu hoạch"], ["REJECTED", "Đã từ chối"]];

export function PartnerHarvests({ initial, mode = "COLLECTOR", rawLots = [], initialTab = "all" }: { initial: HarvestRow[]; mode?: "COLLECTOR" | "PROCESSING_FACILITY"; rawLots?: RawLot[]; initialTab?: string }) {
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
    const filteredLots = useMemo(() => lots.filter((lot) => tab === "all" || (tab === "action-required" && lot.status === "PENDING_QC") || (tab === "qc" && ["PENDING_QC", "QUARANTINED"].includes(lot.status)) || (tab === "accepted" && lot.status === "AVAILABLE") || (tab === "rejected" && lot.status === "REJECTED")), [lots, tab]);

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
            if (!response.ok) throw new Error(result.message || "Không thể cập nhật phiếu.");
            setRows((current) => current.map((item) => item.id === id ? { ...item, status: result.data.status } : item));
            if (action === "RECEIVE") {
                window.location.reload();
            }
            return true;
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Không thể cập nhật phiếu.");
            return false;
        } finally {
            setBusy(null);
        }
    }

    async function submitReceipt(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!receiveRow) return;
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());
        const ok = await act(receiveRow.id, "RECEIVE", data);
        if (ok) {
            setReceiveRow(null);
        }
    }

    async function submitQc(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!qcLot) return;
        setBusy(qcLot.id);
        setError("");
        try {
            const data = Object.fromEntries(new FormData(event.currentTarget).entries());
            const response = await fetch(`/api/processing/raw-materials/${qcLot.id}/qc`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể lưu kết quả QC.");
            setLots((current) => current.map((item) => item.id === qcLot.id ? { ...item, status: result.data.status } : item));
            setQcLot(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Không thể lưu kết quả QC.");
        } finally {
            setBusy(null);
        }
    }

    const tabs = mode === "PROCESSING_FACILITY" ? (initialTab === "action-required" ? [["action-required", "Cần xử lý"], ...processingTabs] : processingTabs) : collectorTabs;
    return (
        <section className="space-y-5">
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map(([value, label]) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${tab === value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {error && !receiveRow && !qcLot && (
                <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
                {filteredRows.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                        <CardHeader className="border-b bg-slate-50">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-brand-600">{item.code}</p>
                                    <CardTitle className="mt-1">{item.farm.farmName}</CardTitle>
                                    <p className="mt-1 text-sm text-slate-500">Nông dân: {item.farmer?.fullName ?? "Chưa cập nhật"}</p>
                                </div>
                                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                                    {statusLabels[item.status] ?? item.status}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-5">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <Info icon={Sprout} label="Giống" value={item.farm.durianVariety} />
                                <Info icon={Scale} label={item.actualWeight ? "Khối lượng thực tế" : "Sản lượng dự kiến"} value={`${Number(item.actualWeight ?? item.expectedWeight).toLocaleString("vi-VN")} ${item.weightUnit}`} />
                                <Info icon={CalendarDays} label="Ngày dự kiến" value={new Date(item.expectedHarvestDate).toLocaleDateString("vi-VN")} />
                                <Info icon={MapPin} label="Vùng trồng" value={item.farm.region?.code ?? item.farm.address} />
                            </div>
                            {item.expectedPricePerKg && (
                                <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
                                    Giá đề xuất: <b>{Number(item.expectedPricePerKg).toLocaleString("vi-VN")} đ/kg</b>
                                </p>
                            )}
                            {item.status === "WAITING_CONFIRMATION" && (
                                <div className="flex flex-wrap gap-2">
                                    <Button disabled={busy === item.id} onClick={() => void act(item.id, "CONFIRM")}>
                                        {mode === "PROCESSING_FACILITY" ? "Xác nhận tiếp nhận" : "Xác nhận thu mua"}
                                    </Button>
                                    <Button disabled={busy === item.id} variant="outline" onClick={() => void act(item.id, "REJECT")}>
                                        Từ chối
                                    </Button>
                                </div>
                            )}
                            {mode === "PROCESSING_FACILITY" && (item.status === "DELIVERY_CONFIRMED" || item.status === "HARVESTED" || item.status === "CONFIRMED") && (
                                <Button disabled={busy === item.id} onClick={() => { setError(""); setReceiveRow(item); }}>
                                    Xác nhận nhận nguyên liệu
                                </Button>
                            )}
                            {mode === "COLLECTOR" && ["HARVESTED", "DELIVERY_CONFIRMED"].includes(item.status) && (
                                <Button disabled={busy === item.id} onClick={() => {
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
                                <Button onClick={() => { setError(""); setQcLot(lot); }}>
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
                        <Field name="receiverName" label="Người nhận" />
                        <Field name="weightDifferenceReason" label="Lý do chênh lệch" />
                        <Field name="warehouseLocation" label="Vị trí kho" />
                        <Field name="note" label="Ghi chú" />
                        <Button type="submit" className="w-full" disabled={busy === receiveRow.id}>
                            {busy === receiveRow.id ? "Đang lưu tiếp nhận..." : "Lưu tiếp nhận và chuyển chờ QC"}
                        </Button>
                    </form>
                </Modal>
            )}
            {qcLot && (
                <Modal title={`QC lô ${qcLot.code}`} onClose={() => setQcLot(null)}>
                    <form onSubmit={submitQc} className="space-y-4">
                        {error && (
                            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
                        )}
                        <label className="block text-sm font-semibold">
                            Kết quả *
                            <select name="result" required className="mt-1 w-full rounded-xl border px-3 py-2">
                                <option value="PASSED">Đạt</option>
                                <option value="CONDITIONAL">Đạt có điều kiện</option>
                                <option value="FAILED">Không đạt</option>
                            </select>
                        </label>
                        <Field name="appearance" label="Ngoại quan" />
                        <Field name="qualityGrade" label="Phân hạng / Grade" />
                        <Field name="residueResult" label="Kết quả dư lượng" />
                        <Field name="damageRate" label="Tỷ lệ hư hỏng (%)" type="number" />
                        <Field name="warehouseLocation" label="Vị trí kho" />
                        <Field name="note" label="Ghi chú QC" />
                        <Button type="submit" className="w-full" disabled={busy === qcLot.id}>
                            {busy === qcLot.id ? "Đang lưu kết quả..." : "Lưu kết quả QC"}
                        </Button>
                    </form>
                </Modal>
            )}
        </section>
    );
}

function Info({ icon: Icon, label, value }: { icon: typeof Sprout; label: string; value: string }) {
    return (
        <p className="flex gap-2">
            <Icon className="h-4 w-4 shrink-0 text-brand-600"/>
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
                        <X className="h-5 w-5"/>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
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
                className="mt-1 w-full rounded-xl border px-3 py-2"
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
