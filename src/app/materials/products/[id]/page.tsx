import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { AlertTriangle, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sanitizeRichText } from "@/lib/sanitize-rich-text";
import { ProductPurchaseActions } from "@/components/store/product-purchase-actions";

const richTextClasses = "text-sm leading-7 text-slate-700 [&_b]:font-bold [&_em]:italic [&_i]:italic [&_ol]:ml-6 [&_ol]:list-decimal [&_p+p]:mt-2 [&_strong]:font-bold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_ul]:ml-6 [&_ul]:list-disc";

export default async function Page({ params }: { params: { id: string } }) {
    const [product, session] = await Promise.all([
        prisma.storeProduct.findFirst({ where: { id: params.id, status: { in: ["APPROVED", "OUT_OF_STOCK"] }, deletedAt: null, store: { status: "APPROVED" } }, include: { store: true } }),
        getServerSession(authOptions),
    ]);
    if (!product) notFound();
    const price = Number(product.price); const salePrice = product.salePrice ? Number(product.salePrice) : null; const discounted = salePrice != null && salePrice < price; const discountPercent = discounted ? Math.round((1 - salePrice / price) * 100) : 0;
    const purpose = sanitizeRichText(product.usagePurpose); const instructions = sanitizeRichText(product.usageInstructions); const warnings = sanitizeRichText(product.safetyWarnings);
    return <main className="mx-auto max-w-5xl space-y-5 px-4 py-7">
        <section className="grid gap-6 rounded-3xl border bg-white p-6 md:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">{product.imageUrls[0] && <img src={product.imageUrls[0]} alt={product.name} className="h-full w-full object-contain" />}</div>
            <div><span className="text-sm font-semibold text-emerald-700">{product.type === "FERTILIZER" ? "Phân bón" : "Thuốc BVTV"}</span><h1 className="text-3xl font-black">{product.name}</h1>{discounted ? <div className="mt-4 rounded-2xl bg-red-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-base text-slate-400 line-through">Giá gốc: {price.toLocaleString("vi-VN")} đ</span><span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">Giảm {discountPercent}%</span></div><p className="mt-1 text-3xl font-black text-red-600">{salePrice.toLocaleString("vi-VN")} đ/{product.unit}</p><p className="mt-1 text-sm font-semibold text-red-700">Tiết kiệm {(price - salePrice).toLocaleString("vi-VN")} đ mỗi {product.unit}</p></div> : <p className="mt-3 text-2xl font-bold text-emerald-700">{price.toLocaleString("vi-VN")} đ/{product.unit}</p>}{product.stock > 0 ? <p className="mt-2 text-sm text-slate-500">Còn {product.stock} {product.unit}</p> : <p className="mt-2 font-bold text-red-600">Tạm hết hàng</p>}{session?.user.role === "FARMER" && <ProductPurchaseActions productId={product.id} disabled={product.stock <= 0} />}
                <dl className="mt-6 space-y-2 text-sm"><p><b>Cửa hàng:</b> {product.store.name}</p><p><b>Công ty sản xuất:</b> {product.manufacturer || "—"}</p><p><b>Xuất xứ:</b> {product.origin || "—"}</p><p><b>Quy cách:</b> {product.packaging || "—"}</p><p><b>Thành phần/hoạt chất:</b> {product.composition || "—"}</p>{product.phiDays != null && <p><b>Thời gian cách ly:</b> {product.phiDays} ngày</p>}</dl>{purpose && <div className="mt-4"><h2 className="mb-2 text-sm font-bold">Công dụng</h2><div className={richTextClasses} dangerouslySetInnerHTML={{ __html: purpose }} /></div>}
            </div>
        </section>
        {instructions && <section className="rounded-3xl border bg-white p-6"><h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-900"><BookOpen className="h-5 w-5 text-emerald-600" />Hướng dẫn sử dụng</h2><div className={richTextClasses} dangerouslySetInnerHTML={{ __html: instructions }} /></section>}
        {warnings && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><h2 className="mb-4 flex items-center gap-2 text-xl font-black text-amber-900"><AlertTriangle className="h-5 w-5" />Cảnh báo an toàn</h2><div className={richTextClasses} dangerouslySetInnerHTML={{ __html: warnings }} /></section>}
    </main>;
}
