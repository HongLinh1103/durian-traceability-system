"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, ExternalLink, QrCode, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type Lot = { id: string; lotCode: string; ownerType?: string; productName: string; quantity: number; remainingQuantity?: number; unit: string; owner: { name: string }; destination: { name: string } | null; traceabilityCode: { id: string; publicToken: string; status: string } | null; validation: { traceCompleteness: number; canIssueQr: boolean; missingRequirements: string[] } };
type SourceOption = { id: string; code: string; type: "HARVEST_LOT" | "COLLECTION_LOT" | "FINISHED_PRODUCT_LOT"; label: string };
type DestinationOption = { id: string; name: string };

function QrPreview({ token }: { token: string }) {
    const [src, setSrc] = useState("");
    useEffect(() => { void QRCode.toDataURL(`${window.location.origin}/trace/${token}`, { width: 180, margin: 1, errorCorrectionLevel: "M" }).then(setSrc); }, [token]);
    function printQr() { const popup = window.open("", "_blank", "width=520,height=620"); if (popup) { popup.document.write(`<title>${token}</title><main style="font-family:sans-serif;text-align:center;padding:40px"><h2>TriViet</h2><img width="320" src="${src}"/><p><b>${token}</b></p><p>${window.location.origin}/trace/${token}</p></main>`); popup.document.close(); popup.onload = () => popup.print(); } }
    return src ? <div className="flex items-center gap-2"><Image unoptimized src={src} width={80} height={80} alt={`QR truy xuất ${token}`} className="h-20 w-20 rounded-lg border bg-white p-1"/><div className="flex flex-col gap-1"><a download={`${token}.png`} href={src} className="rounded-lg border px-2 py-1 text-xs font-semibold">Tải QR</a><button type="button" onClick={printQr} className="rounded-lg border px-2 py-1 text-xs font-semibold">In QR</button></div></div> : null;
}

export function TraceabilityManager({ initialLots, admin = false, readOnly = false, sources = [], destinations = [] }: { initialLots: Lot[]; admin?: boolean; readOnly?: boolean; sources?: SourceOption[]; destinations?: DestinationOption[] }) {
    const [lots, setLots] = useState(initialLots);
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [issuerFilter, setIssuerFilter] = useState("ALL");
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
        const response = await fetch("/api/traceability/commercial-lots", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lotCode: formData.get("lotCode"), sourceId: selected?.id, sourceType: selected?.type, destinationId: destinationId || undefined, destination: destinationId ? undefined : { type: formData.get("destinationType"), name: formData.get("destinationName"), address: formData.get("destinationAddress") }, productName: formData.get("productName"), quantity: formData.get("quantity"), unit: "kg" }) });
        const payload = await response.json();
        if (payload.success) window.location.reload(); else setMessage(payload.error || "Không thể tạo lô thương mại");
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
        {!admin && <form action={createLot} className="grid gap-3 rounded-3xl border bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"><div className="lg:col-span-5"><h2 className="text-lg font-black">Tạo lô thương mại</h2><p className="text-sm text-slate-500">Mỗi lô gắn với một nguồn và một điểm đến độc lập.</p></div><input required name="lotCode" placeholder="Mã lô, ví dụ CM-20260824-001" className="rounded-xl border px-3 py-2"/><input required name="productName" placeholder="Tên sản phẩm" className="rounded-xl border px-3 py-2"/><select required name="sourceId" className="rounded-xl border px-3 py-2"><option value="">Chọn lô nguồn</option>{sources.map(source => <option key={source.id} value={source.id}>{source.code} · {source.label}</option>)}</select><select name="destinationId" className="rounded-xl border px-3 py-2"><option value="">Tạo điểm đến mới</option>{destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select><input required min="0.01" step="0.01" type="number" name="quantity" placeholder="Khối lượng kg" className="rounded-xl border px-3 py-2"/><div className="lg:col-span-5 border-t pt-3"><p className="mb-2 text-xs font-bold uppercase text-slate-500">Thông tin điểm đến mới — chỉ dùng khi chưa chọn điểm đến có sẵn</p><div className="grid gap-3 sm:grid-cols-3"><select name="destinationType" defaultValue="MARKET" className="rounded-xl border px-3 py-2"><option value="MARKET">Chợ</option><option value="RETAIL">Bán lẻ</option><option value="DISTRIBUTOR">Nhà phân phối</option><option value="EXPORT">Xuất khẩu</option><option value="OTHER">Khác</option></select><input name="destinationName" placeholder="Tên điểm đến" className="rounded-xl border px-3 py-2"/><input name="destinationAddress" placeholder="Địa chỉ" className="rounded-xl border px-3 py-2"/></div></div><Button className="sm:w-fit" disabled={busy === "create"}>{busy === "create" ? "Đang tạo..." : "Tạo lô"}</Button></form>}
        {message && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</p>}
        <div className="grid gap-4 lg:grid-cols-2">{visibleLots.map(lot => <article key={lot.id} className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{lot.lotCode}</p><h2 className="mt-1 text-lg font-black">{lot.productName}</h2><p className="mt-1 text-sm text-slate-500">{lot.owner.name} · {lot.quantity.toLocaleString("vi-VN")} {lot.unit}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${lot.validation.canIssueQr ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{lot.validation.traceCompleteness}%</span></div>
            <p className="mt-4 text-sm"><span className="text-slate-500">Điểm đến:</span> <b>{lot.destination?.name || "Chưa xác định"}</b></p>
            {!lot.validation.canIssueQr && <div className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="h-4 w-4 shrink-0"/><span>{lot.validation.missingRequirements.join("; ")}</span></div>}
            <div className="mt-4 flex flex-wrap items-center gap-2">{lot.traceabilityCode ? <><QrPreview token={lot.traceabilityCode.publicToken}/><span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4" />{lot.traceabilityCode.status}</span><Button asChild variant="outline"><Link target="_blank" href={`/trace/${lot.traceabilityCode.publicToken}`}>Xem công khai <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>{!admin && lot.traceabilityCode.status === "ACTIVE" && Number(lot.remainingQuantity ?? lot.quantity) > 0 && <Button disabled={busy === lot.id} onClick={() => dispatch(lot)}>Xuất hàng</Button>}{admin && (lot.traceabilityCode.status === "ACTIVE" ? <><Button variant="outline" disabled={busy === lot.traceabilityCode.id} onClick={() => review(lot.traceabilityCode!.id, "SUSPEND")}>Tạm khóa</Button><Button variant="destructive" disabled={busy === lot.traceabilityCode.id} onClick={() => review(lot.traceabilityCode!.id, "REVOKE")}>Thu hồi</Button></> : lot.traceabilityCode.status !== "REVOKED" && <Button disabled={busy === lot.traceabilityCode.id} onClick={() => review(lot.traceabilityCode!.id, "REACTIVATE")}>Kích hoạt lại</Button>)}</> : !admin && <Button disabled={!lot.validation.canIssueQr || busy === lot.id} onClick={() => issue(lot.id)}><QrCode className="mr-2 h-4 w-4" />{busy === lot.id ? "Đang phát hành..." : "Phát hành QR"}</Button>}</div>
        </article>)}{!lots.length && <p className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500 lg:col-span-2">Chưa có lô thương mại.</p>}</div>
    </div>;
}
