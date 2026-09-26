"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    Camera,
    Cloud,
    CloudFog,
    CloudRain,
    CloudSun,
    Edit3,
    ImagePlus,
    Plus,
    Sun,
    Trash2,
    X,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";
import { useToast } from "@/components/ui/toast";
import { formatVietnameseDate } from "@/lib/date-format";

type Farm = { id: string; farmCode: string; farmName: string };
type Observation = {
    id: string;
    farmId: string;
    observedAt: string;
    timeOfDay?: string | null;
    condition: string;
    temperature: number | null;
    temperatureMax: number | null;
    temperatureMin: number | null;
    humidity: number | null;
    soilCondition?: string | null;
    soilHumidity: number | null;
    rainLevel: string | null;
    rainStartedAt: string | null;
    rainfallMm: number | null;
    windLevel: string;
    windDirection: string | null;
    windSpeed: number | null;
    phenomena: string[];
    note: string | null;
    images: string[];
    farm: { farmName: string; farmCode: string };
};

const weatherConditions = [
    { v: "SUNNY", l: "Nắng", Icon: Sun },
    { v: "PARTLY_CLOUDY", l: "Có mây", Icon: CloudSun },
    { v: "CLOUDY", l: "Nhiều mây", Icon: Cloud },
    { v: "OVERCAST", l: "Âm u", Icon: Cloud },
    { v: "RAIN", l: "Có mưa", Icon: CloudRain },
    { v: "FOG", l: "Sương mù", Icon: CloudFog },
];

const conditionLabels: Record<string, string> = {
    SUNNY: "Nắng",
    PARTLY_CLOUDY: "Có mây",
    CLOUDY: "Nhiều mây",
    OVERCAST: "Âm u",
    LIGHT_RAIN: "Mưa nhẹ",
    RAIN: "Có mưa",
    THUNDERSTORM: "Mưa dông",
    FOG: "Sương mù",
};

const timeOfDayOptions = ["Cả ngày", "Sáng", "Trưa", "Chiều", "Tối"];

const soilConditionOptions = [
    "Ẩm",
    "Khô",
    "Rất khô / Nứt nẻ",
    "Ướt",
    "Ngập nước",
    "Bình thường",
];

const rainLevelOptions = [
    "Mưa vừa",
    "Mưa nhẹ / Phùn",
    "Mưa to",
    "Mưa rất to",
    "Mưa dông",
];

const phenomenaList = [
    "Sấm sét",
    "Gió giật",
    "Sương",
    "Mưa kéo dài",
    "Ngập / đọng nước",
    "Nắng gắt",
    "Mưa đá",
    "Khác",
];

const dateKey = (date = new Date()) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);

