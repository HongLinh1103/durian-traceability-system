"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Eye, EyeOff, Layers3, Plus, Search, ShieldAlert, Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type Variety = { id: string; name: string; alternativeName: string | null; description: string | null; isActive: boolean };
type Activity = { id: string; code: string; name: string; sortOrder: number; isActive: boolean };
type Stage = { id: string; code: string; name: string; sortOrder: number; isActive: boolean; activities: Activity[] };

export function CatalogManager() {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<"varieties" | "cultivation">(() => searchParams.get("tab") === "cultivation" ? "cultivation" : "varieties");
    const [varieties, setVarieties] = useState<Variety[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [selectedStageId, setSelectedStageId] = useState("");
    const [search, setSearch] = useState("");
    const [varietyForm, setVarietyForm] = useState<Variety | "new" | null>(null);
    const [catalogForm, setCatalogForm] = useState<{ entity: "stage" | "activity"; item?: Stage | Activity } | null>(null);
    const [busy, setBusy] = useState(false);

    const loadVarieties = useCallback(async () => {
        const payload = await fetch("/api/admin/catalog/varieties", { cache: "no-store" }).then(response => response.json());
        if (payload.success) setVarieties(payload.data);
    }, []);
    const loadCultivation = useCallback(async () => {
        const payload = await fetch("/api/admin/catalog/cultivation", { cache: "no-store" }).then(response => response.json());
        if (payload.success) {
            setStages(payload.data);
            setSelectedStageId(current => payload.data.some((stage: Stage) => stage.id === current) ? current : payload.data[0]?.id ?? "");
        }
    }, []);
    useEffect(() => { void loadVarieties(); void loadCultivation(); }, [loadCultivation, loadVarieties]);

    const visibleVarieties = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("vi");
        return keyword ? varieties.filter(item => `${item.name} ${item.alternativeName ?? ""}`.toLocaleLowerCase("vi").includes(keyword)) : varieties;
    }, [search, varieties]);
    const selectedStage = stages.find(stage => stage.id === selectedStageId) ?? null;

    async function saveVariety(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setBusy(true);
        const form = new FormData(event.currentTarget);
        const body = { name: String(form.get("name") || ""), alternativeName: String(form.get("alternativeName") || ""), description: String(form.get("description") || "") };
        const editing = varietyForm !== "new" && varietyForm;
        const response = await fetch(editing ? `/api/admin/catalog/varieties/${editing.id}` : "/api/admin/catalog/varieties", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const payload = await response.json(); setBusy(false);
        if (!response.ok) return toast({ title: "Không thể lưu giống", description: payload.message, variant: "destructive" });
        setVarietyForm(null); await loadVarieties(); toast({ title: editing ? "Đã cập nhật giống" : "Đã thêm giống", variant: "success" });
    }
    async function toggleVariety(item: Variety) {
        await fetch(`/api/admin/catalog/varieties/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !item.isActive }) });
        await loadVarieties();
    }
    async function saveCatalog(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); if (!catalogForm) return; setBusy(true);
        const name = String(new FormData(event.currentTarget).get("name") || "");
        const editing = catalogForm.item;
        const response = await fetch(editing ? `/api/admin/catalog/cultivation/${editing.id}` : "/api/admin/catalog/cultivation", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { entity: catalogForm.entity, name } : { entity: catalogForm.entity, name, ...(catalogForm.entity === "activity" ? { stageId: selectedStageId } : {}) }) });
        const payload = await response.json(); setBusy(false);
        if (!response.ok) return toast({ title: "Không thể lưu danh mục", description: payload.message, variant: "destructive" });
        setCatalogForm(null); await loadCultivation(); toast({ title: "Đã lưu danh mục", variant: "success" });
    }
    async function patchCatalog(entity: "stage" | "activity", id: string, data: object) {
        await fetch(`/api/admin/catalog/cultivation/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, ...data }) });
        await loadCultivation();
    }

    return <main className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-7 sm:px-6">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Quản trị dữ liệu chuẩn</p><h1 className="mt-1 text-3xl font-black">Danh mục</h1><p className="mt-2 text-slate-500">Quản lý dữ liệu dùng chung cho vườn, nhật ký, kế hoạch và thu hoạch.</p></div>
        <nav className="grid grid-cols-3 gap-1 rounded-2xl border bg-white p-1.5 shadow-sm sm:gap-2 sm:rounded-3xl sm:p-2" aria-label="Loại danh mục">
            <button onClick={() => setTab("varieties")} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-bold leading-tight sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-3 sm:text-base ${tab === "varieties" ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-brand-50"}`}><Sprout className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"/><span className="whitespace-nowrap">Cây giống</span></button>
            <button onClick={() => setTab("cultivation")} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-bold leading-tight sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-3 sm:text-base ${tab === "cultivation" ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-brand-50"}`}><Layers3 className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"/><span><span className="whitespace-nowrap">Giai đoạn</span><span className="hidden sm:inline"> – </span><br className="sm:hidden"/><span className="whitespace-nowrap">Công việc</span></span></button>
            <Link href="/dashboard/admin/master-data/pesticides" className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-bold leading-tight text-slate-600 hover:bg-emerald-50 sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-3 sm:text-base"><ShieldAlert className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"/><span className="whitespace-nowrap">Danh mục cấm</span></Link>
        </nav>
        {tab === "varieties" ? <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-lg"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"/><Input className="h-12 pl-11" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên giống..."/></div><Button className="h-12" onClick={() => setVarietyForm("new")}><Plus className="mr-2 h-4 w-4"/>Thêm giống</Button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Tên giống</th><th className="p-4">Tên khác</th><th className="p-4">Mô tả ngắn</th><th className="p-4">Trạng thái</th><th className="p-4">Thao tác</th></tr></thead><tbody className="divide-y">{visibleVarieties.map(item => <tr key={item.id} className="hover:bg-slate-50"><td className="p-4 font-bold">{item.name}</td><td className="p-4 text-slate-600">{item.alternativeName || "—"}</td><td className="max-w-md p-4 text-slate-600">{item.description || "—"}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.isActive ? "Đang dùng" : "Đã ẩn"}</span></td><td className="p-4"><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setVarietyForm(item)}><Edit3 className="mr-1 h-4 w-4"/>Sửa</Button><Button size="sm" variant="ghost" onClick={() => void toggleVariety(item)}>{item.isActive ? <EyeOff className="mr-1 h-4 w-4"/> : <Eye className="mr-1 h-4 w-4"/>}{item.isActive ? "Ẩn" : "Dùng lại"}</Button></div></td></tr>)}</tbody></table></div>
        </section> : <section className="grid min-h-[560px] overflow-hidden rounded-3xl border bg-white shadow-sm lg:grid-cols-[340px_1fr]">
            <aside className="border-b bg-slate-50 p-4 lg:border-b-0 lg:border-r"><Button variant="outline" className="mb-4 w-full" onClick={() => setCatalogForm({ entity: "stage" })}><Plus className="mr-2 h-4 w-4"/>Thêm giai đoạn</Button><div className="space-y-2">{stages.map(stage => <button key={stage.id} onClick={() => setSelectedStageId(stage.id)} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-semibold ${selectedStageId === stage.id ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-emerald-50"}`}><span>{stage.name}</span>{!stage.isActive && <EyeOff className="h-4 w-4"/>}</button>)}</div></aside>
            <div className="p-5 sm:p-7">{selectedStage ? <><div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-emerald-600">Giai đoạn</p><h2 className="mt-1 text-2xl font-black">{selectedStage.name}</h2></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setCatalogForm({ entity: "stage", item: selectedStage })}><Edit3 className="mr-2 h-4 w-4"/>Sửa tên</Button><Button variant="outline" onClick={() => void patchCatalog("stage", selectedStage.id, { isActive: !selectedStage.isActive })}>{selectedStage.isActive ? "Ẩn giai đoạn" : "Dùng lại"}</Button><Button onClick={() => setCatalogForm({ entity: "activity" })}><Plus className="mr-2 h-4 w-4"/>Thêm công việc</Button></div></div><h3 className="mt-6 font-bold">Công việc áp dụng</h3><div className="mt-3 divide-y rounded-2xl border">{selectedStage.activities.map(activity => <div key={activity.id} className={`flex items-center gap-3 p-3 ${activity.isActive ? "" : "bg-slate-50 text-slate-400"}`}><span className={`h-2.5 w-2.5 rounded-full ${activity.isActive ? "bg-emerald-500" : "bg-slate-300"}`}/><span className="flex-1 font-semibold">{activity.name}</span><Button size="sm" variant="ghost" onClick={() => setCatalogForm({ entity: "activity", item: activity })}><Edit3 className="h-4 w-4"/></Button><Button size="sm" variant="ghost" onClick={() => void patchCatalog("activity", activity.id, { isActive: !activity.isActive })}>{activity.isActive ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</Button></div>)}</div></> : <p className="text-slate-500">Chưa có giai đoạn.</p>}</div>
        </section>}
        {varietyForm && <Modal title={varietyForm === "new" ? "Thêm giống sầu riêng" : "Sửa giống sầu riêng"} close={() => setVarietyForm(null)}><form onSubmit={saveVariety} className="space-y-4"><div><Label>Tên giống *</Label><Input name="name" required defaultValue={varietyForm === "new" ? "" : varietyForm.name}/></div><div><Label>Tên khác</Label><Input name="alternativeName" defaultValue={varietyForm === "new" ? "" : varietyForm.alternativeName ?? ""} placeholder="Ví dụ: Monthong"/></div><div><Label>Mô tả ngắn</Label><Textarea name="description" defaultValue={varietyForm === "new" ? "" : varietyForm.description ?? ""}/></div><Button className="w-full" disabled={busy}>{busy ? "Đang lưu..." : "Lưu giống"}</Button></form></Modal>}
        {catalogForm && <Modal title={`${catalogForm.item ? "Sửa" : "Thêm"} ${catalogForm.entity === "stage" ? "giai đoạn" : "công việc"}`} close={() => setCatalogForm(null)}><form onSubmit={saveCatalog} className="space-y-4"><div><Label>Tên *</Label><Input name="name" required autoFocus defaultValue={catalogForm.item?.name ?? ""}/></div><Button className="w-full" disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</Button></form></Modal>}
    </main>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
    return <div className="fixed inset-0 z-[150] grid h-[100dvh] w-screen place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">{title}</h2><button type="button" onClick={close} className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>{children}</section></div>;
}
