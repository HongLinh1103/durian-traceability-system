import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/processing/shipments/[id]/qr/issue
 * Standardized action endpoint (Ưu tiên 8, 9, 16):
 * Phát hành tem QR truy xuất nguồn gốc gắn liền trực tiếp với Lô xuất hàng (Shipment).
 */
export async function POST(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        }

        const allowedRoles = ["PROCESSING_FACILITY", "COLLECTOR", "ADMIN", "AREA_MANAGER"];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json(
                { success: false, message: "Không có quyền phát hành mã QR cho lô xuất hàng." },
                { status: 403 }
            );
        }

        const shipment = await prisma.shipment.findFirst({
            where: {
                OR: [{ id: params.id }, { shipmentCode: params.id }],
            },
            include: {
                destination: true,
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
        });

        if (!shipment) {
            return NextResponse.json({ success: false, message: "Không tìm thấy lô xuất hàng." }, { status: 404 });
        }

        let commercialLot = shipment.items[0]?.commercialLot;

        // Nếu chưa có commercial lot gắn vào shipment item, tự động khởi tạo commercial lot
        if (!commercialLot) {
            commercialLot = await prisma.commercialLot.create({
                data: {
                    lotCode: shipment.shipmentCode,
                    ownerType: shipment.senderType,
                    ownerId: shipment.senderId,
                    sourceType: "FINISHED_PRODUCT_LOT",
                    sourceId: shipment.id,
                    destinationId: shipment.destinationId,
                    productName: "Sầu riêng xuất xưởng",
                    quantity: shipment.dispatchedWeight,
                    unit: "kg",
                    status: "QR_ISSUED",
                },
                include: { traceabilityCode: true },
            });

            await prisma.shipmentItem.create({
                data: {
                    shipmentId: shipment.id,
                    commercialLotId: commercialLot.id,
                    quantity: shipment.dispatchedWeight,
                    weight: shipment.dispatchedWeight,
                },
            });
        }

        const appUrl = process.env.NEXTAUTH_URL || "https://nhatkynongnghiep.vn";

        // Nếu đã có mã QR trước đó
        if (commercialLot.traceabilityCode) {
            const existingCode = commercialLot.traceabilityCode;
            const publicToken = existingCode.publicToken || existingCode.code;
            return NextResponse.json({
                success: true,
                message: "Mã QR của lô xuất hàng đã được phát hành trước đó.",
                data: {
                    shipmentId: shipment.id,
                    shipmentCode: shipment.shipmentCode,
                    isIssued: true,
                    code: existingCode.code,
                    publicToken,
                    status: existingCode.status,
                    issuedAt: existingCode.issuedAt,
                    traceUrl: `${appUrl}/trace/${publicToken}`,
                    productName: commercialLot.productName,
                    quantity: commercialLot.quantity,
                },
            });
        }

        // Tạo mã QR mới
        const publicToken = `TRC-${randomBytes(4).toString("hex").toUpperCase()}`;
        const now = new Date();

        const result = await prisma.$transaction(async (tx) => {
            const traceCode = await tx.traceabilityCode.create({
                data: {
                    code: publicToken,
                    publicToken,
                    commercialLotId: commercialLot.id,
                    status: "ACTIVE",
                    issuedAt: now,
                    issuedById: session.user.id,
                    issuedByRole: session.user.role,
                    activatedAt: now,
                },
            });

            await tx.commercialLot.update({
                where: { id: commercialLot.id },
                data: { status: "QR_ISSUED" },
            });

            await tx.shipment.update({
                where: { id: shipment.id },
                data: {
                    status: shipment.status === "DRAFT" ? "READY" : shipment.status,
                },
            });

            await tx.traceEvent.create({
                data: {
                    entityType: "SHIPMENT",
                    entityId: shipment.id,
                    commercialLotId: commercialLot.id,
                    eventType: "QR_ISSUED",
                    eventTime: now,
                    actorId: session.user.id,
                    actorRole: session.user.role,
                    organizationType: shipment.senderType,
                    organizationId: shipment.senderId,
                    title: "Phát hành tem QR truy xuất nguồn gốc",
                    description: `Đã phát hành tem QR (${publicToken}) cho Lô xuất hàng ${shipment.shipmentCode}.`,
                    metadata: {
                        shipmentCode: shipment.shipmentCode,
                        publicToken,
                        productName: commercialLot.productName,
                        weight: shipment.dispatchedWeight,
                    },
                    isPublic: true,
                },
            });

            return traceCode;
        });

        return NextResponse.json({
            success: true,
            message: `Phát hành mã QR thành công cho lô ${shipment.shipmentCode}.`,
            data: {
                shipmentId: shipment.id,
                shipmentCode: shipment.shipmentCode,
                isIssued: true,
                code: result.code,
                publicToken,
                status: result.status,
                issuedAt: result.issuedAt,
                traceUrl: `${appUrl}/trace/${publicToken}`,
                productName: commercialLot.productName,
                quantity: commercialLot.quantity,
                destination: shipment.destination?.name,
            },
        });
    } catch (error: any) {
        console.error("POST /api/processing/shipments/[id]/qr/issue error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi phát hành mã QR." },
            { status: 500 }
        );
    }
}
