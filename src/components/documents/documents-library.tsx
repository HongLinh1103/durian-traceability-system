"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArchiveRestore, Download, FilePlus2, FileText, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type DocumentItem = {
    id: string;
    title: string;
    slug: string;
    summary?: string | null;
    category: string;
    status?: "DRAFT" | "PUBLISHED";
    fileName: string;
    fileUrl: string;
    fileSize: number;
    publishedAt?: string | null;
    deletedAt?: string | null;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsLibrary() {
    const { data: session, status } = useSession();
    const { toast } = useToast();
    const isAdmin = status === "authenticated" && session?.user?.role === "ADMIN";
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = isAdmin ? "/api/admin/documents" : "/api/documents";
            const response = await fetch(endpoint, { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setDocuments(payload.data);
            if (!isAdmin) setCategories(payload.categories ?? []);
        } catch (error) {
            toast({
                title: "Không thể tải tài liệu",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [isAdmin, toast]);

    useEffect(() => {
        if (status !== "loading") void loadDocuments();
    }, [loadDocuments, status]);

    const availableCategories = useMemo(() => {
        if (categories.length) return categories;
        return [...new Set(documents.map((item) => item.category))].sort();
    }, [categories, documents]);

    const filteredDocuments = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("vi");
        return documents.filter((item) => {
            const matchesSearch = !term || `${item.title} ${item.summary ?? ""}`.toLocaleLowerCase("vi").includes(term);
            return matchesSearch && (!category || item.category === category);
        });
    }, [category, documents, search]);

    const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        try {
            const form = event.currentTarget;
            const response = await fetch("/api/admin/documents", { method: "POST", body: new FormData(form) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            form.reset();
            setShowUpload(false);
            toast({ title: "Đã thêm tài liệu", description: "Tài liệu đã được lưu thành công.", variant: "success" });
            await loadDocuments();
        } catch (error) {
            toast({
                title: "Không thể thêm tài liệu",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const updateDocument = async (id: string, action: "delete" | "restore" | "publish" | "unpublish") => {
        setProcessingId(id);
        try {
            const response = await fetch(`/api/admin/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: "Đã cập nhật tài liệu", variant: "success" });
            await loadDocuments();
        } catch (error) {
            toast({
                title: "Cập nhật thất bại",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Thư viện</p>
                    <h1 className="mt-2 text-4xl font-black text-slate-900">Tài liệu</h1>
                    <p className="mt-2 max-w-2xl text-slate-500">Tìm kiếm, mở và tải các tài liệu hướng dẫn, quy trình và tuân thủ.</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowUpload(true)}>
                        <FilePlus2 className="mr-2 h-5 w-5" />
                        Thêm tài liệu
                    </Button>
                )}
            </div>

            <div className="mt-8 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_240px]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tiêu đề hoặc mô tả..." className="pl-10" />
                </div>
                <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700"
                >
                    <option value="">Tất cả danh mục</option>
                    {availableCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
            ) : filteredDocuments.length === 0 ? (
                <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white p-8 text-center">
                    <FileText className="h-14 w-14 text-slate-300" />
                    <h2 className="mt-4 text-xl font-bold text-slate-900">Chưa có tài liệu nào</h2>
                    <p className="mt-2 text-sm text-slate-500">Tài liệu được upload sẽ hiển thị tại đây.</p>
                    {isAdmin && (
                        <Button className="mt-5" onClick={() => setShowUpload(true)}>
                            <FilePlus2 className="mr-2 h-5 w-5" />
                            Thêm tài liệu
                        </Button>
                    )}
                </div>
            ) : (
                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {filteredDocuments.map((item) => (
                        <article key={item.id} className={`flex flex-col rounded-[28px] border bg-white p-5 shadow-sm ${item.deletedAt ? "border-red-200 opacity-70" : "border-slate-200"}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="rounded-2xl bg-brand-50 p-3 text-brand-700"><FileText className="h-6 w-6" /></div>
                                <div className="flex flex-wrap justify-end gap-2 text-[10px] font-bold uppercase">
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{item.category}</span>
                                    {isAdmin && <span className={`rounded-full px-2 py-1 ${item.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{item.status}</span>}
                                    {item.deletedAt && <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">Đã xóa</span>}
                                </div>
                            </div>
                            <h2 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h2>
                            <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">{item.summary || "Không có mô tả."}</p>
                            <p className="mt-4 text-xs text-slate-400">{item.fileName} · {formatBytes(item.fileSize)}</p>
                            <div className="mt-5 grid grid-cols-2 gap-2">
                                {!item.deletedAt && item.status !== "DRAFT" && (
                                    <Link href={`/documents/${item.slug}`} className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">Mở</Link>
                                )}
                                {!item.deletedAt && (
                                    <a href={item.fileUrl} download={item.fileName} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                        <Download className="mr-1.5 h-4 w-4" />Tải
                                    </a>
                                )}
                            </div>
                            {isAdmin && (
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                    {item.deletedAt ? (
                                        <button disabled={processingId === item.id} onClick={() => void updateDocument(item.id, "restore")} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"><ArchiveRestore className="h-4 w-4" />Khôi phục</button>
                                    ) : (
                                        <>
                                            <button disabled={processingId === item.id} onClick={() => void updateDocument(item.id, item.status === "PUBLISHED" ? "unpublish" : "publish")} className="text-xs font-semibold text-amber-700">
                                                {item.status === "PUBLISHED" ? "Gỡ xuất bản" : "Xuất bản"}
                                            </button>
                                            <button disabled={processingId === item.id} onClick={() => void updateDocument(item.id, "delete")} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600"><Trash2 className="h-4 w-4" />Xóa</button>
                                        </>
                                    )}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {showUpload && isAdmin && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <form onSubmit={handleUpload} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Thêm tài liệu</h2>
                            <button type="button" onClick={() => setShowUpload(false)} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <div><Label htmlFor="document-title">Tiêu đề</Label><Input id="document-title" name="title" required maxLength={160} /></div>
                        <div><Label htmlFor="document-category">Danh mục</Label><Input id="document-category" name="category" required maxLength={80} placeholder="Ví dụ: Hướng dẫn GACC" /></div>
                        <div>
                            <Label htmlFor="document-summary">Mô tả</Label>
                            <textarea id="document-summary" name="summary" rows={4} maxLength={1000} className="w-full rounded-2xl border border-slate-200 p-3 text-sm" />
                        </div>
                        <div><Label htmlFor="document-file">Tệp (tối đa 20 MB)</Label><Input id="document-file" name="file" type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" /></div>
                        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-medium"><input type="checkbox" name="publish" value="true" defaultChecked /> Xuất bản ngay</label>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
                            Tải lên
                        </Button>
                    </form>
                </div>
            )}
        </section>
    );
}
