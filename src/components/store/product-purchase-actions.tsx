"use client";

import { useState } from "react";
import { Loader2, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ProductPurchaseActions({ productId, disabled }: { productId: string; disabled: boolean }) {
    const { toast } = useToast();
    const [busy, setBusy] = useState<"cart" | "buy" | null>(null);

    async function addToCart(buyNow: boolean) {
        setBusy(buyNow ? "buy" : "cart");
        try {
            const response = await fetch("/api/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, quantity: 1 }) });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.message || "Không thể thêm sản phẩm vào giỏ hàng.");
            window.dispatchEvent(new Event("cart-updated"));
            if (buyNow) window.location.href = "/checkout";
            else toast({ title: "Đã thêm vào giỏ hàng", description: "Bạn có thể tiếp tục mua sắm hoặc mở giỏ hàng để đặt hàng.", variant: "success" });
        } catch (error) {
            toast({ title: "Không thể thêm vào giỏ", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally { setBusy(null); }
    }

    return <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" disabled={disabled || busy !== null} onClick={() => void addToCart(false)}>{busy === "cart" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}Thêm vào giỏ</Button>
        <Button disabled={disabled || busy !== null} onClick={() => void addToCart(true)}>{busy === "buy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}Mua ngay</Button>
    </div>;
}
