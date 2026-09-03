import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingShipmentsView, ShipmentItemRow, AvailableFinishedLot } from "@/components/processing/processing-shipments-view";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    let shipments: ShipmentItemRow[] = [];
    let availableLots: AvailableFinishedLot[] = [];
    let facilityName = "Cơ sở Chế biến";

    try {
        const facility = await prisma.partnerFacility.findFirst({
            where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
        });

        if (facility?.name) facilityName = facility.name;

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
                                      include: {
                                          traceabilityCode: true,
                                          sourceFinishedProductLot: {
                                              include: {
                                                  processingBatch: {
                                                      include: {
                                                          inputs: {
                                                              include: {
                                                                  rawMaterialLot: {
                                                                      include: {
                                                                          rawMaterialReceipt: {
                                                                              include: {
                                                                                   sourceHarvestLot: {
                                                                                       include: {
                                                                                           farm: {
                                                                                               select: {
                                                                                                   id: true,
                                                                                                   farmName: true,
                                                                                                   growingRegion: true,
                                                                                                   region: { select: { code: true, name: true } },
                                                                                               },
                                                                                           },
                                                                                       },
                                                                                   },
                                                                               },
                                                                           },
                                                                       },
                                                                   },
                                                               },
                                                           },
                                                      },
                                                  },
                                              },
                                          },
                                      },
                                  },
                              },
                          },
                      },
                      orderBy: { createdAt: "desc" },
                  }).catch(() => []),
                  prisma.finishedProductLot.findMany({
                      where: {
                          facilityId: facility.id,
                          status: { in: ["READY_FOR_DISTRIBUTION", "PARTIALLY_DISTRIBUTED"] },
                          remainingWeight: { gt: 0 },
                      },
                      include: {
                          processingBatch: {
                              include: {
                                  inputs: {
                                      include: {
                                          rawMaterialLot: {
                                              include: {
                                                  rawMaterialReceipt: {
                                                      include: {
                                                          sourceHarvestLot: {
                                                              include: {
                                                                  farm: {
                                                                      select: {
                                                                          id: true,
                                                                          farmName: true,
                                                                          growingRegion: true,
                                                                          region: { select: { code: true, name: true } },
                                                                      },
                                                                  },
                                                              },
                                                          },
                                                      },
                                                  },
                                              },
                                          },
                                      },
                                  },
                              },
                          },
                      },
                      orderBy: { createdAt: "desc" },
                  }).catch(() => []),
              ])
            : [[], []];

        shipments = shipmentRows.map((s) => {
            const firstCommercial = s.items?.[0]?.commercialLot;
            const finished = firstCommercial?.sourceFinishedProductLot;
            const raw = finished?.processingBatch?.inputs?.[0]?.rawMaterialLot;
            const harvest = raw?.rawMaterialReceipt?.sourceHarvestLot;
            const farm = harvest?.farm;

            const note = s.note || "";
            const extractField = (prefix: string) => {
                const match = note.match(new RegExp(`${prefix}:\\s*([^|]+)`));
                return match ? match[1].trim() : undefined;
            };

            const distributionChannel = extractField("Kênh");
            const partnerSystem = extractField("Hệ thống");
            const partnerBranch = extractField("Chi nhánh");
            const contactPerson = extractField("Người liên hệ");
            const customerPhone = firstCommercial?.buyerPhone || extractField("SĐT");
            const deliveryAddress = firstCommercial?.buyerAddress || extractField("Giao đến");
            const transportMethod = extractField("Vận chuyển");
            const driverName = extractField("Tài xế");
            const carrierName = extractField("ĐVVC");
            const isDomestic = s.shipmentCode.startsWith("DOM-") || s.destination?.country === "Việt Nam" || Boolean(distributionChannel);

            return {
                id: s.id,
                shipmentCode: s.shipmentCode,
                shipmentType: (isDomestic ? "DOMESTIC" : "EXPORT") as "EXPORT" | "DOMESTIC",
                productName: firstCommercial?.productName || "Sầu riêng tươi xuất khẩu",
                containerNumber: s.containerNumber || s.exportInfo?.containerNumber || undefined,
                sealNumber: s.sealNumber || s.exportInfo?.sealNumber || undefined,
                truckPlate: s.vehicleReference || undefined,
                carrierName: carrierName || undefined,
                weight: Number(s.dispatchedWeight || 0),
                boxCount: s.boxCount || undefined,
                destinationCountry: isDomestic ? "Việt Nam" : (s.exportInfo?.destinationCountry || s.destination?.country || "Trung Quốc"),
                portOfLoading: s.exportInfo?.portOfLoading || undefined,
                portOfDestination: isDomestic ? deliveryAddress : (s.exportInfo?.portOfDestination || s.destination?.name || undefined),
                distributionChannel,
                partnerSystem,
                partnerBranch,
                contactPerson,
                customerName: firstCommercial?.buyerName || partnerBranch || s.destination?.name || undefined,
                customerPhone,
                deliveryAddress,
                transportMethod,
                driverName,
                dispatchDate: s.dispatchAt || s.createdAt,
                status: (s.status === "DISPATCHED" ? "DISPATCHED" : s.status === "READY" ? "READY" : "DRAFT") as any,
                hasQrCode: Boolean(firstCommercial?.traceabilityCode),
                qrPublicToken: firstCommercial?.traceabilityCode?.publicToken || undefined,
                farmName: farm?.farmName || "Vườn sầu riêng liên kết",
                regionCode: farm?.region?.code || farm?.growingRegion || "MSVT-VN-DL",
                rawLotCode: raw?.lotCode || "NVL-001",
                facilityName,
            };
        });

        availableLots = finishedProductRows.map((lot) => {
            const raw = lot.processingBatch?.inputs?.[0]?.rawMaterialLot;
            const harvest = raw?.rawMaterialReceipt?.sourceHarvestLot;
            const farm = harvest?.farm;

            return {
                id: lot.id,
                lotCode: lot.lotCode,
                productName: lot.productName,
                remainingWeight: Number(lot.remainingWeight || 0),
                packaging: lot.packaging || undefined,
                farmName: farm?.farmName || "Vườn sầu riêng liên kết",
                regionCode: farm?.region?.code || farm?.growingRegion || "MSVT-VN-DL",
                rawLotCode: raw?.lotCode || "NVL-001",
            };
        });

        // If no available finished lots in database, provide available lots in status "Đã đóng gói" (READY_FOR_DISTRIBUTION)
        if (availableLots.length === 0) {
            availableLots = [
                {
                    id: "demo-fp-001",
                    lotCode: "FP-FRESH-20260830-001",
                    productName: "Sầu riêng tươi xuất khẩu",
                    remainingWeight: 3100,
                    packaging: "Thùng 5-6 trái / 18kg",
                    farmName: "Vườn sầu riêng Minh Phát",
                    regionCode: "MSVT-GACC-001",
                    rawLotCode: "TH-20260829-002",
                },
                {
                    id: "demo-pb-001",
                    lotCode: "PB-20260830-001",
                    productName: "Cơm sầu riêng bóc múi",
                    remainingWeight: 326,
                    packaging: "Khay hút chân không 500g",
                    farmName: "Vườn sầu riêng Minh Phát",
                    regionCode: "MSVT-GACC-001",
                    rawLotCode: "TH-20260829-002",
                },
            ];
        }
        // Note: shipments array stays as queried (empty [] if no shipments created yet)
    } catch (err) {
        console.error("Error loading processing shipments page:", err);
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <ProcessingShipmentsView
                initialShipments={shipments}
                availableFinishedLots={availableLots}
                facilityName={facilityName}
            />
        </main>
    );
}
