'use client';
import {productionOrigins} from '@/lib/production-lots';

import QRCode from 'qrcode';
import { useCallback, useEffect, useState, FormEvent } from 'react';
import { FIELDS, TECHNICAL, METHODS, OtherBook, OtherRecord, OtherState, eligibleSources, inventory, contributions } from '@/lib/other-processing';
import { Values } from '@/lib/processing-gmp';
import { otherBooks } from '@/lib/processing-navigation';
const control = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';
export function OtherProcessingView({ book }: {
    book: string;
}) {
    const stage = book as OtherBook;
    const [data, setData] = useState<{
        state: OtherState;
        revision: number;
    } | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [query, setQuery] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [month, setMonth] = useState(''), [editing, setEditing] = useState<Partial<OtherRecord> | null>(null), [detail, setDetail] = useState<OtherRecord | null>(null);
    const load = useCallback(async () => { try {
        const res = await fetch('/api/processing/gmp', { cache: 'no-store' });
        const body = await res.json();
        if (!res.ok)
            throw Error(body.error);
        setData(body);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể tải sổ.');
    } }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { setEditing(null); setDetail(null); }, [book]);
    const rows = (data?.state.otherProcessing || []).filter(r => r.book === stage && (!from || String(r.values.date) >= from) && (!to || String(r.values.date) <= to) && (!month || String(r.values.date).startsWith(month)) && JSON.stringify(r).toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
    const options = data ? eligibleSources(data.state, stage) : [];
    const values = editing?.values || {};
    const update = (key: string, value: string) => setEditing(prev => ({ ...prev, values: { ...prev?.values, [key]: value } }));
    async function save(event: FormEvent, confirmed: boolean) { event.preventDefault(); if (!editing || !data)
        return; setBusy(true); setError(''); try {
        const res = await fetch('/api/processing/gmp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'other', book: stage, revision: data.revision, record: { ...editing, confirmed } }) });
        const body = await res.json();
        if (!res.ok)
            throw Error(body.error);
        setData(body);
        setEditing(null);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể lưu.');
    }
    finally {
        setBusy(false);
    } }
    async function downloadQr(record: OtherRecord) { try {
        const image = await QRCode.toDataURL(window.location.origin + '/trace/processed/' + record.id, { width: 512, margin: 2 });
        const a = document.createElement('a');
        a.href = image;
        a.download = record.lotCode + '.png';
        a.click();
    }
    catch {
        setError('Không thể tạo mã QR.');
    } }
    function exportCsv() { const headers = ['Mã lô', 'Nguồn', 'Sản phẩm', 'Phương pháp', ...FIELDS[stage].map(f => f[1]), 'Trạng thái']; const quote = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""').replace(/^[=+@-]/, "'") + '"'; const csv = [headers, ...rows.map(r => [r.lotCode, r.sourceId, r.values.product, r.values.method, ...FIELDS[stage].map(f => r.values[f[0]]), r.confirmed ? 'Đã xác nhận' : 'Nháp'])].map(r => r.map(quote).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'che-bien-' + stage + '.csv'; a.click(); URL.revokeObjectURL(url); }
    return <section className="space-y-4"><div className="flex flex-wrap items-center justify-end gap-3"><div className="flex gap-2"><button className={control} onClick={() => load()}>Tải lại</button><button className={control} onClick={exportCsv}>Xuất CSV</button><button className={control + ' bg-emerald-50 text-emerald-700'} disabled={!data} onClick={() => { setEditing({ sourceId: '', values: { date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) } }); setError(''); }}>Thêm bản ghi</button></div></div>
 {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
 <div className="flex flex-wrap gap-3"><input aria-label="Tìm mã lô, sản phẩm" placeholder="Tìm mã lô, sản phẩm..." className={control} value={query} onChange={e => setQuery(e.target.value)}/><label>Tháng <input type="month" className={control} value={month} onChange={e => setMonth(e.target.value)}/></label><label>Từ <input type="date" className={control} value={from} onChange={e => setFrom(e.target.value)}/></label><label>Đến <input type="date" className={control} value={to} onChange={e => setTo(e.target.value)}/></label></div>
 <div className="max-h-[70vh] overflow-auto rounded-2xl border bg-white"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr>{['Mã lô', 'Mã lô nguồn', 'Mã thu hoạch', 'Mã vùng trồng', 'Vùng trồng', 'Chủng loại', 'Sản phẩm', 'Phương pháp', 'Đầu vào (kg)', ...FIELDS[stage].map(f => f[1]), ...(stage === 'processing' ? ['Thu hồi (%)'] : []), ...(stage === 'packaging' ? ['Tồn kho', 'Khả dụng đạt kiểm tra'] : []), 'Trạng thái', 'Thao tác'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t"><td className="px-4 py-3 font-semibold">{r.lotCode}</td>{['sourceLot', 'harvestCode', 'puc', 'origin', 'variety', 'product', 'method', 'input', ...FIELDS[stage].map(f => f[0]), ...(stage === 'processing' ? ['recovery'] : [])].map((k, i) => <td key={k + i} className="px-4 py-3">{r.values[k] ?? 'Đ'}</td>)}{stage === 'packaging' && data && <><td className="px-4 py-3">{inventory(data.state, r.id).stock}</td><td className="px-4 py-3">{inventory(data.state, r.id).available}</td></>}<td className="px-4 py-3">{r.confirmed ? (FIELDS[stage].some(([k, , t]) => t === 'check' && r.values[k] === 'K') ? 'Không đạt · Giữ lại' : 'Đã xác nhận') : 'Nháp'}</td><td className="space-x-3 px-4 py-3"><button onClick={() => setDetail(r)}>Chi tiết</button>{stage === 'sales' && r.confirmed && <button onClick={() => downloadQr(r)}>Mã QR</button>}{!r.confirmed && <button onClick={() => setEditing(r)}>Sửa / Xác nhận</button>}</td></tr>)}{!rows.length && <tr><td colSpan={40} className="p-8 text-center text-slate-500">{data ? 'Chưa có bản ghi phù hợp.' : '?ang tải dữ liệu...'}</td></tr>}</tbody></table></div>
 {editing && <div role="dialog" aria-modal="true" aria-label="Ghi nhận nghiệp vụ" className="fixed inset-0 z-[90] overflow-auto bg-black/40 p-4"><form onSubmit={e => save(e, true)} className="mx-auto my-8 max-w-3xl space-y-4 rounded-2xl bg-white p-6"><h3 className="text-xl font-bold">Ghi nhận {otherBooks.find(b => b.key === book)?.label}</h3><label className="block">Lô nguồn hợp lệ<select required className={control + ' block w-full'} value={editing.sourceId || ''} onChange={e => setEditing({ ...editing, sourceId: e.target.value })}><option value="">Chọn lô nguồn</option>{options.map(o => <option key={o.id} value={o.id}>{o.lotCode} ? {o.values.input} kg</option>)}</select></label>{!options.length && <p className="text-amber-700">Chưa có nguồn đạt điều kiện. Hoàn tất xác nhận ở sổ trước.</p>}
 {stage === 'processing' && <fieldset className="space-y-2 rounded-xl border p-3"><legend>Khối lượng đóng góp từng lô nguồn (kg)</legend>{options.map(o => <label key={o.id} className="flex items-center justify-between gap-3">{o.lotCode}<input type="number" min="0" step="any" className={control} value={editing.inputs?.find(i => i.sourceId === o.id)?.weight ?? ''} onChange={e => { const weight = Number(e.target.value); const inputs = [...(editing.inputs || []).filter(i => i.sourceId !== o.id), ...(weight > 0 ? [{ sourceId: o.id, weight }] : [])]; setEditing({ ...editing, inputs, sourceId: inputs[0]?.sourceId || editing.sourceId }); }}/></label>)}</fieldset>}
 {stage === 'processing' && <label className="block">Phương pháp<select required className={control + ' block w-full'} value={values.method || ''} onChange={e => update('method', e.target.value)}><option value="">Chọn phương pháp</option>{METHODS.map(m => <option key={m}>{m}</option>)}</select></label>}
 <div className="grid gap-4 sm:grid-cols-2">{[...FIELDS[stage], ...(stage === 'processing' ? TECHNICAL[String(values.method)] || [] : [])].map(([key, label, type]) => <label key={key} className="block text-sm">{label}{type === 'check' ? <select className={control + ' block w-full'} value={values[key] ?? ''} onChange={e => update(key, e.target.value)}><option value="">Chọn kết quả</option><option>Đ</option><option>K</option></select> : <input className={control + ' block w-full'} type={type === 'text' ? 'text' : type} step={type === 'number' ? 'any' : undefined} value={values[key] ?? ''} onChange={e => update(key, e.target.value)}/>}</label>)}</div>{error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex flex-wrap gap-3"><button disabled={busy} className={control} type="button" onClick={e => save(e, false)}>Lưu nháp</button><button disabled={busy} className={control + ' text-emerald-700'}>Xác nhận nghiệp vụ</button><button disabled={busy} type="button" className={control} onClick={() => setEditing(null)}>Đóng</button></div></form></div>}
 {detail && <div role="dialog" aria-modal="true" aria-label="Chi tiết lô" className="fixed inset-0 z-[90] overflow-auto bg-black/40 p-4"><section className="mx-auto my-8 max-w-3xl space-y-3 rounded-2xl bg-white p-6"><h3 className="text-xl font-bold">{detail.lotCode}</h3><p>Nguồn: {detail.values.sourceLot} ? Thu hoạch: {detail.values.harvestCode} ? Vùng trồng: {detail.values.puc}</p>{Object.entries(detail.values).filter(([key]) => key !== 'contributions' && key !== 'productionOrigins' && key !== 'productionLotId').map(([key, val]) => <p className="break-words" key={key}><strong>{[...FIELDS[stage], ...Object.values(TECHNICAL).flat()].find(f => f[0] === key)?.[1] || ({ recovery: 'Tỷ lệ thu hồi (%)', product: 'Sản phẩm', method: 'Phương pháp', input: 'Đầu vào (kg)', total: 'Thành tiền', totalWeight: 'Tổng khối lượng tịnh (kg)', sourceLot: 'Mã lô nguồn', harvestRecordId: 'Mã định danh thu hoạch', harvestCode: 'Mã hồ sơ thu hoạch', puc: 'Mã vùng trồng', origin: 'Tên vùng trồng', variety: 'Chủng loại', packaging: 'Quy cách', unit: 'Đơn vị tính', net: 'Khối lượng tịnh/đơn vị (kg)' } as Record<string, string>)[key] || key}: </strong>{val}</p>)}{contributions(detail).length > 0 && <section><h4 className="font-bold">Đóng góp nguyên liệu theo lô</h4>{contributions(detail).map(c => <p key={c.sourceId}>{c.lotCode} · {c.weight} kg · {c.harvestCode} · {c.puc} · {c.origin}</p>)}</section>}{productionOrigins(detail.values).length>0&&<section><h4 className="font-bold">Nguồn nhập của lô CB</h4>{productionOrigins(detail.values).map(a=><p key={a.id}>{a.harvestCode} · {a.puc} · {a.weight.toLocaleString('vi-VN')} kg · Ngày nhập {a.receivedAt}</p>)}</section>}<h4 className="font-bold">Lịch sử cập nhật</h4>{detail.history.map((h, i) => <p key={i}>{h.actor} ? {new Date(h.at).toLocaleString('vi-VN')}</p>)}<button className={control} onClick={() => setDetail(null)}>Đóng</button></section></div>}
 </section>;
}
