import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/sales/transactions
 * Resource giao dịch bán sầu riêng chung (ƯU TIÊN 4 & Điểm 13).
 * Thống nhất chuẩn hóa cho Nông dân, Vựa thu mua, Cơ sở chế biến và Báo cáo tài chính.
 */
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get("year");
        const farmIdParam = searchParams.get("farmId");
        const statusParam = searchParams.get("status");

        const where: any = {};

        // Phân quyền theo actor
        if (session.user.role === "FARMER") {
            where.farmerId = session.user.id;
        } else if (["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role)) {
            const facility = await prisma.partnerFacility.findFirst({
                where: { ownerId: session.user.id, deletedAt: null },
            });
            where.OR = [
                { buyerUserId: session.user.id },
                ...(facility ? [{ buyerFacilityId: facility.id }] : []),
                { buyerType: session.user.role as any },
            ];
        }

        // Lọc trạng thái (mặc định lấy các giao dịch đã xác nhận hoặc hoàn tất)
        if (statusParam && statusParam !== "ALL") {
            where.status = statusParam;
        } else {
            where.status = { in: ["CONFIRMED", "HARVESTING", "HARVESTED", "DELIVERY_CONFIRMED", "COMPLETED"] };
        }

        if (farmIdParam && farmIdParam !== "ALL") {
            where.farmId = farmIdParam;
        }

        if (yearParam && yearParam !== "ALL") {
            const y = Number(yearParam);
            if (!isNaN(y)) {
                where.expectedHarvestDate = {
                    gte: new Date(`${y}-01-01T00:00:00.000Z`),
                    lte: new Date(`${y}-12-31T23:59:59.999Z`),
                };
            }
        }

        const harvests = await prisma.harvestRecord.findMany({
            where,
            include: {
                varietyItems: true,
                farm: { select: { id: true, farmName: true, farmCode: true } },
                farmer: { select: { id: true, fullName: true, phone: true } },
                buyerFacility: { select: { id: true, name: true, phone: true, type: true } },
                buyerUser: { select: { id: true, fullName: true, phone: true } },
            },
            orderBy: [{ completedAt: "desc" }, { buyerReceivedAt: "desc" }, { expectedHarvestDate: "desc" }],
        });

        let totalRevenue = 0;
        let totalSoldWeightKg = 0;

        const transactions = harvests.map((h) => {
            let weight = Number(h.receivedWeight ?? h.deliveredWeight ?? h.actualWeight ?? h.expectedSaleWeight ?? h.expectedWeight ?? 0);
            const unitLower = (h.weightUnit || "").toLowerCase();
            if ((unitLower.includes("tấn") || unitLower.includes("tan")) && weight > 0 && weight < 50) {
                weight = weight * 1000;
            }

            const price = Number(h.expectedPricePerKg || 0);
            let amount = 0;

            if (h.varietyItems && h.varietyItems.length > 0) {
                const vSum = h.varietyItems.reduce((acc, vi) => {
                    const viWeight = Number(vi.expectedWeight || 0);
                    const viPrice = Number(vi.expectedPricePerKg || h.expectedPricePerKg || 0);
                    return acc + viWeight * viPrice;
                }, 0);
                amount = vSum > 0 ? vSum : weight * price;
            } else {
                amount = weight * price;
            }

            if (amount === 0 && weight > 0) {
                amount = weight * 75000; // default estimated rate
            }

            totalRevenue += amount;
            totalSoldWeightKg += weight;

            const noteMatch = h.transactionNote?.match(/bán cho ([^-,.\n]+)/i);
            const buyerName =
                noteMatch?.[1]?.trim() ||
                h.buyerFacility?.name ||
                h.buyerUser?.fullName ||
                (h.buyerType === "COLLECTOR" ? "Vựa thu mua" : h.buyerType === "PROCESSING_FACILITY" ? "Cơ sở chế biến" : "Thương lái");

            const date = h.completedAt || h.buyerReceivedAt || h.actualHarvestedAt || h.expectedHarvestDate;

            return {
                id: `st-${h.id}`,
                transactionCode: `GD-${h.code}`,
                harvestId: h.id,
                harvestCode: h.code,
                sellerFarmer: {
                    id: h.farmer.id,
                    fullName: h.farmer.fullName,
                    phone: h.farmer.phone,
                },
                farm: {
                    id: h.farm.id,
                    name: h.farm.farmName,
                    code: h.farm.farmCode,
                },
                buyer: {
                    id: h.buyerFacility?.id || h.buyerUserId || null,
                    name: buyerName,
                    type: h.buyerFacility?.type || h.buyerType,
                },
                durianVariety: h.durianVariety,
                weightKg: weight,
                unitPrice: price > 0 ? price : Math.round(amount / (weight || 1)),
                totalAmount: amount,
                status: h.status === "COMPLETED" ? "COMPLETED" : "CONFIRMED",
                transactionDate: date.toISOString(),
            };
        });

        const avgPricePerKg = totalSoldWeightKg > 0 ? Math.round(totalRevenue / totalSoldWeightKg) : 0;

        return NextResponse.json({
            success: true,
            summary: {
                totalRevenue,
                totalSoldWeightKg,
                avgPricePerKg,
                transactionCount: transactions.length,
            },
            data: transactions,
        });
    } catch (error: any) {
        console.error("GET /api/sales/transactions error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi tải danh sách giao dịch bán." },
            { status: 500 },
        );
    }
}
