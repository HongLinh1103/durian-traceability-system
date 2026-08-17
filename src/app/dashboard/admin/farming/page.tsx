"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Activity,
    Eye,
    LandPlot,
    Loader2,
    PauseCircle,
    PlayCircle,
    Sprout,
    X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

type FarmRow = {
    id: string;
    farmCode: string;
    farmName: string;
    ownerName: string;
    ownerId: string;
    growingRegion: string;
    address: string;
    areaSize: number;
    durianVariety: string;
    isActive: boolean;
    isInSeason: boolean;
    latestLogDate: string | null;
    logCount: number;
};

type Stats = {
    totalFarms: number;
    activeFarms: number;
    inSeasonFarms: number;
};

type FarmingLog = {
    id: string;
    actionDate: string;
    stage: string;
    activityType: string;
    chemicalName: string | null;
    dosage: string | null;
    phiDays: number | null;
    isGACCCompliant: boolean;
    notes: string | null;
};

type FarmDetail = {
    id: string;
    farmCode: string;
    farmName: string;
    areaSize: number;
    areaUnit: string;
    totalTrees: number;
    durianVariety: string;
    address: string;
    province: string | null;
    district: string | null;
    ward: string | null;
    latitude: number | null;
    longitude: number | null;
    notes: string | null;
    growingRegion: string | null;
    isActive: boolean;
    isInSeason: boolean;
    createdAt: string;
    updatedAt: string;
    farmer: {
        fullName: string | null;
        phone: string;
        email: string | null;
        address: string | null;
        province: string | null;
        district: string | null;
        ward: string | null;
        accountStatus: string;
    };
    region: {
        code: string;
        name: string;
        province: string;
        district: string | null;
        ward: string | null;
    } | null;
    farmingLogs: FarmingLog[];
};

const INITIAL_STATS: Stats = { totalFarms: 0, activeFarms: 0, inSeasonFarms: 0 };

