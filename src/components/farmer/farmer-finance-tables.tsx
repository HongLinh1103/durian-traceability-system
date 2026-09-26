"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { FarmerFinanceLedger } from "@/lib/farmer-finance-ledger";

const money = (amount: number) => amount.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const date = (value: string) => {
    const d = new Date(value);
    return new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(d);
};
const categories: Record<string, string> = { FERTILIZER: "Phân bón", PESTICIDE: "Thuốc BVTV", EQUIPMENT: "Vật tư & Thiết bị", LABOR: "Nhân công", ELECTRICITY_WATER: "Điện / nước", MACHINERY: "Máy móc / Cơ giới", TRANSPORT: "Vận chuyển", HARVESTING: "Thu hoạch", TESTING: "Kiểm nghiệm", OTHER: "Chi phí khác" };
const cell = "border border-slate-200 px-4 py-3 text-center";

export function FarmerFinanceTables({
    ledger,
    tab,
    onCollected,
    initialCategory = "ALL",
}: {
    ledger: FarmerFinanceLedger;
    tab: "INCOME" | "EXPENSE";
    onCollected: () => Promise<void>;
    initialCategory?: string;
}) {
    const [page, setPage] = useState(1);
    const [category, setCategory] = useState(initialCategory);

    useEffect(() => {
        setCategory(initialCategory);
        setPage(1);
    }, [initialCategory]);
    const expenses = category === "ALL" ? ledger.expenses : ledger.expenses.filter(row => row.category === category);
    const [selected, setSelected] = useState<FarmerFinanceLedger["income"][number] | null>(null);
    const [amount, setAmount] = useState("");
    const [receivedAt, setReceivedAt] = useState("");
    const [requestId, setRequestId] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const count = tab === "INCOME" ? ledger.income.length : expenses.length;
    const pages = Math.max(1, Math.ceil(count / 15));
    const currentPage = Math.min(page, pages);
    const offset = (currentPage - 1) * 15;
    const incomeColumns = [
        { key: "code", label: "Mã lô TH", className: "min-w-[190px] text-center" },
        { key: "season", label: "Niên vụ", className: "min-w-[150px] text-center" },
        { key: "date", label: "Ngày thu hoạch", className: "min-w-[140px] text-center" },
        { key: "weight", label: "Khối lượng (kg)", className: "min-w-[170px] text-right" },
        { key: "buyer", label: "Người mua", className: "min-w-[260px] text-left" },
        { key: "address", label: "Địa chỉ", className: "min-w-[340px] text-left" },
        { key: "amount", label: "Giá trị (đ)", className: "min-w-[160px] text-right" },
        { key: "paid", label: "Đã thanh toán (đ)", className: "min-w-[170px] text-right" },
        { key: "remaining", label: "Còn lại (đ)", className: "min-w-[160px] text-right" },
        { key: "paidAt", label: "Ngày thanh toán", className: "min-w-[150px] text-center" },
        { key: "status", label: "Trạng thái thanh toán", className: "min-w-[190px] text-center" },
        { key: "action", label: "Thao tác", className: "min-w-[120px] text-center" },
    ] as const;
    const expenseColumns = [
        { key: "date", label: "Ngày", className: "min-w-[130px] text-center" },
        { key: "category", label: "Nhóm chi phí", className: "min-w-[160px] text-center" },
        { key: "content", label: "Nội dung", className: "min-w-[280px] text-left" },
        { key: "amount", label: "Giá trị (đ)", className: "min-w-[150px] text-right" },
    ] as const;
    const columns = tab === "INCOME" ? incomeColumns : expenseColumns;

    async function collect(event: React.FormEvent) {
        event.preventDefault();
        if (!selected || busy) return;
        setBusy(true); setError("");
        try {
            const response = await fetch("/api/farmer/harvest-receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ harvestId: selected.id, amount: Number(amount), receivedAt, requestId }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể ghi nhận thu tiền");
            await onCollected(); setSelected(null);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể ghi nhận thu tiền"); }
        finally { setBusy(false); }
    }
    return <>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {tab === "EXPENSE" && <div className="border-b border-slate-200 p-4"><label className="block max-w-sm text-sm font-semibold text-slate-700">Nhóm chi phí
                <select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">
                    <option value="ALL">Tất cả nhóm chi phí</option>
                    {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
            </label></div>}
            <div className="overflow-x-auto"><table className={`w-full border-collapse text-sm ${tab === "INCOME" ? "min-w-[2010px]" : "min-w-[750px]"}`}>
                <thead className="bg-slate-50">
                    <tr>
                        {columns.map(col => (
                            <th key={col.key} scope="col" className={`border border-slate-200 px-4 py-3 font-semibold align-middle whitespace-nowrap ${col.className}`}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{tab === "INCOME" ? ledger.income.slice(offset, offset + 15).map(row => <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap min-w-[190px]"><Link className="font-semibold text-brand-700 hover:underline" href={`/dashboard/farmer/harvests/${row.id}`}>{row.code}</Link></td>
                    <td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap min-w-[150px]">{row.season}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap min-w-[140px]">{date(row.date)}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right align-middle whitespace-nowrap min-w-[170px]">{money(row.weight)}</td>
                    <td className="border border-slate-200 px-4 py-3 text-left align-middle whitespace-nowrap min-w-[260px] font-normal text-slate-800">{row.buyer}</td>
                    <td className="border border-slate-200 px-4 py-3 text-left align-middle whitespace-nowrap min-w-[340px] text-slate-600">{row.address}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right align-middle whitespace-nowrap min-w-[160px] text-slate-900">{money(row.amount)}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right align-middle whitespace-nowrap min-w-[170px] text-emerald-700">{money(row.paid)}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right align-middle whitespace-nowrap min-w-[160px]">{money(Math.max(0, row.amount - row.paid))}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap min-w-[150px]">{row.paidAt ? <span className="font-normal text-slate-800">{date(row.paidAt)}</span> : <span className="text-slate-400">—</span>}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap min-w-[190px]"><span className={"inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-normal " + (row.amount > 0 && row.paid >= row.amount ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500")}>{row.amount > 0 && row.paid >= row.amount ? "Đã thu đủ" : "Chưa thu"}</span></td>
                    <td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap min-w-[120px]"><button type="button" disabled={!row.canCollect || row.amount <= row.paid} className="whitespace-nowrap rounded-lg border border-brand-200 px-3 py-2 font-normal text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => { setSelected(row); setAmount(String(Math.max(0, row.amount - row.paid))); setReceivedAt(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())); setRequestId(crypto.randomUUID()); setError(""); }}>Thu tiền</button></td>
                </tr>) : expenses.slice(offset, offset + 15).map(row => <tr key={row.id} className="hover:bg-slate-50/70 transition-colors"><td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap min-w-[130px]">{date(row.date)}</td><td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap min-w-[160px]">{categories[row.category] || row.category}</td><td className="border border-slate-200 px-4 py-3 text-left align-middle min-w-[280px]">{row.content}</td><td className="border border-slate-200 px-4 py-3 text-right align-middle whitespace-nowrap min-w-[150px] font-normal text-slate-900">{money(row.amount)}</td></tr>)}
                {!count && <tr><td colSpan={columns.length} className="p-12 text-center text-slate-500">Chưa có dữ liệu {tab === "INCOME" ? "thu hoạch" : "chi phí"} theo bộ lọc.</td></tr>}</tbody>
            </table></div>
            <footer className="flex items-center justify-between gap-3 p-4 text-sm"><span>{count} bản ghi · Trang {currentPage}/{pages}</span><div className="flex gap-3"><button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trước</button><button disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Sau</button></div></footer>
        </section>
        {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={collect} role="dialog" aria-modal="true" aria-labelledby="receive-money-title" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="receive-money-title" className="text-xl font-bold">Ghi nhận thu tiền</h2><p>{selected.code} · Còn phải thu: <strong>{money(selected.amount - selected.paid)} đ</strong></p>
            <label className="block space-y-1"><span>Số tiền (đ)</span><input autoFocus required type="number" min="0.01" step="0.01" max={selected.amount - selected.paid} value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-lg border p-3" /></label>
            <label className="block space-y-1"><span>Ngày thu tiền</span><input required type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className="w-full rounded-lg border p-3" /></label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3"><button disabled={busy} type="button" onClick={() => setSelected(null)} className="rounded-lg border px-4 py-2">Hủy</button><button disabled={busy} type="submit" className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Đang lưu…" : "Xác nhận thu tiền"}</button></div>
        </form></div>}
    </>;
}
