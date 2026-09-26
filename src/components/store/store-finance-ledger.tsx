"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, TrendingDown, TrendingUp, X } from "lucide-react";
import { formatVietnameseDate } from "@/lib/date-format";

type Income = { id: string; code: string; date: string; customer: string; total: number; paid: number; remaining: number; method: string };
type Expense = { id: string; date: string; category: string; title: string; reference: string; amount: number; method: string };
type Ledger = { income: Income[]; expenses: Expense[]; references: { id: string; code: string }[] };
const categories: Record<string, string> = { IMPORT_GOODS: "Nhập vật tư", SHIPPING: "Vận chuyển", LABOR: "Nhân công", WAREHOUSE: "Thuê mặt bằng / Kho bãi", UTILITIES: "Điện / Nước / Mạng", PACKAGING: "Đóng gói / Bao bì", DELIVERY: "Giao hàng", MARKETING: "Quảng cáo", MAINTENANCE: "Bảo trì / Sửa chữa", OTHER: "Chi phí khác" };
const methods: Record<string, string> = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", COD: "COD" };
const money = (value: number) => value.toLocaleString("vi-VN");
const control = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";
const cell = "border border-slate-200 px-4 py-3 text-center";
const action = "rounded-xl border border-brand-200 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-40";
const day = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
const initialExpense = () => ({ expenseDate: day(new Date()), category: "IMPORT_GOODS", title: "", amount: "", referenceId: "", paymentMethod: "CASH" });

