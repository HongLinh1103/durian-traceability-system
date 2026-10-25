'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { ModalPortal } from '@/components/ui/modal-portal';
import { MaterialSource, OtherRegisterRow } from '@/lib/other-register-data';
import { OTHER_REGISTERS, OtherRegisterKey } from '@/lib/other-registers';
import { otherRegisterFormFields, OtherRegisterInput } from '@/lib/other-register-write';
import { Values } from '@/lib/processing-gmp';
import { dryingInput } from '@/lib/drying-time';

const control = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-600';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50';

export function OtherRegisterForm({ book, sources, record, selectedCode, busy, error, onClose, onReload, onSave }: {
 book: OtherRegisterKey; sources: MaterialSource[]; record?: OtherRegisterRow; selectedCode?: string;
 busy: boolean; error: string; onClose: () => void; onReload: () => void; onSave: (input: OtherRegisterInput) => Promise<void>;
}) {
 const titleId = useId();
 const panel = useRef<HTMLFormElement>(null);
 const [materialCode, setMaterialCode] = useState(record?.lotCode || selectedCode || sources[0]?.code || '');
 const defaults = () => {
  const now = dryingInput(new Date().toISOString());
  const values: Values = { date: now.slice(0, 10), [OTHER_REGISTERS[book].dateKey]: book === 'preprocessing' ? now.slice(0, 10) : now };
  if (book === 'preprocessing') values.dryStart = now;
  return values;
 };
 const [values, setValues] = useState<Values>(record ? { ...record.values } : defaults);
 const source = sources.find(s => s.code === materialCode);
 const fields = otherRegisterFormFields(book);
 if (!fields.some(f => f.key === 'correction')) fields.push({ key: 'correction', label: 'Hành động sửa chữa / ghi chú' });
 const groups = [...new Set(fields.map(f => f.group || 'Thông tin ghi nhận'))];
 useEffect(() => {
  const previousFocus = document.activeElement as HTMLElement | null;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('select, input, button')?.focus());
  return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
 }, []);
 async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (busy) return;
  const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
  const confirmed = submitter?.value !== 'draft';
  const submitted = { ...values };
  if (book === 'preprocessing' && source) Object.assign(submitted, source.grades);
  await onSave({ book, materialCode, id: record?.sourceOnly ? undefined : record?.id, confirmed, values: submitted });
 }

 return <ModalPortal><div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
  <form ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onSubmit={submit} onKeyDown={e => {
   if (e.key === 'Escape' && !busy) { e.preventDefault(); onClose(); }
   if (e.key === 'Tab') {
    const elements = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
    if (!elements?.length) return;
    const first = elements[0], last = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
   }
  }}>
   <header className="flex items-start justify-between gap-4 border-b p-5"><div><p className="text-xs font-semibold text-emerald-700">{record && !record.sourceOnly ? 'Chỉnh sửa bản ghi' : 'Thêm bản ghi'}</p><h2 id={titleId} className="mt-1 text-xl font-bold">{OTHER_REGISTERS[book].title}</h2></div><button type="button" aria-label="Đóng biểu mẫu" disabled={busy} onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></header>
   <div className="space-y-5 overflow-y-auto p-5">
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <label className="block text-sm font-semibold">Mã lô NL <span className="text-rose-600">*</span><select required className={control} disabled={busy || !!record && !record.sourceOnly} value={materialCode} onChange={e => { setMaterialCode(e.target.value); setValues(defaults()); }}><option value="">Chọn mã CB từ Sổ Nhập hàng</option>{sources.map(s => <option key={s.code} value={s.code}>{s.code} · {s.weight?.toLocaleString('vi-VN') ?? 'Chưa phân bổ'} kg · {s.variety}</option>)}</select></label>
    {source && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Tiếp nhận: {source.date.split('-').reverse().join('/')} · Khối lượng nguyên liệu CB: <strong>{source.weight?.toLocaleString('vi-VN') ?? 'Chưa xác định'} kg</strong>. Mã lô được kế thừa từ Sổ Nhập hàng.</p>}
    <fieldset disabled={busy} className="space-y-5">
     {groups.map(group => <fieldset key={group} className="rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-bold text-slate-700">{group}</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {fields.filter(f => (f.group || 'Thông tin ghi nhận') === group).map(field => {
       const inherited = book === 'preprocessing' && field.key.startsWith('inputWeight') && source?.grades[field.key] !== undefined;
       const value = inherited ? source?.grades[field.key] ?? '' : values[field.key] ?? '';
       const optional = field.key === 'correction' || field.key === 'dryEnd' || book === 'preprocessing' && field.key.startsWith('inputWeight') && !inherited;
       const required = !optional;
       const label = field.unit ? `${field.label} (${field.unit})` : field.label;
       const textValue = field.type === 'datetime-local' ? dryingInput(value) : String(value);
       return <label key={field.key} className={`flex min-w-0 flex-col justify-end text-xs font-semibold leading-5 text-slate-600 ${field.key === 'correction' ? 'sm:col-span-2 lg:col-span-4' : ''}`}><span>{label}{required && <span className="text-rose-600"> *</span>}{inherited && ' · Từ Sổ Nhập hàng'}</span>
        {field.type === 'check' ? <select className={control} required={required} value={String(value)} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}><option value="">Chưa ghi nhận</option><option value="Đ">Đ — Đạt</option><option value="K">K — Không đạt</option></select> : field.key === 'correction' ? <textarea rows={3} className={control} value={String(value)} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} /> : <input className={control} required={required} disabled={inherited} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime-local' ? 'datetime-local' : 'text'} min={field.type === 'number' && !field.key.startsWith('temperature') && field.key !== 'storageTemperature' ? 0 : undefined} step={field.type === 'number' ? field.key === 'quantity' ? 1 : '0.001' : undefined} value={textValue} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} />}
       </label>;
      })}
     </div></fieldset>)}
    </fieldset>
    <p className="text-xs text-slate-500">Ngày giờ theo giờ Việt Nam. Lưu nháp khi chưa đủ thông tin; xác nhận khi đã hoàn tất kiểm tra.</p>
   </div>
   <footer className="flex flex-wrap justify-end gap-2 border-t bg-slate-50 p-4"><button type="button" disabled={busy} className={button} onClick={onClose}>Hủy</button><button type="button" disabled={busy} className={button} onClick={onReload}>Tải lại sổ</button>{!record || record.sourceOnly || record.draft ? <button type="submit" value="draft" formNoValidate disabled={busy || !source} className={button}>Lưu nháp</button> : null}<button type="submit" value="confirm" disabled={busy || !source} className={`${button} border-emerald-600 bg-emerald-600 text-white`}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{record && !record.sourceOnly && !record.draft ? 'Lưu thay đổi' : 'Lưu & xác nhận'}</button></footer>
  </form>
 </div></ModalPortal>;
}
