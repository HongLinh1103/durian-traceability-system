import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    shipmentCode: z.string().trim().min(2),
    finishedProductLotId: z.string().min(1),
    productName: z.string().trim().min(2),
    shipmentType: z.enum(["EXPORT", "DOMESTIC"]).default("EXPORT"),
    weight: z.coerce.number().positive(),
    boxCount: z.coerce.number().int().min(1).optional(),
    truckPlate: z.string().trim().optional(),
    containerNumber: z.string().trim().optional(),
    sealNumber: z.string().trim().optional(),
    carrierName: z.string().trim().optional(),
    exportDate: z.string().optional(),
    destinationCountry: z.string().trim().optional(),
    portOfLoading: z.string().trim().optional(),
    portOfDestination: z.string().trim().optional(),
    // Domestic fields (3-level distribution channel)
    distributionChannel: z.string().trim().optional(),
    partnerSystem: z.string().trim().optional(),
    partnerBranch: z.string().trim().optional(),
    customerName: z.string().trim().optional(),
    contactPerson: z.string().trim().optional(),
    customerPhone: z.string().trim().optional(),
    deliveryAddress: z.string().trim().optional(),
    transportMethod: z.string().trim().optional(),
    driverName: z.string().trim().optional(),
    status: z.enum(["DRAFT", "READY", "DISPATCHED"]).default("READY"),
    note: z.string().trim().optional(),
});

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    if (!facility) {
        return NextResponse.json({ success: false, message: "Không tìm thấy cơ sở chế biến." }, { status: 404 });
    }

    const shipments = await prisma.shipment.findMany({
        where: { senderId: facility.id },
        include: {
            destination: true,
            exportInfo: true,
            items: {
                include: {
                    commercialLot: {
                        include: {
                            traceabilityCode: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: shipments });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        return NextResponse.json({ success: false, message: "Không có quyền thực hiện." }, { status: 403 });
    }

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    if (!facility) {
        return NextResponse.json({ success: false, message: "Không tìm thấy cơ sở chế biến." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    const v = parsed.data;
    const finishedLot = await prisma.finishedProductLot.findUnique({
        where: { id: v.finishedProductLotId },
    });

    if (!finishedLot || finishedLot.facilityId !== facility.id) {
        return NextResponse.json({ success: false, message: "Không tìm thấy lô thành phẩm tương ứng." }, { status: 404 });
    }
    if (finishedLot.status !== "READY_FOR_DISTRIBUTION") {
        return NextResponse.json({ success: false, message: "Lô thành phẩm không còn ở trạng thái Sẵn sàng xuất hàng." }, { status: 409 });
    }
    if (v.weight > Number(finishedLot.remainingWeight)) {
        return NextResponse.json({ success: false, message: "Khối lượng xuất vượt quá khối lượng còn lại của lô thành phẩm." }, { status: 400 });
    }

    const exportDate = v.exportDate ? new Date(v.exportDate) : new Date();
    const isExport = v.shipmentType === "EXPORT";

    const destName = isExport
        ? (v.portOfDestination || v.destinationCountry || "Thị trường Xuất khẩu")
        : (v.partnerBranch || v.customerName || v.partnerSystem || v.deliveryAddress || "Khách hàng nội địa");
    const destCountry = isExport ? (v.destinationCountry || "Trung Quốc") : "Việt Nam";
    const destAddress = isExport
        ? (v.portOfDestination || `${destCountry}`)
        : (v.deliveryAddress || "Nội địa Việt Nam");

    let destination = await prisma.distributionDestination.findFirst({
        where: { name: destName },
    });

    if (!destination) {
        destination = await prisma.distributionDestination.create({
            data: {
                name: destName,
                type: isExport ? "EXPORT" : v.distributionChannel?.includes("Siêu thị") ? "RETAIL" : v.distributionChannel?.includes("Chợ") ? "MARKET" : "DISTRIBUTOR",
                country: destCountry,
                address: destAddress,
            },
        });
    }

    const noteContent = isExport
        ? (v.note || null)
        : [
            v.distributionChannel ? `Kênh: ${v.distributionChannel}` : "",
            v.partnerSystem ? `Hệ thống: ${v.partnerSystem}` : "",
            v.partnerBranch ? `Chi nhánh: ${v.partnerBranch}` : "",
            v.contactPerson ? `Người liên hệ: ${v.contactPerson}` : "",
            v.customerName ? `Khách: ${v.customerName}` : "",
            v.customerPhone ? `SĐT: ${v.customerPhone}` : "",
            v.deliveryAddress ? `Giao đến: ${v.deliveryAddress}` : "",
            v.transportMethod ? `Vận chuyển: ${v.transportMethod}` : "",
            v.driverName ? `Tài xế: ${v.driverName}` : "",
            v.carrierName ? `ĐVVC: ${v.carrierName}` : "",
            v.note ? `Ghi chú: ${v.note}` : "",
        ].filter(Boolean).join(" | ") || null;

    const publicToken = `TRC-${randomBytes(4).toString("hex").toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
        // 1. Create CommercialLot with buyer info
        const commercialLot = await tx.commercialLot.create({
            data: {
                lotCode: v.shipmentCode,
                ownerType: "PROCESSING_FACILITY",
                ownerId: facility.id,
                sourceType: "FINISHED_PRODUCT_LOT",
                sourceId: finishedLot.id,
                sourceFinishedProductLotId: finishedLot.id,
                destinationId: destination!.id,
                productName: v.productName,
                quantity: v.weight,
                remainingQuantity: v.weight,
                buyerName: destName,
                buyerPhone: v.customerPhone || null,
                buyerAddress: destAddress || null,
                dispatchedAt: exportDate,
                status: "QR_ISSUED",
            },
        });

        // 2. Create Shipment
        const shipment = await tx.shipment.create({
            data: {
                shipmentCode: v.shipmentCode,
                senderType: "PROCESSING_FACILITY",
                senderId: facility.id,
                destinationId: destination!.id,
                dispatchedWeight: v.weight,
                dispatchAt: exportDate,
                vehicleReference: v.truckPlate || null,
                containerNumber: isExport ? (v.containerNumber || null) : null,
                sealNumber: isExport ? (v.sealNumber || null) : null,
                boxCount: v.boxCount || null,
                status: v.status === "DRAFT" ? "DRAFT" : v.status === "READY" ? "READY" : "DISPATCHED",
                note: noteContent,
            },
        });

        // 3. Create ShipmentItem
        await tx.shipmentItem.create({
            data: {
                shipmentId: shipment.id,
                commercialLotId: commercialLot.id,
                quantity: v.weight,
                weight: v.weight,
            },
        });

        // 4. Create ExportShipmentInfo (only if export)
        if (isExport) {
            await tx.exportShipmentInfo.create({
                data: {
                    shipmentId: shipment.id,
                    destinationCountry: destCountry,
                    portOfLoading: v.portOfLoading || null,
                    portOfDestination: v.portOfDestination || null,
                    containerNumber: v.containerNumber || null,
                    sealNumber: v.sealNumber || null,
                    exportDate,
                },
            });
        }

        // 5. Link Finished Lot to Commercial Lot
        await tx.lotRelation.create({
            data: {
                sourceType: "FINISHED_PRODUCT_LOT",
                sourceId: finishedLot.id,
                targetType: "COMMERCIAL_LOT",
                targetId: commercialLot.id,
                relationType: "PACKAGED_INTO",
                quantity: v.weight,
            },
        });

        // 6. Create TraceabilityCode directly
        const traceCode = await tx.traceabilityCode.create({
            data: {
                code: publicToken,
                publicToken,
                commercialLotId: commercialLot.id,
                status: "ACTIVE",
                issuedAt: exportDate,
                issuedById: session.user.id,
                issuedByRole: "PROCESSING_FACILITY",
                activatedAt: exportDate,
            },
        });

        // 7. Trace event
        await tx.traceEvent.create({
            data: {
                entityType: "SHIPMENT",
                entityId: shipment.id,
                commercialLotId: commercialLot.id,
                eventType: "EXPORT_DISPATCHED",
                eventTime: exportDate,
                actorId: session.user.id,
                actorRole: "PROCESSING_FACILITY",
                organizationType: "PROCESSING_FACILITY",
                organizationId: facility.id,
                title: isExport
                    ? "Tạo lô xuất hàng xuất khẩu & Phát hành QR"
                    : "Tạo lô xuất bán nội địa & Phát hành QR",
                description: `${v.productName} · Khối lượng: ${v.weight} kg (${v.boxCount || 0} thùng)${isExport ? ` · Container: ${v.containerNumber || "N/A"}` : ""}`,
                metadata: {
                    shipmentCode: v.shipmentCode,
                    publicToken,
                    productName: v.productName,
                    dispatchedWeight: v.weight,
                    containerNumber: v.containerNumber,
                    sealNumber: v.sealNumber,
                    truckPlate: v.truckPlate,
                    boxCount: v.boxCount,
                },
                isPublic: true,
            },
        });

        const remainingWeight = Number(finishedLot.remainingWeight) - v.weight;
        await tx.finishedProductLot.update({
            where: { id: finishedLot.id },
            data: {
                remainingWeight,
                status: remainingWeight > 0 ? "PARTIALLY_DISTRIBUTED" : "DISTRIBUTED",
            },
        });

        return { shipment, commercialLot, traceCode };
    });

    return NextResponse.json({
        success: true,
        message: "Đã tạo lô xuất hàng và phát hành tem QR thành công.",
        data: result,
    }, { status: 201 });
}
