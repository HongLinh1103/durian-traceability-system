"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
    Bell,
    Boxes,
    BookOpenCheck,
    Cog,
    ClipboardList,
    Factory,
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
    badgeKey?: string;
};

type QuickAction = {
    label: string;
    description: string;
    href: string;
    icon: typeof Home;
};

type RoleNavigation = {
    items: NavItem[];
    actions?: QuickAction[];
};

const navigationByRole: Record<string, RoleNavigation> = {
    FARMER: {
        items: [
            { label: "Tổng quan", href: "/dashboard/farmer", icon: Home },
            { label: "Nhật ký", href: "/dashboard/farmer/journal", icon: NotebookPen, matches: ["/dashboard/farmer/journal", "/dashboard/farmer/logs"] },
            { label: "Phiếu thu hoạch", href: "/dashboard/farmer/harvests", icon: Wheat, matches: ["/dashboard/farmer/harvests", "/harvests"] },
            { label: "Cá nhân", href: "/account", icon: UserRound },
        ],
        actions: [
            { label: "Tài liệu", description: "Tra cứu tài liệu kỹ thuật canh tác", href: "/documents", icon: BookOpenCheck },
            { label: "Tin tức", description: "Theo dõi bản tin nông nghiệp mới", href: "/news", icon: Bell },
            { label: "Vật tư", description: "Mua vật tư và theo dõi đơn hàng", href: "/materials", icon: ShoppingBag },
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
            { label: "Tài liệu", description: "Tra cứu tài liệu hướng dẫn và quy trình", href: "/documents", icon: BookOpenCheck },
            { label: "Tin tức", description: "Theo dõi tin tức nông nghiệp mới", href: "/news", icon: Bell },
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
            { label: "Tài liệu", description: "Tra cứu tài liệu vận hành cửa hàng", href: "/documents", icon: BookOpenCheck },
            { label: "Tin tức", description: "Theo dõi cập nhật thị trường vật tư", href: "/news", icon: Bell },
            { label: "Kho hàng", description: "Nhập kho và quản lý tồn kho", href: "/dashboard/store/inventory", icon: Package },
        ],
    },
    COLLECTOR: {
        items: [
            { label: "Tổng quan", href: "/dashboard/partner", icon: Home },
            { label: "Phiếu thu hoạch", href: "/dashboard/partner/harvests", icon: Wheat, badgeKey: "collectorHarvests" },
            { label: "Đơn thu mua", href: "/dashboard/partner/orders", icon: ClipboardList, badgeKey: "collectorOrders" },
            { label: "Lô hàng", href: "/dashboard/partner/lots", icon: Package, badgeKey: "collectorLots" },
            { label: "Tài chính", href: "/dashboard/partner/finance", icon: LandPlot },
        ],
    },
    PROCESSING_FACILITY: {
        items: [
            { label: "Tổng quan", href: "/dashboard/processing", icon: Factory },
            { label: "Nguyên liệu", href: "/dashboard/processing/raw-materials", icon: Boxes, badgeKey: "processingIncoming" },
            { label: "Chế biến", href: "/dashboard/processing/processing", icon: Cog },
            { label: "Thành phẩm", href: "/dashboard/processing/finished-products", icon: Package },
            { label: "Cá nhân", href: "/account", icon: UserRound },
        ],
    },
};

