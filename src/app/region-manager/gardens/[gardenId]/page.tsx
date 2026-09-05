import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    CircleUserRound,
    History,
    MapPinned,
    Sprout,
    Trees,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";
import { formatVietnameseDate, formatVietnameseDateTime } from "@/lib/date-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GardenActions } from "@/components/region-manager/garden-actions";

export const dynamic = "force-dynamic";

export default async function GardenDetailPage({ params }: { params: { gardenId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    if (!scope) redirect("/");

    const garden = await prisma.farm.findFirst({
        where: {
            id: params.gardenId,
            region: { code: { in: scope.codes } },
            farmer: { accountStatus: "APPROVED", isApproved: true, deletedAt: null },
        },
        select: {
            id: true,
            farmCode: true,
            farmName: true,
            areaSize: true,
            areaUnit: true,
            totalTrees: true,
            durianVariety: true,
            address: true,
            province: true,
            district: true,
            ward: true,
            latitude: true,
            longitude: true,
            notes: true,
            growingRegion: true,
            isActive: true,
            status: true,
            statusReason: true,
            isInSeason: true,
            createdAt: true,
            updatedAt: true,
            farmer: {
                select: {
                    fullName: true,
                    phone: true,
                    email: true,
                    address: true,
                    province: true,
                    district: true,
                    ward: true,
                    accountStatus: true,
                    approvedAt: true,
                },
            },
            region: {
                select: {
                    code: true,
                    name: true,
                    province: true,
                    district: true,
                    ward: true,
                    cropVarieties: true,
                    approvedAt: true,
                    validUntil: true,
                    isActive: true,
                },
            },
            farmingLogs: {
                orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
                take: 1,
                select: { actionDate: true },
            },
            _count: { select: { farmingLogs: true } },
            statusHistories: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, actor: { select: { fullName: true } } } },
        },
    });
    if (!garden) notFound();

    const latestLog = garden.farmingLogs[0]?.actionDate;

    return (
        <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-6 sm:px-6">
            <Button asChild variant="outline" size="sm">
                <Link href="/region-manager/gardens"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại danh sách</Link>
            </Button>

            <section className="overflow-hidden rounded-[32px] bg-white shadow-sm">
                <div className="bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-400 px-6 py-8 text-white sm:px-9">
                    <p className="text-sm font-semibold text-emerald-50">{garden.farmCode}</p>
                    <h1 className="mt-1 text-3xl font-black">{garden.farmName}</h1>
                    <p className="mt-2 text-emerald-50">{garden.growingRegion || `${garden.region?.code} – ${garden.region?.name}`}</p>
                </div>
                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <Badge className={garden.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                            {garden.isActive ? "Đang hoạt động" : "Tạm ngừng"}
                        </Badge>
                        <Badge className={garden.isInSeason ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}>
                            {garden.isInSeason ? "Đang trong mùa vụ" : "Ngoài mùa vụ"}
                        </Badge>
                    </div>
                    <Button asChild>
                        <Link href={`/region-manager/gardens/${garden.id}/logs`}><History className="mr-2 h-4 w-4" />Xem nhật ký</Link>
                    </Button>
                </div>
            </section>

            {!scope.isAdmin && <GardenActions gardenId={garden.id} status={garden.status} />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Summary icon={Sprout} label="Diện tích" value={`${garden.areaSize} ha`} />
                <Summary icon={Trees} label="Tổng số cây" value={garden.totalTrees.toLocaleString("vi-VN")} />
                <Summary icon={History} label="Số nhật ký" value={garden._count.farmingLogs.toLocaleString("vi-VN")} />
                <Summary icon={CalendarDays} label="Nhật ký gần nhất" value={latestLog ? formatVietnameseDate(latestLog) : "Chưa cập nhật"} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <DetailCard title="Thông tin vườn trồng" icon={Sprout}>
                    <Info label="Mã vườn" value={garden.farmCode} />
                    <Info label="Tên vườn" value={garden.farmName} />
                    <Info label="Diện tích" value={`${garden.areaSize} ${garden.areaUnit === "SQUARE_METER" ? "m²" : "ha"}`} />
                    <Info label="Tổng số cây" value={garden.totalTrees.toLocaleString("vi-VN")} />
                    <Info label="Giống sầu riêng" value={garden.durianVariety} />
                    <Info label="Địa phương" value={[garden.ward, garden.district, garden.province].filter(Boolean).join(", ")} />
                    <Info label="Địa chỉ chi tiết" value={garden.address} />
                    <Info label="Tọa độ" value={garden.latitude != null && garden.longitude != null ? `${garden.latitude}, ${garden.longitude}` : null} />
                    <Info label="Ghi chú" value={garden.notes} />
                </DetailCard>

                <DetailCard title="Thông tin chủ vườn" icon={CircleUserRound}>
                    <Info label="Họ và tên" value={garden.farmer.fullName} />
                    <Info label="Số điện thoại" value={garden.farmer.phone} />
                    <Info label="Email" value={garden.farmer.email} />
                    <Info label="Địa chỉ" value={[garden.farmer.address, garden.farmer.ward, garden.farmer.district, garden.farmer.province].filter(Boolean).join(", ")} />
                    <Info label="Trạng thái" value={garden.farmer.accountStatus === "APPROVED" ? "Đã phê duyệt" : garden.farmer.accountStatus} />
                    <Info label="Ngày phê duyệt" value={garden.farmer.approvedAt ? formatVietnameseDate(garden.farmer.approvedAt) : undefined} />
                </DetailCard>

                <DetailCard title="Vùng trồng trực thuộc" icon={MapPinned}>
                    <Info label="Mã vùng" value={garden.region?.code} />
                    <Info label="Tên vùng" value={garden.region?.name} />
                    <Info label="Địa bàn" value={[garden.region?.ward, garden.region?.district, garden.region?.province].filter(Boolean).join(", ")} />
                    <Info label="Giống được quản lý" value={garden.region?.cropVarieties.join(", ")} />
                    <Info label="Trạng thái" value={garden.region?.isActive ? "Đang hoạt động" : "Tạm ngừng"} />
                    <Info label="Hiệu lực đến" value={garden.region?.validUntil ? formatVietnameseDate(garden.region?.validUntil) : undefined} />
                </DetailCard>

                <DetailCard title="Thông tin hệ thống" icon={CalendarDays}>
                    <Info label="Ngày liên kết" value={formatVietnameseDate(garden.createdAt)} />
                    <Info label="Cập nhật gần nhất" value={formatVietnameseDateTime(garden.updatedAt)} />
                    <Info label="Số nhật ký" value={garden._count.farmingLogs.toLocaleString("vi-VN")} />
                    <Info label="Nhật ký gần nhất" value={latestLog ? formatVietnameseDate(latestLog) : null} />
                </DetailCard>
            </div>
        </main>
    );
}

function Summary({ icon: Icon, label, value }: { icon: typeof Sprout; label: string; value: string }) {
    return <Card className="rounded-[24px]"><CardContent className="flex items-center gap-3 p-4"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Icon className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">{label}</p><p className="font-bold text-slate-900">{value}</p></div></CardContent></Card>;
}

function DetailCard({ title, icon: Icon, children }: { title: string; icon: typeof Sprout; children: React.ReactNode }) {
    return <Card className="rounded-[28px] border-slate-100 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-emerald-600" />{title}</CardTitle></CardHeader><CardContent className="space-y-3">{children}</CardContent></Card>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
    return <div className="grid gap-1 border-b border-slate-100 pb-2 text-sm last:border-0 sm:grid-cols-[145px_1fr]"><span className="text-slate-500">{label}</span><strong className="font-medium text-slate-900">{value || "—"}</strong></div>;
}
