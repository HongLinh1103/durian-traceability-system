import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, FileText, Package } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const typeLabels = { PN: "Phiếu nhập kho", PX: "Phiếu xuất kho", DC: "Phiếu điều chỉnh kho", HT: "Phiếu hoàn hàng" };
const businessLabels: Record<string, string> = {
    SUPPLIER_IMPORT: "Nhập hàng từ nhà cung cấp", STOCK_REPLENISHMENT: "Nhập bổ sung tồn", RETURNED_GOODS_IMPORT: "Nhập hàng trả về",
    SALE_EXPORT: "Xuất bán cho nông dân", DISPOSAL_EXPORT: "Xuất hủy", TRANSFER_EXPORT: "Xuất điều chuyển",
    STOCKTAKE_INCREASE: "Điều chỉnh tăng do kiểm kê", STOCKTAKE_DECREASE: "Điều chỉnh giảm do kiểm kê",
    CUSTOMER_RETURN: "Khách trả hàng", SUPPLIER_RETURN: "Trả hàng nhà cung cấp", OPENING_BALANCE: "Số dư đầu kỳ",
};

export default async function InventoryDocumentPage({ params }: { params: { code: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STORE_OWNER") redirect("/login");
    const document = await prisma.inventoryDocument.findFirst({
        where: { code: decodeURIComponent(params.code), store: { ownerId: session.user.id, deletedAt: null } },
        include: { movements: { include: { product: { select: { name: true, unit: true } } } }, order: { select: { orderCode: true, status: true, recipientName: true } } },
    });
    if (!document) notFound();
    return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Link href="/dashboard/store/inventory" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><ArrowLeft className="h-4 w-4" />Quay lại kho hàng</Link>
        <header className="rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-white shadow-lg">
            <p className="text-sm font-bold uppercase tracking-widest">{typeLabels[document.type]}</p><h1 className="mt-2 text-3xl font-black">{document.code}</h1><p className="mt-2 text-emerald-50">{businessLabels[document.businessType]}</p>
        </header>
        <section className="grid gap-4 rounded-3xl border bg-white p-6 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Mã phiếu" value={document.code} /><Info label="Loại nghiệp vụ" value={businessLabels[document.businessType]} />
            <Info label="Thời gian" value={document.createdAt.toLocaleString("vi-VN")} /><Info label="Người thực hiện" value={document.actorName || "Không xác định"} />
            <Info label="Nhà cung cấp" value={document.supplierName || "—"} /><Info label="Đơn hàng liên quan" value={document.order?.orderCode || "—"} />
            {document.reason && <Info label={document.businessType === "DISPOSAL_EXPORT" ? "Lý do hủy" : "Lý do trả hàng"} value={document.reason} />}
            {document.note && <Info label="Ghi chú chung" value={document.note} />}
            {document.order && <Info label="Khách nhận / trạng thái" value={`${document.order.recipientName} · ${document.order.status}`} />}
        </section>
        <section className="overflow-hidden rounded-3xl border bg-white"><div className="flex items-center gap-2 border-b p-5"><FileText className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold">Sản phẩm trong phiếu</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Sản phẩm</th><th className="p-4">Số lượng</th><th className="p-4">Tồn trước</th><th className="p-4">Tồn sau</th><th className="p-4">Thay đổi</th><th className="p-4">Ghi chú</th></tr></thead><tbody className="divide-y">{document.movements.map((movement) => { const delta = movement.stockAfter - movement.stockBefore; return <tr key={movement.id}><td className="p-4 font-bold"><span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-emerald-600" />{movement.product.name}</span></td><td className="p-4">{movement.quantity} {movement.product.unit}</td><td className="p-4">{movement.stockBefore}</td><td className="p-4 font-bold">{movement.stockAfter}</td><td className={`p-4 font-bold ${delta >= 0 ? "text-emerald-700" : "text-red-600"}`}>{delta >= 0 ? "+" : ""}{delta} {movement.product.unit}</td><td className="p-4 text-slate-600">{movement.note || "—"}</td></tr>; })}</tbody></table></div></section>
    </main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>; }
