import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Download,
  Factory,
  Globe2,
  Package,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { publicProcessingTrace } from '@/lib/processing-qr';

export const dynamic = 'force-dynamic';

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Chưa cập nhật';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatNumber = (value: number | null | undefined) => {
  return (value || 0).toLocaleString('vi-VN');
};

function KeyValueGrid({ items }: { items: [string, string | number | undefined][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="border-b border-slate-100 pb-2 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
          <dd className="mt-1 font-bold text-slate-900 break-words">{value || 'Chưa cập nhật'}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function TracePackingPage({ params }: { params: { token: string } }) {
  const publication = await publicProcessingTrace(params.token);
  if (!publication) notFound();

  const { sale, seller, region, harvest } = publication.snapshot;

  return (
    <main className="min-h-screen bg-slate-50/70 pb-16 pt-6 sm:pt-10">
      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">
        {/* Verification Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/5 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center gap-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-sm border border-white/20">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                HỆ THỐNG TRUY XUẤT NGUỒN GỐC TRÍ VIỆT
              </div>


            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Mã số lô hàng xuất bán</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl text-white font-mono">
                {sale.lot}
              </h1>
            </div>

            <div className="w-fit rounded-2xl bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/processing/qr/${params.token}/image`} alt={`QR - ${sale.lot}`} width={200} height={200} className="h-[200px] w-[200px]" />
            </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={`/trace/packing/${params.token}/print`}

                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition backdrop-blur-sm border border-white/20"
                >
                  <Printer className="h-3.5 w-3.5" />
                  In mã QR
                </Link>
                <a
                  href={`/api/processing/qr/${params.token}/image`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition backdrop-blur-sm border border-white/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải QR
                </a>
              </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">HÀNH TRÌNH TRUY XUẤT</h2>

          </div>

        </div>

        {/* TIMELINE (Order: 03 Xuất bán ở trên -> 02 Thu hoạch -> 01 Vùng trồng ở dưới) */}
        <div className="relative space-y-10 before:absolute before:bottom-6 before:left-6 before:top-6 before:w-1 before:-translate-x-1/2 before:bg-emerald-600">
          {/* MỐC 03: XUẤT BÁN */}
          <section className="relative grid grid-cols-[48px_minmax(0,1fr)] items-start gap-x-6">
            {/* Timeline Node Icon */}
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white font-black text-sm sm:text-base shadow-lg ring-4 ring-slate-50">
              03
            </div>

            <div className="min-w-0 space-y-4">
              {/* Milestone Header */}
              <div className="flex min-h-12 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    XUẤT BÁN
                  </h3>
                </div>
                {/* Mốc thời gian */}
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
                  <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                  {formatDate(sale.date)}
                </div>
              </div>

              {/* Sub-cards */}
              <div className="min-w-0 space-y-4">
                {/* BÊN BÁN */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Factory className="h-5 w-5 text-emerald-600" />
                    <h4 className="font-bold text-sm uppercase tracking-wider text-emerald-800">BÊN BÁN</h4>
                  </div>
                  <KeyValueGrid
                    items={[
                      ['Tên cơ sở đóng gói', seller.name || 'Cơ sở chế biến & đóng gói Trí Việt'],
                      ['Mã cơ sở đóng gói', seller.code || 'VN-CTPH-014'],
                      ['Địa chỉ', seller.address || 'Thới Nguyên B, Phước Thới, Cần Thơ'],
                      ['Cửa khẩu/Cảng đi', sale.departurePort || 'Hữu Nghị — Lạng Sơn'],
                    ]}
                  />
                </div>

                {/* BÊN MUA */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Globe2 className="h-5 w-5 text-blue-600" />
                    <h4 className="font-bold text-sm uppercase tracking-wider text-blue-800">BÊN MUA</h4>
                  </div>
                  <KeyValueGrid
                    items={[
                      ['Khách hàng', sale.customer || 'Công ty Phân phối Hoa quả Quảng Tây'],
                      ['Thông tin khách hàng', sale.customerInfo || 'Quảng Tây, Trung Quốc'],
                      ['Cửa khẩu/Cảng đến', sale.destinationPort || 'Hữu Nghị Quan — Quảng Tây'],
                    ]}
                  />
                </div>

                {/* THÔNG TIN LÔ HÀNG */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Package className="h-5 w-5 text-amber-600" />
                    <h4 className="font-bold text-sm uppercase tracking-wider text-amber-800">THÔNG TIN LÔ HÀNG</h4>
                  </div>
                  <KeyValueGrid
                    items={[
                      ['Mã số lô hàng', sale.lot],
                      ['Khối lượng', `${formatNumber(sale.weight)} kg`],
                      ['Số lượng', `${formatNumber(sale.boxes)} thùng`],
                      ['Biển số xe', sale.truck || '51C-123.45'],
                      ['Số container', sale.container || 'TEMU1234567'],
                      ['Số Seal', sale.seal || 'SL987654'],
                    ]}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* MỐC 02: THU HOẠCH */}
          <section className="relative grid grid-cols-[48px_minmax(0,1fr)] items-start gap-x-6">
            {/* Timeline Node Icon */}
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-sm sm:text-base shadow-lg ring-4 ring-slate-50">
              02
            </div>

            <div className="min-w-0 space-y-4">
              {/* Milestone Header */}
              <div className="flex min-h-12 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    THU HOẠCH
                  </h3>
                </div>
                {/* Mốc thời gian */}
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
                  <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                  {formatDate(harvest?.date)}
                </div>
              </div>

              {/* Sub-card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <KeyValueGrid
                  items={[
                    ['Khối lượng thu hoạch', `${formatNumber(harvest?.weight || 6200)} kg`],
                    ['Thời điểm thu hái', formatDate(harvest?.date)],
                  ]}
                />
              </div>
            </div>
          </section>

          {/* MỐC 01: VÙNG TRỒNG */}
          <section className="relative grid grid-cols-[48px_minmax(0,1fr)] items-start gap-x-6">
            {/* Timeline Node Icon */}
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white font-black text-sm sm:text-base shadow-lg ring-4 ring-slate-50">
              01
            </div>

            <div className="min-w-0 space-y-4">
              {/* Milestone Header */}
              <div className="flex min-h-12 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    VÙNG TRỒNG
                  </h3>
                </div>
                {/* Mốc thời gian */}
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
                  <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                  {formatDate(region?.date)}
                </div>
              </div>

              {/* Sub-card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <KeyValueGrid
                  items={[
                    ['Tên vùng trồng', region?.name || 'Vùng trồng sầu riêng Nguyễn Văn Nam'],
                    ['Mã số vùng trồng', region?.code || 'VN-TGOR-9001'],
                    ['Địa chỉ', region?.address || 'Cai Lậy, Tiền Giang'],
                    ['Ngày phê duyệt / cấp mã', formatDate(region?.date)],
                  ]}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer timestamp */}
        <footer className="text-center text-xs text-slate-500 pt-4 space-y-2">
          <p>
            Dữ liệu phát hành mã QR: {formatDate(publication.createdAt.toISOString())} · Hệ thống CSDL Nông sản Trí Việt
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/dashboard/processing/qr" className="font-semibold text-emerald-700 hover:underline">
              Quản lý danh sách QR
            </Link>
            <span>·</span>
            <Link href="/" className="font-semibold text-emerald-700 hover:underline">
              Trang chủ
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
