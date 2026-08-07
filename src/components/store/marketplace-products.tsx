"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageIcon, Search, ShoppingCart, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = { id: string; name: string; type: "FERTILIZER" | "PESTICIDE"; price: string; salePrice?: string | null; stock: number; unit: string; imageUrls: string[]; usagePurpose?: string | null; store: { name: string; address: string } };

export function MarketplaceProducts({ type }: { type?: "FERTILIZER" | "PESTICIDE" }) {
    const [items, setItems] = useState<Product[]>([]); const [query, setQuery] = useState(""); const [loading, setLoading] = useState(true);
    useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => { const params = new URLSearchParams(); if (type) params.set("type", type); if (query.trim()) params.set("q", query.trim()); setLoading(true); void fetch(`/api/marketplace/products?${params}`, { signal: controller.signal, cache: "no-store" }).then(r => r.json()).then(p => setItems(p.data || [])).catch(e => { if (e.name !== "AbortError") setItems([]); }).finally(() => setLoading(false)); }, 250); return () => { window.clearTimeout(timer); controller.abort(); }; }, [query, type]);
    async function add(id: string, buyNow = false) { const response = await fetch("/api/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: id, quantity: 1 }) }); if (!response.ok) { alert("Vui lòng đăng nhập bằng tài khoản nông dân để mua hàng."); return; } if (buyNow) window.location.href = "/checkout"; else alert("Đã thêm sản phẩm vào giỏ hàng."); }
    return <div className="space-y-5">
        <label className="relative block"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><Input value={query} onChange={e => setQuery(e.target.value)} className="pl-10" placeholder="Tìm theo tên, thương hiệu hoặc công dụng..." /></label>
        {!loading && <p className="text-sm text-slate-500">Tìm thấy {items.length} sản phẩm đang bán</p>}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{items.map(product => <article key={product.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="aspect-square overflow-hidden bg-slate-100">{product.imageUrls[0] ? <img src={product.imageUrls[0]} alt={product.name} className="h-full w-full object-contain" loading="lazy" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-10 w-10 text-slate-300" /></div>}</div>
            <div className="flex flex-1 flex-col p-3"><Badge className={product.type === "FERTILIZER" ? "w-fit bg-emerald-100 text-emerald-700" : "w-fit bg-amber-100 text-amber-700"}>{product.type === "FERTILIZER" ? "Phân bón" : "Thuốc BVTV"}</Badge><h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-bold text-slate-900">{product.name}</h3><p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{product.usagePurpose || "Chưa cập nhật công dụng"}</p><p className="mt-2 text-sm font-bold text-emerald-700">{Number(product.salePrice ?? product.price).toLocaleString("vi-VN")} đ/{product.unit}</p><p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><Store className="h-3.5 w-3.5 shrink-0" />{product.store.name}</p><p className="mt-1 text-xs text-slate-500">Còn {product.stock} {product.unit}</p><div className="mt-auto grid gap-2 pt-3"><Button asChild size="sm" variant="outline"><Link href={`/materials/products/${product.id}`}>Xem chi tiết</Link></Button><Button size="sm" variant="outline" onClick={() => void add(product.id)} disabled={!product.stock}><ShoppingCart className="mr-1 h-4 w-4" />Thêm giỏ</Button><Button size="sm" onClick={() => void add(product.id, true)} disabled={!product.stock}>Mua ngay</Button></div></div>
        </article>)}</section>
        {loading && <div className="rounded-3xl border border-dashed border-slate-300 py-16 text-center text-slate-500">Đang tải sản phẩm...</div>}{!loading && items.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 py-16 text-center text-slate-500">Không tìm thấy sản phẩm đang bán phù hợp.</div>}
    </div>;
}
