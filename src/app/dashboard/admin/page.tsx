import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, LandPlot, MapPinned, TriangleAlert, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HeroBanner } from "@/components/home/HeroBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/");

    const [accountCount, pendingCount, farmCount, regionCount, farmsForOverdue] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null, role: { not: "ADMIN" } } }),
        prisma.user.count({ where: { deletedAt: null, role: { not: "ADMIN" }, accountStatus: "PENDING" } }),
        prisma.farm.count(),
        prisma.growingRegion.count(),
        prisma.farm.findMany({
            where: {
                isActive: true,
                farmer: {
                    deletedAt: null,
                    isApproved: true,
                    accountStatus: "APPROVED",
                },
            },
            select: {
                createdAt: true,
                farmingLogs: {
                    orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
                    take: 1,
                    select: { actionDate: true },
                },
            },
        }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueFarmCount = farmsForOverdue.filter((farm) => {
        const referenceDate = new Date(farm.farmingLogs[0]?.actionDate ?? farm.createdAt);
        referenceDate.setHours(0, 0, 0, 0);
        const daysSinceUpdate = Math.floor((today.getTime() - referenceDate.getTime()) / 86_400_000);
        return daysSinceUpdate >= 2;
    }).length;

    const summaries = [
        { label: "Tổng tài khoản", value: accountCount, icon: Users, href: "/dashboard/admin/accounts" },
        { label: "Hồ sơ chờ duyệt", value: pendingCount, icon: BookOpenCheck, href: "/dashboard/admin/accounts" },
        { label: "Tổng vườn trồng", value: farmCount, icon: LandPlot, href: "/dashboard/admin/farming" },
        { label: "Tổng vùng trồng", value: regionCount, icon: MapPinned, href: "/dashboard/admin/farming" },
        { label: "Số vườn trễ nhật ký", value: overdueFarmCount, icon: TriangleAlert, href: "/dashboard/admin/farming" },
    ];

    return (
        <main className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">
            <HeroBanner compact showContent={false} />

            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-emerald-700">Trang chủ quản trị hệ thống</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Xin chào, {session.user.fullName || "Admin"}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Theo dõi nhanh tài khoản, vùng trồng, vườn trồng và dữ liệu nhật ký toàn hệ thống.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/admin/accounts">
                        <Users className="mr-2 h-4 w-4" />
                        Quản lý tài khoản
                    </Link>
                </Button>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {summaries.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.label} href={item.href} className="group">
                            <Card className="h-full rounded-[24px] border-emerald-100 transition group-hover:-translate-y-0.5 group-hover:border-emerald-200 group-hover:shadow-md">
                                <CardContent className="p-5">
                                    <span className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <p className="mt-4 text-2xl font-black text-slate-900">
                                        {item.value.toLocaleString("vi-VN")}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </section>
        </main>
    );
}
