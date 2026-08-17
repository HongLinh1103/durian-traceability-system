"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
    Bell,
    BookOpenCheck,
    ClipboardList,
    Home,
    LandPlot,
    LibraryBig,
    MapPinned,
    NotebookPen,
    Package,
    Plus,
    ShoppingBag,
    Store,
    UserRound,
    Users,
    Wheat,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
    label: string;
    href: string;
    icon: typeof Home;
    matches?: string[];
};

type QuickAction = {
    label: string;
    description: string;
    href: string;
    icon: typeof Home;
};

const navigationByRole: Record<string, { items: NavItem[]; actions: QuickAction[] }> = {
    FARMER: {
        items: [
            { label: "Trang chủ", href: "/dashboard/farmer", icon: Home },
            { label: "Vật tư", href: "/materials", icon: ShoppingBag, matches: ["/materials", "/cart", "/orders"] },
            { label: "Nhật ký", href: "/dashboard/farmer/journal", icon: NotebookPen, matches: ["/dashboard/farmer/journal", "/dashboard/farmer/logs"] },
            { label: "Cá nhân", href: "/account", icon: UserRound },
        ],
        actions: [
            { label: "Ghi nhật ký canh tác", description: "Ghi hoạt động vừa thực hiện tại vườn", href: "/dashboard/farmer/logs/new", icon: NotebookPen },
            { label: "Ghi nhận thời tiết", description: "Lưu điều kiện thời tiết thực tế", href: "/dashboard/farmer/journal?tab=weather", icon: BookOpenCheck },
            { label: "Thêm kế hoạch", description: "Lên lịch công việc sắp thực hiện", href: "/dashboard/farmer/plans", icon: ClipboardList },
            { label: "Tạo phiếu thu hoạch", description: "Khai báo đợt thu hoạch mới", href: "/harvests/new", icon: Wheat },
        ],
    },
    ADMIN: {
        items: [
            { label: "Tổng quan", href: "/dashboard/admin", icon: Home },
            { label: "Tài khoản", href: "/dashboard/admin/accounts", icon: Users },
            { label: "Canh tác", href: "/dashboard/admin/farming", icon: LandPlot },
            { label: "Cá nhân", href: "/account", icon: UserRound },
        ],
        actions: [
            { label: "Tài liệu", description: "Quản lý và đăng tài liệu mới", href: "/documents", icon: BookOpenCheck },
            { label: "Tin tức", description: "Quản lý và đăng tin tức mới", href: "/dashboard/admin/news", icon: Bell },
            { label: "Danh mục", description: "Quản lý cây giống, giai đoạn, công việc và danh mục cấm", href: "/dashboard/admin/catalog", icon: LibraryBig },
        ],
    },
    AREA_MANAGER: {
        items: [
            { label: "Tổng quan", href: "/dashboard/area-manager", icon: Home },
            { label: "Vườn trồng", href: "/region-manager/gardens", icon: MapPinned },
            { label: "Nông dân", href: "/region-manager/farmers", icon: Users },
            { label: "Cá nhân", href: "/account", icon: UserRound },
        ],
        actions: [
            { label: "Quản lý vườn trồng", description: "Xem danh sách và hồ sơ vườn", href: "/region-manager/gardens", icon: MapPinned },
            { label: "Hồ sơ nông dân", description: "Duyệt hồ sơ thuộc vùng trồng", href: "/region-manager/farmers", icon: Users },
            { label: "Vật tư nông nghiệp", description: "Tra cứu sản phẩm và cửa hàng", href: "/materials", icon: ShoppingBag },
        ],
    },
    STORE_OWNER: {
        items: [
            { label: "Tổng quan", href: "/dashboard/store", icon: Home },
            { label: "Sản phẩm", href: "/dashboard/store/products", icon: Store },
            { label: "Đơn hàng", href: "/dashboard/store/orders", icon: ClipboardList },
            { label: "Cá nhân", href: "/account", icon: UserRound },
        ],
        actions: [
            { label: "Quản lý sản phẩm", description: "Thêm và cập nhật sản phẩm", href: "/dashboard/store/products", icon: Store },
            { label: "Nhập kho", description: "Cập nhật tồn kho vật tư", href: "/dashboard/store/inventory", icon: Package },
            { label: "Xử lý đơn hàng", description: "Kiểm tra các đơn hàng mới", href: "/dashboard/store/orders", icon: ClipboardList },
        ],
    },
    COLLECTOR: {
        items: [
            { label: "Tổng quan", href: "/dashboard/partner", icon: Home },
            { label: "Thu hoạch", href: "/dashboard/partner/harvests", icon: Wheat },
            { label: "Thông báo", href: "/dashboard/partner/notifications", icon: Bell },
            { label: "Cá nhân", href: "/account", icon: UserRound },
        ],
        actions: [
            { label: "Phiếu thu hoạch", description: "Theo dõi phiếu từ các vườn", href: "/dashboard/partner/harvests", icon: Wheat },
            { label: "Đơn thu mua", description: "Quản lý các đơn thu mua", href: "/dashboard/partner/orders", icon: ClipboardList },
            { label: "Lô hàng", description: "Theo dõi lô hàng truy xuất", href: "/dashboard/partner/lots", icon: Package },
        ],
    },
    PROCESSING_FACILITY: {
        items: [
            { label: "Tổng quan", href: "/dashboard/partner/harvests", icon: Home },
            { label: "Tài liệu", href: "/documents", icon: BookOpenCheck },
            { label: "Tin tức", href: "/news", icon: ClipboardList },
            { label: "Cá nhân", href: "/account", icon: UserRound },
        ],
        actions: [
            { label: "Phiếu thu hoạch", description: "Theo dõi phiếu được chuyển đến", href: "/dashboard/partner/harvests", icon: Wheat },
            { label: "Tài liệu hướng dẫn", description: "Tra cứu tài liệu hệ thống", href: "/documents", icon: BookOpenCheck },
        ],
    },
};

