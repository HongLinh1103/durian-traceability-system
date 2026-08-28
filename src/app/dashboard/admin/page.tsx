import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, LandPlot, MapPinned, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HeroBanner } from "@/components/home/HeroBanner";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/");

    const [accountCount, pendingCount, farmCount, regionCount] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null, role: { not: "ADMIN" } } }),
        prisma.user.count({ where: { deletedAt: null, role: { not: "ADMIN" }, accountStatus: "PENDING" } }),
        prisma.farm.count(),
        prisma.growingRegion.count(),
    ]);

    const summaries = [
        { label: "Tổng tài khoản", value: accountCount, icon: Users, href: "/dashboard/admin/accounts" },
        { label: "Hồ sơ chờ duyệt", value: pendingCount, icon: BookOpenCheck, href: "/dashboard/admin/accounts" },
        { label: "Tổng vườn trồng", value: farmCount, icon: LandPlot, href: "/dashboard/admin/farming" },
        { label: "Tổng vùng trồng", value: regionCount, icon: MapPinned, href: "/dashboard/admin/farming" },
    ];

    return (
        <main className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:space-y-7 sm:px-6 sm:py-6 lg:px-8">
            <div className="hidden sm:block">
                <HeroBanner compact showContent={false} />
            </div>

            <section>
                <div className="min-w-0">
                    <p className="hidden text-sm font-semibold text-emerald-700 sm:block">Trang chủ quản trị hệ thống</p>
                    <h1 className="text-xl font-black leading-tight text-slate-900 sm:mt-1 sm:text-3xl">
                        Tổng quan hệ thống hôm nay
                    </h1>
                    <p className="mt-1 text-sm text-slate-600 sm:mt-2">
                        Xin chào, {session.user.fullName || "Admin"}. Theo dõi nhanh tình hình vận hành toàn hệ thống.
                    </p>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {summaries.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.label} href={item.href} className="group">
                            <Card className="h-full min-h-32 rounded-2xl border-emerald-100 transition group-hover:-translate-y-0.5 group-hover:border-emerald-200 group-hover:shadow-md sm:min-h-0 sm:rounded-[24px]">
                                <CardContent className="p-3.5 sm:p-5">
                                    <span className="inline-flex rounded-xl bg-emerald-50 p-2.5 text-emerald-700 sm:rounded-2xl sm:p-3">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <p className="mt-3 text-[28px] font-black leading-none text-slate-900 sm:mt-4 sm:text-2xl">
                                        {item.value.toLocaleString("vi-VN")}
                                    </p>
                                    <p className="mt-2 text-sm font-medium leading-snug text-slate-600 sm:mt-1 sm:font-normal sm:text-slate-500">{item.label}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </section>

            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                    <h2 className="font-black text-slate-900 text-base uppercase tracking-wide">
                        Truy cập nhanh chức năng quản trị
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Link
                        href="/dashboard/admin/permissions"
                        className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-300 transition group"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                            <BookOpenCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-900">
                                Phân quyền hệ thống
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-1">
                                Cấu hình ma trận quyền theo từng vai trò & phân hệ
                            </p>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/admin/accounts"
                        className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition group"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-slate-900 group-hover:text-blue-900">
                                Quản lý tài khoản
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-1">
                                Phê duyệt Onboarding và phân loại vai trò
                            </p>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/admin/catalog"
                        className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition group"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
                            <MapPinned className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-slate-900 group-hover:text-amber-900">
                                Danh mục chuẩn GACC
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-1">
                                Giống sầu riêng, phân bón và hóa chất cấm
                            </p>
                        </div>
                    </Link>
                </div>
            </section>
        </main>
    );
}
