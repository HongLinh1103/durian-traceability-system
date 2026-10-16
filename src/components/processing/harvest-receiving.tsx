'use client';
import { ReactNode, useState } from 'react';
import { GmpRecord, GMP_GRADES, Values, gradeTotal } from '@/lib/processing-gmp';
import { ModalPortal } from '@/components/ui/modal-portal';
import { GMP_GRADE_COLUMN_WIDTH } from './processing-gmp-column-widths';

const cell = 'border border-slate-200 px-3 py-2.5 align-middle';
const head = 'border border-slate-300 px-3 py-2.5 text-center align-middle text-xs font-semibold text-slate-700';
const fmt = (v: unknown) => v === '' || v === undefined ? '—' : Number(v).toLocaleString('vi-VN');
export function HarvestReceivingTable({ rows, onDetail, onEdit }: { rows: GmpRecord[]; onDetail: (r: GmpRecord) => void; onEdit: (r: GmpRecord) => void }) {
    const widths = [120, 180, 160, 150, 280, 120, 110, 120, ...GMP_GRADES.map(() => GMP_GRADE_COLUMN_WIDTH), 110, 120, 170, 180, 140, 180];
    const before = ['Ngày tiếp nhận', 'Mã lô thu mua', 'Người bán', 'Mã số vùng trồng', 'Tên vùng trồng và địa chỉ', 'Chủng loại', 'Khối lượng ban đầu (kg)', 'Khối lượng tiếp nhận (kg)'];
    const after = ['Chế biến khác (kg)', 'Khối lượng từ chối (kg)', 'Người tiếp nhận', 'Chuyển sang sản xuất (Mã lô hàng)', 'Trạng thái', 'Thao tác'];
    return <div className="overflow-x-auto"><table className="table-fixed border-collapse text-sm" style={{ width: widths.reduce((a, b) => a + b, 0) }}>
        <colgroup>{widths.map((width, i) => <col key={i} style={{ width }} />)}</colgroup>
        <thead className="bg-slate-50"><tr>{before.map(label => <th key={label} rowSpan={2} className={head}>{label}</th>)}<th colSpan={4} className={head}>Đóng gói trái tươi (kg)</th>{after.map(label => <th key={label} rowSpan={2} className={head}>{label === 'Chuyển sang sản xuất (Mã lô hàng)' ? <><span className="block whitespace-nowrap">Chuyển sang sản xuất</span><span className="block whitespace-nowrap">(Mã lô hàng)</span></> : label}</th>)}</tr><tr>{GMP_GRADES.map(g => <th key={g.key} className={head}>{g.label}</th>)}</tr></thead>
        <tbody>{rows.map(r => { const v = r.values; const linked = Boolean(v.harvestRecordId || v.sampleSourceId); const confirmed = !r.draft && (v.classificationComplete === '1' || (!linked && Boolean(v.date))); return <tr key={r.id} className="hover:bg-emerald-50/30">
            <td className={`${cell} text-center`}>{v.date ? String(v.date).split('-').reverse().join('/') : '—'}</td>
            <td className={`${cell} text-center font-mono font-semibold`}>{v.purchaseLotCode || '—'}</td>
            <td className={cell}>{v.seller || '—'}</td><td className={`${cell} text-center`}>{v.puc || '—'}</td><td className={`${cell} text-xs`}>{v.origin || '—'}</td><td className={`${cell} text-center`}>{v.variety || '—'}</td>
            <td className={`${cell} text-right font-mono`}>{fmt(v.initialWeight)}{Number(v.weightAdjustment || 0) !== 0 && <div className="text-xs text-slate-500">Cân thực tế: {fmt(Number(v.initialWeight) + Number(v.weightAdjustment))}</div>}</td>
            <td className={`${cell} text-right font-mono`}>{fmt(v.acceptedWeight)}</td>
            {GMP_GRADES.map(g => <td key={g.key} className={`${cell} text-right font-mono`}>{fmt(v['grade' + g.key])}</td>)}
            <td className={`${cell} text-right font-mono`}>{fmt(v.otherProcessing)}</td>
            <td className={`${cell} text-right font-mono`}>{confirmed ? fmt(v.rejected) : <span className="text-xs text-amber-700">{v.unclassifiedWeight !== undefined ? `${fmt(v.unclassifiedWeight)} chưa phân loại` : 'Chưa phân loại'}</span>}</td>
            <td className={cell}>{v.receiver || '—'}</td><td className={`${cell} text-center font-mono`}>{confirmed ? r.lotCode : '—'}</td>
            <td className={`${cell} text-center`}><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${confirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{confirmed ? 'Đã nhập hàng' : 'Chưa nhập hàng'}</span></td>
            <td className={`${cell} text-center`}><button className="font-semibold text-emerald-700 hover:underline" onClick={() => onDetail(r)}>Chi tiết</button>{linked && !confirmed && v.sourceEligible === '1' && <button className="mt-2 block w-full font-semibold text-emerald-700 hover:underline" onClick={() => onEdit(r)}>Tiếp nhận / Phân loại</button>}</td>
        </tr>; })}{!rows.length && <tr><td colSpan={18} className="p-10 text-center text-slate-500">Chưa có hồ sơ thu hoạch được gửi đến cơ sở.</td></tr>}</tbody>
    </table></div>;
}

export function HarvestReceivingForm({ record, busy, error, onClose, onSave, sourcePicker }: { record: GmpRecord; busy: boolean; error: string; onClose: () => void; onSave: (values: Values, confirm: boolean) => Promise<void>; sourcePicker?: ReactNode }) {
    const [values, setValues] = useState<Values>({ ...record.values });
    const [localError, setLocalError] = useState('');
    const set = (key: string, value: string) => setValues(v => ({ ...v, [key]: value }));
    const baseline = Number(record.values.initialWeight) + Number(values.weightAdjustment || 0);
    const accepted = gradeTotal(values, 'grade') + Number(values.otherProcessing || 0);
    const controls = [...GMP_GRADES.map(g => ({ key: 'grade' + g.key, label: `Đóng gói trái tươi · ${g.label} (kg)` })), { key: 'otherProcessing', label: 'Chế biến khác (kg)' }];
    return <ModalPortal><div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4"><form role="dialog" aria-modal="true" aria-label="Tiếp nhận / Phân loại" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6" onSubmit={async e => { e.preventDefault(); setLocalError(''); await onSave(values, true); }}>
        <div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Tiếp nhận / Phân loại</h2><button type="button" onClick={onClose} disabled={busy}>Đóng</button></div>
        {(error || localError) && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error || localError}</p>}
        {sourcePicker}
        <div className="mb-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{[
            ['purchaseLotCode', 'Mã lô thu mua'], ['harvestCode', 'Mã hồ sơ thu hoạch'], ['seller', 'Người bán'], ['puc', 'Mã số vùng trồng'], ['origin', 'Tên vùng trồng và địa chỉ'], ['variety', 'Chủng loại'], ['initialWeight', 'Khối lượng ban đầu (kg)']
        ].map(([key, label]) => <label key={key} className="text-sm font-semibold">{label}<input readOnly className="mt-1 w-full rounded-xl border bg-slate-100 px-3 py-2 text-slate-600" value={record.values[key] ?? ''} /></label>)}{record.values.sampleSourceId && <p className="text-xs text-slate-500">Nguồn mẫu dùng để minh họa giao diện.</p>}</div>
        <div className="grid gap-4 sm:grid-cols-2">{controls.map(f => <label key={f.key} className="text-sm font-semibold">{f.label}<input type="number" min="0" step="any" required disabled={busy} className="mt-1 w-full rounded-xl border px-3 py-2" value={values[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} /></label>)}
            <label className="text-sm font-semibold">Chênh lệch cân (kg, có thể âm)<input type="number" step="any" className="mt-1 w-full rounded-xl border px-3 py-2" value={values.weightAdjustment ?? ''} onChange={e => set('weightAdjustment', e.target.value)} /></label>
            <label className="text-sm font-semibold">Lý do chênh lệch cân<input required={Number(values.weightAdjustment || 0) !== 0} className="mt-1 w-full rounded-xl border px-3 py-2" value={values.weightDifferenceReason || ''} onChange={e => set('weightDifferenceReason', e.target.value)} /></label>
            <label className="text-sm font-semibold">Người tiếp nhận<input required className="mt-1 w-full rounded-xl border px-3 py-2" value={values.receiver || ''} onChange={e => set('receiver', e.target.value)} /></label>
        </div>
        <label className="my-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={values.processingEligible === '1'} onChange={e => set('processingEligible', e.target.checked ? '1' : '0')} />Xác nhận nguyên liệu chuyển chế biến đủ điều kiện chất lượng và an toàn thực phẩm.</label>
        <p className="rounded-xl bg-slate-50 p-4 text-sm">Khối lượng cân thực tế: <b>{fmt(baseline)} kg</b> · Tiếp nhận: <b>{fmt(accepted)} kg</b> · Chưa phân loại: <b>{fmt(baseline - accepted)} kg</b><br />Khối lượng từ chối chỉ được xác định khi xác nhận hoàn tất phân loại.</p>
        <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} className="rounded-xl border px-4 py-2 font-semibold" onClick={() => void onSave(values, false)}>Lưu phân loại tạm</button><button disabled={busy || accepted > baseline} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">Xác nhận tiếp nhận</button></div>
    </form></div></ModalPortal>;
}

