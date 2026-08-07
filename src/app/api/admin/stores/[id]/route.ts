import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/store-marketplace";
const schema = z.object({ status: z.enum(["NEED_SUPPLEMENT", "APPROVED", "REJECTED", "SUSPENDED"]), reason: z.string().trim().max(1000).optional() });
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await requireRole(["ADMIN"]); if (!session) return NextResponse.json({ success: false, message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 });
    if (["REJECTED", "NEED_SUPPLEMENT", "SUSPENDED"].includes(parsed.data.status) && !parsed.data.reason) return NextResponse.json({ success: false, message: "Vui lòng nhập lý do." }, { status: 400 });
    const existing = await prisma.store.findFirst({ where: { id: params.id, deletedAt: null } }); if (!existing) return NextResponse.json({ success: false, message: "Không tìm thấy cửa hàng." }, { status: 404 });
    const approved = parsed.data.status === "APPROVED";
    const data = await prisma.$transaction(async (tx) => {
        const store = await tx.store.update({ where: { id: existing.id }, data: { status: parsed.data.status, reviewReason: parsed.data.reason || null, approvedAt: approved ? new Date() : null } });
        await tx.user.update({ where: { id: existing.ownerId }, data: { isApproved: approved, accountStatus: approved ? "APPROVED" : parsed.data.status === "NEED_SUPPLEMENT" ? "NEEDS_SUPPLEMENT" : parsed.data.status === "REJECTED" ? "REJECTED" : "PENDING", isLocked: parsed.data.status === "SUSPENDED" } });
        await tx.storeAuditLog.create({ data: { storeId: existing.id, actorId: session.user.id, action: `STORE_${parsed.data.status}`, fromStatus: existing.status, toStatus: parsed.data.status, reason: parsed.data.reason } });
        const notification = approved
            ? { title: "Cửa hàng đã được phê duyệt", message: `Hồ sơ cửa hàng ${existing.name} đã được phê duyệt.`, type: "STORE_APPROVED" }
            : parsed.data.status === "NEED_SUPPLEMENT"
                ? { title: "Hồ sơ cửa hàng cần bổ sung", message: `Hồ sơ cửa hàng ${existing.name} cần bổ sung: ${parsed.data.reason}`, type: "STORE_SUPPLEMENT_REQUIRED" }
                : parsed.data.status === "REJECTED"
                    ? { title: "Hồ sơ cửa hàng bị từ chối", message: `Hồ sơ cửa hàng ${existing.name} bị từ chối. Lý do: ${parsed.data.reason}`, type: "STORE_REJECTED" }
                    : { title: "Cửa hàng đã bị tạm khóa", message: `Cửa hàng ${existing.name} đã bị tạm khóa. Lý do: ${parsed.data.reason}`, type: "STORE_SUSPENDED" };
        await tx.notification.create({ data: { userId: existing.ownerId, ...notification } });
        return store;
    });
    return NextResponse.json({ success: true, data, message: `Đã cập nhật trạng thái cửa hàng ${existing.name}.` });
}
