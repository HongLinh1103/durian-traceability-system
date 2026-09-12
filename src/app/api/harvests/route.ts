import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatVietnameseDate } from "@/lib/date-format";
import { buildBaseHarvestCode, generateUniqueHarvestCode } from "@/lib/harvest-code";

const varietyItemSchema = z.object({
    durianVariety: z.string().trim().min(1, "Vui lòng chọn giống sầu riêng."),
    expectedWeight: z.coerce.number().positive("Khối lượng dự kiến phải lớn hơn 0."),
    expectedPricePerKg: z.coerce.number().min(0, "Giá bán dự kiến không hợp lệ.").optional().nullable(),
});

const schema = z.object({
    farmId: z.string().min(1, "Vui lòng chọn vườn thu hoạch."),
    expectedHarvestDate: z.string().min(1, "Vui lòng chọn ngày dự kiến thu hoạch."),
    plotArea: z.string().optional().nullable(),
    varietyItems: z.array(varietyItemSchema).min(1, "Vui lòng thêm ít nhất một giống sầu riêng."),
    expectedTreeCount: z.coerce.number().int().positive().optional().nullable(),
    expectedFruitCount: z.coerce.number().int().positive().optional().nullable(),
    weightUnit: z.string().default("kg"),
    fruitCondition: z.string().optional().nullable(),
    buyerType: z.enum(["UNDETERMINED", "COLLECTOR", "PROCESSING_FACILITY", "SELF_CONSUMPTION"]).or(z.literal("")).optional().nullable(),
    buyerFacilityId: z.string().optional().nullable(),
    expectedSaleWeight: z.coerce.number().positive().optional().nullable(),
    expectedPricePerKg: z.coerce.number().positive().optional().nullable(),
    expectedBuyerArrivalDate: z.string().optional().nullable(),
    deliveryMethod: z.enum(["BUYER_PICKUP", "FARMER_DELIVERY", "OTHER"]).or(z.literal("")).optional().nullable(),
    transactionNote: z.string().optional().nullable(),
});

