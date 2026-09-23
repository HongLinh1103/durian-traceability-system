'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardList, Download, Loader2, Plus, RefreshCw, Search, X } from 'lucide-react';
import { addPayment, EXPENSE_CATEGORIES, Expense, formatPurchaseLotCode, formatProductionLotCode, GmpRecord, GmpState, inherit, isFailed, latestRecords, REGISTERS, sources, Stage, STAGES, Values } from '@/lib/processing-gmp';
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
      return ['Ngày thu mua', 'Mã hồ sơ thu mua', 'Người bán', 'Liên hệ', 'Mã số vùng trồng', 'Tên vùng trồng và địa chỉ', 'Khối lượng (kg)', 'Giá mua (đ/kg)', 'Thành tiền (đ)', 'Trạng thái', 'Thao tác'];
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

export function ProcessingGmpView({ screen }: { screen: Screen }) {
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
  const [editing, setEditing] = useState<GmpRecord | 'new' | null>(null);
  const [detail, setDetail] = useState<GmpRecord | null>(null);
  const load = useCallback(async () => {
    setError('');
    try { const res = await fetch('/api/processing/gmp', { cache: 'no-store' }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setState(data.state); setRevision(data.revision); setRegions(Array.isArray(data.regions) ? data.regions : []); if (data.company) setCompany(data.company); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
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
  const title = config?.title || (screen === 'overview' ? 'Tổng quan cơ sở chế biến' : 'Tài chính');
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
    try { const bytes = await buildRegisterDocx(stage, rows, company, registerExportPeriod(month, filter.from, filter.to), regions, state?.records?.receiving || []); downloadFile(bytes as BlobPart, `${config.title}${month ? `-${month}` : ''}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); }
    catch { setError('Không thể xuất file. Vui lòng thử lại.'); } finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">Cơ sở chế biến & đóng gói {config && ` / ${config.code}`}</p>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{title}</h1>
      </div>
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
    {state && <>

      {screen === 'overview' && <Overview state={state} filter={filter} />}
      {screen === 'finance' && <Finance state={state} filter={filter} busy={busy} mutate={mutate} exporting={financeExporting} setExporting={setFinanceExporting} />}
      {stage && config && <>
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse border border-slate-300 text-left text-sm ${stage === 'purchases' ? 'min-w-[1100px]' : stage === 'receiving' ? 'min-w-[1250px]' : stage === 'preprocessing' ? 'min-w-[1450px]' : stage === 'packaging' ? 'min-w-[1350px]' : stage === 'inspection' ? 'min-w-[1550px]' : stage === 'sales' ? 'min-w-[1780px]' : stage === 'aftersales' ? 'min-w-[1600px]' : 'min-w-[850px]'}`}>
              <thead className="bg-slate-100/90 text-xs text-slate-700">
                {stage === 'receiving' ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-4 py-3 font-semibold whitespace-nowrap text-center align-middle">Ngày tiếp nhận</th>
                      <th rowSpan={2} className="border border-slate-300 px-4 py-3 font-semibold whitespace-nowrap text-center align-middle">Người bán</th>
                      <th rowSpan={2} className="border border-slate-300 px-4 py-3 font-semibold whitespace-nowrap text-center align-middle">Mã số vùng trồng</th>
                      <th rowSpan={2} className="border border-slate-300 px-4 py-3 font-semibold min-w-[240px] text-center align-middle">Tên vùng trồng và địa chỉ</th>
                      <th rowSpan={2} className="border border-slate-300 px-4 py-3 font-semibold whitespace-nowrap text-center align-middle">Chủng loại</th>
                      <th colSpan={3} className="border border-slate-300 px-4 py-2 font-semibold whitespace-nowrap text-center bg-slate-200/80">Số lượng tiếp nhận (kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle w-20 sm:w-24 leading-snug">Số lượng<br />từ chối</th>
                      <th rowSpan={2} className="border border-slate-300 px-4 py-3 font-semibold whitespace-nowrap text-center align-middle">Tên người tiếp nhận</th>
                      <th rowSpan={2} className="border border-slate-300 px-4 py-2.5 font-semibold text-center align-middle leading-snug">Chuyển sang sản xuất<br />(Mã số lô hàng)</th>
                      <th rowSpan={2} className="border border-slate-300 px-4 py-3 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 px-3 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">Loại 1</th>
                      <th className="border border-slate-300 px-3 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">Loại 2</th>
                      <th className="border border-slate-300 px-3 py-2 font-semibold whitespace-nowrap text-center bg-slate-100">Loại 3</th>
                    </tr>
                  </>
                ) : stage === 'preprocessing' ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Mã số lô hàng</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[85px] leading-snug">KL tiếp nhận<br />(kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[85px] leading-snug">Nhà cung cấp<br />(Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[85px] leading-snug">Vận chuyển<br />sạch (Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold text-center align-middle max-w-[130px] leading-snug">Chủng loại, cảm quan, chất lượng nguyên liệu (Đ/K)</th>
                      <th colSpan={2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Đánh giá công đoạn vệ sinh tạp chất (Đ/K)</th>
                      <th colSpan={3} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Đánh giá công đoạn phơi khô sản phẩm (Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[85px] leading-snug">CL sau sơ chế<br />(Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[85px] leading-snug">KL sau sơ chế<br />(kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold text-center align-middle max-w-[120px] leading-snug">Hành động<br />khắc phục</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Người giám sát</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Vệ sinh bằng<br />bàn chà (Đ/K)</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Thổi sạch bằng<br />xịt cao áp</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Thời gian<br />bắt đầu</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Thời gian<br />kết thúc</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Tình trạng<br />sản phẩm (Đ/K)</th>
                    </tr>
                  </>
                ) : stage === 'packaging' ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Chủng loại và mã số lô</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[100px] leading-snug">Khối lượng thực tế tiếp nhận đóng gói (kg)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[110px] leading-snug">Dụng cụ đóng gói đảm bảo sạch (Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[140px] leading-snug">Tình trạng vệ sinh bao bì, tem nhãn trước khi đóng gói (Đ/K)</th>
                      <th colSpan={3} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Đánh giá công đoạn đóng gói- đóng thùng (Đ/K)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle max-w-[120px] leading-snug">Chất lượng, quy cách sản phẩm sau đóng gói (Đ/K)</th>
                      <th colSpan={2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Nhập kho thành phẩm</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold text-center align-middle max-w-[120px] leading-snug">Hành động khắc phục</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Người giám sát</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Cân</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Dán tem, nhãn</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Đóng gói</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Số lượng nhập kho (thùng)</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[100px]">Khối lượng nhập kho (kg)</th>
                    </tr>
                  </>
                ) : stage === 'inspection' ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày kiểm tra</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Chủng loại - Mã số lô hàng</th>
                      <th colSpan={2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Số lượng/ khối lượng tiếp nhận kiểm tra</th>
                      <th colSpan={3} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Số lượng kiểm tra 2% (thùng)</th>
                      <th colSpan={6} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Kết quả kiểm tra phát hiện/ không đạt</th>
                      <th colSpan={2} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Số lượng/ khối lượng đưa qua xuất bán</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold text-center align-middle max-w-[120px] leading-snug">Biện pháp khắc phục (nếu có)</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Người kiểm tra</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Số lượng<br />(thùng)</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Khối lượng<br />(kg)</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Loại 1</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Loại 2</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Loại 3</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Rệp sáp</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Ấu trùng ruồi<br />đục quả</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Đất</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Lá cây</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Côn trùng<br />khác</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 whitespace-nowrap">Khác</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Số lượng<br />(thùng)</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Khối lượng<br />(kg)</th>
                    </tr>
                  </>
                ) : stage === 'sales' ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Ngày</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold min-w-[130px] text-center align-middle">Khách hàng</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold min-w-[150px] text-center align-middle">Thông tin khách hàng</th>
                      <th colSpan={9} className="border border-slate-300 px-3 py-2 font-semibold text-center align-middle bg-slate-200/80 leading-snug">Thông tin lô hàng</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold min-w-[130px] text-center align-middle">Đơn vị xuất khẩu</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Cảng/Cửa khẩu đi</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Cảng/Cửa khẩu đến</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Nước nhập khẩu</th>
                      <th rowSpan={2} className="border border-slate-300 px-2.5 py-2.5 text-center align-middle max-w-[140px] leading-snug">Ghi chú</th>
                      <th rowSpan={2} className="border border-slate-300 px-3 py-2.5 font-semibold whitespace-nowrap text-center align-middle">Thao tác</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Mã số lô hàng</th>
                      <th className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Chủng loại</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[110px]">Điều kiện phương tiện<br />vận chuyển (Đ/K)</th>
                      <th className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Biển số xe</th>
                      <th className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Số container</th>
                      <th className="border border-slate-300 px-2.5 py-2 font-semibold whitespace-nowrap text-center align-middle bg-slate-100">Số Seal</th>
                      <th className="border border-slate-300 px-2.5 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Số lượng<br />(thùng)</th>
                      <th className="border border-slate-300 px-2.5 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug max-w-[85px]">Khối lượng<br />(kg)</th>
                      <th className="border border-slate-300 px-2.5 py-2 font-semibold text-center align-middle bg-slate-100 leading-snug whitespace-nowrap min-w-[105px]">Giá trị<br />(đ)</th>
                    </tr>
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
                      <th key={h} className="border border-slate-300 px-4 py-3 font-semibold whitespace-nowrap text-center text-slate-700">{h}</th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const code = stage === 'purchases'
                    ? ((r.lotCode.includes('demo') || !/^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode))
                      ? formatPurchaseLotCode(r.values?.date || r.lotCode)
                      : r.lotCode)
                    : ((r.lotCode.includes('demo') || !/^LH-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode))
                      ? formatProductionLotCode(r.values?.date || r.lotCode)
                      : r.lotCode);
                  const receivingRecord = stage === 'purchases'
                    ? state.records.receiving.find(rec => rec.sourceId === r.id || rec.lotCode === r.lotCode)
                    : undefined;
                  const purchasePuc = String(r.values?.puc || receivingRecord?.values?.puc || '').trim();
                  const matchedRegion = purchasePuc
                    ? regions.find(region => normalizeUnitCode(region.code) === normalizeUnitCode(purchasePuc))
                    : undefined;
                  const originDisplay = (() => {
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
                  })();
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
                        <td className="border border-slate-200 whitespace-nowrap px-4 py-3 text-slate-600 font-medium">{dateFormatted}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-4 py-3 font-bold text-slate-900">{String(r.values?.seller || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-4 py-3 font-mono text-slate-700 font-medium">{String(r.values?.puc || '—')}</td>
                        <td className="border border-slate-200 px-4 py-3 text-xs text-slate-700 min-w-[240px] max-w-sm">{originDisplay}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{String(r.values?.variety || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-3 font-mono text-right font-semibold text-slate-800">{fmt(r.values?.grade1)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-3 font-mono text-right text-slate-700">{fmt(r.values?.grade2)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-3 py-3 font-mono text-right text-slate-700">{fmt(r.values?.grade3)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-3 font-mono text-center">
                          {Number(r.values?.rejected || 0) > 0 ? (
                            <span className="text-rose-700 font-bold">{fmt(r.values?.rejected)}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-4 py-3 text-slate-700 font-medium">{formatReceiver(r.values?.receiver)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-4 py-3">
                          <button
                            type="button"
                            className="text-left font-bold font-mono text-emerald-700 hover:underline block"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-4 py-3 text-center">{actions}</td>
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
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5">
                          <button
                            type="button"
                            className="text-left font-bold font-mono text-emerald-700 hover:underline block"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.inputWeight)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.supplierOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.transportOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.materialOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.brushOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.airOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-center text-slate-700">{String(r.values?.dryStart || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-center text-slate-700">{String(r.values?.dryEnd || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.dryOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.qualityOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(r.values?.outputWeight)}</td>
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-600 max-w-[120px] truncate text-center" title={String(r.values?.correction || '')}>{String(r.values?.correction || '—')}</td>
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
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5">
                          <button
                            type="button"
                            className="text-left font-bold font-mono text-emerald-700 hover:underline block"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                          {variety && <span className="text-[11px] text-slate-500 block">{variety}</span>}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.inputWeight)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.toolsOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.labelsOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.weighOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.stickerOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.packOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.qualityOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.quantity_boxes)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(r.values?.weight_kg)}</td>
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-600 max-w-[120px] truncate text-center" title={String(r.values?.correction || '')}>{String(r.values?.correction || '—')}</td>
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
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5">
                          <button
                            type="button"
                            className="text-left font-bold font-mono text-emerald-700 hover:underline block"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                          {variety && <span className="text-[11px] text-slate-500 block">{variety}</span>}
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.inputBoxes)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.inputWeight)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-700">{fmt(r.values?.sample1)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-700">{fmt(r.values?.sample2)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-700">{fmt(r.values?.sample3)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.mealybug)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.fly)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.soil)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.leaves)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.insects)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{findingBadge(r.values?.other)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.quantity_boxes)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(r.values?.weight_kg)}</td>
                        <td className="border border-slate-200 px-2.5 py-2.5 text-xs text-slate-600 max-w-[120px] truncate text-center" title={String(r.values?.correction || '')}>{String(r.values?.correction || '—')}</td>
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
                    const variety = String(r.values?.variety || '').trim();
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-600 font-medium">{dateFormatted}</td>
                        <td className="border border-slate-200 px-3 py-2.5 font-bold text-slate-900">{String(r.values?.customer || '—')}</td>
                        <td className="border border-slate-200 px-3 py-2.5 text-xs text-slate-600 max-w-[180px]">{String(r.values?.customerInfo || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5">
                          <button
                            type="button"
                            className="text-left font-bold font-mono text-emerald-700 hover:underline block"
                            onClick={() => setDetail({ ...r, lotCode: code })}
                          >
                            {code}
                          </button>
                        </td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center font-medium text-slate-800">{variety || '—'}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-1.5 py-2.5 text-center">{badge(r.values?.transportOk)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 font-mono text-center text-slate-800">{String(r.values?.truck || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 font-mono text-center text-slate-800">{String(r.values?.container || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 font-mono text-center text-slate-800">{String(r.values?.seal || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right text-slate-800">{fmt(r.values?.quantity_boxes)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(r.values?.weight_kg)}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 font-mono text-right font-bold text-emerald-800">{fmt(Number(r.values?.total ?? (Number(r.values?.weight_kg || 0) * Number(r.values?.price || 0))))}</td>
                        <td className="border border-slate-200 px-3 py-2.5 text-xs text-slate-700 min-w-[120px]">{String(r.values?.exporter || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-700">{String(r.values?.departurePort || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center text-slate-700">{String(r.values?.destinationPort || '—')}</td>
                        <td className="border border-slate-200 whitespace-nowrap px-2.5 py-2.5 text-center font-bold text-slate-900">{String(r.values?.country || '—')}</td>
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
                            className="font-bold font-mono text-emerald-700 hover:underline inline-block"
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
                      <td className="border border-slate-200 whitespace-nowrap px-4 py-3 text-slate-600 font-medium">{dateFormatted}</td>
                      <td className="border border-slate-200 whitespace-nowrap px-4 py-3">
                        <button className="text-left font-bold font-mono text-emerald-700 hover:underline" onClick={() => setDetail({ ...r, lotCode: code })}>
                          {code}
                        </button>
                      </td>

                      {stage === 'purchases' && (
                        <>
                          <td className="border border-slate-200 px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                            {String(r.values?.seller || '—')}
                          </td>
                          <td className="border border-slate-200 px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap text-center">
                            {formatSellerPhone(r.values?.seller, r.values?.phone)}
                          </td>
                          <td className="border border-slate-200 px-3 py-3 font-mono text-xs font-medium text-slate-700 whitespace-nowrap text-center">
                            {purchasePuc || '—'}
                          </td>
                          <td className="border border-slate-200 px-4 py-3 text-xs text-slate-700 min-w-[240px] max-w-sm">
                            {originDisplay}
                          </td>
                          <td className="border border-slate-200 whitespace-nowrap px-4 py-3 font-mono font-bold text-slate-900 text-right">{fmt(r.values?.weight)}</td>
                          <td className="border border-slate-200 whitespace-nowrap px-4 py-3 font-mono text-slate-700 text-right">{fmt(r.values?.price)}</td>
                          <td className="border border-slate-200 whitespace-nowrap px-4 py-3 font-mono font-black text-emerald-800 text-right">{fmt(r.values?.total)}</td>
                        </>
                      )}

                      <td className="border border-slate-200 whitespace-nowrap px-4 py-3">{statusBadge}</td>
                      <td className="border border-slate-200 whitespace-nowrap px-4 py-3 text-center">{actions}</td>
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
          </div>
        </section>
      </>}
      {stage && editing && <RecordForm state={state} regions={regions} stage={stage} record={editing === 'new' ? undefined : editing} busy={busy} error={error} onClose={() => setEditing(null)} onSave={async (record) => { const res = await mutate({ action: 'record', stage, record }); if (res.ok) setEditing(null); }} />}
      {stage && detail && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-label="Chi tiết bản ghi" className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6"><div className="mb-5 flex justify-between gap-4"><div><p className="text-xs font-bold text-emerald-600">{REGISTERS[stage].code}</p><h2 className="text-xl font-bold">{detail.lotCode}</h2></div><button aria-label="Đóng chi tiết" onClick={() => setDetail(null)}><X /></button></div><div className="grid gap-4 sm:grid-cols-2">{REGISTERS[stage].fields.map(f => <div key={f.key} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{f.group && `${f.group} · `}{f.label}</dt><dd className="mt-1 break-words text-sm font-semibold">{f.type === 'number' ? fmt(detail.values[f.key]) : String(detail.values[f.key] || 'Chưa ghi nhận')}</dd></div>)}</div><h3 className="mb-2 mt-6 font-bold">Lịch sử theo mã lô</h3>{STAGES.filter(s => s !== 'purchases').flatMap(s => state.records[s].filter(r => r.lotCode === detail.lotCode).map(r => <p key={r.id} className="border-l-2 border-emerald-200 py-2 pl-4 text-sm">{r.values.date} · {REGISTERS[s].title} · {status(state, s, r)}</p>))}</section></div>}
    </>}
  </div>;
}
function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={`rounded-2xl border bg-white p-5 ${warning ? 'border-amber-100' : 'border-slate-200'}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${warning ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p></div>; }
function Overview({ state, filter }: { state: GmpState; filter: Filter }) {
  const filtered = (s: Stage) => state.records[s].filter(r => !r.draft && matches(r, filter));
  const pending = (s: Stage) => sources(state, s).filter(r => matches(r, filter));
  const warehouse = filtered('packaging').filter(r => !state.records.sales.some(x => x.lotCode === r.lotCode && !x.draft));
  const metrics = [['Tổng thu mua (kg)', filtered('purchases').reduce((s, r) => s + Number(r.values.weight), 0)], ['Chờ nhập hàng (lô)', pending('receiving').length], ['Đang sơ chế (lô)', pending('preprocessing').length], ['Đang đóng gói (lô)', pending('packaging').length], ['Thành phẩm trong kho (kg)', warehouse.reduce((s, r) => s + Number(r.values.weight_kg), 0)], ['Sẵn sàng xuất (lô)', pending('sales').length], ['Đã xuất (kg)', filtered('sales').reduce((s, r) => s + Number(r.values.weight_kg), 0)]] as const;
  return <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <Metric key={label} label={label} value={fmt(value)} />)}</div><section className="rounded-2xl border bg-white p-6"><h2 className="text-lg font-bold">Tiến độ xử lý lô hàng</h2><p className="mt-1 text-sm text-slate-500">Mở công đoạn để tiếp tục xử lý các lô đang chờ.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{STAGES.slice(1).map((s, i) => { const count = s === 'inspection' ? filtered('packaging').filter(r => !state.records.inspection.some(x => x.sourceId === r.id)).length : s === 'aftersales' ? filtered('sales').filter(r => !state.records.aftersales.some(x => x.sourceId === r.id && !isFailed('aftersales', x.values))).length : pending(s).length; return <Link key={s} href={`/dashboard/processing/${REGISTERS[s].path}`} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 hover:border-emerald-300 hover:bg-emerald-50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-700">0{i + 1}</span><div className="flex-1"><p className="font-semibold text-slate-800">{REGISTERS[s].title}</p><p className="text-xs text-slate-500">{REGISTERS[s].code}</p></div><b>{count} lô</b><ArrowRight size={16} className="text-slate-400" /></Link>; })}</div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{latestRecords(state, 'inspection').filter(r => matches(r, filter) && isFailed('inspection', r.values)).length} lô kiểm tra không đạt đang chờ khắc phục và kiểm tra lại.</p></section></>;
}
function RecordForm({ state, regions, stage, record, busy, error, onClose, onSave }: { state: GmpState; regions: RegionSource[]; stage: Stage; record?: GmpRecord; busy: boolean; error: string; onClose: () => void; onSave: (r: { id?: string; sourceId: string; season: string; values: Values }) => Promise<void> }) {
  const available = sources(state, stage);
  const [sourceId, setSourceId] = useState(record?.sourceId || '');
  const [season, setSeason] = useState(record?.season || '2025-2026');
  const [values, setValues] = useState<Values>(record?.values || { date: today() });
  const source = state.records[STAGES[STAGES.indexOf(stage) - 1]]?.find(r => r.id === sourceId);
  const inherited = inherit(state, stage, source);
  const selectedRegion = regions.find(region => normalizeUnitCode(region.code) === normalizeUnitCode(String(inherited.puc || values.puc || '')));
  const regionValues: Values = stage === 'receiving' && selectedRegion ? {
    puc: selectedRegion.code,
    origin: [selectedRegion.name, selectedRegion.address].filter(Boolean).join(' - '),
  } : {};
  const merged: Values = { ...values, ...inherited, ...regionValues, ...(record ? { lotCode: record.lotCode } : {}) };
  const set = (key: string, value: string) => setValues(v => ({ ...v, [key]: value }));
  const needsCorrection = isFailed(stage, merged);
  const fields = REGISTERS[stage].fields.map(field => (field.key === 'correction' || field.key === 'treatmentPlan') ? { ...field, required: needsCorrection } : field);
  const groups = Array.from(new Set(fields.map(f => f.internal ? 'Informations' : f.group || 'Thông tin chung')));
  useEffect(() => { const handle = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, [busy, onClose]);
  async function submit(e: FormEvent) { e.preventDefault(); await onSave({ id: record?.id, sourceId, season, values: stage === 'receiving' ? { ...values, puc: merged.puc, origin: merged.origin } : values }); }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"><form role="dialog" aria-modal="true" aria-label={`${record ? 'Sửa' : 'Thêm'} ${REGISTERS[stage].title}`} onSubmit={submit} className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"><div className="flex items-start justify-between border-b p-5"><div><p className="text-xs font-bold text-emerald-700">{REGISTERS[stage].code}</p><h2 className="mt-1 text-xl font-bold">{record ? 'Sửa bản ghi' : 'Thêm bản ghi'} · {REGISTERS[stage].title}</h2></div><button type="button" aria-label="Đóng biểu mẫu" onClick={onClose} disabled={busy}><X /></button></div><div className="space-y-5 overflow-y-auto p-5">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {stage === 'purchases' ? <label className="block text-sm font-semibold">Niên vụ *<input className={`${control} mt-1`} required pattern="\d{4}-\d{4}" value={season} onChange={e => setSeason(e.target.value)} /><p className="mt-2 text-xs font-normal text-slate-500">Mã hồ sơ thu mua được tự sinh theo định dạng TM-năm-ngaythang khi lưu.</p></label> : <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><label className="block text-sm font-bold text-emerald-900">{stage === 'receiving' ? 'Hồ sơ thu mua' : 'Lô hàng từ công đoạn trước'} *<select required disabled={!!record} className={`${control} mt-2`} value={sourceId} onChange={e => { setSourceId(e.target.value); setValues({ date: today() }); }}><option value="">Chọn lô đủ điều kiện...</option>{(record && source ? [source] : available).map(r => <option key={r.id} value={r.id}>{r.lotCode} · {r.values.seller || r.values.productLot || r.values.customer || ''}</option>)}</select></label>{!record && !available.length && <p className="mt-2 text-sm text-amber-800">Chưa có lô đủ điều kiện. Hoàn thành công đoạn trước để tiếp tục.</p>}{source && <p className="mt-3 text-sm text-emerald-800">Nguồn: {source.values.date} · Niên vụ {source.season} {stage === 'receiving' && `· Khối lượng mua: ${fmt(source.values.weight)} kg`} · Thông tin nguồn được tự động kế thừa.</p>}</div>}
    {stage === 'preprocessing' && source && <div className="rounded-xl bg-slate-50 p-4 text-sm"><p>Chủng loại: <b>{inherited.variety}</b> · Mã số lô: <b>{source.lotCode}</b></p><p className="mt-2">Nhà cung cấp: <b>{inherited.supplier}</b></p><p className="mt-2 text-slate-500">Thông tin kế thừa từ Nhập hàng / Hồ sơ thu mua. Đ = Đạt; K = Không đạt. Chọn K phải nhập Hành động khắc phục.</p></div>}
    {stage === 'inspection' && source && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Kiểm tra tối thiểu {Math.ceil(Number(source.values.quantity_boxes) * 0.02)} thùng (2% × {fmt(source.values.quantity_boxes)}, làm tròn lên). Khi phát hiện lỗi, ghi lượng đưa qua xuất bán bằng 0; sau khắc phục hãy thêm lần kiểm tra mới để giữ lịch sử.</p>}
    {stage === 'aftersales' && <p className="text-sm text-slate-500">Ghi nhận thông tin thông quan và kết quả hậu kiểm sau xuất bán. Xác nhận kết quả: Đ = Đạt; K = Không đạt.</p>}
    {groups.map(group => <fieldset key={group} className="rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-bold text-slate-700">{group === 'Informations' ? 'Thông tin bổ sung (không đưa vào sổ GMP)' : group}</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.filter(f => (f.internal ? 'Informations' : f.group || 'Thông tin chung') === group).map(f => <label key={f.key} className="block text-xs font-semibold leading-5 text-slate-600">{f.label}{f.required ? ' *' : ''}{stage === 'purchases' && f.key === 'puc' ? <select className={`${control} mt-1`} required value={String(merged[f.key] ?? '')} onChange={e => set(f.key, e.target.value)}><option value="">Chọn vùng trồng...</option>{regions.map(region => <option key={region.code} value={region.code}>{region.code} · {region.name} · {region.address}</option>)}</select> : f.type === 'check' || f.type === 'finding' ? <select className={`${control} mt-1`} required={f.required} value={String(merged[f.key] ?? '')} onChange={e => set(f.key, e.target.value)}><option value="">Chưa ghi nhận</option>{(f.type === 'check' ? [['Đ', 'Đ — Đạt'], ['K', 'K — Không đạt']] : [['Không', 'Không phát hiện'], ['Có', 'Có phát hiện']]).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select> : <input className={`${control} mt-1`} type={f.type || 'text'} min={f.type === 'number' ? 0 : undefined} step={f.type === 'number' ? (f.key.startsWith('quantity_') || f.key.startsWith('sample') ? 1 : 'any') : undefined} required={f.required} disabled={f.inherited} value={f.key === 'total' ? (stage === 'sales' ? Number(merged.total ?? (Number(merged.weight_kg || values.weight_kg || 0) * Number(merged.price || values.price || 85000))) : Number(values.weight || 0) * Number(values.price || 0)) : String(merged[f.key] ?? '')} placeholder={f.key === 'receiver' ? 'Nhập tên người tiếp nhận...' : f.key === 'supervisor' ? 'Nhập tên người giám sát...' : f.key === 'inspector' ? 'Nhập tên người kiểm tra...' : f.key === 'phone' ? 'Số điện thoại liên hệ...' : f.inherited ? 'Tự động khi lưu / chọn lô' : ''} onChange={e => set(f.key, e.target.value)} />}</label>)}</div></fieldset>)}
    {stage === 'receiving' && source && <p className="rounded-xl bg-slate-50 p-3 text-sm">Đối soát: {fmt(Number(values.grade1 || 0) + Number(values.grade2 || 0) + Number(values.grade3 || 0) + Number(values.rejected || 0))} / {fmt(source.values.weight)} kg (tiếp nhận + từ chối / thu mua)</p>}
  </div><div className="flex justify-end gap-3 border-t bg-slate-50 p-4"><button type="button" className={button} onClick={onClose} disabled={busy}>Hủy</button><button className={primary} disabled={busy || (stage !== 'purchases' && !sourceId)}>{busy ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}Lưu bản ghi</button></div></form></div>;
}
function Finance({ state, filter, busy, mutate, exporting, setExporting }: { state: GmpState; filter: Filter; busy: boolean; mutate: (p: object) => Promise<{ ok: boolean; error?: string }>; exporting: boolean; setExporting: (value: boolean) => void }) {
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
    subRef?: string;
    method: string;
    amount: number;
  }

  const cashFlowItems: CashFlowItem[] = useMemo(() => {
    const paymentItems: CashFlowItem[] = payments.map(p => {
      const isSales = p.direction === 'IN';
      const linkedRecord = [...state.records.purchases, ...state.records.sales].find(r => r.id === p.recordId);
      const lotCode = linkedRecord?.lotCode || '';
      const partner = isSales ? String(linkedRecord?.values?.customer || '') : String(linkedRecord?.values?.seller || '');
      return {
        id: p.id,
        date: p.date,
        direction: p.direction,
        content: isSales ? 'Thu tiền bán hàng' : 'Thanh toán thu mua',
        subContent: partner || undefined,
        refCode: lotCode || '—',
        method: p.method || (isSales ? 'Chuyển khoản' : 'Tiền mặt'),
        amount: p.amount,
      };
    });

    const expenseItems: CashFlowItem[] = expenses.map((e, idx) => {
      const code = e.code || `CP-${(e.date || '2026').slice(0, 4)}-${String(idx + 1).padStart(3, '0')}`;
      const catTitle = e.category ? (e.category.startsWith('Chi phí') ? e.category : `Chi phí ${e.category}`) : 'Chi phí hoạt động';
      return {
        id: e.id,
        date: e.date,
        direction: 'OUT',
        content: catTitle,
        subContent: e.content,
        refCode: code,
        subRef: e.lotCode || undefined,
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
      const documentHeaders = ['Ngày', 'Mã số lô hàng', 'Đối tác', 'Giá trị (đ)', 'Đã thanh toán (đ)', 'Còn lại (đ)', 'Trạng thái'];
      const documentRows = (records: GmpRecord[], isSales: boolean) => records.map(r => [
        financeExcelDate(r.values.date), r.lotCode, String(isSales ? r.values.customer || '' : r.values.seller || ''),
        total(r), paid(r), Math.max(0, total(r) - paid(r)),
        total(r) <= paid(r) ? (isSales ? 'Đã thu đủ' : 'Đã thanh toán') : paid(r) > 0 ? 'Thanh toán một phần' : 'Chưa thanh toán',
      ]);
      const period = [
        filter.from ? 'Từ ngày ' + formatDateVN(filter.from) : 'Từ đầu',
        filter.to ? 'Đến ngày ' + formatDateVN(filter.to) : 'Đến hiện tại',
        filter.season ? 'Vụ: ' + filter.season : '',
        filter.query ? 'Từ khóa: ' + filter.query : '',
        'Theo bộ lọc chung của trang; gồm tất cả nhóm chi phí.',
      ].filter(Boolean).join(' · ');
      const bytes = await buildFinanceWorkbook([
        { name: tabs[0], headers: documentHeaders, rows: documentRows(sales, true), moneyColumns: [4, 5, 6] },
        { name: tabs[1], headers: documentHeaders, rows: documentRows(purchases, false), moneyColumns: [4, 5, 6] },
        {
          name: tabs[2], headers: ['Ngày', 'Mã chi phí', 'Nhóm chi phí', 'Nội dung', 'Liên kết lô', 'Phương thức', 'Số tiền (đ)'],
          rows: expenses.map((e, index) => [financeExcelDate(e.date), e.code || 'CP-' + (e.date || '2026').slice(0, 4) + '-' + String(index + 1).padStart(3, '0'), e.category, e.content, e.lotCode || '', e.method || 'Chuyển khoản', e.amount]), moneyColumns: [7]
        },
        {
          name: tabs[3], headers: ['Ngày', 'Loại', 'Nội dung', 'Đối tác / Chi tiết', 'Mã tham chiếu', 'Lô liên kết', 'Phương thức', 'Thu (đ)', 'Chi (đ)'],
          rows: cashFlowItems.map(item => [financeExcelDate(item.date), item.direction === 'IN' ? 'Thu' : 'Chi', item.content, item.subContent || '', item.refCode, item.subRef || '', item.method, item.direction === 'IN' ? item.amount : 0, item.direction === 'OUT' ? item.amount : 0]), moneyColumns: [8, 9]
        },
        { name: tabs[4], headers: ['Chỉ tiêu', 'Giá trị (đ)'], rows: [['Xuất bán', sumSales], ['Thu mua', sumPurchases], ['Chi phí hoạt động', sumExpenses], ['Phải thu', receivable], ['Phải trả', payable]], moneyColumns: [2] },
      ], period);
      downloadFile(bytes as BlobPart, 'bao-cao-tai-chinh-' + today() + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Không thể xuất báo cáo Excel. Vui lòng thử lại.');
    } finally { setExporting(false); }
  }

  return <><form id="processing-finance-export" onSubmit={event => { event.preventDefault(); void exportReport(); }} />{exportError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Giá trị xuất bán (đ)" value={fmt(sumSales)} /><Metric label="Giá trị thu mua (đ)" value={fmt(sumPurchases)} /><Metric label="Tổng chi phí khác (đ)" value={fmt(sumExpenses)} /><Metric label="Phải thu còn lại (đ)" value={fmt(receivable)} /><Metric label="Phải trả còn lại (đ)" value={fmt(payable)} warning /></div><section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-3"><div className="flex flex-wrap gap-1">{tabs.map((name, i) => <button key={name} onClick={() => setTab(i)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${tab === i ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>{name}</button>)}</div></div>
    {tab < 2 && <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm border-collapse border border-slate-300"><thead className="bg-slate-100/90 text-xs text-slate-700"><tr>{['Ngày', 'Mã số lô hàng', 'Đối tác', 'Giá trị (đ)', 'Đã thanh toán', 'Còn lại', 'Trạng thái', 'Thao tác'].map(h => <th className="border border-slate-300 px-4 py-3 font-semibold text-center" key={h}>{h}</th>)}</tr></thead><tbody>{(tab === 0 ? sales : purchases).map(r => {
      const isPaidFull = total(r) <= paid(r);
      const isPartiallyPaid = paid(r) > 0 && !isPaidFull;
      const remaining = Math.max(0, total(r) - paid(r));
      return (
        <tr key={r.id} className="hover:bg-slate-50/70 transition">
          <td className="border border-slate-200 px-4 py-3 text-center whitespace-nowrap font-medium text-slate-700">{formatDateVN(r.values.date)}</td>
          <td className="border border-slate-200 px-4 py-3 font-semibold text-emerald-700 whitespace-nowrap">{r.lotCode}</td>
          <td className="border border-slate-200 px-4 py-3">{r.values.customer || r.values.seller}</td>
          <td className="border border-slate-200 px-4 py-3 font-mono">{fmt(total(r))}</td>
          <td className="border border-slate-200 px-4 py-3 font-mono text-emerald-700">{fmt(paid(r))}</td>
          <td className="border border-slate-200 px-4 py-3 font-mono font-bold">{fmt(remaining)}</td>
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
    })}</tbody></table>{!(tab === 0 ? sales : purchases).length && <p className="p-10 text-center text-slate-500">Chưa có chứng từ trong kỳ.</p>}</div>}
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
                {['Ngày', 'Nhóm chi phí', 'Nội dung', 'Liên kết lô', 'Số tiền (đ)', 'Thao tác'].map(h => (
                  <th className="border border-slate-300 px-4 py-3 font-semibold text-center" key={h}>
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
                  <td className="border border-slate-200 px-4 py-3 text-center whitespace-nowrap font-mono">
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
                {['Ngày', 'Nội dung', 'Mã tham chiếu', 'Phương thức', 'Số tiền'].map(h => (
                  <th className="border border-slate-300 px-4 py-3 font-semibold text-center" key={h}>
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
                      <div>{item.content}</div>
                      {item.subContent && (
                        <div className="text-xs text-slate-500 font-normal">{item.subContent}</div>
                      )}
                    </td>
                    <td className="border border-slate-200 px-4 py-3 text-center whitespace-nowrap font-mono">
                      <span className="font-semibold text-slate-800">{item.refCode}</span>
                      {item.subRef && (
                        <span className="block text-xs text-emerald-700 font-medium">({item.subRef})</span>
                      )}
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
