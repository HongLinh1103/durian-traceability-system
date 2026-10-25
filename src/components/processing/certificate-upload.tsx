'use client';
import { useState } from 'react';
import { CERTIFICATE_MAX_BYTES, isCertificateLink } from '@/lib/processing-certificate';
export function CertificateLink({ value }: { value: unknown }) {
  return isCertificateLink(value) ? <a href={value} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">Xem giấy kiểm nghiệm</a> : <>—</>;
}
export function CertificateUpload({ value, onChange, onBusy }: {value: unknown; onChange: (value: string) => void; onBusy: (busy: boolean) => void}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="text-sm"><label className="block text-xs font-semibold text-slate-600">Giấy kiểm nghiệm<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-2 block w-full rounded-xl border p-2" onChange={async e => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setError('');
    if (file.size > CERTIFICATE_MAX_BYTES) { setError('Ảnh tối đa 5 MB.'); return; }
    setBusy(true); onBusy(true);
    try {
      const form = new FormData(); form.append('file', file);
      const response = await fetch('/api/processing/gmp/certificates', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok || !isCertificateLink(data.url)) throw Error(data.error || 'Không thể tải ảnh.');
      onChange(data.url);
    } catch (error) { setError(error instanceof Error ? error.message : 'Không thể tải ảnh.'); }
    finally { setBusy(false); onBusy(false); }
  }} /></label><p className="mt-1 text-xs text-slate-500">PNG, JPG hoặc WebP · tối đa 5 MB</p>{busy ? <p role="status">Đang tải ảnh…</p> : <CertificateLink value={value} />}{value && !busy ? <button type="button" className="ml-3 text-xs underline" onClick={() => onChange('')}>Bỏ chọn</button> : null}{error && <p role="alert" className="mt-1 text-red-700">{error}</p>}</div>;
}
