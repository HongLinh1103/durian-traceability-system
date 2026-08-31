import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingShipmentsView, ShipmentItemRow, AvailableFinishedLot } from "@/components/processing/processing-shipments-view";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    const [shipmentRows, finishedProductRows] = facility
        ? await Promise.all([
              prisma.shipment.findMany({
                  where: { senderId: facility.id },
                  include: {
                      destination: true,
                      exportInfo: true,
                      items: {
                          include: {
                              commercialLot: {
                                  include: { traceabilityCode: true },
                              },
                          },
                      },
                  },
                  orderBy: { createdAt: "desc" },
              }),
              prisma.finishedProductLot.findMany({
                  where: {
                      facilityId: facility.id,
                      status: { in: ["READY_FOR_DISTRIBUTION", "PARTIALLY_DISTRIBUTED"] },
                      remainingWeight: { gt: 0 },
                  },
                  orderBy: { createdAt: "desc" },
              }),
          ])
        : [[], []];

    const shipments: ShipmentItemRow[] = shipmentRows.map((s) => {
        const firstCommercial = s.items?.[0]?.commercialLot;
        return {
            id: s.id,
            shipmentCode: s.shipmentCode,
            productName: firstCommercial?.productName || "Sầu riêng tươi xuất khẩu",
            containerNumber: s.containerNumber || s.exportInfo?.containerNumber || undefined,
            sealNumber: s.sealNumber || s.exportInfo?.sealNumber || undefined,
            truckPlate: s.vehicleReference || undefined,
            weight: Number(s.dispatchedWeight || 0),
            boxCount: s.boxCount || undefined,
            destinationCountry: s.exportInfo?.destinationCountry || s.destination?.country || "Trung Quốc",
            portOfLoading: s.exportInfo?.portOfLoading || undefined,
            portOfDestination: s.exportInfo?.portOfDestination || s.destination?.name || undefined,
            dispatchDate: s.dispatchAt || s.createdAt,
            status: (s.status === "DISPATCHED" ? "DISPATCHED" : s.status === "READY" ? "READY" : "DRAFT") as any,
            hasQrCode: Boolean(firstCommercial?.traceabilityCode),
            qrPublicToken: firstCommercial?.traceabilityCode?.publicToken || undefined,
        };
    });

    const availableLots: AvailableFinishedLot[] = finishedProductRows.map((lot) => ({
        id: lot.id,
        lotCode: lot.lotCode,
        productName: lot.productName,
        remainingWeight: Number(lot.remainingWeight || 0),
        packaging: lot.packaging || undefined,
    }));

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <ProcessingShipmentsView
                initialShipments={shipments}
                availableFinishedLots={availableLots}
            />
        </main>
    );
}
