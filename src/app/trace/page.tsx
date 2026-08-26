import Link from "next/link";
import { ArrowLeft, QrCode, ShieldCheck, Sprout, CheckCircle2, Factory, Truck } from "lucide-react";
import { QrTraceScanner } from "@/components/traceability/qr-trace-scanner";

export const metadata = {
    title: "Quét mã QR Truy Xuất Nguồn Gốc · TriViet",
    description: "Quét mã QR hoặc nhập mã để tra cứu nguồn gốc xuất xứ sầu riêng, nhật ký canh tác chuẩn VietGAP & GACC.",
};

export default function TraceScannerPage() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white px-4 py-8 text-slate-900 sm:py-12">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Navigation Bar */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Về trang chủ</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                            Hệ thống chính thống TriViet
                        </span>
                    </div>
                </div>

                {/* Page Title & Intro */}
                <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                        <QrCode className="h-6 w-6" />
                    </div>
                    <h1
                        className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Cổng Truy Xuất Nguồn Gốc Sầu Riêng
                    </h1>
                    <p className="mx-auto max-w-xl text-xs sm:text-sm text-slate-600 leading-relaxed">
                        Hỗ trợ quét qua Camera máy tính/điện thoại, tải ảnh chụp tem QR hoặc nhập mã in trên bao bì để kiểm tra toàn diện chuỗi cung ứng.
                    </p>
                </div>

                {/* Main QR Scanner Card */}
                <QrTraceScanner variant="full" />

                {/* Traceability Journey Explanation */}
                <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-lg font-black text-slate-900">
                            Thông tin bạn sẽ nhận được sau khi quét mã:
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <Sprout className="h-4 w-4" />
                            </div>
                            <h3 className="mt-3 text-sm font-bold text-slate-900">1. Vườn & Vùng trồng</h3>
                            <p className="mt-1 text-xs text-slate-500">Mã số vùng trồng (MSVT), giống sầu riêng (Ri6, Dona), vị trí địa lý nông hộ.</p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <h3 className="mt-3 text-sm font-bold text-slate-900">2. Nhật ký & Cách ly</h3>
                            <p className="mt-1 text-xs text-slate-500">Toàn bộ hoạt động bón phân, phòng trừ sâu bệnh, bảo đảm đủ ngày cách ly (PHI).</p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <Factory className="h-4 w-4" />
                            </div>
                            <h3 className="mt-3 text-sm font-bold text-slate-900">3. Thu hoạch & QC</h3>
                            <p className="mt-1 text-xs text-slate-500">Ngày thu hoạch, biên bản kiểm tra chất lượng (QC) của vựa hoặc cơ sở chế biến.</p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <Truck className="h-4 w-4" />
                            </div>
                            <h3 className="mt-3 text-sm font-bold text-slate-900">4. Xuất bán & Phân phối</h3>
                            <p className="mt-1 text-xs text-slate-500">Điểm đến phân phối (siêu thị, đại lý, chợ đầu mối hoặc cảng xuất khẩu).</p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
