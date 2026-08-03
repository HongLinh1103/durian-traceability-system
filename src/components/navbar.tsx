"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Leaf, LogIn, LogOut, Menu, UserRound, X } from "lucide-react";
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
};

const dashboardLinks: DashboardLink[] = [
    { href: "/dashboard/farmer/logs", label: "Nhật ký canh tác", roles: ["FARMER"] },
    { href: "/region-manager/gardens", label: "Quản lý vườn trồng", roles: ["AREA_MANAGER"] },
    { href: "/region-manager/farmers", label: "Hồ sơ nông dân", roles: ["AREA_MANAGER"], badge: true },
    { href: "/dashboard/admin/farming", label: "Quản lý canh tác", roles: ["ADMIN"] },
    { href: "/dashboard/admin/accounts", label: "Quản lý tài khoản", roles: ["ADMIN"], badge: true },
    { href: "/dashboard/admin/master-data", label: "Quản lý danh mục", roles: ["ADMIN"] },
];

export function Navbar() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [contentCounts, setContentCounts] = useState({ documents: 0, news: 0 });
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(true);
    }, []);

    const isAuthed = hydrated && status === "authenticated";
    const isLoading = !hydrated || status === "loading";
    const userRole = isAuthed ? (session?.user?.role ?? null) : null;
    useEffect(() => {
        if (!isAuthed || !["ADMIN", "AREA_MANAGER"].includes(userRole ?? "")) {
            setPendingCount(0);
            return;
        }
        let cancelled = false;
        const fetchCount = async () => {
            try {
                const endpoint = userRole === "ADMIN"
                    ? "/api/admin/accounts?page=1&pageSize=1&status=PENDING"
                    : "/api/region-manager/farmers?page=1&pageSize=1&status=PENDING";
                const res = await fetch(endpoint, { cache: "no-store" });
                const payload = await res.json();
                if (!cancelled && payload.success) {
                    setPendingCount(userRole === "AREA_MANAGER" ? payload.stats.pending : payload.pagination.totalItems);
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

    const accessibleDashboards = userRole
        ? dashboardLinks.filter((l) => l.roles.includes(userRole))
        : [];

    const isAuthPage = pathname === "/login" || pathname === "/register";

    return (
        <header
            className={cn(
                "sticky top-0 z-50 w-full border-b border-white/80 bg-white/70 backdrop-blur-lg",
                isAuthPage && "hidden",
            )}
        >
            <nav className="flex h-[64px] w-full items-center gap-2 px-3 pt-2 sm:px-4 xl:px-5">
                {/* Logo */}
                <Link href="/" className="flex shrink-0 items-center gap-2">
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
                <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:flex">
                    {publicLinks.map((link) => {
                        const href = link.href === "/" && userRole === "AREA_MANAGER"
                            ? "/dashboard/area-manager"
                            : link.href === "/" && userRole === "ADMIN"
                                ? "/dashboard/admin"
                                : link.href === "/" && userRole === "FARMER"
                                    ? "/dashboard/farmer"
                                : link.href;
                        return (
                            <Link
                                key={link.href}
                                href={href}
                                className={cn(
                                    "relative whitespace-nowrap rounded-2xl px-2.5 py-2 text-sm font-semibold transition 2xl:px-3",
                                    pathname === href
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
                        );
                    })}
                    {isAuthed &&
                        accessibleDashboards.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "relative whitespace-nowrap rounded-2xl px-2.5 py-2 text-sm font-semibold transition 2xl:px-3",
                                    pathname.startsWith(link.href)
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
                                    {session?.user?.fullName ?? session?.user?.phone ?? "Nguoi dung"}
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

                {/* Mobile Toggle */}
                <button
                    type="button"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 xl:hidden"
                    aria-label={mobileOpen ? "Dong menu" : "Mo menu"}
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </nav>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="border-t border-slate-200 bg-white px-3 pb-6 pt-4 sm:px-4 xl:hidden">
                    <div className="space-y-2">
                        {isAuthed && (
                            <Link href="/account" onClick={() => setMobileOpen(false)} className="mb-2 flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 transition hover:bg-brand-100">
                                <UserRound className="h-5 w-5 text-brand-600" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-brand-800">
                                        {session?.user?.fullName ?? session?.user?.phone ?? "User"}
                                    </p>
                                    <p className="text-xs font-medium text-brand-600">
                                        {session?.user?.role?.replace("_", " ") ?? ""}
                                    </p>
                                </div>
                            </Link>
                        )}

                        {publicLinks.map((link) => {
                            const href = link.href === "/" && userRole === "AREA_MANAGER"
                                ? "/dashboard/area-manager"
                                : link.href === "/" && userRole === "ADMIN"
                                    ? "/dashboard/admin"
                                    : link.href === "/" && userRole === "FARMER"
                                        ? "/dashboard/farmer"
                                    : link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                                        pathname === href
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
                            );
                        })}

                        {isAuthed &&
                            accessibleDashboards.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                                        pathname.startsWith(link.href)
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
