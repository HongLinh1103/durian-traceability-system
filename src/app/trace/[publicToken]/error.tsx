"use client";

export default function TraceError({ reset }: { reset: () => void }) {
    return (
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
            <h1 className="text-2xl font-bold">Tạm thời không thể tải thông tin truy xuất</h1>
            <p className="mt-4 text-slate-600">Vui lòng thử lại sau. Nếu lỗi tiếp diễn, hãy liên hệ đơn vị phát hành QR.</p>
            <button onClick={reset} className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white">Thử lại</button>
        </main>
    );
}
