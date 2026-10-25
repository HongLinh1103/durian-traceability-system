'use client';
import { SalesContactField } from './sales-contact-field';
import { parseSalesContact } from '@/lib/sales-contact';
import { dryingInput, dryingDuration, formatDryingTime } from '@/lib/drying-time';
import { ReceivingRecordForm } from './receiving-record-form';
import { CertificateLink, CertificateUpload } from './certificate-upload';
import { RegisterDetail, preprocessingCode } from './register-detail';
import { ProductionLotDetail } from './production-allocation';
import { ProductionLot, productionSources, lots } from '@/lib/production-lots';

import { HarvestReceivingTable, HarvestReceivingForm, NewHarvestReceivingForm, getReceivingRouteCodes } from './harvest-receiving';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ModalPortal } from '@/components/ui/modal-portal';
import { GMP_REGISTER_COLUMN_WIDTHS } from '@/components/processing/processing-gmp-column-widths';
import { ProcessingGmpRegisterTable } from '@/components/processing/processing-gmp-register-table';
import { BarChart3, Receipt, ShoppingCart, TrendingUp, Wallet, ArrowRight, CheckCircle2, ClipboardList, Download, Loader2, Plus, RefreshCw, Search, X } from 'lucide-react';
import { addPayment, EXPENSE_CATEGORIES, Expense, formatPurchaseLotCode, formatProductionLotCode, GmpRecord, GmpState, GMP_GRADES, gradeTotal, inherit, isFailed, latestRecords, REGISTERS, sources, Stage, STAGES, Values } from '@/lib/processing-gmp';
import { buildRegisterDocx, downloadFile, registerExportPeriod } from '@/lib/processing-gmp-export';
import { normalizeUnitCode } from '@/lib/puc-phc';
import { ProcessingFinanceCharts } from '@/components/processing/processing-finance-charts';

const fmt = (n: unknown) => n === undefined || n === null || n === '' ? '—' : Number(n).toLocaleString('vi-VN');
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const formatDateVN = (val?: unknown) => {
  if (!val) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(val).trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(val);
};
const control = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-600';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50';
const primary = `${button} !border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700`;
type Screen = Stage | 'overview' | 'finance';
type Filter = { season: string; from: string; to: string; query: string };
type RegionSource = { code: string; name: string; address: string | null };
function matches(r: GmpRecord, filter: Filter) { return (!filter.season || r.season === filter.season) && (!filter.from || String(r.values.date) >= filter.from) && (!filter.to || String(r.values.date) <= filter.to) && (!filter.query || `${r.lotCode} ${Object.values(r.values).join(' ')}`.toLocaleLowerCase('vi').includes(filter.query.toLocaleLowerCase('vi'))); }
function status(state: GmpState, stage: Stage, r: GmpRecord) {
  if (stage === 'receiving') return r.draft ? 'Chưa nhập hàng' : 'Đã nhập hàng';
  if (stage === 'preprocessing' && (!dryingInput(r.values.dryStart) || (r.values.dryEnd && !dryingInput(r.values.dryEnd)))) return 'Cần bổ sung ngày giờ';
  if (stage === 'preprocessing' && !r.values.dryEnd) return 'Đang thực hiện';
  if (r.draft) return 'Chờ bổ sung dữ liệu';
  if (isFailed(stage, r.values)) return 'Không đạt · Cần khắc phục';
  if (stage === 'aftersales') return isFailed(stage, r.values) ? 'Không đạt · Cần xử lý' : 'Đã thông quan';
  const next = STAGES[STAGES.indexOf(stage) + 1];
  if (next && state.records[next].some(x => x.sourceId === r.id && !x.draft)) return stage === 'purchases' ? 'Đã nhập hàng' : 'Đã chuyển công đoạn';
  return ({ purchases: 'Chờ nhập hàng', receiving: 'Chờ sơ chế', preprocessing: 'Chờ đóng gói', packaging: 'Chờ kiểm tra', inspection: 'Sẵn sàng xuất', sales: 'Đã xuất bán' } as Partial<Record<Stage, string>>)[stage] || 'Đã ghi nhận';
}
function cleanText(val?: unknown): string {
  if (!val) return '';
  return String(val).replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
}

function formatReceiver(val?: unknown): string {
  let str = cleanText(val);
  if (!str) return '—';
  if (/^Tổ tiếp nhận\s*1/i.test(str)) str = 'Nguyễn Thị Lan';
  else if (/^Tổ tiếp nhận\s*2/i.test(str)) str = 'Trần Văn Hưng';
  else if (/^Tổ tiếp nhận\s*3/i.test(str)) str = 'Lê Văn Hùng';
  else if (/^Tổ tiếp nhận/i.test(str)) str = 'Nguyễn Thị Lan';
  return str || '—';
}

function getRecordSortDate(r: GmpRecord): string {
  return String(r.values?.date || r.values?.purchaseDate || r.values?.completionDate || '');
}

function compareGmpRecordsNewestFirst(a: GmpRecord, b: GmpRecord): number {
  const dateA = getRecordSortDate(a);
  const dateB = getRecordSortDate(b);
  if (dateA !== dateB) {
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB.localeCompare(dateA);
  }
  const codeA = a.lotCode || a.id;
  const codeB = b.lotCode || b.id;
  return codeB.localeCompare(codeA);
}

function getStageHeaders(stage: Stage): string[] {
  switch (stage) {
    case 'purchases':
      return ['Ngày thu mua', 'Mã hồ sơ thu mua', 'Người bán', 'Liên hệ', 'Mã số vùng trồng', 'Tên vùng trồng và địa chỉ', 'Chủng loại', 'Khối lượng (kg)', 'Giá mua (đ/kg)', 'Thành tiền (đ)', 'Trạng thái', 'Thao tác'];
    case 'receiving':
      return ['Ngày tiếp nhận', 'Mã số lô hàng', 'Chủng loại & Nguồn', 'Tiếp nhận L1/L2/L3 (kg)', 'Từ chối (kg)', 'Người nhận', 'Trạng thái', 'Thao tác'];
    case 'preprocessing':
      return ['Ngày sơ chế', 'Mã số lô hàng', 'Chủng loại', 'KL tiếp nhận (kg)', 'KL sau sơ chế (kg)', 'Chất lượng', 'Giám sát', 'Trạng thái', 'Thao tác'];
    case 'packaging':
      return ['Ngày đóng gói', 'Mã số lô hàng', 'Chủng loại', 'KL tiếp nhận (kg)', 'Nhập kho thành phẩm', 'Chất lượng', 'Giám sát', 'Trạng thái', 'Thao tác'];
    case 'inspection':
      return ['Ngày kiểm tra', 'Mã số lô hàng', 'Tiếp nhận kiểm tra', 'Mẫu 2%', 'Lượng xuất bán', 'Chất lượng', 'Người kiểm tra', 'Trạng thái', 'Thao tác'];
    case 'sales':
      return ['Ngày xuất bán', 'Mã số lô hàng', 'Khách hàng', 'Số container', 'Lượng xuất bán', 'Giá trị (đ)', 'Nước xuất khẩu', 'Trạng thái', 'Thao tác'];
    case 'aftersales':
      return ['Ngày', 'Mã số lô hàng', 'Số container', 'Số lượng (quả)', 'Khối lượng (kg)', 'Ngày rời kho', 'Ngày đến cửa khẩu xuất', 'Ngày thông quan lô hàng', 'Cadmium', 'Vàng O', 'SVGH', 'Lỗi khác (ghi rõ)', 'Phương án xử lý (nếu không đạt)', 'Ghi chú', 'Thao tác'];
    default:
      return ['Ngày', 'Mã lô', 'Thông tin', 'Khối lượng', 'Trạng thái', 'Thao tác'];
  }
}
function formatSupervisor(val?: unknown, fallbackIdx: number = 0): string {
  const str = String(val || '').trim();
  if (!str || str === '—') return 'Lê Văn Hùng';
  if (/giám sát ca\s*1/i.test(str)) return 'Lê Văn Hùng';
  if (/giám sát ca\s*2/i.test(str)) return 'Trần Minh Đức';
  if (/giám sát ca\s*3/i.test(str)) return 'Phạm Quốc Bảo';
  if (/giám sát/i.test(str)) {
    const defaultSupervisors = ['Lê Văn Hùng', 'Trần Minh Đức', 'Phạm Quốc Bảo'];
    return defaultSupervisors[fallbackIdx % defaultSupervisors.length];
  }
  return str.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim() || 'Lê Văn Hùng';
}

function formatInspector(val?: unknown, fallbackIdx: number = 0): string {
  const str = String(val || '').trim();
  if (!str || str === '—') return 'Phạm Thị Hương';
  if (/nhân viên kcs\s*1/i.test(str)) return 'Phạm Thị Hương';
  if (/nhân viên kcs\s*2/i.test(str)) return 'Trần Đình Trọng';
  if (/nhân viên kcs\s*3/i.test(str)) return 'Vũ Hoàng Mai';
  if (/nhân viên kcs/i.test(str)) {
    const defaultInspectors = ['Phạm Thị Hương', 'Trần Đình Trọng', 'Vũ Hoàng Mai'];
    return defaultInspectors[fallbackIdx % defaultInspectors.length];
  }
  return str.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim() || 'Phạm Thị Hương';
}

function formatSellerPhone(seller?: unknown, phone?: unknown): string {
  const p = String(phone || '').trim();
  const s = String(seller || '').trim();
  if (s.includes('Nguyễn Văn Nam') && (p === '0901234567' || !p)) return '0983456789';
  if (s.includes('Lê Thị Hoa') && (p === '0901234567' || !p)) return '0987654321';
  return p || '—';
}

function renderPurchaseOriginDisplay(r: GmpRecord, receivingRecord?: GmpRecord, regions: RegionSource[] = []) {
  const purchasePuc = String(r.values?.puc || receivingRecord?.values?.puc || '').trim();
  const matchedRegion = purchasePuc
    ? regions.find(region => normalizeUnitCode(region.code) === normalizeUnitCode(purchasePuc))
    : undefined;
  if (matchedRegion) {
    return (
      <>
        <div className="font-semibold text-slate-900">{matchedRegion.name}</div>
        <div className="mt-1 text-slate-500">{matchedRegion.address || 'Chưa có địa chỉ'}</div>
      </>
    );
  }
  const text = cleanText(r.values?.origin || receivingRecord?.values?.origin);
  if (!text) return '—';
  if (text.includes(' - ')) {
    const [name, ...rest] = text.split(' - ');
    return (
      <>
        <div className="font-semibold text-slate-900">{name.trim()}</div>
        <div className="mt-1 text-slate-500">{rest.join(' - ').trim()}</div>
      </>
    );
  }
  const commaIdx = text.indexOf(', ');
  if (commaIdx > 5) {
    const name = text.slice(0, commaIdx).trim();
    const addr = text.slice(commaIdx + 2).trim();
    return (
      <>
        <div className="font-semibold text-slate-900">{name}</div>
        <div className="mt-1 text-slate-500">{addr}</div>
      </>
    );
  }
  return <div className="font-semibold text-slate-900">{text}</div>;
}

