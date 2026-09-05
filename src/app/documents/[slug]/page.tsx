import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Eye, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markContentAsRead } from "@/lib/content-notifications";
import { formatVietnameseDate } from "@/lib/date-format";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentDetailPage({ params }: { params: { slug: string } }) {
    const [session, document] = await Promise.all([getServerSession(authOptions), prisma.document.findFirst({
        where: { slug: decodeURIComponent(params.slug), status: "PUBLISHED", deletedAt: null },
        select: {
            id: true,
            title: true,
            category: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            fileSize: true,
            publishedAt: true,
        },
    })]);

    if (!document) notFound();
    if (session?.user?.id && ["FARMER", "AREA_MANAGER"].includes(session.user.role)) {
        await markContentAsRead(session.user.id, "document", document.id);
    }

    return (
        <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6">
            <Link href="/documents" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
                <ArrowLeft className="h-4 w-4" />
                Quay lại thư viện
            </Link>
            <article className="mt-6 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-soft">
                <div className="bg-gradient-to-br from-emerald-900 to-emerald-600 p-8 text-white">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{document.category}</span>
                    <h1 className="mt-4 text-3xl font-black">{document.title}</h1>
                </div>
                <div className="space-y-6 p-6 sm:p-8">
                    <div className="flex items-start gap-4 rounded-3xl bg-slate-50 p-5">
                        <FileText className="h-8 w-8 shrink-0 text-brand-600" />
                        <div className="min-w-0">
                            <p className="break-all font-semibold text-slate-900">{document.fileName}</p>
                            <p className="mt-1 text-sm text-slate-500">
                                {formatBytes(document.fileSize)}
                                {document.publishedAt ? ` · Xuất bản ${formatVietnameseDate(document.publishedAt)}` : ""}
                            </p>
                        </div>
                    </div>
                    {document.mimeType === "application/pdf" || document.mimeType.startsWith("text/") ? (
                        <section aria-labelledby="document-preview-title">
                            <h2 id="document-preview-title" className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
                                <Eye className="h-5 w-5 text-brand-600" />
                                Xem tài liệu trực tuyến
                            </h2>
                            <iframe
                                src={`/api/documents/${encodeURIComponent(params.slug)}/view`}
                                title={`Nội dung tài liệu ${document.title}`}
                                className="h-[70vh] min-h-[520px] w-full rounded-2xl border border-slate-200 bg-white"
                            />
                        </section>
                    ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                            Trình duyệt không hỗ trợ xem trực tiếp định dạng tệp này. Bạn có thể tải tài liệu về để mở bằng ứng dụng phù hợp.
                        </div>
                    )}
                    <a
                        href={document.fileUrl}
                        download={document.fileName}
                        className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
                    >
                        <Download className="mr-2 h-5 w-5" />
                        Tải tài liệu
                    </a>
                </div>
            </article>
        </main>
    );
}
