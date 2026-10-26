'use client';
import { SaleExportStatus } from './sale-export-status';
import { CertificateLink } from './certificate-upload';
import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from '@/components/ui/modal-portal';
import { GmpRecord, GmpState, GMP_GRADES, REGISTERS, Stage, STAGES } from '@/lib/processing-gmp';
import { dryingDuration, formatDryingTime } from '@/lib/drying-time';
import { getReceivingRouteCodes } from './harvest-receiving';
import { freshLotCode } from '@/lib/fresh-lot-code';
import { vietnamPhone } from '@/lib/sales-contact';

const number = (v: unknown) => v === '' || v == null ? '—' : Number(v).toLocaleString('vi-VN');
const date = (v: unknown) => String(v || '').split('-').reverse().join('/') || '—';
export function preprocessingCode(state: GmpState, r: GmpRecord) {
  return freshLotCode(state,'preprocessing',r);
}
function Box({ label, children, wide = false }: {label: string; children: ReactNode; wide?: boolean}) {
  return <div className={`min-w-0 rounded-xl bg-slate-50 p-4 ${wide ? 'md:col-span-3' : ''}`}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 break-words text-sm font-semibold">{children}</dd></div>;
}
export function RegisterDetail({ state, stage, record: r, onClose }: {state: GmpState; stage: Stage; record: GmpRecord; onClose: () => void}) {
  const v = r.values;
  const receiving = stage === 'receiving';
  const code = freshLotCode(state, stage, r);
  const group = (label: string, prefix: string) => <Box key={prefix} label={label} wide><dl className="grid grid-cols-2 gap-4 md:grid-cols-4">{GMP_GRADES.map(g => <div key={g.key}><dt className="text-xs font-normal text-slate-500">{g.label}</dt><dd className="mt-1">{number(v[prefix + g.key])}</dd></div>)}</dl></Box>;
  const display = (key: string, type?: string) => key === 'lotCode' ? code : key === 'customerInfo' ? vietnamPhone(v[key]) || String(v[key] || '—') : key === 'correction' ? '—' : type === 'image' ? <CertificateLink value={v[key]} /> : type === 'number' ? number(v[key]) : type === 'datetime-local' ? formatDryingTime(v[key]) : type === 'date' ? date(v[key]) : String(v[key] || '—');
  const groups = Array.from(new Set(REGISTERS[stage].fields.filter(f => !f.internal).map(f => f.group || 'Thông tin chung')));
  return <ModalPortal><div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"><section role="dialog" aria-modal="true" aria-label="Chi tiết bản ghi" className="flex max-h-[92dvh] w-full max-w-[1440px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"><header className="flex shrink-0 items-start justify-between gap-4 border-b p-5"><div><p className="text-xs font-bold text-emerald-600">{REGISTERS[stage].code}</p><h2 className="mt-1 text-xl font-bold">{code}</h2></div><button type="button" aria-label="Đóng chi tiết" onClick={onClose}><X /></button></header><div className="overflow-y-auto p-5"><dl className="grid gap-4 md:grid-cols-3">
    {receiving ? <>
      <Box label="Ngày">{date(v.date)}</Box><Box label="Mã lô thu mua">{String(v.purchaseLotCode || '—')}</Box><Box label="Người bán">{String(v.seller || '—')}</Box>
      <Box label="Mã vùng trồng">{String(v.puc || '—')}</Box><Box label="Tên và địa chỉ vùng trồng">{String(v.origin || '—')}</Box><Box label="Chủng loại">{String(v.variety || '—')}</Box>
      <Box label="Khối lượng ban đầu (kg)">{number(v.initialWeight)}</Box><Box label="Khối lượng tiếp nhận (kg)">{number(v.acceptedWeight)}</Box><Box label="Khối lượng từ chối (kg)">{number(v.rejected)}</Box>
      {group('Đóng gói trái tươi (kg)', 'grade')}{group('Chế biến khác (kg)', 'otherGrade')}
      <Box label="Mã lô chuyển sang chế biến" wide><dl className="grid gap-4 sm:grid-cols-2">{(['DG','CB'] as const).map(route => <div key={route}><dt className="text-xs font-normal text-slate-500">{route === 'DG' ? 'Đóng gói trái tươi' : 'Chế biến khác'}</dt><dd className="mt-1">{getReceivingRouteCodes(r, route, state).join(', ') || '—'}</dd></div>)}</dl></Box>
      <Box label="Người tiếp nhận">{String(v.receiver || '—')}</Box><Box label="Trạng thái">{r.draft ? 'Chưa nhập hàng' : 'Đã nhập hàng'}</Box><div className="hidden md:block" /><Box label="Ghi chú" wide>{String(v.notes || '—')}</Box>
    </> : groups.map(name => <Box key={name} label={name} wide><dl className="grid gap-4 md:grid-cols-3">{REGISTERS[stage].fields.filter(f => !f.internal && (f.group || 'Thông tin chung') === name).map(f => <div key={f.key}><dt className="text-xs font-normal text-slate-500">{f.label}</dt><dd className="mt-1">{f.key === 'productLot' ? `${v.variety || ''} · ${code}` : display(f.key, f.type)}</dd></div>)}</dl></Box>)}
  </dl>{stage === 'sales' && <SaleExportStatus saleId={r.id} />}{stage === 'preprocessing' && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold">Thời lượng hong khô: {dryingDuration(v.dryStart, v.dryEnd)}</p>}<h3 className="mb-2 mt-6 font-bold">Lịch sử theo mã lô</h3>{STAGES.filter(s => s !== 'purchases').flatMap(s => state.records[s].filter(x => x.id === r.id || x.sourceId === r.id || x.lotCode === r.lotCode || (s === 'preprocessing' && preprocessingCode(state, x) === code)).map(x => <p key={`${s}-${x.id}`} className="border-l-2 border-emerald-200 py-2 pl-4 text-sm">{date(x.values.date)} · {REGISTERS[s].title}</p>))}</div></section></div></ModalPortal>;
}
