import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/harvest-receptions/[id]/accept
 * Ý NGHĨA NGHIỆP VỤ (ƯU TIÊN 2 & 3):
 * - Đơn vị thu mua / Cơ sở chế biến ĐỒNG Ý TIẾP NHẬN Phiếu thu hoạch khi Nông dân gửi đến.
 * - HÀNG CHƯA ĐẾN XƯỞNG / VỰA!
 * - TUYỆT ĐỐI KHÔNG sinh RawMaterialLot hay GoodsReceipt ở bước này.
 * - Status chuyển sang: CONFIRMED.
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
                { success: false, message: "Chỉ đơn vị thu mua / cơ sở chế biến mới có quyền xác nhận tiếp nhận." },
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

        // Kiểm tra quyền sở hữu phiếu
        const owns =
            session.user.role === "ADMIN" ||
            session.user.role === "AREA_MANAGER" ||
            record.buyerUserId === session.user.id ||
            !record.buyerUserId ||
            record.buyerFacility?.ownerId === session.user.id;

        if (!owns) {
            return NextResponse.json({ success: false, message: "Bạn không có quyền xử lý phiếu này." }, { status: 403 });
        }

        if (record.status !== "WAITING_CONFIRMATION" && record.status !== "DRAFT") {
            return NextResponse.json(
                {
                    success: false,
                    message: `Không thể xác nhận tiếp nhận khi phiếu đang ở trạng thái '${record.status}'. Chỉ tiếp nhận khi phiếu 'Chờ xác nhận'.`,
                },
                { status: 400 },
            );
        }

        let body: any = {};
        try {
            body = await request.json();
        } catch {
            // body is optional
        }

        const note = body.note ? String(body.note) : "Đơn vị tiếp nhận đã đồng ý nhận nguồn thu hoạch. Đang chờ nông dân thu hoạch & giao hàng.";

        // Cập nhật trạng thái sang CONFIRMED
        const updated = await prisma.$transaction(async (tx) => {
            const item = await tx.harvestRecord.update({
                where: { id: record.id },
                data: {
                    status: "CONFIRMED",
                    buyerUserId: session.user.id,
                },
            });

            await tx.harvestStatusHistory.create({
                data: {
                    harvestId: record.id,
                    actorId: session.user.id,
                    fromStatus: record.status,
                    toStatus: "CONFIRMED",
                    note,
                },
            });

            return item;
        });

        // Gửi thông báo đến Nông dân
        await prisma.notification.create({
            data: {
                userId: record.farmerId,
                type: "HARVEST_STATUS",
                title: `Phiếu ${record.code} đã được đồng ý tiếp nhận`,
                message: `Đơn vị tiếp nhận đã đồng ý thu mua lô sầu riêng từ vườn ${record.farm.farmName}. Bạn có thể tiến hành thu hoạch theo kế hoạch.`,
            },
        }).catch(() => undefined);

        return NextResponse.json({
            success: true,
            message: "Đã xác nhận tiếp nhận phiếu thu hoạch thành công.",
            data: {
                id: updated.id,
                code: updated.code,
                status: updated.status,
            },
        });
    } catch (error: any) {
        console.error("POST /api/harvest-receptions/[id]/accept error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi xác nhận tiếp nhận phiếu." },
            { status: 500 },
        );
    }
}
