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
        return NextResponse.json({ success: false, message: "Bạn không có quyền phê duyệt tài khoản." }, { status: 403 });
    }

    try {
        let note = "Phê duyệt kích hoạt tài khoản";
        try {
            const body = await request.json();
            if (body?.note) note = String(body.note).trim();
        } catch {
            // No body passed
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
        const now = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: params.id },
                data: {
                    accountStatus: AccountStatus.APPROVED,
                    isApproved: true,
                    isLocked: false,
                    approvedAt: now,
                },
            });

            if (user.partnerFacility) {
                await tx.partnerFacility.update({
                    where: { id: user.partnerFacility.id },
                    data: { status: "APPROVED", approvedAt: now },
                });
            }

            if (user.stores.length > 0) {
                await tx.store.updateMany({
                    where: { ownerId: params.id, deletedAt: null },
                    data: { status: "APPROVED" },
                });
            }

            if (user.areaManagerApplication) {
                await tx.areaManagerApplication.update({
                    where: { id: user.areaManagerApplication.id },
                    data: { status: AccountStatus.APPROVED, reviewedAt: now },
                });
            }

            await tx.approvalHistory.create({
                data: {
                    subjectId: params.id,
                    actorId: session.user.id,
                    action: "APPROVE",
                    fromStatus,
                    toStatus: AccountStatus.APPROVED,
                    reason: note,
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: `Đã phê duyệt tài khoản "${user.fullName || user.phone}".`,
        });
    } catch (error: any) {
        console.error("POST /api/admin/users/[id]/approve error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi phê duyệt tài khoản." },
            { status: 500 },
        );
    }
}
