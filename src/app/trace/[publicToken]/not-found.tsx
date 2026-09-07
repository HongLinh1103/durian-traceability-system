import Link from "next/link";

export default function TraceNotFound() {
    return (
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
            <h1 className="text-2xl font-bold">Không tìm thấy mã truy xuất</h1>
            <p className="mt-4 text-slate-600">Mã QR này chưa được phát hành hoặc đường dẫn không đúng. Vui lòng lấy lại mã QR từ lô xuất đã lưu thành công.</p>
            <Link href="/" className="mt-6 inline-block font-semibold text-emerald-700">Về trang chủ</Link>
        </main>
    );
}
