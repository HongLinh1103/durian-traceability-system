import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTraceability } from "@/lib/traceability";
import { TraceabilityManager } from "@/components/traceability/traceability-manager";

export const dynamic = "force-dynamic";
export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "COLLECTOR") redirect("/login");
    const facility = await prisma.partnerFacility.findUnique({ where: { ownerId: session.user.id } });
    const [rows, sourceRows, destinations] = await Promise.all([
        facility ? prisma.commercialLot.findMany({ where: { ownerId: facility.id }, include: { owner: { select: { name: true } }, destination: true, traceabilityCode: true }, orderBy: { createdAt: "desc" } }) : [],
        facility ? prisma.collectionLot.findMany({ where: { collectorFacilityId: facility.id, status: { in: ["FINALIZED", "PARTIALLY_USED"] } }, select: { id: true, lotCode: true }, orderBy: { createdAt: "desc" } }) : [],
        prisma.distributionDestination.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    const lots = await Promise.all(rows.map(async row => ({ ...row, quantity: Number(row.quantity), remainingQuantity: Number(row.remainingQuantity), validation: await validateTraceability(row.id) })));
    const sources = sourceRows.map(row => ({ id: row.id, code: row.lotCode, type: "COLLECTION_LOT" as const, label: "Lô thu mua" }));
    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6"><header><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Truy xuất nguồn gốc</p><h1 className="mt-1 text-3xl font-black">Lô thương mại & QR</h1><p className="mt-2 text-slate-500">Chỉ phát hành mã khi toàn bộ nguồn lô và kiểm tra chất lượng đã hợp lệ.</p></header><TraceabilityManager initialLots={JSON.parse(JSON.stringify(lots))} sources={sources} destinations={destinations}/></main>;
}
