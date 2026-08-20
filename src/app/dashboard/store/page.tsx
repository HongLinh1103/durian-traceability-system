import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    DollarSign,
    MapPin,
    PackageCheck,
    Phone,
    Plus,
    Store,
    TrendingUp,
    UserCheck,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan Quản lý Cửa hàng | TriViet" };

export default async function StoreDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
        redirect("/login?callbackUrl=/dashboard/store");
    }

    const store = await prisma.store.findFirst({
        where: { ownerId: session.user.id, deletedAt: null },
    });

    if (!store) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-12 text-center">
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <Store className="mx-auto h-12 w-12 text-slate-400" />
                    <h1 className="mt-4 text-2xl font-bold text-slate-900">Chưa tìm thấy cửa hàng</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Tài khoản của bạn chưa được liên kết với cửa hàng vật tư nào.
                    </p>
                </div>
            </main>
        );
    }

    // Reference dates for Today & Yesterday
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);

    // 1. DOANH THU HÔM NAY & SO SÁNH HÔM QUA
    const todayOrders = await prisma.order.findMany({
        where: {
            storeId: store.id,
            deletedAt: null,
            status: { in: ["DELIVERED", "COMPLETED"] },
            OR: [
                { updatedAt: { gte: todayStart, lte: todayEnd } },
                { createdAt: { gte: todayStart, lte: todayEnd } },
                {
                    histories: {
                        some: {
                            toStatus: { in: ["DELIVERED", "COMPLETED"] },
                            createdAt: { gte: todayStart, lte: todayEnd },
                        },
                    },
                },
            ],
        },
        select: { subtotal: true, status: true },
    });

    const yesterdayOrders = await prisma.order.findMany({
        where: {
            storeId: store.id,
            deletedAt: null,
            status: { in: ["DELIVERED", "COMPLETED"] },
            OR: [
                { updatedAt: { gte: yesterdayStart, lte: yesterdayEnd } },
                { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
                {
                    histories: {
                        some: {
                            toStatus: { in: ["DELIVERED", "COMPLETED"] },
                            createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
                        },
                    },
                },
            ],
        },
        select: { subtotal: true, status: true },
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

    const todayCompletedCount = todayOrders.length;

    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

    let revenueGrowthPercent: number | null = null;
    if (yesterdayRevenue > 0) {
        revenueGrowthPercent = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10;
    }

    // 2. ĐƠN HÀNG CẦN XỬ LÝ (CHỜ XÁC NHẬN + ĐANG CHUẨN BỊ)
    const pendingCount = await prisma.order.count({
        where: { storeId: store.id, deletedAt: null, status: "PENDING" },
    });

    const preparingCount = await prisma.order.count({
        where: {
            storeId: store.id,
            deletedAt: null,
            status: { in: ["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY"] },
        },
    });

    const actionableOrdersCount = pendingCount + preparingCount;

    // 3. SẢN PHẨM CỬA HÀNG (TỔNG DANH MỤC & TRẠNG THÁI)
    const totalProductsCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null },
    });

    const approvedProductsCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, status: "APPROVED" },
    });

    const otherProductsCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, status: { not: "APPROVED" } },
    });

    // 4. CẢNH BÁO TỒN KHO
    const lowStockCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, stock: { gt: 0, lte: 10 } },
    });

    const outOfStockCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, stock: 0 },
    });


    // Top 5 Low Stock Products
    const lowStockItems = await prisma.storeProduct.findMany({
        where: { storeId: store.id, deletedAt: null, stock: { lte: 10 } },
        orderBy: { stock: "asc" },
        take: 5,
    });

    // 5. TÀI CHÍNH 30 NGÀY QUA (SNAPSHOT NHANH)
    const orders30Days = await prisma.order.findMany({
        where: {
            storeId: store.id,
            deletedAt: null,
            createdAt: { gte: thirtyDaysAgo },
        },
        include: { items: true },
    });

    let revenue30Days = 0;
    let cogs30Days = 0;
    let totalReceivable = 0;

    for (const ord of orders30Days) {
        const isFinished = ["DELIVERED", "COMPLETED"].includes(ord.status);
        const sub = Number(ord.subtotal);
        if (isFinished) {
            revenue30Days += sub;
            for (const itm of ord.items) {
                cogs30Days += Number(itm.costPrice || Number(itm.unitPrice) * 0.7) * itm.quantity;
            }
        }
        if (ord.paymentStatus !== "PAID" && !["CANCELLED", "REJECTED"].includes(ord.status)) {
            const due = sub + Number(ord.shippingFee) - Number(ord.paidAmount || 0);
            if (due > 0) totalReceivable += due;
        }
    }

    const grossProfit30Days = revenue30Days - cogs30Days;
    const grossMarginPercent = revenue30Days > 0 ? Math.round((grossProfit30Days / revenue30Days) * 1000) / 10 : 0;

    const expenses30Days = await prisma.storeExpense.aggregate({
        where: { storeId: store.id, expenseDate: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
    });
    const totalExpenses30Days = Number(expenses30Days._sum.amount || 0);

    return (
        <main className="mx-auto max-w-7xl space-y-6 sm:space-y-8 px-3.5 py-5 sm:px-6 sm:py-8">
            {/* 1. Header & Store Status */}
            <header className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-700">
                            <Store className="h-3.5 w-3.5" />
                            Cửa hàng Vật tư Nông nghiệp
                        </span>
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 font-bold">
                            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                            {store.status === "APPROVED" ? "Đang hoạt động" : store.status}
                        </Badge>
                    </div>
                    <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                        {store.name}
                    </h1>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 sm:text-sm">
                        <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>Chủ sở hữu: <b className="text-slate-800">{session.user.fullName || "Nguyễn Văn Minh"}</b></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>Hotline: <b className="text-slate-800">{store.phone || session.user.phone}</b></span>
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>Địa chỉ: <span className="text-slate-700">{store.address || "Số 88 Quốc Lộ 1A, Xã Trị An, Huyện Vĩnh Cửu, Tỉnh Đồng Nai"}</span></span>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. BỐN CARD TRỌNG TÂM - 2 CARD/HÀNG (LƯỚI 2 CỘT GỌN GÀNG, KHÔNG XÔ LỆCH) */}
            <section aria-label="Chỉ số hoạt động trọng tâm" className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* CARD 1: DOANH THU HÔM NAY */}
                <Link
                    href="/dashboard/store/finance"
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 p-4 sm:p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md min-h-[140px] sm:min-h-[150px]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-emerald-800">
                                Doanh thu hôm nay
                            </span>
                            <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 flex items-baseline gap-1">
                                <span className="tabular-nums">{todayRevenue.toLocaleString("vi-VN")}</span>
                                <span className="text-xs sm:text-sm font-bold text-slate-500">đ</span>
                            </div>
                        </div>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 transition group-hover:scale-110 shadow-xs">
                            <DollarSign className="h-5 w-5" />
                        </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-emerald-100/60 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                        <span className="font-semibold text-emerald-700 whitespace-nowrap">{todayCompletedCount} đơn hoàn tất</span>
                        {revenueGrowthPercent !== null ? (
                            <span className={`inline-flex items-center font-bold whitespace-nowrap ${revenueGrowthPercent >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                                · {revenueGrowthPercent >= 0 ? `+${revenueGrowthPercent}%` : `${revenueGrowthPercent}%`} so với hôm qua
                            </span>
                        ) : (
                            <span className="text-slate-400 whitespace-nowrap">· Hôm qua: {yesterdayRevenue.toLocaleString("vi-VN")} đ</span>
                        )}
                    </div>
                </Link>

                {/* CARD 2: ĐƠN HÀNG CẦN XỬ LÝ */}
                <Link
                    href="/dashboard/store/orders"
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md min-h-[140px] sm:min-h-[150px] ${actionableOrdersCount > 0
                        ? "border-amber-300 bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white ring-1 ring-amber-400/20 hover:border-amber-400"
                        : "border-slate-200 bg-white hover:border-brand-300"
                        }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wide text-amber-900">
                                {actionableOrdersCount > 0 && (
                                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                                    </span>
                                )}
                                Đơn hàng cần xử lý
                            </span>
                            <div className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight ${actionableOrdersCount > 0 ? "text-amber-950" : "text-slate-900"}`}>
                                {actionableOrdersCount} <span className="text-xs sm:text-sm font-semibold text-slate-500">đơn</span>
                            </div>
                        </div>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-110 shadow-xs ${actionableOrdersCount > 0 ? "bg-amber-200/90 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                            <ClipboardList className="h-5 w-5" />
                        </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-200/40 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-600">
                        {actionableOrdersCount > 0 ? (
                            <span className="text-amber-900">
                                {pendingCount} chờ xác nhận · {preparingCount} đang chuẩn bị hàng
                            </span>
                        ) : (
                            <span className="text-emerald-700">Tất cả đơn đã được xử lý xong 🎉</span>
                        )}
                    </div>
                </Link>

                {/* CARD 3: DANH MỤC SẢN PHẨM */}
                <Link
                    href="/dashboard/store/products"
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 p-4 sm:p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md min-h-[140px] sm:min-h-[150px]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-blue-800">
                                Danh mục sản phẩm
                            </span>
                            <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                                {totalProductsCount} <span className="text-xs sm:text-sm font-semibold text-slate-500">sản phẩm</span>
                            </div>
                        </div>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100/80 text-blue-700 transition group-hover:scale-110 shadow-xs">
                            <PackageCheck className="h-5 w-5" />
                        </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-100/60 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                        <span className="font-semibold text-emerald-700">{approvedProductsCount} đang mở bán</span>
                        {otherProductsCount > 0 && <span className="text-slate-500"> · {otherProductsCount} nháp / tạm ẩn</span>}
                    </div>
                </Link>

                {/* CARD 4: CẢNH BÁO TỒN KHO */}
                <Link
                    href="/dashboard/store/inventory"
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md min-h-[140px] sm:min-h-[150px] ${lowStockCount > 0 || outOfStockCount > 0
                        ? "border-rose-200 bg-gradient-to-br from-white via-rose-50/20 to-rose-50/40 hover:border-rose-300"
                        : "border-slate-200 bg-white hover:border-brand-300"
                        }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                            <span className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${lowStockCount > 0 || outOfStockCount > 0 ? "text-rose-800" : "text-slate-700"}`}>
                                Cảnh báo tồn kho
                            </span>
                            <div className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight ${lowStockCount > 0 || outOfStockCount > 0 ? "text-rose-900" : "text-slate-900"}`}>
                                {lowStockCount > 0 ? `${lowStockCount} hàng sắp hết` : "Tồn kho an toàn"}
                            </div>
                        </div>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-110 shadow-xs ${lowStockCount > 0 || outOfStockCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                            <AlertTriangle className="h-5 w-5" />
                        </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-rose-100/60 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                        {outOfStockCount > 0 ? (
                            <span className="font-bold text-rose-700">{outOfStockCount} sản phẩm đã hết hàng!</span>
                        ) : (
                            <span>{totalProductsCount} mã hàng có tồn kho sẵn sàng</span>
                        )}
                    </div>
                </Link>
            </section>

            {/* 3. KHU VỰC 2 CỘT: CẢNH BÁO TỒN KHO & TỔNG QUAN TÀI CHÍNH */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Cột Trái: Cảnh báo hàng tồn kho thấp */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                    <AlertTriangle className="h-5 w-5" />
                                </span>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">Cảnh báo tồn kho</h3>
                                    <p className="text-xs text-slate-500">Mặt hàng có số lượng còn lại ít (&le; 10 bao/chai)</p>
                                </div>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="font-bold text-brand-700 text-xs">
                                <Link href="/dashboard/store/inventory">Kho hàng →</Link>
                            </Button>
                        </div>

                        {lowStockItems.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-500">
                                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                                <p className="mt-2 font-semibold text-slate-700">Tồn kho dồi dào, không có mặt hàng nào sắp hết.</p>
                            </div>
                        ) : (
                            <div className="mt-4 divide-y divide-slate-100">
                                {lowStockItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-3 gap-2">
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="font-bold text-slate-900 text-sm truncate">{item.name}</div>
                                            <div className="text-xs text-slate-400">{item.brand || "Chính hãng"} · {item.unit}</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 text-right">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${item.stock === 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
                                                }`}>
                                                Còn {item.stock} {item.unit}
                                            </span>
                                            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80 rounded-xl">
                                                <Link href={`/dashboard/store/inventory?tab=create&action=restock&productId=${encodeURIComponent(item.id)}#warehouse-document-form`}>
                                                    Nhập +
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                        <Button asChild variant="outline" className="w-full rounded-2xl border-dashed border-slate-300 font-bold text-slate-700 hover:bg-slate-50">
                            <Link href="/dashboard/store/inventory?tab=create&action=restock#warehouse-document-form">
                                <Plus className="mr-2 h-4 w-4" />
                                Tạo phiếu nhập kho bổ sung hàng
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Cột Phải: Tổng quan tài chính & công nợ 30 ngày qua */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <TrendingUp className="h-5 w-5" />
                                </span>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">Tài chính 30 ngày qua</h3>
                                    <p className="text-xs text-slate-500">Tóm tắt kết quả kinh doanh tháng gần nhất</p>
                                </div>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="font-bold text-brand-700 text-xs">
                                <Link href="/dashboard/store/finance">Chi tiết →</Link>
                            </Button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5">
                                <span className="text-xs text-slate-500 font-medium line-clamp-1">Doanh thu 30 ngày</span>
                                <div className="mt-1 text-sm sm:text-base lg:text-lg font-black text-slate-900 whitespace-nowrap tracking-tight">
                                    {revenue30Days.toLocaleString("vi-VN")}&nbsp;đ
                                </div>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-3.5">
                                <span className="text-xs text-emerald-800 font-medium line-clamp-1">Lợi nhuận gộp</span>
                                <div className="mt-1 text-sm sm:text-base lg:text-lg font-black text-emerald-800 whitespace-nowrap tracking-tight">
                                    {grossProfit30Days.toLocaleString("vi-VN")}&nbsp;đ
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
                                    Biên gộp: {grossMarginPercent}%
                                </span>
                            </div>

                            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3 sm:p-3.5">
                                <span className="text-xs text-amber-800 font-medium line-clamp-1">Công nợ phải thu</span>
                                <div className="mt-1 text-sm sm:text-base lg:text-lg font-black text-amber-900 whitespace-nowrap tracking-tight">
                                    {totalReceivable.toLocaleString("vi-VN")}&nbsp;đ
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5">
                                <span className="text-xs text-slate-500 font-medium line-clamp-1">Chi phí vận hành</span>
                                <div className="mt-1 text-sm sm:text-base lg:text-lg font-black text-slate-900 whitespace-nowrap tracking-tight">
                                    {totalExpenses30Days.toLocaleString("vi-VN")}&nbsp;đ
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                        <Button asChild className="w-full h-11 rounded-2xl bg-emerald-700 hover:bg-emerald-800 font-bold text-white shadow-soft">
                            <Link href="/dashboard/store/finance" className="flex items-center justify-center gap-1.5 whitespace-nowrap px-2 text-xs sm:text-sm">
                                <span>Xem toàn bộ báo cáo doanh thu & lợi nhuận</span>

                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
