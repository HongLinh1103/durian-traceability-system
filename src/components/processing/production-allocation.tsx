'use client';
import { useState } from 'react';
import { GmpState, GmpRecord, GMP_GRADES, Values, gradeTotal } from '@/lib/processing-gmp';
import { allocated, candidates, lots, lotLocked, ProductionRoute, ProductionLot } from '@/lib/production-lots';
import { ModalPortal } from '@/components/ui/modal-portal';
const control = 'rounded-xl border border-slate-200 px-3 py-2 text-sm';
export function ProductionAllocationPanel({ state, record, onMutate, onLot }: {
    state: GmpState;
    record: GmpRecord;
    onMutate: (allocation: unknown) => Promise<void>;
    onLot: (lot: ProductionLot) => void;
}) {
    const [route, setRoute] = useState<ProductionRoute>('DG'), [target, setTarget] = useState(''), [weight, setWeight] = useState(''), [grades, setGrades] = useState<Values>({}), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const r = state.records.receiving.find(r => r.id === record.id) || record;
    const assigned = allocated(state, r.id, route);
    const capacity = route === 'DG' ? gradeTotal(r.values, 'grade') : Number(r.values.otherProcessing || 0);
    const remaining = capacity - assigned.reduce((s, a) => s + a.weight, 0);
    async function submit(extra: object = {}) { setBusy(true); setError(''); try {
        await onMutate({ receivingId: r.id, route, targetId: target || undefined, weight: Number(weight), grades, ...extra });
        setWeight('');
        setGrades({});
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể phân bổ.');
    }
    finally {
        setBusy(false);
    } }
    if (r.draft)
        return <p className="mt-5 text-sm text-amber-700">Xác nhận tiếp nhận trước khi phân bổ lô sản xuất.</p>;
    return <section className="mt-6 space-y-3 rounded-xl border p-4"><h3 className="font-bold">Phân bổ lô sản xuất</h3><select aria-label="Hướng sản xuất" className={control} value={route} onChange={e => { setRoute(e.target.value as ProductionRoute); setTarget(''); setGrades({}); }}><option value="DG">Đóng gói trái tươi</option><option value="CB">Chế biến khác</option></select><p className="text-sm">Được tiếp nhận: {capacity.toLocaleString('vi-VN')} kg · Có thể phân bổ: {remaining.toLocaleString('vi-VN')} kg</p>
 {lots(state).filter(l => l.route === route).flatMap(l => l.allocations.filter(a => a.active && a.receivingId === r.id).map(a => <div key={a.id} className="flex flex-wrap items-center gap-3 text-sm"><button className="break-all font-semibold text-emerald-700 underline" onClick={() => onLot(l)}>{l.code}</button><span>{a.weight.toLocaleString('vi-VN')} kg</span><span>{lotLocked(state, l) ? 'Đã khóa / Chuyển sản xuất' : 'Đang mở'}</span>{!lotLocked(state, l) && <><button disabled={busy} className={control} onClick={() => submit({ cancelId: a.id })}>Hủy phân bổ</button><button disabled={busy} className={control} onClick={() => submit({ closeId: l.id })}>Đóng lô</button></>}</div>))}
 <select aria-label="Chọn lô sản xuất" className={control + ' w-full'} value={target} onChange={e => setTarget(e.target.value)}><option value="">Tạo lô sản xuất mới</option>{candidates(state, r, route).map(l => <option key={l.id} value={l.id}>Gom vào {l.code}</option>)}</select>
 {route === 'DG' ? <div className="grid grid-cols-2 gap-3">{GMP_GRADES.map(g => <label key={g.key} className="text-sm">{g.label} (kg)<input type="number" min="0" step="any" className={control + ' block w-full'} value={grades['grade' + g.key] ?? ''} onChange={e => setGrades({ ...grades, ['grade' + g.key]: e.target.value })}/><span className="text-xs text-slate-500">Còn {Number(r.values['grade' + g.key] || 0) - assigned.reduce((s, a) => s + Number(a.grades['grade' + g.key] || 0), 0)} kg</span></label>)}</div> : <label className="block text-sm">Khối lượng phân bổ (kg)<input type="number" min="0" step="any" className={control + ' block w-full'} value={weight} onChange={e => setWeight(e.target.value)}/></label>}
 {error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || remaining <= 0} className={control + ' bg-emerald-600 text-white'} onClick={() => submit()}>Xác nhận {target ? 'gom lô' : 'tạo lô và phân bổ'}</button><p className="text-xs text-slate-500">Để điều chỉnh, hủy phân bổ của lô đang mở rồi phân bổ lại. Lịch sử và nguồn nhập được giữ nguyên.</p></section>;
}
export function ProductionLotDetail({ lot, state, onClose }: {
    lot: ProductionLot;
    state: GmpState;
    onClose: () => void;
}) { const active = lot.allocations.filter(a => a.active); return <ModalPortal><div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-label="Chi tiết lô sản xuất" className="max-h-[92vh] w-full max-w-5xl space-y-4 overflow-auto rounded-2xl bg-white p-6"><div className="flex justify-between gap-4"><h2 className="break-all text-xl font-bold">{lot.code}</h2><button className={control} onClick={onClose}>Đóng</button></div><p>{lot.route === 'DG' ? 'Đóng gói trái tươi' : 'Chế biến khác'} · {lot.variety} · {lot.puc}</p><p>Ngày tạo: {new Date(lot.createdAt).toLocaleString('vi-VN')} · {lotLocked(state, lot) ? 'Đã khóa / Đóng / Chuyển sản xuất' : 'Đang mở'}</p><p>Tổng: <b>{active.reduce((s, a) => s + a.weight, 0).toLocaleString('vi-VN')} kg</b> · {new Set(active.map(a => a.receivingId)).size} bản ghi nhập hàng</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Hồ sơ nhập hàng', 'Thu hoạch', 'Vùng trồng', 'Khối lượng (kg)', ...(lot.route === 'DG' ? GMP_GRADES.map(g => g.label) : []), 'Ngày nhập', 'Người tiếp nhận', 'Người xác nhận', 'Thời gian xác nhận'].map(h => <th key={h} className="whitespace-nowrap border px-3 py-2">{h}</th>)}</tr></thead><tbody>{active.map(a => <tr key={a.id}>{[state.records.receiving.find(r => r.id === a.receivingId)?.values.purchaseLotCode || a.receivingId, a.harvestCode, a.puc, a.weight, ...(lot.route === 'DG' ? GMP_GRADES.map(g => a.grades['grade' + g.key] || 0) : []), a.receivedAt, a.receiver, a.actor, new Date(a.at).toLocaleString('vi-VN')].map((v, i) => <td key={i} className="whitespace-nowrap border px-3 py-2">{v}</td>)}</tr>)}</tbody></table></div><h3 className="font-bold">Lịch sử gom lô và điều chỉnh</h3>{lot.history.map((h, i) => <p className="break-words text-sm" key={i}>{new Date(h.at).toLocaleString('vi-VN')} · {h.actor} · {h.action} · {h.receivingId} {h.weight !== undefined ? '· ' + h.weight + ' kg' : ''}</p>)}</section></div></ModalPortal>; }
