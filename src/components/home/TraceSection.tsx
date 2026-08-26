"use client";

import Link from "next/link";
import {
    CheckCircle2,
    ShieldCheck,
    Sprout,
    QrCode,
    FileCheck2,
    Truck,
    Factory,
    ExternalLink,
    Search,
    ChevronRight,
} from "lucide-react";
import { QrTraceScanner } from "@/components/traceability/qr-trace-scanner";

export function TraceSection() {
    return (
        <section id="tra-cuu-qr" className="my-8 scroll-mt-20 sm:my-12">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
                {/* Left / Main Column: Scanner Card */}
                <div className="lg:col-span-7 xl:col-span-7">
                    <QrTraceScanner variant="card" />
                </div>

                {/* Right Column: Informative Value Props & Trace Journey */}
                <div className="flex flex-col justify-between space-y-6 lg:col-span-5 xl:col-span-5">
                    {/* Header Card */}
                    <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-soft sm:p-7">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <span>Bảo chứng chất lượng nông sản</span>
                        </div>
                        <h3
                            className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            Chuỗi truy xuất minh bạch từ nông trại
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Mỗi quả sầu riêng mang tem QR TriViet đều được mã hóa nhật ký canh tác số, kiểm định cách ly hoạt chất và kiểm soát nghiêm ngặt theo tiêu chuẩn VietGAP & GACC xuất khẩu.
                        </p>

                        <div className="mt-5 space-y-3.5 border-t border-slate-100 pt-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <Sprout className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-slate-900">Mã số vùng trồng & Nông hộ</h4>
                                    <p className="text-xs text-slate-500">Định danh chuẩn MSVT, vị trí vườn và hồ sơ kỹ thuật.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <FileCheck2 className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-slate-900">Nhật ký vật tư & Tuân thủ GACC</h4>
                                    <p className="text-xs text-slate-500">Đối soát thời gian cách ly thuốc BVTV, loại trừ 100% hoạt chất cấm.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <Truck className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-slate-900">Hành trình thu mua & Vận chuyển</h4>
                                    <p className="text-xs text-slate-500">Theo dõi lô hàng từ thu hoạch, kiểm tra QC đến điểm phân phối.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* How-to guide card */}
                    <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-emerald-50/70 via-slate-50 to-white p-6 shadow-sm">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                            Hướng dẫn tra cứu nhanh
                        </h4>
                        <ol className="mt-3 space-y-2 text-xs text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">1</span>
                                <span>Bật camera và hướng vào mã QR trên tem dán hoặc thùng sầu riêng.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">2</span>
                                <span>Hoặc chụp ảnh tem QR và tải lên mục <b>&ldquo;Tải ảnh QR&rdquo;</b>.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">3</span>
                                <span>Hoặc nhập chuỗi ký tự in dưới tem (ví dụ: <code className="rounded bg-emerald-100 px-1 py-0.5 font-mono text-[10px] font-bold text-emerald-800">TV-...</code>).</span>
                            </li>
                        </ol>

                        <div className="mt-4 flex items-center justify-between border-t border-emerald-100/80 pt-3">
                            <Link
                                href="/documents"
                                className="inline-flex items-center text-xs font-bold text-emerald-700 transition hover:text-emerald-800"
                            >
                                Xem tài liệu kỹ thuật canh tác
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
