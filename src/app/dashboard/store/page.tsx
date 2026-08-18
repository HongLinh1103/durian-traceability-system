import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    Building2,
    CheckCircle2,
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    DollarSign,
    Package,
    PackageCheck,
    Plus,
    Store,
    TrendingUp,
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
            createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: { subtotal: true, status: true },
    });

    const yesterdayOrders = await prisma.order.findMany({
        where: {
            storeId: store.id,
            deletedAt: null,
            createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        },
        select: { subtotal: true, status: true },
    });

    const todayRevenue = todayOrders
        .filter((o) => ["DELIVERED", "COMPLETED"].includes(o.status))
        .reduce((sum, o) => sum + Number(o.subtotal), 0);

    const todayCompletedCount = todayOrders.filter((o) => ["DELIVERED", "COMPLETED"].includes(o.status)).length;

    const yesterdayRevenue = yesterdayOrders
        .filter((o) => ["DELIVERED", "COMPLETED"].includes(o.status))
        .reduce((sum, o) => sum + Number(o.subtotal), 0);

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

    // 3. SẢN PHẨM ĐANG BÁN
    const approvedProductsCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, status: "APPROVED" },
    });

    const fertilizerCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, type: "FERTILIZER", status: "APPROVED" },
    });

    const pesticideCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, type: "PESTICIDE", status: "APPROVED" },
    });

    const otherProductsCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, status: { in: ["PENDING_REVIEW", "HIDDEN", "REJECTED"] } },
    });

    // 4. CẢNH BÁO TỒN KHO
    const lowStockCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, stock: { gt: 0, lte: 10 } },
    });

    const outOfStockCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null, stock: 0 },
    });

    const totalProductsCount = await prisma.storeProduct.count({
        where: { storeId: store.id, deletedAt: null },
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
        <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
            {/* 1. Header & Store Status */}
            <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
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
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        Chủ sở hữu: <b className="text-slate-700">{session.user.fullName || "Nguyễn Văn Minh"}</b> · Hotline: <b className="text-slate-700">{store.phone || session.user.phone}</b> · Địa chỉ: {store.address || "Vĩnh Cửu, Đồng Nai"}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-4 font-bold text-slate-700 hover:bg-slate-50 shadow-xs">
                        <Link href="/dashboard/store/inventory">
                            <Package className="mr-2 h-4 w-4 text-slate-500" />
                            Nhập kho vật tư
                        </Link>
                    </Button>
                    <Button asChild className="h-11 rounded-2xl bg-brand-600 px-5 font-bold text-white hover:bg-brand-700 shadow-soft">
                        <Link href="/dashboard/store/orders">
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Xem tất cả đơn
                        </Link>
                    </Button>
                </div>
            </header>

            {/* 2. BỐN CARD TRỌNG TÂM - TRẢ LỜI 4 CÂU HỎI CỐT LÕI (4-CARD EXECUTIVE OVERVIEW) */}
            <section aria-label="Chỉ số hoạt động trọng tâm" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* CARD 1: HÔM NAY BÁN ĐƯỢC BAO NHIÊU? */}
                <Link
                    href="/dashboard/store/finance"
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 p-5 shadow-xs transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                Doanh thu hôm nay
                            </span>
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 transition group-hover:scale-110">
                                <DollarSign className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                {todayRevenue.toLocaleString("vi-VN")} đ
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                            <span className="font-semibold text-emerald-700">
                                {todayCompletedCount} đơn hoàn tất
                            </span>
                            {revenueGrowthPercent !== null ? (
                                <span
                                    className={`inline-flex items-center font-bold ${
                                        revenueGrowthPercent >= 0 ? "text-emerald-700" : "text-amber-700"
                                    }`}
                                >
                                    · {revenueGrowthPercent >= 0 ? `+${revenueGrowthPercent}%` : `${revenueGrowthPercent}%`} so hôm qua
                                </span>
                            ) : (
                                <span className="text-slate-400">· Hôm qua: {yesterdayRevenue.toLocaleString("vi-VN")} đ</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-emerald-100/80 pt-3 text-xs font-bold text-emerald-700">
                        <span>Báo cáo tài chính</span>
                        <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                </Link>

                {/* CARD 2: CÓ ĐƠN NÀO CẦN XỬ LÝ? (CARD NỔI BẬT NHẤT - ACTION REQUIRED) */}
                <Link
                    href="/dashboard/store/orders"
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-xs transition hover:-translate-y-1 hover:shadow-md ${
                        actionableOrdersCount > 0
                            ? "border-amber-300 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white ring-2 ring-amber-400/20 hover:border-amber-400"
                            : "border-slate-200 bg-white hover:border-brand-300"
                    }`}
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                                {actionableOrdersCount > 0 && (
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                                    </span>
                                )}
                                Đơn cần xử lý
                            </span>
                            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl transition group-hover:scale-110 ${
                                actionableOrdersCount > 0 ? "bg-amber-200/80 text-amber-800" : "bg-slate-100 text-slate-600"
                            }`}>
                                <ClipboardList className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <span className={`text-2xl font-black tracking-tight sm:text-3xl ${
                                actionableOrdersCount > 0 ? "text-amber-950" : "text-slate-900"
                            }`}>
                                {actionableOrdersCount} đơn
                            </span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-600">
                            {actionableOrdersCount > 0 ? (
                                <span className="text-amber-800">
                                    {pendingCount} chờ xác nhận · {preparingCount} đang chuẩn bị hàng
                                </span>
                            ) : (
                                <span className="text-emerald-700">Tất cả đơn đã được xử lý xong 🎉</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-amber-200/60 pt-3 text-xs font-bold text-amber-800">
                        <span>{actionableOrdersCount > 0 ? "Xử lý đơn hàng ngay" : "Xem danh sách đơn"}</span>
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                </Link>

                {/* CARD 3: SẢN PHẨM ĐANG BÁN */}
                <Link
                    href="/dashboard/store/products"
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 p-5 shadow-xs transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                                Sản phẩm đang bán
                            </span>
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100/80 text-blue-700 transition group-hover:scale-110">
                                <PackageCheck className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                {approvedProductsCount} sản phẩm
                            </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                            <span className="font-semibold text-blue-700">
                                {fertilizerCount} phân bón · {pesticideCount} thuốc BVTV
                            </span>
                            {otherProductsCount > 0 && (
                                <span className="text-slate-400"> ({otherProductsCount} tạm ẩn)</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-blue-100/80 pt-3 text-xs font-bold text-blue-700">
                        <span>Quản lý sản phẩm</span>
                        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                </Link>

                {/* CARD 4: CẢNH BÁO TỒN KHO (HÀNG NÀO SẮP HẾT?) */}
                <Link
                    href="/dashboard/store/inventory"
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-xs transition hover:-translate-y-1 hover:shadow-md ${
                        lowStockCount > 0 || outOfStockCount > 0
                            ? "border-rose-200 bg-gradient-to-br from-white via-rose-50/20 to-rose-50/40 hover:border-rose-300"
                            : "border-slate-200 bg-white hover:border-brand-300"
                    }`}
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold uppercase tracking-wider ${
                                lowStockCount > 0 || outOfStockCount > 0 ? "text-rose-800" : "text-slate-700"
                            }`}>
                                Cảnh báo tồn kho
                            </span>
                            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl transition group-hover:scale-110 ${
                                lowStockCount > 0 || outOfStockCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                            }`}>
                                <AlertTriangle className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <span className={`text-2xl font-black tracking-tight sm:text-3xl ${
                                lowStockCount > 0 || outOfStockCount > 0 ? "text-rose-900" : "text-slate-900"
                            }`}>
                                {lowStockCount > 0 ? `${lowStockCount} hàng sắp hết` : "Tồn kho an toàn"}
                            </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                            {outOfStockCount > 0 ? (
                                <span className="font-bold text-rose-700">
                                    {outOfStockCount} sản phẩm đã hết hàng!
                                </span>
                            ) : (
                                <span>{totalProductsCount} mã hàng có tồn kho sẵn sàng</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-rose-700">
                        <span>Kiểm tra kho hàng</span>
                        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                </Link>
            </section>

            {/* 3. KHU VỰC 2 CỘT: CẢNH BÁO TỒN KHO & TỔNG QUAN TÀI CHÍNH */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Cột Trái: Cảnh báo hàng tồn kho thấp */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
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
                                    <div key={item.id} className="flex items-center justify-between py-3">
                                        <div className="max-w-[280px]">
                                            <div className="font-bold text-slate-900 text-sm truncate">{item.name}</div>
                                            <div className="text-xs text-slate-400">{item.brand || "Chính hãng"} · {item.unit}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                item.stock === 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
                                            }`}>
                                                Còn {item.stock} {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                        <Button asChild variant="outline" className="w-full rounded-2xl border-dashed border-slate-300 font-bold text-slate-700 hover:bg-slate-50">
                            <Link href="/dashboard/store/inventory">
                                <Plus className="mr-2 h-4 w-4" />
                                Tạo phiếu nhập kho bổ sung hàng
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Cột Phải: Tổng quan tài chính & công nợ 30 ngày qua */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
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

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                                <span className="text-xs text-slate-500 font-medium">Doanh thu 30 ngày</span>
                                <div className="mt-1 text-lg font-black text-slate-900">
                                    {revenue30Days.toLocaleString("vi-VN")} đ
                                </div>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                                <span className="text-xs text-emerald-800 font-medium">Lợi nhuận gộp</span>
                                <div className="mt-1 text-lg font-black text-emerald-800">
                                    {grossProfit30Days.toLocaleString("vi-VN")} đ
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-700">
                                    Biên gộp: {grossMarginPercent}%
                                </span>
                            </div>

                            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5">
                                <span className="text-xs text-amber-800 font-medium">Công nợ phải thu</span>
                                <div className="mt-1 text-lg font-black text-amber-900">
                                    {totalReceivable.toLocaleString("vi-VN")} đ
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                                <span className="text-xs text-slate-500 font-medium">Chi phí vận hành</span>
                                <div className="mt-1 text-lg font-black text-slate-900">
                                    {totalExpenses30Days.toLocaleString("vi-VN")} đ
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                        <Button asChild className="w-full rounded-2xl bg-emerald-700 hover:bg-emerald-800 font-bold text-white shadow-soft">
                            <Link href="/dashboard/store/finance">
                                Xem toàn bộ báo cáo doanh thu & lợi nhuận →
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 4. LỐI TẮT PHÂN HỆ QUẢN LÝ (QUICK NAVIGATION HUB) */}
            <section className="space-y-4">
                <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                    Lối tắt phân hệ quản trị
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {[
                        {
                            label: "Báo cáo Tài chính",
                            href: "/dashboard/store/finance",
                            icon: CircleDollarSign,
                            desc: "Doanh thu, LN, Thu chi",
                            color: "text-emerald-700 bg-emerald-50",
                        },
                        {
                            label: "Đơn hàng nông dân",
                            href: "/dashboard/store/orders",
                            icon: ClipboardList,
                            desc: "Xác nhận, chuẩn bị & giao",
                            color: "text-amber-700 bg-amber-50",
                        },
                        {
                            label: "Kho & Chứng từ",
                            href: "/dashboard/store/inventory",
                            icon: Package,
                            desc: "Phiếu nhập PN / xuất PX",
                            color: "text-blue-700 bg-blue-50",
                        },
                        {
                            label: "Danh mục sản phẩm",
                            href: "/dashboard/store/products",
                            icon: Store,
                            desc: "Phân bón, thuốc BVTV",
                            color: "text-purple-700 bg-purple-50",
                        },
                        {
                            label: "Hồ sơ cửa hàng",
                            href: "/dashboard/store/profile",
                            icon: Building2,
                            desc: "Pháp lý & Giấy phép",
                            color: "text-slate-700 bg-slate-100",
                        },
                    ].map((hub) => {
                        const Icon = hub.icon;
                        return (
                            <Link
                                key={hub.href}
                                href={hub.href}
                                className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-xs"
                            >
                                <div>
                                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${hub.color} transition group-hover:scale-110`}>
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-brand-700">
                                        {hub.label}
                                    </h3>
                                    <p className="mt-0.5 text-[11px] text-slate-500">{hub.desc}</p>
                                </div>
                                <span className="mt-3 inline-flex items-center text-[11px] font-bold text-brand-700 group-hover:underline">
                                    Mở →
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
