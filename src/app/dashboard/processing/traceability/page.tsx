import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingQrGeneratorView, TraceableShipmentOption } from "@/components/processing/processing-qr-generator-view";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    let shipmentOptions: TraceableShipmentOption[] = [];

    try {
        const facility = await prisma.partnerFacility.findFirst({
            where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
        });

        const commercialLots = facility
            ? await prisma.commercialLot.findMany({
                  where: { ownerId: facility.id },
                  include: {
                      traceabilityCode: true,
                      destination: true,
                      shipmentItems: {
                          include: {
                              shipment: {
                                  include: { exportInfo: true },
                              },
                          },
                      },
                  },
                  orderBy: { createdAt: "desc" },
              }).catch(() => [])
            : [];

        shipmentOptions = commercialLots.map((lot) => {
            const item = lot.shipmentItems?.[0];
            const shipment = item?.shipment;
            const exportInfo = shipment?.exportInfo;

            return {
                commercialLotId: lot.id,
                shipmentCode: shipment?.shipmentCode || lot.lotCode,
                productName: lot.productName,
                containerNumber: shipment?.containerNumber || exportInfo?.containerNumber || undefined,
                sealNumber: shipment?.sealNumber || exportInfo?.sealNumber || undefined,
                truckPlate: shipment?.vehicleReference || undefined,
                weight: Number(lot.quantity || 0),
                boxCount: shipment?.boxCount || undefined,
                destinationCountry: exportInfo?.destinationCountry || lot.destination?.country || "Trung Quốc",
                portOfLoading: exportInfo?.portOfLoading || undefined,
                portOfDestination: exportInfo?.portOfDestination || lot.destination?.name || undefined,
                facilityName: facility?.name || "Cơ sở chế biến",
                rawLotCode: "NVL-001",
                farmName: "Vườn sầu riêng Minh Phát",
                isIssued: Boolean(lot.traceabilityCode && lot.traceabilityCode.status === "ACTIVE"),
                qrPublicToken: lot.traceabilityCode?.publicToken || undefined,
                issuedAt: lot.traceabilityCode?.issuedAt || undefined,
            };
        });
    } catch (err) {
        console.error("Error loading processing traceability page:", err);
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <ProcessingQrGeneratorView shipments={shipmentOptions} />
        </main>
    );
}
