'use client';
import { ReceivingRecordForm } from './receiving-record-form';
import { candidates, lots, ProductionLot } from '@/lib/production-lots';
import {GmpState} from '@/lib/processing-gmp';
import { ReactNode, useState } from 'react';
import { GmpRecord, GMP_GRADES, Values, gradeTotal, formatProductionLotCode, formatCbLotCode, formatDgLotCode } from '@/lib/processing-gmp';
import { ModalPortal } from '@/components/ui/modal-portal';
import { GMP_GRADE_COLUMN_WIDTH } from './processing-gmp-column-widths';

const cell = 'border border-slate-200 px-3 py-2.5 align-middle';
const head = 'border border-slate-300 px-3 py-2.5 text-center align-middle text-sm font-semibold text-slate-700';
const fmt = (v: unknown) => v === '' || v === undefined ? '—' : Number(v).toLocaleString('vi-VN');

export function getReceivingRouteCodes(r: GmpRecord, route: 'DG' | 'CB', state?: GmpState): string[] {
    if (state) {
        const assigned = lots(state)
            .filter(l => l.route === route && l.allocations.some(a => a.active && a.receivingId === r.id))
            .map(l => l.code);
        if (assigned.length) return assigned;
    }
    const v = r.values;
    const confirmed = !r.draft && (v.classificationComplete === '1' || (!Boolean(v.harvestRecordId || v.sampleSourceId) && Boolean(v.date)));
    if (!confirmed) return [];
    if (route === 'DG') {
        if (gradeTotal(v, 'grade') <= 0) return [];
        if (v.dgLotCodes) {
            const raw = String(v.dgLotCodes).replace(/\bLH-/g, 'DG-');
            return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        }
        if (r.lotCode && /^(LH|CB)-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode)) {
            return [r.lotCode.replace(/^(LH|CB)-/, 'DG-')];
        }
        return [formatDgLotCode(v.date || r.lotCode)];
    }
    if (route === 'CB') {
        if (Number(v.otherProcessing || 0) <= 0) return [];
        if (v.cbLotCodes) {
            const raw = String(v.cbLotCodes).replace(/\bLH-/g, 'CB-');
            return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        }
        if (state) {
            const other = ((state as GmpState & { otherProcessing?: { sourceId: string; lotCode: string }[] }).otherProcessing || [])
                .find(x => x.sourceId === r.id);
            if (other?.lotCode) return [other.lotCode];
        }
        if (r.lotCode && /^(LH|DG)-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode)) {
            return [r.lotCode.replace(/^(LH|DG)-/, 'CB-')];
        }
        return [formatCbLotCode(v.date || r.lotCode)];
    }
    return [];
}

