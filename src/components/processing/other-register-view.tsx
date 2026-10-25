'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { ProcessingGmpRegisterTable } from './processing-gmp-register-table';
import { downloadFile } from '@/lib/processing-gmp-export';
import { monitoringWorkbook } from '@/lib/other-monitoring-export';
import { actualOtherRegisterRows, filterOtherRegisterRows, OTHER_REGISTERS, OtherRegisterColumn, OtherRegisterKey, OtherRegisterState, otherRegisterDate, otherRegisterExport, otherRegisterValue } from '@/lib/other-registers';
import { otherMaterialSources, OtherRegisterRow } from '@/lib/other-register-data';
import { OtherRegisterForm } from './other-register-form';
import type { OtherRegisterInput } from '@/lib/other-register-write';

const control = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50';
const primary = `${button} !border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700`;

export function OtherRegisterView({ book, initialState, initialRevision = 0 }: { book: OtherRegisterKey; initialState?: OtherRegisterState; initialRevision?: number }) {
 const [state, setState] = useState<OtherRegisterState | null>(initialState || null);
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(!initialState);
 const [exporting, setExporting] = useState(false);
 const [filter, setFilter] = useState({ month: '', from: '', to: '', query: '' });
 const [revision, setRevision] = useState(initialRevision);
 const [editing, setEditing] = useState<OtherRegisterRow | 'new' | null>(null);
 const [saving, setSaving] = useState(false);
 const [notice, setNotice] = useState('');
 const [materialCode, setMaterialCode] = useState('');
 const config = OTHER_REGISTERS[book];
 const load = useCallback(async (signal?: AbortSignal) => {
  setLoading(true); setError('');
  try {
   const response = await fetch('/api/processing/other-registers', { cache: 'no-store', signal });
   if (!response.ok) throw Error('Không thể tải sổ. Vui lòng thử lại.');
   const body = await response.json();
   setState(body.state);
   setRevision(body.revision);
  } catch (e) {
   if (!signal?.aborted) { setState(null); setError(e instanceof Error ? e.message : 'Không thể tải sổ.'); }
  } finally { if (!signal?.aborted) setLoading(false); }
 }, []);
 useEffect(() => {
  if (initialState) return;
  const controller = new AbortController(); void load(controller.signal); return () => controller.abort();
 }, [load, initialState]);
 const sources = useMemo(() => state ? otherMaterialSources(state) : [], [state]);
 const actualRows = useMemo(() => state ? actualOtherRegisterRows(state, book) : [], [state, book]);
 const allRows = actualRows;
 const rows = useMemo(() => filterOtherRegisterRows(allRows, book, filter).filter(r => !materialCode || r.lotCode.split(' / ').includes(materialCode)), [allRows, book, filter, materialCode]);
 const months = useMemo(() => [...new Set(allRows.map(r => otherRegisterDate(r, book).slice(0, 7)).filter(Boolean))].sort().reverse(), [allRows, book]);

 async function exportFile() {
  if (!rows.length) return;
  setExporting(true); setError('');
  try {
   const output = otherRegisterExport(book, rows, false);
   const workbook = monitoringWorkbook(output.title, output.code, output.columns, output.rows);
   const bytes = await workbook.xlsx.writeBuffer();
   downloadFile(bytes as BlobPart, `${output.filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } catch { setError('Không thể xuất file. Vui lòng thử lại.'); }
  finally { setExporting(false); }
 }

 async function save(input: OtherRegisterInput) {
  setSaving(true); setError(''); setNotice('');
  try {
   const response = await fetch('/api/processing/other-registers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, record: input }) });
   const body = await response.json();
   if (!response.ok) throw Error(body.error || 'Không thể lưu bản ghi.');
   setState(body.state); setRevision(body.revision); setEditing(null);
   setNotice(input.confirmed ? 'Đã lưu bản ghi vào cơ sở dữ liệu.' : 'Đã lưu bản nháp vào cơ sở dữ liệu.');
  } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu bản ghi.'); }
  finally { setSaving(false); }
 }

 return <section className="min-w-0 space-y-6" aria-label={config.title}>
  <div className="flex flex-wrap justify-end gap-2">
   <button type="button" className={button} disabled={loading || exporting || !rows.length} onClick={() => void exportFile()}>{exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}Xuất file</button>
   <button type="button" className={primary} disabled={loading || saving || !state || !sources.length} onClick={() => { setError(''); setNotice(''); setEditing('new'); }}><Plus size={16} />Thêm bản ghi</button>
  </div>
  <section aria-label="Nguồn dữ liệu sổ" className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
   <p className="text-sm font-bold">Bản ghi được lưu trong cơ sở dữ liệu</p>
   <p className="text-sm text-slate-600">Mã lô NL và lượng nguyên liệu được kế thừa từ Sổ Nhập hàng. Lô chưa sơ chế được hiển thị ở trạng thái chờ ghi nhận. <Link href="/dashboard/processing/grading" className="font-semibold text-emerald-700 underline">Xem Sổ Nhập hàng</Link></p>
   {!loading && !sources.length && <p className="text-sm text-amber-800">Chưa có mã CB hợp lệ. Cần xác nhận phân loại và gán mã CB tại Sổ Nhập hàng trước.</p>}
  </section>
  {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => void load()}>Tải lại</button></div>}
  {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
  <section aria-label="Bộ lọc sổ" className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
   <label className="text-xs font-semibold text-slate-600">Tháng<select className={`${control} mt-1`} value={filter.month} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))}><option value="">Tất cả các tháng</option>{months.map(month => <option key={month} value={month}>{month.slice(5)}/{month.slice(0, 4)}</option>)}</select></label>
   <label className="text-xs font-semibold text-slate-600">Từ ngày<input type="date" className={`${control} mt-1`} value={filter.from} onChange={e => setFilter(f => ({ ...f, month: '', from: e.target.value }))} /></label>
   <label className="text-xs font-semibold text-slate-600">Đến ngày<input type="date" className={`${control} mt-1`} value={filter.to} onChange={e => setFilter(f => ({ ...f, month: '', to: e.target.value }))} /></label>
   <label className="text-xs font-semibold text-slate-600">Tìm kiếm<div className="relative mt-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className={`${control} pl-9`} placeholder="Mã lô hoặc thông tin liên quan…" value={filter.query} onChange={e => setFilter(f => ({ ...f, query: e.target.value }))} /></div></label>
  </section>
  <label className="block max-w-lg text-xs font-semibold text-slate-600">Mã lô NL từ Sổ Nhập hàng<select className={`${control} mt-1`} value={materialCode} onChange={e => setMaterialCode(e.target.value)}><option value="">Tất cả mã lô CB</option>{sources.map(source => <option key={source.code} value={source.code}>{source.code}</option>)}</select></label>
  <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-busy={loading}>
   <div className="flex items-center justify-between border-b px-5 py-3 text-sm text-slate-500"><span role="status">{loading ? 'Đang tải dữ liệu…' : `${rows.length} bản ghi`}</span><button type="button" className={button} aria-label="Tải lại dữ liệu" disabled={loading} onClick={() => void load()}><RefreshCw size={16} /></button></div>
   <ProcessingGmpRegisterTable stage="preprocessing" rows={loading ? [] : rows} onEdit={record => { setError(''); setNotice(''); setEditing(record); }} presentation={{ ...config, emptyMessage: loading ? 'Đang tải dữ liệu…' : error ? 'Chưa tải được dữ liệu.' : 'Chưa có bản ghi phù hợp. Điều chỉnh bộ lọc hoặc thêm bản ghi.', renderValue: (field, record, index) => {
    const value = otherRegisterValue(field as OtherRegisterColumn, record, index);
    const row = record as OtherRegisterRow;
    if (field.key === 'lotCode') return <div className="space-y-1"><Link href="/dashboard/processing/grading" className="break-all font-mono font-bold text-emerald-700 hover:underline" title="Đối chiếu mã CB tại Sổ Nhập hàng">{value}</Link>{record.values.dataOrigin === 'IMPORTED_PREVIEW' && <span className="block text-xs text-slate-500" title="Được lưu theo yêu cầu từ bộ dữ liệu minh họa trước đây; nguồn được giữ trong lịch sử">Bản ghi khởi tạo</span>}{row.sourceOnly && <span className="block text-xs text-slate-500">Đã tiếp nhận · Chưa ghi nhận sơ chế</span>}</div>;
    if (field.key === 'product') return <div className="space-y-1"><span>{value}</span><span className="block break-all font-mono text-xs text-emerald-700">Mã lô NL: {record.lotCode}</span>{row.sample && <span className="block text-xs font-semibold text-amber-800">Dữ liệu mẫu</span>}</div>;
    if (value === 'Đ' || value === 'K') return <span title={value === 'Đ' ? 'Đạt' : 'Không đạt'} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 font-bold ${value === 'Đ' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{value}</span>;
    return <span className={field.key === 'lotCode' ? 'font-mono font-bold text-emerald-700' : value === '—' ? 'text-slate-400' : ''}>{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</span>;
   } }} />
  </div>
  {editing && <OtherRegisterForm key={editing === 'new' ? 'new' : editing.id} book={book} sources={sources} record={editing === 'new' ? undefined : editing} selectedCode={materialCode} busy={saving} error={error} onClose={() => { if (!saving) setEditing(null); }} onReload={() => void load()} onSave={save} />}
 </section>;
}
