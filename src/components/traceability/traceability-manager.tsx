"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, ExternalLink, QrCode, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type Lot = { id: string; lotCode: string; ownerType?: string; productName: string; quantity: number; remainingQuantity?: number; unit: string; owner: { name: string }; destination: { name: string } | null; traceabilityCode: { id: string; publicToken: string; status: string } | null; validation: { traceCompleteness: number; canIssueQr: boolean; missingRequirements: string[] } };
type SourceOption = { id: string; code: string; type: "HARVEST_LOT" | "COLLECTION_LOT" | "FINISHED_PRODUCT_LOT"; label: string; productName?: string; totalQuantity?: number; remainingQuantity?: number; farmCount?: number; qcStatus?: "PASSED" | "PENDING" | "FAILED" };
type DestinationOption = { id: string; name: string };
type IssuerRole = "FARMER" | "COLLECTOR" | "PROCESSING_FACILITY";

function QrPreview({ token }: { token: string }) {
    const [src, setSrc] = useState("");
    useEffect(() => { void QRCode.toDataURL(`${window.location.origin}/trace/${token}`, { width: 180, margin: 1, errorCorrectionLevel: "M" }).then(setSrc); }, [token]);
    function printQr() { const popup = window.open("", "_blank", "width=520,height=620"); if (popup) { popup.document.write(`<title>${token}</title><main style="font-family:sans-serif;text-align:center;padding:40px"><h2>TriViet</h2><img width="320" src="${src}"/><p><b>${token}</b></p><p>${window.location.origin}/trace/${token}</p></main>`); popup.document.close(); popup.onload = () => popup.print(); } }
    return src ? <div className="flex items-center gap-2"><Image unoptimized src={src} width={80} height={80} alt={`QR truy xuất ${token}`} className="h-20 w-20 rounded-lg border bg-white p-1"/><div className="flex flex-col gap-1"><a download={`${token}.png`} href={src} className="rounded-lg border px-2 py-1 text-xs font-semibold">Tải QR</a><button type="button" onClick={printQr} className="rounded-lg border px-2 py-1 text-xs font-semibold">In QR</button></div></div> : null;
}

