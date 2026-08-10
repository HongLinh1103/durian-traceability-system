import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markContentAsRead } from "@/lib/content-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
    const slug = decodeURIComponent(params.slug);
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";
    const document = await prisma.document.findFirst({
        where: { slug, ...(isAdmin ? {} : { status: "PUBLISHED", deletedAt: null }) },
        select: { id: true, fileName: true, storageKey: true, mimeType: true },
    });

    if (!document) {
        return NextResponse.json({ success: false, message: "Không tìm thấy tài liệu." }, { status: 404 });
    }

    if (session?.user?.id && ["FARMER", "AREA_MANAGER"].includes(session.user.role)) {
        await markContentAsRead(session.user.id, "document", document.id);
    }

    try {
        const file = await readFile(path.join(process.cwd(), ".storage", "documents", path.basename(document.storageKey)));
        const safeFileName = document.fileName.replace(/["\r\n]/gu, "_");
        return new NextResponse(file, {
            headers: {
                "Content-Type": document.mimeType,
                "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch {
        return NextResponse.json({ success: false, message: "Tệp tài liệu không còn tồn tại." }, { status: 404 });
    }
}
