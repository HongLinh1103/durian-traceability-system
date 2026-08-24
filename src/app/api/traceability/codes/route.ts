import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueTraceabilityCode } from "@/lib/traceability";

const issueSchema = z.object({ commercialLotId: z.string().min(1) });
const reviewSchema = z.object({ codeId: z.string().min(1), action: z.enum(["SUSPEND", "REVOKE", "REACTIVATE"]), reason: z.string().trim().min(5).max(500) });

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    const parsed = issueSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Thiếu lô thương mại" }, { status: 400 });
    try {
        const code = await issueTraceabilityCode({ commercialLotId: parsed.data.commercialLotId, actorId: session.user.id, actorRole: session.user.role });
        return NextResponse.json({ success: true, data: code }, { status: 201 });
    } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Không thể phát hành QR" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Chỉ quản trị viên được kiểm soát mã" }, { status: 403 });
    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Hành động hoặc lý do không hợp lệ" }, { status: 400 });
    const code = await prisma.traceabilityCode.findUnique({ where: { id: parsed.data.codeId } });
    if (!code) return NextResponse.json({ success: false, error: "Không tìm thấy mã" }, { status: 404 });
    const now = new Date();
    const nextStatus = parsed.data.action === "SUSPEND" ? "SUSPENDED" : parsed.data.action === "REVOKE" ? "REVOKED" : "ACTIVE";
    const result = await prisma.$transaction(async tx => {
        const updated = await tx.traceabilityCode.update({ where: { id: code.id }, data: parsed.data.action === "SUSPEND"
            ? { status: nextStatus, suspendedAt: now, suspendedById: session.user.id, suspendReason: parsed.data.reason }
            : parsed.data.action === "REVOKE"
                ? { status: nextStatus, revokedAt: now, revokedById: session.user.id, revokeReason: parsed.data.reason }
                : { status: nextStatus, activatedAt: now, suspendedAt: null, suspendedById: null, suspendReason: null } });
        await tx.traceEvent.create({ data: { commercialLotId: code.commercialLotId, entityType: "TRACEABILITY_CODE", entityId: code.id, eventType: `QR_${parsed.data.action}`, eventTime: now, actorId: session.user.id, actorRole: "ADMIN", title: parsed.data.action === "SUSPEND" ? "Tạm khóa mã QR" : parsed.data.action === "REVOKE" ? "Thu hồi mã QR" : "Kích hoạt lại mã QR", description: parsed.data.reason, isPublic: true } });
        await tx.traceAuditLog.create({ data: { actorId: session.user.id, action: parsed.data.action, entityType: "TRACEABILITY_CODE", entityId: code.id, reason: parsed.data.reason, metadata: { previousStatus: code.status, nextStatus } } });
        return updated;
    });
    return NextResponse.json({ success: true, data: result });
}
