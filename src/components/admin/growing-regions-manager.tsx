"use client";

import { FormEvent, useMemo, useState } from "react";
import { History, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type Manager = { id: string; fullName: string | null; phone: string };
type Assignment = { id: string; assignedAt: Date | string; endedAt: Date | string | null; isActive: boolean; note: string | null; areaManager: Manager };
type Region = { id: string; code: string; name: string; province: string; district: string | null; ward: string | null; areaSize: number | null; cropVarieties: string[]; status: string; farms: { farmerId: string }[]; managerAssignments: Assignment[] };
const labels: Record<string, string> = { DRAFT: "Nháp", PENDING: "Chờ duyệt", ACTIVE: "Hoạt động", SUSPENDED: "Tạm dừng", EXPIRED: "Hết hiệu lực", REVOKED: "Thu hồi" };

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

    const filtered = useMemo(() => regions.filter((region) => {
        const keyword = search.trim().toLocaleLowerCase("vi");
        return (status === "ALL" || region.status === status) && (!keyword || `${region.code} ${region.name} ${region.province} ${region.district || ""} ${region.ward || ""}`.toLocaleLowerCase("vi").includes(keyword));
    }), [regions, search, status]);

    async function call(url: string, method: string, body: unknown) {
        setBusy(true);
        try {
            const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: payload.message, variant: "success" });
            setChangeRegion(null); setNextManagerId(""); setReason("");
            router.refresh();
        } catch (error) {
            toast({ title: "Không thể cập nhật", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally { setBusy(false); }
    }

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await call("/api/admin/growing-regions", "POST", { code: form.get("code"), name: form.get("name"), province: form.get("province"), district: form.get("district"), ward: form.get("ward"), areaSize: form.get("areaSize") || undefined, cropType: "Sầu riêng", cropVarieties: String(form.get("varieties") || "").split(",").map((value) => value.trim()).filter(Boolean), exportMarkets: [] });
    }

    return <div className="space-y-5">
        <form onSubmit={create} className="grid gap-3 rounded-3xl border bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <Input name="code" required placeholder="Mã vùng" /><Input name="name" required placeholder="Tên vùng" />
            <Input name="province" required placeholder="Tỉnh/thành" /><Input name="district" placeholder="Huyện" />
            <Input name="ward" placeholder="Xã" /><Input name="areaSize" type="number" min="0.01" step="0.01" placeholder="Diện tích (ha)" />
            <Input name="varieties" className="sm:col-span-2" placeholder="Giống chủ lực, cách nhau dấu phẩy" />
            <Button disabled={busy} className="sm:col-span-2 lg:col-span-4">Tạo vùng trồng</Button>
        </form>

        <div className="grid gap-3 rounded-2xl border bg-white p-3 sm:grid-cols-[1fr_220px]">
            <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Tìm mã, tên hoặc địa phương..." /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="ALL">Tất cả trạng thái</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">{filtered.map((region) => {
            const current = region.managerAssignments.find((assignment) => assignment.isActive && !assignment.endedAt);
            const farmerCount = new Set(region.farms.map((farm) => farm.farmerId)).size;
            return <article key={region.id} className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold text-brand-700">{region.code}</p><h2 className="mt-1 text-lg font-black">{region.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4 shrink-0" />{[region.ward, region.district, region.province].filter(Boolean).join(", ")}</p></div><StatusBadge status={region.status} /></div>
                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div><dt className="text-slate-500">Diện tích</dt><dd className="font-bold">{region.areaSize != null ? `${region.areaSize.toLocaleString("vi-VN")} ha` : "Chưa cập nhật"}</dd></div>
                    <div><dt className="text-slate-500">Giống chủ lực</dt><dd className="font-bold">{region.cropVarieties.join(", ") || "Chưa cập nhật"}</dd></div>
                    <div><dt className="text-slate-500">Hộ nông dân</dt><dd className="font-bold">{farmerCount}</dd></div>
                    <div><dt className="text-slate-500">Vườn</dt><dd className="font-bold">{region.farms.length}</dd></div>
                </dl>
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm"><p className="text-slate-500">Trưởng ban hiện tại</p><p className="mt-1 font-bold text-slate-900">{current?.areaManager.fullName || "Chưa có"}</p>{current && <p className="text-xs text-slate-500">{current.areaManager.phone}</p>}</div>
                {detailsId === region.id && <div className="mt-4 rounded-2xl border p-4 text-sm"><p className="mb-3 flex items-center gap-2 font-bold"><History className="h-4 w-4" />Lịch sử quản lý</p><div className="space-y-3">{region.managerAssignments.map((assignment) => <div key={assignment.id} className="border-l-2 border-slate-200 pl-3"><p className="font-semibold">{assignment.areaManager.fullName || assignment.areaManager.phone}</p><p className="text-xs text-slate-500">Từ {new Date(assignment.assignedAt).toLocaleString("vi-VN")}{assignment.endedAt ? ` đến ${new Date(assignment.endedAt).toLocaleString("vi-VN")}` : " · Đang phụ trách"}</p>{assignment.note && <p className="mt-1 text-xs text-slate-600">{assignment.note}</p>}</div>)}{!region.managerAssignments.length && <p className="text-slate-500">Chưa có lịch sử phân công.</p>}</div></div>}
                <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setDetailsId(detailsId === region.id ? null : region.id)}>{detailsId === region.id ? "Ẩn chi tiết" : "Xem chi tiết"}</Button>{current && <Button size="sm" variant="outline" onClick={() => { setChangeRegion(region); setNextManagerId(""); setReason(""); }}>Thay đổi Trưởng ban</Button>}{region.status === "ACTIVE" ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void call("/api/admin/growing-regions", "PATCH", { id: region.id, status: "SUSPENDED", reason: "Admin tạm dừng vùng" })}>Tạm dừng</Button> : <Button size="sm" disabled={busy} onClick={() => void call("/api/admin/growing-regions", "PATCH", { id: region.id, status: "ACTIVE", reason: "Admin kích hoạt vùng" })}>Kích hoạt</Button>}</div>
            </article>;
        })}</div>
        {!filtered.length && <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">Không có vùng trồng phù hợp.</div>}

        {changeRegion && <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setChangeRegion(null); }}><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black">Thay đổi Trưởng ban</h2><p className="mt-1 text-sm text-slate-500">{changeRegion.code} · {changeRegion.name}</p><div className="mt-5 space-y-4"><div className="space-y-2"><Label>Trưởng ban mới</Label><select value={nextManagerId} onChange={(event) => setNextManagerId(event.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 text-sm"><option value="">Chọn Trưởng ban</option>{managers.filter((manager) => manager.id !== changeRegion.managerAssignments.find((assignment) => assignment.isActive && !assignment.endedAt)?.areaManager.id).map((manager) => <option key={manager.id} value={manager.id}>{manager.fullName || manager.phone} · {manager.phone}</option>)}</select></div><div className="space-y-2"><Label>Lý do thay đổi</Label><textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 w-full rounded-xl border p-3 text-sm" placeholder="Quyết định phân công mới, chuyển công tác..." /></div></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setChangeRegion(null)}>Hủy</Button><Button disabled={busy || !nextManagerId || reason.trim().length < 3} onClick={() => void call("/api/admin/region-assignments", "POST", { areaManagerId: nextManagerId, growingRegionId: changeRegion.id, note: reason.trim() })}>Xác nhận thay đổi</Button></div></div></div>}
    </div>;
}

function StatusBadge({ status }: { status: string }) {
    const tone = status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "SUSPENDED" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600";
    return <span className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-xs font-bold ${tone}`}>{labels[status] || status}</span>;
}
