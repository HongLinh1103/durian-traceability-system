"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, EyeOff, ImageIcon, Package, Pencil, Store, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/components/ui/toast";

type Product = {
    id: string;
    name: string;
    type: "FERTILIZER" | "PESTICIDE";
    manufacturer?: string | null;
    origin?: string | null;
    usageInstructions?: string | null;
    packaging?: string | null;
    price: string;
    salePrice?: string | null;
    stock: number;
    unit: string;
    status: string;
    imageUrls: string[];
    usagePurpose?: string | null;
    composition?: string | null;
    phiDays?: number | null;
    safetyWarnings?: string | null;
};

export function StoreProductsManager() {
    const { toast } = useToast();
    const [items, setItems] = useState<Product[]>([]);
    const [editing, setEditing] = useState<Product | null>(null);
    const [busyId, setBusyId] = useState("");

    const load = useCallback(async () => {
        const response = await fetch("/api/store/products", { cache: "no-store" });
        const payload = await response.json();
        setItems(payload.data || []);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const imageUrl = String(data.get("imageUrl") || "").trim();
        const body = {
            type: data.get("type"),
            name: data.get("name"),
            price: Number(data.get("price")),
            unit: data.get("unit"),
            packaging: data.get("packaging"),
            manufacturer: data.get("manufacturer"),
            origin: data.get("origin"),
            usagePurpose: data.get("usagePurpose"),
            imageUrls: imageUrl ? [imageUrl] : [],
        };
        const response = await fetch("/api/store/products", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (!response.ok) {
            toast({ title: "Không thể thêm sản phẩm", description: payload.message || "Vui lòng kiểm tra lại thông tin.", variant: "destructive" });
            return;
        }
        form.reset();
        toast({ title: "Đã thêm sản phẩm", description: "Sản phẩm đã được thêm vào danh sách cửa hàng.", variant: "success" });
        await load();
    }

    async function changeSaleStatus(product: Product, status: "APPROVED" | "HIDDEN") {
        setBusyId(product.id);
        try {
            const response = await fetch(`/api/store/products/${product.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
            const payload = await response.json(); if (!response.ok) throw new Error(payload.message);
            toast({ title: status === "APPROVED" ? "Đã mở bán sản phẩm" : "Đã tạm ẩn sản phẩm", description: status === "APPROVED" ? "Sản phẩm đã hiển thị cho nông dân." : "Sản phẩm đã được gỡ khỏi gian hàng nhưng vẫn còn trong danh mục.", variant: "success" }); await load();
        } catch (error) { toast({ title: "Không thể đổi trạng thái", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" }); }
        finally { setBusyId(""); }
    }

    async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editing) return;
        const data = new FormData(event.currentTarget);
        const imageUrl = String(data.get("imageUrl") || "").trim();
        const response = await fetch(`/api/store/products/${editing.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                type: data.get("type"),
                name: data.get("name"),
                manufacturer: data.get("manufacturer"),
                origin: data.get("origin"),
                price: Number(data.get("price")),
                salePrice: data.get("salePrice") ? Number(data.get("salePrice")) : null,
                unit: data.get("unit"),
                packaging: data.get("packaging"),
                usagePurpose: data.get("usagePurpose"),
                usageInstructions: data.get("usageInstructions"),
                composition: data.get("composition"),
                phiDays: data.get("phiDays") ? Number(data.get("phiDays")) : null,
                safetyWarnings: data.get("safetyWarnings"),
                imageUrls: imageUrl ? [imageUrl] : [],
            }),
        });
        const payload = await response.json();
        if (!response.ok) {
            toast({ title: "Không thể cập nhật sản phẩm", description: payload.message || "Vui lòng kiểm tra lại thông tin.", variant: "destructive" });
            return;
        }
        setEditing(null);
        toast({ title: "Đã cập nhật sản phẩm", description: "Thông tin sản phẩm đã được lưu.", variant: "success" });
        await load();
    }

    return <>
        <form onSubmit={submit} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
            <select name="type" className="h-12 rounded-2xl border border-slate-200 bg-white px-3">
                <option value="FERTILIZER">Phân bón</option>
                <option value="PESTICIDE">Thuốc BVTV</option>
            </select>
            <Input name="name" required placeholder="Tên sản phẩm" />
            <Input name="manufacturer" required placeholder="Tên công ty" />
            <Input name="price" type="number" min="1" required placeholder="Giá bán" />
            <Input name="unit" required placeholder="Đơn vị bán" />
            <Input name="packaging" placeholder="Quy cách đóng gói (ví dụ: Bao 25 kg)" />
            <Input name="imageUrl" type="url" placeholder="URL hình ảnh sản phẩm" />
            <Input name="usagePurpose" placeholder="Công dụng" />
            <Input name="origin" placeholder="Xuất xứ (ví dụ: Việt Nam)" />
            <Button type="submit" className="md:col-span-3">Thêm sản phẩm</Button>
        </form>

        <div className="my-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Danh sách sản phẩm</h2>
            <span className="text-sm text-slate-500">{items.length} sản phẩm</span>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {items.map((product) => {
                const displayPrice = Number(product.salePrice ?? product.price);
                const statusLabel = product.stock === 0 ? (product.status === "DRAFT" ? "Chưa nhập kho" : "Hết hàng") : product.status === "APPROVED" ? "Đang bán" : product.status === "HIDDEN" ? "Tạm ẩn" : "Chưa mở bán";
                return <article key={product.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="aspect-square overflow-hidden bg-slate-100">
                        {product.imageUrls?.[0]
                            ? <img src={product.imageUrls[0]} alt={product.name} className="h-full w-full object-contain" loading="lazy" />
                            : <div className="flex h-full items-center justify-center"><ImageIcon className="h-10 w-10 text-slate-300" /></div>}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                        <div>
                            <Badge className={product.type === "FERTILIZER" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                                {product.type === "FERTILIZER" ? "Phân bón" : "Thuốc BVTV"}
                            </Badge>
                        </div>
                        <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-bold text-slate-900">{product.name}</h3>
                        <p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{product.usagePurpose || "Chưa cập nhật công dụng"}</p>
                        <p className="mt-2 truncate text-xs text-slate-600">{product.manufacturer || "Chưa cập nhật tên công ty"}</p>
                        <p className="mt-2 text-sm font-bold text-emerald-700">{displayPrice.toLocaleString("vi-VN")} đ/{product.unit}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Package className="h-3.5 w-3.5" /> Tồn kho: {product.stock}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">Trạng thái: <span className={product.status === "APPROVED" ? "text-emerald-700" : product.stock === 0 ? "text-red-600" : "text-amber-700"}>{statusLabel}</span></p>
                        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-3">
                            {product.stock === 0 && <Button asChild size="sm"><Link href={`/dashboard/store/inventory?tab=create&productId=${encodeURIComponent(product.id)}`}><ArrowDownToLine className="mr-1 h-4 w-4" />{product.status === "DRAFT" ? "Nhập kho" : "Nhập thêm"}</Link></Button>}
                            {product.stock > 0 && product.status !== "APPROVED" && <Button size="sm" disabled={busyId === product.id} onClick={() => void changeSaleStatus(product, "APPROVED")}><Store className="mr-1 h-4 w-4" />Mở bán</Button>}
                            {product.stock > 0 && product.status === "APPROVED" && <Button size="sm" variant="outline" disabled={busyId === product.id} onClick={() => void changeSaleStatus(product, "HIDDEN")}><EyeOff className="mr-1 h-4 w-4" />Tạm ẩn</Button>}
                            <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" title="Chỉnh sửa sản phẩm" aria-label={`Chỉnh sửa ${product.name}`} onClick={() => setEditing(product)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </article>;
            })}
        </section>

        {items.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 py-16 text-center text-slate-500">Cửa hàng chưa có sản phẩm.</div>}

        {editing && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditing(null); }}>
            <form onSubmit={saveEdit} className="relative grid max-h-[92vh] w-full max-w-4xl gap-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:grid-cols-2">
                <h3 className="pr-12 text-xl font-bold text-slate-900 md:col-span-2">Chỉnh sửa sản phẩm</h3>
                <Button type="button" variant="ghost" size="sm" className="absolute right-4 top-4 h-9 w-9 p-0" title="Đóng" aria-label="Đóng form chỉnh sửa" onClick={() => setEditing(null)}><X className="h-5 w-5" /></Button>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Loại sản phẩm
                    <select name="type" defaultValue={editing.type} className="block h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 font-normal text-slate-900">
                        <option value="FERTILIZER">Phân bón</option><option value="PESTICIDE">Thuốc BVTV</option>
                    </select>
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Tên sản phẩm
                    <Input name="name" defaultValue={editing.name} required placeholder="Tên sản phẩm" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Tên công ty
                    <Input name="manufacturer" defaultValue={editing.manufacturer || ""} required placeholder="Tên công ty sản xuất" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Xuất xứ
                    <Input name="origin" defaultValue={editing.origin || ""} placeholder="Quốc gia hoặc nơi sản xuất" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Giá bán
                    <Input name="price" type="number" min="1" defaultValue={Number(editing.price)} required placeholder="Giá bán" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Giá khuyến mãi
                    <Input name="salePrice" type="number" min="1" defaultValue={editing.salePrice ? Number(editing.salePrice) : ""} placeholder="Để trống nếu không giảm giá" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Đơn vị bán
                    <Input name="unit" defaultValue={editing.unit} required placeholder="Đơn vị bán" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Quy cách đóng gói
                    <Input name="packaging" defaultValue={editing.packaging || ""} placeholder="Ví dụ: Bao 25 kg" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Hình ảnh sản phẩm
                    <Input name="imageUrl" type="url" defaultValue={editing.imageUrls?.[0] || ""} placeholder="URL hình ảnh sản phẩm" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Thành phần / hoạt chất
                    <Input name="composition" defaultValue={editing.composition || ""} placeholder="Thành phần hoặc hoạt chất" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">Thời gian cách ly (ngày)
                    <Input name="phiDays" type="number" min="0" max="365" defaultValue={editing.phiDays ?? ""} placeholder="Áp dụng cho thuốc BVTV" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Công dụng
                    <RichTextEditor name="usagePurpose" initialValue={editing.usagePurpose || ""} placeholder="Soạn nội dung công dụng..." />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Hướng dẫn sử dụng
                    <RichTextEditor name="usageInstructions" initialValue={editing.usageInstructions || ""} placeholder="Soạn hướng dẫn sử dụng..." />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Cảnh báo an toàn
                    <RichTextEditor name="safetyWarnings" initialValue={editing.safetyWarnings || ""} placeholder="Soạn cảnh báo an toàn..." />
                </label>
                <div className="flex justify-end md:col-span-2">
                    <Button type="submit">Xác nhận</Button>
                </div>
            </form>
        </div>}
    </>;
}
