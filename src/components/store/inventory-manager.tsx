"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, FileText, History, Loader2, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type Product = { id: string; name: string; type: "FERTILIZER" | "PESTICIDE"; stock: number; unit: string; status: string; imageUrls: string[] };
type Movement = { id: string; productId: string; quantity: number; stockBefore: number; stockAfter: number; product: { name: string; unit: string } };
type Document = { id: string; code: string; type: "PN" | "PX" | "DC" | "HT"; businessType: string; supplierName?: string | null; actorName?: string | null; createdAt: string; order?: { id: string; orderCode: string } | null; movements: Movement[] };

const businessLabels: Record<string, string> = {
    SUPPLIER_IMPORT: "Nhập từ nhà cung cấp", STOCK_REPLENISHMENT: "Nhập bổ sung tồn", RETURNED_GOODS_IMPORT: "Nhập hàng trả về",
    DISPOSAL_EXPORT: "Xuất hủy", TRANSFER_EXPORT: "Xuất điều chuyển", STOCKTAKE_INCREASE: "Kiểm kê tăng", STOCKTAKE_DECREASE: "Kiểm kê giảm",
    CUSTOMER_RETURN: "Khách trả hàng", SUPPLIER_RETURN: "Trả nhà cung cấp", SALE_EXPORT: "Xuất bán", OPENING_BALANCE: "Số dư đầu kỳ",
};

