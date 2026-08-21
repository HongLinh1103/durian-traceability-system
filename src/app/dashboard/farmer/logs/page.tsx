import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Leaf, Plus, Sprout } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatVietnameseDateTime } from "@/lib/date-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const activityLabels: Record<string, string> = {
    BASE_FERTILIZING: "Bón phân gốc",
    PLANTING: "Trồng mới",
    MULCHING: "Phủ gốc",
    SPRAY_PESTICIDE: "Phun thuốc",
    FERTILIZE: "Bón phân",
    FOLIAR_FERTILIZING: "Bón phân qua lá",
    IRRIGATE: "Tưới nước",
    PRUNE: "Cắt tỉa",
    WEEDING: "Làm cỏ",
    SHOOT_MANAGEMENT: "Quản lý đọt",
    WATER_STRESS: "Xiết nước",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWER_THINNING: "Tỉa hoa",
    POLLINATION: "Thụ phấn",
    FRUIT_THINNING: "Tỉa trái",
    PEST_INSPECTION: "Kiểm tra sâu bệnh",
    TRACK_FRUIT: "Theo dõi trái",
    FRUIT_BAGGING: "Bao trái",
    BRANCH_SUPPORT: "Chống đỡ cành",
    HARVEST: "Thu hoạch",
    FRUIT_GRADING: "Phân loại trái",
    GARDEN_SANITATION: "Vệ sinh vườn",
    OTHER: "Khác",
};

const stageLabels: Record<string, string> = {
    POST_HARVEST_RECOVERY: "Phục hồi sau thu hoạch",
    MAKING_SPROUT: "Làm đọt",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWERING: "Ra hoa",
    FRUIT_SETTING: "Đậu trái",
    FRUIT_GROWING: "Nuôi trái",
    PRE_HARVEST: "Trước thu hoạch",
    HARVEST: "Thu hoạch",
};

export const dynamic = "force-dynamic";

