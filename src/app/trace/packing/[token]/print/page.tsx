import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft } from 'lucide-react';
import { publicProcessingTrace } from '@/lib/processing-qr';
import PrintQrButton from '@/components/processing/print-qr-button';
import QrPrintTimestamp from '@/components/processing/qr-print-timestamp';

export const dynamic = 'force-dynamic';

const formatNumber = (value: number | null | undefined) => {
  return (value || 0).toLocaleString('vi-VN');
};

export default async function PrintPage({ params }: { params: { token: string } }) {
  const result = await publicProcessingTrace(params.token);
  if (!result) notFound();

  const h = headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get('x-forwarded-proto') || 'http'}://${h.get('host')}`;
  const url = new URL('/trace/packing/' + params.token, origin).toString();
  const image = await QRCode.toDataURL(url, { width: 900, margin: 4, errorCorrectionLevel: 'M' });

  const { sale, seller } = result.snapshot;

  return (
    <main className="min-h-screen bg-slate-100/70 p-4 sm:p-8 print:p-0 print:bg-white flex flex-col items-center">
      {/* Print styles */}
      <style>{`
        @page { size: A5 portrait; margin: 0; }
        .qr-print-card {
          box-sizing: border-box;
          width: 148mm;
          max-width: none;
          min-width: 148mm;
          height: 210mm;
          padding: 10mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 3mm;
          border: 0;
          border-radius: 0;
          color: #000;
          background: #fff;
        }
        .qr-print-card > * { margin: 0 !important; flex-shrink: 0; }
        .qr-print-card > div:first-child { padding-bottom: 2mm; }
        .qr-print-timestamp { display: block; text-align: left; font-size: 8pt; line-height: 1.2; margin-bottom: 2mm; color: #000; }
        .qr-print-card > div:first-child p { color: #000; font-size: 12pt; line-height: 1.2; overflow-wrap: anywhere; }
        .qr-print-card h1 { font-size: 18pt; line-height: 1.2; margin-top: 2mm; }
        .qr-print-card > div:nth-child(2) { padding: 0; }
        .qr-print-card img { width: 90mm; height: 90mm; padding: 0; border: 0; border-radius: 0; box-shadow: none; }
        .qr-print-card > div:nth-child(2) p { margin-top: 1mm; font-size: 10pt; line-height: 1.2; color: #000; }
        .qr-print-card > div:last-child { padding: 2mm; border-radius: 0; background: white; border-color: #000; }
        .qr-print-card > div:last-child > div { gap: 2mm; padding-bottom: 1mm; }
        .qr-print-card > div:last-child span { color: #000; font-size: 12pt; line-height: 1.2; }
        .qr-print-card > div:last-child span:last-child { text-align: right; overflow-wrap: anywhere; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body *:not(:has(.qr-print-card)):not(.qr-print-card):not(.qr-print-card *) { display: none !important; }
          body *:has(.qr-print-card) { display: block !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; height: auto !important; width: auto !important; overflow: visible !important; }
          .qr-print-card {
            position: static !important;
            transform: none !important;
            width: 148mm !important;
            min-width: 148mm !important;
            height: 210mm !important;
            padding: 10mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <header className="no-print mb-5 w-full max-w-lg">
        <h1 className="text-2xl font-black text-slate-900">XEM TRƯỚC BẢN IN QR</h1>
        <p className="mt-2 text-sm text-slate-600">Khổ A5 dọc (148 × 210 mm), lề 10 mm bốn phía. Khi in, chọn A5, tỷ lệ 100% và tắt đầu/chân trang trình duyệt.</p>
      </header>
      {/* Action buttons (hidden when printing) */}
      <div className="no-print mb-6 flex items-center justify-between gap-4 w-full max-w-lg">
        <Link
          href="/dashboard/processing/qr"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Quản lý mã QR
        </Link>
        <PrintQrButton />
      </div>

      {/* Printable Label Card */}
      <div className="qr-print-card shadow-xl text-center">
        {/* Facility Header */}
        <div className="border-b border-slate-200 pb-3">
          <QrPrintTimestamp initialTime={new Date().toISOString()} />
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            {seller.name || 'Cơ sở chế biến & đóng gói Trí Việt'}
          </p>
          <p className="text-[11px] text-slate-500">
            Mã CSĐG: <span className="font-semibold text-slate-800">{seller.code || 'VN-CTPH-014'}</span>
          </p>
          <h1 className="mt-2 text-xl font-black text-slate-900 tracking-tight">
            TEM TRUY XUẤT NGUỒN GỐC
          </h1>
        </div>

        {/* QR Code Image */}
        <div className="py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={'Mã QR truy xuất lô ' + sale.lot}
            width={340}
            height={340}
            className="mx-auto rounded-xl border border-slate-200 p-2 shadow-xs"
          />
          <p className="mt-2 text-xs font-semibold text-slate-500">Quét mã QR để xem hành trình truy xuất</p>
        </div>

        {/* Batch Info Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs space-y-1.5 font-medium text-slate-700">
          <div className="flex justify-between border-b border-slate-200/60 pb-1">
            <span className="text-slate-500">Mã số lô:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{sale.lot}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-1">
            <span className="text-slate-500">Chủng loại:</span>
            <span className="font-bold text-slate-900">{sale.variety}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-1">
            <span className="text-slate-500">Khối lượng:</span>
            <span className="font-bold text-slate-900">{formatNumber(sale.weight)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Số lượng:</span>
            <span className="font-bold text-slate-900">{formatNumber(sale.boxes)} thùng</span>
          </div>
        </div>

      </div>
    </main>
  );
}
