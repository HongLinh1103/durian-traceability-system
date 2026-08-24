import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Building2, ClipboardCheck, MapPinned, Sprout, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroBanner } from "@/components/home/HeroBanner";
import { getManagedRegionScope } from "@/lib/region-manager-scope";

export default async function AreaManagerDashboard() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "AREA_MANAGER") redirect("/");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { areaManagerApplication: true },
    });
    if (!user) redirect("/login");

    const application = user.areaManagerApplication;
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    const managedRegionCodes = scope?.codes ?? [];
    const region = scope?.regions[0];
    const [managedFarms, pendingProfileCount] = managedRegionCodes.length
        ? await Promise.all([prisma.farm.findMany({
            where: {
                isActive: true,
                region: { code: { in: managedRegionCodes } },
                farmer: { accountStatus: "APPROVED", isApproved: true, deletedAt: null },
            },
            select: {
                farmerId: true,
                createdAt: true,
                isActive: true,
                farmer: { select: { approvedAt: true } },
                farmingLogs: {
                    orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
                    take: 1,
                    select: { actionDate: true },
                },
            },
        }), prisma.user.count({
            where: {
                role: "FARMER",
                accountStatus: "PENDING",
                deletedAt: null,
                farms: { some: { region: { code: { in: managedRegionCodes } } } },
            },
        })])
        : [[], 0];
    const memberHouseholdCount = new Set(managedFarms.map((farm) => farm.farmerId)).size;

    const summaries = [
        { label: "Hồ sơ cần duyệt", value: pendingProfileCount, icon: ClipboardCheck, href: "/region-manager/farmers" },
        { label: "Tổng số vườn", value: managedFarms.length, icon: Sprout, href: "/region-manager/gardens" },
        { label: "Số hộ thành viên", value: memberHouseholdCount, icon: Users, href: "/region-manager/farmers" },
    ];

    return (
        <main className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:space-y-7 sm:px-6 sm:py-6 lg:px-8">
            <div className="hidden sm:block">
                <HeroBanner compact showContent={false} />
            </div>

            <section>
                <div className="min-w-0">
                    <p className="hidden text-sm font-semibold text-emerald-700 sm:block">Trưởng ban quản lý vùng trồng</p>
                    <h1 className="text-xl font-black leading-tight text-slate-900 sm:mt-1 sm:text-3xl">
                        Xin chào, {user.fullName || "Ban quản lý vùng trồng"}
                    </h1>
                    <p className="mt-1 text-sm text-slate-600 sm:mt-2">
                        Theo dõi tổ chức và vùng trồng bạn đang phụ trách.
                    </p>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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

            <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-600" />Thông tin tổ chức</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p><b>Tổ chức/HTX:</b> {application?.organizationName || "—"}</p>
                        <p><b>Chức vụ:</b> {application?.position || "—"}</p>
                        <p><b>Mã số thuế:</b> {application?.taxCode || "—"}</p>
                        <p><b>Trụ sở:</b> {[application?.officeDetailedAddress, application?.officeWard, application?.officeDistrict, application?.officeProvince].filter(Boolean).join(", ") || "—"}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-emerald-600" />Vùng trồng phụ trách</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p><b>Tên vùng:</b> {region?.name || "—"}</p>
                        <p><b>Mã vùng:</b> {region?.code || "—"}</p>
                        <p><b>Số vùng được giao:</b> {scope?.regions.length ?? 0}</p>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
