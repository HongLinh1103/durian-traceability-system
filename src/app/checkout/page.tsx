"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, PackageCheck, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CartItem = {
    id: string;
    quantity: number;
    product: {
        name: string;
        price: string;
        salePrice?: string | null;
        unit: string;
        store: { id: string; name: string };
    };
};

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const directProductId = searchParams?.get("productId");
    const directQuantity = Math.max(1, Number(searchParams?.get("quantity") || "1"));

    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        recipientName: "",
        recipientPhone: "",
        shippingAddress: "",
        note: "",
    });

    useEffect(() => {
        const fetchItems = directProductId
            ? fetch(`/api/marketplace/products?id=${encodeURIComponent(directProductId)}`, { cache: "no-store" })
                  .then(r => r.json())
                  .then(payload => {
                      const prod = payload.data?.[0];
                      if (prod) {
                          return [{
                              id: "direct",
                              quantity: directQuantity,
                              product: prod,
                          }];
                      }
                      return [];
                  })
            : fetch("/api/cart", { cache: "no-store" })
                  .then(r => r.json())
                  .then(payload => payload.data || []);

        const fetchUser = fetch("/api/auth/me", { cache: "no-store" })
            .then(r => r.json())
            .catch(() => null);

        void Promise.all([fetchItems, fetchUser])
            .then(([cartData, me]) => {
                setItems(cartData);
                if (me?.success) {
                    setForm(current => ({
                        ...current,
                        recipientName: me.user.fullName || "",
                        recipientPhone: me.user.phone || "",
                        shippingAddress: me.user.address || "",
                    }));
                }
            })
            .finally(() => setLoading(false));
    }, [directProductId, directQuantity]);

    const total = useMemo(
        () => items.reduce((sum, item) => sum + Number(item.product.salePrice ?? item.product.price) * item.quantity, 0),
        [items],
    );

    const shippingFee = useMemo(
        () => new Set(items.map(item => item.product.store.id)).size * 20_000,
        [items],
    );

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const body = directProductId
                ? { ...form, productId: directProductId, quantity: directQuantity }
                : form;

            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || "Không thể đặt hàng.");
            if (!directProductId) {
                window.dispatchEvent(new Event("cart-updated"));
            }
            router.push("/orders");
            router.refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Không thể đặt hàng.");
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </main>
        );
    }

    if (!items.length) {
        return (
            <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
                <PackageCheck className="h-12 w-12 text-slate-300" />
                <h1 className="mt-4 text-2xl font-black text-slate-900">Không có sản phẩm để đặt</h1>
                <Button asChild className="mt-5 h-12 rounded-2xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 shadow-soft">
                    <Link href="/materials">Tiếp tục mua sắm</Link>
                </Button>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-5xl space-y-5 px-4 py-7 sm:px-6">
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
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Xác nhận đặt hàng COD</h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    {directProductId
                        ? "Kiểm tra thông tin người nhận và đơn hàng mua ngay."
                        : "Kiểm tra thông tin nhận hàng trước khi xác nhận đơn từ giỏ hàng."}
                </p>
            </div>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Thông tin nhận hàng</h2>
                    <label className="block text-sm font-semibold text-slate-700">
                        Người nhận
                        <div className="relative mt-1">
                            <UserRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                className="pl-10 rounded-2xl"
                                required
                                value={form.recipientName}
                                onChange={e => setForm({ ...form, recipientName: e.target.value })}
                            />
                        </div>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                        Số điện thoại
                        <div className="relative mt-1">
                            <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                className="pl-10 rounded-2xl"
                                required
                                value={form.recipientPhone}
                                onChange={e => setForm({ ...form, recipientPhone: e.target.value })}
                            />
                        </div>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                        Địa chỉ nhận hàng
                        <div className="relative mt-1">
                            <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                className="pl-10 rounded-2xl"
                                required
                                value={form.shippingAddress}
                                onChange={e => setForm({ ...form, shippingAddress: e.target.value })}
                            />
                        </div>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                        Ghi chú
                        <textarea
                            className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 p-3 text-sm font-normal focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            maxLength={1000}
                            value={form.note}
                            onChange={e => setForm({ ...form, note: e.target.value })}
                            placeholder="Ví dụ: Giao hàng vào buổi chiều, gọi trước khi đến..."
                        />
                    </label>
                    <Button
                        type="submit"
                        className="h-12 w-full rounded-2xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft"
                        disabled={busy}
                    >
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {busy ? "Đang đặt hàng..." : "Đặt hàng COD"}
                    </Button>
                </form>

                <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                        Sản phẩm ({items.reduce((sum, item) => sum + item.quantity, 0)})
                    </h2>
                    <div className="mt-3 divide-y divide-slate-100">
                        {items.map(item => (
                            <div key={item.id} className="py-3 text-sm">
                                <div className="flex justify-between gap-3">
                                    <span className="font-medium text-slate-800">
                                        {item.product.name} × {item.quantity}
                                    </span>
                                    <b className="shrink-0 text-slate-900">
                                        {(Number(item.product.salePrice ?? item.product.price) * item.quantity).toLocaleString("vi-VN")} đ
                                    </b>
                                </div>
                                <p className="text-xs text-slate-500">{item.product.store.name}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                        <p className="flex justify-between">
                            <span>Tiền hàng</span>
                            <span className="font-semibold text-slate-900">{total.toLocaleString("vi-VN")} đ</span>
                        </p>
                        <p className="flex justify-between">
                            <span>Phí vận chuyển ({new Set(items.map(item => item.product.store.id)).size} đơn)</span>
                            <span className="font-semibold text-slate-900">{shippingFee.toLocaleString("vi-VN")} đ</span>
                        </p>
                        <p className="flex justify-between text-lg font-black pt-2 border-t border-slate-100">
                            <span className="text-slate-900">Tổng thanh toán</span>
                            <span className="text-brand-700">{(total + shippingFee).toLocaleString("vi-VN")} đ</span>
                        </p>
                        <p className="text-xs text-slate-400">20.000đ phí vận chuyển cho mỗi cửa hàng.</p>
                    </div>
                </aside>
            </div>
        </main>
    );
}

