import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/processing/shipments/[id]/qr
 * Lấy thông tin tem QR truy xuất của Lô xuất hàng (Ưu tiên 8).
 */
export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
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

        const firstItem = shipment.items[0];
        const commercialLot = firstItem?.commercialLot;
        const traceCode = commercialLot?.traceabilityCode;

        if (!traceCode) {
            return NextResponse.json({
                success: true,
                data: {
                    shipmentId: shipment.id,
                    shipmentCode: shipment.shipmentCode,
                    isIssued: false,
                    message: "Lô xuất hàng chưa được phát hành mã QR.",
                },
            });
        }

        const publicToken = traceCode.publicToken || traceCode.code;
        const appUrl = process.env.NEXTAUTH_URL || "https://nhatkynongnghiep.vn";
        const traceUrl = `${appUrl}/trace/${publicToken}`;

        return NextResponse.json({
            success: true,
            data: {
                shipmentId: shipment.id,
                shipmentCode: shipment.shipmentCode,
                isIssued: true,
                code: traceCode.code,
                publicToken,
                status: traceCode.status,
                issuedAt: traceCode.issuedAt,
                activatedAt: traceCode.activatedAt,
                traceUrl,
                productName: commercialLot?.productName,
                quantity: commercialLot?.quantity,
                unit: commercialLot?.unit,
                destination: shipment.destination?.name,
            },
        });
    } catch (error: any) {
        console.error("GET /api/processing/shipments/[id]/qr error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi lấy mã QR." },
            { status: 500 }
        );
    }
}
