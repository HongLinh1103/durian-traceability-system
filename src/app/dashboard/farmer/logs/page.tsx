import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Camera, Leaf, Plus, ShieldCheck, Sprout } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatVietnameseDateTime } from "@/lib/date-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export default async function FarmerLogsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "FARMER") redirect("/");

    const logs = await prisma.farmingLog.findMany({
        where: { farm: { farmerId: session.user.id } },
        orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
        select: {
            id: true,
            actionDate: true,
            createdAt: true,
            stage: true,
            activityType: true,
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
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                        <Leaf className="h-6 w-6" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Nhật ký canh tác</h1>
                        <p className="text-sm text-slate-500">
                            Danh sách được sắp xếp theo thời gian thực hiện gần nhất.
                        </p>
                    </div>
                </div>
                <Button asChild>
                    <Link href="/dashboard/farmer/logs/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Ghi nhật ký mới
                    </Link>
                </Button>
            </div>

            {logs.length === 0 ? (
                <Card className="rounded-[28px] border-dashed">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                        <Sprout className="mb-3 h-10 w-10 text-slate-300" />
                        <p className="font-semibold text-slate-700">Chưa có nhật ký canh tác nào</p>
                        <p className="mt-1 text-sm text-slate-500">Hãy ghi hoạt động đầu tiên cho vườn của bạn.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <Card key={log.id} className="overflow-hidden rounded-[28px] border-slate-100 shadow-sm">
                            <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {activityLabels[log.activityType] ?? log.activityType}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            {log.farm.farmCode} · {log.farm.farmName}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm">
                                        <CalendarDays className="h-4 w-4" />
                                        {formatVietnameseDateTime(log.actionDate)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <div className="flex flex-wrap gap-2">
                                    <Badge className="bg-emerald-50 text-emerald-700">
                                        {stageLabels[log.stage] ?? log.stage}
                                    </Badge>
                                    {log.chemicalName && <Badge className="bg-blue-50 text-blue-700">{log.chemicalName}</Badge>}
                                    {log.dosage && <Badge className="bg-violet-50 text-violet-700">Liều lượng: {log.dosage}</Badge>}
                                    {log.phiDays != null && <Badge className="bg-amber-50 text-amber-700">PHI: {log.phiDays} ngày</Badge>}
                                    {log.images.length > 0 && (
                                        <Badge className="bg-slate-100 text-slate-700">
                                            <Camera className="mr-1 h-3.5 w-3.5" />
                                            {log.images.length} ảnh
                                        </Badge>
                                    )}
                                    <Badge className={log.isGACCCompliant ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}>
                                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                        {log.isGACCCompliant ? "Phù hợp GACC" : "Cần kiểm tra GACC"}
                                    </Badge>
                                </div>
                                {log.notes && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{log.notes}</p>}
                                <p className="text-xs text-slate-400">
                                    Đã lưu lúc {new Date(log.createdAt).toLocaleString("vi-VN")}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </main>
    );
}
