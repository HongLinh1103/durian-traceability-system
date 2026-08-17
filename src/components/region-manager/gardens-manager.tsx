"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    ChevronRight,
    Filter,
    History,
    RotateCcw,
    Search,
    Sprout,
    Trees,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatVietnameseDate } from "@/lib/date-format";

type Region = { id: string; code: string; name: string };
type Garden = {
    id: string;
    farmCode: string;
    farmName: string;
    ownerName: string;
    ownerPhone: string;
    locality: string;
    areaSize: number;
    totalTrees: number;
    durianVariety: string;
    isActive: boolean;
    regionCode: string;
    regionName: string;
    latestLogDate: string | null;
};

export function GardensManager({ regions, gardens }: { regions: Region[]; gardens: Garden[] }) {
    const [query, setQuery] = useState("");
    const [appliedQuery, setAppliedQuery] = useState("");
    const [regionCode, setRegionCode] = useState(regions[0]?.code ?? "");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [localityFilter, setLocalityFilter] = useState("");
    const [varietyFilter, setVarietyFilter] = useState("");
    const [appliedFilters, setAppliedFilters] = useState({ locality: "", variety: "" });

    const regionGardens = useMemo(
        () => gardens.filter((garden) => !regionCode || garden.regionCode === regionCode),
        [gardens, regionCode],
    );
    const filtered = useMemo(() => {
        const normalized = appliedQuery.trim().toLocaleLowerCase("vi");
        return regionGardens.filter((garden) => {
            const matchesQuery = !normalized || [
                garden.farmName,
                garden.farmCode,
                garden.regionCode,
                garden.regionName,
                garden.ownerName,
                garden.ownerPhone,
            ].some((value) => value.toLocaleLowerCase("vi").includes(normalized));
            const matchesLocality = !appliedFilters.locality || garden.locality === appliedFilters.locality;
            const matchesVariety = !appliedFilters.variety || garden.durianVariety.toLocaleLowerCase("vi").includes(appliedFilters.variety.toLocaleLowerCase("vi"));
            return matchesQuery && matchesLocality && matchesVariety;
        });
    }, [appliedFilters, appliedQuery, regionGardens]);

    const localityOptions = useMemo(
        () => Array.from(new Set(regionGardens.map((garden) => garden.locality))).sort((a, b) => a.localeCompare(b, "vi")),
        [regionGardens],
    );
    const varietyOptions = useMemo(
        () => Array.from(new Set(regionGardens.flatMap((garden) => garden.durianVariety.split(",").map((item) => item.trim())).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi")),
        [regionGardens],
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const stats = {
        total: regionGardens.length,
        active: regionGardens.filter((item) => item.isActive).length,
    };
    const selectedRegion = regions.find((region) => region.code === regionCode);

    function clearFilters() {
        setQuery("");
        setAppliedQuery("");
        setLocalityFilter("");
        setVarietyFilter("");
        setAppliedFilters({ locality: "", variety: "" });
        setPage(1);
    }

    return (
        <main className="mx-auto min-h-screen max-w-[1500px] space-y-6 px-4 py-6 sm:px-6">
            <header className="flex flex-col gap-4 rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-emerald-700">Vùng đang phụ trách</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Quản lý vườn trồng</h1>
                    <p className="mt-2 text-sm text-slate-500">Theo dõi và quản lý các vườn thuộc vùng trồng được phân công.</p>
                </div>
                <div className="min-w-0 rounded-2xl bg-emerald-50 p-4 lg:min-w-[360px]">
                    {regions.length > 1 ? (
                        <select
                            value={regionCode}
                            onChange={(event) => { setRegionCode(event.target.value); setPage(1); }}
                            className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-900"
                        >
                            {regions.map((region) => <option key={region.id} value={region.code}>{region.code} – {region.name}</option>)}
                        </select>
                    ) : (
                        <p className="break-words font-semibold text-emerald-900">
                            {selectedRegion ? `${selectedRegion.code} – ${selectedRegion.name}` : "Chưa được phân công vùng trồng"}
                        </p>
                    )}
                </div>
            </header>

            <section className="grid grid-cols-2 gap-3">
                <Stat label="Tổng số vườn" value={stats.total} icon={Sprout} />
                <Stat label="Đang hoạt động" value={stats.active} icon={Trees} tone="green" />
            </section>

            <Card className="rounded-[24px]">
                <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 md:flex-row">
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => { if (event.key === "Enter") { setAppliedQuery(query); setPage(1); } }}
                            placeholder="Tìm theo tên vườn, mã vườn, mã vùng, chủ vườn hoặc số điện thoại..."
                            className="flex-1"
                        />
                        <Button type="button" variant="outline" onClick={() => setFiltersOpen((value) => !value)}>
                            <Filter className="mr-2 h-4 w-4" />Bộ lọc
                            {(appliedFilters.locality || appliedFilters.variety) && (
                                <span className="ml-2 h-2 w-2 rounded-full bg-emerald-500" />
                            )}
                        </Button>
                        <Button type="button" onClick={() => { setAppliedQuery(query); setPage(1); }}><Search className="mr-2 h-4 w-4" />Tìm kiếm</Button>
                    </div>
                    {filtersOpen && (
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                            <label className="space-y-1.5 text-sm font-medium text-slate-700">
                                <span>Địa phương</span>
                                <select value={localityFilter} onChange={(event) => setLocalityFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                                    <option value="">Tất cả địa phương</option>
                                    {localityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </label>
                            <label className="space-y-1.5 text-sm font-medium text-slate-700">
                                <span>Giống</span>
                                <select value={varietyFilter} onChange={(event) => setVarietyFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                                    <option value="">Tất cả giống</option>
                                    {varietyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </label>
                            <div className="flex flex-wrap gap-2 md:col-span-3 md:justify-end">
                                <Button type="button" variant="outline" onClick={clearFilters}><RotateCcw className="mr-2 h-4 w-4" />Xóa bộ lọc</Button>
                                <Button type="button" onClick={() => {
                                    setAppliedFilters({ locality: localityFilter, variety: varietyFilter });
                                    setPage(1);
                                    setFiltersOpen(false);
                                }}>Áp dụng bộ lọc</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px]">
                <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[1300px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>{["Mã vườn", "Tên vườn", "Chủ vườn", "Số điện thoại", "Địa phương", "Nhật ký gần nhất", "Trạng thái", "Thao tác"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginated.map((garden) => <GardenRow key={garden.id} garden={garden} />)}
                        </tbody>
                    </table>
                </div>
                <div className="space-y-3 p-4 lg:hidden">
                    {paginated.map((garden) => <GardenCard key={garden.id} garden={garden} />)}
                </div>

                {paginated.length === 0 && (
                    <div className="p-10 text-center text-sm text-slate-500">
                        <Sprout className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <p>{appliedQuery ? "Không tìm thấy vườn phù hợp với điều kiện tìm kiếm." : "Chưa có vườn trồng nào được liên kết với vùng này."}</p>
                        {appliedQuery && <Button type="button" variant="outline" className="mt-4" onClick={clearFilters}>Xóa bộ lọc</Button>}
                    </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-100 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Số bản ghi:</span>
                        <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border px-2 py-1">
                            {[10, 20, 50].map((size) => <option key={size}>{size}</option>)}
                        </select>
                        <span className="text-slate-500">Tổng {filtered.length} kết quả</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <Button type="button" size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                        <span>Trang {currentPage}/{totalPages}</span>
                        <Button type="button" size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </Card>
        </main>
    );
}

function statusFor(garden: Garden) {
    if (!garden.isActive) return { label: "Tạm ngừng", className: "bg-slate-100 text-slate-600" };
    return { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700" };
}

function GardenRow({ garden }: { garden: Garden }) {
    const status = statusFor(garden);
    return <tr className="hover:bg-slate-50/60">
        <td className="px-4 py-4 font-semibold text-emerald-700">{garden.farmCode}</td><td className="px-4 py-4 font-semibold">{garden.farmName}</td>
        <td className="px-4 py-4">{garden.ownerName}</td><td className="px-4 py-4">{garden.ownerPhone}</td><td className="max-w-52 px-4 py-4">{garden.locality}</td>
        <td className="px-4 py-4">{garden.latestLogDate ? formatVietnameseDate(new Date(garden.latestLogDate)) : "Chưa cập nhật"}</td>
        <td className="px-4 py-4"><Badge className={`${status.className} whitespace-nowrap px-2 py-1 text-xs`}>{status.label}</Badge></td>
        <td className="px-4 py-4"><div className="flex flex-col items-stretch gap-2 whitespace-nowrap">
            <Button asChild size="sm" variant="outline"><Link href={`/region-manager/gardens/${garden.id}`}><Search className="mr-1 h-4 w-4" />Xem chi tiết</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href={`/region-manager/gardens/${garden.id}/logs`}><History className="mr-1 h-4 w-4" />Xem nhật ký</Link></Button>
        </div></td>
    </tr>;
}

function GardenCard({ garden }: { garden: Garden }) {
    const status = statusFor(garden);
    return <article className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{garden.farmName}</p><p className="text-xs font-semibold text-emerald-700">{garden.farmCode}</p></div><Badge className={`${status.className} shrink-0 whitespace-nowrap px-2 py-1 text-xs`}>{status.label}</Badge></div>
        <div className="mt-3 space-y-1 text-sm text-slate-600"><p>{garden.ownerName} · {garden.ownerPhone}</p><p>{garden.locality}</p><p>{garden.areaSize} ha · {garden.totalTrees} cây · {garden.durianVariety}</p><p>Nhật ký: {garden.latestLogDate ? formatVietnameseDate(new Date(garden.latestLogDate)) : "Chưa cập nhật"}</p></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild size="sm" variant="outline"><Link href={`/region-manager/gardens/${garden.id}`}><Search className="mr-1 h-4 w-4" />Chi tiết</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href={`/region-manager/gardens/${garden.id}/logs`}><History className="mr-1 h-4 w-4" />Nhật ký</Link></Button>
        </div>
    </article>;
}

function Stat({ label, value, icon: Icon, tone = "green" }: { label: string; value: string | number; icon: typeof Sprout; tone?: "green" | "gray" | "red" }) {
    const color = tone === "red" ? "bg-red-50 text-red-600" : tone === "gray" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600";
    return <Card className="rounded-[22px]"><CardContent className="flex items-center gap-3 p-4"><span className={`rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-slate-900">{value}</p></div></CardContent></Card>;
}
