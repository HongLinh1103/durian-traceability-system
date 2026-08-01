"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function DeleteNewsButton({ articleId, title }: { articleId: string; title: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [deleting, setDeleting] = useState(false);

    async function remove() {
        if (!window.confirm(`Bạn có chắc muốn xóa bài viết “${title}”?`)) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/admin/news/${articleId}`, { method: "DELETE" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: payload.message, variant: "success" });
            router.refresh();
        } catch (error) {
            toast({ title: "Không thể xóa bài viết", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="border-t border-slate-100 p-3">
            <button type="button" disabled={deleting} onClick={() => void remove()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? "Đang xóa..." : "Xóa bài viết"}
            </button>
        </div>
    );
}
