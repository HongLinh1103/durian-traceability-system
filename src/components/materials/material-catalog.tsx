"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImageIcon, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MaterialCardItem = {
    id: string;
    kind: "fertilizer" | "pesticide";
    name: string;
    type: string;
    manufacturer: string;
    composition: string;
    purpose: string;
    targets: string;
    imageUrl: string | null;
};

export function MaterialCatalog({ items }: { items: MaterialCardItem[] }) {
    const [search, setSearch] = useState("");
    const [kind, setKind] = useState("all");
    const normalized = search.trim().toLocaleLowerCase("vi");
    const filtered = useMemo(() => items.filter((item) => {
        if (kind !== "all" && item.kind !== kind) return false;
        return !normalized || [item.name, item.manufacturer, item.composition, item.purpose, item.targets]
            .join(" ").toLocaleLowerCase("vi").includes(normalized);
    }), [items, kind, normalized]);

    return <>
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" placeholder="Tên, nhà sản xuất, thành phần, công dụng, sâu bệnh..." /></label>
                <select value={kind} onChange={(event) => setKind(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"><option value="all">Tất cả vật tư</option><option value="fertilizer">Phân bón</option><option value="pesticide">Thuốc BVTV</option></select>
            </div>
        </section>
        <p className="text-sm text-slate-500">Tìm thấy {filtered.length} vật tư</p>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {filtered.map((item) => <article key={`${item.kind}-${item.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="aspect-square overflow-hidden bg-slate-100">{item.imageUrl ? <img src={item.imageUrl} alt={`Bao bì ${item.name}`} className="h-full w-full object-contain" loading="lazy" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-10 w-10 text-slate-300" /></div>}</div>
                <div className="flex flex-1 flex-col p-3"><Badge className={item.kind === "fertilizer" ? "w-fit bg-emerald-100 text-emerald-700" : "w-fit bg-amber-100 text-amber-700"}>{item.kind === "fertilizer" ? "Phân bón" : "Thuốc BVTV"}</Badge><h2 className="mt-2 line-clamp-2 min-h-10 text-sm font-bold text-slate-900">{item.name}</h2><p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{item.purpose || "Chưa cập nhật công dụng"}</p><p className="mt-2 truncate text-xs text-slate-600">{item.manufacturer || "Chưa rõ nhà sản xuất"}</p><Button asChild size="sm" variant="outline" className="mt-auto w-full"><Link href={`/materials/${item.kind}/${item.id}`}>Xem chi tiết</Link></Button></div>
            </article>)}
        </section>
        {filtered.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 py-16 text-center text-slate-500">Không tìm thấy vật tư phù hợp.</div>}
    </>;
}
