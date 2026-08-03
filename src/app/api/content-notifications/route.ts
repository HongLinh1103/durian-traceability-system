import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markContentAsRead, NEW_DOCUMENT_TYPE, NEW_NEWS_TYPE } from "@/lib/content-notifications";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["FARMER", "AREA_MANAGER"].includes(session.user.role)) {
        return NextResponse.json({ success: true, data: { documents: 0, news: 0 } });
    }

    const [documents, news] = await Promise.all([
        prisma.notification.count({ where: { userId: session.user.id, isRead: false, type: { startsWith: NEW_DOCUMENT_TYPE } } }),
        prisma.notification.count({ where: { userId: session.user.id, isRead: false, type: { startsWith: NEW_NEWS_TYPE } } }),
    ]);

    return NextResponse.json({ success: true, data: { documents, news } });
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["FARMER", "AREA_MANAGER"].includes(session.user.role)) {
        return NextResponse.json({ success: false, message: "Không có quyền cập nhật thông báo." }, { status: 403 });
    }

    const body = (await request.json()) as { kind?: string; contentId?: string };
    if (!body.contentId || !["document", "news"].includes(body.kind ?? "")) {
        return NextResponse.json({ success: false, message: "Nội dung không hợp lệ." }, { status: 400 });
    }

    await markContentAsRead(session.user.id, body.kind as "document" | "news", body.contentId);
    return NextResponse.json({ success: true });
}