export function MobileBottomNavigation() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [actionsOpen, setActionsOpen] = useState(false);
    const [badges, setBadges] = useState<Record<string, number>>({});
    const isAuthPage = pathname === "/login" || pathname.startsWith("/register");
    const configuration = session?.user?.role ? navigationByRole[session.user.role] : undefined;

    useEffect(() => setActionsOpen(false), [pathname]);
    useEffect(() => {
        if (!actionsOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, [actionsOpen]);

    useEffect(() => {
        const role = session?.user?.role;
        if (!role) {
            setBadges({});
            return;
        }

        let cancelled = false;
        const fetchBadges = async () => {
            try {
                if (role === "COLLECTOR") {
                    const response = await fetch("/api/harvests", { cache: "no-store" });
                    const payload = await response.json();
                    if (!payload.success || cancelled) return;
                    const rows = payload.data ?? [];
                    const collectorHarvests = rows.filter((item: { status: string }) => item.status === "WAITING_CONFIRMATION").length;
                    const collectorOrders = rows.filter((item: { status: string }) => ["CONFIRMED", "HARVESTING", "HARVESTED"].includes(item.status)).length;
                    const collectorLots = rows.filter((item: { status: string }) => item.status === "DELIVERY_CONFIRMED").length;
                    setBadges({ collectorHarvests, collectorOrders, collectorLots });
                    return;
                }

                if (role === "PROCESSING_FACILITY") {
                    const response = await fetch("/api/harvests", { cache: "no-store" });
                    const payload = await response.json();
                    if (!payload.success || cancelled) return;
                    const rows = payload.data ?? [];
                    const processingIncoming = rows.filter((item: { status: string }) => ["WAITING_CONFIRMATION", "CONFIRMED", "HARVESTING"].includes(item.status)).length;
                    setBadges({ processingIncoming });
                    return;
                }

                setBadges({});
            } catch {
                // Badge fetch is non-blocking.
            }
        };

        void fetchBadges();
        const interval = window.setInterval(fetchBadges, 60_000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [session?.user?.role]);

    if (!configuration || isAuthPage) return null;

    const isActive = (item: NavItem) => (item.matches ?? [item.href]).some(match => pathname === match || pathname.startsWith(`${match}/`));
    const [first, second, third, fourth] = configuration.items;
    const hasQuickActions = Boolean(configuration.actions?.length);
    const isAdmin = session?.user?.role === "ADMIN";
    const isExpansionMenu = isAdmin || session?.user?.role === "AREA_MANAGER";
    const badgeFor = (item: NavItem) => {
        if (!item.badgeKey) return 0;
        return badges[item.badgeKey] ?? 0;
    };

    return (
        <>
            <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:hidden" aria-label="Điều hướng mobile">
                {hasQuickActions ? (
                    <div className="grid h-[76px] grid-cols-5 items-end px-1">
                        <BottomItem item={first} active={isActive(first)} badgeCount={badgeFor(first)} />
                        <BottomItem item={second} active={isActive(second)} badgeCount={badgeFor(second)} />
                        <button type="button" onClick={() => setActionsOpen(true)} className="group flex h-full flex-col items-center justify-end gap-1 pb-2" aria-label={isExpansionMenu ? "Mở thêm chức năng" : "Mở tác vụ nhanh"}>
                            <span className="grid h-16 w-16 -translate-y-3 place-items-center rounded-full border-[5px] border-white bg-brand-600 text-white shadow-lg transition group-active:scale-95">
                                <Plus className="h-8 w-8" strokeWidth={2.5} />
                            </span>
                            {!isExpansionMenu && <span className="-mt-3 text-[11px] font-bold text-brand-700">Mở nhanh</span>}
                        </button>
                        <BottomItem item={third} active={isActive(third)} badgeCount={badgeFor(third)} />
                        <BottomItem item={fourth} active={isActive(fourth)} badgeCount={badgeFor(fourth)} />
                    </div>
                ) : (
                    <div className="grid h-[76px] grid-cols-5 items-end px-1">
                        {configuration.items.map(item => <BottomItem key={item.href} item={item} active={isActive(item)} badgeCount={badgeFor(item)} />)}
                    </div>
                )}
            </nav>

            {hasQuickActions && actionsOpen && (
                <div className="fixed inset-0 z-[120] flex items-end bg-slate-950/45 backdrop-blur-sm xl:hidden" role="dialog" aria-modal="true" aria-label="Tác vụ nhanh" onMouseDown={event => { if (event.target === event.currentTarget) setActionsOpen(false); }}>
                    <section className="w-full rounded-t-[28px] bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
                        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
                        <div className="mb-4 mt-3 flex items-center justify-between">
                            <div><p className="text-xs font-bold uppercase tracking-wider text-brand-600">{isExpansionMenu ? "Chức năng mở rộng" : "Tác vụ nhanh"}</p><h2 className="mt-1 text-xl font-black text-slate-900">Bạn muốn làm gì?</h2></div>
                            <button type="button" onClick={() => setActionsOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600" aria-label="Đóng tác vụ nhanh"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {configuration.actions?.map(action => {
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

function BottomItem({ item, active, badgeCount = 0 }: { item: NavItem; active: boolean; badgeCount?: number }) {
    const Icon = item.icon;
    return <Link href={item.href} className={cn("relative flex h-full min-w-0 flex-col items-center justify-end gap-1 pb-2 text-slate-400 transition", active && "text-brand-700")}><Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />{badgeCount > 0 && <span className="absolute right-3 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{badgeCount > 9 ? "9+" : badgeCount}</span>}<span className={cn("max-w-full truncate text-[10px] font-semibold", active && "font-bold")}>{item.label}</span></Link>;
}
