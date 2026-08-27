import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCompletedHarvestCollectionLots, validateTraceability } from "@/lib/traceability";
import { TraceabilityManager } from "@/components/traceability/traceability-manager";

export const dynamic = "force-dynamic";
export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "COLLECTOR") redirect("/login");
    const facility = await prisma.partnerFacility.findUnique({ where: { ownerId: session.user.id } });
    await ensureCompletedHarvestCollectionLots(session.user.id);
    const [rows, sourceRows, destinations] = await Promise.all([
        facility ? prisma.commercialLot.findMany({ where: { ownerId: facility.id }, include: { owner: { select: { name: true } }, destination: true, traceabilityCode: true }, orderBy: { createdAt: "desc" } }) : [],
        facility ? prisma.collectionLot.findMany({ where: { collectorFacilityId: facility.id, status: { in: ["FINALIZED", "PARTIALLY_USED"] }, currentWeight: { gt: 0 } }, select: { id: true, lotCode: true, totalWeight: true, currentWeight: true, status: true, items: { select: { harvestLot: { select: { farm: { select: { id: true, durianVariety: true } }, procurementOrders: { select: { goodsReceipt: { select: { quality: { select: { result: true } } } } } } } } } } }, orderBy: { createdAt: "desc" } }) : [],
        prisma.distributionDestination.findMany({ select: { id: true, name: true, address: true, type: true, contactName: true, contactPhone: true }, orderBy: { name: "asc" } }),
    ]);
    const lots = await Promise.all(rows.map(async row => ({ ...row, quantity: Number(row.quantity), remainingQuantity: Number(row.remainingQuantity), validation: await validateTraceability(row.id) })));
    const sources = sourceRows.map(row => { const varieties = [...new Set(row.items.map(item => item.harvestLot.farm.durianVariety).filter(Boolean))]; const qcPassed = row.items.length > 0 && row.items.every(item => item.harvestLot.procurementOrders.some(order => order.goodsReceipt?.quality?.result === "PASSED")); return { id: row.id, code: row.lotCode, type: "COLLECTION_LOT" as const, label: varieties.length ? `Sầu riêng ${varieties.join(", ")}` : "Sầu riêng", productName: varieties.length ? `Sầu riêng ${varieties.join(", ")}` : "Sầu riêng", totalQuantity: Number(row.totalWeight), remainingQuantity: Number(row.currentWeight), farmCount: new Set(row.items.map(item => item.harvestLot.farm.id)).size, qcStatus: qcPassed ? "PASSED" as const : "PENDING" as const }; });
    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6"><header><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Truy xuất nguồn gốc</p><h1 className="mt-1 text-3xl font-black">Tạo QR</h1><p className="mt-2 text-slate-500">Tạo mã QR truy xuất cho lô hàng được vựa xuất bán đến điểm bán lẻ.</p></header><TraceabilityManager role="COLLECTOR" initialLots={JSON.parse(JSON.stringify(lots))} sources={sources} destinations={destinations}/></main>;
}
