import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPublishedContent } from "@/lib/content-notifications";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
    title: z.string().trim().min(1, "Tiêu đề không được để trống.").max(300),
    description: z.string().trim().max(1000),
    imageUrl: z.string().trim().refine((value) => !value || /^https?:\/\//i.test(value), "Ảnh phải là URL HTTP/HTTPS."),
    sourceName: z.string().trim().min(1, "Tên nguồn không được để trống.").max(120),
    originalUrl: z.string().url("Link gốc không hợp lệ.").refine((value) => /^https?:\/\//i.test(value), "Link gốc phải dùng HTTP/HTTPS."),
    sourcePublishedAt: z.string().trim().refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "Ngày đăng không hợp lệ."),
    status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ success: false, message: "Không có quyền cập nhật." }, { status: 403 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
    }
    try {
        const current = await prisma.newsArticle.findUnique({ where: { id: params.id }, select: { status: true, publishedAt: true } });
        if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy bài viết." }, { status: 404 });
        const article = await prisma.newsArticle.update({
            where: { id: params.id },
            data: {
                ...parsed.data,
                sourcePublishedAt: parsed.data.sourcePublishedAt ? new Date(parsed.data.sourcePublishedAt) : null,
                publishedAt: parsed.data.status === "PUBLISHED"
                    ? current.publishedAt ?? new Date()
                    : null,
            },
        });
        if (current.status !== "PUBLISHED" && article.status === "PUBLISHED") {
            await notifyPublishedContent("news", article);
        }
        return NextResponse.json({ success: true, message: parsed.data.status === "PUBLISHED" ? "Đã xuất bản bài viết." : "Đã lưu bản nháp.", data: article });
    } catch (error) {
        const message = error instanceof Error && error.message.includes("Unique constraint")
            ? "Link gốc đã tồn tại trong hệ thống."
            : "Không thể cập nhật bài viết.";
        return NextResponse.json({ success: false, message }, { status: 400 });
    }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Không có quyền xóa bài viết." }, { status: 403 });
    }
    try {
        const current = await prisma.newsArticle.findUnique({ where: { id: params.id }, select: { id: true } });
        if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy bài viết." }, { status: 404 });
        await prisma.newsArticle.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true, message: "Đã xóa bài viết." });
    } catch (error) {
        console.error("DELETE news article error:", error);
        return NextResponse.json({ success: false, message: "Không thể xóa bài viết." }, { status: 500 });
    }
}
