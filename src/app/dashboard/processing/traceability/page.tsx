import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTraceability } from "@/lib/traceability";
import { TraceabilityManager } from "@/components/traceability/traceability-manager";

export const dynamic = "force-dynamic";
export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");
    const facility = await prisma.partnerFacility.findUnique({ where: { ownerId: session.user.id } });
    const [rows, sourceRows, destinations] = await Promise.all([
        facility ? prisma.commercialLot.findMany({ where: { ownerId: facility.id }, include: { owner: { select: { name: true } }, destination: true, traceabilityCode: true }, orderBy: { createdAt: "desc" } }) : [],
        facility ? prisma.finishedProductLot.findMany({ where: { facilityId: facility.id, status: { in: ["READY_FOR_DISTRIBUTION", "PARTIALLY_DISTRIBUTED"] } }, select: { id: true, lotCode: true }, orderBy: { createdAt: "desc" } }) : [],
        prisma.distributionDestination.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    const lots = await Promise.all(rows.map(async row => ({ ...row, quantity: Number(row.quantity), remainingQuantity: Number(row.remainingQuantity), validation: await validateTraceability(row.id) })));
    const sources = sourceRows.map(row => ({ id: row.id, code: row.lotCode, type: "FINISHED_PRODUCT_LOT" as const, label: "Lô thành phẩm" }));
    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6"><header><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Truy xuất nguồn gốc</p><h1 className="mt-1 text-3xl font-black">Lô thành phẩm & QR</h1><p className="mt-2 text-slate-500">Theo dõi tính đầy đủ dữ liệu trước khi phát hành mã ra thị trường.</p></header><TraceabilityManager initialLots={JSON.parse(JSON.stringify(lots))} sources={sources} destinations={destinations}/></main>;
}
