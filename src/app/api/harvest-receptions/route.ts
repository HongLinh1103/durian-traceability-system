import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/harvest-receptions
 * Lấy danh sách phiếu thu hoạch được gửi đến Đơn vị tiếp nhận (Vựa hoặc Cơ sở chế biến).
 * Dùng chung cho cả COLLECTOR và PROCESSING_FACILITY.
 */
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        }

        const allowedRoles = ["COLLECTOR", "PROCESSING_FACILITY", "ADMIN", "AREA_MANAGER"];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json(
                { success: false, message: "Bạn không có quyền truy cập tiếp nhận thu hoạch." },
                { status: 403 },
            );
        }

        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get("status");
        const query = searchParams.get("q")?.trim().toLowerCase();

        let facility = await prisma.partnerFacility.findFirst({
            where: {
                OR: [
                    { ownerId: session.user.id },
                    { phone: session.user.phone ?? undefined },
                    { representativePhone: session.user.phone ?? undefined },
                ],
                deletedAt: null,
            },
        });

        if (!facility && ["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role)) {
            facility = await prisma.partnerFacility.findFirst({
                where: {
                    type: session.user.role as "COLLECTOR" | "PROCESSING_FACILITY",
                    deletedAt: null,
                },
            });
        }

        // Điều kiện tìm kiếm phiếu được gửi đến đơn vị này
        const whereCondition: any = {
            OR: [
                { buyerUserId: session.user.id },
                ...(facility ? [{ buyerFacilityId: facility.id }] : []),
                { buyerType: session.user.role === "COLLECTOR" ? "COLLECTOR" : "PROCESSING_FACILITY" },
            ],
        };

        if (statusParam && statusParam !== "ALL") {
            whereCondition.status = statusParam;
        }

        const harvests = await prisma.harvestRecord.findMany({
            where: whereCondition,
            include: {
                varietyItems: true,
                farm: {
                    select: {
                        id: true,
                        farmName: true,
                        farmCode: true,
                        address: true,
                        durianVariety: true,
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
                        type: true,
                    },
                },
                histories: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                    include: { actor: { select: { fullName: true, role: true } } },
                },
            },
            orderBy: [{ createdAt: "desc" }],
        });

        let filtered = harvests;
        if (query) {
            filtered = harvests.filter(
                (h) =>
                    h.code.toLowerCase().includes(query) ||
                    (h.farm?.farmName || "").toLowerCase().includes(query) ||
                    (h.farmer?.fullName || "").toLowerCase().includes(query) ||
                    h.durianVariety.toLowerCase().includes(query),
            );
        }

        const formatted = filtered.map((h) => {
            const weight = Number(h.receivedWeight ?? h.deliveredWeight ?? h.actualWeight ?? h.expectedSaleWeight ?? h.expectedWeight ?? 0);
            const price = Number(h.expectedPricePerKg ?? 0);
            const totalEstimatedAmount = h.varietyItems && h.varietyItems.length > 0
                ? h.varietyItems.reduce((sum, item) => sum + Number(item.expectedWeight) * Number(item.expectedPricePerKg || h.expectedPricePerKg || 0), 0)
                : weight * price;

            return {
                id: h.id,
                code: h.code,
                status: h.status,
                buyerType: h.buyerType,
                expectedHarvestDate: h.expectedHarvestDate.toISOString(),
                actualHarvestedAt: h.actualHarvestedAt?.toISOString() || null,
                buyerReceivedAt: h.buyerReceivedAt?.toISOString() || null,
                completedAt: h.completedAt?.toISOString() || null,
                durianVariety: h.durianVariety,
                expectedWeight: Number(h.expectedWeight),
                actualWeight: h.actualWeight ? Number(h.actualWeight) : null,
                deliveredWeight: h.deliveredWeight ? Number(h.deliveredWeight) : null,
                receivedWeight: h.receivedWeight ? Number(h.receivedWeight) : null,
                weightUnit: h.weightUnit,
                unitPrice: price,
                totalEstimatedAmount,
                deliveryMethod: h.deliveryMethod,
                transactionNote: h.transactionNote,
                farm: {
                    id: h.farm.id,
                    farmName: h.farm.farmName,
                    farmCode: h.farm.farmCode,
                    address: h.farm.address,
                    regionCode: h.farm.region?.code || null,
                },
                farmer: {
                    id: h.farmer.id,
                    fullName: h.farmer.fullName,
                    phone: h.farmer.phone,
                },
                varietyItems: h.varietyItems.map((v) => ({
                    id: v.id,
                    durianVariety: v.durianVariety,
                    expectedWeight: Number(v.expectedWeight),
                    expectedPricePerKg: v.expectedPricePerKg ? Number(v.expectedPricePerKg) : null,
                })),
                histories: h.histories.map((his) => ({
                    id: his.id,
                    fromStatus: his.fromStatus,
                    toStatus: his.toStatus,
                    note: his.note,
                    actorName: his.actor?.fullName || "Hệ thống",
                    createdAt: his.createdAt.toISOString(),
                })),
            };
        });

        return NextResponse.json({
            success: true,
            facility: facility ? { id: facility.id, name: facility.name, type: facility.type } : null,
            count: formatted.length,
            data: formatted,
        });
    } catch (error: any) {
        console.error("GET /api/harvest-receptions error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi tải danh sách tiếp nhận." },
            { status: 500 },
        );
    }
}
