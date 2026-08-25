import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerHarvests } from "@/components/partner-harvests";

export default async function Page({ searchParams }: { searchParams?: { filter?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const facility = await prisma.partnerFacility.findFirst({ where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null } });
    const [incomingHarvests, rawRows] = await Promise.all([
        prisma.harvestRecord.findMany({
            where: { buyerUserId: session.user.id, buyerType: "PROCESSING_FACILITY", status: { not: "COMPLETED" } },
            include: { farm: { include: { region: { select: { code: true } } } }, farmer: { select: { fullName: true, phone: true } } },
            orderBy: { createdAt: "desc" },
        }),
        facility ? prisma.rawMaterialLot.findMany({
            where: { facilityId: facility.id },
            include: {
                inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
                rawMaterialReceipt: { include: { sourceHarvestLot: { include: { farm: true, harvestRecord: { include: { farmer: { select: { fullName: true } } } } } } } },
            }, orderBy: { createdAt: "desc" },
        }) : [],
    ]);
    const rawLots = rawRows.map((row) => ({
        id: row.id, code: row.lotCode, status: row.status, sourceCode: row.rawMaterialReceipt.sourceHarvestLot?.lotCode ?? row.rawMaterialReceipt.receiptCode,
        farmName: row.rawMaterialReceipt.sourceHarvestLot?.farm.farmName ?? "Lô tổng hợp", supplierName: row.rawMaterialReceipt.sourceHarvestLot?.harvestRecord.farmer.fullName ?? "Đối tác vựa",
        receivedAt: row.rawMaterialReceipt.receivedAt, sentWeight: Number(row.rawMaterialReceipt.dispatchedWeight), actualReceivedWeight: Number(row.rawMaterialReceipt.receivedWeight),
        qualityResult: row.inspections[0]?.result ?? null, warehouseLocation: row.warehouseLocation,
    }));

    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <header className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Nguồn hàng được gửi đến</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Nguyên liệu</h1>
            <p className="mt-2 text-sm text-slate-500">Tiếp nhận nguồn từ nông dân, theo dõi giao hàng, ghi nhận thực nhận và QC trước khi đưa vào chế biến.</p>
        </header>
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
            <PartnerHarvests initial={JSON.parse(JSON.stringify(incomingHarvests))} rawLots={JSON.parse(JSON.stringify(rawLots))} mode="PROCESSING_FACILITY" initialTab={searchParams?.filter === "action-required" ? "action-required" : "all"} />
        </section>
    </main>;
}
