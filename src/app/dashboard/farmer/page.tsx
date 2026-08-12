import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HeroBanner } from "@/components/home/HeroBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function FarmerDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "FARMER") redirect("/");

    const farm = await prisma.farm.findFirst({
        where: { farmerId: session.user.id, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { farmName: true, farmCode: true },
    });

    return (
        <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <HeroBanner compact showContent={false} />
            <section className="rounded-[28px] border border-white/70 bg-white/90 px-5 py-4 shadow-soft backdrop-blur">
                <p className="text-sm font-semibold text-emerald-700">Trang chủ nông dân</p>
                <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                    {farm?.farmName ?? session.user.fullName ?? "Tài khoản nông dân"}
                </h1>
                {farm?.farmCode && <p className="text-sm text-slate-500">{farm.farmCode}</p>}
            </section>
            <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                    <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><BookOpen className="h-6 w-6" /></span>
                        <div><p className="font-bold text-slate-900">Nhật ký canh tác</p><p className="text-sm text-slate-500">Xem và cập nhật hoạt động canh tác của vườn.</p></div>
                    </div>
                    <Button asChild><Link href="/dashboard/farmer/logs">Xem nhật ký<ChevronRight className="ml-2 h-4 w-4" /></Link></Button>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                    <div className="flex items-center gap-3"><span className="rounded-2xl bg-sky-50 p-3 text-sky-700"><CalendarDays className="h-6 w-6" /></span><div><p className="font-bold text-slate-900">Kế hoạch canh tác</p><p className="text-sm text-slate-500">Lên lịch công việc và nhận nhắc việc trong ngày.</p></div></div>
                    <Button asChild><Link href="/dashboard/farmer/plans">Mở kế hoạch<ChevronRight className="ml-2 h-4 w-4" /></Link></Button>
                </CardContent>
            </Card>
        </main>
    );
}
