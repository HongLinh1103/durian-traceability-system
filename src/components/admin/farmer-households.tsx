"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import ExportWordButton from "./export-word-button";

type FarmRow = {
    id: string;
    ownerId: string;
    ownerName: string;
    ownerAddress: string;
    ownerPhone: string;
    identityNumber: string | null;
    areaSize: number;
    regionCode?: string;
    regionName: string;
    regionAddress: string;
    longitude: number | null;
    latitude: number | null;
    points?: { lng: number; lat: number }[];
    boundary?: any;
};

function getPlotPoints(plot: FarmRow): Array<{ lng: number; lat: number }> {
    if (plot.points && Array.isArray(plot.points) && plot.points.length > 0) {
        return plot.points;
    }
    let raw = plot.boundary;
    if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch { raw = null; }
    }
    let coords: any[] = [];
    if (raw) {
        if (Array.isArray(raw)) coords = raw;
        else if (raw.type === "Polygon" && Array.isArray(raw.coordinates) && Array.isArray(raw.coordinates[0])) coords = raw.coordinates[0];
        else if (raw.type === "MultiPolygon" && Array.isArray(raw.coordinates?.[0]?.[0])) coords = raw.coordinates[0][0];
        else if (Array.isArray(raw.points)) coords = raw.points;
    }
    const points: Array<{ lng: number; lat: number }> = [];
    for (const item of coords) {
        if (Array.isArray(item) && item.length >= 2) {
            const num0 = Number(item[0]);
            const num1 = Number(item[1]);
            if (!Number.isNaN(num0) && !Number.isNaN(num1)) {
                let lng = num0;
                let lat = num1;
                if (num0 < 30 && num1 > 70) {
                    lat = num0;
                    lng = num1;
                }
                points.push({ lng: Number(lng.toFixed(6)), lat: Number(lat.toFixed(6)) });
            }
        } else if (item && typeof item === "object") {
            const lat = Number(item.lat ?? item.latitude);
            const lng = Number(item.lng ?? item.longitude);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                points.push({ lng: Number(lng.toFixed(6)), lat: Number(lat.toFixed(6)) });
            }
        }
    }
    if (points.length > 2 && Math.abs(points[0].lng - points[points.length - 1].lng) < 1e-6 && Math.abs(points[0].lat - points[points.length - 1].lat) < 1e-6) {
        points.pop();
    }
    if (points.length === 0 && plot.longitude != null && plot.latitude != null) {
        points.push({ lng: Number(Number(plot.longitude).toFixed(6)), lat: Number(Number(plot.latitude).toFixed(6)) });
    }
    return points;
}

function formatPoint(plot: FarmRow, index: number): string {
    const points = getPlotPoints(plot);
    if (points[index]) {
        return `${points[index].lng.toFixed(6)} - ${points[index].lat.toFixed(6)}`;
    }
    return index === 0 ? "Chưa cập nhật" : "-";
}

