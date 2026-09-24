"use client";

import { Fragment, useMemo, useState } from "react";
import { Globe, History, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { parseUnitCode } from "@/lib/puc-phc";
import ExportWordButton from "./export-word-button";

type Manager = { id: string; fullName: string | null; phone: string };
type Assignment = { id: string; assignedAt: Date | string; endedAt: Date | string | null; isActive: boolean; note: string | null; areaManager: Manager };
type Region = {
    id: string;
    code: string;
    name: string;
    address: string | null;
    province: string;
    district: string | null;
    ward: string | null;
    areaSize: number | null;
    cropType: string;
    cropVarieties: string[];
    status: string;
    approvalCode: string | null;
    exportMarkets: string[];
    farms: { farmerId: string; areaSize: number; areaUnit: string }[];
    managerAssignments: Assignment[];
};

const labels: Record<string, string> = {
    DRAFT: "Nháp",
    PENDING: "Chờ duyệt",
    ACTIVE: "Hoạt động",
    SUSPENDED: "Tạm dừng",
    EXPIRED: "Hết hiệu lực",
    REVOKED: "Thu hồi",
};

export function GrowingRegionsManager({ regions, managers }: { regions: Region[]; managers: Manager[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [detailsId, setDetailsId] = useState<string | null>(null);
    const [changeRegion, setChangeRegion] = useState<Region | null>(null);
    const [nextManagerId, setNextManagerId] = useState("");
    const [reason, setReason] = useState("");

    const filtered = useMemo(() => {
        return regions.filter((region) => {
            const keyword = search.trim().toLocaleLowerCase("vi");
            return (
                (status === "ALL" || region.status === status) &&
                (!keyword ||
                    `${region.code} ${region.name} ${region.address || ""} ${region.province} ${region.district || ""} ${region.ward || ""}`
                        .toLocaleLowerCase("vi")
                        .includes(keyword))
            );
        });
    }, [regions, search, status]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const pageStart = (currentPage - 1) * pageSize;
    const pagedRegions = filtered.slice(pageStart, pageStart + pageSize);

    async function call(url: string, method: string, body: unknown) {
        setBusy(true);
        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: payload.message, variant: "success" });
            setChangeRegion(null);
            setNextManagerId("");
            setReason("");
            router.refresh();
        } catch (error) {
            toast({
                title: "Thao tác không thành công",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-5">

            {/* Thanh công cụ tìm kiếm và nút tạo */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_200px]">
                    <label className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(event) => { setSearch(event.target.value); setPage(1); setDetailsId(null); }}
                            className="pl-9 bg-white"
                            placeholder="Tìm mã PUC, tên vùng hoặc địa phương..."
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) => { setStatus(event.target.value); setPage(1); setDetailsId(null); }}
                        className="h-10 rounded-xl border bg-white px-3 text-sm font-medium"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        {Object.entries(labels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            <ExportWordButton title="DANH SÁCH VÙNG TRỒNG" filename="DANH SÁCH VÙNG TRỒNG" headers={['STT', 'Tỉnh/ Thành phố', 'Tên vùng trồng', 'Mã vùng trồng', 'Địa chỉ', 'Diện tích (ha)', 'Người phụ trách', 'Số nông hộ', 'Loại cây trồng', 'Thị trường xuất khẩu']} rows={filtered.map((region, index) => {
                const manager = region.managerAssignments.find(item => item.isActive && !item.endedAt)?.areaManager;
                const area = region.areaSize ?? (region.farms.length ? region.farms.reduce((sum, farm) => sum + farm.areaSize / (farm.areaUnit === 'SQUARE_METER' ? 10000 : 1), 0) : null);
                const parsed = parseUnitCode(region.code);
                return [index + 1, region.province || 'Chưa cập nhật', region.name, region.code, region.address || [region.ward, region.district, region.province].filter(Boolean).join(', '), area == null ? 'Chưa cập nhật' : area.toLocaleString('vi-VN', { maximumFractionDigits: 4 }), manager?.fullName || manager?.phone || 'Chưa phân công', new Set(region.farms.map(farm => farm.farmerId)).size, region.cropType || 'Chưa cập nhật', region.exportMarkets.length ? region.exportMarkets.join(', ') : parsed?.isExportApproved ? parsed.exportMarketIso + ' · ' + parsed.exportMarketName : 'Chưa cập nhật'];
            })} />
            </div>

            {/* Danh sách vùng trồng */}
            <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">Danh sách vùng trồng · <span className="font-semibold text-slate-900">{filtered.length}</span> vùng</div>
                <div className="overflow-x-auto" role="region" aria-label="Bảng vùng trồng" tabIndex={0}>
                    <table className="w-full min-w-[1500px] border-collapse border border-slate-300 text-left text-sm">
                        <caption className="sr-only">Danh sách vùng trồng và thông tin quản lý</caption>
                        <thead className="bg-slate-100/90 text-xs font-semibold text-slate-700">
                            <tr>{['STT', 'Tỉnh/ Thành phố', 'Tên vùng trồng', 'Mã vùng trồng', 'Địa chỉ', 'Diện tích (ha)', 'Người phụ trách', 'Số nông hộ', 'Loại cây trồng', 'Thị trường xuất khẩu'].map(label => <th scope="col" key={label} className="border border-slate-300 px-3.5 py-3 font-semibold whitespace-nowrap text-center align-middle">{label}</th>)}</tr>
                        </thead>
                        <tbody>
                            {pagedRegions.map((region, index) => {
                                const current = region.managerAssignments.find(assignment => assignment.isActive && !assignment.endedAt);
                                const farmerCount = new Set(region.farms.map(farm => farm.farmerId)).size;
                                const area = region.areaSize ?? (region.farms.length ? region.farms.reduce((sum, farm) => sum + farm.areaSize / (farm.areaUnit === 'SQUARE_METER' ? 10000 : 1), 0) : null);
                                const parsed = parseUnitCode(region.code);
                                return <Fragment key={region.id}>
                                    <tr tabIndex={0} aria-label={`Xem ${farmerCount} nông hộ thuộc vùng ${region.name}`} onClick={() => router.push(`/dashboard/admin/farming?regionId=${encodeURIComponent(region.id)}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); router.push(`/dashboard/admin/farming?regionId=${encodeURIComponent(region.id)}`); } }} className="cursor-pointer align-top hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 transition [&>td]:border [&>td]:border-slate-200 [&>td]:px-3.5 [&>td]:py-2.5">
                                        <td className="text-center text-slate-500">{pageStart + index + 1}</td>
                                        <td className="min-w-[160px] text-center">{region.province || 'Chưa cập nhật'}</td>
                                        <td className="min-w-[180px] text-black">{region.name}</td>
                                        <td className="whitespace-nowrap font-mono font-bold text-emerald-700">{region.code}</td>
                                        <td className="min-w-[230px] text-slate-600">{region.address || [region.ward, region.district, region.province].filter(Boolean).join(', ') || 'Chưa cập nhật'}</td>
                                        <td className="text-center tabular-nums" title={region.areaSize == null && area != null ? 'Tổng diện tích các vườn đang liên kết' : undefined}>{area != null ? area.toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : 'Chưa cập nhật'}</td>
                                        <td className="min-w-[180px]"><p className="font-medium">{current?.areaManager.fullName || current?.areaManager.phone || 'Chưa phân công'}</p>{current && <p className="mt-1 text-xs text-slate-500">{current.areaManager.phone}</p>}</td>
                                        <td className="text-center tabular-nums">{farmerCount}</td>
                                        <td className="min-w-[140px] text-center">{region.cropType || 'Chưa cập nhật'}</td>
                                        <td className="min-w-[160px] text-center">{region.exportMarkets.length ? region.exportMarkets.join(', ') : parsed?.isExportApproved ? parsed.exportMarketIso + ' · ' + parsed.exportMarketName : 'Chưa cập nhật'}</td>
                                    </tr>
                                    {detailsId === region.id && <tr><td colSpan={10} className="border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="mb-3 flex flex-wrap items-center gap-3"><StatusBadge status={region.status} /><span className="text-xs text-slate-600">Giống: {region.cropVarieties.join(', ') || 'Chưa cập nhật'} · {region.farms.length} vườn</span></div>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDetailsId(detailsId === region.id ? null : region.id)}
                                >
                                    {detailsId === region.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setChangeRegion(region);
                                        setNextManagerId(current?.areaManager.id || "");
                                        setReason(current ? "" : "Phân công Trưởng ban phụ trách vùng trồng");
                                    }}
                                >
                                    {current ? "Thay đổi Trưởng ban" : "Phân công Trưởng ban"}
                                </Button>
                                {region.status === "ACTIVE" ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={busy}
                                        onClick={() =>
                                            void call("/api/admin/growing-regions", "PATCH", {
                                                id: region.id,
                                                status: "SUSPENDED",
                                                reason: "Admin tạm dừng vùng",
                                            })
                                        }
                                    >
                                        Tạm dừng
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        disabled={busy}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() =>
                                            void call("/api/admin/growing-regions", "PATCH", {
                                                id: region.id,
                                                status: "ACTIVE",
                                                reason: "Admin kích hoạt vùng",
                                            })
                                        }
                                    >
                                        Kích hoạt
                                    </Button>
                                )}
                            </div>


                            {detailsId === region.id && (
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-xs space-y-3">
                                    <p className="flex items-center gap-1.5 font-bold text-slate-800">
                                        <History className="h-3.5 w-3.5" />
                                        Lịch sử phân công quản lý
                                    </p>
                                    <div className="space-y-2">
                                        {region.managerAssignments.map((assignment) => (
                                            <div key={assignment.id} className="border-l-2 border-emerald-400 pl-3">
                                                <p className="font-semibold text-slate-900">
                                                    {assignment.areaManager.fullName || assignment.areaManager.phone}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Từ {new Date(assignment.assignedAt).toLocaleString("vi-VN")}
                                                    {assignment.endedAt
                                                        ? ` đến ${new Date(assignment.endedAt).toLocaleString("vi-VN")}`
                                                        : " · Đang phụ trách"}
                                                </p>
                                                {assignment.note && (
                                                    <p className="mt-0.5 text-[11px] text-slate-600">{assignment.note}</p>
                                                )}
                                            </div>
                                        ))}
                                        {!region.managerAssignments.length && (
                                            <p className="text-slate-400 italic">Chưa có lịch sử phân công.</p>
                                        )}
                                    </div>
                                </div>
                            )}


                                    </td></tr>}
                                </Fragment>;
                            })}
                            {!filtered.length && <tr><td colSpan={10} className="border border-slate-200 p-12 text-center text-slate-500">Không có vùng trồng phù hợp với tìm kiếm.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <nav aria-label="Phân trang vùng trồng" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                    <p className="text-sm text-slate-600">Hiển thị {filtered.length ? pageStart + 1 : 0}–{Math.min(pageStart + pageSize, filtered.length)} / {filtered.length} vùng trồng</p>
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setDetailsId(null); }}>Trước</Button>
                        <span className="text-sm text-slate-600" aria-live="polite">Trang {currentPage} / {pageCount}</span>
                        <Button type="button" variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => { setPage(currentPage + 1); setDetailsId(null); }}>Sau</Button>
                    </div>
                </nav>
            </div>

            {/* Modal phân công / thay đổi Trưởng ban */}
            {changeRegion && (() => {
                const currentAssignment = changeRegion.managerAssignments.find(
                    (assignment) => assignment.isActive && !assignment.endedAt,
                );
                const hasActiveManager = Boolean(currentAssignment);
                return (
                    <div
                        className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) setChangeRegion(null);
                        }}
                    >
                        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                            <h2 className="text-xl font-black">
                                {hasActiveManager ? "Thay đổi Trưởng ban Quản lý" : "Phân công Trưởng ban Quản lý"}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {changeRegion.code} · {changeRegion.name}
                            </p>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">
                                        {hasActiveManager ? "Trưởng ban mới" : "Chọn Trưởng ban phụ trách"}
                                    </Label>
                                    <select
                                        value={nextManagerId}
                                        onChange={(event) => setNextManagerId(event.target.value)}
                                        className="h-11 w-full rounded-xl border bg-white px-3 text-sm font-medium"
                                    >
                                        <option value="">Chọn Trưởng ban</option>
                                        {managers
                                            .filter(
                                                (manager) =>
                                                    manager.id !== currentAssignment?.areaManager.id,
                                            )
                                            .map((manager) => (
                                                <option key={manager.id} value={manager.id}>
                                                    {manager.fullName || manager.phone} · {manager.phone}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">
                                        {hasActiveManager ? "Lý do thay đổi" : "Ghi chú / Quyết định phân công"}
                                    </Label>
                                    <textarea
                                        value={reason}
                                        onChange={(event) => setReason(event.target.value)}
                                        className="min-h-24 w-full rounded-xl border p-3 text-sm"
                                        placeholder={hasActiveManager ? "Quyết định phân công mới, chuyển công tác..." : "Phân công Trưởng ban quản lý phụ trách vùng trồng..."}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setChangeRegion(null)}>
                                    Hủy
                                </Button>
                                <Button
                                    disabled={busy || !nextManagerId}
                                    onClick={() =>
                                        void call("/api/admin/region-assignments", "POST", {
                                            areaManagerId: nextManagerId,
                                            growingRegionId: changeRegion.id,
                                            note: reason.trim() || (hasActiveManager ? "Thay đổi Trưởng ban" : "Phân công Trưởng ban phụ trách"),
                                        })
                                    }
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                    {hasActiveManager ? "Xác nhận thay đổi" : "Xác nhận phân công"}
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const tone =
        status === "ACTIVE"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : status === "SUSPENDED"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-slate-50 text-slate-600";
    return (
        <span className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-xs font-bold ${tone}`}>
            {labels[status] || status}
        </span>
    );
}
