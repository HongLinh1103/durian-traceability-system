import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Building2, ClipboardCheck, MapPinned, Sprout, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroBanner } from "@/components/home/HeroBanner";

type ManagedRegion = {
    code?: string;
    name?: string;
    province?: string;
    district?: string;
    ward?: string;
    areaSize?: number;
    farmerCount?: number;
    durianVarieties?: string[];
};

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
    const assignments = Array.isArray(application?.managedRegions)
        ? application.managedRegions as ManagedRegion[]
        : [application?.managedRegions as ManagedRegion | null].filter(
            (item): item is ManagedRegion => Boolean(item && typeof item === "object"),
        );
    const region = assignments[0] ?? {};
    const managedRegionCodes = assignments
        .map((item) => item.code?.trim())
        .filter((code): code is string => Boolean(code));
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

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
            <HeroBanner compact showContent={false} />

            <div>
                <p className="text-sm font-medium text-emerald-700">Trưởng ban quản lý vùng trồng</p>
                <h1 className="text-3xl font-bold text-slate-900">Xin chào, {user.fullName}</h1>
                <p className="mt-1 text-slate-600">Theo dõi tổ chức và vùng trồng bạn đang phụ trách.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Summary icon={ClipboardCheck} label="Hồ sơ cần duyệt" value={pendingProfileCount.toLocaleString("vi-VN")} />
                <Summary icon={Sprout} label="Tổng số vườn" value={managedFarms.length.toLocaleString("vi-VN")} />
                <Summary icon={Users} label="Số hộ thành viên" value={memberHouseholdCount.toLocaleString("vi-VN")} />
            </div>

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
                        <p><b>Tên vùng:</b> {region.name || "—"}</p>
                        <p><b>Địa bàn:</b> {[region.ward, region.district, region.province].filter(Boolean).join(", ") || "—"}</p>
                        <p><b>Quy mô:</b> {region.areaSize ?? 0} ha</p>
                        <p><b>Giống chủ lực:</b> {region.durianVarieties?.join(", ") || "—"}</p>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

function Summary({ icon: Icon, label, value, tone = "green" }: { icon: typeof MapPinned; label: string; value: string; tone?: "green" | "red" }) {
    const colors = tone === "red" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700";
    return <Card><CardContent className="flex items-center gap-4 p-5"><span className={`rounded-2xl p-3 ${colors}`}><Icon className="h-6 w-6" /></span><div><p className="text-sm text-slate-500">{label}</p><p className="font-semibold text-slate-900">{value}</p></div></CardContent></Card>;
}
