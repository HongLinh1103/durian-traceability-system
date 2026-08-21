import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        const buyer = ["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role);
        const data = await prisma.harvestRecord.findMany({
            where: buyer ? { buyerUserId: session.user.id } : { farmerId: session.user.id },
            include: {
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
            return NextResponse.json({ success: false, message: "Chỉ tài khoản nông dân mới có quyền tạo phiếu thu hoạch." }, { status: 403 });
        }

        let bodyJson: unknown;
        try {
            bodyJson = await request.json();
        } catch {
            return NextResponse.json({ success: false, message: "Dữ liệu gửi lên không đúng định dạng JSON." }, { status: 400 });
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

        const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const count = await prisma.harvestRecord.count({ where: { code: { startsWith: `TH-${day}` } } });
        let codeIndex = count + 1;
        let code = `TH-${day}-${String(codeIndex).padStart(3, "0")}`;
        while (await prisma.harvestRecord.findUnique({ where: { code } })) {
            codeIndex++;
            code = `TH-${day}-${String(codeIndex).padStart(3, "0")}`;
        }

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
                    title: "Phiếu thu hoạch mới",
                    message: `${farm.farmName} gửi phiếu ${code}, dự kiến ${totalExpectedWeight} kg.`,
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
