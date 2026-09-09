import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
    request: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Bạn không có quyền yêu cầu bổ sung hồ sơ." }, { status: 403 });
    }

    try {
        const body = await request.json();
        const reason = String(body?.reason || "").trim();

        if (!reason) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập nội dung hoặc giấy tờ cần bổ sung." },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: params.id, deletedAt: null },
            include: {
                partnerFacility: { select: { id: true } },
                stores: { where: { deletedAt: null }, select: { id: true } },
                areaManagerApplication: { select: { id: true } },
            },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy người dùng." }, { status: 404 });
        }

        const fromStatus = user.accountStatus;

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: params.id },
                data: {
                    accountStatus: AccountStatus.NEEDS_SUPPLEMENT,
                },
            });

            if (user.partnerFacility) {
                await tx.partnerFacility.update({
                    where: { id: user.partnerFacility.id },
                    data: { status: "NEED_SUPPLEMENT", reviewReason: reason },
                });
            }

            if (user.stores.length > 0) {
                await tx.store.updateMany({
                    where: { ownerId: params.id, deletedAt: null },
                    data: { status: "NEED_SUPPLEMENT" },
                });
            }

            if (user.areaManagerApplication) {
                await tx.areaManagerApplication.update({
                    where: { id: user.areaManagerApplication.id },
                    data: { status: AccountStatus.NEEDS_SUPPLEMENT, reviewReason: reason, reviewedAt: new Date() },
                });
            }

            await tx.approvalHistory.create({
                data: {
                    subjectId: params.id,
                    actorId: session.user.id,
                    action: "REQUEST_SUPPLEMENT",
                    fromStatus,
                    toStatus: AccountStatus.NEEDS_SUPPLEMENT,
                    reason,
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: `Đã gửi yêu cầu bổ sung hồ sơ cho tài khoản "${user.fullName || user.phone}".`,
        });
    } catch (error: any) {
        console.error("POST /api/admin/users/[id]/request-supplement error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi yêu cầu bổ sung hồ sơ." },
            { status: 500 },
        );
    }
}