export function MobileBottomNavigation() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [actionsOpen, setActionsOpen] = useState(false);
    const isAuthPage = pathname === "/login" || pathname.startsWith("/register");
    const configuration = session?.user?.role ? navigationByRole[session.user.role] : undefined;

    useEffect(() => setActionsOpen(false), [pathname]);
    useEffect(() => {
        if (!actionsOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, [actionsOpen]);

    if (!configuration || isAuthPage) return null;

    const isActive = (item: NavItem) => (item.matches ?? [item.href]).some(match => pathname === match || pathname.startsWith(`${match}/`));
    const [first, second, third, fourth] = configuration.items;
    const isAdmin = session?.user?.role === "ADMIN";
    const actionMenuLabel = isAdmin ? "Mở rộng" : "Tạo mới";

    return (
        <>
            <div aria-hidden className="h-[calc(7rem+env(safe-area-inset-bottom))] xl:hidden" />
            <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:hidden" aria-label="Điều hướng mobile">
                <div className="grid h-[76px] grid-cols-5 items-end px-1">
                    <BottomItem item={first} active={isActive(first)} />
                    <BottomItem item={second} active={isActive(second)} />
                    <button type="button" onClick={() => setActionsOpen(true)} className="group flex h-full flex-col items-center justify-end gap-1 pb-2" aria-label={isAdmin ? "Mở thêm chức năng quản trị" : "Mở tác vụ nhanh"}>
                        <span className="grid h-16 w-16 -translate-y-3 place-items-center rounded-full border-[5px] border-white bg-brand-600 text-white shadow-lg transition group-active:scale-95">
                            <Plus className="h-8 w-8" strokeWidth={2.5} />
                        </span>
                        <span className="-mt-3 text-[11px] font-bold text-brand-700">{actionMenuLabel}</span>
                    </button>
                    <BottomItem item={third} active={isActive(third)} />
                    <BottomItem item={fourth} active={isActive(fourth)} />
                </div>
            </nav>

            {actionsOpen && (
                <div className="fixed inset-0 z-[120] flex items-end bg-slate-950/45 backdrop-blur-sm xl:hidden" role="dialog" aria-modal="true" aria-label="Tác vụ nhanh" onMouseDown={event => { if (event.target === event.currentTarget) setActionsOpen(false); }}>
                    <section className="w-full rounded-t-[28px] bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
                        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
                        <div className="mb-4 mt-3 flex items-center justify-between">
                            <div><p className="text-xs font-bold uppercase tracking-wider text-brand-600">{isAdmin ? "Chức năng mở rộng" : "Tác vụ nhanh"}</p><h2 className="mt-1 text-xl font-black text-slate-900">Bạn muốn làm gì?</h2></div>
                            <button type="button" onClick={() => setActionsOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600" aria-label="Đóng tác vụ nhanh"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {configuration.actions.map(action => {
                                const Icon = action.icon;
                                return <Link key={action.label} href={action.href} onClick={() => setActionsOpen(false)} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 transition active:bg-brand-50"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><Icon className="h-5 w-5" /></span><span className="min-w-0"><b className="block text-sm text-slate-900">{action.label}</b><span className="mt-0.5 block text-xs leading-snug text-slate-500">{action.description}</span></span></Link>;
                            })}
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

function BottomItem({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return <Link href={item.href} className={cn("flex h-full min-w-0 flex-col items-center justify-end gap-1 pb-2 text-slate-400 transition", active && "text-brand-700")}><Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} /><span className={cn("max-w-full truncate text-[10px] font-semibold", active && "font-bold")}>{item.label}</span></Link>;
}
