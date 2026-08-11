import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnedStore, productUpdateSchema, requireRole } from "@/lib/store-marketplace";
import { sanitizeRichText } from "@/lib/sanitize-rich-text";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await requireRole(["STORE_OWNER"]); if (!session) return NextResponse.json({ success: false }, { status: 403 });
    const store = await getOwnedStore(session.user.id); const item = store && await prisma.storeProduct.findFirst({ where: { id: params.id, storeId: store.id, deletedAt: null } });
    if (!item) return NextResponse.json({ success: false }, { status: 404 });
    const parsed = productUpdateSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 });
    const { status, ...fields } = parsed.data;
    if (status === "APPROVED" && item.stock <= 0) return NextResponse.json({ success: false, message: "Cần nhập kho trước khi mở bán sản phẩm." }, { status: 409 });
    if (status && status !== "APPROVED" && status !== "HIDDEN") return NextResponse.json({ success: false, message: "Trạng thái sản phẩm không hợp lệ." }, { status: 400 });
    if (status === "HIDDEN" && item.status !== "APPROVED") return NextResponse.json({ success: false, message: "Chỉ sản phẩm đang bán mới có thể tạm ẩn." }, { status: 409 });
    const safeFields = { ...fields, ...(fields.usagePurpose !== undefined ? { usagePurpose: sanitizeRichText(fields.usagePurpose) } : {}), ...(fields.usageInstructions !== undefined ? { usageInstructions: sanitizeRichText(fields.usageInstructions) } : {}), ...(fields.safetyWarnings !== undefined ? { safetyWarnings: sanitizeRichText(fields.safetyWarnings) } : {}) };
    return NextResponse.json({ success: true, data: await prisma.storeProduct.update({ where: { id: item.id }, data: { ...safeFields, ...(status ? { status } : {}) } }) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
    const session = await requireRole(["STORE_OWNER"]); if (!session) return NextResponse.json({ success: false }, { status: 403 });
    const store = await getOwnedStore(session.user.id); const item = store && await prisma.storeProduct.findFirst({ where: { id: params.id, storeId: store.id, deletedAt: null } });
    if (!item) return NextResponse.json({ success: false }, { status: 404 });
    await prisma.storeProduct.update({ where: { id: item.id }, data: { deletedAt: new Date(), status: "HIDDEN" } }); return NextResponse.json({ success: true });
}