export function TraceabilityManager({ initialLots, admin = false, readOnly = false, role = "FARMER", sources = [], destinations = [] }: { initialLots: Lot[]; admin?: boolean; readOnly?: boolean; role?: IssuerRole; sources?: SourceOption[]; destinations?: DestinationOption[] }) {
    const [lots, setLots] = useState(initialLots);
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [issuerFilter, setIssuerFilter] = useState("ALL");
    const [saleMode, setSaleMode] = useState(role === "PROCESSING_FACILITY" ? "DOMESTIC" : role === "COLLECTOR" ? "MARKET" : "DIRECT");
    const [selectedSourceId, setSelectedSourceId] = useState("");
    const [destinationId, setDestinationId] = useState("");
    const selectedSource = sources.find(source => source.id === selectedSourceId);
    const dateCode = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const nextSequence = Math.max(0, ...lots.map(lot => lot.lotCode.match(new RegExp(`^CM-COL-${dateCode}-(\\d+)$`))).map(match => Number(match?.[1] ?? 0))) + 1;
    const generatedLotCode = `CM-COL-${dateCode}-${String(nextSequence).padStart(3, "0")}`;
    const visibleLots = issuerFilter === "ALL" ? lots : lots.filter(lot => lot.ownerType === issuerFilter);
    async function issue(id: string) {
        setBusy(id); setMessage("");
        const response = await fetch("/api/traceability/codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ commercialLotId: id }) });
        const payload = await response.json();
        if (payload.success) setLots(current => current.map(lot => lot.id === id ? { ...lot, traceabilityCode: payload.data } : lot));
        else setMessage(payload.error || "Không thể phát hành mã QR");
        setBusy(null);
    }
    async function createLot(formData: FormData) {
        setBusy("create"); setMessage("");
        const selected = sources.find(source => source.id === formData.get("sourceId"));
        const destinationId = String(formData.get("destinationId") || "");
        const note = [formData.get("plannedDate") && `Ngày dự kiến: ${formData.get("plannedDate")}`, formData.get("note")].filter(Boolean).join("\n");
        const response = await fetch("/api/traceability/commercial-lots", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lotCode: formData.get("lotCode"), sourceId: selected?.id, sourceType: selected?.type, destinationId: destinationId || undefined, destination: destinationId ? undefined : { type: formData.get("destinationType"), name: formData.get("destinationName"), address: formData.get("destinationAddress"), contactName: formData.get("contactName"), contactPhone: formData.get("contactPhone") }, productName: formData.get("productName"), quantity: formData.get("quantity"), unit: "kg", note }) });
        const payload = await response.json();
        if (!payload.success) {
            setMessage(payload.error || "Không thể tạo lô bán / xuất hàng");
            setBusy(null);
            return;
        }
        const issueResponse = await fetch("/api/traceability/codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ commercialLotId: payload.data.id }) });
        const issuePayload = await issueResponse.json();
        if (issuePayload.success) window.location.reload();
        else setMessage(`Lô bán đã được tạo nhưng chưa thể phát hành QR: ${issuePayload.error || "Dữ liệu truy xuất chưa đầy đủ"}`);
        setBusy(null);
    }
    async function review(codeId: string, action: "SUSPEND" | "REVOKE" | "REACTIVATE") {
        const reason = window.prompt("Nhập lý do kiểm soát mã (tối thiểu 5 ký tự):");
        if (!reason) return;
        setBusy(codeId); setMessage("");
        const response = await fetch("/api/traceability/codes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ codeId, action, reason }) });
        const payload = await response.json();
        if (payload.success) setLots(current => current.map(lot => lot.traceabilityCode?.id === codeId ? { ...lot, traceabilityCode: { ...lot.traceabilityCode!, status: payload.data.status } } : lot));
        else setMessage(payload.error || "Không thể cập nhật mã");
        setBusy(null);
    }
    async function dispatch(lot: Lot) {
        const weight = window.prompt(`Khối lượng xuất (còn ${Number(lot.remainingQuantity ?? lot.quantity).toLocaleString("vi-VN")} ${lot.unit}):`, String(lot.remainingQuantity ?? lot.quantity));
        if (!weight) return;
        setBusy(lot.id); setMessage("");
        const response = await fetch("/api/traceability/shipments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ commercialLotId: lot.id, weight }) });
        const payload = await response.json();
        if (payload.success) window.location.reload(); else setMessage(payload.error || "Không thể xuất hàng");
        setBusy(null);
    }
    return <div className="space-y-4">
        {admin && <><section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
            ["Tổng QR", lots.filter(lot => lot.traceabilityCode).length], ["Farmer-issued", lots.filter(lot => lot.ownerType === "FARMER" && lot.traceabilityCode).length],
            ["Collector-issued", lots.filter(lot => lot.ownerType === "COLLECTOR" && lot.traceabilityCode).length], ["Processor-issued", lots.filter(lot => lot.ownerType === "PROCESSING_FACILITY" && lot.traceabilityCode).length],
            ["Đang hoạt động", lots.filter(lot => lot.traceabilityCode?.status === "ACTIVE").length], ["Tạm khóa", lots.filter(lot => lot.traceabilityCode?.status === "SUSPENDED").length],
            ["Đã thu hồi", lots.filter(lot => lot.traceabilityCode?.status === "REVOKED").length], ["Trace chưa đủ", lots.filter(lot => !lot.validation.canIssueQr).length],
        ].map(([label, value]) => <article key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>)}</section><select value={issuerFilter} onChange={event => setIssuerFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2"><option value="ALL">Tất cả đơn vị phát hành</option><option value="FARMER">Nông dân</option><option value="COLLECTOR">Vựa thu mua</option><option value="PROCESSING_FACILITY">Cơ sở chế biến</option></select></>}
        {!admin && !readOnly && <form action={createLot} className="space-y-5 rounded-3xl border bg-white p-5 shadow-sm">
            <div><h2 className="text-xl font-black">Tạo QR</h2><p className="text-sm text-slate-500">Chọn nguồn hàng, khai báo điểm đến và kiểm tra dữ liệu trước khi phát hành.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-bold">1. {role === "FARMER" ? "Lô thu hoạch" : role === "COLLECTOR" ? "Lô thu mua" : "Lô thành phẩm"}<select required name="sourceId" value={selectedSourceId} onChange={event => setSelectedSourceId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Chọn nguồn hàng</option>{sources.map(source => <option key={source.id} value={source.id}>{source.code} · {source.label}</option>)}</select></label>
                <label className="text-sm font-bold">2. Khối lượng<input required min="0.01" max={selectedSource?.remainingQuantity} step="0.01" type="number" name="quantity" placeholder="Khối lượng kg" className="mt-1 w-full rounded-xl border px-3 py-2"/><span className="mt-1 block text-xs font-normal text-slate-500">{selectedSource?.remainingQuantity != null ? `Tối đa ${selectedSource.remainingQuantity.toLocaleString("vi-VN")} kg` : "Chọn lô để xem lượng khả dụng"}</span></label>
                <label className="text-sm font-bold">Tên sản phẩm<input required name="productName" value={role === "COLLECTOR" ? selectedSource?.productName ?? "" : undefined} readOnly={role === "COLLECTOR"} placeholder="Tên sản phẩm" className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2 read-only:text-slate-700"/></label>
                <label className="text-sm font-bold">Mã lô bán / xuất hàng<input required name="lotCode" value={role === "COLLECTOR" ? generatedLotCode : undefined} readOnly={role === "COLLECTOR"} placeholder="Ví dụ: QR-20260824-001" className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2 read-only:font-mono read-only:text-slate-700"/></label>
                <label className="text-sm font-bold">3. Hình thức bán / xuất<select value={saleMode} onChange={event => setSaleMode(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">{role === "FARMER" ? <><option value="DIRECT">Bán trực tiếp</option><option value="RETAIL">Đưa đến điểm bán lẻ</option></> : role === "PROCESSING_FACILITY" ? <><option value="DOMESTIC">Bán trong nước</option><option value="EXPORT">Xuất khẩu</option></> : <><option value="MARKET">Bán đến chợ</option><option value="WHOLESALE_MARKET">Bán đến chợ đầu mối</option><option value="SUPERMARKET">Bán đến siêu thị</option><option value="RETAIL_STORE">Bán đến cửa hàng bán lẻ</option><option value="DISTRIBUTOR">Bán cho nhà phân phối</option></>}</select></label>
                <label className="text-sm font-bold">Điểm đến<select name="destinationId" value={destinationId} onChange={event => setDestinationId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Nhập điểm đến mới</option>{destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></label>
            </div>
            {role === "COLLECTOR" && selectedSource && <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm sm:grid-cols-3 lg:grid-cols-6"><div><span className="text-slate-500">Mã lô</span><b className="block">{selectedSource.code}</b></div><div><span className="text-slate-500">Sản phẩm</span><b className="block">{selectedSource.productName}</b></div><div><span className="text-slate-500">Tổng</span><b className="block">{selectedSource.totalQuantity?.toLocaleString("vi-VN")} kg</b></div><div><span className="text-slate-500">Còn khả dụng</span><b className="block">{selectedSource.remainingQuantity?.toLocaleString("vi-VN")} kg</b></div><div><span className="text-slate-500">Nguồn</span><b className="block">{selectedSource.farmCount} vườn</b></div><div><span className="text-slate-500">QC</span><b className={`block ${selectedSource.qcStatus === "PASSED" ? "text-emerald-700" : "text-amber-700"}`}>{selectedSource.qcStatus === "PASSED" ? "Đạt" : "Chờ kiểm tra"}</b></div></div>}
            {!destinationId && <div className="border-t pt-4"><p className="mb-3 text-xs font-black uppercase text-slate-500">4. Khai báo điểm đến mới</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><select name="destinationType" defaultValue={saleMode === "DISTRIBUTOR" ? "DISTRIBUTOR" : saleMode === "MARKET" || saleMode === "WHOLESALE_MARKET" ? "MARKET" : "RETAIL"} className="rounded-xl border px-3 py-2"><option value="MARKET">Chợ</option><option value="MARKET">Chợ đầu mối</option><option value="RETAIL">Siêu thị</option><option value="RETAIL">Cửa hàng bán lẻ</option><option value="DISTRIBUTOR">Nhà phân phối</option><option value="OTHER">Khác</option></select><input name="destinationName" placeholder="Tên điểm đến" className="rounded-xl border px-3 py-2"/><input name="destinationAddress" placeholder="Tỉnh/Thành, Quận/Huyện, Xã/Phường, địa chỉ" className="rounded-xl border px-3 py-2"/><input name="plannedDate" type="date" title="Ngày dự kiến xuất/giao hàng" className="rounded-xl border px-3 py-2"/><input name="contactName" placeholder="Người nhận (không bắt buộc)" className="rounded-xl border px-3 py-2"/><input name="contactPhone" placeholder="SĐT liên hệ (không bắt buộc)" className="rounded-xl border px-3 py-2"/><textarea name="note" placeholder="Yêu cầu giao hàng, quầy nhận, thời gian nhận hoặc lưu ý đặc biệt" className="min-h-20 rounded-xl border px-3 py-2 sm:col-span-2 lg:col-span-3"/></div></div>}
            <div className="flex justify-end border-t pt-5"><Button type="submit" className="min-w-44" disabled={busy === "create"}><QrCode className="mr-2 h-4 w-4" />{busy === "create" ? "Đang tạo mã QR..." : "Tạo mã QR"}</Button></div>
        </form>}
        {message && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</p>}
        <div className="grid gap-4 lg:grid-cols-2">{visibleLots.map(lot => <article key={lot.id} className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{lot.lotCode}</p><h2 className="mt-1 text-lg font-black">{lot.productName}</h2><p className="mt-1 text-sm text-slate-500">{lot.owner.name} · {lot.quantity.toLocaleString("vi-VN")} {lot.unit}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${lot.validation.canIssueQr ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{lot.validation.traceCompleteness}%</span></div>
            <p className="mt-4 text-sm"><span className="text-slate-500">Điểm đến:</span> <b>{lot.destination?.name || "Chưa xác định"}</b></p>
            {!lot.validation.canIssueQr && <div className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="h-4 w-4 shrink-0"/><span>{lot.validation.missingRequirements.join("; ")}</span></div>}
            <div className="mt-4 flex flex-wrap items-center gap-2">{lot.traceabilityCode ? <><QrPreview token={lot.traceabilityCode.publicToken}/><span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4" />{lot.traceabilityCode.status}</span><Button asChild variant="outline"><Link target="_blank" href={`/trace/${lot.traceabilityCode.publicToken}`}>Xem công khai <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>{!admin && lot.traceabilityCode.status === "ACTIVE" && Number(lot.remainingQuantity ?? lot.quantity) > 0 && <Button disabled={busy === lot.id} onClick={() => dispatch(lot)}>Xuất hàng</Button>}{admin && (lot.traceabilityCode.status === "ACTIVE" ? <><Button variant="outline" disabled={busy === lot.traceabilityCode.id} onClick={() => review(lot.traceabilityCode!.id, "SUSPEND")}>Tạm khóa</Button><Button variant="destructive" disabled={busy === lot.traceabilityCode.id} onClick={() => review(lot.traceabilityCode!.id, "REVOKE")}>Thu hồi</Button></> : lot.traceabilityCode.status !== "REVOKED" && <Button disabled={busy === lot.traceabilityCode.id} onClick={() => review(lot.traceabilityCode!.id, "REACTIVATE")}>Kích hoạt lại</Button>)}</> : !admin && <Button disabled={!lot.validation.canIssueQr || busy === lot.id} onClick={() => issue(lot.id)}><QrCode className="mr-2 h-4 w-4" />{busy === lot.id ? "Đang phát hành..." : "Phát hành QR"}</Button>}</div>
        </article>)}{!lots.length && <p className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500 lg:col-span-2">Chưa có lô bán hoặc lô xuất hàng.</p>}</div>
    </div>;
}
