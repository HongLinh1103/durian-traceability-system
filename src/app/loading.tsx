export default function Loading() {
    return (
        <div role="status" aria-live="polite" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
                Đang tải trang…
            </div>
            <div aria-hidden="true" className="mt-6 space-y-4 animate-pulse motion-reduce:animate-none">
                <div className="h-16 rounded-2xl bg-slate-100" />
                <div className="h-64 rounded-3xl bg-slate-100" />
            </div>
        </div>
    );
}
