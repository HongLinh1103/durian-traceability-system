import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    farmId: z.string().min(1), expectedHarvestDate: z.string().min(1), plotArea: z.string().optional(),
    varietyItems: z.array(z.object({ durianVariety: z.string().trim().min(1), expectedWeight: z.coerce.number().positive() })).min(1, "Vui lòng thêm ít nhất một giống sầu riêng."),
    expectedTreeCount: z.coerce.number().int().positive().optional(), expectedFruitCount: z.coerce.number().int().positive().optional(),
    weightUnit: z.enum(["kg", "tấn"]).default("kg"), fruitCondition: z.string().optional(),
    buyerType: z.enum(["UNDETERMINED", "COLLECTOR", "PROCESSING_FACILITY", "SELF_CONSUMPTION"]), buyerFacilityId: z.string().optional(),
    expectedSaleWeight: z.coerce.number().positive().optional(), expectedPricePerKg: z.coerce.number().positive().optional(),
    expectedBuyerArrivalDate: z.string().optional(), deliveryMethod: z.enum(["BUYER_PICKUP", "FARMER_DELIVERY"]).optional(), transactionNote: z.string().optional(),
});

export async function GET() {
    const session = await getServerSession(authOptions); if (!session?.user?.id) return NextResponse.json({ success: false }, { status: 401 });
    const buyer = ["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role);
    const data = await prisma.harvestRecord.findMany({ where: buyer ? { buyerUserId: session.user.id } : { farmerId: session.user.id }, include: { varietyItems: true, farm: { select: { farmName: true, farmCode: true, address: true, durianVariety: true } }, farmer: { select: { fullName: true, phone: true } }, buyerFacility: { select: { name: true, phone: true, province: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions); if (!session?.user?.id || session.user.role !== "FARMER") return NextResponse.json({ success: false }, { status: 403 });
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 }); const value = parsed.data;
    const farm = await prisma.farm.findFirst({ where: { id: value.farmId, farmerId: session.user.id, isActive: true } }); if (!farm) return NextResponse.json({ success: false, message: "Vườn không hợp lệ." }, { status: 404 });
    const farmVarieties = farm.durianVariety.split(",").map(item => item.trim()).filter(Boolean);
    const selectedVarieties = value.varietyItems.map(item => item.durianVariety);
    if (new Set(selectedVarieties).size !== selectedVarieties.length) return NextResponse.json({ success: false, message: "Mỗi giống chỉ được thêm một lần trong phiếu." }, { status: 400 });
    if (selectedVarieties.some(variety => !farmVarieties.includes(variety))) return NextResponse.json({ success: false, message: "Có giống sầu riêng không thuộc vườn đã chọn." }, { status: 400 });
    const totalExpectedWeight = value.varietyItems.reduce((total, item) => total + item.expectedWeight, 0);
    let facility = null; if (["COLLECTOR", "PROCESSING_FACILITY"].includes(value.buyerType)) { facility = await prisma.partnerFacility.findFirst({ where: { id: value.buyerFacilityId, type: value.buyerType as "COLLECTOR" | "PROCESSING_FACILITY", status: "APPROVED", deletedAt: null } }); if (!facility) return NextResponse.json({ success: false, message: "Đơn vị thu mua chưa được phê duyệt." }, { status: 400 }); }
    const day = new Date().toISOString().slice(0,10).replaceAll("-", ""); const count = await prisma.harvestRecord.count({ where: { code: { startsWith: `TH-${day}` } } }); const code = `TH-${day}-${String(count + 1).padStart(3,"0")}`;
    const waiting = Boolean(facility); const created = await prisma.harvestRecord.create({ data: { code, farmId: farm.id, farmerId: session.user.id, buyerType: value.buyerType, buyerFacilityId: facility?.id, buyerUserId: facility?.ownerId, status: waiting ? "WAITING_CONFIRMATION" : "DRAFT", expectedHarvestDate: new Date(value.expectedHarvestDate), durianVariety: selectedVarieties.join(", "), expectedWeight: totalExpectedWeight, weightUnit: value.weightUnit, expectedSaleWeight: facility ? totalExpectedWeight : null, expectedPricePerKg: value.expectedPricePerKg, expectedBuyerArrivalDate: value.expectedBuyerArrivalDate ? new Date(value.expectedBuyerArrivalDate) : null, deliveryMethod: value.deliveryMethod, transactionNote: value.transactionNote || null, varietyItems: { create: value.varietyItems }, histories: { create: { actorId: session.user.id, toStatus: waiting ? "WAITING_CONFIRMATION" : "DRAFT", note: "Nông dân tạo phiếu thu hoạch" } } } });
    if (facility) await prisma.notification.create({ data: { userId: facility.ownerId, type: "HARVEST_REQUEST", title: "Phiếu thu hoạch mới", message: `${farm.farmName} gửi phiếu ${code}, dự kiến ${totalExpectedWeight} ${value.weightUnit}.` } });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
}
