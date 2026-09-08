import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/harvest-receptions/[id]/reject
 * Từ chối tiếp nhận phiếu thu hoạch từ nông dân.
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        }

        const allowedRoles = ["COLLECTOR", "PROCESSING_FACILITY", "ADMIN", "AREA_MANAGER"];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json(
                { success: false, message: "Chỉ đơn vị thu mua / cơ sở chế biến mới có quyền từ chối tiếp nhận." },
                { status: 403 },
            );
        }

        const record = await prisma.harvestRecord.findFirst({
            where: { OR: [{ id: params.id }, { code: params.id }] },
            include: { farm: true, buyerFacility: true },
        });

        if (!record) {
            return NextResponse.json({ success: false, message: "Không tìm thấy phiếu thu hoạch." }, { status: 404 });
        }

        let body: any = {};
        try {
            body = await request.json();
        } catch {
            // body optional
        }

        const reason = body.reason || body.rejectReason || "Đơn vị không thể thu mua đợt này";

        const updated = await prisma.$transaction(async (tx) => {
            const item = await tx.harvestRecord.update({
                where: { id: record.id },
                data: {
                    status: "REJECTED",
                    rejectionReason: String(reason),
                },
            });

            await tx.harvestStatusHistory.create({
                data: {
                    harvestId: record.id,
                    actorId: session.user.id,
                    fromStatus: record.status,
                    toStatus: "REJECTED",
                    note: String(reason),
                },
            });

            return item;
        });

        await prisma.notification.create({
            data: {
                userId: record.farmerId,
                type: "HARVEST_STATUS",
                title: `Phiếu ${record.code} đã bị từ chối tiếp nhận`,
                message: `Lý do: ${reason}`,
            },
        }).catch(() => undefined);

        return NextResponse.json({
            success: true,
            message: "Đã từ chối tiếp nhận phiếu thu hoạch.",
            data: {
                id: updated.id,
                code: updated.code,
                status: updated.status,
                rejectionReason: updated.rejectionReason,
            },
        });
    } catch (error: any) {
        console.error("POST /api/harvest-receptions/[id]/reject error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi từ chối tiếp nhận phiếu." },
            { status: 500 },
        );
    }
}
