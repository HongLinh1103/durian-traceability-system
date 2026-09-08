import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/raw-material-lots/[id]
 * Lấy chi tiết một Lô nguyên liệu (Ưu tiên 4).
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

        const lot = await prisma.rawMaterialLot.findFirst({
            where: {
                OR: [{ id: params.id }, { lotCode: params.id }],
            },
            include: {
                facility: true,
                rawMaterialReceipt: {
                    include: {
                        sourceHarvestLot: {
                            include: {
                                farm: { include: { region: true } },
                                harvestRecord: { include: { farmer: true } },
                            },
                        },
                        sourceCollectionLot: {
                            include: {
                                collectorFacility: true,
                            },
                        },
                    },
                },
                inspections: {
                    orderBy: { inspectedAt: "desc" },
                },
            },
        });

        if (!lot) {
            return NextResponse.json({ success: false, message: "Không tìm thấy lô nguyên liệu." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: lot });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi lấy lô nguyên liệu." },
            { status: 500 }
        );
    }
}
