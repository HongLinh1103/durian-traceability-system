import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Standardized Resource Route: /api/raw-material-lots
 * Quản lý các lô nguyên liệu thực tế sau khi đã tiếp nhận (Ưu tiên 4).
 */
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        }

        const facility = await prisma.partnerFacility.findFirst({
            where: { ownerId: session.user.id, deletedAt: null },
            select: { id: true, type: true },
        });

        const whereClause: any = {};
        if (facility) {
            whereClause.facilityId = facility.id;
        }

        const lots = await prisma.rawMaterialLot.findMany({
            where: whereClause,
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
                    take: 1,
                    include: { inspector: { select: { fullName: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const data = lots.map((lot) => {
            const receipt = lot.rawMaterialReceipt;
            const harvestLot = receipt?.sourceHarvestLot;
            const harvestRecord = harvestLot?.harvestRecord;
            const farm = harvestLot?.farm;
            const farmer = harvestRecord?.farmer;
            const latestInspection = lot.inspections[0];
            const receivedAt = receipt?.receivedAt || lot.createdAt;
            const actualReceivedWeight = Number(receipt?.receivedWeight || lot.acceptedWeight || 0);

            return {
                id: lot.id,
                lotCode: lot.lotCode,
                code: lot.lotCode,
                status: lot.status,
                receiptCode: receipt?.receiptCode,
                farmName: farm?.farmName || "Vườn",
                regionCode: farm?.region?.code,
                farmerName: farmer?.fullName,
                farmerPhone: farmer?.phone,
                variety: farm?.durianVariety || "Sầu riêng",
                harvestDate: harvestRecord?.actualHarvestedAt || harvestRecord?.expectedHarvestDate || receivedAt,
                declaredWeight: Number(harvestRecord?.expectedWeight || harvestRecord?.actualWeight || receipt?.dispatchedWeight || 0),
                actualReceivedWeight,
                acceptedWeight: Number(lot.acceptedWeight || 0),
                currentWeight: Number(lot.currentWeight || 0),
                rejectedWeight: Math.max(0, actualReceivedWeight - Number(lot.acceptedWeight || 0)),
                receivedAt,
                warehouseLocation: lot.warehouseLocation,
                qualityResult: latestInspection?.result || null,
                inspection: latestInspection ? {
                    id: latestInspection.id,
                    result: latestInspection.result,
                    inspectedAt: latestInspection.inspectedAt,
                    qualityGrade: latestInspection.qualityGrade,
                    appearance: latestInspection.appearance,
                    residueResult: latestInspection.residueResult,
                    damageRate: latestInspection.damageRate ? Number(latestInspection.damageRate) : null,
                    note: latestInspection.note,
                    inspectorName: latestInspection.inspector?.fullName || null,
                } : null,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("GET /api/raw-material-lots error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi lấy danh sách lô nguyên liệu." },
            { status: 500 }
        );
    }
}
