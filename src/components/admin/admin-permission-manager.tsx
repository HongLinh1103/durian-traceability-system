"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Loader2, RotateCcw, Save, Search, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AccountPermission } from "@/lib/account-permissions";

type Account = { id: string; fullName: string; phone: string; email?: string | null; role: string; roleLabel: string; accountStatus: string; availablePermissions: AccountPermission[]; permissions: string[]; isDefault: boolean };

async function readJsonResponse(response: Response) {
    const text = await response.text();
    if (!text.trim()) throw new Error(`Máy chủ không trả về dữ liệu (HTTP ${response.status}).`);
    try { return JSON.parse(text); }
    catch { throw new Error(`Phản hồi từ máy chủ không hợp lệ (HTTP ${response.status}).`); }
}

export function AdminPermissionManager() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [permissions, setPermissions] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    async function load(preferredId = selectedId) {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/permissions", { cache: "no-store" });
            const json = await readJsonResponse(response);
            if (!response.ok || !json.success) throw new Error(json.message || "Không thể tải danh sách tài khoản.");
            setAccounts(json.data);
            const account = preferredId ? json.data.find((item: Account) => item.id === preferredId) : null;
            if (account) setPermissions(account.permissions);
        } catch (error) { setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra."); }
        finally { setLoading(false); }
    }

    useEffect(() => { void load(""); }, []);
    const selected = useMemo(() => accounts.find((item) => item.id === selectedId), [accounts, selectedId]);
    const visiblePermissions = useMemo(() => selected?.availablePermissions.filter((item) => !query.trim() || `${item.label} ${item.path}`.toLowerCase().includes(query.trim().toLowerCase())) || [], [selected, query]);
    const allSelected = !!selected && selected.availablePermissions.length > 0 && selected.availablePermissions.every((item) => permissions.includes(item.key));

    function chooseAccount(id: string) { setSelectedId(id); setQuery(""); setMessage(""); setPermissions(accounts.find((item) => item.id === id)?.permissions || []); }
    function toggle(key: string) { setPermissions((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); }
    function toggleAll() { if (selected) setPermissions(allSelected ? [] : selected.availablePermissions.map((item) => item.key)); }

    async function mutate(method: "PUT" | "DELETE") {
        if (!selected) return;
        setSaving(true); setMessage("");
        try {
            const url = method === "DELETE" ? `/api/admin/permissions?userId=${encodeURIComponent(selected.id)}` : "/api/admin/permissions";
            const response = await fetch(url, method === "PUT" ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.id, permissions }) } : { method });
            const json = await readJsonResponse(response);
            if (!response.ok || !json.success) throw new Error(json.message || "Không thể cập nhật quyền.");
            setMessage(json.message); await load(selected.id);
        } catch (error) { setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra."); }
        finally { setSaving(false); }
    }

    return <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center gap-3"><button type="button" onClick={() => router.back()} className="rounded-xl p-2 text-slate-600 hover:bg-white" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></button><div><h1 className="text-2xl font-black text-slate-900">Chỉnh sửa quyền tài khoản</h1><p className="text-sm text-slate-500">Chọn một tài khoản, sau đó bật hoặc tắt các chức năng phù hợp với vai trò.</p></div></header>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <label htmlFor="permission-account" className="mb-2 block text-sm font-bold text-slate-700">Tên tài khoản</label>
            <div className="relative"><select id="permission-account" value={selectedId} onChange={(event) => chooseAccount(event.target.value)} disabled={loading} className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="">{loading ? "Đang tải tài khoản..." : "Chọn tài khoản"}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.fullName} · {account.phone} · {account.roleLabel}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /></div>
        </section>
        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}
        {loading && <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>}
        {!loading && !selected && <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500"><ShieldCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />Vui lòng chọn tài khoản để phân quyền chức năng.</div>}
        {selected && <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b bg-emerald-800 p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">{selected.fullName}</h2><p className="text-sm text-emerald-100">{selected.roleLabel} · {selected.phone} · {permissions.length}/{selected.availablePermissions.length} chức năng</p></div><label className="flex cursor-pointer items-center gap-2 font-bold"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-5 w-5 accent-emerald-500" /> Chọn tất cả</label></div>
            <div className="border-b p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chức năng..." className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-emerald-500" /></div></div>
            <div className="divide-y divide-slate-100">{visiblePermissions.map((permission) => { const checked = permissions.includes(permission.key); return <label key={permission.key} className="flex cursor-pointer items-center gap-4 px-5 py-4 transition hover:bg-emerald-50/50"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>{checked && <Check className="h-4 w-4 stroke-[3]" />}</span><input type="checkbox" checked={checked} onChange={() => toggle(permission.key)} className="sr-only" /><span className="min-w-0"><span className="block font-bold text-slate-800">{permission.label}</span><span className="block truncate text-xs text-slate-400">{permission.path}</span></span></label>; })}{!visiblePermissions.length && <p className="p-8 text-center text-sm text-slate-500">Không tìm thấy chức năng phù hợp.</p>}</div>
            <div className="grid gap-3 border-t bg-slate-50 p-4 sm:grid-cols-2"><Button type="button" onClick={() => void mutate("PUT")} disabled={saving} className="h-12 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Cập nhật</Button><Button type="button" onClick={() => void mutate("DELETE")} disabled={saving} variant="outline" className="h-12 rounded-xl border-amber-300 bg-amber-50 font-bold text-amber-800 hover:bg-amber-100"><RotateCcw className="mr-2 h-4 w-4" />Reset về mặc định</Button></div>
        </section>}
    </div>;
}
