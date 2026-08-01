import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchNewsMetadata } from "@/lib/news-metadata";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "ADMIN";
}

export async function GET() {
    if (!(await ensureAdmin())) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const articles = await prisma.newsArticle.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ success: true, data: articles });
}

export async function POST(request: Request) {
    if (!(await ensureAdmin())) return NextResponse.json({ success: false, message: "Không có quyền nhập tin tức." }, { status: 403 });
    try {
        const body = (await request.json()) as { url?: string };
        const url = body.url?.trim();
        if (!url) return NextResponse.json({ success: false, message: "Vui lòng nhập đường dẫn bài viết." }, { status: 400 });
        const metadata = await fetchNewsMetadata(url);
        const duplicate = await prisma.newsArticle.findUnique({ where: { originalUrl: metadata.originalUrl } });
        if (duplicate) {
            return NextResponse.json({ success: false, message: "Bài viết này đã được nhập vào hệ thống.", data: duplicate }, { status: 409 });
        }
        const article = await prisma.newsArticle.create({
            data: {
                ...metadata,
                sourcePublishedAt: metadata.sourcePublishedAt ? new Date(metadata.sourcePublishedAt) : null,
                status: "DRAFT",
                publishedAt: null,
            },
        });
        return NextResponse.json({
            success: true,
            message: "Đã lấy metadata và tạo bản nháp. Bài viết chưa được xuất bản.",
            data: article,
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Không thể lấy metadata bài viết.",
        }, { status: 400 });
    }
}
