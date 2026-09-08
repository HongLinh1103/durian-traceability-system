import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/harvest-receptions/[id]
 * Lấy chi tiết phiếu thu hoạch/tiếp nhận.
 */
export async function GET(
    _: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        }

        const harvest = await prisma.harvestRecord.findFirst({
            where: {
                OR: [{ id: params.id }, { code: params.id }],
            },
            include: {
                varietyItems: true,
                farm: {
                    select: {
                        id: true,
                        farmName: true,
                        farmCode: true,
                        address: true,
                        durianVariety: true,
                        areaSize: true,
                        totalTrees: true,
                        region: { select: { code: true, name: true } },
                    },
                },
                farmer: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
                buyerFacility: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        address: true,
                        province: true,
                        type: true,
                    },
                },
                histories: {
                    orderBy: { createdAt: "desc" },
                    include: { actor: { select: { fullName: true, role: true } } },
                },
                harvestLot: {
                    select: {
                        id: true,
                        lotCode: true,
                        weight: true,
                        remainingWeight: true,
                        status: true,
                    },
                },
            },
        });

        if (!harvest) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy phiếu thu hoạch." },
                { status: 404 },
            );
        }

        const weight = Number(harvest.receivedWeight ?? harvest.deliveredWeight ?? harvest.actualWeight ?? harvest.expectedSaleWeight ?? harvest.expectedWeight ?? 0);
        const price = Number(harvest.expectedPricePerKg ?? 0);
        const totalEstimatedAmount = harvest.varietyItems && harvest.varietyItems.length > 0
            ? harvest.varietyItems.reduce((sum, item) => sum + Number(item.expectedWeight) * Number(item.expectedPricePerKg || harvest.expectedPricePerKg || 0), 0)
            : weight * price;

        return NextResponse.json({
            success: true,
            data: {
                id: harvest.id,
                code: harvest.code,
                status: harvest.status,
                buyerType: harvest.buyerType,
                expectedHarvestDate: harvest.expectedHarvestDate.toISOString(),
                actualStartedAt: harvest.actualStartedAt?.toISOString() || null,
                actualHarvestedAt: harvest.actualHarvestedAt?.toISOString() || null,
                farmerDeliveredAt: harvest.farmerDeliveredAt?.toISOString() || null,
                buyerReceivedAt: harvest.buyerReceivedAt?.toISOString() || null,
                completedAt: harvest.completedAt?.toISOString() || null,
                durianVariety: harvest.durianVariety,
                expectedWeight: Number(harvest.expectedWeight),
                actualWeight: harvest.actualWeight ? Number(harvest.actualWeight) : null,
                deliveredWeight: harvest.deliveredWeight ? Number(harvest.deliveredWeight) : null,
                receivedWeight: harvest.receivedWeight ? Number(harvest.receivedWeight) : null,
                weightUnit: harvest.weightUnit,
                unitPrice: price,
                totalEstimatedAmount,
                deliveryMethod: harvest.deliveryMethod,
                transactionNote: harvest.transactionNote,
                rejectionReason: harvest.rejectionReason,
                weightDifferenceReason: harvest.weightDifferenceReason,
                farm: harvest.farm,
                farmer: harvest.farmer,
                buyerFacility: harvest.buyerFacility,
                varietyItems: harvest.varietyItems.map((v) => ({
                    id: v.id,
                    durianVariety: v.durianVariety,
                    expectedWeight: Number(v.expectedWeight),
                    expectedPricePerKg: v.expectedPricePerKg ? Number(v.expectedPricePerKg) : null,
                })),
                histories: harvest.histories.map((h) => ({
                    id: h.id,
                    fromStatus: h.fromStatus,
                    toStatus: h.toStatus,
                    note: h.note,
                    actorName: h.actor?.fullName || "Hệ thống",
                    createdAt: h.createdAt.toISOString(),
                })),
                harvestLot: harvest.harvestLot,
            },
        });
    } catch (error: any) {
        console.error("GET /api/harvest-receptions/[id] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi lấy chi tiết tiếp nhận." },
            { status: 500 },
        );
    }
}
