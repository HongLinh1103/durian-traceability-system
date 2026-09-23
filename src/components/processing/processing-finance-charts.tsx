'use client';

import { useMemo } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { summarizeFinanceCharts } from '@/lib/processing-finance-charts';

const colors = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#e11d48', '#0891b2', '#65a30d', '#475569'];
const money = (value: number) => value.toLocaleString('vi-VN') + ' đ';
const billionDong = (value: number) => value === 0 ? '0' : (value / 1_000_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const monthLabel = (value: string) => /^\d{4}-\d{2}$/.test(value) ? value.slice(5) + '/' + value.slice(0, 4) : value;

export function ProcessingFinanceCharts({ expenses, cashFlow }: {
    expenses: Array<{ category?: string; amount: number }>;
    cashFlow: Array<{ date: string; direction: 'IN' | 'OUT'; amount: number }>;
}) {
    const data = useMemo(() => summarizeFinanceCharts(expenses, cashFlow), [expenses, cashFlow]);
    const moneyStep = 500_000_000;
    const maxCashFlow = data.cashFlow.reduce((max, row) => Math.max(max, row.inflow, row.outflow), 0);
    const axisMax = Math.max(moneyStep, Math.ceil(maxCashFlow / moneyStep) * moneyStep);
    const moneyTicks = Array.from({ length: axisMax / moneyStep + 1 }, (_, index) => index * moneyStep);
    return <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5" aria-label="Cơ cấu chi phí hoạt động">
            <h3 className="font-bold text-slate-900">Cơ cấu chi phí hoạt động</h3>
            <p className="mt-1 text-xs text-slate-500">Theo nhóm chi phí trong bộ lọc hiện tại.</p>
            <p className="mt-3 text-xl font-bold tabular-nums text-slate-900">{money(data.expenseTotal)}</p>
            {data.expenseTotal > 0 ? <>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={data.expenses.filter(item => item.value > 0)} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} isAnimationActive={false}>
                            {data.expenses.filter(item => item.value > 0).map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                        </Pie><Tooltip formatter={(value: number) => money(value) + ' (' + (value / data.expenseTotal * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%)'} /></PieChart>
                    </ResponsiveContainer>
                </div>
                <ul className="space-y-2 text-sm">{data.expenses.map((item, index) => <li key={item.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.name}</span><span className="tabular-nums text-slate-600">{money(item.value)} · {(item.value / data.expenseTotal * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</span></li>)}</ul>
            </> : <p className="flex h-64 items-center justify-center text-center text-sm text-slate-500">Chưa có chi phí hoạt động trong kỳ đã chọn.</p>}
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5" aria-label="Thu – Chi thực tế">
            <h3 className="font-bold text-slate-900">Thu – Chi thực tế</h3>
            <p className="mt-1 text-xs text-slate-500">Tổng hợp theo tháng từ các giao dịch trong tab Nhật ký dòng tiền, áp dụng cùng bộ lọc.</p>
            <div className="my-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-emerald-700">Tiền vào</p><p className="mt-1 break-words font-bold tabular-nums text-emerald-900">{money(data.totalIn)}</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-rose-700">Tiền ra</p><p className="mt-1 break-words font-bold tabular-nums text-rose-900">{money(data.totalOut)}</p></div></div>
            {data.cashFlow.length ? <><p className="mb-2 text-xs font-semibold text-slate-600">Đơn vị: Tỷ đồng · Mỗi vạch: 0,5 tỷ đồng</p><div className="max-h-[680px] overflow-auto"><div style={{ minWidth: Math.max(320, data.cashFlow.length * 85), height: Math.max(320, moneyTicks.length * 24 + 80) }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.cashFlow} margin={{ top: 12, right: 12, bottom: 10, left: 12 }} accessibilityLayer>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} interval={0} />
                        <YAxis domain={[0, axisMax]} ticks={moneyTicks} interval={0} tickFormatter={billionDong} width={80} tick={{ fontSize: 11 }} label={{ value: 'Tỷ đồng', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12, fill: '#475569' } }} />
                        <Tooltip labelFormatter={value => monthLabel(String(value))} formatter={(value: number) => money(value)} />
                        <Legend />
                        <Bar dataKey="inflow" name="Tiền vào" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                        <Bar dataKey="outflow" name="Tiền ra" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div></div></> : <p className="flex h-64 items-center justify-center text-center text-sm text-slate-500">Chưa có giao dịch thu – chi trong kỳ đã chọn.</p>}
        </section>
    </div>;
}
