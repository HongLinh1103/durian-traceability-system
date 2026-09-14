"use client";

import { FormEvent, useMemo, useState } from "react";
import { Globe, History, MapPin, Plus, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ISO_3166_COUNTRIES, PROVINCE_ADMIN_CODES, parseUnitCode } from "@/lib/puc-phc";

type Manager = { id: string; fullName: string | null; phone: string };
type Assignment = { id: string; assignedAt: Date | string; endedAt: Date | string | null; isActive: boolean; note: string | null; areaManager: Manager };
type Region = {
    id: string;
    code: string;
    name: string;
    province: string;
    district: string | null;
    ward: string | null;
    areaSize: number | null;
    cropType: string;
    cropVarieties: string[];
    status: string;
    approvalCode: string | null;
    exportMarkets: string[];
    farms: { farmerId: string }[];
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
    const [detailsId, setDetailsId] = useState<string | null>(null);
    const [changeRegion, setChangeRegion] = useState<Region | null>(null);
    const [nextManagerId, setNextManagerId] = useState("");
    const [reason, setReason] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);

    const filtered = useMemo(() => {
        return regions.filter((region) => {
            const keyword = search.trim().toLocaleLowerCase("vi");
            return (
                (status === "ALL" || region.status === status) &&
                (!keyword ||
                    `${region.code} ${region.name} ${region.province} ${region.district || ""} ${region.ward || ""}`
                        .toLocaleLowerCase("vi")
                        .includes(keyword))
            );
        });
    }, [regions, search, status]);

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
            setShowCreateForm(false);
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

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const exportMarket = String(form.get("exportMarket") || "").trim();

        await call("/api/admin/growing-regions", "POST", {
            code: form.get("code") || undefined,
            name: form.get("name"),
            province: form.get("province"),
            district: form.get("district") || undefined,
            ward: form.get("ward") || undefined,
            areaSize: form.get("areaSize") || undefined,
            cropType: form.get("cropType") || "Sầu riêng",
            cropVarieties: String(form.get("varieties") || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            exportMarkets: exportMarket ? [exportMarket] : [],
        });
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
                            onChange={(event) => setSearch(event.target.value)}
                            className="pl-9 bg-white"
                            placeholder="Tìm mã PUC, tên vùng hoặc địa phương..."
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
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
                <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                    <Plus className="h-4 w-4" />
                    {showCreateForm ? "Đóng form" : "Cấp mã vùng trồng mới"}
                </Button>
            </div>

            {/* Form tạo vùng trồng mới theo chuẩn QĐ 19/2025/QĐ-TTg */}
            {showCreateForm && (
                <form
                    onSubmit={create}
                    className="rounded-3xl border border-emerald-200 bg-emerald-50/30 p-5 sm:p-6 shadow-sm space-y-4"
                >
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-xs font-black text-white">
                                PUC
                            </span>
                            <h2 className="text-base font-black text-slate-900">
                                Đăng ký & Cấp mã số Vùng trồng (PUC)
                            </h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                            Cấu trúc chuẩn: <code className="font-mono font-bold text-emerald-800">[Mã tỉnh - PUC - Cây trồng - YYYYY]</code> (theo Quyết định 19/2025/QĐ-TTg). Để trống mã để hệ thống tự động cấp số thứ tự kế tiếp.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Mã vùng trồng (PUC)</Label>
                            <Input
                                name="code"
                                placeholder="Để trống = Tự sinh tự động"
                                className="bg-white font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Tên vùng trồng *</Label>
                            <Input name="name" required placeholder="Ví dụ: Vùng trồng sầu riêng Trị An" className="bg-white" />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Tỉnh / Thành phố *</Label>
                            <select
                                name="province"
                                required
                                defaultValue="Đồng Nai"
                                className="h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium"
                            >
                                {Object.entries(PROVINCE_ADMIN_CODES).map(([prov, code]) => (
                                    <option key={code} value={prov}>
                                        {code} - {prov}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Loại cây trồng</Label>
                            <select
                                name="cropType"
                                defaultValue="Sầu riêng"
                                className="h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium"
                            >
                                <option value="Sầu riêng">SR - Sầu riêng</option>
                                <option value="Chuối">CH - Chuối</option>
                                <option value="Thanh long">TL - Thanh long</option>
                                <option value="Xoài">XO - Xoài</option>
                                <option value="Mít">MI - Mít</option>
                                <option value="Bưởi">BU - Bưởi</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Huyện / Thị xã</Label>
                            <Input name="district" placeholder="Ví dụ: Vĩnh Cửu" className="bg-white" />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Xã / Phường</Label>
                            <Input name="ward" placeholder="Ví dụ: Trị An" className="bg-white" />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Diện tích (ha)</Label>
                            <Input
                                name="areaSize"
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="Ví dụ: 120"
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Thị trường xuất khẩu (ISO 3166)</Label>
                            <select
                                name="exportMarket"
                                defaultValue=""
                                className="h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium"
                            >
                                <option value="">Nội địa / Chưa cấp xuất khẩu</option>
                                {Object.entries(ISO_3166_COUNTRIES).map(([iso, country]) => (
                                    <option key={iso} value={iso}>
                                        {iso} - {country}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
                            <Label className="text-xs font-bold text-slate-700">Giống cây trồng chủ lực</Label>
                            <Input
                                name="varieties"
                                placeholder="Ri6, Monthong, Dona (ngăn cách bởi dấu phẩy)"
                                className="bg-white"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={busy}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            <Sparkles className="mr-1.5 h-4 w-4" />
                            Xác nhận & Cấp mã PUC
                        </Button>
                    </div>
                </form>
            )}

            {/* Danh sách vùng trồng */}
            <div className="grid gap-4 lg:grid-cols-2">
                {filtered.map((region) => {
                    const current = region.managerAssignments.find(
                        (assignment) => assignment.isActive && !assignment.endedAt,
                    );
                    const farmerCount = new Set(region.farms.map((farm) => farm.farmerId)).size;
                    const parsed = parseUnitCode(region.code);

                    return (
                        <article key={region.id} className="rounded-3xl border bg-white p-5 shadow-sm space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                            {region.code}
                                        </span>
                                        {parsed?.isExportApproved && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-black text-blue-700 uppercase">
                                                <Globe className="h-3 w-3" />
                                                {parsed.exportMarketIso} · {parsed.exportMarketName}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="mt-2 text-lg font-black text-slate-900">{region.name}</h2>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                        {[region.ward, region.district, region.province].filter(Boolean).join(", ")}
                                    </p>
                                </div>
                                <StatusBadge status={region.status} />
                            </div>

                            <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-xs">
                                <div>
                                    <dt className="text-slate-500 font-medium">Cấu trúc định danh</dt>
                                    <dd className="font-bold text-slate-800">
                                        Tỉnh {parsed?.provinceCode || "75"} · PUC · {parsed?.cropCode || "SR"} · #{parsed?.sequenceStr || "00001"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500 font-medium">Diện tích</dt>
                                    <dd className="font-bold text-slate-800">
                                        {region.areaSize != null ? `${region.areaSize.toLocaleString("vi-VN")} ha` : "Chưa cập nhật"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500 font-medium">Giống chủ lực</dt>
                                    <dd className="font-bold text-slate-800">
                                        {region.cropVarieties.join(", ") || "Chưa cập nhật"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500 font-medium">Hộ liên kết & Vườn</dt>
                                    <dd className="font-bold text-slate-800">
                                        {farmerCount} hộ ({region.farms.length} vườn)
                                    </dd>
                                </div>
                            </dl>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs">
                                <p className="text-slate-500 font-medium">Trưởng ban phụ trách</p>
                                <p className="mt-0.5 font-bold text-slate-900">
                                    {current?.areaManager.fullName || "Chưa phân công Trưởng ban"}
                                </p>
                                {current && <p className="text-[11px] text-slate-500">{current.areaManager.phone}</p>}
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

                            <div className="flex flex-wrap gap-2 pt-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDetailsId(detailsId === region.id ? null : region.id)}
                                >
                                    {detailsId === region.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                                </Button>
                                {current && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setChangeRegion(region);
                                            setNextManagerId("");
                                            setReason("");
                                        }}
                                    >
                                        Thay đổi Trưởng ban
                                    </Button>
                                )}
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
                        </article>
                    );
                })}
            </div>

            {!filtered.length && (
                <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-400 text-sm">
                    Không có vùng trồng phù hợp với tìm kiếm.
                </div>
            )}

            {/* Modal thay đổi Trưởng ban */}
            {changeRegion && (
                <div
                    className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setChangeRegion(null);
                    }}
                >
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                        <h2 className="text-xl font-black">Thay đổi Trưởng ban Quản lý</h2>
                        <p className="text-xs text-slate-500">
                            {changeRegion.code} · {changeRegion.name}
                        </p>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Trưởng ban mới</Label>
                                <select
                                    value={nextManagerId}
                                    onChange={(event) => setNextManagerId(event.target.value)}
                                    className="h-11 w-full rounded-xl border bg-white px-3 text-sm font-medium"
                                >
                                    <option value="">Chọn Trưởng ban</option>
                                    {managers
                                        .filter(
                                            (manager) =>
                                                manager.id !==
                                                changeRegion.managerAssignments.find(
                                                    (assignment) => assignment.isActive && !assignment.endedAt,
                                                )?.areaManager.id,
                                        )
                                        .map((manager) => (
                                            <option key={manager.id} value={manager.id}>
                                                {manager.fullName || manager.phone} · {manager.phone}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Lý do thay đổi</Label>
                                <textarea
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    className="min-h-24 w-full rounded-xl border p-3 text-sm"
                                    placeholder="Quyết định phân công mới, chuyển công tác..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setChangeRegion(null)}>
                                Hủy
                            </Button>
                            <Button
                                disabled={busy || !nextManagerId || reason.trim().length < 3}
                                onClick={() =>
                                    void call("/api/admin/region-assignments", "POST", {
                                        areaManagerId: nextManagerId,
                                        growingRegionId: changeRegion.id,
                                        note: reason.trim(),
                                    })
                                }
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                Xác nhận thay đổi
                            </Button>
                        </div>
                    </div>
                </div>
            )}
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