export default function FarmerHouseholds({ regionId }: { regionId?: string }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [regions, setRegions] = useState<{ id: string; code: string; name: string }[]>([]);
    const [region, setRegion] = useState<{ id: string; code: string; name: string } | null>(null);
    const [farms, setFarms] = useState<FarmRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        let active = true;
        setLoading(true); setError(""); setPage(1); setFarms([]); setRegion(null);
        fetch("/api/admin/farming" + (regionId ? "?regionId=" + encodeURIComponent(regionId) : ""), { cache: "no-store" }).then(async response => {
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Không thể tải nông hộ.");
            if (active) { setFarms(data.data || []); setRegion(data.region || null); setRegions(data.regions || []); }
        }).catch(error => { if (active) setError(error.message || "Không thể tải nông hộ."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [regionId]);

    const households = useMemo(() => {
        const groups = new Map<string, { owner: FarmRow; plots: FarmRow[]; area: number }>();
        for (const farm of farms) {
            const key = farm.ownerId || farm.id;
            const group = groups.get(key);
            if (group) { group.plots.push(farm); group.area += farm.areaSize; }
            else groups.set(key, { owner: farm, plots: [farm], area: farm.areaSize });
        }
        const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
        const keyword = normalize(search.trim());
        return [...groups.values()].filter(({ owner, plots }) => !keyword || [
            owner.ownerName,
            owner.identityNumber || "",
            owner.ownerPhone,
            ...plots.map(p => p.regionName || ""),
            ...plots.map(p => p.regionCode || ""),
        ].some(value => normalize(value).includes(keyword) || (/^[\d\s+.-]+$/.test(keyword) && value.replace(/\D/g, "").includes(keyword.replace(/\D/g, "")))))
        .sort((a, b) => a.owner.ownerName.localeCompare(b.owner.ownerName, "vi"));
    }, [farms, search]);

    const pages = Math.max(1, Math.ceil(households.length / 10));
    const current = Math.min(page, pages);
    const start = (current - 1) * 10;
    const headers = ["STT", "Họ và Tên", "Địa chỉ", "SĐT", "Số CCCD", "Diện tích (ha)"];

    return <main className="mx-auto min-h-screen w-full max-w-[1750px] space-y-6 px-3 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-semibold uppercase text-brand-600">ADMIN · Nông hộ</p><h1 className="mt-2 text-3xl font-black">DANH SÁCH NÔNG HỘ</h1></div>
            <div className="flex flex-wrap items-center gap-3">

            </div>
        </header>
        <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[1fr_1fr_auto]">
                <div>
                    <label htmlFor="search-households" className="mb-2 block text-sm font-semibold text-slate-800">Tìm kiếm nông hộ</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            id="search-households"
                            value={search}
                            onChange={event => { setSearch(event.target.value); setPage(1); }}
                            placeholder="Tìm tên nông hộ, CCCD, số điện thoại..."
                            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="filter-region" className="mb-2 block text-sm font-semibold text-slate-800">Lọc theo vùng trồng</label>
                    <select
                        id="filter-region"
                        value={regionId || ""}
                        onChange={event => {
                            setPage(1);
                            router.push(event.target.value ? "/dashboard/admin/farming?regionId=" + encodeURIComponent(event.target.value) : "/dashboard/admin/farming");
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                    >
                        <option value="">Tất cả vùng trồng</option>
                        {regionId && !regions.some(item => item.id === regionId) && <option value={regionId}>{region?.name || "Vùng trồng đang chọn"}</option>}
                        {regions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </div>
                <ExportWordButton
                    title="DANH SÁCH NÔNG HỘ"
                    filename="DANH SÁCH NÔNG HỘ"
                    headers={[
                        ...headers,
                        "Thông tin vùng trồng: Tên vùng trồng",
                        "Thông tin vùng trồng: Mã vùng trồng",
                        "Thông tin vùng trồng: Địa chỉ",
                        "Định vị: Điểm 1",
                        "Định vị: Điểm 2",
                        "Định vị: Điểm 3",
                        "Định vị: Điểm 4",
                        "Định vị: Điểm 5",
                    ]}
                    rows={loading || error ? [] : households.map(({ owner, plots, area }, index) => [
                        index + 1,
                        owner.ownerName,
                        owner.ownerAddress || "Chưa cập nhật",
                        owner.ownerPhone || "Chưa cập nhật",
                        owner.identityNumber || "Chưa cập nhật",
                        area.toLocaleString("vi-VN"),
                        plots.map(plot => plot.regionName || "Chưa phân vùng").join('\n'),
                        plots.map(plot => plot.regionCode || "Chưa có mã").join('\n'),
                        plots.map(plot => plot.regionAddress || "Chưa cập nhật").join('\n'),
                        plots.map(plot => formatPoint(plot, 0)).join('\n'),
                        plots.map(plot => formatPoint(plot, 1)).join('\n'),
                        plots.map(plot => formatPoint(plot, 2)).join('\n'),
                        plots.map(plot => formatPoint(plot, 3)).join('\n'),
                        plots.map(plot => formatPoint(plot, 4)).join('\n'),
                    ])}
                />
            </div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
            {!regionId && !search.trim() && <p className="border-b px-4 py-3 text-sm text-slate-600">{households.length} nông hộ · Diện tích là tổng các vườn đã đăng ký. Địa chỉ và tọa độ được liệt kê cùng thứ tự vườn.</p>}
            <div className="overflow-x-auto" role="region" aria-label="Bảng danh sách nông hộ" tabIndex={0}>
                <table className="w-full min-w-[1750px] border-collapse text-left text-sm">
                    <caption className="sr-only">Danh sách nông hộ và định vị vùng trồng</caption>
                    <thead className="bg-slate-100 text-xs text-slate-700">
                        <tr>
                            {headers.map(label => (
                                <th key={label} scope="col" rowSpan={2} className="border border-slate-300 px-4 py-3 text-center align-middle whitespace-nowrap">
                                    {label}
                                </th>
                            ))}
                            <th scope="colgroup" colSpan={3} className="border border-slate-300 px-4 py-3 text-center">
                                Thông tin vùng trồng
                            </th>
                            <th scope="colgroup" colSpan={5} className="border border-slate-300 px-4 py-3 text-center">
                                Định vị
                            </th>
                        </tr>
                        <tr>
                            {["Tên vùng trồng", "Mã vùng trồng", "Địa chỉ", "Điểm 1", "Điểm 2", "Điểm 3", "Điểm 4", "Điểm 5"].map(label => (
                                <th key={label} scope="col" className="border border-slate-300 px-4 py-3 text-center whitespace-nowrap">
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading || error || !households.length ? (
                            <tr>
                                <td colSpan={14} className="p-12 text-center text-slate-500">
                                    {loading ? "Đang tải..." : error ? "Không thể tải dữ liệu. Vui lòng thử lại." : (regionId ? "Vùng trồng này chưa có nông hộ được duyệt liên kết với vườn đang hoạt động." : "Chưa có nông hộ đăng ký vườn trồng.")}
                                </td>
                            </tr>
                        ) : (
                            households.slice(start, start + 10).map(({ owner, plots, area }, index) => (
                                <tr key={owner.ownerId || owner.id} className="align-top hover:bg-slate-50 [&>td]:border [&>td]:border-slate-200 [&>td]:px-4 [&>td]:py-3">
                                    <td className="text-center">{start + index + 1}</td>
                                    <td className="min-w-[180px] text-black">{owner.ownerName}</td>
                                    <td className="min-w-[220px]">{owner.ownerAddress || "Chưa cập nhật"}</td>
                                    <td className="whitespace-nowrap">{owner.ownerPhone || "Chưa cập nhật"}</td>
                                    <td className="whitespace-nowrap">{owner.identityNumber || "Chưa cập nhật"}</td>
                                    <td className="text-center tabular-nums">{area.toLocaleString("vi-VN", { maximumFractionDigits: 4 })}</td>
                                    <td className="min-w-[200px]">
                                        {plots.map((plot, i) => (
                                            <p key={plot.id} className="mb-2">
                                                {plots.length > 1 ? (i + 1) + ". " : ""}{plot.regionName || "Chưa phân vùng"}
                                            </p>
                                        ))}
                                    </td>
                                    <td className="min-w-[160px] whitespace-nowrap font-mono font-bold text-emerald-700">
                                        {plots.map((plot, i) => (
                                            <p key={plot.id} className="mb-2">
                                                {plots.length > 1 ? (i + 1) + ". " : ""}{plot.regionCode || "Chưa có mã"}
                                            </p>
                                        ))}
                                    </td>
                                    <td className="min-w-[240px]">
                                        {plots.map((plot, i) => (
                                            <p key={plot.id} className="mb-2">
                                                {plots.length > 1 ? (i + 1) + ". " : ""}{plot.regionAddress || "Chưa cập nhật"}
                                            </p>
                                        ))}
                                    </td>
                                    {[0, 1, 2, 3, 4].map(pointIdx => (
                                        <td key={pointIdx} className="min-w-[160px] whitespace-nowrap tabular-nums text-center font-mono text-xs">
                                            {plots.map((plot, i) => (
                                                <p key={plot.id} className="mb-2">
                                                    {plots.length > 1 ? (i + 1) + ". " : ""}
                                                    {formatPoint(plot, pointIdx)}
                                                </p>
                                            ))}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <nav aria-label="Phân trang nông hộ" className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
                <span>Hiển thị {households.length ? start + 1 : 0}–{Math.min(start + 10, households.length)} / {households.length} nông hộ</span>
                <div className="flex items-center gap-3"><button type="button" disabled={loading || current === 1} onClick={() => setPage(current - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trước</button><span aria-live="polite">Trang {current} / {pages}</span><button type="button" disabled={loading || current === pages} onClick={() => setPage(current + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Sau</button></div>
            </nav>
        </section>
    </main>;
}
