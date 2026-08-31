"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, PackageCheck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

type Lot = { id: string; code: string; farmName: string; sourceCode: string; currentWeight: number; direction: string; freshExportWeight: number; processingWeight: number };

export function RawMaterialClassificationManager({ initialLots }: { initialLots: Lot[] }) {
    const [lots, setLots] = useState(initialLots);
    const [active, setActive] = useState<Lot | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const unclassified = useMemo(() => lots.filter((lot) => lot.direction === "UNCLASSIFIED" && lot.currentWeight > 0), [lots]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); if (!active) return;
        const form = new FormData(event.currentTarget);
        const freshExportWeight = Number(form.get("freshExportWeight") || 0);
        const processingWeight = Number(form.get("processingWeight") || 0);
        setBusy(true); setMessage("");
        try {
            const response = await fetch(`/api/processing/raw-materials/${active.id}/classify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ freshExportWeight, processingWeight, freshProductName: form.get("freshProductName"), packaging: form.get("packaging"), note: form.get("note") }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Không thể phân loại lô.");
            const direction = freshExportWeight > 0 && processingWeight > 0 ? "SPLIT" : freshExportWeight > 0 ? "FRESH_EXPORT" : "PROCESSING";
            setLots((current) => current.map((lot) => lot.id === active.id ? { ...lot, direction, freshExportWeight, processingWeight, currentWeight: processingWeight } : lot));
            setMessage(`Đã phân loại ${active.code}. Nhánh trái tươi được tạo thành phẩm đóng gói; nhánh chế biến đã sẵn sàng.`); setActive(null);
        } catch (error) { setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra."); }
        finally { setBusy(false); }
    }

    return <section className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
        <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Bước 2</p><h2 className="text-xl font-black text-slate-900">Phân loại theo hướng xử lý</h2><p className="mt-1 text-sm text-slate-500">Chỉ ghi nhận khối lượng đi nhánh trái tươi xuất khẩu hoặc chuyển chế biến. Không theo dõi từng thao tác trong xưởng.</p></div>
        {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
        <div className="grid gap-3 md:grid-cols-2">{unclassified.map((lot) => <article key={lot.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-slate-900">{lot.code}</b><p className="text-xs text-slate-500">Nguồn {lot.sourceCode} · {lot.farmName}</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Chờ phân loại</span></div><p className="mt-4 flex items-center gap-2 text-sm"><Scale className="h-4 w-4 text-emerald-600" /><b>{lot.currentWeight.toLocaleString("vi-VN")} kg</b> khả dụng</p><Button onClick={() => setActive(lot)} className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">Phân loại <ArrowRight className="ml-2 h-4 w-4" /></Button></article>)}</div>
        {!unclassified.length && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500"><CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-500" />Không có lô đạt QC đang chờ phân loại.</div>}
        {active && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submit} className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl"><div><h3 className="text-xl font-black">Phân loại {active.code}</h3><p className="text-sm text-slate-500">Tổng không vượt quá {active.currentWeight.toLocaleString("vi-VN")} kg.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Trái tươi xuất khẩu (kg)" name="freshExportWeight" max={active.currentWeight} /><Field label="Chuyển chế biến (kg)" name="processingWeight" max={active.currentWeight} /></div><label className="block text-sm font-bold">Tên sản phẩm trái tươi<input name="freshProductName" defaultValue="Sầu riêng tươi đóng gói" className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" /></label><label className="block text-sm font-bold">Quy cách đóng gói<input name="packaging" defaultValue="Đóng thùng xuất khẩu" className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" /></label><label className="block text-sm font-bold">Ghi chú<textarea name="note" className="mt-1 min-h-20 w-full rounded-xl border p-3 font-normal" /></label><div className="flex gap-3"><Button type="button" variant="outline" onClick={() => setActive(null)} className="flex-1">Hủy</Button><Button disabled={busy} className="flex-1 bg-emerald-600 hover:bg-emerald-700"><PackageCheck className="mr-2 h-4 w-4" />{busy ? "Đang lưu..." : "Xác nhận phân loại"}</Button></div></form></div>}
    </section>;
}

function Field({ label, name, max }: { label: string; name: string; max: number }) { return <label className="block text-sm font-bold">{label}<input required name={name} type="number" min="0" max={max} step="0.01" defaultValue="0" className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" /></label>; }