export function NewHarvestReceivingForm({ records, busy, error, onClose, onSave }: { records: GmpRecord[]; busy: boolean; error: string; onClose: () => void; onSave: (id: string, values: Values, confirm: boolean) => Promise<void> }) {
    const candidates = records.filter(r => r.draft && r.values.sourceEligible === '1' && (r.values.harvestRecordId || r.values.sampleSourceId));
    const [selectedId, setSelectedId] = useState(candidates[0]?.id || '');
    const selected = candidates.find(r => r.id === selectedId);
    if (!selected) return <ModalPortal><div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6"><h2 className="text-xl font-bold">Thêm bản ghi nhập hàng</h2><p>Chưa có hồ sơ nguồn chờ nhập hàng. Hồ sơ thu hoạch được gửi đến cơ sở sẽ tự xuất hiện trong danh sách.</p><button className="rounded-xl border px-4 py-2" onClick={onClose}>Đóng</button></section></div></ModalPortal>;
    return <HarvestReceivingForm key={selected.id} record={selected} busy={busy} error={error} onClose={onClose} onSave={(values, confirm) => onSave(selected.id, values, confirm)} sourcePicker={<label className="mb-4 block text-sm font-semibold">Chọn lô chờ nhập hàng<select className="mt-1 w-full rounded-xl border px-3 py-2" disabled={busy} value={selectedId} onChange={e => setSelectedId(e.target.value)}>{candidates.map(r => <option key={r.id} value={r.id}>{r.values.purchaseLotCode} · {r.values.seller}</option>)}</select></label>} />;
}
