"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, FilePenLine, Loader2, Newspaper, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type Article = {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    sourceName: string;
    originalUrl: string;
    sourcePublishedAt: string | null;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: string | null;
    updatedAt: string;
};

type EditState = Pick<Article, "title" | "sourceName" | "originalUrl" | "status"> & {
    description: string;
    imageUrl: string;
    sourcePublishedAt: string;
};

function toEditState(article: Article): EditState {
    return {
        title: article.title,
        description: article.description ?? "",
        imageUrl: article.imageUrl ?? "",
        sourceName: article.sourceName,
        originalUrl: article.originalUrl,
        sourcePublishedAt: article.sourcePublishedAt?.slice(0, 10) ?? "",
        status: article.status,
    };
}

export function NewsManager() {
    const { toast } = useToast();
    const [articles, setArticles] = useState<Article[]>([]);
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selected, setSelected] = useState<Article | null>(null);
    const [edit, setEdit] = useState<EditState | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/news", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setArticles(payload.data);
        } catch (error) {
            toast({ title: "Không thể tải tin tức", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { void load(); }, [load]);

    async function importUrl(event: FormEvent) {
        event.preventDefault();
        setImporting(true);
        try {
            const response = await fetch("/api/admin/news", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setUrl("");
            setSelected(payload.data);
            setEdit(toEditState(payload.data));
            toast({ title: "Đã tạo bản nháp", description: "Hãy kiểm tra, chỉnh sửa rồi xuất bản khi sẵn sàng.", variant: "success" });
            await load();
        } catch (error) {
            toast({ title: "Không thể nhập bài viết", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
        } finally {
            setImporting(false);
        }
    }

    function openEditor(article: Article) {
        setSelected(article);
        setEdit(toEditState(article));
    }

    async function save(status: "DRAFT" | "PUBLISHED") {
        if (!selected || !edit) return;
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/news/${selected.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...edit, status }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: status === "PUBLISHED" ? "Đã xuất bản" : "Đã lưu bản nháp", variant: "success" });
            setSelected(null);
            setEdit(null);
            await load();
        } catch (error) {
            toast({ title: "Không thể lưu bài viết", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    }

    async function remove(article: Article) {
        if (!window.confirm(`Bạn có chắc muốn xóa bài viết “${article.title}”?`)) return;
        setDeletingId(article.id);
        try {
            const response = await fetch(`/api/admin/news/${article.id}`, { method: "DELETE" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            if (selected?.id === article.id) { setSelected(null); setEdit(null); }
            toast({ title: payload.message, variant: "success" });
            await load();
        } catch (error) {
            toast({ title: "Không thể xóa bài viết", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 sm:px-6">
            <header>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600">Admin · Nội dung</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Quản lý tin tức</h1>
                <p className="mt-2 text-sm text-slate-500">Nhập bài viết từ nguồn bên ngoài, kiểm tra bản nháp và chủ động xuất bản.</p>
            </header>

            {loading ? (
                <div className="py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" /></div>
            ) : articles.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-200 py-14 text-center text-slate-500">Chưa có bài viết nào. Hãy dán link để tạo bản nháp đầu tiên.</div>
            ) : (
                <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {articles.map((article) => (
                        <article key={article.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <NewsImage src={article.imageUrl} title={article.title} />
                            <div className="flex flex-1 flex-col p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">{article.sourceName}</p>
                                    <Badge className={article.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                                        {article.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
                                    </Badge>
                                </div>
                                <h2 className="mt-3 line-clamp-2 font-bold text-slate-900">{article.title}</h2>
                                {article.sourcePublishedAt && <p className="mt-1 text-xs text-slate-400">Ngày đăng: {new Date(article.sourcePublishedAt).toLocaleDateString("vi-VN")}</p>}
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{article.description || "Chưa có mô tả."}</p>
                                <div className="mt-auto flex gap-2 pt-3">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => openEditor(article)}><FilePenLine className="mr-2 h-4 w-4" />Xem và sửa</Button>
                                    <Button type="button" variant="outline" title="Xóa bài viết" aria-label="Xóa bài viết" disabled={deletingId === article.id} className="px-3 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void remove(article)}>
                                        {deletingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}

            <Card className="rounded-[28px] border-amber-100">
                <CardContent className="p-5">
                    <div className="mb-3">
                        <h2 className="font-bold text-slate-900">Đăng tải tin tức từ đường link</h2>
                        <p className="text-sm text-slate-500">Dán link bài báo phía dưới để hệ thống lấy tiêu đề, mô tả, ảnh và nguồn.</p>
                    </div>
                    <form onSubmit={importUrl} className="flex flex-col gap-3 md:flex-row">
                        <Input value={url} onChange={(event) => setUrl(event.target.value)} type="url" required placeholder="Dán link bài báo hoặc website..." className="h-11 flex-1" />
                        <Button disabled={importing || !url.trim()} type="submit" className="h-11">
                            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Newspaper className="mr-2 h-4 w-4" />}
                            Lấy metadata
                        </Button>
                    </form>
                    <p className="mt-2 text-xs text-slate-500">Bài viết luôn được tạo ở trạng thái bản nháp, không tự động xuất bản.</p>
                </CardContent>
            </Card>

            {selected && edit && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelected(null); }}>
                    <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
                        <div className="flex items-center justify-between">
                            <div><h2 className="text-xl font-black">Xem trước và chỉnh sửa</h2><p className="text-sm text-slate-500">Kiểm tra nội dung trước khi xuất bản công khai.</p></div>
                            <button type="button" onClick={() => setSelected(null)} disabled={saving} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="mt-5 grid gap-6 lg:grid-cols-2">
                            <div className="space-y-4">
                                <Field label="Tiêu đề"><Input value={edit.title} onChange={(event) => setEdit({ ...edit, title: event.target.value })} /></Field>
                                <Field label="Mô tả"><Textarea rows={5} value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} /></Field>
                                <Field label="Ảnh đại diện"><Input type="url" value={edit.imageUrl} onChange={(event) => setEdit({ ...edit, imageUrl: event.target.value })} /></Field>
                                <Field label="Tên nguồn"><Input value={edit.sourceName} onChange={(event) => setEdit({ ...edit, sourceName: event.target.value })} /></Field>
                                <Field label="Ngày đăng của nguồn"><VietnameseDatePicker value={edit.sourcePublishedAt} onChange={(value) => setEdit({ ...edit, sourcePublishedAt: value })} /></Field>
                                <Field label="Link bài gốc"><Input type="url" value={edit.originalUrl} onChange={(event) => setEdit({ ...edit, originalUrl: event.target.value })} /></Field>
                            </div>
                            <div>
                                <p className="mb-2 text-sm font-semibold text-slate-700">Bản xem trước công khai</p>
                                <article className="flex h-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <NewsImage src={edit.imageUrl} title={edit.title} />
                                    <div className="flex flex-1 flex-col p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">{edit.sourceName || "TÊN NGUỒN"}</p>
                                        {edit.sourcePublishedAt && <p className="mt-1 text-xs text-slate-400">{new Date(`${edit.sourcePublishedAt}T00:00:00`).toLocaleDateString("vi-VN")}</p>}
                                        <h3 className="mt-3 line-clamp-2 font-bold text-slate-900">{edit.title || "Tiêu đề bài viết"}</h3>
                                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{edit.description || "Mô tả bài viết"}</p>
                                        <span className="mt-auto inline-flex items-center font-semibold text-emerald-700">Đọc bài viết<ExternalLink className="ml-2 h-4 w-4" /></span>
                                    </div>
                                </article>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" disabled={saving} onClick={() => void save("DRAFT")}>Lưu bản nháp</Button>
                            <Button type="button" disabled={saving} onClick={() => void save("PUBLISHED")}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xuất bản
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function NewsImage({ src, title }: { src: string | null; title: string }) {
    return <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-slate-100">
        {src ? <Image src={src} alt={title} fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" /> : <div className="flex h-full items-center justify-center text-slate-300"><Newspaper className="h-10 w-10" /></div>}
    </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block space-y-2"><Label>{label}</Label>{children}</label>;
}
