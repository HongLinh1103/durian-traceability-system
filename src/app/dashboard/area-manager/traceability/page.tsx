import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { QrCode, ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { collectPublicHarvestSources, validateTraceability } from "@/lib/traceability";
import { getManagedRegionScope } from "@/lib/region-manager-scope";

export const dynamic = "force-dynamic";

export default async function AreaManagerTraceabilityPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "AREA_MANAGER") redirect("/login");
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    const regionIds = new Set(scope?.ids ?? []);
    const candidates = await prisma.commercialLot.findMany({
        include: {
            farmerOwner: { select: { fullName: true } },
            owner: { select: { name: true } },
            destination: { select: { name: true, type: true } },
            traceabilityCode: { select: { publicToken: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    const lots = [] as Array<(typeof candidates)[number] & { validation: Awaited<ReturnType<typeof validateTraceability>>; farms: string[] }>;
    for (const candidate of candidates) {
        const sources = await collectPublicHarvestSources(candidate.id);
        if (!sources.some((source) => source.farm.growingRegionId && regionIds.has(source.farm.growingRegionId))) continue;
        lots.push({ ...candidate, validation: await validateTraceability(candidate.id), farms: sources.map((source) => `${source.farm.farmName} (${source.farm.farmCode})`) });
    }
    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6">
            <header>
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Phạm vi vùng phụ trách</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950">Truy xuất & QR</h1>
                <p className="mt-2 text-slate-600">Theo dõi lô thu hoạch, tuân thủ và QR có nguồn từ vùng trồng được giao. Màn hình này chỉ có quyền xem.</p>
            </header>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {lots.map((lot) => (
                    <article key={lot.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0"><p className="font-mono text-sm font-bold text-emerald-700">{lot.lotCode}</p><h2 className="mt-1 truncate text-lg font-black text-slate-900">{lot.productName}</h2></div>
                            {lot.validation.canIssueQr ? <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600" /> : <QrCode className="h-6 w-6 shrink-0 text-amber-600" />}
                        </div>
                        <dl className="mt-4 space-y-2 text-sm">
                            <div><dt className="text-slate-500">Chủ lô</dt><dd className="font-semibold text-slate-800">{lot.farmerOwner?.fullName ?? lot.owner?.name ?? "—"}</dd></div>
                            <div><dt className="text-slate-500">Nguồn trong vùng</dt><dd className="font-semibold text-slate-800">{lot.farms.join(", ")}</dd></div>
                            <div><dt className="text-slate-500">Điểm đến</dt><dd className="font-semibold text-slate-800">{lot.destination?.name ?? "Chưa thiết lập"}</dd></div>
                            <div><dt className="text-slate-500">Tuân thủ</dt><dd className={lot.validation.canIssueQr ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>{lot.validation.traceCompleteness}% · {lot.validation.canIssueQr ? "Đủ điều kiện" : "Chưa đủ điều kiện"}</dd></div>
                        </dl>
                        {lot.traceabilityCode && <Link href={`/trace/${lot.traceabilityCode.publicToken}`} className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Xem QR công khai</Link>}
                    </article>
                ))}
            </section>
            {!lots.length && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Chưa có lô truy xuất nào bắt nguồn từ vùng phụ trách.</div>}
        </main>
    );
}
