import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DeleteNewsButton } from "@/components/news/delete-news-button";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
    const [session, databaseArticles] = await Promise.all([
        getServerSession(authOptions),
        prisma.newsArticle.findMany({
            where: { status: "PUBLISHED" },
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        }),
    ]);
    const isAdmin = session?.user?.role === "ADMIN";
    const newsArticles = databaseArticles.map((article) => ({
            id: `database-${article.id}`,
            databaseId: article.id,
            title: article.title,
            description: article.description,
            imageUrl: article.imageUrl,
            sourceName: article.sourceName,
            originalUrl: article.originalUrl,
            sourcePublishedDate: article.sourcePublishedAt?.toLocaleDateString("vi-VN") ?? null,
        }));

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col items-center gap-4 text-center">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                        Tin tức sầu riêng
                    </h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                        Tổng hợp các bài viết chuyên sâu về quy định, kỹ thuật canh tác, tiêu chuẩn an toàn và truy xuất nguồn gốc.
                    </p>
                </div>
                {isAdmin && (
                    <Button asChild>
                        <Link href="/dashboard/admin/news">
                            <Newspaper className="mr-2 h-4 w-4" />
                            Thêm tin tức
                        </Link>
                    </Button>
                )}
            </div>

            {newsArticles.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-200 py-14 text-center">
                    <Newspaper className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-semibold text-slate-600">Chưa có bài viết nào được xuất bản.</p>
                </div>
            ) : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {newsArticles.map((article) => (
                    <article
                        key={article.id}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                        <a href={article.originalUrl} target="_blank" rel="noopener noreferrer" className="flex flex-1 flex-col">
                            <div className="relative aspect-video shrink-0 overflow-hidden bg-slate-100">
                                {article.imageUrl ? <Image
                                    src={article.imageUrl}
                                    alt={article.title}
                                    fill unoptimized
                                    className="object-cover transition duration-300 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 25vw"
                                /> : <div className="flex h-full items-center justify-center text-slate-300"><Newspaper className="h-10 w-10" /></div>}
                            </div>
                            <div className="flex flex-1 flex-col p-4">
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">{article.sourceName}</p>
                                {article.sourcePublishedDate && <p className="mt-1 text-xs text-slate-400">Ngày đăng: {article.sourcePublishedDate}</p>}
                                <h2 className="mt-3 line-clamp-2 text-sm font-bold tracking-tight text-slate-900">{article.title}</h2>
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{article.description || "Xem nội dung chi tiết tại nguồn bài viết."}</p>
                                <span className="mt-auto inline-flex items-center pt-4 text-sm font-semibold text-emerald-700 group-hover:text-emerald-800">Đọc bài viết <ExternalLink className="ml-2 h-4 w-4" /></span>
                            </div>
                        </a>
                        {isAdmin && article.databaseId && <DeleteNewsButton articleId={article.databaseId} title={article.title} />}
                    </article>
                ))}
            </div>}
        </main>
    );
}
