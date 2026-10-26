'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExportLabelConfig, ExportLabelData, exportLabelSchema, productionTranslation, validateLabelSource } from '@/lib/export-label';

export function ExportLabelPreview({ data, qrImage }: { data: ExportLabelData; qrImage: string }) {
  const [config, setConfig] = useState(data.config);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(true);
  const [overflow, setOverflow] = useState(false);
  const label = useRef<HTMLDivElement>(null);
  const parsed = exportLabelSchema.safeParse(config);
  let validation = parsed.success ? '' : parsed.error.issues[0].message;
  if (parsed.success) { try { validateLabelSource(parsed.data, data); } catch (e) { validation = (e as Error).message; } }
  const change = (key: keyof ExportLabelConfig, value: string | number) => { setConfig(c => ({ ...c, [key]: value })); setSaved(false); };
  useEffect(() => {
    const measure = () => { const node = label.current; if (node) setOverflow(node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2); };
    const observer = new ResizeObserver(measure); if (label.current) observer.observe(label.current);
    void document.fonts.ready.then(measure); measure();
    return () => observer.disconnect();
  }, [config]);
  const width = config.widthMm || 148, height = config.heightMm || 160;
  const valid = !validation && !overflow && saved;
  async function save() {
    if (!parsed.success) return;
    setBusy(true); setError('');
    try { const response = await fetch(`/api/processing/qr/${data.token}/label`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) }); const body = await response.json(); if (!response.ok) throw Error(body.error); setSaved(true); }
    catch (e) { setError((e as Error).message || 'Không lưu được cấu hình tem.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-5">
    <style>{`
      @page { size: ${width}mm ${height}mm; margin: 0; }
      .export-carton-label { box-sizing: border-box; width:${width}mm; height:${height}mm; padding:6mm; background:white; color:black; font-family:Arial,'Microsoft YaHei','PingFang SC','Noto Sans CJK SC',SimSun,sans-serif; display:flex; flex-direction:column; gap:3mm; }
      .export-carton-label table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:11pt; line-height:1.3; }
      .export-carton-label th,.export-carton-label td { border:1.5px solid black; padding:2.3mm; overflow-wrap:anywhere; vertical-align:middle; }
      .export-carton-label th { width:48%; text-align:left; font-weight:600; }
      .export-carton-label td { text-align:center; font-weight:600; }
      .export-carton-label .registration-code { font-size:16pt; font-weight:800; }
      .export-carton-label .export-destination { border:1.5px solid black; padding:2mm; text-align:center; font-weight:800; font-size:13pt; line-height:1.3; margin-top:auto; }
      @media print {
        html,body { margin:0!important;padding:0!important;background:white!important; }
        body *:not(:has(.export-carton-label)):not(.export-carton-label):not(.export-carton-label *) { display:none!important; }
        body *:has(.export-carton-label) { display:block!important;padding:0!important;margin:0!important;width:auto!important;max-width:none!important;min-height:0!important;overflow:visible!important; }
        .export-carton-label { margin:0!important;box-shadow:none!important;break-inside:avoid;page-break-inside:avoid; }
        ${valid ? '' : '.export-carton-label { display:none!important; }'}
      }
    `}</style>
    <section className="no-print mx-auto mb-5 max-w-5xl space-y-3 rounded-2xl border bg-white p-5">
      <h1 className="text-xl font-bold">Tem thùng xuất khẩu · {data.lotCode}</h1>
      <p className="text-sm text-slate-600">Chọn đúng vùng trồng của thùng hàng. Chỉ in sau khi đã kiểm tra nội dung dịch. Kích thước {width} × {height} mm, tỷ lệ in 100%; tắt đầu/chân trang trình duyệt.</p>
      {data.warnings.map(w => <p key={w} className="text-sm text-amber-700">{w}</p>)}
      {data.canEdit && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">Vùng trồng của thùng<select className="mt-1 w-full rounded-lg border p-2" value={config.orchardCode || ''} onChange={e => { const selected = data.orchards.find(r => r.code === e.target.value); setConfig(c => ({ ...c, orchardCode: e.target.value, productionEn: '', productionZh: '', ...productionTranslation(selected?.province || '') })); setSaved(false); }}><option value="">Chọn vùng trồng...</option>{data.orchards.map(r => <option key={r.code} value={r.code}>{r.code} · {r.name}</option>)}</select></label>
        {(['productEn','productZh','productionEn','productionZh','exportCountryEn','exportCountryZh','importCountryEn','importCountryZh'] as const).map(key => <label key={key} className="text-sm">{{ productEn:'Sản phẩm (Anh)',productZh:'Sản phẩm (Trung)',productionEn:'Xuất xứ (Anh)',productionZh:'Xuất xứ (Trung)',exportCountryEn:'Nước xuất khẩu (Anh)',exportCountryZh:'Nước xuất khẩu (Trung)',importCountryEn:'Nước nhập khẩu (Anh)',importCountryZh:'Nước nhập khẩu (Trung)' }[key]}<input maxLength={180} className="mt-1 w-full rounded-lg border p-2" value={config[key] || ''} onChange={e => change(key, e.target.value)} /></label>)}
        {(['widthMm','heightMm'] as const).map(key => <label key={key} className="text-sm">{key === 'widthMm' ? 'Chiều rộng (mm), 120–210' : 'Chiều cao (mm), 140–297'}<input type="number" className="mt-1 w-full rounded-lg border p-2" value={config[key]} onChange={e => change(key, Number(e.target.value))} /></label>)}
      </div>}
      {(validation || overflow || error) && <p role="alert" className="text-sm text-red-700">{error || (overflow ? 'Nội dung vượt khổ tem. Tăng kích thước hoặc rút gọn nội dung trước khi in.' : validation)}</p>}
      <div className="flex flex-wrap gap-3"><Link className="rounded-lg border px-4 py-2" href="/dashboard/processing/qr">Quản lý mã QR</Link>{data.canEdit && <button className="rounded-lg border px-4 py-2 disabled:opacity-40" disabled={busy || !!validation} onClick={() => void save()}>{busy ? 'Đang lưu...' : saved ? 'Đã lưu cấu hình' : 'Lưu cấu hình tem'}</button>}<button disabled={!valid || busy} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-40" onClick={() => window.print()}>In tem</button></div>
    </section>
    <div className="overflow-x-auto pb-4"><div ref={label} className="export-carton-label mx-auto shadow-lg" lang="en">
      <table><tbody>
        <tr><th><span lang="zh-CN">水果名称</span><br />Fruit Name</th><td><span lang="zh-CN">{config.productZh || '—'}</span><br />{config.productEn || '—'}</td></tr>
        <tr><th><span lang="zh-CN">产地</span><br />Place of Production</th><td><span lang="zh-CN">{config.productionZh || '—'}</span><br />{config.productionEn || '—'}</td></tr>
        <tr><th><span lang="zh-CN">果园代码</span> / Orchard Code</th><td className="registration-code">{config.orchardCode || '—'}</td></tr>
        <tr><th><span lang="zh-CN">包装厂代码</span> / Packing House Code</th><td className="registration-code">{data.packingHouseCode || '—'}</td></tr>
        <tr><th><span lang="zh-CN">出口国家</span> / Export Country</th><td><span lang="zh-CN">{config.exportCountryZh || '—'}</span> / {config.exportCountryEn || '—'}</td></tr>
      </tbody></table>
      <div style={{ textAlign:'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrImage} alt="Traceability QR" width={900} height={900} style={{ width:'45mm',height:'45mm',margin:'0 auto',imageRendering:'pixelated' }} />
        <p style={{ fontSize:'9pt' }}><span lang="zh-CN">扫码查看溯源信息</span> / Scan for Traceability</p>
        <p style={{ fontSize:'8pt' }}>Lot: {data.lotCode}</p>
      </div>
      <div className="export-destination"><p lang="zh-CN">输往{config.importCountryZh || '—'}</p><p>Exported to {config.importCountryEn || '—'}</p></div>
    </div></div>
  </main>;
}
