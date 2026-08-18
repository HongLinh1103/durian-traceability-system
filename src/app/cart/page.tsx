"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = { id: string; quantity: number; product: { name: string; price: string; salePrice?: string | null; stock: number; unit: string; imageUrls: string[]; store: { id: string; name: string } } };

export default function CartPage() {
    const router = useRouter();
    const [items, setItems] = useState<Item[]>([]); const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState(""); const [error, setError] = useState("");
    const load = useCallback(async () => { setLoading(true); try { const response = await fetch("/api/cart", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "Không thể tải giỏ hàng."); setItems(payload.data || []); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải giỏ hàng."); } finally { setLoading(false); } }, []);
    useEffect(() => { void load(); }, [load]);
    const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.product.salePrice ?? item.product.price) * item.quantity, 0), [items]);
    const shippingFee = useMemo(() => new Set(items.map((item) => item.product.store.id)).size * 20_000, [items]);
    async function change(item: Item, quantity: number) { if (quantity < 1 || quantity > item.product.stock) return; setBusyId(item.id); setError(""); const response = await fetch("/api/cart", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, quantity }) }); const payload = await response.json(); if (!response.ok) setError(payload.message || "Không thể cập nhật số lượng."); else window.dispatchEvent(new Event("cart-updated")); await load(); setBusyId(""); }
    async function remove(id: string) { setBusyId(id); const response = await fetch(`/api/cart?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (response.ok) window.dispatchEvent(new Event("cart-updated")); await load(); setBusyId(""); }
    return (
        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-5xl space-y-5 px-4 py-7 sm:px-6">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Quay lại</span>
                </button>
            </div>
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Giỏ hàng</h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">Kiểm tra sản phẩm và số lượng trước khi đặt hàng.</p>
            </div>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>}
        {!loading && !items.length && (
            <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-brand-50 p-6 text-brand-600 shadow-soft">
                    <ShoppingCart className="h-10 w-10" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">Giỏ hàng đang trống</h2>
                <Button asChild className="mt-5 h-12 rounded-2xl bg-brand-600 px-6 text-white hover:bg-brand-700 shadow-soft">
                    <Link href="/materials">Xem vật tư đang bán</Link>
                </Button>
            </section>
        )}
        {!loading && items.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <section className="space-y-3">
                    {items.map((item) => {
                        const price = Number(item.product.salePrice ?? item.product.price);
                        return (
                            <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                    {item.product.imageUrls[0] && <img src={item.product.imageUrls[0]} alt={item.product.name} className="h-full w-full object-contain" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-bold text-slate-900">{item.product.name}</h2>
                                    <p className="text-sm text-slate-500">{item.product.store.name}</p>
                                    <p className="mt-1 font-semibold text-brand-700">{price.toLocaleString("vi-VN")} đ/{item.product.unit}</p>
                                    <p className="text-xs text-slate-400">Kho còn {item.product.stock} {item.product.unit}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-brand-200 text-brand-700 hover:bg-brand-50" disabled={busyId === item.id || item.quantity <= 1} onClick={() => void change(item, item.quantity - 1)}>
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="min-w-8 text-center font-bold">{item.quantity}</span>
                                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-brand-200 text-brand-700 hover:bg-brand-50" disabled={busyId === item.id || item.quantity >= item.product.stock} onClick={() => void change(item, item.quantity + 1)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" disabled={busyId === item.id} onClick={() => void remove(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </article>
                        );
                    })}
                </section>
                <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                    <h2 className="text-lg font-bold text-slate-900">Tóm tắt đơn hàng</h2>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <p className="flex justify-between">
                            <span>{items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</span>
                            <span className="font-semibold text-slate-900">{total.toLocaleString("vi-VN")} đ</span>
                        </p>
                        <p className="flex justify-between">
                            <span>Phí vận chuyển ({new Set(items.map((item) => item.product.store.id)).size} đơn)</span>
                            <span className="font-semibold text-slate-900">{shippingFee.toLocaleString("vi-VN")} đ</span>
                        </p>
                    </div>
                    <div className="mt-4 flex justify-between border-t pt-4 text-lg font-black">
                        <span>Tổng thanh toán</span>
                        <span className="text-brand-700">{(total + shippingFee).toLocaleString("vi-VN")} đ</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Phí vận chuyển 20.000đ cho mỗi cửa hàng. Sản phẩm từ nhiều cửa hàng sẽ tách thành các đơn riêng.</p>
                    <Button asChild className="mt-5 h-12 w-full rounded-2xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft">
                        <Link href="/checkout">Tiến hành đặt hàng</Link>
                    </Button>
                </aside>
            </div>
        )}
        </main>
    );
}
