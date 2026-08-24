import Link from "next/link";
import { CircleX } from "lucide-react";

export default function TraceNotFound() {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><section className="w-full max-w-lg rounded-3xl border bg-white p-7 text-center shadow-sm"><CircleX className="mx-auto h-12 w-12 text-red-500"/><h1 className="mt-4 text-2xl font-black text-slate-900">Mã truy xuất không hợp lệ</h1><p className="mt-2 text-slate-600">Không tìm thấy mã trong hệ thống TriViet. Vui lòng kiểm tra lại mã hoặc liên hệ đơn vị phát hành.</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">Về trang chủ</Link></section></main>;
}
