import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Camera, History, ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";
import { formatVietnameseDateTime } from "@/lib/date-format";
import { ReminderButton } from "@/components/region-manager/reminder-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const activityLabels: Record<string, string> = { SPRAY_PESTICIDE: "Phun thuốc", FERTILIZE: "Bón phân", IRRIGATE: "Tưới nước", PRUNE: "Cắt tỉa", WEEDING: "Làm cỏ" };
const stageLabels: Record<string, string> = { MAKING_SPROUT: "Làm đọt", FLOWERING: "Ra hoa", FRUIT_SETTING: "Đậu trái", FRUIT_GROWING: "Nuôi trái", HARVEST: "Thu hoạch" };
export const dynamic = "force-dynamic";

export default async function GardenLogsPage({ params }: { params: { gardenId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    if (!scope) redirect("/");

    const garden = await prisma.farm.findFirst({
        where: { id: params.gardenId, region: { code: { in: scope.codes } } },
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

        <div className="flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold">Nhật ký canh tác</h2></div>
        {garden.farmingLogs.length === 0 ? <Card className="rounded-[28px] border-dashed"><CardContent className="py-12 text-center text-slate-500">Vườn này chưa có nhật ký canh tác.</CardContent></Card> :
            <div className="space-y-4">{garden.farmingLogs.map((log) => <Card key={log.id} className="rounded-[26px]">
                <CardHeader className="pb-3"><div className="flex flex-wrap justify-between gap-3"><div><CardTitle className="text-lg">{activityLabels[log.activityType] ?? log.activityType}</CardTitle><CardDescription>{stageLabels[log.stage] ?? log.stage}</CardDescription></div><span className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CalendarDays className="h-4 w-4" />{formatVietnameseDateTime(log.actionDate)}</span></div></CardHeader>
                <CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{log.chemicalName && <Badge className="bg-blue-50 text-blue-700">{log.chemicalName}</Badge>}{log.dosage && <Badge className="bg-violet-50 text-violet-700">{log.dosage}</Badge>}{log.phiDays != null && <Badge className="bg-amber-50 text-amber-700">PHI: {log.phiDays} ngày</Badge>}{log.images.length > 0 && <Badge className="bg-slate-100 text-slate-700"><Camera className="mr-1 h-3.5 w-3.5" />{log.images.length} ảnh</Badge>}<Badge className={log.isGACCCompliant ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}><ShieldCheck className="mr-1 h-3.5 w-3.5" />{log.isGACCCompliant ? "Phù hợp GACC" : "Cần kiểm tra GACC"}</Badge></div>{log.notes && <p className="whitespace-pre-wrap text-sm text-slate-600">{log.notes}</p>}</CardContent>
            </Card>)}</div>}
    </main>;
}
