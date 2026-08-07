"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Package, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = {
    id: string;
    name: string;
    type: "FERTILIZER" | "PESTICIDE";
    brand?: string | null;
    price: string;
    salePrice?: string | null;
    stock: number;
    unit: string;
    status: string;
    imageUrls: string[];
    usagePurpose?: string | null;
};

const statusLabels: Record<string, string> = {
    DRAFT: "Bản nháp",
    PENDING_REVIEW: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Bị từ chối",
    HIDDEN: "Đã ẩn",
    OUT_OF_STOCK: "Hết hàng",
};

export function StoreProductsManager() {
    const [items, setItems] = useState<Product[]>([]);

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
            stock: Number(data.get("stock")),
            unit: data.get("unit"),
            brand: data.get("brand"),
            usagePurpose: data.get("usagePurpose"),
            imageUrls: imageUrl ? [imageUrl] : [],
            status: "PENDING_REVIEW",
        };
        const response = await fetch("/api/store/products", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (!response.ok) {
            alert(payload.message);
            return;
        }
        form.reset();
        await load();
    }

    async function remove(id: string) {
        if (!window.confirm("Bạn có chắc muốn ẩn sản phẩm này?")) return;
        const response = await fetch(`/api/store/products/${id}`, { method: "DELETE" });
        if (!response.ok) {
            const payload = await response.json();
            alert(payload.message || "Không thể ẩn sản phẩm.");
            return;
        }
        await load();
    }

    return <>
        <form onSubmit={submit} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
            <select name="type" className="h-12 rounded-2xl border border-slate-200 bg-white px-3">
                <option value="FERTILIZER">Phân bón</option>
                <option value="PESTICIDE">Thuốc BVTV</option>
            </select>
            <Input name="name" required placeholder="Tên sản phẩm" />
            <Input name="brand" placeholder="Thương hiệu" />
            <Input name="price" type="number" min="1" required placeholder="Giá bán" />
            <Input name="stock" type="number" min="0" required placeholder="Tồn kho" />
            <Input name="unit" required placeholder="Đơn vị bán" />
            <Input name="imageUrl" type="url" placeholder="URL hình ảnh sản phẩm" />
            <Input name="usagePurpose" placeholder="Công dụng" />
            <Button>Gửi sản phẩm để duyệt</Button>
        </form>

        <div className="my-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Danh sách sản phẩm</h2>
            <span className="text-sm text-slate-500">{items.length} sản phẩm</span>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {items.map((product) => {
                const displayPrice = Number(product.salePrice ?? product.price);
                return <article key={product.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="aspect-square overflow-hidden bg-slate-100">
                        {product.imageUrls?.[0]
                            ? <img src={product.imageUrls[0]} alt={product.name} className="h-full w-full object-contain" loading="lazy" />
                            : <div className="flex h-full items-center justify-center"><ImageIcon className="h-10 w-10 text-slate-300" /></div>}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                        <div className="flex flex-wrap gap-1">
                            <Badge className={product.type === "FERTILIZER" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                                {product.type === "FERTILIZER" ? "Phân bón" : "Thuốc BVTV"}
                            </Badge>
                            <Badge className="border border-slate-200 bg-white text-slate-600">{statusLabels[product.status] ?? product.status}</Badge>
                        </div>
                        <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-bold text-slate-900">{product.name}</h3>
                        <p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{product.usagePurpose || "Chưa cập nhật công dụng"}</p>
                        <p className="mt-2 truncate text-xs text-slate-600">{product.brand || "Chưa cập nhật thương hiệu"}</p>
                        <p className="mt-2 text-sm font-bold text-emerald-700">{displayPrice.toLocaleString("vi-VN")} đ/{product.unit}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Package className="h-3.5 w-3.5" /> Tồn kho: {product.stock}</p>
                        <Button type="button" variant="outline" size="sm" className="mt-auto w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void remove(product.id)}>
                            <Trash2 className="mr-1 h-4 w-4" /> Ẩn sản phẩm
                        </Button>
                    </div>
                </article>;
            })}
        </section>

        {items.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 py-16 text-center text-slate-500">Cửa hàng chưa có sản phẩm.</div>}
    </>;
}
