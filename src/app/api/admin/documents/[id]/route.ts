import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Chỉ ADMIN được thay đổi tài liệu." }, { status: 403 });
    }

    const body = (await request.json()) as { action?: string };
    if (!["delete", "restore", "publish", "unpublish"].includes(body.action ?? "")) {
        return NextResponse.json({ success: false, message: "Thao tác không hợp lệ." }, { status: 400 });
    }

    const data =
        body.action === "delete"
            ? { deletedAt: new Date() }
            : body.action === "restore"
              ? { deletedAt: null }
              : body.action === "publish"
                ? { status: "PUBLISHED" as const, publishedAt: new Date() }
                : { status: "DRAFT" as const, publishedAt: null };

    const document = await prisma.document.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: document });
}
