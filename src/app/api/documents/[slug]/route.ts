import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
    const document = await prisma.document.findFirst({
        where: {
            slug: decodeURIComponent(params.slug),
            status: "PUBLISHED",
            deletedAt: null,
        },
        select: {
            title: true,
            slug: true,
            summary: true,
            category: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            fileSize: true,
            publishedAt: true,
        },
    });

    if (!document) {
        return NextResponse.json({ success: false, message: "Không tìm thấy tài liệu." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: document });
}
