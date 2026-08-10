import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnedStore, inventoryDocumentCode, requireRole } from "@/lib/store-marketplace";

const documentSchema = z.object({
    productId: z.string().min(1),
    businessType: z.enum([
        "SUPPLIER_IMPORT", "STOCK_REPLENISHMENT", "RETURNED_GOODS_IMPORT",
        "DISPOSAL_EXPORT", "TRANSFER_EXPORT", "STOCKTAKE_INCREASE",
        "STOCKTAKE_DECREASE", "CUSTOMER_RETURN", "SUPPLIER_RETURN",
    ]),
    quantity: z.coerce.number().int().min(1).max(1_000_000),
    supplierName: z.string().trim().max(200).optional(),
    orderCode: z.string().trim().max(40).optional(),
});

const businessConfig = {
    SUPPLIER_IMPORT: { type: "PN", movement: "IMPORT", direction: 1 },
    STOCK_REPLENISHMENT: { type: "PN", movement: "IMPORT", direction: 1 },
    RETURNED_GOODS_IMPORT: { type: "PN", movement: "IMPORT", direction: 1 },
    DISPOSAL_EXPORT: { type: "PX", movement: "EXPORT", direction: -1 },
    TRANSFER_EXPORT: { type: "PX", movement: "EXPORT", direction: -1 },
    STOCKTAKE_INCREASE: { type: "DC", movement: "IMPORT", direction: 1 },
    STOCKTAKE_DECREASE: { type: "DC", movement: "EXPORT", direction: -1 },
    CUSTOMER_RETURN: { type: "HT", movement: "ORDER_RETURN", direction: 1 },
    SUPPLIER_RETURN: { type: "HT", movement: "EXPORT", direction: -1 },
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
            const [product, actor, order] = await Promise.all([
                tx.storeProduct.findFirst({ where: { id: parsed.data.productId, storeId: store.id, deletedAt: null } }),
                tx.user.findUnique({ where: { id: session.user.id }, select: { fullName: true } }),
                parsed.data.orderCode ? tx.order.findFirst({ where: { orderCode: parsed.data.orderCode, storeId: store.id, deletedAt: null } }) : null,
            ]);
            if (!product) throw new Error("PRODUCT_NOT_FOUND");
            if (parsed.data.orderCode && !order) throw new Error("ORDER_NOT_FOUND");
            if (parsed.data.businessType === "SUPPLIER_IMPORT" || parsed.data.businessType === "SUPPLIER_RETURN") {
                if (!parsed.data.supplierName) throw new Error("SUPPLIER_REQUIRED");
            }
            const stockAfter = product.stock + config.direction * parsed.data.quantity;
            if (stockAfter < 0) throw new Error("INSUFFICIENT_STOCK");
            const code = await inventoryDocumentCode(tx, config.type);
            await tx.storeProduct.update({
                where: { id: product.id },
                data: { stock: stockAfter, ...(stockAfter === 0 && product.status === "APPROVED" ? { status: "OUT_OF_STOCK" as const } : stockAfter > 0 && product.status === "OUT_OF_STOCK" ? { status: "APPROVED" as const } : {}) },
            });
            return tx.inventoryDocument.create({ data: {
                storeId: store.id, code, type: config.type, businessType: parsed.data.businessType,
                supplierName: parsed.data.supplierName || null, orderId: order?.id || null,
                actorId: session.user.id, actorName: actor?.fullName || "Chủ cửa hàng",
                movements: { create: { productId: product.id, actorId: session.user.id, type: config.movement, quantity: parsed.data.quantity, stockBefore: product.stock, stockAfter, reference: order?.orderCode || parsed.data.supplierName || null } },
            }, include: { movements: true } });
        });
        return NextResponse.json({ success: true, document }, { status: 201 });
    } catch (error) {
        const reason = error instanceof Error ? error.message : "";
        const messages: Record<string, string> = {
            INSUFFICIENT_STOCK: "Số lượng xuất vượt tồn kho hiện tại.", PRODUCT_NOT_FOUND: "Sản phẩm không thuộc cửa hàng.",
            ORDER_NOT_FOUND: "Không tìm thấy đơn hàng liên quan của cửa hàng.", SUPPLIER_REQUIRED: "Nghiệp vụ này cần nhập tên nhà cung cấp.",
            DAILY_CODE_LIMIT: "Đã vượt giới hạn 999 chứng từ trong ngày.",
        };
        return NextResponse.json({ success: false, message: messages[reason] || "Không thể tạo chứng từ kho." }, { status: 409 });
    }
}