export function StoreFinanceLedger() {
    const [tab, setTab] = useState<"IN" | "OUT">("IN");
    const [data, setData] = useState<Ledger>({ income: [], expenses: [], references: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState(false);
    const [selected, setSelected] = useState<Income | null>(null);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const sequence = useRef(0);
    const [expense, setExpense] = useState(initialExpense);
    const load = useCallback(async () => {
        const request = ++sequence.current;
        setLoading(true);
        try {
            const response = await fetch("/api/store/finance/ledger", { cache: "no-store" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể tải tài chính.");
            if (request === sequence.current) setData(result);
        } catch (e) { if (request === sequence.current) setError(e instanceof Error ? e.message : "Không thể tải dữ liệu."); }
        finally { if (request === sequence.current) setLoading(false); }
    }, []);
    useEffect(() => {
        void load();
        const refresh = () => { void load(); };
        const timer = setInterval(refresh, 30000);
        window.addEventListener("focus", refresh);
        return () => { clearInterval(timer); window.removeEventListener("focus", refresh); sequence.current++; };
    }, [load]);
    useEffect(() => { setPage(1); }, [tab, from, to, query]);
    async function mutate(url: string, method: string, body?: unknown) {
        setBusy(true); setError("");
        try {
            const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể lưu dữ liệu.");
            setModal(false); setSelected(null); await load(); return true;
        } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu dữ liệu."); return false; }
        finally { setBusy(false); }
    }
    const matches = (date: string, text: string) => (!from || day(new Date(date)) >= from) && (!to || day(new Date(date)) <= to) && text.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"));
    const income = data.income.filter(r => matches(r.date, `${r.code} ${r.customer} COD`));
    const expenses = data.expenses.filter(r => matches(r.date, `${r.title} ${categories[r.category]} ${r.reference} Tiền mặt`));
    const count = tab === "IN" ? income.length : expenses.length;
    const pages = Math.max(1, Math.ceil(count / 15));
    const current = Math.min(page, pages), offset = (current - 1) * 15;
    const headers = tab === "IN" ? ["Ngày", "Mã đơn hàng", "Khách hàng", "Giá trị đơn hàng (đ)", "Đã thu (đ)", "Còn phải thu (đ)", "Phương thức", "Thao tác"] : ["Ngày", "Nhóm chi phí", "Nội dung", "Đơn hàng/Phiếu liên quan", "Số tiền (đ)", "Phương thức", "Thao tác"];
    return <main className="mx-auto w-full max-w-[1650px] space-y-6 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-4"><h1 className="text-3xl font-bold">TÀI CHÍNH</h1><button type="button" onClick={() => { setError(""); void load(); }} disabled={loading} className={action}><RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} />Tải lại</button></header>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        <nav aria-label="Tài chính" className="grid grid-cols-2 gap-2 rounded-3xl border bg-white p-2 shadow-sm">{([["IN", "THU", TrendingUp], ["OUT", "CHI", TrendingDown]] as const).map(([key, label, Icon]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold ${tab === key ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-brand-50"}`}><Icon className="h-5 w-5" />{label}</button>)}</nav>
        <div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm">Tìm kiếm<input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "IN" ? "Mã đơn hàng, khách hàng…" : "Nhóm chi phí, nội dung, mã phiếu…"} className={control} /></label>
            <label className="space-y-1 text-sm">Từ ngày<input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} className={control} /></label>
            <label className="space-y-1 text-sm">Đến ngày<input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className={control} /></label>
        </div>
        {tab === "OUT" && <div className="flex justify-end"><button type="button" onClick={() => { setError(""); setModal(true); }} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white"><Plus className="h-4 w-4" />Ghi nhận chi phí</button></div>}
        <section className="overflow-hidden rounded-2xl border bg-white" aria-busy={loading}><div className="overflow-x-auto"><table className="w-full min-w-[1100px] border-collapse text-sm"><thead className="bg-slate-50"><tr>{headers.map(h => <th key={h} className={`${cell} whitespace-nowrap font-semibold`}>{h}</th>)}</tr></thead><tbody>
            {tab === "IN" ? income.slice(offset, offset + 15).map(r => <tr key={r.id} className="hover:bg-slate-50"><td className={`${cell} whitespace-nowrap`}>{formatVietnameseDate(r.date)}</td><td className={`${cell} whitespace-nowrap font-semibold text-brand-700`}>{r.code}</td><td className={cell}>{r.customer}</td><td className={cell}>{money(r.total)}</td><td className={`${cell} text-emerald-700`}>{money(r.paid)}</td><td className={cell}>{money(r.remaining)}</td><td className={cell}>COD</td><td className={cell}><button type="button" disabled={busy || r.remaining <= 0} onClick={() => { setError(""); setSelected(r); }} className={`${action} whitespace-nowrap`}>{r.remaining > 0 ? "Thu tiền" : "Đã thu đủ"}</button></td></tr>) : expenses.slice(offset, offset + 15).map(r => <tr key={r.id} className="hover:bg-slate-50"><td className={`${cell} whitespace-nowrap`}>{formatVietnameseDate(r.date)}</td><td className={cell}>{categories[r.category] || r.category}</td><td className={`${cell} text-left`}>{r.title}</td><td className={cell}>{r.reference || "—"}</td><td className={cell}>{money(r.amount)}</td><td className={cell}>Tiền mặt</td><td className={cell}><button type="button" disabled={busy} className="text-red-600 disabled:opacity-40" onClick={() => { if (confirm("Xóa khoản chi phí này?")) void mutate(`/api/store/finance/expenses?id=${r.id}`, "DELETE"); }}>Xóa</button></td></tr>)}
            {!count && <tr><td colSpan={headers.length} className="p-10 text-center text-slate-500">{loading ? "Đang tải dữ liệu…" : "Chưa có dữ liệu theo bộ lọc."}</td></tr>}
        </tbody></table></div><footer className="flex items-center justify-between gap-3 p-4 text-sm"><span>{count} bản ghi · Trang {current}/{pages}</span><div className="flex gap-2"><button className={action} disabled={current <= 1} onClick={() => setPage(current - 1)}>Trước</button><button className={action} disabled={current >= pages} onClick={() => setPage(current + 1)}>Sau</button></div></footer></section>
        {(modal || selected) && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="finance-dialog-title" className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <header className="flex items-center justify-between"><h2 id="finance-dialog-title" className="text-xl font-bold">{selected ? "Xác nhận thu tiền" : "Ghi nhận chi phí"}</h2><button type="button" aria-label="Đóng" disabled={busy} onClick={() => { setModal(false); setSelected(null); }}><X className="h-5 w-5" /></button></header>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {selected ? <><p>Thu đủ số tiền còn lại của đơn <strong>{selected.code}</strong>: <strong>{money(selected.remaining)} đ</strong>.</p><button disabled={busy} className={action} onClick={() => void mutate(`/api/store/finance/orders/${selected.id}/payment`, "PATCH", { paymentStatus: "PAID" })}>{busy ? "Đang lưu…" : "Xác nhận thu tiền"}</button></> : <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (busy) return; if (await mutate("/api/store/finance/expenses", "POST", { ...expense, amount: Number(expense.amount), status: "PAID" })) setExpense(initialExpense()); }}>
                <label className="block space-y-1 text-sm">Ngày<input required type="date" value={expense.expenseDate} onChange={e => setExpense({ ...expense, expenseDate: e.target.value })} className={control} /></label>
                <label className="block space-y-1 text-sm">Nhóm chi phí<select value={expense.category} onChange={e => setExpense({ ...expense, category: e.target.value })} className={control}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                <label className="block space-y-1 text-sm">Nội dung<input required minLength={2} maxLength={200} value={expense.title} onChange={e => setExpense({ ...expense, title: e.target.value })} className={control} /></label>
                <label className="block space-y-1 text-sm">Đơn hàng/Phiếu liên quan<select value={expense.referenceId} onChange={e => setExpense({ ...expense, referenceId: e.target.value })} className={control}><option value="">Không liên kết</option>{data.references.map(r => <option key={r.id} value={r.id}>{r.code}</option>)}</select></label>
                <label className="block space-y-1 text-sm">Số tiền (đ)<input required type="number" min="0.01" step="0.01" max="999999999999.99" value={expense.amount} onChange={e => setExpense({ ...expense, amount: e.target.value })} className={control} /></label>
                <label className="block space-y-1 text-sm">Phương thức<select value={expense.paymentMethod} onChange={e => setExpense({ ...expense, paymentMethod: e.target.value })} className={control}>{Object.entries(methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                <button disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white disabled:opacity-40">{busy ? "Đang lưu…" : "Lưu khoản chi"}</button>
            </form>}
        </section></div>}
    </main>;
}
