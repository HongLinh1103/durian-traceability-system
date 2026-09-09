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
        return NextResponse.json({ success: false, message: "Bạn không có quyền từ chối tài khoản." }, { status: 403 });
    }

    try {
        let reason = "Hồ sơ không đáp ứng điều kiện phê duyệt";
        try {
            const body = await request.json();
            if (body?.reason) reason = String(body.reason).trim();
        } catch {
            // Default reason
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
                    accountStatus: AccountStatus.REJECTED,
                    isApproved: false,
                },
            });

            if (user.partnerFacility) {
                await tx.partnerFacility.update({
                    where: { id: user.partnerFacility.id },
                    data: { status: "REJECTED", reviewReason: reason },
                });
            }

            if (user.stores.length > 0) {
                await tx.store.updateMany({
                    where: { ownerId: params.id, deletedAt: null },
                    data: { status: "REJECTED" },
                });
            }

            if (user.areaManagerApplication) {
                await tx.areaManagerApplication.update({
                    where: { id: user.areaManagerApplication.id },
                    data: { status: AccountStatus.REJECTED, reviewReason: reason, reviewedAt: new Date() },
                });
            }

            await tx.approvalHistory.create({
                data: {
                    subjectId: params.id,
                    actorId: session.user.id,
                    action: "REJECT",
                    fromStatus,
                    toStatus: AccountStatus.REJECTED,
                    reason,
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: `Đã từ chối tài khoản "${user.fullName || user.phone}".`,
        });
    } catch (error: any) {
        console.error("POST /api/admin/users/[id]/reject error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi từ chối tài khoản." },
            { status: 500 },
        );
    }
}
