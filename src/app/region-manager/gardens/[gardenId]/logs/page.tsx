import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const activityLabels: Record<string, string> = {
    BASE_FERTILIZING: "Bón lót", PLANTING: "Trồng", MULCHING: "Tủ gốc", SPRAY_PESTICIDE: "Phun thuốc BVTV",
    FERTILIZE: "Bón phân", FOLIAR_FERTILIZING: "Phun phân bón lá", IRRIGATE: "Tưới nước", PRUNE: "Tỉa cành / tạo tán",
    WEEDING: "Làm cỏ", SHOOT_MANAGEMENT: "Quản lý đọt", WATER_STRESS: "Xiết nước", FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWER_THINNING: "Tỉa bông", POLLINATION: "Thụ phấn", FRUIT_THINNING: "Tỉa trái", PEST_INSPECTION: "Kiểm tra sâu bệnh",
    TRACK_FRUIT: "Theo dõi trái", FRUIT_BAGGING: "Bao trái", BRANCH_SUPPORT: "Chống cành", HARVEST: "Thu hoạch",
    FRUIT_GRADING: "Phân loại trái", GARDEN_SANITATION: "Vệ sinh vườn", OTHER: "Khác",
};
const stageLabels: Record<string, string> = { POST_HARVEST_RECOVERY: "Phục hồi sau thu hoạch", MAKING_SPROUT: "Làm đọt", FLOWER_INDUCTION: "Xử lý ra hoa", FLOWERING: "Ra hoa", FRUIT_SETTING: "Đậu trái", FRUIT_GROWING: "Nuôi trái", PRE_HARVEST: "Trước thu hoạch", HARVEST: "Thu hoạch" };
export const dynamic = "force-dynamic";

export default async function GardenLogsPage({ params }: { params: { gardenId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    if (!scope) redirect("/");

    const garden = await prisma.farm.findFirst({
        where: {
            id: params.gardenId,
            isActive: true,
            region: { code: { in: scope.codes } },
            farmer: { accountStatus: "APPROVED", isApproved: true, deletedAt: null },
        },
        select: {
            id: true, farmCode: true, farmName: true, createdAt: true,
            farmer: { select: { fullName: true, phone: true, approvedAt: true } },
            region: { select: { code: true, name: true } },
            farmingLogs: { orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }] },
        },
    });
    if (!garden) notFound();

    return <main className="mx-auto min-h-screen max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div><Button asChild variant="outline" size="sm"><Link href="/region-manager/gardens"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại danh sách</Link></Button></div>
        <Card className="rounded-[28px] border-emerald-100">
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div><p className="text-sm font-semibold text-emerald-700">{garden.farmCode}</p><CardTitle className="mt-1 text-2xl">{garden.farmName}</CardTitle><CardDescription className="mt-2">{garden.farmer.fullName || garden.farmer.phone} · {garden.farmer.phone}<br />{garden.region?.code} – {garden.region?.name}</CardDescription></div>
                </div>
            </CardHeader>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-slate-300 shadow-sm bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
                <History className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900">Nhật ký canh tác đã ghi</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] table-fixed border-collapse border border-slate-300 text-left text-sm">
                    <thead className="bg-slate-100/90 text-xs text-slate-700">
                        <tr>
                            <th className="w-36 border border-slate-300 whitespace-nowrap px-3.5 py-3 font-semibold text-center align-middle">Ngày</th>
                            <th className="w-28 border border-slate-300 whitespace-nowrap px-3.5 py-3 font-semibold text-center align-middle">Giai đoạn</th>
                            <th className="w-28 border border-slate-300 whitespace-nowrap px-3.5 py-3 font-semibold text-center align-middle">Hoạt động</th>
                            <th className="w-36 border border-slate-300 px-3.5 py-3 font-semibold text-center align-middle">Vật tư</th>
                            <th className="w-28 border border-slate-300 px-3.5 py-3 font-semibold text-center align-middle">Liều lượng</th>
                            <th className="w-16 border border-slate-300 px-2 py-3 font-semibold text-center align-middle">PHI</th>
                            <th className="w-56 border border-slate-300 px-3.5 py-3 font-semibold text-center align-middle">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {garden.farmingLogs.length === 0 ? (
                            <tr><td colSpan={7} className="border border-slate-200 py-12 text-center text-slate-500">Vườn này chưa có nhật ký canh tác.</td></tr>
                        ) : garden.farmingLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/70 transition">
                                <td className="border border-slate-200 whitespace-nowrap px-3.5 py-2.5 text-center text-xs">{log.actionDate.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                                <td className="border border-slate-200 px-3.5 py-2.5 font-medium">{stageLabels[log.stage] ?? log.stage}</td>
                                <td className="border border-slate-200 px-3.5 py-2.5 font-medium">{activityLabels[log.activityType] ?? log.activityType}</td>
                                <td className="border border-slate-200 break-words px-3.5 py-2.5 text-xs leading-5">{log.chemicalName || "—"}</td>
                                <td className="border border-slate-200 break-words px-3.5 py-2.5 text-xs leading-5 text-center">{log.dosage || "—"}</td>
                                <td className="border border-slate-200 px-3.5 py-2.5 text-center">{log.phiDays ?? "—"}</td>
                                <td className="border border-slate-200 w-56 max-w-56 whitespace-pre-wrap break-words px-3.5 py-2.5 text-slate-600">{log.notes || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    </main>;
}
