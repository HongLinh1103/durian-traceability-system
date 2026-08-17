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
        </main>
    );
}
