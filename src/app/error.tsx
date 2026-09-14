"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div role="alert" className="mx-auto max-w-xl px-4 py-12 text-center">
            <h1 className="text-xl font-bold text-slate-900">Chưa thể tải trang</h1>
            <p className="mt-2 text-sm text-slate-600">Vui lòng thử lại hoặc tải lại trang.</p>
            <div className="mt-5 flex justify-center gap-3">
                <button onClick={reset} className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white">Thử lại</button>
                <button onClick={() => window.location.reload()} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700">Tải lại trang</button>
            </div>
        </div>
    );
}