export function ProcessingGmpView({ screen, embedded = false }: { screen: Screen; embedded?: boolean }) {
  const [productionLot, setProductionLot] = useState<ProductionLot | null>(null);
  const [state, setState] = useState<GmpState | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [financeExporting, setFinanceExporting] = useState(false);
  const [filter, setFilter] = useState<Filter>({ season: '', from: '', to: '', query: '' });
  const [month, setMonth] = useState('');
  const [company, setCompany] = useState('CN 1 - CÔNG TY TNHH MTV TM THIÊN SƠN HẢI');
  const [regions, setRegions] = useState<RegionSource[]>([]);
  const [exporters, setExporters] = useState<{id:string;code:string;name:string}[]>([]);
  const [handovers, setHandovers] = useState<{saleId:string;status:string;receivedAt:string|null;exporter:{name:string}}[]>([]);
  const [editing, setEditing] = useState<GmpRecord | 'new' | null>(null);
  const [detail, setDetail] = useState<GmpRecord | null>(null);
  const load = useCallback(async () => {
    setError('');
    try { const res = await fetch('/api/processing/gmp', { cache: 'no-store' }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setState(data.state); setExporters(data.exporters || []); setHandovers(data.handovers || []); setRevision(data.revision); setRegions(Array.isArray(data.regions) ? data.regions : []); if (data.company) setCompany(data.company); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (editing || busy) return; const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30000); return () => window.clearInterval(timer); }, [load, editing, busy]);
  async function mutate(payload: object): Promise<{ ok: boolean; error?: string }> {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/processing/gmp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, revision }) });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          await load();
        }
        const msg = data.error || 'Không lưu được dữ liệu.';
        setError(msg);
        return { ok: false, error: msg };
      }
      setState(data.state);
      setRevision(data.revision);
      setNotice('Đã lưu dữ liệu. Các công đoạn và công nợ đã được cập nhật.');
      return { ok: true };
    }
    catch (e) {
      const msg = e instanceof Error ? e.message : 'Không lưu được dữ liệu.';
      setError(msg);
      return { ok: false, error: msg };
    }
    finally { setBusy(false); }
  }
  const stage = screen !== 'overview' && screen !== 'finance' ? screen : null;
  const config = stage ? REGISTERS[stage] : null;
  const rows = stage && state ? state.records[stage].filter(r => matches(r, filter)).sort(compareGmpRecordsNewestFirst) : [];
  const title = config?.title || (screen === 'overview' ? 'Tổng quan cơ sở chế biến' : 'TÀI CHÍNH');
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    if (state) {
      for (const s of STAGES) {
        for (const r of state.records[s] || []) {
          const d = String(r.values?.date || '');
          if (/^\d{4}-\d{2}/.test(d)) {
            months.add(d.slice(0, 7));
          }
        }
      }
      for (const e of state.expenses || []) {
        const d = String(e.date || '');
        if (/^\d{4}-\d{2}/.test(d)) {
          months.add(d.slice(0, 7));
        }
      }
    }
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentYm);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [state]);
  async function exportRegister() {
    if (!stage || !config) return;
    setBusy(true); setError('');
    try { const bytes = await buildRegisterDocx(stage, stage === 'receiving' ? rows.map(r => ({ ...r, values: { ...r.values, dgLotCodes: getReceivingRouteCodes(r, 'DG', state!).join('\n') || '—', cbLotCodes: getReceivingRouteCodes(r, 'CB', state!).join('\n') || '—' } })) : rows, company, registerExportPeriod(month, filter.from, filter.to), regions, state?.records?.receiving || []); downloadFile(bytes as BlobPart, `${config.title}${month ? `-${month}` : ''}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); }
    catch { setError('Không thể xuất file. Vui lòng thử lại.'); } finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <header className={embedded ? "flex flex-wrap justify-end gap-2" : "flex flex-wrap items-start justify-between gap-4"}>
      {!embedded && <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">Cơ sở chế biến & đóng gói {config && ` / ${config.code}`}</p>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{title}</h1>
      </div>}
      {stage && config && (
        <div className="flex items-center gap-2">
          <button className={button} disabled={busy || !state || rows.length === 0 || !company.trim()} onClick={() => void exportRegister()}>
            <Download size={16} />Xuất file
          </button>
          <button className={primary} disabled={!state || busy} onClick={() => { setError(''); setEditing('new'); }}>
            <Plus size={16} />Thêm bản ghi
          </button>
        </div>
      )}
      {!stage && (
        <div className="flex gap-2">
          {screen === 'finance' && <button type="submit" form="processing-finance-export" className={button} disabled={!state || busy || financeExporting}>{financeExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{financeExporting ? 'Đang xuất…' : 'Xuất báo cáo Excel'}</button>}
          <button className={button} onClick={() => void load()} title="Tải lại dữ liệu"><RefreshCw size={16} /></button>
        </div>
      )}
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={() => void load()} className="ml-2 underline">Tải lại</button></div>}
    {notice && <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} />{notice}</div>}
    <section aria-label="Bộ lọc sổ" className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-slate-600">
        Tháng
        <select
          className={`${control} mt-1`}
          value={month}
          onChange={e => {
            const m = e.target.value;
            setMonth(m);
            if (m) {
              const [y, mo] = m.split('-').map(Number);
              const lastDay = new Date(y, mo, 0).getDate();
              setFilter(f => ({
                ...f,
                from: `${m}-01`,
                to: `${m}-${String(lastDay).padStart(2, '0')}`,
              }));
            } else {
              setFilter(f => ({ ...f, from: '', to: '' }));
            }
          }}
        >
          <option value="">Tất cả các tháng</option>
          {availableMonths.map(ym => {
            const [y, mo] = ym.split('-');
            return (
              <option key={ym} value={ym}>
                Tháng {mo}/{y}
              </option>
            );
          })}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-600">
        Từ ngày
        <input
          type="date"
          className={`${control} mt-1`}
          value={filter.from}
          onChange={e => {
            setMonth('');
            setFilter({ ...filter, from: e.target.value });
          }}
        />
      </label>
      <label className="text-xs font-semibold text-slate-600">
        Đến ngày
        <input
          type="date"
          min={filter.from}
          className={`${control} mt-1`}
          value={filter.to}
          onChange={e => {
            setMonth('');
            setFilter({ ...filter, to: e.target.value });
          }}
        />
      </label>
      <label className="text-xs font-semibold text-slate-600">
        Tìm lô / người bán / khách hàng
        <div className="relative mt-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className={`${control} pl-9`}
            value={filter.query}
            onChange={e => setFilter({ ...filter, query: e.target.value })}
            placeholder="Nhập từ khóa..."
          />
        </div>
      </label>
    </section>
    {!state && !error && <div className="flex items-center justify-center gap-2 p-16 text-slate-500"><Loader2 className="animate-spin" />Đang tải dữ liệu...</div>}
    {productionLot && state && <ProductionLotDetail lot={state.productionLots?.find(l => l.id === productionLot.id) || productionLot} state={state} onClose={() => setProductionLot(null)} />}
    {state && <>

      {screen === 'overview' && <Overview state={state} filter={filter} />}
      {screen === 'finance' && <Finance company={company} month={month} state={state} filter={filter} busy={busy} mutate={mutate} exporting={financeExporting} setExporting={setFinanceExporting} regions={regions} />}
      {stage && config && <>
        <section className="overflow-hidden rounded-2xl border bg-white">
          {(["receiving"] as Stage[]).includes(stage) ? <HarvestReceivingTable state={state} onLot={setProductionLot} rows={rows} onDetail={setDetail} onEdit={setEditing} /> : <div className="overflow-x-auto">
            <table style={GMP_REGISTER_COLUMN_WIDTHS[stage] ? { width: GMP_REGISTER_COLUMN_WIDTHS[stage]!.reduce((sum, width) => sum + width, 0) } : undefined} className={`[&_th]:whitespace-normal [&_th]:break-words [&_td]:overflow-hidden [&_td]:[overflow-wrap:anywhere] border-collapse border border-slate-300 text-left text-sm ${GMP_REGISTER_COLUMN_WIDTHS[stage] ? 'table-fixed' : 'w-full'} ${stage === 'purchases' ? 'min-w-[1450px] table-fixed' : stage === 'inspection' ? '' : stage === 'receiving' ? 'min-w-[1520px]' : stage === 'preprocessing' ? '' : stage === 'packaging' ? '' : stage === 'sales' ? '' : stage === 'aftersales' ? '' : 'min-w-[850px]'}`}>
              {stage === 'purchases' && (
                <colgroup>
                  <col style={{ width: 120 }} />
                  <col style={{ width: 135 }} />
                  <col style={{ width: 135 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 260 }} />
                  <col style={{ width: 105 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 105 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 110 }} />
                </colgroup>
              )}
              {GMP_REGISTER_COLUMN_WIDTHS[stage] && (
                <colgroup>
                  {GMP_REGISTER_COLUMN_WIDTHS[stage]!.map((width, index) => <col key={index} style={{ width }} />)}
                </colgroup>
              )}
              <thead className="bg-slate-100/90 text-xs text-slate-700">
                {stage === 'receiving' ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày tiếp nhận</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Người bán</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Mã số vùng trồng</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold min-w-[240px] text-center align-middle">Tên vùng trồng và địa chỉ</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Chủng loại</th>
                      <th colSpan={GMP_GRADES.length} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-200/80">Khối lượng tiếp nhận (kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-2 font-semibold text-center align-middle leading-snug">Khối lượng<br />từ chối (kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Tên người tiếp nhận</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2.5 font-semibold text-center align-middle leading-snug w-[135px]">Chuyển sang sản xuất<br />(mã số lô hàng)</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ghi chú</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      {GMP_GRADES.map(g => (
                        <th key={g.key} className="border border-slate-300 px-1 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>
                      ))}
                    </tr>
                  </>
                ) : stage === 'preprocessing' ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Mã số lô hàng</th>
                      <th colSpan={GMP_GRADES.length} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">KL tiếp nhận (kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[85px] leading-snug">Nhà cung cấp<br />(Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[85px] leading-snug">Vận chuyển<br />sạch (Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold text-center align-middle max-w-[130px] leading-snug">Chủng loại, cảm quan, chất lượng nguyên liệu (Đ/K)</th>
                      <th colSpan={2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Đánh giá công đoạn vệ sinh tạp chất (Đ/K)</th>
                      <th colSpan={3} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Đánh giá công đoạn hong khô sản phẩm (Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[85px] leading-snug">CL sau sơ chế<br />(Đ/K)</th>
                      <th colSpan={GMP_GRADES.length} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">KL sau sơ chế (kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold text-center align-middle max-w-[120px] leading-snug">Hành động<br />khắc phục</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Người giám sát</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      {GMP_GRADES.map(g => <th key={'inputWeight' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Vệ sinh bằng<br />bàn chà (Đ/K)</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Thổi sạch bằng<br />xịt cao áp</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Ngày giờ bắt đầu</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Ngày giờ kết thúc</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Tình trạng<br />sản phẩm (Đ/K)</th>
                      {GMP_GRADES.map(g => <th key={'outputWeight' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}
                    </tr>
                  </>
                ) : stage === 'packaging' ? (
                  <>
                    <tr>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày</th>
                      <th rowSpan={3} className="border border-slate-300 px-2 py-2.5 font-semibold text-center align-middle leading-snug">Chủng loại và<br />mã số lô</th>
                      <th rowSpan={2} colSpan={GMP_GRADES.length} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Khối lượng thực tế tiếp nhận đóng gói (kg)</th>
                      <th rowSpan={3} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[110px] leading-snug">Dụng cụ đóng gói đảm bảo sạch (Đ/K)</th>
                      <th rowSpan={3} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[140px] leading-snug">Tình trạng vệ sinh bao bì, tem nhãn trước khi đóng gói (Đ/K)</th>
                      <th colSpan={3} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Đánh giá công đoạn đóng gói- đóng thùng (Đ/K)</th>
                      <th rowSpan={3} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[120px] leading-snug">Chất lượng, quy cách sản phẩm sau đóng gói (Đ/K)</th>
                      <th colSpan={GMP_GRADES.length * 2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Nhập kho thành phẩm</th>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 font-semibold text-center align-middle max-w-[120px] leading-snug">Hành động khắc phục</th>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Người giám sát</th>
                      <th rowSpan={3} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Cân</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Dán tem, nhãn</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Đóng gói</th>
                      <th colSpan={GMP_GRADES.length} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Số lượng nhập kho (thùng)</th>
                      <th colSpan={GMP_GRADES.length} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Khối lượng nhập kho (kg)</th>
                    </tr>
                    <tr>{GMP_GRADES.map(g => <th key={'inputWeight' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}
                      {GMP_GRADES.map(g => <th key={'quantity_boxes' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}
                      {GMP_GRADES.map(g => <th key={'weight_kg' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}</tr>
                  </>
                ) : stage === 'inspection' ? (
                  <>
                    <tr>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày kiểm tra</th>
                      <th rowSpan={3} className="border border-slate-300 px-2 py-2.5 font-semibold text-center align-middle leading-snug">Chủng loại -<br />Mã số lô hàng</th>
                      <th colSpan={GMP_GRADES.length * 2} className="whitespace-nowrap border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Số lượng/ khối lượng tiếp nhận kiểm tra</th>
                      <th colSpan={GMP_GRADES.length} className="whitespace-nowrap border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Số lượng kiểm tra 2% (thùng)</th>
                      <th colSpan={6} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Kết quả kiểm tra phát hiện/ không đạt</th>
                      <th colSpan={GMP_GRADES.length * 2} className="whitespace-nowrap border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Số lượng/ khối lượng đưa qua xuất bán</th>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 font-semibold text-center align-middle max-w-[120px] leading-snug">Biện pháp khắc phục (nếu có)</th>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Người kiểm tra</th>
                      <th rowSpan={3} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      <th colSpan={GMP_GRADES.length} className="whitespace-nowrap border border-slate-300 px-1 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug">Số lượng (thùng)</th>
                      <th colSpan={GMP_GRADES.length} className="whitespace-nowrap border border-slate-300 px-1 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug">Khối lượng (kg)</th>
                      {GMP_GRADES.map(g => <th key={'sample' + g.key} rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">{g.label}</th>)}
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Rệp sáp</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Ấu trùng ruồi<br />đục quả</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Đất</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Lá cây</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Côn trùng<br />khác</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Khác</th>
                      <th colSpan={GMP_GRADES.length} className="whitespace-nowrap border border-slate-300 px-1 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug">Số lượng (thùng)</th>
                      <th colSpan={GMP_GRADES.length} className="whitespace-nowrap border border-slate-300 px-1 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug">Khối lượng (kg)</th>
                    </tr>
                    <tr>{GMP_GRADES.map(g => <th key={'inputBoxes' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}
                      {GMP_GRADES.map(g => <th key={'inputWeight' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}
                      {GMP_GRADES.map(g => <th key={'quantity_boxes' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}
                      {GMP_GRADES.map(g => <th key={'weight_kg' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}</tr>
                  </>
                ) : stage === 'sales' ? (
                  <>
                    <tr>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày</th>
                      <th rowSpan={3} className="border border-slate-300 px-3 py-2.5 font-semibold min-w-[130px] text-center align-middle">Khách hàng</th>
                      <th rowSpan={3} className="border border-slate-300 px-3 py-2.5 font-semibold min-w-[150px] text-center align-middle">Thông tin khách hàng</th>
                      <th colSpan={5 + GMP_GRADES.length * 2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Thông tin lô hàng</th>
                      <th rowSpan={3} className="border border-slate-300 px-3 py-2.5 font-semibold min-w-[130px] text-center align-middle">Đơn vị xuất khẩu</th>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Nước nhập khẩu</th>
                      <th rowSpan={3} className="border border-slate-300 px-3 py-2.5 font-semibold text-center align-middle">Giấy kiểm nghiệm</th>
                      <th rowSpan={3} className="border border-slate-300 px-2.5 py-2.5 text-center align-middle max-w-[140px] leading-snug">Ghi chú</th>
                      <th rowSpan={3} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Mã số lô hàng</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Chủng loại</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[110px]">Điều kiện phương tiện<br />vận chuyển (Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Số container</th>
                      <th colSpan={GMP_GRADES.length} className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Số lượng (thùng)</th>
                      <th colSpan={GMP_GRADES.length} className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Khối lượng (kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug whitespace-nowrap min-w-[105px]">Giá trị<br />(đ)</th>
                    </tr>
                    <tr>{GMP_GRADES.map(g => <th key={'quantity_boxes' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}
                      {GMP_GRADES.map(g => <th key={'weight_kg' + g.key} className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">{g.label}</th>)}</tr>
                  </>
                ) : stage === 'aftersales' ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Ngày</th>
                      <th colSpan={4} className="border border-slate-300 px-3 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Thông tin lô hàng</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100 leading-snug">Ngày rời kho</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100 leading-snug">Ngày đến<br />cửa khẩu xuất</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100 leading-snug">Ngày thông quan<br />lô hàng</th>
                      <th colSpan={4} className="border border-slate-300 px-3 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Kết quả hậu kiểm lô hàng có phát hiện (Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug min-w-[150px]">Phương án xử lý<br />(nếu không đạt)</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-100 min-w-[120px]">Ghi chú</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Thao tác</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 px-2.5 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Mã số lô hàng</th>
                      <th className="border border-slate-300 px-2.5 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Số container</th>
                      <th className="border border-slate-300 px-2 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Số lượng (quả)</th>
                      <th className="border border-slate-300 px-2 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Khối lượng (kg)</th>
                      <th className="border border-slate-300 px-2 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Cadmium</th>
                      <th className="border border-slate-300 px-2 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Vàng O</th>
                      <th className="border border-slate-300 px-2 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">SVGH</th>
                      <th className="border border-slate-300 px-2.5 py-1.5 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Lỗi khác (ghi rõ)</th>
                    </tr>
                  </>
                ) : (
                  <tr>
                    {getStageHeaders(stage).map(h => (
                      <th key={h} className={`border border-slate-300 ${stage === 'purchases' ? 'px-3 py-2.5' : 'px-4 py-3'} font-semibold whitespace-nowrap text-center text-slate-700`}>{h}</th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const code = stage === 'preprocessing' ? preprocessingCode(state, r) : stage === 'purchases'
                    ? ((r.lotCode.includes('demo') || !/^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode))
                      ? formatPurchaseLotCode(r.values?.date || r.lotCode)
                      : r.lotCode)
                    : ((r.lotCode.includes('demo') || !(/^(DG|CB)-/.test(r.lotCode) || /^LH-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode)))
                      ? formatProductionLotCode(r.values?.date || r.lotCode)
                      : r.lotCode);
                  const receivingRecord = stage === 'purchases'
                    ? state.records.receiving.find(rec => rec.sourceId === r.id || rec.lotCode === r.lotCode)
                    : undefined;
                  const purchasePuc = String(r.values?.puc || receivingRecord?.values?.puc || '').trim();
                  const matchedRegion = purchasePuc
                    ? regions.find(region => normalizeUnitCode(region.code) === normalizeUnitCode(purchasePuc))
                    : undefined;
                  const originDisplay = renderPurchaseOriginDisplay(r, receivingRecord, regions);
                  const dateFormatted = String(r.values?.date || '').split('-').reverse().join('/');
                  const statusBadge = (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${isFailed(stage, r.values)
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      }`}>
                      {status(state, stage, r)}
                    </span>
                  );
                  const actions = (
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        className="font-semibold text-emerald-700 hover:underline"
                        onClick={() => setDetail({ ...r, lotCode: code })}
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        className="font-semibold text-slate-500 hover:underline"
                        onClick={() => { setError(''); setEditing(stage === 'purchases' ? { ...r, lotCode: code } : r); }}
                      >
                        Sửa
                      </button>
                    </div>
                  );

                  if (stage === 'receiving') {
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 text-slate-600 font-medium text-center">{dateFormatted}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 font-bold text-slate-900">{String(r.values?.seller || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 font-medium text-center">{String(r.values?.puc || '—')}</td>
                        <td className="border border-slate-200 px-3 py-2.5 text-xs text-slate-700 min-w-[240px] max-w-sm">{originDisplay}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 font-semibold text-slate-900">{String(r.values?.variety || '—')}</td>
                        {GMP_GRADES.map(g => (
                          <td key={g.key} className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 font-mono text-right font-semibold text-slate-800">
                            {fmt(r.values?.['grade' + g.key])}
                          </td>
                        ))}
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 font-mono text-center">
                          {Number(r.values?.rejected || 0) > 0 ? (
                            <span className="text-rose-700 font-bold">{fmt(r.values?.rejected)}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 text-slate-700 font-medium">{formatReceiver(r.values?.receiver)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 text-center w-[135px]">
                          <button
                            type="button"
                            className="inline-block font-bold font-mono text-emerald-700 hover:underline"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                        </td>
                        <td className="border border-slate-200 px-3 py-2.5 text-slate-700">{String(r.values?.notes || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 text-center">{actions}</td>
                      </tr>
                    );
                  }

                  if (stage === 'preprocessing') {
                    const badge = (v?: string | number) => {
                      if (!v) return <span className="text-slate-400">—</span>;
                      const isPass = v === 'Đ';
                      return (
                        <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-bold ${isPass ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                          {v}
                        </span>
                      );
                    };
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-600 font-medium">{dateFormatted}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">
                          <button
                            type="button"
                            className="inline-block font-bold font-mono text-emerald-700 hover:underline"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                        </td>
                        {GMP_GRADES.map(g => <td key={'inputWeight' + g.key} className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.['inputWeight' + g.key])}</td>)}
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.supplierOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.transportOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.materialOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.brushOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.airOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-center text-slate-700">{formatDryingTime(r.values?.dryStart)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-center text-slate-700">{r.values?.dryEnd ? formatDryingTime(r.values.dryEnd) : 'Đang thực hiện'}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.dryOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.qualityOk)}</td>
                        {GMP_GRADES.map(g => <td key={'outputWeight' + g.key} className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(r.values?.['outputWeight' + g.key])}</td>)}
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-600 max-w-[120px] truncate text-center" >{'—'}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-slate-700 font-medium text-center">{formatSupervisor(r.values?.supervisor, idx)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">{actions}</td>
                      </tr>
                    );
                  }

                  if (stage === 'packaging') {
                    const badge = (v?: string | number) => {
                      if (!v) return <span className="text-slate-400">—</span>;
                      const isPass = v === 'Đ';
                      return (
                        <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-bold ${isPass ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {v}
                        </span>
                      );
                    };
                    const variety = String(r.values?.variety || String(r.values?.productLot || '').split(' · ')[0] || '').trim();
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-600 font-medium">{dateFormatted}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">
                          <div className="flex flex-col items-center justify-center gap-1 whitespace-nowrap">
                            <button
                              type="button"
                              className="font-bold font-mono text-emerald-700 hover:underline"
                              onClick={() => setDetail({ ...r, lotCode: code })}
                            >
                              {code}
                            </button>
                            {variety && <span className="text-xs text-slate-500 font-normal">({variety})</span>}
                          </div>
                        </td>
                        {GMP_GRADES.map(g => <td key={'inputWeight' + g.key} className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.['inputWeight' + g.key])}</td>)}
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.toolsOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.labelsOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.weighOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.stickerOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.packOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.qualityOk)}</td>
                        {GMP_GRADES.map(g => <td key={'quantity_boxes' + g.key} className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.['quantity_boxes' + g.key])}</td>)}
                        {GMP_GRADES.map(g => <td key={'weight_kg' + g.key} className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(r.values?.['weight_kg' + g.key])}</td>)}
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-600 max-w-[120px] truncate text-center" >{'—'}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-slate-700 font-medium text-center">{formatSupervisor(r.values?.supervisor, idx)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">{actions}</td>
                      </tr>
                    );
                  }

                  if (stage === 'inspection') {
                    const findingBadge = (v?: string | number) => {
                      if (v === 'Có') {
                        return (
                          <span aria-label="Có phát hiện" className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-rose-200 bg-rose-50 px-1.5 text-xs font-bold text-rose-700">
                            X
                          </span>
                        );
                      }
                      return <span className="text-slate-400 font-medium">—</span>;
                    };
                    const variety = String(r.values?.variety || String(r.values?.productLot || '').split(' · ')[0] || '').trim();
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-600 font-medium">{dateFormatted}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              className="font-bold font-mono text-emerald-700 hover:underline"
                              onClick={() => setDetail({ ...r, lotCode: code })}
                            >
                              {code}
                            </button>
                            {variety && <span className="text-xs text-slate-500 font-normal">({variety})</span>}
                          </div>
                        </td>
                        {GMP_GRADES.map(g => <td key={'inputBoxes' + g.key} className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.['inputBoxes' + g.key])}</td>)}
                        {GMP_GRADES.map(g => <td key={'inputWeight' + g.key} className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.['inputWeight' + g.key])}</td>)}
                        {GMP_GRADES.map(g => <td key={'sample' + g.key} className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-700">{fmt(r.values?.['sample' + g.key])}</td>)}
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.mealybug)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.fly)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.soil)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.leaves)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.insects)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.other)}</td>
                        {GMP_GRADES.map(g => <td key={'quantity_boxes' + g.key} className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.['quantity_boxes' + g.key])}</td>)}
                        {GMP_GRADES.map(g => <td key={'weight_kg' + g.key} className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(r.values?.['weight_kg' + g.key])}</td>)}
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-600 max-w-[120px] truncate text-center" >{'—'}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-slate-700 font-medium text-center">{formatInspector(r.values?.inspector, idx)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">{actions}</td>
                      </tr>
                    );
                  }

                  if (stage === 'sales') {
                    const badge = (v?: string | number) => {
                      if (!v) return <span className="text-slate-400">—</span>;
                      const isOk = v === 'Đạt' || v === 'Đ';
                      return (
                        <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-bold ${isOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {v}
                        </span>
                      );
                    };
                    const inspectionRecord = state.records.inspection.find(item => item.id === r.sourceId);
                    const variety = String(r.values?.variety || '').trim();
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-600 font-medium">{dateFormatted}</td>
                        <td className="border border-slate-200 px-3 py-2.5 font-bold text-slate-900">{String(r.values?.customer || '—')}</td>
                        <td className="border border-slate-200 px-3 py-2.5 text-xs text-slate-600 max-w-[180px]">{String(r.values?.customerInfo || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">
                          <button
                            type="button"
                            className="inline-block font-bold font-mono text-emerald-700 hover:underline"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center font-medium text-slate-800">{variety || '—'}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.transportOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 font-mono text-center text-slate-800">{String(r.values?.container || '—')}</td>
                        {GMP_GRADES.map(g => <td key={'quantity_boxes' + g.key} className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.['quantity_boxes' + g.key] ?? inspectionRecord?.values['quantity_boxes' + g.key])}</td>)}
                        {GMP_GRADES.map(g => <td key={'weight_kg' + g.key} className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(r.values?.['weight_kg' + g.key] ?? inspectionRecord?.values['weight_kg' + g.key])}</td>)}
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(Number(r.values?.total ?? (Number(r.values?.weight_kg || 0) * Number(r.values?.price || 0))))}</td>
                        <td className="border border-slate-200 px-3 py-2.5 text-xs text-slate-700 min-w-[120px]">{String(r.values?.exporter || '—')}<p className="mt-1 text-xs text-slate-500">{handovers.find(h=>h.saleId===r.id)?.status === 'ACCEPTED' ? 'Đã tiếp nhận' : r.values.exporterId ? 'Chờ tiếp nhận' : 'Chưa liên kết tài khoản'}</p></td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center font-bold text-slate-900">{String(r.values?.country || '—')}</td>
                        <td className="border border-slate-200 px-3 py-2.5 text-center"><CertificateLink value={r.values.testCertificate} /></td>
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-600 max-w-[140px] truncate text-center" title={String(r.values?.notes || '')}>{String(r.values?.notes || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">{actions}</td>
                      </tr>
                    );
                  }

                  if (stage === 'aftersales') {
                    const badge = (v?: string | number) => {
                      if (!v) return <span className="text-slate-400">—</span>;
                      const isOk = v === 'Đạt' || v === 'Đ';
                      return (
                        <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-bold ${isOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {v}
                        </span>
                      );
                    };
                    const dateFmt = String(r.values?.date || '').split('-').reverse().join('/');
                    const depDateFmt = String(r.values?.departureDate || '').split('-').reverse().join('/');
                    const borderDateFmt = String(r.values?.borderDate || '').split('-').reverse().join('/');
                    const clearanceDateFmt = String(r.values?.clearanceDate || '').split('-').reverse().join('/');
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 text-center font-medium text-slate-700">
                          {dateFmt || '—'}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">
                          <button
                            type="button"
                            className="inline-block font-bold font-mono text-emerald-700 hover:underline"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center font-mono text-xs font-semibold text-slate-800">
                          {String(r.values?.container || '—')}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">
                          {fmt(r.values?.fruitCount)}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right font-bold text-emerald-800">
                          {fmt(r.values?.weight_kg)}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-700">
                          {depDateFmt || '—'}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-700">
                          {borderDateFmt || '—'}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center font-medium text-slate-800">
                          {clearanceDateFmt || '—'}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 text-center">
                          {badge(r.values?.cadmiumOk)}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 text-center">
                          {badge(r.values?.auramineOk)}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 text-center">
                          {badge(r.values?.pestOk)}
                        </td>
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-700 text-center min-w-[90px]">
                          {String(r.values?.otherDefects || '—')}
                        </td>
                        <td className="border border-slate-200 px-3 py-2.5 text-xs text-slate-700 min-w-[140px] max-w-xs text-center" title={String(r.values?.treatmentPlan || '')}>
                          {String(r.values?.treatmentPlan || '—')}
                        </td>
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-600 max-w-[140px] truncate text-center" title={String(r.values?.notes || '')}>
                          {String(r.values?.notes || '—')}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center">{actions}</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 text-slate-600 font-medium text-center">{dateFormatted}</td>
                      <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center w-[135px]">
                        <button className="text-center font-bold font-mono text-emerald-700 hover:underline" onClick={() => setDetail({ ...r, lotCode: code })}>
                          {code}
                        </button>
                      </td>

                      {stage === 'purchases' && (
                        <>
                          <td className="border border-slate-200 px-3 py-2.5 font-normal text-slate-900 whitespace-nowrap">
                            {String(r.values?.seller || '—')}
                          </td>
                          <td className="border border-slate-200 px-2 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap text-center">
                            {formatSellerPhone(r.values?.seller, r.values?.phone)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2.5 font-mono text-xs font-medium text-slate-700 whitespace-nowrap text-center">
                            {purchasePuc || '—'}
                          </td>
                          <td className="border border-slate-200 px-3 py-2.5 text-xs text-slate-700 min-w-[240px] max-w-sm">
                            {originDisplay}
                          </td>
                          <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 text-slate-700 text-center">{String(r.values?.variety || receivingRecord?.values.variety || '—')}</td>
                          <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 font-mono font-normal text-slate-900 text-right">{fmt(r.values?.weight)}</td>
                          <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 text-right">{fmt(r.values?.price)}</td>
                          <td className="border border-slate-200 whitespace-nowrap px-3 py-2.5 font-mono font-black text-emerald-800 text-right">{fmt(r.values?.total)}</td>
                        </>
                      )}

                      <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 text-center"><div className="flex justify-center">{statusBadge}</div></td>
                      <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 text-center">{actions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && (
              <div className="p-14 text-center text-sm text-slate-500">
                <ClipboardList className="mx-auto mb-3 text-slate-300" size={36} />
                Chưa có bản ghi phù hợp. Điều chỉnh bộ lọc hoặc thêm bản ghi mới.
              </div>
            )}
          </div>}
        </section>
      </>}
      {stage === 'receiving' && editing === 'new' && <NewHarvestReceivingForm productionState={state} records={state.records.receiving} busy={busy} error={error} onClose={() => setEditing(null)} onSave={async (id, values, confirm) => { const res = await mutate({ action: 'receiving', record: { id, values }, confirm }); if (res.ok) setEditing(null); }} />}
      {stage === 'receiving' && editing && editing !== 'new' && (editing.draft ? <HarvestReceivingForm productionState={state} record={editing} busy={busy} error={error} onClose={() => setEditing(null)} onSave={async (values, confirm) => { const res = await mutate({ action: 'receiving', record: { id: editing.id, values }, confirm }); if (res.ok) setEditing(null); }} /> : <ReceivingRecordForm state={state} record={editing} busy={busy} error={error} onClose={() => setEditing(null)} onSave={async values => { const res = await mutate({ action: 'receivingEdit', record: { id: editing.id, values } }); if (res.ok) setEditing(null); }} />)}
      {stage && stage !== 'receiving' && editing && <RecordForm exporters={exporters} state={state} regions={regions} stage={stage} record={editing === 'new' ? undefined : editing} busy={busy} error={error} onClose={() => setEditing(null)} onSave={async (record) => { const res = await mutate({ action: 'record', stage, record, ...(stage === 'sales' && editing !== 'new' ? { baseRecord: editing } : {}) }); if (res.ok) setEditing(null); }} />}
      {stage && detail && <RegisterDetail state={state} stage={stage} record={detail} onClose={() => setDetail(null)} />}
    </>}
  </div>;
}
function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={`rounded-2xl border bg-white p-5 ${warning ? 'border-amber-100' : 'border-slate-200'}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${warning ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p></div>; }
function Overview({ state, filter }: { state: GmpState; filter: Filter }) {
  const filtered = (s: Stage) => state.records[s].filter(r => !r.draft && matches(r, filter));
  const pending = (s: Stage) => sources(state, s).filter(r => matches(r, filter));
  const warehouse = filtered('packaging').filter(r => !state.records.sales.some(x => x.lotCode === r.lotCode && !x.draft));
  const metrics = [['Tổng nguyên liệu thu hoạch (kg)', filtered('receiving').reduce((s, r) => s + Number(r.values.initialWeight || 0), 0)], ['Chờ tiếp nhận (lô)', filtered('receiving').filter(r => r.draft).length], ['Đang sơ chế (lô)', pending('preprocessing').length], ['Đang đóng gói (lô)', pending('packaging').length], ['Thành phẩm trong kho (kg)', warehouse.reduce((s, r) => s + Number(r.values.weight_kg), 0)], ['Sẵn sàng xuất (lô)', pending('sales').length], ['Đã xuất (kg)', filtered('sales').reduce((s, r) => s + Number(r.values.weight_kg), 0)]] as const;
  return <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <Metric key={label} label={label} value={fmt(value)} />)}</div><section className="rounded-2xl border bg-white p-6"><h2 className="text-lg font-bold">Tiến độ xử lý lô hàng</h2><p className="mt-1 text-sm text-slate-500">Mở công đoạn để tiếp tục xử lý các lô đang chờ.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{STAGES.slice(1).map((s, i) => { const count = s === 'inspection' ? filtered('packaging').filter(r => !state.records.inspection.some(x => x.sourceId === r.id)).length : s === 'aftersales' ? filtered('sales').filter(r => !state.records.aftersales.some(x => x.sourceId === r.id && !isFailed('aftersales', x.values))).length : pending(s).length; return <Link key={s} href={`/dashboard/processing/${REGISTERS[s].path}`} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 hover:border-emerald-300 hover:bg-emerald-50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-700">0{i + 1}</span><div className="flex-1"><p className="font-semibold text-slate-800">{REGISTERS[s].title}</p><p className="text-xs text-slate-500">{REGISTERS[s].code}</p></div><b>{count} lô</b><ArrowRight size={16} className="text-slate-400" /></Link>; })}</div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{latestRecords(state, 'inspection').filter(r => matches(r, filter) && isFailed('inspection', r.values)).length} lô kiểm tra không đạt đang chờ khắc phục và kiểm tra lại.</p></section></>;
}
function SalesGradeFields({values}:{values:Values}) {
  return <>{(['quantity_boxes','weight_kg'] as const).map(prefix=><fieldset key={prefix} className="col-span-full rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold">{prefix==='quantity_boxes'?'Số lượng theo loại (thùng)':'Khối lượng theo loại (kg)'}</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{GMP_GRADES.map(g=><label key={g.key} className="text-xs text-slate-600">{g.label}<input className={`${control} mt-1 bg-slate-50`} readOnly value={fmt(values[prefix+g.key])}/></label>)}</div></fieldset>)}</>;
}
function DryingTimeField({ fieldKey, required, value, start, onChange }: { fieldKey: string; required?: boolean; value: unknown; start: unknown; onChange: (value: string) => void }) {
  const initial = dryingInput(value);
  const [date, setDate] = useState(initial.slice(0, 10));
  const [time, setTime] = useState(initial.slice(11) || (/^\d{2}:\d{2}$/.test(String(value || '')) ? String(value) : ''));
  const fallback = fieldKey === 'dryEnd' ? dryingInput(start).slice(0, 10) : '';
  const effectiveDate = date || fallback;
  const suffix = fieldKey === 'dryStart' ? 'bắt đầu' : 'kết thúc';
  const changeTime = (nextTime: string) => {
    setTime(nextTime);
    onChange(nextTime || date ? `${effectiveDate}T${nextTime}` : '');
  };
  return <div className="sm:col-span-2"><div className="grid gap-4 sm:grid-cols-2">
    <label className="text-xs font-semibold text-slate-600">Ngày {suffix}{required ? ' *' : ''}<input className={`${control} mt-1`} type="date" required={required || !!time} value={effectiveDate} onChange={e => { setDate(e.target.value); onChange(e.target.value || time ? `${e.target.value}T${time}` : ''); }} /></label>
    <div className="text-xs font-semibold text-slate-600"><span id={`${fieldKey}-time-label`}>Giờ {suffix}{required ? ' *' : ''}</span><div role="group" aria-labelledby={`${fieldKey}-time-label`} className="mt-1 flex items-center gap-2">
      <select aria-label={`Giờ ${suffix} (00–23)`} className={control} required={required || !!date || !!time} value={time.slice(0, 2)} onChange={e => changeTime(e.target.value ? `${e.target.value}:${time.slice(3, 5) || '00'}` : '')}><option value="">Giờ</option>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(hour => <option key={hour} value={hour}>{hour}</option>)}</select>
      <span aria-hidden="true" className="text-base">:</span>
      <select aria-label={`Phút ${suffix} (00–59)`} className={control} required={required || !!date || !!time} value={time.slice(3, 5)} onChange={e => changeTime(e.target.value ? `${time.slice(0, 2) || '00'}:${e.target.value}` : '')}><option value="">Phút</option>{Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(minute => <option key={minute} value={minute}>{minute}</option>)}</select>
    </div></div>
  </div>{!!value && !dryingInput(value) && <p className="mt-1 text-xs text-amber-700">Cần bổ sung ngày giờ · Giá trị đã ghi: {String(value)}</p>}</div>;
}
function RecordForm({ exporters, state, regions, stage, record, busy, error, onClose, onSave }: { exporters: {id:string;code:string;name:string}[]; state: GmpState; regions: RegionSource[]; stage: Stage; record?: GmpRecord; busy: boolean; error: string; onClose: () => void; onSave: (r: { id?: string; sourceId: string; season: string; values: Values }) => Promise<void> }) {
  const [uploading, setUploading] = useState(false);
  const [contactError, setContactError] = useState('');
  const available = sources(state, stage);
  const [sourceId, setSourceId] = useState(record?.sourceId || '');
  const [season, setSeason] = useState(record?.season || '2025-2026');
  const [values, setValues] = useState<Values>(record?.values || { date: today() });
  const source = (stage === 'preprocessing' ? productionSources(state, 'DG') : state.records[STAGES[STAGES.indexOf(stage) - 1]])?.find(r => r.id === sourceId);
  const inherited = inherit(state, stage, source);
  const selectedRegion = regions.find(region => normalizeUnitCode(region.code) === normalizeUnitCode(String(inherited.puc || values.puc || '')));
  const regionValues: Values = stage === 'receiving' && selectedRegion ? {
    puc: selectedRegion.code,
    origin: [selectedRegion.name, selectedRegion.address].filter(Boolean).join(' - '),
  } : {};
  const merged: Values = { ...values, ...inherited, ...regionValues, ...(record ? { lotCode: record.lotCode } : {}) };
  const set = (key: string, value: string) => setValues(v => ({ ...v, [key]: value, ...(stage === 'sales' && key === 'price' ? {total: Number(inherited.weight_kg || 0) * Number(value || 0)} : {}) }));
  const certificateOnlyEdit = !!record && Object.entries(values).every(([key, value]) => key === 'testCertificate' || String(value) === String(record.values[key] ?? ''));
  const needsCorrection = isFailed(stage, merged);
  const fields = REGISTERS[stage].fields.filter(field => !(field.internal && field.inherited)).map(field => stage === 'preprocessing' && field.key.startsWith('qualityOk') ? { ...field, required: Number(merged['inputWeight' + field.key.slice(9)] || 0) > 0 } : (field.key === 'correction' || field.key === 'treatmentPlan') ? { ...field, required: needsCorrection } : field);
  const groups = stage === 'sales' ? ['Thông tin giao dịch', 'Thông tin lô hàng'] : Array.from(new Set(fields.map(f => f.internal ? 'Informations' : f.group || 'Thông tin chung')));
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => { const handle = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, [busy, onClose]);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (uploading) return;
    let submitted = stage === 'receiving' ? { ...values, puc: merged.puc, origin: merged.origin } : values;
    if (stage === 'sales' && !certificateOnlyEdit) {
      try { submitted = parseSalesContact(submitted); setContactError(''); }
      catch (error) { setContactError(error instanceof Error && 'issues' in error ? (error as {issues:{message:string}[]}).issues[0].message : 'Kiểm tra họ tên và số điện thoại liên hệ.'); return; }
    }
    await onSave({ id: record?.id, sourceId, season, values: submitted });
  }
  const formTitle = ({ purchases: "GHI NHẬN THU MUA", receiving: "GHI NHẬN NHẬP HÀNG", preprocessing: "GHI NHẬN TIẾP NHẬN & SƠ CHẾ" } as Partial<Record<Stage, string>>)[stage] || `${record ? "Sửa bản ghi" : "Thêm bản ghi"} · ${REGISTERS[stage].title}`;
  return <ModalPortal><div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"><form role="dialog" aria-modal="true" aria-label={formTitle} onSubmit={submit} className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ${stage === 'preprocessing' ? 'max-w-[1440px]' : 'max-w-5xl'}`}><div className="flex items-start justify-between border-b p-5"><div><h2 className="text-xl font-bold">{formTitle}</h2></div><button type="button" aria-label="Đóng biểu mẫu" onClick={onClose} disabled={busy}><X /></button></div><div className="space-y-5 overflow-y-auto p-5">
    {(error || contactError) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error || contactError}</p>}
    {stage === 'sales' && <p className="text-sm text-slate-600">Khách hàng là cá nhân liên hệ trong giao dịch hoặc bàn giao hàng. Thông tin khách hàng chỉ ghi số điện thoại của người này.</p>}
    {stage === 'purchases' ? <label className="block text-sm font-semibold">Niên vụ *<input className={`${control} mt-1`} required pattern="\d{4}-\d{4}" value={season} onChange={e => setSeason(e.target.value)} /><p className="mt-2 text-xs font-normal text-slate-500">Mã hồ sơ thu mua được tự sinh theo định dạng TM-năm-ngaythang khi lưu.</p></label> : <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><label className="block text-sm font-bold text-emerald-900">{stage === 'receiving' ? 'Hồ sơ thu mua' : 'Lô hàng từ công đoạn trước'} *<select required disabled={!!record} className={`${control} mt-2`} value={sourceId} onChange={e => { setSourceId(e.target.value); setValues({ date: today() }); }}><option value="">Chọn lô đủ điều kiện...</option>{(record && source ? [source] : available).map(r => <option key={r.id} value={r.id}>{r.lotCode} · {r.values.seller || r.values.productLot || r.values.customer || ''}</option>)}</select></label>{!record && !available.length && <p className="mt-2 text-sm text-amber-800">Chưa có lô đủ điều kiện. Hoàn thành công đoạn trước để tiếp tục.</p>}{source && <p className="mt-3 text-sm text-emerald-800">Nguồn: {source.values.date} · Niên vụ {source.season} {stage === 'receiving' && `· Khối lượng mua: ${fmt(source.values.weight)} kg`} · Thông tin nguồn được tự động kế thừa.</p>}</div>}
    {stage === 'preprocessing' && source && <div className="rounded-xl bg-slate-50 p-4 text-sm"><p>Chủng loại: <b>{inherited.variety}</b> · Mã số lô: <b>{source.lotCode}</b></p><p className="mt-2">Nhà cung cấp: <b>{inherited.supplier}</b></p><p className="mt-2 text-slate-500">Thông tin kế thừa từ Nhập hàng / Hồ sơ thu mua. Đ = Đạt; K = Không đạt. Chọn K phải nhập Hành động khắc phục.</p></div>}
    {stage === 'inspection' && source && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Mẫu kiểm tra bằng 2% số thùng của từng phân loại, làm tròn lên: {GMP_GRADES.map(g => `${g.label}: ${Math.ceil(Number(source.values['quantity_boxes' + g.key] || 0) * 0.02)} thùng`).join(' · ')}. Khi phát hiện lỗi, ghi lượng đưa qua xuất bán bằng 0; sau khắc phục hãy thêm lần kiểm tra mới để giữ lịch sử.</p>}
    {stage === 'aftersales' && <p className="text-sm text-slate-500">Ghi nhận thông tin thông quan và kết quả hậu kiểm sau xuất bán. Xác nhận kết quả: Đ = Đạt; K = Không đạt.</p>}
    {groups.map(group => <fieldset key={group} className="rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-bold text-slate-700">{group === 'Informations' ? 'Thông tin bổ sung (không đưa vào sổ GMP)' : group}</legend><div className={`grid gap-4 sm:grid-cols-2 ${stage === 'preprocessing' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>{stage === 'sales' && group === 'Thông tin lô hàng' && <SalesGradeFields values={merged} />}{fields.filter(f => (f.internal ? 'Informations' : f.group || 'Thông tin chung') === group).map(f => stage === 'sales' && (f.key === 'customer' || f.key === 'customerInfo') ? <SalesContactField key={f.key} fieldKey={f.key} required={!certificateOnlyEdit} value={String(merged[f.key] || '')} onChange={value => set(f.key, value)} /> : f.type === 'image' ? <CertificateUpload key={f.key} value={merged[f.key]} onChange={value => set(f.key, value)} onBusy={setUploading} /> : f.type === 'datetime-local' ? <DryingTimeField key={`${sourceId}-${f.key}`} fieldKey={f.key} required={f.required} value={merged[f.key]} start={merged.dryStart} onChange={value => set(f.key, value)} /> : <label key={f.key} className={`min-w-0 text-xs font-semibold leading-5 text-slate-600 ${stage === 'preprocessing' ? 'flex flex-col justify-end' : 'block'}`}><span>{f.label}{f.required ? ' *' : ''}</span>{stage === 'sales' && f.key === 'exporterId' ? <select className={`${control} mt-1`} required={!record || !!record.values.exporterId} value={String(merged.exporterId || '')} onChange={e => set('exporterId', e.target.value)}><option value="">Chọn đơn vị xuất khẩu...</option>{record?.values.exporter && !record.values.exporterId && <option value="" disabled>Trước đây: {String(record.values.exporter)} · cần liên kết tài khoản</option>}{record?.values.exporterId && !exporters.some(x=>x.id===record.values.exporterId) && <option value={String(record.values.exporterId)} disabled>{String(record.values.exporter || 'Đơn vị ngừng hoạt động')}</option>}{exporters.map(x=><option key={x.id} value={x.id}>{x.name} · {x.code}</option>)}</select> : stage === 'purchases' && f.key === 'puc' ? <select className={`${control} mt-1`} required value={String(merged[f.key] ?? '')} onChange={e => set(f.key, e.target.value)}><option value="">Chọn vùng trồng...</option>{regions.map(region => <option key={region.code} value={region.code}>{region.code} · {region.name} · {region.address}</option>)}</select> : f.type === 'check' || f.type === 'finding' ? <select className={`${control} mt-1`} required={f.required} value={String(merged[f.key] ?? '')} onChange={e => set(f.key, e.target.value)}><option value="">Chưa ghi nhận</option>{(f.type === 'check' ? [['Đ', 'Đ — Đạt'], ['K', 'K — Không đạt']] : [['Không', 'Không phát hiện'], ['Có', 'Có phát hiện']]).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select> : <input className={`${control} mt-1`} type={stage === 'sales' && f.key === 'customerInfo' ? 'tel' : f.type || 'text'} min={f.type === 'number' ? 0 : undefined} step={f.type === 'number' ? (f.key.startsWith('quantity_') || f.key.startsWith('sample') ? 1 : 'any') : undefined} required={f.required} disabled={f.inherited} value={f.key === 'price' ? String(values.price ?? '') : f.key === 'total' ? (stage === 'sales' ? (values.total !== undefined ? String(values.total) : '') : Number(values.weight || 0) * Number(values.price || 0)) : String(merged[f.key] ?? '')} placeholder={f.key === 'receiver' ? 'Nhập tên người tiếp nhận...' : f.key === 'supervisor' ? 'Nhập tên người giám sát...' : f.key === 'inspector' ? 'Nhập tên người kiểm tra...' : f.key === 'phone' ? 'Số điện thoại liên hệ...' : f.inherited ? 'Tự động khi lưu / chọn lô' : ''} onChange={e => set(f.key, e.target.value)} />}</label>)}</div></fieldset>)}
    {stage === 'preprocessing' && <p aria-live="polite" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold">Thời lượng hong khô: {dryingDuration(merged.dryStart, merged.dryEnd)} · Giờ Việt Nam (UTC+7)</p>}
    {stage === 'receiving' && source && <p className="rounded-xl bg-slate-50 p-3 text-sm">Đối soát: {fmt(gradeTotal(values, 'grade') + Number(values.rejected || 0))} / {fmt(source.values.weight)} kg (tiếp nhận + từ chối / thu mua)</p>}
  </div><div className="flex justify-end gap-3 border-t bg-slate-50 p-4"><button type="button" className={button} onClick={onClose} disabled={busy}>Hủy</button><button className={primary} disabled={busy || uploading || (stage !== 'purchases' && !sourceId)}>{busy ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}Lưu bản ghi</button></div></form></div></ModalPortal>;
}
function Finance({ company, month, state, filter, busy, mutate, exporting, setExporting, regions = [] }: { company: string; month: string; state: GmpState; filter: Filter; busy: boolean; mutate: (p: object) => Promise<{ ok: boolean; error?: string }>; exporting: boolean; setExporting: (value: boolean) => void; regions?: RegionSource[] }) {
  const tabs = ['XUẤT BÁN', 'THU MUA', 'CHI PHÍ', 'NHẬT KÝ DÒNG TIỀN', 'BIỂU ĐỒ THỐNG KÊ'];
  const [tab, setTab] = useState(0);
  const [pay, setPay] = useState<{ record: GmpRecord; direction: 'IN' | 'OUT' } | null>(null);
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(today()); const [method, setMethod] = useState('Chuyển khoản'); const [error, setError] = useState('');
  const [expenseModal, setExpenseModal] = useState<{ id?: string; date: string; category: string; content: string; lotCode?: string; method?: string; amount: string } | null>(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');
  const [exportError, setExportError] = useState('');

  const sales = state.records.sales
    .filter(r => !r.draft && matches(r, filter))
    .sort((a, b) => String(b.values?.date || '').localeCompare(String(a.values?.date || '')));
  const purchases = state.records.purchases
    .filter(r => !r.draft && matches(r, filter))
    .sort((a, b) => String(b.values?.date || '').localeCompare(String(a.values?.date || '')));
  const total = (r: GmpRecord) => Number(r.values.total ?? Number(r.values.weight_kg) * Number(r.values.price));
  const paid = (r: GmpRecord) => state.payments.filter(p => p.recordId === r.id).reduce((s, p) => s + p.amount, 0);
  const payments = state.payments
    .filter(p => (!filter.from || p.date >= filter.from) && (!filter.to || p.date <= filter.to) && [...state.records.purchases, ...state.records.sales].some(r => r.id === p.recordId && (!filter.season || r.season === filter.season) && (!filter.query || matches(r, { ...filter, from: '', to: '' }))))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const rawExpenses = state.expenses || [];
  const expenses = rawExpenses
    .filter(e => {
      if (filter.from && e.date < filter.from) return false;
      if (filter.to && e.date > filter.to) return false;
      if (!filter.query) return true;
      const target = `${e.category} ${e.content} ${e.lotCode || ''}`.toLocaleLowerCase('vi');
      const q = filter.query.toLocaleLowerCase('vi');
      return target.includes(q) || target.replace(/,/g, '').includes(q.replace(/,/g, ''));
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const displayedExpenses = expenseCategoryFilter
    ? expenses.filter(e => e.category === expenseCategoryFilter)
    : expenses;

  const sumExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const availableLots = useMemo(() => {
    const codes = new Set<string>();
    Object.values(state.records).forEach(stageRecords => {
      stageRecords.forEach(r => {
        if (r.lotCode && !r.draft) codes.add(r.lotCode);
      });
    });
    return Array.from(codes).sort();
  }, [state.records]);

  interface CashFlowItem {
    id: string;
    date: string;
    direction: 'IN' | 'OUT';
    content: string;
    subContent?: string;
    refCode: string;
    method: string;
    amount: number;
  }

  const cashFlowItems: CashFlowItem[] = useMemo(() => {
    const paymentItems: CashFlowItem[] = payments.map(p => {
      const isSales = p.direction === 'IN';
      const linkedRecord = (isSales ? state.records.sales : state.records.purchases).find(r => r.id === p.recordId);
      const lotCode = isSales ? linkedRecord?.lotCode || '' : String(linkedRecord?.values.purchaseCode || linkedRecord?.lotCode || '');
      const partner = isSales ? String(linkedRecord?.values?.customer || '') : String(linkedRecord?.values?.seller || '');
      return {
        id: p.id,
        date: p.date,
        direction: p.direction,
        content: isSales ? 'Thu tiền bán hàng' : 'Thanh toán thu mua',
        subContent: partner || undefined,
        refCode: lotCode,
        method: p.method || (isSales ? 'Chuyển khoản' : 'Tiền mặt'),
        amount: p.amount,
      };
    });

    const expenseItems: CashFlowItem[] = expenses.map(e => {
      const catTitle = e.category ? (e.category.startsWith('Chi phí') ? e.category : `Chi phí ${e.category}`) : 'Chi phí hoạt động';
      return {
        id: e.id,
        date: e.date,
        direction: 'OUT',
        content: catTitle,
        subContent: e.content,
        refCode: e.lotCode || '',
        method: e.method || 'Chuyển khoản',
        amount: e.amount,
      };
    });

    return [...paymentItems, ...expenseItems].sort((a, b) => {
      const cmp = String(b.date || '').localeCompare(String(a.date || ''));
      if (cmp !== 0) return cmp;
      if (a.direction !== b.direction) {
        return a.direction === 'IN' ? -1 : 1;
      }
      return a.id.localeCompare(b.id);
    });
  }, [payments, expenses, state.records.purchases, state.records.sales]);

  const receivable = sales.reduce((s, r) => s + total(r) - paid(r), 0); const payable = purchases.reduce((s, r) => s + total(r) - paid(r), 0);
  const sumSales = sales.reduce((s, r) => s + total(r), 0); const sumPurchases = purchases.reduce((s, r) => s + total(r), 0);

  function openPay(r: GmpRecord, direction: 'IN' | 'OUT') {
    const remaining = Math.max(0, total(r) - paid(r));
    setPay({ record: r, direction });
    setAmount(remaining > 0 ? String(remaining) : '');
    const rDate = String(r.values?.date || '');
    setDate(rDate && rDate > today() ? rDate : today());
    setError('');
  }

  async function exportReport() {
    if (exporting || busy) return;
    setExporting(true); setExportError('');
    try {
      const { buildFinanceWorkbook, financeExcelDate } = await import('@/lib/processing-finance-export');
      const salesHeaders = ['Ngày', 'Mã số lô hàng', 'Đối tác', 'Giá trị (đ)', 'Đã thanh toán (đ)', 'Còn lại (đ)', 'Trạng thái'];
      const salesRows = sales.map(r => [
        financeExcelDate(r.values.date), r.lotCode, String(r.values.customer || ''),
        total(r), paid(r), Math.max(0, total(r) - paid(r)),
        total(r) <= paid(r) ? 'Đã thu đủ' : paid(r) > 0 ? 'Thanh toán một phần' : 'Chưa thanh toán',
      ]);
      const purchaseHeaders = ['Ngày', 'Mã số lô hàng', 'Đối tác', 'Liên hệ', 'Mã số vùng trồng', 'Tên vùng trồng và địa chỉ', 'Giá trị (đ)', 'Đã thanh toán (đ)', 'Còn lại (đ)', 'Trạng thái'];
      const purchaseRows = purchases.map(r => {
        const receivingRecord = state.records.receiving.find(rec => rec.sourceId === r.id || rec.lotCode === r.lotCode);
        const purchasePuc = String(r.values?.puc || receivingRecord?.values?.puc || '').trim();
        const matchedRegion = purchasePuc
          ? regions.find(region => normalizeUnitCode(region.code) === normalizeUnitCode(purchasePuc))
          : undefined;
        const originText = matchedRegion
          ? (matchedRegion.name + (matchedRegion.address ? ` - ${matchedRegion.address}` : ''))
          : cleanText(r.values?.origin || receivingRecord?.values?.origin) || '—';
        return [
          financeExcelDate(r.values.date),
          r.lotCode,
          String(r.values.seller || ''),
          formatSellerPhone(r.values?.seller, r.values?.phone),
          purchasePuc || '—',
          originText,
          total(r),
          paid(r),
          Math.max(0, total(r) - paid(r)),
          total(r) <= paid(r) ? 'Đã thanh toán' : paid(r) > 0 ? 'Thanh toán một phần' : 'Chưa thanh toán',
        ];
      });
      const bytes = await buildFinanceWorkbook([
        { name: tabs[0], headers: salesHeaders, rows: salesRows, moneyColumns: [4, 5, 6] },
        { name: tabs[1], headers: purchaseHeaders, rows: purchaseRows, moneyColumns: [7, 8, 9] },
        {
          name: tabs[2], headers: ['Ngày', 'Mã chi phí', 'Nhóm chi phí', 'Nội dung', 'Lô hàng liên quan', 'Phương thức', 'Số tiền (đ)'],
          rows: expenses.map((e, index) => [financeExcelDate(e.date), e.code || 'CP-' + (e.date || '2026').slice(0, 4) + '-' + String(index + 1).padStart(3, '0'), e.category, e.content, e.lotCode || '', e.method || 'Chuyển khoản', e.amount]), moneyColumns: [7]
        },
        {
          name: tabs[3], headers: ['Ngày', 'Loại giao dịch', 'Nhóm/Nghiệp vụ', 'Đối tượng / Diễn giải', 'Lô hàng liên quan', 'Phương thức', 'Thu (đ)', 'Chi (đ)'],
          rows: cashFlowItems.map(item => [financeExcelDate(item.date), item.direction === 'IN' ? 'Thu' : 'Chi', item.content, item.subContent || '', item.refCode, item.method, item.direction === 'IN' ? item.amount : 0, item.direction === 'OUT' ? item.amount : 0]), moneyColumns: [7, 8]
        },
      ], company);
      downloadFile(bytes as BlobPart, 'BÁO CÁO TÀI CHÍNH' + (month ? '-' + month : '') + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Không thể xuất báo cáo Excel. Vui lòng thử lại.');
    } finally { setExporting(false); }
  }

  return <><form id="processing-finance-export" onSubmit={event => { event.preventDefault(); void exportReport(); }} />{exportError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Giá trị xuất bán (đ)" value={fmt(sumSales)} /><Metric label="Giá trị thu mua (đ)" value={fmt(sumPurchases)} /><Metric label="Tổng chi phí khác (đ)" value={fmt(sumExpenses)} /><Metric label="Phải thu còn lại (đ)" value={fmt(receivable)} /><Metric label="Phải trả còn lại (đ)" value={fmt(payable)} warning /></div><nav aria-label="Finance" className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:grid-cols-5 sm:gap-2 sm:rounded-3xl sm:p-2">
    {tabs.map((name, i) => {
      const Icon = [TrendingUp, ShoppingCart, Receipt, Wallet, BarChart3][i];
      return <button type="button" key={name} aria-pressed={tab === i} onClick={() => setTab(i)} className={"flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-bold leading-tight transition sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm " + (tab === i ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700")}><Icon aria-hidden="true" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" /><span>{name}</span></button>;
    })}
  </nav><section className="overflow-hidden rounded-2xl border bg-white">
      {tab < 2 && <div className="overflow-x-auto"><table className={`w-full ${tab === 1 ? 'min-w-[1300px]' : 'min-w-[850px]'} text-left text-sm border-collapse border border-slate-300`}><thead className="bg-slate-100/90 text-xs text-slate-700">
        <tr>
          {tab === 0 ? (
            ['Ngày xuất bán', 'Mã số lô hàng', 'Đối tác', 'Giá trị (đ)', 'Đã thanh toán (đ)', 'Còn lại (đ)', 'Ngày thanh toán', 'Trạng thái', 'Thao tác'].map(h => (
              <th className={`border border-slate-300 px-4 py-3 font-semibold text-center ${h === 'Mã số lô hàng' ? 'w-[135px] whitespace-nowrap' : ''}`} key={h}>{h}</th>
            ))
          ) : (
            ['Ngày thu mua', 'Mã số lô hàng', 'Đối tác', 'Liên hệ', 'Mã số vùng trồng', 'Tên vùng trồng và địa chỉ', 'Giá trị (đ)', 'Đã thanh toán (đ)', 'Còn lại (đ)', 'Ngày thanh toán', 'Trạng thái', 'Thao tác'].map(h => (
              <th className={`border border-slate-300 ${h === 'Tên vùng trồng và địa chỉ' ? 'px-3 py-3 min-w-[240px]' : 'px-3 py-3'} font-semibold text-center ${h === 'Mã số lô hàng' ? 'w-[135px] whitespace-nowrap' : ['Liên hệ', 'Mã số vùng trồng', 'Ngày thu mua', 'Đối tác'].includes(h) ? 'whitespace-nowrap' : ''}`} key={h}>{h}</th>
            ))
          )}
        </tr>
      </thead>
        <tbody>
          {(tab === 0 ? sales : purchases).map(r => {
            const isPaidFull = total(r) <= paid(r);
            const isPartiallyPaid = paid(r) > 0 && !isPaidFull;
            const remaining = Math.max(0, total(r) - paid(r));
            const receivingRecord = tab === 1
              ? state.records.receiving.find(rec => rec.sourceId === r.id || rec.lotCode === r.lotCode)
              : undefined;
            const purchasePuc = tab === 1
              ? String(r.values?.puc || receivingRecord?.values?.puc || '').trim()
              : '';
            const originDisplay = tab === 1
              ? renderPurchaseOriginDisplay(r, receivingRecord, regions)
              : null;

            return (
              <tr key={r.id} className="hover:bg-slate-50/70 transition">
                <td className="border border-slate-200 px-4 py-3 text-center whitespace-nowrap font-medium text-slate-700">{formatDateVN(r.values.date)}</td>
                <td className="border border-slate-200 px-3 py-3 font-semibold text-emerald-700 whitespace-nowrap text-center font-mono w-[135px]">{r.lotCode}</td>
                <td className={`border border-slate-200 ${tab === 1 ? 'px-3 py-3 font-normal text-slate-900 whitespace-nowrap' : 'px-4 py-3'}`}>
                  {tab === 0 ? String(r.values.customer || '—') : String(r.values.seller || '—')}
                </td>
                {tab === 1 && (
                  <>
                    <td className="border border-slate-200 px-2 py-3 font-mono text-xs text-slate-600 whitespace-nowrap text-center">
                      {formatSellerPhone(r.values?.seller, r.values?.phone)}
                    </td>
                    <td className="border border-slate-200 px-2 py-3 font-mono text-xs font-medium text-slate-700 whitespace-nowrap text-center">
                      {purchasePuc || '—'}
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-xs text-slate-700 min-w-[240px] max-w-sm">
                      {originDisplay}
                    </td>
                  </>
                )}
                <td className="border border-slate-200 px-4 py-3 font-mono">{fmt(total(r))}</td>
                <td className="border border-slate-200 px-4 py-3 font-mono text-emerald-700">{fmt(paid(r))}</td>
                <td className="border border-slate-200 px-4 py-3 font-mono font-bold">{fmt(remaining)}</td>
                <td className="border border-slate-200 px-4 py-3 text-center whitespace-nowrap">{[...new Set(state.payments.filter(p => p.recordId === r.id && p.direction === (tab === 0 ? 'IN' : 'OUT') && p.amount > 0).map(p => p.date))].sort().map(d => <div key={d}>{formatDateVN(d)}</div>)}{!state.payments.some(p => p.recordId === r.id && p.direction === (tab === 0 ? 'IN' : 'OUT') && p.amount > 0) && '—'}</td>
                <td className="border border-slate-200 px-4 py-3 text-xs text-center align-middle">
                  {isPaidFull ? (
                    <span className="inline-flex items-center justify-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      {tab === 0 ? 'Đã thu đủ' : 'Đã thanh toán'}
                    </span>
                  ) : isPartiallyPaid ? (
                    <span className="inline-flex items-center justify-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Thanh toán một phần
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1 font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      Chưa thanh toán
                    </span>
                  )}
                </td>
                <td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap">
                  {isPaidFull ? (
                    <span className="text-sm font-medium text-slate-400 select-none">
                      {tab === 0 ? 'Thu tiền' : 'Thanh toán'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer disabled:opacity-50"
                      disabled={busy}
                      onClick={() => openPay(r, tab === 0 ? 'IN' : 'OUT')}
                    >
                      {tab === 0 ? (isPartiallyPaid ? 'Thu tiếp' : 'Thu tiền') : (isPartiallyPaid ? 'Thanh toán tiếp' : 'Thanh toán')}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody></table>{!(tab === 0 ? sales : purchases).length && <p className="p-10 text-center text-slate-500">Chưa có chứng từ trong kỳ.</p>}</div>}
      {tab === 2 && (
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
              >
                <option value="">Tất cả nhóm chi phí ({EXPENSE_CATEGORIES.length} nhóm)</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <div className="text-xs text-slate-600">
                Tổng chi phí: <span className="font-mono font-bold text-rose-600 text-sm">{fmt(displayedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0))} đ</span>
                <span className="ml-1 text-slate-400">({displayedExpenses.length} khoản chi)</span>
              </div>
            </div>
            <button
              type="button"
              className={primary}
              onClick={() => {
                setExpenseModal({
                  date: today(),
                  category: EXPENSE_CATEGORIES[0].name,
                  content: '',
                  lotCode: '',
                  amount: '',
                });
                setError('');
              }}
            >
              <Plus size={16} />
              Thêm chi phí
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm border-collapse border border-slate-300">
              <thead className="bg-slate-100/90 text-xs text-slate-700">
                <tr>
                  {['Ngày', 'Nhóm chi phí', 'Nội dung', 'Lô hàng liên quan', 'Số tiền (đ)', 'Thao tác'].map(h => (
                    <th className={`border border-slate-300 px-4 py-3 font-semibold text-center ${h === 'Lô hàng liên quan' ? 'w-[135px] whitespace-nowrap' : ''}`} key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="border border-slate-200 px-4 py-3 text-center whitespace-nowrap font-medium text-slate-700">
                      {formatDateVN(exp.date)}
                    </td>
                    <td className="border border-slate-200 px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                      {exp.category}
                    </td>
                    <td className="border border-slate-200 px-4 py-3 font-medium text-slate-900">
                      {exp.content}
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-center whitespace-nowrap font-mono w-[135px]">
                      {exp.lotCode ? (
                        <span className="font-semibold text-emerald-700">{exp.lotCode}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-right text-rose-600 whitespace-nowrap">
                      −{fmt(exp.amount)} đ
                    </td>
                    <td className="border border-slate-200 px-4 py-3 text-center align-middle whitespace-nowrap">
                      <button
                        type="button"
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer mr-3"
                        onClick={() => {
                          setExpenseModal({
                            id: exp.id,
                            date: exp.date,
                            category: exp.category,
                            content: exp.content,
                            lotCode: exp.lotCode || '',
                            amount: String(exp.amount),
                          });
                          setError('');
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
                        disabled={busy}
                        onClick={async () => {
                          if (window.confirm(`Xác nhận xóa khoản chi: "${exp.content}" (${fmt(exp.amount)} đ)?`)) {
                            await mutate({ action: 'deleteExpense', id: exp.id });
                          }
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!displayedExpenses.length && (
              <p className="p-10 text-center text-slate-500">
                Chưa có chi phí nào trong kỳ được chọn.
              </p>
            )}
          </div>
        </div>
      )}
      {tab === 3 && (
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                Tổng tiền vào:{' '}
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  +{fmt(cashFlowItems.filter(i => i.direction === 'IN').reduce((s, i) => s + i.amount, 0))} đ
                </span>
              </div>
              <div className="text-slate-300">|</div>
              <div>
                Tổng tiền ra:{' '}
                <span className="font-mono font-bold text-red-600 text-sm">
                  −{fmt(cashFlowItems.filter(i => i.direction === 'OUT').reduce((s, i) => s + i.amount, 0))} đ
                </span>
              </div>
              <div className="text-slate-300">|</div>
              <div>
                Dòng tiền ròng:{' '}
                {(() => {
                  const totalIn = cashFlowItems.filter(i => i.direction === 'IN').reduce((s, i) => s + i.amount, 0);
                  const totalOut = cashFlowItems.filter(i => i.direction === 'OUT').reduce((s, i) => s + i.amount, 0);
                  const net = totalIn - totalOut;
                  return (
                    <span className={`font-mono font-bold text-sm ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))} đ
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="text-slate-500">
              Tổng cộng: <span className="font-semibold text-slate-700">{cashFlowItems.length} giao dịch</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm border-collapse border border-slate-300">
              <thead className="bg-slate-100/90 text-xs text-slate-700">
                <tr>
                  {['Ngày', 'Loại giao dịch', 'Nhóm/ Nghiệp vụ', 'Nội dung', 'Lô hàng liên quan', 'Phương thức', 'Số tiền (đ)'].map(h => (
                    <th className={`border border-slate-300 px-4 py-3 font-semibold text-center ${h === 'Lô hàng liên quan' ? 'w-[135px] whitespace-nowrap' : ''}`} key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashFlowItems.map(item => {
                  const isPositive = item.direction === 'IN';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="border border-slate-200 px-4 py-3 text-center whitespace-nowrap font-medium text-slate-700">
                        {formatDateVN(item.date)}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 font-medium text-slate-900">
                        {isPositive ? 'Thu' : 'Chi'}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 font-medium text-slate-900">{item.content}</td>
                      <td className="border border-slate-200 px-4 py-3 text-slate-700">{item.subContent || ''}</td>
                      <td className="border border-slate-200 px-3 py-3 text-center whitespace-nowrap font-mono w-[135px]">
                        <span className="font-semibold text-slate-800">{item.refCode}</span>
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-center whitespace-nowrap text-slate-700">
                        {item.method}
                      </td>
                      <td className={`border border-slate-200 px-4 py-3 font-mono font-bold text-right whitespace-nowrap ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : '−'}{fmt(item.amount)} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!cashFlowItems.length && (
              <p className="p-10 text-center text-sm text-slate-500">Chưa có giao dịch dòng tiền trong kỳ.</p>
            )}
          </div>
        </div>
      )}
      {tab === 4 && <div className="space-y-6 p-6"><ProcessingFinanceCharts expenses={expenses} cashFlow={cashFlowItems} /><h3 className="font-bold">Giá trị chứng từ trong kỳ</h3>{[['Xuất bán', sumSales], ['Thu mua', sumPurchases], ['Chi phí hoạt động', sumExpenses], ['Phải thu', receivable], ['Phải trả', payable]].map(([name, value]) => <div key={name}><div className="mb-2 flex justify-between text-sm"><span>{name}</span><b>{fmt(value)} đ</b></div><div className="h-5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Number(value) / Math.max(sumSales, sumPurchases, sumExpenses, 1) * 100}%` }} /></div></div>)}<p className="text-xs text-slate-500">Công nợ còn lại tính theo tất cả các lần thanh toán của chứng từ được lọc.</p></div>}
    </section>{pay && (() => {
      const remaining = Math.max(0, total(pay.record) - paid(pay.record));
      const isCollect = pay.direction === 'IN';
      const minDate = String(pay.record.values?.date || '');
      return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form
            role="dialog"
            aria-modal="true"
            aria-label={isCollect ? 'Ghi nhận thu tiền bán hàng' : 'Ghi nhận thanh toán chi phí'}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={async e => {
              e.preventDefault();
              const amt = Number(amount);
              if (!Number.isFinite(amt) || amt <= 0 || amt > remaining) {
                setError(`Số tiền phải lớn hơn 0 và không vượt quá ${fmt(remaining)} đ.`);
                return;
              }
              if (minDate && date < minDate) {
                setError(`Ngày thanh toán không được trước ngày lập chứng từ (${formatDateVN(minDate)}).`);
                return;
              }
              const payment = {
                id: 'validation',
                recordId: pay.record.id,
                direction: pay.direction,
                date,
                amount: amt,
                method
              };
              try {
                addPayment(state, payment);
                setError('');
                const res = await mutate({ action: 'payment', payment });
                if (res.ok) {
                  setPay(null);
                } else {
                  setError(res.error || 'Không thể lưu thanh toán vào cơ sở dữ liệu.');
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Dữ liệu không hợp lệ.');
              }
            }}
          >
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isCollect ? 'Ghi nhận thu tiền bán hàng' : 'Ghi nhận thanh toán chi phí'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Mã: <span className="font-mono font-bold text-emerald-700">{pay.record.lotCode}</span> · Đối tác: <span className="font-semibold text-slate-700">{pay.record.values.customer || pay.record.values.seller}</span>
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setPay(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm flex items-center justify-between border border-slate-200/60">
              <span className="text-slate-600">Số tiền còn lại cần {isCollect ? 'thu' : 'thanh toán'}:</span>
              <span className="font-mono font-bold text-emerald-700 text-base">{fmt(remaining)} đ</span>
            </div>

            {error && (
              <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 font-medium">
                {error}
              </div>
            )}

            <label className="block text-sm font-medium text-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span>Số tiền (đ) *</span>
                {remaining > 0 && (
                  <button
                    type="button"
                    className="text-xs text-emerald-700 hover:underline font-semibold"
                    onClick={() => setAmount(String(remaining))}
                  >
                    Điền toàn bộ ({fmt(remaining)} đ)
                  </button>
                )}
              </div>
              <input
                className={control}
                type="number"
                min="1"
                max={remaining}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                autoFocus
              />
              {Number(amount) > 0 && (
                <p className="mt-1 text-xs text-slate-500 font-mono">
                  = {fmt(Number(amount))} đ
                </p>
              )}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="block mb-1">Ngày {isCollect ? 'thu tiền' : 'thanh toán'} *</span>
              <input
                className={control}
                type="date"
                min={minDate}
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="block mb-1">Phương thức *</span>
              <select className={control} value={method} onChange={e => setMethod(e.target.value)}>
                <option value="Chuyển khoản">Chuyển khoản</option>
                <option value="Tiền mặt">Tiền mặt</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" className={button} onClick={() => setPay(null)} disabled={busy}>
                Hủy
              </button>
              <button type="submit" className={primary} disabled={busy || !amount || Number(amount) <= 0}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {isCollect ? 'Xác nhận thu tiền' : 'Xác nhận thanh toán'}
              </button>
            </div>
          </form>
        </div>
      );
    })()}{expenseModal && (() => {
      const selectedCat = EXPENSE_CATEGORIES.find(c => c.name === expenseModal.category) || EXPENSE_CATEGORIES[0];
      const isEdit = !!expenseModal.id;
      return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form
            role="dialog"
            aria-modal="true"
            aria-label={isEdit ? 'Sửa chi phí' : 'Ghi nhận chi phí phát sinh'}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={async e => {
              e.preventDefault();
              const amt = Number(expenseModal.amount);
              if (!Number.isFinite(amt) || amt <= 0) {
                setError('Số tiền chi phí phải lớn hơn 0.');
                return;
              }
              if (!expenseModal.content.trim()) {
                setError('Vui lòng nhập nội dung chi.');
                return;
              }
              try {
                const res = await mutate({
                  action: 'expense',
                  expense: {
                    id: expenseModal.id,
                    date: expenseModal.date,
                    category: expenseModal.category,
                    content: expenseModal.content.trim(),
                    lotCode: expenseModal.lotCode || undefined,
                    method: expenseModal.method || 'Chuyển khoản',
                    amount: amt,
                  },
                });
                if (res.ok) {
                  setExpenseModal(null);
                  setError('');
                } else {
                  setError(res.error || 'Không thể lưu chi phí.');
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Dữ liệu không hợp lệ.');
              }
            }}
          >
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isEdit ? 'Sửa chi phí hoạt động' : 'Ghi nhận chi phí hoạt động'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Ghi nhận các khoản chi phí phục vụ vận hành, sơ chế, đóng gói và xuất khẩu.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => {
                  setExpenseModal(null);
                  setError('');
                }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-slate-700">
                <span className="block mb-1">Ngày chi *</span>
                <input
                  className={control}
                  type="date"
                  value={expenseModal.date}
                  onChange={e => setExpenseModal({ ...expenseModal, date: e.target.value })}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="block mb-1">Liên kết mã lô (tùy chọn)</span>
                <select
                  className={control}
                  value={expenseModal.category === 'Nhân công' ? '' : expenseModal.lotCode || ''}
                  disabled={expenseModal.category === 'Nhân công'}
                  onChange={e => setExpenseModal({ ...expenseModal, lotCode: e.target.value })}
                >
                  <option value="">-- Không liên kết mã lô --</option>
                  {availableLots.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              <span className="block mb-1">Nhóm chi phí *</span>
              <select
                className={control}
                value={expenseModal.category}
                onChange={e => {
                  setExpenseModal({
                    ...expenseModal,
                    category: e.target.value,
                    lotCode: e.target.value === 'Nhân công' ? '' : expenseModal.lotCode,
                  });
                }}
                required
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              {selectedCat && (
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-700">{selectedCat.description}</span>
                  <span className="block mt-1 text-slate-500">
                    Gợi ý ví dụ:{' '}
                    <button
                      type="button"
                      className="text-emerald-700 underline font-medium hover:text-emerald-800 text-left"
                      onClick={() => setExpenseModal(prev => prev ? { ...prev, content: selectedCat.example } : null)}
                    >
                      &ldquo;{selectedCat.example}&rdquo;
                    </button>
                  </span>
                </p>
              )}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="block mb-1">Nội dung chi cụ thể *</span>
              <input
                className={control}
                type="text"
                placeholder={`Ví dụ: ${selectedCat?.example || 'Mua vật tư...'}`}
                value={expenseModal.content}
                onChange={e => setExpenseModal({ ...expenseModal, content: e.target.value })}
                required
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-slate-700">
                <span className="block mb-1">Số tiền (đ) *</span>
                <input
                  className={control}
                  type="number"
                  min="1000"
                  step="1000"
                  placeholder="0"
                  value={expenseModal.amount}
                  onChange={e => setExpenseModal({ ...expenseModal, amount: e.target.value })}
                  required
                />
                {Number(expenseModal.amount) > 0 && (
                  <p className="mt-1 text-xs text-slate-500 font-mono">
                    = {fmt(Number(expenseModal.amount))} đ
                  </p>
                )}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="block mb-1">Phương thức *</span>
                <select
                  className={control}
                  value={expenseModal.method || 'Chuyển khoản'}
                  onChange={e => setExpenseModal({ ...expenseModal, method: e.target.value })}
                >
                  <option value="Chuyển khoản">Chuyển khoản</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                className={button}
                onClick={() => {
                  setExpenseModal(null);
                  setError('');
                }}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="submit"
                className={primary}
                disabled={busy || !expenseModal.amount || Number(expenseModal.amount) <= 0 || !expenseModal.content.trim()}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {isEdit ? 'Cập nhật chi phí' : 'Lưu khoản chi'}
              </button>
            </div>
          </form>
        </div>
      );
    })()}</>;
}
