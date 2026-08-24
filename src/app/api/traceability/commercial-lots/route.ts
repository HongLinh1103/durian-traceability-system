import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkHarvestCompliance, validateTraceability } from "@/lib/traceability";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
    lotCode: z.string().trim().min(3).max(60), sourceType: z.enum(["HARVEST_LOT", "COLLECTION_LOT", "FINISHED_PRODUCT_LOT"]), sourceId: z.string().min(1),
    destinationId: z.string().min(1).optional(), destination: z.object({ type: z.enum(["RETAIL", "MARKET", "DISTRIBUTOR", "EXPORT", "OTHER"]), name: z.string().trim().min(2), address: z.string().trim().min(2), country: z.string().trim().optional(), province: z.string().trim().optional() }).optional(),
    productName: z.string().trim().min(2).max(160), quantity: z.coerce.number().positive(), unit: z.string().trim().min(1).max(20).default("kg"), note: z.string().trim().max(500).optional(),
}).refine(value => value.destinationId || value.destination, { message: "Cần chọn hoặc nhập điểm đến" });

async function actor() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["FARMER", "COLLECTOR", "PROCESSING_FACILITY", "ADMIN"].includes(session.user.role)) return null;
    return session.user;
}

export async function GET() {
    const user = await actor();
    if (!user) return NextResponse.json({ success: false, error: "Không có quyền truy cập" }, { status: 403 });
    const facility = ["COLLECTOR", "PROCESSING_FACILITY"].includes(user.role) ? await prisma.partnerFacility.findUnique({ where: { ownerId: user.id }, select: { id: true } }) : null;
    const where = user.role === "ADMIN" ? {} : user.role === "FARMER" ? { farmerOwnerId: user.id } : { ownerId: facility?.id ?? "missing" };
    const rows = await prisma.commercialLot.findMany({ where, include: { destination: true, traceabilityCode: true, owner: { select: { name: true, type: true } }, farmerOwner: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } });
    const data = await Promise.all(rows.map(async row => ({ ...row, owner: row.owner ?? { name: row.farmerOwner?.fullName ?? "Hộ sản xuất", type: "FARMER" }, quantity: Number(row.quantity), remainingQuantity: Number(row.remainingQuantity), validation: await validateTraceability(row.id) })));
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    const user = await actor();
    if (!user || user.role === "ADMIN") return NextResponse.json({ success: false, error: "Vai trò không được tạo lô thương mại" }, { status: 403 });
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Dữ liệu lô thương mại không hợp lệ", details: parsed.error.flatten() }, { status: 400 });
    const value = parsed.data;
    const ownerType = user.role === "FARMER" ? "FARMER" : user.role === "COLLECTOR" ? "COLLECTOR" : "PROCESSING_FACILITY";
    const expectedSource = user.role === "FARMER" ? "HARVEST_LOT" : user.role === "COLLECTOR" ? "COLLECTION_LOT" : "FINISHED_PRODUCT_LOT";
    if (value.sourceType !== expectedSource) return NextResponse.json({ success: false, error: "Loại lô nguồn không phù hợp với vai trò" }, { status: 400 });
    const facility = user.role === "FARMER" ? null : await prisma.partnerFacility.findUnique({ where: { ownerId: user.id } });
    if (user.role !== "FARMER" && (!facility || facility.status !== "APPROVED" || facility.type !== user.role)) return NextResponse.json({ success: false, error: "Đơn vị chưa được phê duyệt hoặc không hợp lệ" }, { status: 403 });

    const source = value.sourceType === "HARVEST_LOT" ? await prisma.harvestLot.findUnique({ where: { id: value.sourceId }, include: { farm: { select: { farmerId: true } } } })
        : value.sourceType === "COLLECTION_LOT" ? await prisma.collectionLot.findUnique({ where: { id: value.sourceId } })
            : await prisma.finishedProductLot.findUnique({ where: { id: value.sourceId } });
    if (!source) return NextResponse.json({ success: false, error: "Không tìm thấy lô nguồn" }, { status: 404 });
    if (user.role === "FARMER") {
        const harvest = source as { farm: { farmerId: string }; status: string; complianceStatus: string };
        if (harvest.farm.farmerId !== user.id) return NextResponse.json({ success: false, error: "Lô thu hoạch không thuộc vườn của bạn" }, { status: 403 });
        if (!["FINALIZED", "PARTIALLY_USED"].includes(harvest.status) || harvest.complianceStatus === "BLOCKED") return NextResponse.json({ success: false, error: "Lô thu hoạch chưa hoàn tất hoặc bị chặn tuân thủ" }, { status: 400 });
        const compliance = await checkHarvestCompliance(value.sourceId);
        if (compliance.status === "BLOCKED") return NextResponse.json({ success: false, error: `Không đạt kiểm tra tuân thủ: ${compliance.issues.join("; ")}` }, { status: 400 });
    }
    if (user.role === "COLLECTOR" && (source as { collectorFacilityId?: string; status: string }).collectorFacilityId !== facility?.id) return NextResponse.json({ success: false, error: "Lô thu mua không thuộc đơn vị" }, { status: 403 });
    if (user.role === "COLLECTOR" && !["FINALIZED", "PARTIALLY_USED"].includes((source as { status: string }).status)) return NextResponse.json({ success: false, error: "Lô thu mua chưa hoàn tất" }, { status: 400 });
    if (user.role === "PROCESSING_FACILITY" && (source as { facilityId?: string }).facilityId !== facility?.id) return NextResponse.json({ success: false, error: "Lô thành phẩm không thuộc đơn vị" }, { status: 403 });
    if (user.role === "PROCESSING_FACILITY" && !["READY_FOR_DISTRIBUTION", "PARTIALLY_DISTRIBUTED"].includes((source as { status: string }).status)) return NextResponse.json({ success: false, error: "Lô thành phẩm chưa sẵn sàng phân phối" }, { status: 400 });

    const available = value.sourceType === "HARVEST_LOT" ? Number((source as { remainingWeight: unknown }).remainingWeight) : value.sourceType === "COLLECTION_LOT" ? Number((source as { currentWeight: unknown }).currentWeight) : Number((source as { remainingWeight: unknown }).remainingWeight);
    if (value.quantity > available) return NextResponse.json({ success: false, error: "Khối lượng vượt quá lượng nguồn còn khả dụng" }, { status: 400 });
    const relation = value.sourceType === "HARVEST_LOT" ? { sourceHarvestLotId: value.sourceId } : value.sourceType === "COLLECTION_LOT" ? { sourceCollectionLotId: value.sourceId } : { sourceFinishedProductLotId: value.sourceId };

    try {
        const lot = await prisma.$transaction(async tx => {
            const allocation = value.sourceType === "HARVEST_LOT"
                ? await tx.harvestLot.updateMany({ where: { id: value.sourceId, remainingWeight: { gte: value.quantity } }, data: { remainingWeight: { decrement: value.quantity }, status: available === value.quantity ? "USED" : "PARTIALLY_USED" } })
                : value.sourceType === "COLLECTION_LOT"
                    ? await tx.collectionLot.updateMany({ where: { id: value.sourceId, currentWeight: { gte: value.quantity } }, data: { currentWeight: { decrement: value.quantity }, status: available === value.quantity ? "USED" : "PARTIALLY_USED" } })
                    : await tx.finishedProductLot.updateMany({ where: { id: value.sourceId, remainingWeight: { gte: value.quantity } }, data: { remainingWeight: { decrement: value.quantity }, status: available === value.quantity ? "DISTRIBUTED" : "PARTIALLY_DISTRIBUTED" } });
            if (allocation.count !== 1) throw new Error("Lô nguồn vừa được phân bổ bởi giao dịch khác; vui lòng tải lại");
            let destinationId = value.destinationId;
            if (!destinationId && value.destination) destinationId = (await tx.distributionDestination.upsert({ where: { name_address: { name: value.destination.name, address: value.destination.address } }, update: {}, create: value.destination })).id;
            const created = await tx.commercialLot.create({ data: { lotCode: value.lotCode, ownerType, ownerId: facility?.id, farmerOwnerId: user.role === "FARMER" ? user.id : undefined, sourceType: value.sourceType, sourceId: value.sourceId, destinationId, productName: value.productName, quantity: value.quantity, remainingQuantity: value.quantity, unit: value.unit, note: value.note, ...relation } });
            await tx.lotRelation.create({ data: { sourceType: value.sourceType, sourceId: value.sourceId, targetType: "COMMERCIAL_LOT", targetId: created.id, relationType: user.role === "FARMER" ? "SOLD_DIRECTLY_AS" : "PACKAGED_INTO", quantity: value.quantity, unit: value.unit } });
            await tx.traceEvent.create({ data: { commercialLotId: created.id, entityType: "COMMERCIAL_LOT", entityId: created.id, eventType: user.role === "FARMER" ? "DIRECT_SALE_PREPARED" : "COMMERCIAL_LOT_CREATED", eventTime: new Date(), actorId: user.id, actorRole: user.role, organizationType: user.role, organizationId: facility?.id ?? user.id, title: user.role === "FARMER" ? "Chuẩn bị bán trực tiếp" : "Tạo lô thương mại", description: created.lotCode, isPublic: true } });
            return created;
        });
        return NextResponse.json({ success: true, data: { ...lot, quantity: Number(lot.quantity), remainingQuantity: Number(lot.remainingQuantity), validation: await validateTraceability(lot.id) } }, { status: 201 });
    } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Không thể tạo lô" }, { status: 400 }); }
}
