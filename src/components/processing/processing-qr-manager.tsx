'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
  Pencil,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { ProcessingTrace } from '@/lib/processing-qr';

type Row = ProcessingTrace['sale'] & {
  token: string | null;
  missing: string[];
  snapshot: ProcessingTrace;
};

const formatDate = (value: string) => {
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

const formatNumber = (value: number) => {
  return (value || 0).toLocaleString('vi-VN');
};

export default function ProcessingQrManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState<{ lot: string; token: string } | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'issued' | 'unissued'>('all');
  const [page, setPage] = useState(1);
  const dialogRef = useRef<HTMLDialogElement>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/processing/qr', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tải danh sách QR.');
      setRows(data.rows || []);
      setRevision(data.revision || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Sync confirmation modal
  useEffect(() => {
    if (selected) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [selected]);

  async function handleIssueQr() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/processing/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId: selected.id, revision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tạo QR.');

      const token = data.token;
      setSuccessNotice({ lot: selected.lot, token });
      setSelected(null);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo QR.');
    } finally {
      setBusy(false);
    }
  }

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterStatus === 'issued' && !r.token) return false;
      if (filterStatus === 'unissued' && r.token) return false;
      if (!q) return true;
      return (
        r.lot.toLowerCase().includes(q) ||
        r.variety.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterStatus]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const issuedCount = rows.filter((r) => r.token).length;
  const unissuedCount = rows.length - issuedCount;

  return (
    <main className="mx-auto w-full max-w-[1650px] space-y-6 px-3 py-6 sm:px-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">Cơ sở chế biến & đóng gói</p>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">QUẢN LÝ QR CODE</h1>
          <p className="mt-1 text-sm text-slate-600">
            Quản lý và phát hành mã QR truy xuất nguồn gốc cho các lô hàng xuất bán.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            Tải lại
          </button>
        </div>
      </header>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Đã phát hành mã QR thành công cho lô {successNotice.lot}!</p>
              <p className="text-xs text-emerald-700">Trang thông tin truy xuất nguồn gốc hiện đã hoạt động công khai.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/trace/packing/${successNotice.token}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Xem truy xuất
            </Link>
            <a
              href={`/api/processing/qr/${successNotice.token}/image`}
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              <Download className="h-3.5 w-3.5" />
              Tải mã QR
            </a>
            <Link
              href={`/trace/packing/${successNotice.token}/print`}

              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              <Printer className="h-3.5 w-3.5" />
              In mã QR
            </Link>
            <button
              type="button"
              onClick={() => setSuccessNotice(null)}
              className="ml-2 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Error Notice */}
      {error && !selected && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          {error}
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo mã lô hàng, chủng loại, khách hàng..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Lọc trạng thái:</span>
          <button
            type="button"
            onClick={() => {
              setFilterStatus('all');
              setPage(1);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tất cả ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus('unissued');
              setPage(1);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === 'unissued'
                ? 'bg-amber-600 text-white'
                : 'border border-slate-200 bg-white text-amber-700 hover:bg-amber-50'
            }`}
          >
            Chưa tạo QR ({unissuedCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus('issued');
              setPage(1);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === 'issued'
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Đã tạo QR ({issuedCount})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100/90 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th scope="col" className="border-r border-slate-200 px-4 py-3.5 text-center">STT</th>
                <th scope="col" className="border-r border-slate-200 px-4 py-3.5">Mã số lô hàng</th>
                <th scope="col" className="border-r border-slate-200 px-4 py-3.5">Chủng loại</th>
                <th scope="col" className="border-r border-slate-200 px-4 py-3.5 text-center">Ngày xuất bán</th>
                <th scope="col" className="border-r border-slate-200 px-4 py-3.5">Khách hàng</th>
                <th scope="col" className="border-r border-slate-200 px-4 py-3.5 text-right">Khối lượng</th>
                <th scope="col" className="border-r border-slate-200 px-4 py-3.5 text-center">Trạng thái QR</th>
                <th scope="col" className="px-3 py-3.5 text-center w-28 whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                      <p>Đang tải danh sách lô hàng...</p>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    {search.trim() ? 'Không tìm thấy lô hàng nào phù hợp với từ khóa.' : 'Chưa có lô hàng xuất bán nào.'}
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, index) => {
                  const isIssued = Boolean(row.token);
                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* STT */}
                      <td className="border-r border-slate-200 px-4 py-3.5 text-center text-xs font-semibold text-slate-500">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      {/* Mã số lô hàng */}
                      <td className="border-r border-slate-200 px-4 py-3.5 font-mono font-bold text-slate-900">
                        {row.lot}
                      </td>

                      {/* Chủng loại */}
                      <td className="border-r border-slate-200 px-4 py-3.5 font-medium text-slate-800">
                        {row.variety || 'Chưa cập nhật'}
                      </td>

                      {/* Ngày xuất bán */}
                      <td className="border-r border-slate-200 px-4 py-3.5 text-center tabular-nums text-slate-700">
                        {formatDate(row.date)}
                      </td>

                      {/* Khách hàng */}
                      <td className="border-r border-slate-200 px-4 py-3 text-slate-900">
                        {row.customer || 'Chưa cập nhật'}
                      </td>

                      {/* Khối lượng */}
                      <td className="border-r border-slate-200 px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatNumber(row.weight)} kg
                      </td>

                      {/* Trạng thái QR */}
                      <td className="border-r border-slate-200 px-4 py-3 text-center text-sm whitespace-nowrap">
                        {isIssued ? (
                          <span className="text-emerald-600">Đã tạo QR</span>
                        ) : (
                          <span className="text-amber-600">Chưa tạo QR</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-2 py-2 text-center w-24 whitespace-nowrap">
                        {!isIssued ? (
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setError('');
                                setSelected(row);
                              }}
                              title="Tạo mã QR"
                              className="group relative flex h-7 w-7 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              aria-label="Tạo mã QR"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-20">
                                Tạo mã QR
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/trace/packing/${row.token}`}
                              title="Xem truy xuất"
                              className="group relative flex h-7 w-7 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              aria-label="Xem truy xuất"
                            >
                              <QrCode className="h-4 w-4" />
                              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-20">
                                Xem truy xuất
                              </span>
                            </Link>

                            <a
                              href={`/api/processing/qr/${row.token}/image`}
                              download
                              title="Tải mã QR"
                              className="group relative flex h-7 w-7 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition focus:outline-none focus:ring-1 focus:ring-blue-500"
                              aria-label="Tải mã QR"
                            >
                              <Download className="h-4 w-4" />
                              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-20">
                                Tải mã QR
                              </span>
                            </a>

                            <Link
                              href={`/trace/packing/${row.token}/print`}

                              title="In mã QR"
                              className="group relative flex h-7 w-7 items-center justify-center rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-800 transition focus:outline-none focus:ring-1 focus:ring-purple-500"
                              aria-label="In mã QR"
                            >
                              <Printer className="h-4 w-4" />
                              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-20">
                                In mã QR
                              </span>
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <nav aria-label="Phân trang mã QR" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 p-4 text-sm">
          <span className="text-xs text-slate-600">
            Hiển thị {filteredRows.length ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, filteredRows.length)} trong tổng số {filteredRows.length} lô xuất bán
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-xs font-medium text-slate-600">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </nav>
      </section>

      {/* MODAL: TẠO MÃ QR TRUY XUẤT */}
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setSelected(null);
        }}
        className="w-[min(94vw,620px)] rounded-3xl p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm border border-slate-200"
        aria-labelledby="qr-modal-title"
      >
        {selected && (
          <div className="p-6 sm:p-7 space-y-6 bg-white rounded-3xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 id="qr-modal-title" className="text-xl font-black text-slate-900 tracking-tight">
                  TẠO MÃ QR TRUY XUẤT
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Xác nhận thông tin lô hàng và các nguồn dữ liệu trước khi phát hành mã QR
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelected(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thông tin lô hàng tóm tắt */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <dl className="grid grid-cols-[130px_1fr] sm:grid-cols-[150px_1fr] gap-x-4 gap-y-2.5 text-sm">
                <dt className="text-slate-500 font-medium">Mã số lô hàng</dt>
                <dd className="font-mono font-bold text-slate-900">{selected.lot}</dd>

                <dt className="text-slate-500 font-medium">Chủng loại</dt>
                <dd className="font-semibold text-slate-900">{selected.variety || 'Chưa cập nhật'}</dd>

                <dt className="text-slate-500 font-medium">Ngày xuất bán</dt>
                <dd className="tabular-nums font-semibold text-slate-900">{formatDate(selected.date)}</dd>

                <dt className="text-slate-500 font-medium">Khối lượng</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">{formatNumber(selected.weight)} kg</dd>

                <dt className="text-slate-500 font-medium">Khách hàng</dt>
                <dd className="font-semibold text-slate-900">{selected.customer || 'Chưa cập nhật'}</dd>
              </dl>
            </div>

            {/* Dữ liệu truy xuất */}
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Dữ liệu truy xuất
              </p>
              <div className="mt-3 space-y-2.5">
                {[
                  {
                    name: 'Vùng trồng',
                    detail: selected.snapshot.region?.name
                      ? `${selected.snapshot.region.name} (${selected.snapshot.region.code})`
                      : 'Vùng trồng sầu riêng Nguyễn Văn Nam (VN-TGOR-9001)',
                  },
                  {
                    name: 'Thu hoạch',
                    detail: selected.snapshot.harvest?.weight
                      ? `Khối lượng: ${formatNumber(selected.snapshot.harvest.weight)} kg · ${formatDate(selected.snapshot.harvest.date)}`
                      : 'Khối lượng: 6.200 kg · Thu hoạch đạt chuẩn độ chín',
                  },
                  {
                    name: 'Xuất bán',
                    detail: `${selected.snapshot.seller?.name || 'Cơ sở chế biến & đóng gói Trí Việt'} · Lô ${selected.lot}`,
                  },
                ].map((item) => {
                  const isMissing = selected.missing.includes(item.name);
                  return (
                    <div
                      key={item.name}
                      className={`flex items-start gap-3 rounded-xl border p-3 ${
                        isMissing
                          ? 'border-amber-200 bg-amber-50/70 text-amber-900'
                          : 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isMissing ? (
                          <Info className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{item.name}</span>
                          <span className={`text-[11px] font-semibold ${isMissing ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {isMissing ? 'Chưa đủ dữ liệu' : '✓ Sẵn sàng'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-slate-600">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error in modal if any */}
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busy || selected.missing.length > 0}
                onClick={handleIssueQr}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-40 transition"
              >
                {busy ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Tạo mã QR
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
