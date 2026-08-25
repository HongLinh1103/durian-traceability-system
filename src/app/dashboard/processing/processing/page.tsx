import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Factory, PauseCircle, PlayCircle, Settings2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatStatusLabel } from "@/lib/processing-facility";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const facility = await prisma.partnerFacility.findUnique({ where: { ownerId: session.user.id } });
    const rows = facility ? await prisma.processingBatch.findMany({
        where: { facilityId: facility.id },
        include: {
            inputs: { include: { rawMaterialLot: { select: { lotCode: true } } } },
            supervisor: { select: { fullName: true } }
        },
        orderBy: { startedAt: "desc" }
    }) : [];
    const processingLots = rows.map(row => ({
        id: row.id,
        code: row.batchCode,
        rawMaterialLotCodes: row.inputs.map(input => input.rawMaterialLot.lotCode),
        method: row.method,
        startedAt: row.startedAt,
        finishedAt: row.completedAt,
        inputWeight: Number(row.totalInputWeight),
        outputWeight: Number(row.totalOutputWeight),
        lossRate: Number(row.totalInputWeight) > 0 ? Number(((Number(row.lossWeight) / Number(row.totalInputWeight)) * 100).toFixed(2)) : 0,
        supervisor: row.supervisor.fullName,
        status: row.status,
        note: row.note ?? ""
    }));

    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
            <header className="rounded-3xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Module chế biến</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Lô chế biến</h1>
                <p className="mt-2 text-sm text-slate-500">Tạo mẻ chế biến từ một hoặc nhiều lô nguyên liệu, luôn giữ lineage nguồn đầu vào.</p>
            </header>

            <section className="grid grid-cols-2 gap-3 sm:gap-4">
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
                            <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                {formatStatusLabel(lot.status)}
                            </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <Row label="Bắt đầu" value={lot.startedAt.toLocaleString("vi-VN")} />
                            <Row label="Kết thúc" value={lot.finishedAt ? lot.finishedAt.toLocaleString("vi-VN") : "Đang cập nhật"} />
                            <Row label="Khối lượng đầu vào" value={`${lot.inputWeight.toLocaleString("vi-VN")} kg`} />
                            <Row label="Khối lượng đầu ra" value={`${lot.outputWeight.toLocaleString("vi-VN")} kg`} />
                            <Row label="Tỷ lệ hao hụt" value={`${lot.lossRate.toLocaleString("vi-VN")} %`} />
                            <Row label="Người phụ trách" value={lot.supervisor ?? "Chưa cập nhật"} />
                        </dl>
                        {lot.note && (
                            <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">{lot.note}</p>
                        )}
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
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-slate-500 sm:text-sm">{label}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:h-9 sm:w-9">
                    <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                </span>
            </div>
            <p className="mt-2 truncate text-xl font-black text-slate-900 sm:text-2xl">{value.toLocaleString("vi-VN")}</p>
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
