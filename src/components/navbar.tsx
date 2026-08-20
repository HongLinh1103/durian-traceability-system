"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useState } from "react";
import { ChevronDown, Leaf, LogIn, LogOut, Menu, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const publicLinks = [
    { href: "/", label: "Trang chủ" },
    { href: "/documents", label: "Tài liệu", notificationKey: "documents" as const },
    { href: "/news", label: "Tin tức", notificationKey: "news" as const },
];

type DashboardLink = {
    href: string;
    label: string;
    roles: string[];
    badge?: boolean;
    planBadge?: boolean;
    collectorBadge?: boolean;
};

const dashboardLinks: DashboardLink[] = [
    { href: "/materials", label: "Tất cả vật tư", roles: ["FARMER"] },
    { href: "/materials/fertilizers", label: "Phân bón", roles: ["FARMER"] },
    { href: "/materials/pesticides", label: "Thuốc BVTV", roles: ["FARMER"] },
    { href: "/materials/stores", label: "Cửa hàng vật tư", roles: ["FARMER"] },
    { href: "/cart", label: "Giỏ hàng", roles: ["FARMER"] },
    { href: "/orders", label: "Đơn mua của tôi", roles: ["FARMER"] },
    { href: "/dashboard/farmer/journal", label: "Nhật ký", roles: ["FARMER"] },
    { href: "/dashboard/farmer/plans", label: "Kế hoạch", roles: ["FARMER"], planBadge: true },
    { href: "/dashboard/farmer/harvests", label: "Phiếu thu hoạch", roles: ["FARMER"] },
    { href: "/region-manager/gardens", label: "Quản lý vườn trồng", roles: ["AREA_MANAGER"] },
    { href: "/region-manager/farmers", label: "Hồ sơ nông dân", roles: ["AREA_MANAGER"], badge: true },
    { href: "/dashboard/admin/farming", label: "Quản lý canh tác", roles: ["ADMIN"] },
    { href: "/dashboard/admin/accounts", label: "Quản lý tài khoản", roles: ["ADMIN"], badge: true },
    { href: "/dashboard/admin/catalog", label: "Danh mục", roles: ["ADMIN"] },
    { href: "/dashboard/store", label: "Tổng quan", roles: ["STORE_OWNER"] },
    { href: "/dashboard/store/products", label: "Sản phẩm", roles: ["STORE_OWNER"] },
    { href: "/dashboard/store/inventory", label: "Kho hàng", roles: ["STORE_OWNER"] },
    { href: "/dashboard/store/orders", label: "Đơn hàng", roles: ["STORE_OWNER"] },
    { href: "/dashboard/store/finance", label: "Tài chính", roles: ["STORE_OWNER"] },
    { href: "/dashboard/partner", label: "Tổng quan", roles: ["COLLECTOR"] },
    { href: "/dashboard/partner/harvests", label: "Phiếu thu hoạch", roles: ["COLLECTOR"] },
    { href: "/dashboard/partner/orders", label: "Đơn thu mua", roles: ["COLLECTOR"] },
    { href: "/dashboard/partner/lots", label: "Lô hàng", roles: ["COLLECTOR"] },
    { href: "/dashboard/partner/finance", label: "Tài chính", roles: ["COLLECTOR"] },
    { href: "/dashboard/processing", label: "Tổng quan", roles: ["PROCESSING_FACILITY"] },
    { href: "/dashboard/processing/raw-materials", label: "Nguyên liệu", roles: ["PROCESSING_FACILITY"], collectorBadge: true },
    { href: "/dashboard/processing/processing", label: "Chế biến", roles: ["PROCESSING_FACILITY"] },
    { href: "/dashboard/processing/finished-products", label: "Thành phẩm", roles: ["PROCESSING_FACILITY"] },
];

export function Navbar({ initialSession }: { initialSession: Session | null }) {
    const pathname = usePathname();
    const { data: clientSession, status } = useSession();
    const session = status === "loading" ? (clientSession ?? initialSession) : clientSession;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [materialsOpen, setMaterialsOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const [duePlanCount, setDuePlanCount] = useState(0);
    const [collectorNoticeCount, setCollectorNoticeCount] = useState(0);
    const [contentCounts, setContentCounts] = useState({ documents: 0, news: 0 });
    const [currentUserName, setCurrentUserName] = useState<string | null>(null);

    useEffect(() => {
        setMaterialsOpen(false);
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [mobileOpen]);

    const isAuthed = Boolean(session);
    const isLoading = status === "loading" && !session;
    const userRole = isAuthed ? (session?.user?.role ?? null) : null;
    const hasMobileBottomNav = Boolean(userRole && ["ADMIN", "AREA_MANAGER", "FARMER", "STORE_OWNER", "COLLECTOR", "PROCESSING_FACILITY"].includes(userRole));
    const isCollector = userRole === "COLLECTOR";
    const visiblePublicLinks = isCollector ? [] : isAuthed ? publicLinks.filter((l) => l.href !== "/") : publicLinks;
    useEffect(() => {
        if (!isAuthed) { setCurrentUserName(null); return; }
        void fetch("/api/auth/me", { cache: "no-store" })
            .then((response) => response.json())
            .then((payload) => { if (payload.success) setCurrentUserName(payload.user.fullName || payload.user.phone); })
            .catch(() => undefined);
    }, [isAuthed]);
    useEffect(() => {
        if (!isAuthed || !["ADMIN", "AREA_MANAGER"].includes(userRole ?? "")) {
            setPendingCount(0);
            return;
        }
        let cancelled = false;
        const fetchCount = async () => {
            try {
                if (userRole === "ADMIN") {
                    const accountsResponse = await fetch("/api/admin/accounts?page=1&pageSize=1&status=PENDING", { cache: "no-store" });
                    const accountsPayload = await accountsResponse.json();
                    if (!cancelled) {
                        const pendingAccounts = accountsPayload.success ? accountsPayload.pagination.totalItems : 0;
                        setPendingCount(pendingAccounts);
                    }
                    return;
                }
                const res = await fetch("/api/region-manager/farmers?page=1&pageSize=1&status=PENDING", { cache: "no-store" });
                const payload = await res.json();
                if (!cancelled && payload.success) {
                    setPendingCount(payload.stats.pending);
                }
            } catch {
                // silent
            }
        };
        void fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [isAuthed, userRole]);

    useEffect(() => {
        if (!isAuthed || !["FARMER", "AREA_MANAGER"].includes(userRole ?? "")) {
            setContentCounts({ documents: 0, news: 0 });
            return;
        }
        let cancelled = false;
        const fetchContentCounts = async () => {
            try {
                const response = await fetch("/api/content-notifications", { cache: "no-store" });
                const payload = await response.json();
                if (!cancelled && payload.success) setContentCounts(payload.data);
            } catch {
                // Navbar notifications must not block navigation.
            }
        };
        void fetchContentCounts();
        window.addEventListener("content-notifications-updated", fetchContentCounts);
        const interval = setInterval(fetchContentCounts, 30000);
        return () => {
            cancelled = true;
            window.removeEventListener("content-notifications-updated", fetchContentCounts);
            clearInterval(interval);
        };
    }, [isAuthed, pathname, userRole]);

    useEffect(() => {
        if (!isAuthed || userRole !== "FARMER") { setDuePlanCount(0); return; }
        let cancelled = false;
        const fetchDuePlans = async () => { try { const response = await fetch("/api/farming-plans?due=true", { cache: "no-store" }); const payload = await response.json(); if (!cancelled && payload.success) setDuePlanCount(payload.dueCount ?? 0); } catch { /* non-blocking reminder */ } };
        void fetchDuePlans();
        window.addEventListener("plans-updated", fetchDuePlans);
        const interval = window.setInterval(fetchDuePlans, 5 * 60_000);
        return () => { cancelled = true; window.removeEventListener("plans-updated", fetchDuePlans); window.clearInterval(interval); };
    }, [isAuthed, pathname, userRole]);

    useEffect(() => {
        if (!isAuthed || !["COLLECTOR", "PROCESSING_FACILITY"].includes(userRole ?? "")) { setCollectorNoticeCount(0); return; }
        let cancelled = false;
        const fetchCollectorNotices = async () => {
            try {
                const response = await fetch("/api/harvests", { cache: "no-store" });
                const payload = await response.json();
                if (!cancelled && payload.success) {
                    const rows = payload.data ?? [];
                    const count = userRole === "COLLECTOR"
                        ? rows.filter((item: { status: string }) => ["WAITING_CONFIRMATION", "HARVESTED"].includes(item.status)).length
                        : rows.filter((item: { status: string }) => ["WAITING_CONFIRMATION", "CONFIRMED", "HARVESTING"].includes(item.status)).length;
                    setCollectorNoticeCount(count);
                }
            } catch {
                // non-blocking
            }
        };
        void fetchCollectorNotices(); const interval = window.setInterval(fetchCollectorNotices, 60_000);
        return () => { cancelled = true; window.clearInterval(interval); };
    }, [isAuthed, pathname, userRole]);

    useEffect(() => {
        if (!isAuthed || userRole !== "FARMER") {
            setCartCount(0);
            return;
        }
        let cancelled = false;
        const fetchCartCount = async () => {
            try {
                const response = await fetch("/api/cart", { cache: "no-store" });
                const payload = await response.json();
                if (!cancelled && payload.success) {
                    setCartCount((payload.data ?? []).reduce((total: number, item: { quantity?: number }) => total + (item.quantity ?? 0), 0));
                }
            } catch {
                // Cart badge must never block navigation.
            }
        };
        void fetchCartCount();
        window.addEventListener("cart-updated", fetchCartCount);
        return () => {
            cancelled = true;
            window.removeEventListener("cart-updated", fetchCartCount);
        };
    }, [isAuthed, pathname, userRole]);

    const accessibleDashboards = userRole
        ? dashboardLinks.filter((l) => l.roles.includes(userRole))
        : [];
    const materialLinks = accessibleDashboards.filter((link) => ["/materials", "/materials/fertilizers", "/materials/pesticides", "/materials/stores", "/cart", "/orders"].includes(link.href));
    const primaryDashboardLinks = accessibleDashboards.filter((link) => !materialLinks.includes(link));

    const getLogoHref = () => {
        switch (userRole) {
            case "ADMIN":
                return "/dashboard/admin";
            case "AREA_MANAGER":
                return "/dashboard/area-manager";
            case "FARMER":
                return "/dashboard/farmer";
            case "STORE_OWNER":
                return "/dashboard/store";
            case "COLLECTOR":
                return "/dashboard/partner";
            case "PROCESSING_FACILITY":
                return "/dashboard/processing";
            default:
                return "/";
        }
    };

    const isAuthPage = pathname === "/login" || pathname === "/register";

    return (
        <header
            className={cn(
                "relative z-50 w-full border-b border-white/80 bg-white/70 backdrop-blur-lg xl:sticky xl:top-0",
                isAuthPage && "hidden",
            )}
        >
            <nav className="flex h-[64px] w-full items-center gap-2 px-3 pt-2 sm:px-4 xl:px-5">
                {/* Logo */}
                <Link href={getLogoHref()} className="flex shrink-0 items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
                        <Leaf className="h-5 w-5 text-white" />
                    </div>
                    <span
                        className="hidden text-lg font-black text-slate-900 sm:inline-block"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        TriViet
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-visible px-1 py-2 xl:flex">
                    {visiblePublicLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "relative whitespace-nowrap rounded-2xl px-2.5 py-2 text-sm font-semibold transition 2xl:px-3",
                                pathname === link.href
                                    ? "bg-brand-50 text-brand-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                            )}
                        >
                            {link.label}
                            {link.notificationKey && contentCounts[link.notificationKey] > 0 && (
                                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                    {contentCounts[link.notificationKey] > 99 ? "99+" : contentCounts[link.notificationKey]}
                                </span>
                            )}
                        </Link>
                    ))}
                    {isAuthed && materialLinks.length > 0 && (
                        <div className="relative">
                            <button type="button" onClick={() => setMaterialsOpen((open) => !open)} aria-expanded={materialsOpen} aria-haspopup="menu" className={cn("flex items-center gap-1 whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-semibold transition", (pathname.startsWith("/materials") || pathname.startsWith("/orders")) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
                                Vật tư <ChevronDown className={cn("h-4 w-4 transition-transform", materialsOpen && "rotate-180")} />
                            </button>
                            {materialsOpen && <div role="menu" className="absolute left-0 top-full z-[70] mt-2 min-w-56 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{materialLinks.map((link) => <Link key={link.href} href={link.href} role="menuitem" onClick={() => setMaterialsOpen(false)} className={cn("flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition", pathname === link.href ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-brand-50 hover:text-brand-700")}><span>{link.label}</span>{link.href === "/cart" && cartCount > 0 && <CartBadge count={cartCount} />}</Link>)}</div>}
                        </div>
                    )}
                    {isAuthed &&
                        primaryDashboardLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "relative whitespace-nowrap rounded-2xl px-2.5 py-2 text-sm font-semibold transition 2xl:px-3",
                                    (["/dashboard/partner", "/dashboard/store", "/dashboard/processing"].includes(link.href) ? pathname === link.href : pathname.startsWith(link.href))
                                        ? "bg-brand-50 text-brand-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                                )}
                            >
                                {link.label}
                                {link.badge && pendingCount > 0 && (
                                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                        {pendingCount > 99 ? "99+" : pendingCount}
                                    </span>
                                )}
                                {link.planBadge && duePlanCount > 0 && (
                                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white" aria-label={`${duePlanCount} kế hoạch cần thực hiện`}>
                                        {duePlanCount > 99 ? "99+" : duePlanCount}
                                    </span>
                                )}
                                {link.collectorBadge && collectorNoticeCount > 0 && <CartBadge count={collectorNoticeCount} />}
                            </Link>
                        ))}
                </div>

                {/* Desktop Auth */}
                <div className="hidden min-h-10 shrink-0 items-center justify-end gap-2 xl:flex">
                    {isLoading ? (
                        <div className="h-9 w-32 animate-pulse rounded-2xl bg-slate-100" aria-label="Dang kiem tra dang nhap" />
                    ) : isAuthed ? (
                        <>
                            <Link href="/account" title="Xem thông tin tài khoản" className="flex min-w-0 items-center gap-1.5 rounded-2xl bg-brand-50 px-2.5 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100 2xl:px-3">
                                <UserRound className="h-4 w-4" />
                                <span className="max-w-20 truncate 2xl:max-w-32">
                                    {currentUserName ?? session?.user?.fullName ?? session?.user?.phone ?? "Người dùng"}
                                </span>
                                <span className="hidden rounded-lg bg-brand-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-800 2xl:inline">
                                    {session?.user?.role?.replaceAll("_", " ") ?? ""}
                                </span>
                            </Link>
                            <Button className="shrink-0 whitespace-nowrap px-2.5 2xl:px-3" variant="outline" size="sm" onClick={() => void signOut({ callbackUrl: "/" })}>
                                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                                Đăng xuất
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/register"
                                className="whitespace-nowrap rounded-2xl px-2.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 2xl:px-3"
                            >
                                Đăng ký
                            </Link>
                            <Button size="sm" asChild>
                                <Link href="/login">
                                    <LogIn className="mr-1.5 h-4 w-4" />
                                    Đăng nhập
                                </Link>
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile role pages use fixed bottom navigation, so header only keeps logout action. */}
                {isAuthed && hasMobileBottomNav ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto h-9 shrink-0 rounded-xl px-2.5 text-xs xl:hidden"
                        onClick={() => void signOut({ callbackUrl: "/" })}
                    >
                        <LogOut className="mr-1.5 h-4 w-4" />
                        Đăng xuất
                    </Button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 xl:hidden"
                        aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                )}
            </nav>

            {/* Mobile Menu */}
            {!hasMobileBottomNav && mobileOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Điều hướng chính"
                    className="fixed inset-0 z-[100] h-[100dvh] w-screen overflow-y-auto overscroll-contain bg-white xl:hidden"
                >
                    <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-100 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <Link href={getLogoHref()} onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
                                <Leaf className="h-5 w-5 text-white" />
                            </span>
                            <span className="text-lg font-black text-slate-900" style={{ fontFamily: "var(--font-display)" }}>TriViet</span>
                        </Link>
                        <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Đóng menu">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="space-y-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
                        {isAuthed && (
                            <Link href="/account" onClick={() => setMobileOpen(false)} className="mb-2 flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 transition hover:bg-brand-100">
                                <UserRound className="h-5 w-5 text-brand-600" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-brand-800">
                                        {currentUserName ?? session?.user?.fullName ?? session?.user?.phone ?? "Người dùng"}
                                    </p>
                                    <p className="text-xs font-medium text-brand-600">
                                        {session?.user?.role?.replace("_", " ") ?? ""}
                                    </p>
                                </div>
                            </Link>
                        )}

                        {visiblePublicLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                                    pathname === link.href
                                        ? "bg-brand-50 text-brand-700"
                                        : "text-slate-600 hover:bg-slate-50",
                                )}
                            >
                                <span>{link.label}</span>
                                {link.notificationKey && contentCounts[link.notificationKey] > 0 && (
                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                        {contentCounts[link.notificationKey] > 99 ? "99+" : contentCounts[link.notificationKey]}
                                    </span>
                                )}
                            </Link>
                        ))}

                        {isAuthed && materialLinks.length > 0 && (
                            <div className="rounded-2xl border border-slate-100 p-2">
                                <button type="button" onClick={() => setMaterialsOpen((open) => !open)} aria-expanded={materialsOpen} className="flex w-full items-center justify-between px-2 py-2 text-sm font-bold text-slate-700">Vật tư <ChevronDown className={cn("h-4 w-4 transition-transform", materialsOpen && "rotate-180")} /></button>
                                {materialsOpen && <div className="space-y-1 border-t border-slate-100 pt-1">{materialLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => { setMaterialsOpen(false); setMobileOpen(false); }} className="flex items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-brand-50"><span>{link.label}</span>{link.href === "/cart" && cartCount > 0 && <CartBadge count={cartCount} />}</Link>)}</div>}
                            </div>
                        )}
                        {isAuthed &&
                            primaryDashboardLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                                        (["/dashboard/partner", "/dashboard/store", "/dashboard/processing"].includes(link.href) ? pathname === link.href : pathname.startsWith(link.href))
                                            ? "bg-brand-50 text-brand-700"
                                            : "text-slate-600 hover:bg-slate-50",
                                    )}
                                >
                                    <span>{link.label}</span>
                                    {link.badge && pendingCount > 0 && (
                                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                            {pendingCount > 99 ? "99+" : pendingCount}
                                        </span>
                                    )}
                                    {link.planBadge && duePlanCount > 0 && <CartBadge count={duePlanCount} />}
                                    {link.collectorBadge && collectorNoticeCount > 0 && <CartBadge count={collectorNoticeCount} />}
                                </Link>
                            ))}

                        <hr className="my-3 border-slate-100" />

                        {isAuthed ? (
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    void signOut({ callbackUrl: "/" });
                                }}
                                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                                <LogOut className="h-4 w-4" />
                                Đăng xuất
                            </button>
                        ) : (
                            <>
                                <Link
                                    href="/register"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                                >
                                    Đăng ký
                                </Link>
                                <Link
                                    href="/login"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Đăng nhập
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}

function CartBadge({ count }: { count: number }) {
    return <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white" aria-label={`${count} sản phẩm trong giỏ`}>{count > 99 ? "99+" : count}</span>;
}
