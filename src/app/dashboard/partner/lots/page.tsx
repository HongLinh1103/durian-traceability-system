import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PackageOpen, ArrowRight, QrCode, FileText } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Page() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.id || s.user.role !== "COLLECTOR") redirect("/login");

    const rows = await prisma.harvestRecord.findMany({
        where: { buyerUserId: s.user.id, status: { in: ["DELIVERY_CONFIRMED", "COMPLETED"] } },
        include: { farm: true },
        orderBy: { buyerReceivedAt: "desc" },
    });

    return (
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Vựa Thu Mua</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Quản Lý Lô Hàng Thu Mua</h1>
                    <p className="mt-2 text-slate-500">
                        Các lô sầu riêng đã tiếp nhận từ nhà vườn, sẵn sàng để xuất bán và phát hành mã QR truy xuất.
                    </p>
                </div>
                <Link
                    href="/dashboard/partner/traceability"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition self-start sm:self-auto"
                >
                    <FileText className="h-4 w-4" />
                    Xuất Bán & Tạo QR
                </Link>
            </header>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((r) => {
                    const weight = Number(r.receivedWeight ?? r.actualWeight ?? r.expectedWeight);
                    return (
                        <article key={r.id} className="rounded-3xl border bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <PackageOpen className="h-5 w-5" />
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    r.status === "COMPLETED"
                                        ? "bg-slate-100 text-slate-700"
                                        : "bg-emerald-100 text-emerald-800"
                                }`}>
                                    {r.status === "COMPLETED" ? "Đã đóng lô" : "Đang lưu kho"}
                                </span>
                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase text-slate-400">Mã lô nguồn {r.code}</p>
                                <h2 className="mt-1 text-lg font-black text-slate-900">{r.farm.farmName}</h2>
                                <p className="mt-1 text-sm text-slate-600 font-medium">
                                    {r.farm.durianVariety} · <b>{weight.toLocaleString("vi-VN")} {r.weightUnit}</b>
                                </p>
                            </div>

                            <div className="border-t pt-3 flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    Tiếp nhận: {r.buyerReceivedAt ? new Date(r.buyerReceivedAt).toLocaleDateString("vi-VN") : "—"}
                                </span>
                                <Link
                                    href="/dashboard/partner/traceability"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                                >
                                    Xuất bán lô này <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </article>
                    );
                })}
                {!rows.length && (
                    <p className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500 md:col-span-2 xl:col-span-3">
                        Chưa có lô hàng nào. Lô sẽ xuất hiện sau khi xác nhận tiếp nhận từ nhà vườn.
                    </p>
                )}
            </div>
        </main>
    );
}
