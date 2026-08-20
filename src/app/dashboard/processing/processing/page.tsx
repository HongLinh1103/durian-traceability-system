import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Factory, PauseCircle, PlayCircle, Settings2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { buildProcessingLots, buildRawMaterialLots, formatStatusLabel, getProcessingHarvestSources } from "@/lib/processing-facility";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const sources = await getProcessingHarvestSources(session.user.id);
    const rawLots = buildRawMaterialLots(sources);
    const processingLots = buildProcessingLots(rawLots);

    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
            <header className="rounded-3xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Module chế biến</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Lô chế biến</h1>
                <p className="mt-2 text-sm text-slate-500">Tạo mẻ chế biến từ một hoặc nhiều lô nguyên liệu, luôn giữ lineage nguồn đầu vào.</p>
            </header>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric icon={Factory} label="Tổng lô chế biến" value={processingLots.length} />
                <Metric icon={PlayCircle} label="Đang chế biến" value={processingLots.filter((lot) => lot.status === "IN_PROGRESS").length} />
                <Metric icon={PauseCircle} label="Tạm dừng" value={processingLots.filter((lot) => lot.status === "PAUSED").length} />
                <Metric icon={Settings2} label="Hoàn tất" value={processingLots.filter((lot) => lot.status === "COMPLETED").length} />
            </section>

            <section className="grid gap-4">
                {processingLots.map((lot) => (
                    <article key={lot.id} className="rounded-3xl border bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{lot.code}</p>
                                <h2 className="mt-1 text-lg font-black text-slate-900">{lot.method}</h2>
                                <p className="mt-1 text-sm text-slate-500">Nguồn: {lot.rawMaterialLotCodes.join(", ")}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{formatStatusLabel(lot.status)}</span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <Row label="Bắt đầu" value={lot.startedAt.toLocaleString("vi-VN")} />
                            <Row label="Kết thúc" value={lot.finishedAt ? lot.finishedAt.toLocaleString("vi-VN") : "Đang cập nhật"} />
                            <Row label="Khối lượng đầu vào" value={`${lot.inputWeight.toLocaleString("vi-VN")} kg`} />
                            <Row label="Khối lượng đầu ra" value={`${lot.outputWeight.toLocaleString("vi-VN")} kg`} />
                            <Row label="Tỷ lệ hao hụt" value={`${lot.lossRate.toLocaleString("vi-VN")} %`} />
                            <Row label="Người phụ trách" value={lot.supervisor} />
                        </dl>
                        <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">{lot.note}</p>
                    </article>
                ))}

                {!processingLots.length && (
                    <p className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">Chưa có lô chế biến nào được tạo từ nguồn nguyên liệu đã tiếp nhận.</p>
                )}
            </section>
        </main>
    );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Factory; label: string; value: number }) {
    return (
        <article className="rounded-3xl border bg-white p-4 shadow-sm">
            <Icon className="h-5 w-5 text-brand-700" />
            <p className="mt-3 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </article>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-700">{value}</dd>
        </div>
    );
}
