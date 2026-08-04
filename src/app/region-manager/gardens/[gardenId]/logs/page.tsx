import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";
import { ReminderButton } from "@/components/region-manager/reminder-button";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const activityLabels: Record<string, string> = { SPRAY_PESTICIDE: "Phun thuốc", FERTILIZE: "Bón phân", IRRIGATE: "Tưới nước", PRUNE: "Cắt tỉa", WEEDING: "Làm cỏ" };
const stageLabels: Record<string, string> = { MAKING_SPROUT: "Làm đọt", FLOWERING: "Ra hoa", FRUIT_SETTING: "Đậu trái", FRUIT_GROWING: "Nuôi trái", HARVEST: "Thu hoạch" };
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
            id: true, farmCode: true, farmName: true,
            farmer: { select: { fullName: true, phone: true } },
            region: { select: { code: true, name: true } },
            farmingLogs: { orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }] },
        },
    });
    if (!garden) notFound();

    const latest = garden.farmingLogs[0]?.actionDate;
    const daysOverdue = latest ? Math.max(0, Math.floor((Date.now() - latest.getTime()) / 86_400_000)) : null;
    const shouldRemind = daysOverdue === null || daysOverdue >= 3;

    return <main className="mx-auto min-h-screen max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div><Button asChild variant="outline" size="sm"><Link href="/region-manager/gardens"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại danh sách</Link></Button></div>
        <Card className="rounded-[28px] border-emerald-100">
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div><p className="text-sm font-semibold text-emerald-700">{garden.farmCode}</p><CardTitle className="mt-1 text-2xl">{garden.farmName}</CardTitle><CardDescription className="mt-2">{garden.farmer.fullName || garden.farmer.phone} · {garden.farmer.phone}<br />{garden.region?.code} – {garden.region?.name}</CardDescription></div>
                    {shouldRemind && <ReminderButton gardenId={garden.id} />}
                </div>
            </CardHeader>
        </Card>

        {shouldRemind && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
            {daysOverdue === null ? "Vườn này chưa có nhật ký canh tác." : `Vườn đã ${daysOverdue} ngày chưa cập nhật nhật ký.`}
        </div>}

        <Card className="overflow-hidden rounded-[28px] border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
                <History className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900">Nhật ký canh tác đã ghi</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            {["Ngày", "Giai đoạn", "Hoạt động", "Vật tư", "Liều lượng", "PHI", "GACC", "Ghi chú"].map((heading) => (
                                <th key={heading} className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {garden.farmingLogs.length === 0 ? (
                            <tr><td colSpan={8} className="py-12 text-center text-slate-500">Vườn này chưa có nhật ký canh tác.</td></tr>
                        ) : garden.farmingLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/70">
                                <td className="whitespace-nowrap px-4 py-3">{log.actionDate.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                                <td className="px-4 py-3">{stageLabels[log.stage] ?? log.stage}</td>
                                <td className="px-4 py-3">{activityLabels[log.activityType] ?? log.activityType}</td>
                                <td className="px-4 py-3">{log.chemicalName || "—"}</td>
                                <td className="px-4 py-3">{log.dosage || "—"}</td>
                                <td className="px-4 py-3">{log.phiDays ?? "—"}</td>
                                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${log.isGACCCompliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{log.isGACCCompliant ? "Đạt" : "Không đạt"}</span></td>
                                <td className="max-w-64 whitespace-pre-wrap px-4 py-3">{log.notes || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    </main>;
}