const activityLabels: Record<string, string> = {
    BASE_FERTILIZING: "Bón lót",
    PLANTING: "Trồng",
    MULCHING: "Tủ gốc",
    SPRAY_PESTICIDE: "Phun thuốc BVTV",
    FERTILIZE: "Bón phân",
    FOLIAR_FERTILIZING: "Phun phân bón lá",
    IRRIGATE: "Tưới nước",
    PRUNE: "Tỉa cành / tạo tán",
    WEEDING: "Làm cỏ",
    SHOOT_MANAGEMENT: "Quản lý đọt",
    WATER_STRESS: "Xiết nước",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWER_THINNING: "Tỉa bông",
    POLLINATION: "Thụ phấn",
    FRUIT_THINNING: "Tỉa trái",
    PEST_INSPECTION: "Kiểm tra sâu bệnh",
    TRACK_FRUIT: "Theo dõi trái",
    FRUIT_BAGGING: "Bao trái",
    BRANCH_SUPPORT: "Chống cành",
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

function ActionButton({ label, children, onClick, tone = "slate" }: { label: string; children: React.ReactNode; onClick: () => void; tone?: "slate" | "amber" | "green" | "red" }) {
    const colors = {
        slate: "text-slate-600 hover:bg-slate-100",
        amber: "text-amber-600 hover:bg-amber-50",
        green: "text-green-600 hover:bg-green-50",
        red: "text-red-600 hover:bg-red-50",
    };
    return (
        <div className="group relative">
            <button type="button" onClick={onClick} aria-label={label} className={`rounded-xl p-2 transition ${colors[tone]}`}>{children}</button>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">{label}</span>
        </div>
    );
}

export default function FarmingManagementPage() {
    const { toast } = useToast();
    const [farms, setFarms] = useState<FarmRow[]>([]);
    const [stats, setStats] = useState<Stats>(INITIAL_STATS);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [logFarm, setLogFarm] = useState<FarmRow | null>(null);
    const [farmDetail, setFarmDetail] = useState<FarmDetail | null>(null);
    const [logs, setLogs] = useState<FarmingLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const loadFarms = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/farming", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setFarms(payload.data);
            setStats(payload.stats);
        } catch (error) {
            toast({ title: "Không thể tải dữ liệu canh tác", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { void loadFarms(); }, [loadFarms]);

    const openLogs = async (farm: FarmRow) => {
        setLogFarm(farm);
        setFarmDetail(null);
        setLogs([]);
        setLogsLoading(true);
        try {
            const response = await fetch(`/api/admin/farming/${farm.id}`, { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setFarmDetail(payload.data);
            setLogs(payload.data.farmingLogs);
        } catch (error) {
            toast({ title: "Không thể tải nhật ký", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setLogsLoading(false);
        }
    };

    const toggleFarm = async (farm: FarmRow) => {
        setProcessingId(farm.id);
        try {
            const response = await fetch(`/api/admin/farming/${farm.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !farm.isActive }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: farm.isActive ? "Đã tạm ngừng vườn" : "Đã kích hoạt lại vườn", variant: "success" });
            await loadFarms();
        } catch (error) {
            toast({ title: "Không thể cập nhật", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    const statCards = [
        { label: "Tổng số vườn trồng", value: stats.totalFarms, icon: LandPlot, tone: "bg-blue-50 text-blue-700" },
        { label: "Vườn đang hoạt động", value: stats.activeFarms, icon: Activity, tone: "bg-green-50 text-green-700" },
        { label: "Đang trong mùa vụ", value: stats.inSeasonFarms, icon: Sprout, tone: "bg-emerald-50 text-emerald-700" },
    ];

    return (
        <main className="mx-auto min-h-screen max-w-[1600px] px-3 py-6 sm:px-5">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">ADMIN · Vùng trồng</p>
                <h1 className="mt-2 text-3xl font-black text-slate-900">Quản lý canh tác</h1>
                <p className="mt-2 text-sm text-slate-500">Theo dõi tình trạng vườn, mùa vụ và tiến độ cập nhật nhật ký canh tác.</p>
            </div>

            <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="min-h-32 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:min-h-0 sm:rounded-[20px]">
                            <div className={`inline-flex rounded-xl p-2.5 ${item.tone}`}><Icon className="h-5 w-5" /></div>
                            <p className="mt-3 text-[28px] font-black leading-none text-slate-900 sm:text-xl">{item.value}</p>
                            <p className="mt-2 text-sm font-medium leading-snug text-slate-600 sm:mt-1 sm:text-xs sm:font-normal sm:text-slate-500">{item.label}</p>
                        </div>
                    );
                })}
            </section>

            <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-bold text-slate-900">Danh sách vườn trồng</h2>
                    <p className="text-sm text-slate-500">Các vườn đã đăng ký trong hệ thống Triviet.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                {["Mã vườn", "Tên vườn", "Chủ vườn", "Vùng trực thuộc", "Nhật ký gần nhất", "Thao tác"].map((heading) => (
                                    <th key={heading} className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-600" /></td></tr>
                            ) : farms.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center font-medium text-slate-500">Chưa có vườn trồng nào được đăng ký.</td></tr>
                            ) : farms.map((farm) => (
                                <tr key={farm.id} className="hover:bg-slate-50/70">
                                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-brand-700">{farm.farmCode}</td>
                                    <td className="max-w-48 px-4 py-4 font-semibold text-slate-900">{farm.farmName}</td>
                                    <td className="px-4 py-4">{farm.ownerName}</td>
                                    <td className="px-4 py-4">{farm.growingRegion}</td>
                                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">{farm.latestLogDate ? new Date(farm.latestLogDate).toLocaleDateString("vi-VN") : "Chưa có nhật ký"}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1">
                                            <ActionButton label="Xem thông tin vườn và nhật ký" onClick={() => void openLogs(farm)}><Eye className="h-4 w-4" /></ActionButton>
                                            <ActionButton label={farm.isActive ? "Tạm ngừng" : "Kích hoạt lại"} tone={farm.isActive ? "red" : "green"} onClick={() => void toggleFarm(farm)}>
                                                {processingId === farm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : farm.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                                            </ActionButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {logFarm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-5">
                            <div><h2 className="text-xl font-bold">Chi tiết vườn · {logFarm.farmName}</h2><p className="text-sm text-slate-500">{logFarm.farmCode} · {logFarm.logCount} bản ghi nhật ký</p></div>
                            <button onClick={() => { setLogFarm(null); setFarmDetail(null); }} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="max-h-[78vh] overflow-auto">
                            {logsLoading && !farmDetail ? (
                                <div className="py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-600" /></div>
                            ) : farmDetail && (
                                <div className="grid gap-4 border-b border-slate-200 bg-slate-50/60 p-5 lg:grid-cols-3">
                                    <DetailPanel title="Thông tin vườn">
                                        <DetailItem label="Mã vườn" value={farmDetail.farmCode} />
                                        <DetailItem label="Tên vườn" value={farmDetail.farmName} />
                                        <DetailItem label="Diện tích" value={`${farmDetail.areaSize.toLocaleString("vi-VN")} ${farmDetail.areaUnit === "SQUARE_METER" ? "m²" : "ha"}`} />
                                        <DetailItem label="Số cây" value={farmDetail.totalTrees.toLocaleString("vi-VN")} />
                                        <DetailItem label="Giống" value={farmDetail.durianVariety} />
                                        <DetailItem label="Địa chỉ" value={[farmDetail.address, farmDetail.ward, farmDetail.district, farmDetail.province].filter(Boolean).join(", ")} />
                                        <DetailItem label="Tọa độ" value={farmDetail.latitude != null && farmDetail.longitude != null ? `${farmDetail.latitude}, ${farmDetail.longitude}` : null} />
                                        <DetailItem label="Ghi chú" value={farmDetail.notes} />
                                    </DetailPanel>
                                    <DetailPanel title="Chủ vườn">
                                        <DetailItem label="Họ và tên" value={farmDetail.farmer.fullName} />
                                        <DetailItem label="Số điện thoại" value={farmDetail.farmer.phone} />
                                        <DetailItem label="Email" value={farmDetail.farmer.email} />
                                        <DetailItem label="Địa chỉ" value={[farmDetail.farmer.address, farmDetail.farmer.ward, farmDetail.farmer.district, farmDetail.farmer.province].filter(Boolean).join(", ")} />
                                        <DetailItem label="Tài khoản" value={farmDetail.farmer.accountStatus === "APPROVED" ? "Đã phê duyệt" : farmDetail.farmer.accountStatus} />
                                    </DetailPanel>
                                    <DetailPanel title="Vùng trồng và trạng thái">
                                        <DetailItem label="Mã vùng" value={farmDetail.region?.code} />
                                        <DetailItem label="Tên vùng" value={farmDetail.region?.name ?? farmDetail.growingRegion} />
                                        <DetailItem label="Địa bàn" value={[farmDetail.region?.ward, farmDetail.region?.district, farmDetail.region?.province].filter(Boolean).join(", ")} />
                                        <DetailItem label="Hoạt động" value={farmDetail.isActive ? "Đang hoạt động" : "Ngừng hoạt động"} />
                                        <DetailItem label="Mùa vụ" value={farmDetail.isInSeason ? "Đang trong mùa vụ" : "Ngoài mùa vụ"} />
                                        <DetailItem label="Ngày đăng ký" value={new Date(farmDetail.createdAt).toLocaleDateString("vi-VN")} />
                                        <DetailItem label="Cập nhật" value={new Date(farmDetail.updatedAt).toLocaleString("vi-VN")} />
                                    </DetailPanel>
                                </div>
                            )}
                            <div className="border-b border-slate-200 px-5 py-4">
                                <h3 className="font-bold text-slate-900">Nhật ký canh tác đã ghi</h3>
                            </div>
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Ngày", "Giai đoạn", "Hoạt động", "Vật tư", "Liều lượng", "PHI", "GACC", "Ghi chú"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logsLoading ? <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr> :
                                        logs.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-slate-500">Vườn chưa có bản ghi nhật ký nào.</td></tr> :
                                            logs.map((log) => <tr key={log.id}>
                                                <td className="whitespace-nowrap px-4 py-3">{new Date(log.actionDate).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                                                <td className="px-4 py-3">{stageLabels[log.stage] ?? log.stage}</td>
                                                <td className="px-4 py-3">{activityLabels[log.activityType] ?? log.activityType}</td>
                                                <td className="px-4 py-3">{log.chemicalName || "—"}</td>
                                                <td className="px-4 py-3">{log.dosage || "—"}</td>
                                                <td className="px-4 py-3">{log.phiDays ?? "—"}</td>
                                                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${log.isGACCCompliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{log.isGACCCompliant ? "Đạt" : "Không đạt"}</span></td>
                                                <td className="max-w-64 px-4 py-3">{log.notes || "—"}</td>
                                            </tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}

function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-bold text-slate-900">{title}</h3>
            <dl className="space-y-2">{children}</dl>
        </section>
    );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-2 border-b border-slate-100 pb-2 text-sm last:border-0 last:pb-0">
            <dt className="text-slate-500">{label}</dt>
            <dd className="break-words font-medium text-slate-900">{value || "—"}</dd>
        </div>
    );
}
