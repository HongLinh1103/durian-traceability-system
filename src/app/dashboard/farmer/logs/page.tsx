import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sprout } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatVietnameseDateTime } from "@/lib/date-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const activityLabels: Record<string, string> = {
    SPRAY_PESTICIDE: "Phun thuốc",
    FERTILIZE: "Bón phân",
    IRRIGATE: "Tưới nước",
    WEEDING: "Làm cỏ",
    PRUNE: "Cắt tỉa",
};

const stageLabels: Record<string, string> = {
    MAKING_SPROUT: "Làm đọt",
    FLOWERING: "Ra hoa",
    FRUIT_SETTING: "Đậu trái",
    FRUIT_GROWING: "Nuôi trái",
    HARVEST: "Thu hoạch",
};

export const dynamic = "force-dynamic";

export default async function FarmerLogsPage({ searchParams = {} }: { searchParams?: { farmId?: string; year?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "FARMER") redirect("/");

    const selectedYear = /^\d{4}$/.test(searchParams.year || "") ? Number(searchParams.year) : new Date().getFullYear();
    const farms = await prisma.farm.findMany({ where: { farmerId: session.user.id, isActive: true }, select: { id: true, farmName: true, farmCode: true }, orderBy: { farmName: "asc" } });
    const selectedFarmId = farms.some(farm => farm.id === searchParams.farmId) ? searchParams.farmId : undefined;
    const logs = await prisma.farmingLog.findMany({
        where: { farm: { farmerId: session.user.id }, ...(selectedFarmId ? { farmId: selectedFarmId } : {}), actionDate: { gte: new Date(`${selectedYear}-01-01T00:00:00+07:00`), lt: new Date(`${selectedYear + 1}-01-01T00:00:00+07:00`) } },
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

    return (
        <main className="w-full space-y-5">
            <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                <form method="get" className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                    <input type="hidden" name="tab" value="cultivation" />
                    <div className="sm:w-52"><select id="journal-year" name="year" aria-label="Chọn năm" defaultValue={String(selectedYear)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4">{Array.from({length:7},(_,index)=>new Date().getFullYear()-5+index).map(year=><option key={year} value={year}>{year}</option>)}</select></div>
                    <div className="sm:min-w-72 sm:flex-1"><select id="journal-farm" name="farmId" aria-label="Chọn vườn" defaultValue={selectedFarmId||""} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4"><option value="">Tất cả vườn</option>{farms.map(farm=><option key={farm.id} value={farm.id}>{farm.farmName} · {farm.farmCode}</option>)}</select></div>
                    <Button type="submit" variant="outline" className="h-12 shrink-0 whitespace-nowrap px-5">Áp dụng bộ lọc</Button>
                </form>
                <Button asChild className="h-12 shrink-0 whitespace-nowrap px-6">
                    <Link href="/dashboard/farmer/logs/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Ghi nhật ký mới
                    </Link>
                </Button>
            </div>

            <Card className="overflow-hidden rounded-[28px] border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr><th className="w-40 px-4 py-3">Ngày</th><th className="w-48 px-4 py-3">Vườn</th><th className="w-32 px-4 py-3">Giai đoạn</th><th className="w-32 px-4 py-3">Hoạt động</th><th className="w-36 px-4 py-3">Vật tư</th><th className="w-28 px-4 py-3">Liều lượng</th><th className="w-16 px-3 py-3">PHI</th><th className="w-64 px-4 py-3">Ghi chú</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length === 0 ? <tr><td colSpan={8} className="py-14 text-center text-slate-500"><Sprout className="mx-auto mb-3 h-9 w-9 text-slate-300"/><b>Chưa có nhật ký canh tác nào</b><p className="mt-1 text-sm">Hãy ghi hoạt động đầu tiên cho vườn của bạn.</p></td></tr> : logs.map(log=><tr key={log.id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-4 font-medium">{formatVietnameseDateTime(log.actionDate)}</td><td className="px-4 py-4"><b>{log.farm.farmName}</b><p className="mt-1 text-xs text-slate-400">{log.farm.farmCode}</p></td><td className="px-4 py-4"><Badge className="bg-emerald-50 text-emerald-700">{stageLabels[log.stage]??log.stage}</Badge></td><td className="px-4 py-4 font-semibold">{log.activityType==="OTHER"?log.otherActivity||"Khác":activityLabels[log.activityType]??log.activityType}</td><td className="break-words px-4 py-4">{log.chemicalName||"—"}</td><td className="break-words px-4 py-4">{log.dosage||"—"}</td><td className="px-3 py-4">{log.phiDays!=null?`${log.phiDays} ngày`:"—"}</td><td className="whitespace-pre-wrap break-words px-4 py-4 text-slate-600">{log.notes||"—"}</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>
    );
}
