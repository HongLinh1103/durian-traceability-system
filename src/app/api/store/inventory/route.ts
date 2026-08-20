import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnedStore, inventoryDocumentCode, requireRole } from "@/lib/store-marketplace";

const documentSchema = z.object({
    businessType: z.enum([
        "SUPPLIER_IMPORT", "CUSTOMER_RETURN", "SALE_EXPORT",
        "SUPPLIER_RETURN", "DISPOSAL_EXPORT",
        "STOCKTAKE_INCREASE", "STOCKTAKE_DECREASE",
    ]),
    createdDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(1_000_000),
        unitCost: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
        note: z.string().trim().max(500).optional(),
    })).min(1).max(50),
    supplierName: z.string().trim().max(200).nullish(),
    orderCode: z.string().trim().max(40).nullish(),
    reason: z.string().trim().max(500).nullish(),
    note: z.string().trim().max(1000).nullish(),
});

const businessConfig = {
    SUPPLIER_IMPORT: { type: "PN", movement: "IMPORT", direction: 1 },
    CUSTOMER_RETURN: { type: "PN", movement: "ORDER_RETURN", direction: 1 },
    SALE_EXPORT: { type: "PX", movement: "ORDER_SALE", direction: -1 },
    DISPOSAL_EXPORT: { type: "PX", movement: "EXPORT", direction: -1 },
    SUPPLIER_RETURN: { type: "PX", movement: "EXPORT", direction: -1 },
    STOCKTAKE_INCREASE: { type: "DC", movement: "IMPORT", direction: 1 },
    STOCKTAKE_DECREASE: { type: "DC", movement: "EXPORT", direction: -1 },
} as const;

export async function GET(request: Request) {
    const session = await requireRole(["STORE_OWNER"]);
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const store = await getOwnedStore(session.user.id);
    if (!store) return NextResponse.json({ success: false, message: "Không tìm thấy cửa hàng." }, { status: 404 });
    const productId = new URL(request.url).searchParams.get("productId");
    const [products, documents] = await Promise.all([
        prisma.storeProduct.findMany({ where: { storeId: store.id, deletedAt: null }, select: { id: true, name: true, type: true, stock: true, unit: true, status: true, imageUrls: true }, orderBy: { name: "asc" } }),
        prisma.inventoryDocument.findMany({
            where: { storeId: store.id, ...(productId ? { movements: { some: { productId } } } : {}) },
            include: { movements: { include: { product: { select: { name: true, unit: true } } } }, order: { select: { id: true, orderCode: true } } },
            orderBy: { createdAt: "desc" }, take: 200,
        }),
    ]);
    return NextResponse.json({ success: true, products, documents });
}

export async function POST(request: Request) {
    const session = await requireRole(["STORE_OWNER"]);
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const store = await getOwnedStore(session.user.id);
    if (!store || store.status !== "APPROVED") return NextResponse.json({ success: false, message: "Cửa hàng chưa được duyệt." }, { status: 403 });
    const parsed = documentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 });

    const config = businessConfig[parsed.data.businessType];
    try {
        const document = await prisma.$transaction(async (tx) => {
            const productIds = parsed.data.items.map((item) => item.productId);
            if (new Set(productIds).size !== productIds.length) throw new Error("DUPLICATE_PRODUCT");
            const [products, actor, order] = await Promise.all([
                tx.storeProduct.findMany({ where: { id: { in: productIds }, storeId: store.id, deletedAt: null } }),
                tx.user.findUnique({ where: { id: session.user.id }, select: { fullName: true } }),
                parsed.data.orderCode ? tx.order.findFirst({ where: { orderCode: parsed.data.orderCode, storeId: store.id, deletedAt: null } }) : null,
            ]);
            if (products.length !== productIds.length) throw new Error("PRODUCT_NOT_FOUND");
            if (parsed.data.orderCode && !order) throw new Error("ORDER_NOT_FOUND");
            if (parsed.data.businessType === "SUPPLIER_IMPORT" || parsed.data.businessType === "SUPPLIER_RETURN") {
                if (!parsed.data.supplierName) throw new Error("SUPPLIER_REQUIRED");
            }
            if (parsed.data.businessType === "SUPPLIER_RETURN" && !parsed.data.reason) throw new Error("REASON_REQUIRED");
            if (parsed.data.businessType === "DISPOSAL_EXPORT" && !parsed.data.reason) throw new Error("REASON_REQUIRED");
            if (["CUSTOMER_RETURN", "SALE_EXPORT"].includes(parsed.data.businessType) && !parsed.data.orderCode) throw new Error("ORDER_REQUIRED");
            const createdAt = new Date(`${parsed.data.createdDate}T12:00:00+07:00`);
            const code = await inventoryDocumentCode(tx, config.type, createdAt);
            const movements = [];
            for (const item of parsed.data.items) {
                const product = products.find((candidate) => candidate.id === item.productId)!;
                const stockAfter = product.stock + config.direction * item.quantity;
                if (stockAfter < 0) throw new Error("INSUFFICIENT_STOCK");
                await tx.storeProduct.update({ where: { id: product.id }, data: { stock: stockAfter, ...(stockAfter === 0 && product.status === "APPROVED" ? { status: "OUT_OF_STOCK" as const } : stockAfter > 0 && product.status === "OUT_OF_STOCK" ? { status: "APPROVED" as const } : {}) } });
                const unitCost = item.unitCost ? Number(item.unitCost) : null;
                const totalCost = unitCost !== null ? unitCost * item.quantity : null;
                movements.push({
                    productId: product.id,
                    actorId: session.user.id,
                    type: config.movement,
                    quantity: item.quantity,
                    stockBefore: product.stock,
                    stockAfter,
                    unitCost,
                    totalCost,
                    reference: order?.orderCode || parsed.data.supplierName || null,
                    note: item.note || null,
                });
            }
            return tx.inventoryDocument.create({ data: {
                storeId: store.id, code, type: config.type, businessType: parsed.data.businessType,
                supplierName: parsed.data.supplierName || null, orderId: order?.id || null,
                reason: parsed.data.reason || null, createdAt,
                note: parsed.data.note || null,
                actorId: session.user.id, actorName: actor?.fullName || "Chủ cửa hàng",
                movements: { create: movements },
            }, include: { movements: true } });
        });
        return NextResponse.json({ success: true, document }, { status: 201 });
    } catch (error) {
        const reason = error instanceof Error ? error.message : "";
        const messages: Record<string, string> = {
            INSUFFICIENT_STOCK: "Số lượng xuất vượt tồn kho hiện tại.", PRODUCT_NOT_FOUND: "Sản phẩm không thuộc cửa hàng.",
            ORDER_NOT_FOUND: "Không tìm thấy đơn hàng liên quan của cửa hàng.", SUPPLIER_REQUIRED: "Nghiệp vụ này cần nhập tên nhà cung cấp.",
            ORDER_REQUIRED: "Nghiệp vụ này cần chọn đơn hàng liên quan.", REASON_REQUIRED: "Nghiệp vụ này cần nhập lý do.", DUPLICATE_PRODUCT: "Mỗi sản phẩm chỉ được xuất hiện một lần trong chứng từ.",
            DAILY_CODE_LIMIT: "Đã vượt giới hạn 999 chứng từ trong ngày.",
        };
        return NextResponse.json({ success: false, message: messages[reason] || "Không thể tạo chứng từ kho." }, { status: 409 });
    }
}
