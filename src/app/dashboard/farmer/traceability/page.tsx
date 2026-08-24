import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTraceability } from "@/lib/traceability";
import { TraceabilityManager } from "@/components/traceability/traceability-manager";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") redirect("/login");
    const [rows, harvests, destinations] = await Promise.all([
        prisma.commercialLot.findMany({ where: { farmerOwnerId: session.user.id }, include: { farmerOwner: { select: { fullName: true } }, destination: true, traceabilityCode: true }, orderBy: { createdAt: "desc" } }),
        prisma.harvestLot.findMany({ where: { farm: { farmerId: session.user.id }, status: { in: ["FINALIZED", "PARTIALLY_USED"] }, complianceStatus: { not: "BLOCKED" }, remainingWeight: { gt: 0 } }, select: { id: true, lotCode: true, remainingWeight: true }, orderBy: { harvestedAt: "desc" } }),
        prisma.distributionDestination.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    const lots = await Promise.all(rows.map(async row => ({ ...row, owner: { name: row.farmerOwner?.fullName ?? "Hộ sản xuất" }, quantity: Number(row.quantity), remainingQuantity: Number(row.remainingQuantity), validation: await validateTraceability(row.id) })));
    const sources = harvests.map(row => ({ id: row.id, code: row.lotCode, type: "HARVEST_LOT" as const, label: `Còn ${Number(row.remainingWeight).toLocaleString("vi-VN")} kg` }));
    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6"><header><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Truy xuất nguồn gốc</p><h1 className="mt-1 text-3xl font-black">Tạo QR</h1><p className="mt-2 text-slate-500">Tạo mã QR truy xuất cho nông sản bán trực tiếp hoặc đưa đến điểm bán lẻ.</p></header><TraceabilityManager role="FARMER" initialLots={JSON.parse(JSON.stringify(lots))} sources={sources} destinations={destinations}/></main>;
}
