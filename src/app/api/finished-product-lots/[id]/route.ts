import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/finished-product-lots/[id]
 * Lấy chi tiết lô thành phẩm (Ưu tiên 6, 7).
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

        const lot = await prisma.finishedProductLot.findFirst({
            where: {
                OR: [{ id: params.id }, { lotCode: params.id }],
            },
            include: {
                facility: true,
                processingBatch: {
                    include: {
                        inputs: {
                            include: {
                                rawMaterialLot: true,
                            },
                        },
                    },
                },
                commercialLots: {
                    include: {
                        traceabilityCode: true,
                        destination: true,
                    },
                },
            },
        });

        if (!lot) {
            return NextResponse.json({ success: false, message: "Không tìm thấy lô thành phẩm." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: lot });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi lấy lô thành phẩm." },
            { status: 500 }
        );
    }
}