export function WeatherJournal({ defaultFarmId }: { defaultFarmId?: string } = {}) {
    const { toast } = useToast();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [rows, setRows] = useState<Observation[]>([]);
    const [farmId, setFarmId] = useState(defaultFarmId || "");
    const [range, setRange] = useState<"today" | "week" | "month" | "all">("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Observation | null>(null);
    const [busy, setBusy] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Form state
    const [selectedConditions, setSelectedConditions] = useState<string[]>(["SUNNY"]);
    const [selectedPhenomena, setSelectedPhenomena] = useState<string[]>([]);
    const [selectedTimeOfDay, setSelectedTimeOfDay] = useState("Cả ngày");
    const [selectedSoilCondition, setSelectedSoilCondition] = useState("Ẩm");
    const [selectedRainLevel, setSelectedRainLevel] = useState("Mưa vừa");
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

    const hasRain = selectedConditions.includes("RAIN");

    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (defaultFarmId) {
            setFarmId(defaultFarmId);
        }
    }, [defaultFarmId]);

    useEffect(() => {
        let isMounted = true;
        fetch("/api/farming-logs", { cache: "no-store" })
            .then(r => (r.ok ? r.json() : null))
            .then(p => {
                if (!isMounted || !p) return;
                const f = p.data?.farms || [];
                setFarms(f);
                if (!defaultFarmId && f[0]) setFarmId(f[0].id);
            })
            .catch(err => {
                console.error("Error loading farms:", err);
            });
        return () => {
            isMounted = false;
        };
    }, [defaultFarmId]);

    const dates = useMemo(() => {
        if (from || to) return { from, to };
        if (range === "all") return {};
        const now = new Date();
        if (range === "today") return { from: dateKey(now), to: dateKey(now) };
        const start = new Date(now);
        if (range === "week") start.setDate(now.getDate() - 6);
        else start.setDate(1);
        return { from: dateKey(start), to: dateKey(now) };
    }, [range, from, to]);

    const load = useCallback(async () => {
        if (!farmId) return;
        try {
            const params = new URLSearchParams({ farmId });
            if (dates.from) params.set("from", dates.from);
            if (dates.to) params.set("to", dates.to);
            const res = await fetch(`/api/weather-observations?${params.toString()}`, { cache: "no-store" });
            if (!res.ok) return;
            const p = (await res.json().catch(() => null)) as { success?: boolean; data?: Observation[] } | null;
            if (p?.success && Array.isArray(p.data)) {
                setRows(p.data);
            }
        } catch (error) {
            console.error("Error loading weather observations:", error);
        }
    }, [farmId, dates]);

    useEffect(() => {
        void load();
    }, [load]);

    function showForm(row?: Observation) {
        setEditing(row || null);
        if (row) {
            const rawConds = (row.condition || "").split(",").filter(Boolean);
            const normalizedConds = rawConds.map(c =>
                c === "LIGHT_RAIN" || c === "THUNDERSTORM" ? "RAIN" : c
            );
            setSelectedConditions(normalizedConds.length ? [...new Set(normalizedConds)] : ["SUNNY"]);
            setSelectedPhenomena(row.phenomena || []);
            setSelectedTimeOfDay(row.timeOfDay || "Cả ngày");
            setSelectedSoilCondition(row.soilCondition || "Ẩm");

            let defaultRain = row.rainLevel || "Mưa vừa";
            if (defaultRain === "Không mưa" || !rainLevelOptions.includes(defaultRain)) {
                if (rawConds.includes("THUNDERSTORM")) {
                    defaultRain = "Mưa dông";
                } else if (rawConds.includes("LIGHT_RAIN")) {
                    defaultRain = "Mưa nhẹ / Phùn";
                } else {
                    defaultRain = "Mưa vừa";
                }
            }
            setSelectedRainLevel(defaultRain);
            setExistingImages(row.images || []);
        } else {
            setSelectedConditions(["SUNNY"]);
            setSelectedPhenomena([]);
            setSelectedTimeOfDay("Cả ngày");
            setSelectedSoilCondition("Ẩm");
            setSelectedRainLevel("Mưa vừa");
            setExistingImages([]);
        }
        setImagePreviews([]);
        setFilesToUpload([]);
        setOpen(true);
    }

    function toggleCondition(v: string) {
        setSelectedConditions(current =>
            current.includes(v)
                ? current.length > 1
                    ? current.filter(x => x !== v)
                    : current
                : [...current, v],
        );
    }

    function togglePhenomenon(item: string) {
        setSelectedPhenomena(current =>
            current.includes(item) ? current.filter(x => x !== item) : [...current, item],
        );
    }

    function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return;
        const newFiles = Array.from(e.target.files);
        setFilesToUpload(prev => [...prev, ...newFiles]);

        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                if (typeof ev.target?.result === "string") {
                    setImagePreviews(prev => [...prev, ev.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    }

    function removePreviewImage(index: number) {
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    }

    function removeExistingImage(index: number) {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    }

    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const formElement = event.currentTarget;
        if (!formElement.reportValidity()) return;
        setBusy(true);

        const form = new FormData(formElement);
        // Append additional files
        filesToUpload.forEach(file => {
            form.append("images", file);
        });

        try {
            const response = await fetch(
                editing ? `/api/weather-observations/${editing.id}` : "/api/weather-observations",
                {
                    method: editing ? "PUT" : "POST",
                    body: form,
                },
            );
            const p = (await response.json().catch(() => null)) as { message?: string } | null;
            if (!response.ok) throw new Error(p?.message || "Máy chủ không thể lưu nhật ký thời tiết.");

            toast({
                title: editing ? "Đã cập nhật nhật ký" : "Đã lưu nhật ký thời tiết",
                variant: "success",
            });
            setOpen(false);
            setEditing(null);
            await load();
        } catch (e) {
            toast({
                title: "Không thể lưu",
                description: e instanceof Error ? e.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setBusy(false);
        }
    }

    async function remove(row: Observation) {
        const formattedDate = formatVietnameseDate(row.observedAt);
        if (!confirm(`Bạn có chắc muốn xóa nhật ký thời tiết ngày ${formattedDate}?`)) return;
        const response = await fetch(`/api/weather-observations/${row.id}`, { method: "DELETE" });
        if (response.ok) {
            toast({ title: "Đã xóa nhật ký thời tiết", variant: "success" });
            await load();
        }
    }

    return (
        <div className="w-full space-y-5">
            {/* Standard Header đồng bộ với các tab */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                        <CloudSun className="h-6 w-6 text-brand-600" />
                        NHẬT KÝ THỜI TIẾT
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Theo dõi nhiệt độ, lượng mưa, độ ẩm đất và các hiện tượng thời tiết tại vườn trồng
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={exporting || rows.length === 0}
                        onClick={async () => {
                            setExporting(true);
                            try {
                                const { exportWeatherJournalDocx } = await import("@/lib/farmer-docx-export");
                                const currentFarm = farms.find((f) => f.id === farmId) || rows[0]?.farm;
                                const currentFarmName = currentFarm?.farmName || "Vườn sầu riêng";
                                const farmCode = currentFarm?.farmCode || "";
                                const regionCode = farmCode ? farmCode.replace(/-F\d+$/, "") : "VN - DNOR - 0269";
                                await exportWeatherJournalDocx({
                                    farmName: currentFarmName,
                                    regionCode,
                                    observations: rows,
                                    conditionLabels,
                                });
                            } catch (err) {
                                console.error("Export Word error:", err);
                                toast({
                                    title: "Lỗi xuất file",
                                    description: "Không thể xuất file Word. Vui lòng thử lại.",
                                    variant: "destructive",
                                });
                            } finally {
                                setExporting(false);
                            }
                        }}
                        className="rounded-2xl border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                    >
                        <FileText className="mr-1.5 h-4 w-4 text-blue-600" />
                        {exporting ? "Đang xuất..." : "Xuất file"}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => showForm()}
                        className="rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-soft hover:bg-brand-700 shrink-0 cursor-pointer"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Ghi nhận thời tiết
                    </Button>
                </div>
            </div>

            {/* Filter Section */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    {/* Nút lọc nhanh */}
                    <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
                        {(
                            [
                                ["all", "Tất cả"],
                                ["month", "Tháng này"],
                                ["week", "Tuần này"],
                                ["today", "Hôm nay"],
                            ] as const
                        ).map(([v, l]) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => {
                                    setRange(v);
                                    setFrom("");
                                    setTo("");
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                                    range === v && !from && !to
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    {/* Bộ lọc khoảng ngày */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[240px] sm:max-w-xs">
                        <VietnameseDatePicker value={from} onChange={setFrom} placeholder="Từ ngày" />
                        <span className="text-slate-400 text-xs font-medium">-</span>
                        <VietnameseDatePicker value={to} onChange={setTo} placeholder="Đến ngày" />
                    </div>
                </div>
            </section>

            {/* Weather Table */}
            <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] table-fixed border-collapse text-left text-sm">
                        <colgroup>
                            <col className="w-[115px]" />
                            <col className="w-[95px]" />
                            <col className="w-[160px]" />
                            <col className="w-[145px]" />
                            <col className="w-[110px]" />
                            <col className="w-[95px]" />
                            <col className="w-[130px]" />
                            <col className="w-[95px]" />
                            <col className="w-[170px]" />
                            <col className="w-[85px]" />
                        </colgroup>
                        <thead className="border-b border-slate-200 bg-slate-100/90 text-xs font-bold uppercase tracking-wider text-slate-700">
                            <tr>
                                <th scope="col" rowSpan={2} className="w-[115px] border-r border-slate-200 px-2.5 py-2.5 text-center align-middle whitespace-nowrap">
                                    Ngày
                                </th>
                                <th scope="col" rowSpan={2} className="w-[95px] border-r border-slate-200 px-2.5 py-2.5 text-center align-middle whitespace-nowrap">
                                    Thời điểm
                                </th>
                                <th scope="col" rowSpan={2} className="w-[160px] border-r border-slate-200 px-2.5 py-2.5 text-center align-middle whitespace-nowrap">
                                    Tình trạng trời
                                </th>
                                <th scope="col" rowSpan={2} className="w-[145px] border-r border-slate-200 px-2.5 py-2.5 text-center align-middle whitespace-nowrap">
                                    <div>Nhiệt độ (°C)</div>
                                    <div className="text-[10px] font-normal lowercase text-slate-500 tracking-normal">(thấp nhất - cao nhất)</div>
                                </th>
                                <th scope="colgroup" colSpan={2} className="w-[205px] border-r border-b border-slate-200 px-2 py-1.5 text-center whitespace-nowrap bg-slate-200/80 text-slate-700">
                                    Tình trạng mưa
                                </th>
                                <th scope="col" rowSpan={2} className="w-[130px] border-r border-slate-200 px-2.5 py-2.5 text-center align-middle whitespace-nowrap">
                                    Tình trạng đất
                                </th>
                                <th scope="col" rowSpan={2} className="w-[95px] border-r border-slate-200 px-2.5 py-2.5 text-center align-middle whitespace-nowrap">
                                    Độ ẩm đất
                                </th>
                                <th scope="col" rowSpan={2} className="w-[170px] border-r border-slate-200 px-2.5 py-2.5 text-center align-middle whitespace-nowrap">
                                    Hiện tượng kèm theo
                                </th>
                                <th scope="col" rowSpan={2} className="w-[85px] px-2 py-2.5 text-center align-middle whitespace-nowrap">
                                    Thao tác
                                </th>
                            </tr>
                            <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] text-slate-600">
                                <th scope="col" className="w-[110px] border-r border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">
                                    Mức độ mưa
                                </th>
                                <th scope="col" className="w-[95px] border-r border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">
                                    Lượng mưa
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {!rows.length ? (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center text-slate-500">
                                        <Sun className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                        <b className="text-base text-slate-700">Chưa có nhật ký thời tiết nào</b>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Bấm “Ghi nhận thời tiết” để lưu thông tin nhiệt độ, mưa và độ ẩm đất tại vườn.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map(row => {
                                    const rowConditions = (row.condition || "")
                                        .split(",")
                                        .filter(Boolean)
                                        .map(val => conditionLabels[val] || weatherConditions.find(x => x.v === val)?.l || val);
                                    return (
                                        <tr key={row.id} className="transition-colors hover:bg-slate-50/80" title={row.note ? `Ghi chú: ${row.note}` : undefined}>
                                            {/* Ngày */}
                                            <td className="border-r border-slate-200 px-2.5 py-2.5 text-center tabular-nums whitespace-nowrap font-semibold text-slate-900">
                                                {formatVietnameseDate(row.observedAt)}
                                            </td>

                                            {/* Thời điểm */}
                                            <td className="border-r border-slate-200 px-2.5 py-2.5 text-center whitespace-nowrap">
                                                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                    {row.timeOfDay || "Cả ngày"}
                                                </span>
                                            </td>

                                            {/* Tình trạng trời */}
                                            <td className="border-r border-slate-200 px-2.5 py-2.5 text-center whitespace-nowrap font-medium text-slate-800">
                                                <div
                                                    className="truncate px-1"
                                                    title={rowConditions.length > 0 ? rowConditions.join(" · ") : row.condition || ""}
                                                >
                                                    {rowConditions.length > 0
                                                        ? rowConditions.join(" · ")
                                                        : row.condition || "—"}
                                                </div>
                                            </td>

                                            {/* Nhiệt độ (°C) */}
                                            <td className="border-r border-slate-200 px-2.5 py-2.5 text-center font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                                                {row.temperatureMin != null && row.temperatureMax != null
                                                    ? `${row.temperatureMin}°C - ${row.temperatureMax}°C`
                                                    : row.temperature != null
                                                      ? `${row.temperature}°C`
                                                      : "—"}
                                            </td>

                                            {/* Mức độ mưa */}
                                            <td className="border-r border-slate-200 px-2 py-2.5 text-center text-xs whitespace-nowrap">
                                                {row.rainLevel && row.rainLevel !== "Không mưa" ? (
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                                                        {row.rainLevel}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Lượng mưa */}
                                            <td className="border-r border-slate-200 px-2 py-2.5 text-center tabular-nums text-xs whitespace-nowrap">
                                                {row.rainfallMm != null && row.rainfallMm > 0 ? (
                                                    <span className="font-semibold text-blue-900">{row.rainfallMm} mm</span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Tình trạng đất */}
                                            <td className="border-r border-slate-200 px-2.5 py-2.5 text-center text-xs whitespace-nowrap font-medium text-slate-800">
                                                <div className="truncate px-1" title={row.soilCondition || ""}>
                                                    {row.soilCondition || "—"}
                                                </div>
                                            </td>

                                            {/* Độ ẩm đất */}
                                            <td className="border-r border-slate-200 px-2.5 py-2.5 text-center text-xs tabular-nums whitespace-nowrap">
                                                {row.soilHumidity != null ? (
                                                    <span className="font-semibold text-emerald-700">{row.soilHumidity}%</span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Hiện tượng kèm theo */}
                                            <td className="border-r border-slate-200 px-2.5 py-2.5 text-center text-xs">
                                                {row.phenomena && row.phenomena.length > 0 ? (
                                                    <div className="flex flex-wrap items-center justify-center gap-1">
                                                        {row.phenomena.map(ph => (
                                                            <span
                                                                key={ph}
                                                                className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 whitespace-nowrap"
                                                            >
                                                                {ph}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-normal">—</span>
                                                )}
                                            </td>

                                            {/* Thao tác (xóa, sửa) */}
                                            <td className="px-2 py-2.5 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => showForm(row)}
                                                        title="Chỉnh sửa"
                                                        className="group relative flex h-7 w-7 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                        aria-label="Chỉnh sửa"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-20">
                                                            Sửa
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void remove(row)}
                                                        title="Xóa"
                                                        className="group relative flex h-7 w-7 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition focus:outline-none focus:ring-1 focus:ring-red-500"
                                                        aria-label="Xóa"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-20">
                                                            Xóa
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {rows.length > 0 && (
                    <div className="border-t border-slate-200 bg-slate-50/50 p-3 text-xs font-medium text-slate-500">
                        Tổng cộng {rows.length} lượt ghi nhận thời tiết
                    </div>
                )}
            </section>

            {/* Modal Form */}
            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
                        <form
                            onSubmit={save}
                            className="my-auto flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="shrink-0 flex items-start justify-between border-b border-slate-100 px-5 sm:px-7 py-4 sm:py-5 bg-white">
                                <div>
                                    <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">
                                        NHẬT KÝ THỜI TIẾT
                                    </span>
                                    <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                                        {editing ? "Chỉnh sửa nhật ký thời tiết" : "Ghi nhận nhật ký thời tiết"}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Đóng form"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Scrollable Form Body */}
                            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
                                {/* Vườn & Ngày */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="weather-farm">Vườn *</Label>
                                        <div className="mt-1.5">
                                            <select
                                                id="weather-farm"
                                                name="farmId"
                                                defaultValue={editing?.farmId || farmId}
                                                required
                                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                            >
                                                {farms.map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.farmName} ({f.farmCode})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label>Ngày *</Label>
                                            <div className="mt-1.5">
                                                <VietnameseDatePicker
                                                    name="date"
                                                    required
                                                    defaultValue={
                                                        editing
                                                            ? dateKey(new Date(editing.observedAt))
                                                            : dateKey()
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="weather-timeOfDay">Thời điểm</Label>
                                            <div className="mt-1.5">
                                                <select
                                                    id="weather-timeOfDay"
                                                    name="timeOfDay"
                                                    value={selectedTimeOfDay}
                                                    onChange={e => setSelectedTimeOfDay(e.target.value)}
                                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                                >
                                                    {timeOfDayOptions.map(t => (
                                                        <option key={t} value={t}>
                                                            {t}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tình trạng trời */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label>Tình trạng trời *</Label>
                                        <span className="text-xs text-slate-500">Có thể chọn nhiều mục</span>
                                    </div>
                                    {selectedConditions.map(val => (
                                        <input key={val} type="hidden" name="condition" value={val} />
                                    ))}
                                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {weatherConditions.map(({ v, l, Icon }) => {
                                            const isSelected = selectedConditions.includes(v);
                                            return (
                                                <button
                                                    type="button"
                                                    key={v}
                                                    onClick={() => toggleCondition(v)}
                                                    className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-bold transition ${
                                                        isSelected
                                                            ? "border-brand-600 bg-brand-50 text-brand-800 shadow-sm"
                                                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <Icon
                                                        className={`h-5 w-5 shrink-0 ${
                                                            isSelected ? "text-brand-600" : "text-slate-400"
                                                        }`}
                                                    />
                                                    <span className="truncate">{l}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Nhiệt độ cao nhất & thấp nhất */}
                                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
                                    <div>
                                        <Label htmlFor="temperatureMax">Nhiệt độ cao nhất</Label>
                                        <div className="relative mt-1.5">
                                            <Input
                                                id="temperatureMax"
                                                name="temperatureMax"
                                                type="number"
                                                step="0.1"
                                                placeholder="VD: 34"
                                                defaultValue={editing?.temperatureMax ?? editing?.temperature ?? ""}
                                                className="h-12 pr-10 bg-white"
                                            />
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                °C
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="temperatureMin">Nhiệt độ thấp nhất</Label>
                                        <div className="relative mt-1.5">
                                            <Input
                                                id="temperatureMin"
                                                name="temperatureMin"
                                                type="number"
                                                step="0.1"
                                                placeholder="VD: 24"
                                                defaultValue={editing?.temperatureMin ?? ""}
                                                className="h-12 pr-10 bg-white"
                                            />
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                °C
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Nếu có mưa */}
                                {hasRain && (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                                            Nếu có mưa:
                                        </p>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <Label htmlFor="weather-rainLevel">Mức độ mưa</Label>
                                                <div className="mt-1.5">
                                                    <select
                                                        id="weather-rainLevel"
                                                        name="rainLevel"
                                                        value={selectedRainLevel}
                                                        onChange={e => setSelectedRainLevel(e.target.value)}
                                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                                    >
                                                        {rainLevelOptions.map(r => (
                                                            <option key={r} value={r}>
                                                                {r}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="weather-rainfallMm">Lượng mưa</Label>
                                                    <span className="text-[11px] text-slate-400">Không bắt buộc</span>
                                                </div>
                                                <div className="relative mt-1.5">
                                                    <Input
                                                        id="weather-rainfallMm"
                                                        name="rainfallMm"
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="VD: 25"
                                                        defaultValue={editing?.rainfallMm ?? ""}
                                                        className="h-12 pr-12 bg-white"
                                                    />
                                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                                        mm
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tình trạng đất & Độ ẩm đất */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="weather-soilCondition">Tình trạng đất</Label>
                                        <div className="mt-1.5">
                                            <select
                                                id="weather-soilCondition"
                                                name="soilCondition"
                                                value={selectedSoilCondition}
                                                onChange={e => setSelectedSoilCondition(e.target.value)}
                                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                            >
                                                {soilConditionOptions.map(item => (
                                                    <option key={item} value={item}>
                                                        {item}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="weather-soilHumidity">Độ ẩm đất</Label>
                                            <span className="text-[11px] text-slate-400">Không bắt buộc</span>
                                        </div>
                                        <div className="relative mt-1.5">
                                            <Input
                                                id="weather-soilHumidity"
                                                name="soilHumidity"
                                                type="number"
                                                min="0"
                                                max="100"
                                                placeholder="VD: 60"
                                                defaultValue={editing?.soilHumidity ?? ""}
                                                className="h-12 pr-8"
                                            />
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                %
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hiện tượng kèm theo */}
                                <div>
                                    <Label>Hiện tượng kèm theo</Label>
                                    {selectedPhenomena.map(val => (
                                        <input key={val} type="hidden" name="phenomena" value={val} />
                                    ))}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {phenomenaList.map(item => {
                                            const isSelected = selectedPhenomena.includes(item);
                                            return (
                                                <button
                                                    type="button"
                                                    key={item}
                                                    onClick={() => togglePhenomenon(item)}
                                                    className={`rounded-2xl border px-3.5 py-2 text-xs font-bold transition sm:text-sm ${
                                                        isSelected
                                                            ? "border-brand-600 bg-brand-50 text-brand-800 shadow-sm"
                                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                    }`}
                                                >
                                                    {item}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Ảnh ghi nhận */}
                                <div>
                                    <Label>Ảnh ghi nhận</Label>
                                    <input
                                        ref={cameraInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="sr-only"
                                        onChange={handleFileSelection}
                                    />
                                    <input
                                        ref={galleryInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="sr-only"
                                        onChange={handleFileSelection}
                                    />

                                    {/* Existing image hidden inputs */}
                                    {existingImages.map((img, index) => (
                                        <input
                                            key={`ex-${index}`}
                                            type="hidden"
                                            name="existingImages"
                                            value={img}
                                        />
                                    ))}

                                    <div className="mt-2 flex gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1 h-12 rounded-2xl border-dashed border-slate-300 text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                                            onClick={() => cameraInputRef.current?.click()}
                                        >
                                            <Camera className="mr-2 h-4 w-4 text-brand-600" />
                                            Chụp ảnh
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1 h-12 rounded-2xl border-dashed border-slate-300 text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                                            onClick={() => galleryInputRef.current?.click()}
                                        >
                                            <ImagePlus className="mr-2 h-4 w-4 text-brand-600" />
                                            Chọn ảnh
                                        </Button>
                                    </div>

                                    {/* Previews */}
                                    {(existingImages.length > 0 || imagePreviews.length > 0) && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {existingImages.map((src, index) => (
                                                <div
                                                    key={`prev-ex-${index}`}
                                                    className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200"
                                                >
                                                    <img
                                                        src={src}
                                                        alt="Ảnh đã lưu"
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExistingImage(index)}
                                                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-red-600"
                                                        aria-label="Xóa ảnh"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {imagePreviews.map((src, index) => (
                                                <div
                                                    key={`prev-new-${index}`}
                                                    className="relative h-20 w-20 overflow-hidden rounded-2xl border border-brand-300"
                                                >
                                                    <img
                                                        src={src}
                                                        alt="Ảnh mới chọn"
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePreviewImage(index)}
                                                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-red-600"
                                                        aria-label="Xóa ảnh"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Ghi chú */}
                                <div>
                                    <Label htmlFor="weather-note">Ghi chú</Label>
                                    <div className="mt-1.5">
                                        <Textarea
                                            id="weather-note"
                                            name="note"
                                            defaultValue={editing?.note || ""}
                                            placeholder="Ghi chú thêm về diễn biến thời tiết, sương muối, nắng gắt ảnh hưởng hoa/trái..."
                                            className="min-h-24 rounded-2xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions / Modal Footer */}
                            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 px-5 sm:px-7 py-4 bg-slate-50/70">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 min-w-24 rounded-2xl"
                                    onClick={() => setOpen(false)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={busy || !farms.length}
                                    className="h-11 min-w-36 rounded-2xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 shadow-soft"
                                >
                                    {busy ? "Đang lưu..." : "Lưu nhật ký"}
                                </Button>
                            </div>
                        </form>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
