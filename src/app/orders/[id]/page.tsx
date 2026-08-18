import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Page({ params }: { params: { id: string } }) {
    const s = await getServerSession(authOptions);
    if (!s?.user?.id) redirect("/login");
    const o = await prisma.order.findFirst({
        where: { id: params.id, farmerId: s.user.id, deletedAt: null },
        include: { store: true, items: true, histories: { orderBy: { createdAt: "asc" } } },
    });
    if (!o) notFound();

    return (
        <main className="mx-auto max-w-3xl space-y-5 px-4 py-7">
            <div className="flex items-center gap-3">
                <Link
                    href="/orders"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Quay lại đơn mua</span>
                </Link>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Đơn {o.orderCode}</h1>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-2 text-sm text-slate-700">
                <p><b className="text-slate-900">Cửa hàng:</b> {o.store.name}</p>
                <p><b className="text-slate-900">Trạng thái:</b> {o.status}</p>
                <p><b className="text-slate-900">Nhận tại:</b> {o.shippingAddress}</p>
                <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-3">
                    {o.items.map(i => (
                        <p key={i.id} className="py-1.5 flex justify-between">
                            <span>{i.productName} × {i.quantity}</span>
                            <span className="font-semibold">{Number(i.unitPrice).toLocaleString("vi-VN")} đ</span>
                        </p>
                    ))}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600 space-y-1">
                    <p className="flex justify-between"><span>Tiền hàng:</span> <span>{Number(o.subtotal).toLocaleString("vi-VN")} đ</span></p>
                    <p className="flex justify-between"><span>Phí vận chuyển:</span> <span>{Number(o.shippingFee).toLocaleString("vi-VN")} đ</span></p>
                    <p className="flex justify-between font-bold text-base text-brand-700 pt-1 border-t border-slate-100">
                        <span>Tổng thanh toán:</span>
                        <span>{(Number(o.subtotal) + Number(o.shippingFee)).toLocaleString("vi-VN")} đ</span>
                    </p>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-900">Lịch sử trạng thái</h2>
                <div className="mt-3 space-y-2">
                    {o.histories.map(h => (
                        <div key={h.id} className="text-xs sm:text-sm text-slate-600 flex justify-between">
                            <span>{h.toStatus}</span>
                            <span className="text-slate-400">{new Date(h.createdAt).toLocaleString("vi-VN")}</span>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}

