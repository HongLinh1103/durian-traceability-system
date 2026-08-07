"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Eye, Loader2, Search, Store as StoreIcon, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type StoreStatus = "DRAFT" | "PENDING_REVIEW" | "NEED_SUPPLEMENT" | "APPROVED" | "REJECTED" | "SUSPENDED";
type StoreRecord = {
    id: string;
    name: string;
    status: StoreStatus;
    address: string;
    representativeName: string;
    representativePhone: string;
    taxCode?: string | null;
    reviewReason?: string | null;
    createdAt: string;
    owner: { fullName: string | null; phone: string; email: string | null };
    documents: { id: string; type: string; name: string }[];
};

const statusMeta: Record<StoreStatus, { label: string; className: string }> = {
    DRAFT: { label: "Bản nháp", className: "bg-slate-100 text-slate-700" },
    PENDING_REVIEW: { label: "Chờ duyệt", className: "bg-amber-100 text-amber-800" },
    NEED_SUPPLEMENT: { label: "Cần bổ sung", className: "bg-orange-100 text-orange-800" },
    APPROVED: { label: "Đã duyệt", className: "bg-green-100 text-green-800" },
    REJECTED: { label: "Từ chối", className: "bg-red-100 text-red-800" },
    SUSPENDED: { label: "Tạm khóa", className: "bg-slate-200 text-slate-800" },
};

export function StoreReviewManager() {
    const { toast } = useToast();
    const [items, setItems] = useState<StoreRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<StoreStatus | "all">("PENDING_REVIEW");
    const [review, setReview] = useState<{ store: StoreRecord; action: StoreStatus } | null>(null);
    const [reason, setReason] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/stores", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload.message || "Không thể tải danh sách cửa hàng.");
            setItems(payload.data);
        } catch (error) {
            toast({ title: "Không thể tải cửa hàng", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { void load(); }, [load]);

    const filteredItems = useMemo(() => items.filter((store) => {
        const matchesStatus = status === "all" || store.status === status;
        const keyword = search.trim().toLocaleLowerCase("vi");
        const matchesSearch = !keyword || [store.name, store.representativeName, store.representativePhone, store.owner.email, store.taxCode]
            .some((value) => value?.toLocaleLowerCase("vi").includes(keyword));
        return matchesStatus && matchesSearch;
    }), [items, search, status]);

    async function update() {
        if (!review) return;
        if (review.action !== "APPROVED" && !reason.trim()) {
            toast({ title: "Vui lòng nhập lý do", variant: "destructive" });
            return;
        }
        setProcessingId(review.store.id);
        try {
            const response = await fetch(`/api/admin/stores/${review.store.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: review.action, reason: reason.trim() || undefined }),
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload.message || "Không thể cập nhật cửa hàng.");
            toast({ title: review.action === "APPROVED" ? "Phê duyệt thành công" : "Đã cập nhật hồ sơ cửa hàng", variant: "success" });
            setReview(null);
            setReason("");
            await load();
        } catch (error) {
            toast({ title: "Cập nhật thất bại", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    }

    async function openDocument(id: string) {
        try {
            const response = await fetch(`/api/admin/stores/documents/${id}/signed-url`, { method: "POST" });
            const payload = await response.json();
            if (!response.ok || !payload.url) throw new Error(payload.message || "Không thể mở tài liệu.");
            window.open(payload.url, "_blank", "noopener,noreferrer");
        } catch (error) {
            toast({ title: "Không thể mở tài liệu", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        }
    }

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên cửa hàng, người đại diện, SĐT..." className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
                {(["PENDING_REVIEW", "NEED_SUPPLEMENT", "APPROVED", "REJECTED", "all"] as const).map((value) => <Button key={value} size="sm" variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)}>{value === "all" ? "Tất cả" : statusMeta[value].label}</Button>)}
            </div>
        </div>

        {loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>
            : filteredItems.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center"><StoreIcon className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-4 font-semibold text-slate-700">Không có cửa hàng phù hợp</p></div>
                : <div className="space-y-3">{filteredItems.map((store) => <article key={store.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><h3 className="font-bold text-slate-900">{store.name}</h3><p className="mt-1 text-sm text-slate-500">Đăng ký ngày {new Date(store.createdAt).toLocaleDateString("vi-VN")}</p></div>
                        <Badge className={statusMeta[store.status].className}>{statusMeta[store.status].label}</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2"><p><span className="text-slate-500">Đại diện:</span> {store.representativeName}</p><p><span className="text-slate-500">Điện thoại:</span> {store.representativePhone}</p><p><span className="text-slate-500">Chủ tài khoản:</span> {store.owner.fullName || store.owner.phone}</p><p><span className="text-slate-500">Mã số thuế:</span> {store.taxCode || "Chưa cung cấp"}</p><p className="md:col-span-2"><span className="text-slate-500">Địa chỉ:</span> {store.address}</p></div>
                    {store.reviewReason && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><strong>Lý do xử lý:</strong> {store.reviewReason}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">{store.documents.map((document) => <Button key={document.id} size="sm" variant="outline" onClick={() => void openDocument(document.id)}><Eye className="mr-1.5 h-4 w-4" />{document.name}</Button>)}</div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <Button size="sm" disabled={processingId === store.id || store.status === "APPROVED"} onClick={() => setReview({ store, action: "APPROVED" })}><CheckCircle2 className="mr-1.5 h-4 w-4" />Duyệt</Button>
                        <Button size="sm" variant="outline" disabled={processingId === store.id} onClick={() => setReview({ store, action: "NEED_SUPPLEMENT" })}><Clock className="mr-1.5 h-4 w-4" />Yêu cầu bổ sung</Button>
                        <Button size="sm" variant="destructive" disabled={processingId === store.id || store.status === "REJECTED"} onClick={() => setReview({ store, action: "REJECTED" })}><XCircle className="mr-1.5 h-4 w-4" />Từ chối</Button>
                    </div>
                </article>)}</div>}

        {review && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setReview(null); }}>
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-slate-900">{review.action === "APPROVED" ? "Phê duyệt cửa hàng" : review.action === "REJECTED" ? "Từ chối cửa hàng" : "Yêu cầu bổ sung hồ sơ"}</h3>
                <p className="mt-2 text-sm text-slate-600">Cửa hàng: <strong>{review.store.name}</strong></p>
                {review.action !== "APPROVED" && <div className="mt-4 space-y-2"><Label htmlFor="store-review-reason">Lý do</Label><textarea id="store-review-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500" placeholder="Nhập nội dung cần bổ sung hoặc lý do từ chối..." /></div>}
                <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => { setReview(null); setReason(""); }}>Hủy</Button><Button variant={review.action === "REJECTED" ? "destructive" : "default"} disabled={processingId === review.store.id} onClick={() => void update()}>{processingId === review.store.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xác nhận</Button></div>
            </div>
        </div>}
    </div>;
}