export function HarvestReceivingTable({ rows, state, onLot, onDetail, onEdit }: { state?:GmpState; onLot?:(lot:ProductionLot)=>void; rows: GmpRecord[]; onDetail: (r: GmpRecord) => void; onEdit: (r: GmpRecord) => void }) {
    const codeWidth = (route: 'DG'|'CB') => Math.max(160, ...rows.flatMap(r => {
        const codes = getReceivingRouteCodes(r, route, state);
        return codes.map(code => Math.ceil(code.length * 8.5 + 24));
    }));
    const purchaseWidth = Math.max(130, ...rows.map(r => String(r.values.purchaseLotCode || '').length * 8.5 + 24));
    const widths = [120, purchaseWidth, 160, 150, 280, 120, 110, 120, ...GMP_GRADES.map(() => GMP_GRADE_COLUMN_WIDTH), ...GMP_GRADES.map(() => GMP_GRADE_COLUMN_WIDTH), 120, 170, codeWidth('DG'), codeWidth('CB'), 160, 140, 180];
    const before = ['Ngày tiếp nhận', 'Mã lô thu mua', 'Người bán', 'Mã số vùng trồng', 'Tên vùng trồng và địa chỉ', 'Chủng loại', 'Khối lượng ban đầu (kg)', 'Khối lượng tiếp nhận (kg)'];
    const after = [ 'Khối lượng từ chối (kg)', 'Người tiếp nhận', 'Chuyển sang sản xuất (Mã lô hàng)', 'Ghi chú', 'Trạng thái', 'Thao tác'];
    return <div className="overflow-x-auto"><table className="table-fixed border-collapse text-sm [&_th]:text-sm [&_td]:text-sm [&_td_*]:text-sm" style={{ width: widths.reduce((a, b) => a + b, 0) }}>
        <colgroup>{widths.map((width, i) => <col key={i} style={{ width }} />)}</colgroup>
        <thead className="bg-slate-50"><tr>{before.map(label => <th key={label} rowSpan={2} className={head}>{label}</th>)}<th colSpan={4} className={head}>Đóng gói trái tươi (kg)</th><th colSpan={4} className={head}>Chế biến khác (kg)</th>{after.map(label => <th key={label} rowSpan={label === 'Chuyển sang sản xuất (Mã lô hàng)' ? 1 : 2} colSpan={label === 'Chuyển sang sản xuất (Mã lô hàng)' ? 2 : 1} className={head}>{label === 'Chuyển sang sản xuất (Mã lô hàng)' ? <><span className="block whitespace-nowrap">Chuyển sang sản xuất</span><span className="block whitespace-nowrap">(Mã lô hàng)</span></> : label}</th>)}</tr><tr>{GMP_GRADES.map(g => <th key={g.key} className={head}>{g.label}</th>)}{GMP_GRADES.map(g => <th key={'other' + g.key} className={head}>{g.label}</th>)}<th className={head}>Đóng gói trái tươi (DG)</th><th className={head}>Chế biến khác (CB)</th></tr></thead>
        <tbody>{rows.map(r => { const v = r.values; const linked = Boolean(v.harvestRecordId || v.sampleSourceId); const confirmed = !r.draft && (v.classificationComplete === '1' || (!linked && Boolean(v.date))); return <tr key={r.id} className="hover:bg-emerald-50/30">
            <td className={`${cell} text-center`}>{v.date ? String(v.date).split('-').reverse().join('/') : '—'}</td>
            <td className={`${cell} text-center font-mono font-semibold`}>{v.purchaseLotCode || '—'}</td>
            <td className={cell}>{v.seller || '—'}</td><td className={`${cell} text-center`}>{v.puc || '—'}</td><td className={`${cell} text-sm`}>{v.origin || '—'}</td><td className={`${cell} text-center`}>{v.variety || '—'}</td>
            <td className={`${cell} text-right font-mono`}>{fmt(v.initialWeight)}{Number(v.weightAdjustment || 0) !== 0 && <div className="text-sm text-slate-500">Cân thực tế: {fmt(Number(v.initialWeight) + Number(v.weightAdjustment))}</div>}</td>
            <td className={`${cell} text-right font-mono`}>{fmt(v.acceptedWeight)}</td>
            {GMP_GRADES.map(g => <td key={g.key} className={`${cell} text-right font-mono`}>{fmt(v['grade' + g.key])}</td>)}
            {GMP_GRADES.map(g => <td key={'other' + g.key} className={`${cell} text-right font-mono`}>{fmt(v['otherGrade' + g.key])}</td>)}
            <td className={`${cell} text-right font-mono`}>{confirmed ? fmt(v.rejected) : <span className="text-sm text-amber-700">{v.unclassifiedWeight !== undefined ? `${fmt(v.unclassifiedWeight)} chưa phân loại` : 'Chưa phân loại'}</span>}</td>
            <td className={cell}>{v.receiver || '—'}</td>
            {(['DG','CB'] as const).map(route => {
                const assignedLots = state ? lots(state).filter(l => l.route === route && l.allocations.some(a => a.active && a.receivingId === r.id)) : [];
                const routeCodes = getReceivingRouteCodes(r, route, state);
                return (
                    <td key={route} className={cell + ' text-center'}>
                        {assignedLots.map(l => (
                            <button key={l.id} onClick={() => onLot?.(l)} className="block w-full whitespace-nowrap font-mono font-semibold text-emerald-700 hover:underline">{l.code}</button>
                        ))}
                        {!assignedLots.length && (
                            routeCodes.length ? routeCodes.map(code => (
                                <span key={code} className="block whitespace-nowrap font-mono font-semibold">{code}</span>
                            )) : <span className="whitespace-nowrap font-mono font-semibold">—</span>
                        )}
                    </td>
                );
            })}
            <td className={`${cell} text-slate-700 min-w-[160px]`}>{v.notes || '—'}</td>
            <td className={`${cell} text-center`}><span className={`inline-flex rounded-full px-2 py-1 text-sm font-semibold ${confirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{confirmed ? 'Đã nhập hàng' : 'Chưa nhập hàng'}</span></td>
            <td className={`${cell} text-center`}><button className="font-semibold text-emerald-700 hover:underline" onClick={() => onDetail(r)}>Chi tiết</button>{confirmed && <button className="ml-3 font-semibold text-emerald-700 hover:underline" onClick={() => onEdit(r)}>Sửa</button>}{linked && !confirmed && v.sourceEligible === '1' && <button className="mt-2 block w-full font-semibold text-emerald-700 hover:underline" onClick={() => onEdit(r)}>Tiếp nhận / Phân loại</button>}</td>
        </tr>; })}{!rows.length && <tr><td colSpan={23} className="p-10 text-center text-slate-500">Chưa có hồ sơ thu hoạch được gửi đến cơ sở.</td></tr>}</tbody>
    </table></div>;
}

export function HarvestReceivingForm({ record, busy, error, onClose, onSave, sourcePicker, productionState }: { productionState?:GmpState; record: GmpRecord; busy: boolean; error: string; onClose: () => void; onSave: (values: Values, confirm: boolean) => Promise<void>; sourcePicker?: ReactNode }) {
    const [values, setValues] = useState<Values>({ ...record.values });
    const [localError, setLocalError] = useState('');
    const set = (key: string, value: string) => setValues(v => {
        const next = { ...v, [key]: value };
        if (key.startsWith('otherGrade')) next.otherProcessing = gradeTotal(next, 'otherGrade');
        return next;
    });
    const baseline = Number(record.values.initialWeight) + Number(values.weightAdjustment || 0);
    const accepted = gradeTotal(values, 'grade') + Number(values.otherProcessing || 0);
    const controls = [...GMP_GRADES.map(g => ({ key: 'grade' + g.key, label: `Đóng gói trái tươi · ${g.label} (kg)` })), ...GMP_GRADES.map(g => ({ key: 'otherGrade' + g.key, label: `Chế biến khác · ${g.label} (kg)` }))];
    return <ModalPortal><div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4"><form role="dialog" aria-modal="true" aria-label="Tiếp nhận / Phân loại" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6" onSubmit={async e => { e.preventDefault(); setLocalError(''); await onSave(values, true); }}>
        <div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Tiếp nhận / Phân loại</h2><button type="button" onClick={onClose} disabled={busy}>Đóng</button></div>
        {(error || localError) && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error || localError}</p>}
        {sourcePicker}
        <div className="mb-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{[
            ['purchaseLotCode', 'Mã lô thu mua'], ['harvestCode', 'Mã hồ sơ thu hoạch'], ['seller', 'Người bán'], ['puc', 'Mã số vùng trồng'], ['origin', 'Tên vùng trồng và địa chỉ'], ['variety', 'Chủng loại'], ['initialWeight', 'Khối lượng ban đầu (kg)']
        ].map(([key, label]) => <label key={key} className="text-sm font-semibold">{label}<input readOnly className="mt-1 w-full rounded-xl border bg-slate-100 px-3 py-2 text-slate-600" value={record.values[key] ?? ''} /></label>)}{record.values.sampleSourceId && <p className="text-sm text-slate-500">Nguồn mẫu dùng để minh họa giao diện.</p>}</div>
        <div className="grid gap-4 sm:grid-cols-2">{controls.map(f => <label key={f.key} className="text-sm font-semibold">{f.label}<input type="number" min="0" step="any" required disabled={busy} className="mt-1 w-full rounded-xl border px-3 py-2" value={values[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} /></label>)}
            <label className="text-sm font-semibold">Chênh lệch cân (kg, có thể âm)<input type="number" step="any" className="mt-1 w-full rounded-xl border px-3 py-2" value={values.weightAdjustment ?? ''} onChange={e => set('weightAdjustment', e.target.value)} /></label>
            <label className="text-sm font-semibold">Lý do chênh lệch cân<input required={Number(values.weightAdjustment || 0) !== 0} className="mt-1 w-full rounded-xl border px-3 py-2" value={values.weightDifferenceReason || ''} onChange={e => set('weightDifferenceReason', e.target.value)} /></label>
            <label className="text-sm font-semibold">Người tiếp nhận<input required className="mt-1 w-full rounded-xl border px-3 py-2" value={values.receiver || ''} onChange={e => set('receiver', e.target.value)} /></label>
            <label className="text-sm font-semibold sm:col-span-2">Ghi chú<input className="mt-1 w-full rounded-xl border px-3 py-2" value={values.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Nhập ghi chú (nếu có)..." /></label>
        </div>
        <label className="my-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={values.processingEligible === '1'} onChange={e => set('processingEligible', e.target.checked ? '1' : '0')} />Xác nhận nguyên liệu chuyển chế biến đủ điều kiện chất lượng và an toàn thực phẩm.</label>
        {productionState&&<section className="my-4 space-y-3 rounded-xl border p-4"><h3 className="font-bold">Chọn lô sản xuất khi xác nhận tiếp nhận</h3>{(['DG','CB'] as const).filter(route=>route==='DG'?gradeTotal(values,'grade')>0:Number(values.otherProcessing)>0).map(route=><label key={route} className="block text-sm">{route==='DG'?'Đóng gói trái tươi':'Chế biến khác'}<select className="mt-1 w-full rounded-xl border px-3 py-2" value={values[route==='DG'?'freshTarget':'otherTarget']||''} onChange={e=>set(route==='DG'?'freshTarget':'otherTarget',e.target.value)}><option value="">Tạo lô mới</option>{candidates(productionState,record,route).map(l=><option key={l.id} value={l.id}>Gom vào {l.code}</option>)}</select></label>)}</section>}<p className="rounded-xl bg-slate-50 p-4 text-sm">Khối lượng cân thực tế: <b>{fmt(baseline)} kg</b> · Tiếp nhận: <b>{fmt(accepted)} kg</b> · Chưa phân loại: <b>{fmt(baseline - accepted)} kg</b><br />Khối lượng từ chối chỉ được xác định khi xác nhận hoàn tất phân loại.</p>
        <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} className="rounded-xl border px-4 py-2 font-semibold" onClick={() => void onSave(values, false)}>Lưu phân loại tạm</button><button disabled={busy || accepted > baseline} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">Xác nhận tiếp nhận</button></div>
    </form></div></ModalPortal>;
}

export function NewHarvestReceivingForm({ records, busy, error, onClose, onSave, productionState }: { productionState?:GmpState; records: GmpRecord[]; busy: boolean; error: string; onClose: () => void; onSave: (id: string, values: Values, confirm: boolean) => Promise<void> }) {
    const available = records.filter(r => r.draft && r.values.sourceEligible === '1' && (r.values.harvestRecordId || r.values.sampleSourceId));
    const [selectedId, setSelectedId] = useState(available[0]?.id || '');
    const selected = available.find(r => r.id === selectedId);
    const blank: GmpRecord = { id: '', sourceId: '', season: '', lotCode: '', draft: true, values: {} };
    const base = selected || blank;
    const prepared = { ...base, values: { ...base.values, date: base.values.date || new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()), ...Object.fromEntries(GMP_GRADES.flatMap(g => [['grade' + g.key, base.values['grade' + g.key] ?? 0], ['otherGrade' + g.key, base.values['otherGrade' + g.key] ?? 0]])) } };
    return <ReceivingRecordForm key={selectedId} state={productionState} record={prepared} busy={busy} error={error} unavailable={!selected} onClose={onClose} onSave={values => onSave(base.id, values, true)} sourcePicker={<label className="block text-sm font-semibold">Hồ sơ nguồn chờ nhập hàng<select className="mt-2 w-full rounded-xl border p-3" disabled={busy || !available.length} value={selectedId} onChange={e => setSelectedId(e.target.value)}>{!available.length && <option value="">Chưa có hồ sơ thu hoạch chờ nhập hàng</option>}{available.map(r => <option key={r.id} value={r.id}>{r.values.purchaseLotCode} · {r.values.seller}</option>)}</select></label>} />;
}