const quickHarvestSchema = z.object({
    cropSeasonId: z.string().min(1, "Vui lòng chọn niên vụ."),
    actualWeight: z.coerce.number().positive("Tổng sản lượng phải lớn hơn 0."),
    buyerName: z.string().trim().min(1, "Vui lòng nhập hoặc chọn bên mua."),
    buyerFacilityId: z.string().optional().nullable(),
    pricePerKg: z.coerce.number().positive("Giá bán phải lớn hơn 0."),
    harvestDate: z.string().optional().nullable(),
});

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        const buyer = ["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role);
        let whereCondition: any = { farmerId: session.user.id };
        if (buyer) {
            const facility = await prisma.partnerFacility.findFirst({
                where: { ownerId: session.user.id, deletedAt: null },
            });
            whereCondition = {
                OR: [
                    { buyerUserId: session.user.id },
                    ...(facility ? [{ buyerFacilityId: facility.id }] : []),
                ],
            };
        }
        const data = await prisma.harvestRecord.findMany({
            where: whereCondition,
            include: {
                cropSeason: { select: { id: true, name: true, year: true, status: true, startedAt: true, expectedEndAt: true } },
                varietyItems: true,
                farm: { select: { farmName: true, farmCode: true, address: true, durianVariety: true } },
                farmer: { select: { fullName: true, phone: true } },
                buyerFacility: { select: { name: true, phone: true, province: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/harvests error:", error);
        return NextResponse.json({ success: false, data: [], message: error instanceof Error ? error.message : "Lỗi máy chủ." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "FARMER") {
            return NextResponse.json({ success: false, message: "Chỉ tài khoản nông dân mới có quyền tạo hồ sơ thu hoạch." }, { status: 403 });
        }

        let bodyJson: any;
        try {
            bodyJson = await request.json();
        } catch {
            return NextResponse.json({ success: false, message: "Dữ liệu gửi lên không đúng định dạng JSON." }, { status: 400 });
        }

        // Branch 1: Concise "Hồ sơ thu hoạch" format
        if (bodyJson && (bodyJson.cropSeasonId || bodyJson.buyerName) && !bodyJson.varietyItems) {
            const parsedQuick = quickHarvestSchema.safeParse(bodyJson);
            if (!parsedQuick.success) {
                return NextResponse.json({
                    success: false,
                    message: parsedQuick.error.issues[0]?.message || "Dữ liệu không hợp lệ.",
                }, { status: 400 });
            }
            const qData = parsedQuick.data;
            const season = await prisma.cropSeason.findFirst({
                where: { id: qData.cropSeasonId },
                include: { farm: true },
            });
            if (!season || season.farm.farmerId !== session.user.id) {
                return NextResponse.json({
                    success: false,
                    message: "Niên vụ được chọn không tồn tại hoặc không thuộc quyền quản lý của bạn.",
                }, { status: 404 });
            }

            let facility = null;
            if (qData.buyerFacilityId) {
                facility = await prisma.partnerFacility.findFirst({
                    where: { id: qData.buyerFacilityId, deletedAt: null },
                });
            }

            const safeBuyerType = facility ? facility.type : "UNDETERMINED";
            const buyerUserId = facility ? facility.ownerId : null;
            const buyerName = (facility ? facility.name : qData.buyerName).trim();
            const weight = qData.actualWeight;
            const price = qData.pricePerKg;
            const harvestDate = qData.harvestDate ? new Date(qData.harvestDate) : new Date();
            const baseCode = buildBaseHarvestCode(season, harvestDate);
            const code = await generateUniqueHarvestCode(baseCode, async (candidate) => {
                const existing = await prisma.harvestRecord.findUnique({ where: { code: candidate } });
                return Boolean(existing);
            });

            const created = await prisma.harvestRecord.create({
                data: {
                    code,
                    farmId: season.farmId,
                    farmerId: session.user.id,
                    cropSeasonId: season.id,
                    buyerType: safeBuyerType,
                    buyerFacilityId: facility?.id || null,
                    buyerUserId,
                    status: "COMPLETED",
                    expectedHarvestDate: harvestDate,
                    actualHarvestedAt: harvestDate,
                    completedAt: harvestDate,
                    durianVariety: season.farm.durianVariety || "Ri6",
                    expectedWeight: weight,
                    actualWeight: weight,
                    deliveredWeight: weight,
                    receivedWeight: weight,
                    expectedSaleWeight: weight,
                    weightUnit: "kg",
                    expectedPricePerKg: price,
                    transactionNote: buyerName,
                    varietyItems: {
                        create: [
                            {
                                durianVariety: season.farm.durianVariety || "Ri6",
                                expectedWeight: weight,
                                expectedPricePerKg: price,
                            },
                        ],
                    },
                    histories: {
                        create: {
                            actorId: session.user.id,
                            toStatus: "COMPLETED",
                            note: `Nông dân tạo hồ sơ thu hoạch (${buyerName})`,
                        },
                    },
                },
                include: {
                    cropSeason: true,
                    farm: true,
                    buyerFacility: true,
                },
            });

            // Ghi nhật ký canh tác cho đợt thu hoạch để khớp với hồ sơ
            try {
                await prisma.farmingLog.create({
                    data: {
                        farmId: season.farmId,
                        cropSeasonId: season.id,
                        stage: "HARVEST",
                        activityType: "HARVEST",
                        actionDate: harvestDate,
                        notes: `Thu hoạch sầu riêng ${season.farm.durianVariety || "Ri6"} (Mã hồ sơ: ${code}). Khối lượng: ${weight.toLocaleString("vi-VN")} kg. Bán cho ${buyerName} với giá ${price.toLocaleString("vi-VN")} đ/kg.`,
                        pestsDetected: "Không phát hiện",
                        isGACCCompliant: true,
                        harvestRecordId: created.id,
                    },
                });
            } catch (logErr) {
                console.warn("Could not auto-create farming log for harvest:", logErr);
            }

            return NextResponse.json({
                success: true,
                data: created,
                message: "Đã lưu hồ sơ thu hoạch thành công.",
            }, { status: 201 });
        }

        const parsed = schema.safeParse(bodyJson);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." }, { status: 400 });
        }
        const value = parsed.data;

        const farm = await prisma.farm.findFirst({
            where: { id: value.farmId, farmerId: session.user.id, isActive: true },
            include: { cropSeasons: { where: { status: "ACTIVE" }, take: 1 } },
        });
        if (!farm) {
            return NextResponse.json({ success: false, message: "Vườn thu hoạch không tồn tại hoặc không thuộc tài khoản của bạn." }, { status: 404 });
        }
        const activeSeason = farm.cropSeasons[0];
        if (!activeSeason) {
            return NextResponse.json({ success: false, message: "Vườn chưa có vụ mùa đang hoạt động. Hãy bắt đầu vụ mùa mới trước khi tạo phiếu thu hoạch." }, { status: 409 });
        }

        const selectedVarieties = value.varietyItems.map(item => item.durianVariety.trim());
        if (new Set(selectedVarieties).size !== selectedVarieties.length) {
            return NextResponse.json({ success: false, message: "Mỗi giống chỉ được thêm một lần trong phiếu." }, { status: 400 });
        }

        const totalExpectedWeight = value.varietyItems.reduce((total, item) => total + item.expectedWeight, 0);
        const totalExpectedValue = value.varietyItems.reduce(
            (total, item) => total + item.expectedWeight * Number(item.expectedPricePerKg || 0),
            0,
        );
        const weightedExpectedPrice = totalExpectedValue > 0 ? totalExpectedValue / totalExpectedWeight : null;

        const safeBuyerType = (value.buyerType && ["UNDETERMINED", "COLLECTOR", "PROCESSING_FACILITY", "SELF_CONSUMPTION"].includes(value.buyerType))
            ? (value.buyerType as "UNDETERMINED" | "COLLECTOR" | "PROCESSING_FACILITY" | "SELF_CONSUMPTION")
            : "UNDETERMINED";

        if (["COLLECTOR", "PROCESSING_FACILITY"].includes(safeBuyerType)
            && value.varietyItems.some(item => !item.expectedPricePerKg || item.expectedPricePerKg <= 0)) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập giá đề xuất cho tất cả giống khi gửi phiếu đến bên thu mua." },
                { status: 400 },
            );
        }

        let facility = null;
        if (["COLLECTOR", "PROCESSING_FACILITY"].includes(safeBuyerType) && value.buyerFacilityId) {
            facility = await prisma.partnerFacility.findFirst({
                where: {
                    id: value.buyerFacilityId,
                    type: safeBuyerType as "COLLECTOR" | "PROCESSING_FACILITY",
                    status: "APPROVED",
                    deletedAt: null,
                },
            });
            if (!facility) {
                return NextResponse.json({ success: false, message: "Đơn vị thu mua / cơ sở chế biến chưa được phê duyệt." }, { status: 400 });
            }
        }

        const harvestDate = new Date(value.expectedHarvestDate);
        if (isNaN(harvestDate.getTime())) {
            return NextResponse.json({ success: false, message: "Ngày dự kiến thu hoạch không hợp lệ." }, { status: 400 });
        }

        let arrivalDate: Date | null = null;
        if (value.expectedBuyerArrivalDate && value.expectedBuyerArrivalDate.trim()) {
            const parsedArrival = new Date(value.expectedBuyerArrivalDate.trim());
            if (!isNaN(parsedArrival.getTime())) {
                arrivalDate = parsedArrival;
            }
        }

        const safeDeliveryMethod = (value.deliveryMethod && ["BUYER_PICKUP", "FARMER_DELIVERY", "OTHER"].includes(value.deliveryMethod))
            ? (value.deliveryMethod as "BUYER_PICKUP" | "FARMER_DELIVERY" | "OTHER")
            : null;

        const baseCode = buildBaseHarvestCode(activeSeason, harvestDate);
        const code = await generateUniqueHarvestCode(baseCode, async (candidate) => {
            const existing = await prisma.harvestRecord.findUnique({ where: { code: candidate } });
            return Boolean(existing);
        });

        const waiting = Boolean(facility);

        const created = await prisma.harvestRecord.create({
            data: {
                code,
                farmId: farm.id,
                farmerId: session.user.id,
                cropSeasonId: activeSeason.id,
                buyerType: safeBuyerType,
                buyerFacilityId: facility?.id || null,
                buyerUserId: facility?.ownerId || null,
                status: waiting ? "WAITING_CONFIRMATION" : "DRAFT",
                expectedHarvestDate: harvestDate,
                durianVariety: selectedVarieties.join(", "),
                expectedTreeCount: value.expectedTreeCount || null,
                expectedFruitCount: value.expectedFruitCount || null,
                expectedWeight: totalExpectedWeight,
                weightUnit: "kg",
                expectedSaleWeight: facility ? totalExpectedWeight : null,
                expectedPricePerKg: weightedExpectedPrice,
                expectedBuyerArrivalDate: arrivalDate,
                deliveryMethod: safeDeliveryMethod,
                transactionNote: value.transactionNote?.trim() || null,
                varietyItems: {
                    create: value.varietyItems.map(item => ({
                        durianVariety: item.durianVariety.trim(),
                        expectedWeight: item.expectedWeight,
                        expectedPricePerKg: item.expectedPricePerKg || null,
                    })),
                },
                histories: {
                    create: {
                        actorId: session.user.id,
                        toStatus: waiting ? "WAITING_CONFIRMATION" : "DRAFT",
                        note: "Nông dân tạo phiếu thu hoạch",
                    },
                },
            },
        });

        if (facility && facility.ownerId) {
            await prisma.notification.create({
                data: {
                    userId: facility.ownerId,
                    type: "HARVEST_REQUEST",
                    title: safeBuyerType === "PROCESSING_FACILITY" ? "Có nguồn nguyên liệu mới" : "Phiếu thu hoạch mới",
                    message: safeBuyerType === "PROCESSING_FACILITY"
                        ? `${farm.farmName} gửi phiếu ${code}, dự kiến thu hoạch ${totalExpectedWeight} kg ${selectedVarieties.join(", ")} ngày ${formatVietnameseDate(harvestDate)}.`
                        : `${farm.farmName} gửi phiếu ${code}, dự kiến ${totalExpectedWeight} kg.`,
                },
            }).catch(() => {});
        }

        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error) {
        console.error("POST /api/harvests error:", error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Đã có lỗi xảy ra khi lưu phiếu thu hoạch.",
        }, { status: 500 });
    }
}
