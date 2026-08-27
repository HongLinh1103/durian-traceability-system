import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { rm } from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPublishedContent } from "@/lib/content-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Chỉ ADMIN được thay đổi tài liệu." }, { status: 403 });
    }

    const body = (await request.json()) as { action?: string };
    if (!["delete", "restore", "publish", "unpublish"].includes(body.action ?? "")) {
        return NextResponse.json({ success: false, message: "Thao tác không hợp lệ." }, { status: 400 });
    }

    const current = await prisma.document.findUnique({ where: { id: params.id }, select: { status: true } });
    if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy tài liệu." }, { status: 404 });

    const data =
        body.action === "delete"
            ? { deletedAt: new Date() }
            : body.action === "restore"
              ? { deletedAt: null }
              : body.action === "publish"
                ? { status: "PUBLISHED" as const, publishedAt: new Date() }
                : { status: "DRAFT" as const, publishedAt: null };

    const document = await prisma.document.update({ where: { id: params.id }, data });
    if (body.action === "publish" && current.status !== "PUBLISHED") {
        await notifyPublishedContent("document", document);
    }
    return NextResponse.json({ success: true, data: document });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Chỉ ADMIN được xóa vĩnh viễn tài liệu." }, { status: 403 });
    }

    const document = await prisma.document.findUnique({
        where: { id: params.id },
        select: { id: true, storageKey: true, deletedAt: true },
    });
    if (!document) {
        return NextResponse.json({ success: false, message: "Không tìm thấy tài liệu." }, { status: 404 });
    }
    if (!document.deletedAt) {
        return NextResponse.json({
            success: false,
            message: "Hãy chuyển tài liệu sang trạng thái Đã xóa trước khi xóa vĩnh viễn.",
        }, { status: 409 });
    }

    await prisma.$transaction([
        prisma.notification.deleteMany({ where: { type: `NEW_DOCUMENT:${document.id}` } }),
        prisma.document.delete({ where: { id: document.id } }),
    ]);

    // Uploaded files always use a generated basename. basename also prevents a
    // malformed legacy storage key from escaping the documents directory.
    const storedFile = path.join(process.cwd(), ".storage", "documents", path.basename(document.storageKey));
    await rm(storedFile, { force: true }).catch((error) => {
        console.error("Could not remove document file after database deletion", error);
    });

    return NextResponse.json({ success: true, message: "Đã xóa vĩnh viễn tài liệu." });
}