export default async function FarmerLogsPage({ searchParams = {} }: { searchParams?: { farmId?: string; year?: string; seasonId?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "FARMER") redirect("/");

    const farms = await prisma.farm.findMany({ where: { farmerId: session.user.id, isActive: true }, select: { id: true, farmName: true, farmCode: true, cropSeasons: { orderBy: [{ year: "desc" }, { sequence: "desc" }], include: { farmingLogs: { orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }], take: 1, select: { stage: true } } } } }, orderBy: { farmName: "asc" } });
    const selectedFarmId = farms.some(farm => farm.id === searchParams.farmId) ? searchParams.farmId! : farms[0]?.id;
    const selectedFarm = farms.find(farm => farm.id === selectedFarmId);
    const activeSeason = selectedFarm?.cropSeasons.find(season => season.status === "ACTIVE");
    const selectedSeason = selectedFarm?.cropSeasons.find(season => season.id === searchParams.seasonId) ?? activeSeason ?? selectedFarm?.cropSeasons[0];
    const logs = await prisma.farmingLog.findMany({
        where: { farm: { farmerId: session.user.id }, ...(selectedFarmId ? { farmId: selectedFarmId } : {}), ...(selectedSeason ? { cropSeasonId: selectedSeason.id } : { cropSeasonId: null }) },
        orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
        select: {
            id: true,
            actionDate: true,
            createdAt: true,
            stage: true,
            activityType: true,
            otherActivity: true,
            chemicalName: true,
            dosage: true,
            phiDays: true,
            notes: true,
            images: true,
            isGACCCompliant: true,
            farm: { select: { farmCode: true, farmName: true } },
        },
    });

    const newLogUrl = selectedFarmId
        ? `/dashboard/farmer/logs/new?farmId=${selectedFarmId}${selectedSeason ? `&seasonId=${selectedSeason.id}` : ""}`
        : "/dashboard/farmer/logs/new";

    return (
        <main className="w-full space-y-5">
            {/* Standard Header đồng bộ với các tab */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Leaf className="h-6 w-6 text-brand-600" />
                        NHẬT KÝ CANH TÁC
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Ghi chép các hoạt động chăm sóc, bón phân, tưới nước, tỉa cành và thu hoạch theo tiêu chuẩn VietGAP / GACC
                    </p>
                </div>

                {selectedSeason?.status === "CLOSED" ? (
                    <div className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 shrink-0">
                        <span>🔒 Vụ mùa đã đóng (Chế độ chỉ xem)</span>
                    </div>
                ) : (
                    <Button
                        asChild
                        className="rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-soft hover:bg-brand-700 shrink-0"
                    >
                        <Link href={newLogUrl}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            Ghi nhật ký
                        </Link>
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden rounded-[28px] border-slate-200 shadow-sm">
                {/* Mobile Card View */}
                <div className="space-y-3 p-3.5 md:hidden">
                    {logs.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Sprout className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                            <b className="text-slate-800">Chưa có nhật ký canh tác nào</b>
                            <p className="mt-1 text-xs">Hãy ghi hoạt động đầu tiên cho vườn của bạn.</p>
                        </div>
                    ) : (
                        logs.map(log => (
                            <article key={log.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">{formatVietnameseDateTime(log.actionDate)}</p>
                                        <h3 className="mt-0.5 text-base font-bold text-slate-900">{log.farm.farmName}</h3>
                                        <p className="text-xs text-slate-400">{log.farm.farmCode}</p>
                                    </div>
                                    <Badge className="max-w-32 whitespace-normal break-words bg-brand-50 text-center text-[11px] font-semibold leading-4 text-brand-700">
                                        {stageLabels[log.stage] ?? log.stage}
                                    </Badge>
                                </div>
                                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                                    <div>
                                        <dt className="text-slate-400">Hoạt động</dt>
                                        <dd className="mt-0.5 font-bold text-slate-800">
                                            {log.activityType === "OTHER" ? log.otherActivity || "Khác" : activityLabels[log.activityType] ?? log.activityType}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-400">Cách ly (PHI)</dt>
                                        <dd className="mt-0.5 font-semibold text-slate-700">
                                            {log.phiDays != null ? `${log.phiDays} ngày` : "—"}
                                        </dd>
                                    </div>
                                    {log.chemicalName && (
                                        <div className="col-span-2">
                                            <dt className="text-slate-400">Vật tư & Liều lượng</dt>
                                            <dd className="mt-0.5 font-semibold text-slate-800">
                                                {log.chemicalName} {log.dosage ? `· ${log.dosage}` : ""}
                                            </dd>
                                        </div>
                                    )}
                                    {log.notes && (
                                        <div className="col-span-2">
                                            <dt className="text-slate-400">Ghi chú</dt>
                                            <dd className="mt-0.5 text-slate-600 leading-relaxed">
                                                {log.notes}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </article>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[1240px] table-fixed text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr><th className="w-40 px-4 py-3">Ngày</th><th className="w-48 px-4 py-3">Vườn</th><th className="w-44 px-4 py-3">Giai đoạn</th><th className="w-44 px-4 py-3">Hoạt động</th><th className="w-36 px-4 py-3">Vật tư</th><th className="w-28 px-4 py-3">Liều lượng</th><th className="w-16 px-3 py-3">PHI</th><th className="w-64 px-4 py-3">Ghi chú</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length === 0 ? <tr><td colSpan={8} className="py-14 text-center text-slate-500"><Sprout className="mx-auto mb-3 h-9 w-9 text-slate-300" /><b>Chưa có nhật ký canh tác nào</b><p className="mt-1 text-sm">Hãy ghi hoạt động đầu tiên cho vườn của bạn.</p></td></tr> : logs.map(log => <tr key={log.id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-4 font-medium">{formatVietnameseDateTime(log.actionDate)}</td><td className="px-4 py-4"><b>{log.farm.farmName}</b><p className="mt-1 text-xs text-slate-400">{log.farm.farmCode}</p></td><td className="px-4 py-4"><Badge className="max-w-full whitespace-normal break-words bg-brand-50 text-center leading-5 text-brand-700">{stageLabels[log.stage] ?? log.stage}</Badge></td><td className="break-words px-4 py-4 font-semibold leading-5">{log.activityType === "OTHER" ? log.otherActivity || "Khác" : activityLabels[log.activityType] ?? log.activityType}</td><td className="break-words px-4 py-4">{log.chemicalName || "—"}</td><td className="break-words px-4 py-4">{log.dosage || "—"}</td><td className="px-3 py-4">{log.phiDays != null ? `${log.phiDays} ngày` : "—"}</td><td className="whitespace-pre-wrap break-words px-4 py-4 text-slate-600">{log.notes || "—"}</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>
    );
}
