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
                inspections: {
                    orderBy: { inspectedAt: "desc" },
                    take: 1,
                    include: { inspector: { select: { fullName: true, phone: true } } }
                },
                rawMaterialReceipt: {
                    include: {
                        sourceHarvestLot: {
                            include: {
                                farm: true,
                                harvestRecord: { include: { farmer: { select: { fullName: true, phone: true } } } }
                            }
                        },
                        sourceCollectionLot: {
                            include: { collectorFacility: { select: { name: true, phone: true } } }
                        }
                    }
                },
                batchInputs: {
                    include: { processingBatch: { select: { id: true, batchCode: true, targetProduct: true, status: true } } }
                }
            },
            orderBy: { createdAt: "desc" },
        }) : [],
    ]);
    const rawLots = rawRows.map((row) => {
        const latestInspection = row.inspections[0];
        const sourceHarvest = row.rawMaterialReceipt.sourceHarvestLot;
        const sourceCollection = row.rawMaterialReceipt.sourceCollectionLot;
        const receivedWeight = Number(row.rawMaterialReceipt.receivedWeight);
        const acceptedWeight = Number(row.acceptedWeight);
        const rejectedWeight = Math.max(0, receivedWeight - acceptedWeight);

        return {
            id: row.id,
            code: row.lotCode,
            status: row.status,
            sourceCode: sourceHarvest?.lotCode ?? sourceCollection?.lotCode ?? row.rawMaterialReceipt.receiptCode,
            farmName: sourceHarvest?.farm.farmName ?? sourceCollection?.collectorFacility.name ?? "Lô tổng hợp",
            variety: sourceHarvest?.farm.durianVariety ?? "Sầu riêng",
            supplierName: sourceHarvest?.harvestRecord.farmer.fullName ?? sourceCollection?.collectorFacility.name ?? "Đối tác vựa",
            receivedAt: row.rawMaterialReceipt.receivedAt,
            sentWeight: Number(row.rawMaterialReceipt.dispatchedWeight),
            actualReceivedWeight: receivedWeight,
            acceptedWeight,
            currentWeight: Number(row.currentWeight),
            rejectedWeight,
            qualityResult: latestInspection?.result ?? null,
            warehouseLocation: row.warehouseLocation,
            inspection: latestInspection ? {
                id: latestInspection.id,
                result: latestInspection.result,
                inspectedAt: latestInspection.inspectedAt,
                qualityGrade: latestInspection.qualityGrade,
                appearance: latestInspection.appearance,
                residueResult: latestInspection.residueResult,
                damageRate: latestInspection.damageRate ? Number(latestInspection.damageRate) : 0,
                note: latestInspection.note,
                inspectorName: latestInspection.inspector?.fullName,
            } : null,
            batches: row.batchInputs.map((bi) => ({
                id: bi.processingBatch.id,
                code: bi.processingBatch.batchCode,
                targetProduct: bi.processingBatch.targetProduct,
                status: bi.processingBatch.status,
            })),
        };
    });

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
