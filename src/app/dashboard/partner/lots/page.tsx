import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { 
    PackageOpen, 
    ArrowRight, 
    QrCode, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Warehouse, 
    Layers, 
    Building2,
    Calendar,
    Scale
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCompletedHarvestCollectionLots } from "@/lib/traceability";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "COLLECTOR") redirect("/login");

    const facility = await prisma.partnerFacility.findUnique({
        where: { ownerId: session.user.id },
    });

    if (!facility) redirect("/dashboard/partner");

    await ensureCompletedHarvestCollectionLots(session.user.id);

    // Fetch all collection lots of this collector facility
    const collectionLots = await prisma.collectionLot.findMany({
        where: { collectorFacilityId: facility.id },
        include: {
            items: {
                include: {
                    harvestLot: {
                        include: {
                            farm: { select: { farmName: true, durianVariety: true, province: true, address: true } },
                            harvestRecord: { select: { code: true, farmer: { select: { fullName: true, phone: true } } } },
                        },
                    },
                },
            },
            commercialLots: {
                select: {
                    id: true,
                    lotCode: true,
                    quantity: true,
                    unit: true,
                    productName: true,
                    buyerName: true,
                    totalAmount: true,
                    paidAmount: true,
                    debtAmount: true,
                    createdAt: true,
                    traceabilityCode: { select: { publicToken: true, status: true } },
                },
                orderBy: { createdAt: "desc" },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Vựa Thu Mua Nông Sản</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Quản Lý Lô Hàng Thu Mua</h1>
                    <p className="mt-1 text-slate-500">
                        {facility.name} · Theo dõi tồn kho các lô sầu riêng đã tiếp nhận từ nhà vườn và quản lý xuất bán
                    </p>
                </div>
                <Link
                    href="/dashboard/partner/traceability"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition self-start sm:self-auto"
                >
                    <FileText className="h-4 w-4" />
                    Xuất Bán & Tạo QR
                </Link>
            </header>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {collectionLots.map((lot) => {
                    const totalWeight = Number(lot.totalWeight || 0);
                    const remainingWeight = Number(lot.currentWeight || 0);
                    const dispatchedWeight = Math.max(0, totalWeight - remainingWeight);
                    const isSoldOut = remainingWeight <= 0 || lot.status === "USED";

                    const varieties = Array.from(
                        new Set(lot.items.map((i) => i.harvestLot?.farm?.durianVariety).filter(Boolean))
                    );
                    const farmNames = Array.from(
                        new Set(lot.items.map((i) => i.harvestLot?.farm?.farmName).filter(Boolean))
                    );

                    const percentRemaining = totalWeight > 0 ? Math.round((remainingWeight / totalWeight) * 100) : 0;

                    return (
                        <article
                            key={lot.id}
                            className={`rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md space-y-4 ${
                                isSoldOut ? "border-slate-200 bg-slate-50/50" : "border-emerald-100"
                            }`}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                                        isSoldOut ? "bg-slate-200 text-slate-600" : "bg-emerald-50 text-emerald-700"
                                    }`}>
                                        <Warehouse className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <span className="font-mono text-xs font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                            {lot.lotCode}
                                        </span>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {lot.createdAt ? new Date(lot.createdAt).toLocaleDateString("vi-VN") : "—"}
                                        </p>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                {isSoldOut ? (
                                    <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-bold text-slate-700 flex items-center gap-1 border border-slate-300">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                                        Đã hết (0 kg)
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1 border border-emerald-200">
                                        <Scale className="h-3.5 w-3.5 text-emerald-600" />
                                        Còn tồn kho ({percentRemaining}%)
                                    </span>
                                )}
                            </div>

                            {/* Product & Farm info */}
                            <div>
                                <h2 className="text-base font-black text-slate-900">
                                    {varieties.length > 0 ? `Sầu riêng ${varieties.join(", ")}` : "Sầu riêng tươi"}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                    Nguồn gốc: <b className="text-slate-800">{farmNames.join(", ") || "Các nhà vườn liên kết"}</b>
                                </p>
                            </div>

                            {/* Inventory Weights Breakdown */}
                            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-xs border border-slate-100">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Tổng nhập:</span>
                                    <span className="font-bold text-slate-800">
                                        {totalWeight.toLocaleString("vi-VN")} kg
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Đã xuất:</span>
                                    <span className="font-bold text-slate-800">
                                        {dispatchedWeight.toLocaleString("vi-VN")} kg
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Còn tồn:</span>
                                    <span className={`font-black ${isSoldOut ? "text-slate-400" : "text-emerald-700"}`}>
                                        {remainingWeight.toLocaleString("vi-VN")} kg
                                    </span>
                                </div>
                            </div>

                            {/* Dispatched History count */}
                            {lot.commercialLots.length > 0 && (
                                <div className="text-[11px] text-slate-500">
                                    Đã lập <b>{lot.commercialLots.length}</b> phiếu xuất bán từ lô này
                                </div>
                            )}

                            {/* Card Footer Actions */}
                            <div className="border-t pt-3 flex items-center justify-between">
                                {isSoldOut ? (
                                    <>
                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                            Đã xuất bán hết
                                        </span>
                                        <Link
                                            href="/dashboard/partner/traceability"
                                            className="text-xs font-bold text-slate-600 hover:text-emerald-700 underline"
                                        >
                                            Xem phiếu & mã QR
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xs font-bold text-emerald-700">
                                            Khả dụng: <b>{remainingWeight.toLocaleString("vi-VN")} kg</b>
                                        </span>
                                        <Link
                                            href={`/dashboard/partner/traceability?sourceId=${lot.id}`}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
                                        >
                                            Xuất bán lô này <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </>
                                )}
                            </div>
                        </article>
                    );
                })}

                {!collectionLots.length && (
                    <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500 md:col-span-2 xl:col-span-3">
                        <PackageOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p className="font-bold text-slate-700">Chưa có lô hàng thu mua nào trong kho.</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Lô hàng sẽ tự động tạo sau khi vựa xác nhận tiếp nhận nông sản từ nhà vườn.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