export function InventoryManager() {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]); const [documents, setDocuments] = useState<Document[]>([]); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [selectedProduct, setSelectedProduct] = useState("ALL"); const [businessType, setBusinessType] = useState("SUPPLIER_IMPORT");
    const load = useCallback(async () => { setLoading(true); try { const response = await fetch("/api/store/inventory", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); setProducts(payload.products || []); setDocuments(payload.documents || []); } catch (error) { toast({ title: "Không thể tải kho hàng", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" }); } finally { setLoading(false); } }, [toast]);
    useEffect(() => { void load(); }, [load]);
    const visibleDocuments = useMemo(() => selectedProduct === "ALL" ? documents : documents.filter((item) => item.movements.some((movement) => movement.productId === selectedProduct)), [documents, selectedProduct]);
    const totalStock = products.reduce((sum, product) => sum + product.stock, 0); const lowStock = products.filter((product) => product.stock <= 5).length;
    const needsSupplier = ["SUPPLIER_IMPORT", "SUPPLIER_RETURN"].includes(businessType);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setSubmitting(true); const form = event.currentTarget; const data = new FormData(form);
        try {
            const response = await fetch("/api/store/inventory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: data.get("productId"), businessType: data.get("businessType"), quantity: Number(data.get("quantity")), supplierName: data.get("supplierName"), orderCode: data.get("orderCode") }) });
            const payload = await response.json(); if (!response.ok) throw new Error(payload.message);
            toast({ title: `Đã tạo ${payload.document.code}`, description: "Tồn kho và chứng từ truy vết đã được cập nhật.", variant: "success" }); form.reset(); setBusinessType("SUPPLIER_IMPORT"); await load();
        } catch (error) { toast({ title: "Không thể tạo chứng từ", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" }); } finally { setSubmitting(false); }
    }

    return <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-3"><Stat label="Sản phẩm" value={products.length} /><Stat label="Tổng đơn vị tồn" value={totalStock} /><Stat label="Sắp hết (≤ 5)" value={lowStock} warning={lowStock > 0} /></section>
        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <form onSubmit={submit} className="h-fit space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
                <div><h2 className="flex items-center gap-2 text-xl font-bold"><FileText className="h-5 w-5 text-emerald-600" />Tạo chứng từ kho</h2><p className="mt-1 text-sm text-slate-500">Mã PN/PX/DC/HT được hệ thống cấp tự động.</p></div>
                <label className="block text-sm font-semibold">Sản phẩm<select name="productId" required className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3"><option value="">Chọn sản phẩm</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · còn {product.stock} {product.unit}</option>)}</select></label>
                <label className="block text-sm font-semibold">Loại nghiệp vụ<select name="businessType" value={businessType} onChange={(event) => setBusinessType(event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3"><optgroup label="Phiếu nhập kho (PN)"><option value="SUPPLIER_IMPORT">Nhập hàng từ nhà cung cấp</option><option value="STOCK_REPLENISHMENT">Nhập bổ sung tồn</option><option value="RETURNED_GOODS_IMPORT">Nhập hàng trả về</option></optgroup><optgroup label="Phiếu xuất kho (PX)"><option value="DISPOSAL_EXPORT">Xuất hủy</option><option value="TRANSFER_EXPORT">Xuất điều chuyển</option></optgroup><optgroup label="Phiếu điều chỉnh (DC)"><option value="STOCKTAKE_INCREASE">Điều chỉnh tăng do kiểm kê</option><option value="STOCKTAKE_DECREASE">Điều chỉnh giảm do kiểm kê</option></optgroup><optgroup label="Phiếu hoàn hàng (HT)"><option value="CUSTOMER_RETURN">Khách trả hàng</option><option value="SUPPLIER_RETURN">Trả hàng nhà cung cấp</option></optgroup></select></label>
                <label className="block text-sm font-semibold">Số lượng<Input name="quantity" type="number" min="1" required className="mt-1" /></label>
                <label className="block text-sm font-semibold">Nhà cung cấp {needsSupplier && <span className="text-red-600">*</span>}<Input name="supplierName" required={needsSupplier} className="mt-1" placeholder="Tên nhà cung cấp (nếu có)" /></label>
                <label className="block text-sm font-semibold">Đơn hàng liên quan<Input name="orderCode" className="mt-1" placeholder="Ví dụ: DH-20260810-015" /></label>
                <Button type="submit" className="w-full" disabled={submitting || !products.length}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu chứng từ</Button>
            </form>
            <div><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Tồn kho hiện tại</h2><Button variant="ghost" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Làm mới</Button></div>{loading ? <div className="flex justify-center rounded-3xl border bg-white py-16"><Loader2 className="h-8 w-8 animate-spin" /></div> : <div className="grid gap-3 sm:grid-cols-2">{products.map((product) => <article key={product.id} className="flex items-center gap-3 rounded-2xl border bg-white p-4"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><Package className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{product.name}</h3><p className="text-xs text-slate-500">{product.type === "FERTILIZER" ? "Phân bón" : "Thuốc BVTV"}</p></div><div className={`text-right ${product.stock <= 5 ? "text-red-600" : "text-emerald-700"}`}><b className="text-2xl">{product.stock}</b><p className="text-xs">{product.unit}</p></div></article>)}</div>}</div>
        </section>
        <section className="rounded-3xl border bg-white">
            <header className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="flex items-center gap-2 text-xl font-bold"><History className="h-5 w-5" />Lịch sử xuất nhập kho</h2><p className="mt-1 text-sm text-slate-500">Bấm mã tại cột Chứng từ để xem đầy đủ chi tiết phiếu.</p></div>
                <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="ALL">Tất cả sản phẩm</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
            </header>
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Thời gian</th><th className="p-4">Sản phẩm</th><th className="p-4">Loại</th><th className="p-4">Số lượng</th><th className="p-4">Tồn trước → sau</th><th className="p-4">Chứng từ</th></tr></thead>
                <tbody className="divide-y">{visibleDocuments.flatMap((document) => document.movements.map((movement) => {
                    const delta = movement.stockAfter - movement.stockBefore; const incoming = delta >= 0;
                    return <tr key={movement.id}><td className="whitespace-nowrap p-4">{new Date(document.createdAt).toLocaleString("vi-VN")}</td><td className="p-4 font-semibold">{movement.product.name}</td><td className="p-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${incoming ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{incoming ? <ArrowDownToLine className="mr-1 h-3.5 w-3.5" /> : <ArrowUpFromLine className="mr-1 h-3.5 w-3.5" />}{businessLabels[document.businessType] || document.businessType}</span></td><td className="p-4 font-bold">{incoming ? "+" : "−"}{movement.quantity} {movement.product.unit}</td><td className="p-4">{movement.stockBefore} → <b>{movement.stockAfter}</b></td><td className="p-4"><Link href={`/dashboard/store/inventory/${encodeURIComponent(document.code)}`} className="font-black text-emerald-700 underline-offset-4 hover:underline">{document.code}</Link></td></tr>;
                }))}{!visibleDocuments.length && <tr><td colSpan={6} className="p-12 text-center text-slate-500">Chưa có giao dịch kho.</td></tr>}</tbody>
            </table></div>
        </section>
    </div>;
}

function Stat({ label, value, warning }: { label: string; value: number; warning?: boolean }) { return <div className={`rounded-2xl border p-4 ${warning ? "border-red-200 bg-red-50" : "bg-white"}`}><p className="text-sm text-slate-500">{label}</p><p className={`mt-1 text-3xl font-black ${warning ? "text-red-700" : "text-slate-900"}`}>{value}</p></div>; }
