"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ArchiveRestore, Ban, CheckCircle2, Eye, Lock, Pencil, Plus, Search, Trash2, Unlock, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type Region = { id: string; code: string; name: string };
type History = { id: string; action: string; reason: string | null; createdAt: string; actor: { fullName: string | null; role: string } };
type Farmer = {
    id: string; fullName: string | null; phone: string; email: string | null; address: string | null;
    province: string | null; district: string | null; ward: string | null; accountStatus: string;
    isApproved: boolean; isLocked: boolean; deletedAt: string | null; createdAt: string;
    farms: Array<{
        id: string; farmCode: string; farmName: string; areaSize: number; totalTrees: number;
        durianVariety: string; address: string; latitude: number | null; longitude: number | null;
        region: Region | null;
    }>;
    approvalHistories: History[];
};

const statuses: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Chờ phê duyệt", className: "bg-amber-100 text-amber-800" },
    NEEDS_SUPPLEMENT: { label: "Cần bổ sung", className: "bg-orange-100 text-orange-800" },
    APPROVED: { label: "Đã phê duyệt", className: "bg-emerald-100 text-emerald-800" },
    REJECTED: { label: "Bị từ chối", className: "bg-red-100 text-red-800" },
};

const supplementOptions = ["Thiếu tọa độ", "Địa chỉ vườn chưa chính xác", "Hình ảnh chưa rõ", "Diện tích chưa hợp lệ", "Vườn nằm ngoài ranh giới vùng", "Thiếu giấy tờ xác minh"];

export function FarmerAccountsManager() {
    const { toast } = useToast();
    const [farmers, setFarmers] = useState<Farmer[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, supplement: 0, rejected: 0, locked: 0 });
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");
    const [regionCode, setRegionCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Farmer | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [action, setAction] = useState<"supplement" | "reject" | null>(null);
    const [reason, setReason] = useState("");
    const [items, setItems] = useState<string[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ pageSize: "100", status });
            if (query) params.set("search", query);
            if (regionCode) params.set("regionCode", regionCode);
            const response = await fetch(`/api/region-manager/farmers?${params}`);
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setFarmers(payload.data);
            setRegions(payload.regions);
            setStats(payload.stats);
            setSelected((current) => current
                ? payload.data.find((item: Farmer) => item.id === current.id) ?? null
                : null);
        } catch (error) {
            toast({ title: "Không thể tải danh sách", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [query, regionCode, status, toast]);

    useEffect(() => { void load(); }, [load]);

    async function mutate(method: "PATCH" | "DELETE", body: Record<string, unknown>) {
        const response = await fetch("/api/region-manager/farmers", {
            method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message);
        toast({ title: payload.message, variant: "success" });
        setAction(null); setReason(""); setItems([]);
        await load();
    }

    async function handleSimpleAction(nextAction: string) {
        if (!selected) return;
        if (nextAction === "approve" && !window.confirm("Xác nhận phê duyệt và kích hoạt tài khoản cùng các vườn của nông dân này?")) return;
        if (nextAction === "soft_delete") {
            if (!window.confirm("Xóa mềm tài khoản này? Toàn bộ vườn và dữ liệu lịch sử vẫn được giữ lại.")) return;
            await mutate("DELETE", { userId: selected.id });
            setSelected(null);
            return;
        }
        await mutate("PATCH", { userId: selected.id, action: nextAction });
    }

    async function handleEdit() {
        if (!selected) return;
        const fullName = window.prompt("Họ và tên:", selected.fullName || "");
        if (fullName === null || !fullName.trim()) return;
        const phone = window.prompt("Số điện thoại:", selected.phone);
        if (phone === null || !phone.trim()) return;
        const email = window.prompt("Email (có thể để trống):", selected.email || "");
        if (email === null) return;
        const address = window.prompt("Địa chỉ:", selected.address || "");
        if (address === null) return;
        await mutate("PATCH", { userId: selected.id, action: "update", fullName, phone, email, address });
    }

    const statCards = [
        { label: "Số hộ thành viên", value: stats.total, icon: Users },
        { label: "Chờ phê duyệt", value: stats.pending, icon: AlertCircle },
        { label: "Yêu cầu bổ sung", value: stats.supplement, icon: AlertCircle },
        { label: "Bị từ chối", value: stats.rejected, icon: Ban },
        { label: "Tài khoản tạm khóa", value: stats.locked, icon: Lock },
    ];

    return (
        <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6">
            <header className="flex flex-col gap-4 rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-emerald-700">Trưởng ban quản lý vùng trồng</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Quản lý nông dân</h1>
                    <p className="mt-2 text-sm text-slate-500">Quản lý và phê duyệt các tài khoản nông dân thuộc vùng trồng được phân công.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    {regions.length > 1 && <div className="space-y-1"><Label>Vùng đang quản lý</Label><select value={regionCode} onChange={(event) => setRegionCode(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Tất cả vùng</option>{regions.map((region) => <option key={region.id} value={region.code}>{region.code} - {region.name}</option>)}</select></div>}
                    <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Tạo tài khoản nông dân</Button>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
                {statCards.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center gap-3 p-4 sm:p-5"><span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><Icon className="h-5 w-5" /></span><div><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-black sm:text-2xl">{value}</p></div></CardContent></Card>)}
            </div>

            <Card>
                <CardContent className="p-5">
                    <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }} className="flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Tìm họ tên, điện thoại, email, mã hồ sơ hoặc tên vườn..." /></div>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                            <option value="all">Tất cả hồ sơ</option><option value="PENDING">Chờ phê duyệt</option><option value="NEEDS_SUPPLEMENT">Cần bổ sung</option><option value="APPROVED">Đã phê duyệt</option><option value="REJECTED">Bị từ chối</option><option value="deleted">Đã xóa mềm</option>
                        </select>
                        <Button type="submit">Tìm kiếm</Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="overflow-hidden">
                <div className="space-y-3 md:hidden">
                    {loading ? (
                        <div className="px-4 py-16 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
                    ) : farmers.length === 0 ? (
                        <div className="px-4 py-16 text-center text-sm text-slate-500">Không có tài khoản nông dân phù hợp.</div>
                    ) : (
                        farmers.map((farmer) => {
                            const state = statuses[farmer.accountStatus] ?? statuses.PENDING;
                            const regionCodes = Array.from(new Set(farmer.farms.map((farm) => farm.region?.code).filter(Boolean))).join(", ") || "—";
                            return (
                                <article key={farmer.id} className="border-b border-slate-200 bg-white p-4 last:border-b-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="truncate font-bold text-slate-900">{farmer.fullName || "Chưa có tên"}</h2>
                                            <p className="mt-1 text-sm text-slate-500">{farmer.phone}</p>
                                            <p className="mt-0.5 break-all text-xs text-slate-500">{farmer.email || "Chưa có email"}</p>
                                        </div>
                                        <Badge className={state.className}>{state.label}</Badge>
                                    </div>

                                    <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-sm">
                                        <div>
                                            <dt className="text-xs text-slate-500">Mã hồ sơ</dt>
                                            <dd className="mt-1 font-semibold text-slate-800">{farmer.id.slice(-10).toUpperCase()}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-slate-500">Số vườn</dt>
                                            <dd className="mt-1 font-semibold text-slate-800">{farmer.farms.length}</dd>
                                        </div>
                                        <div className="col-span-2">
                                            <dt className="text-xs text-slate-500">Vùng trồng</dt>
                                            <dd className="mt-1 font-semibold text-slate-800">{regionCodes}</dd>
                                        </div>
                                    </dl>

                                    <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => setSelected(farmer)}>
                                        <Eye className="mr-2 h-4 w-4" />Xem chi tiết
                                    </Button>
                                </article>
                            );
                        })
                    )}
                </div>

                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1100px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Mã hồ sơ", "Họ và tên", "Số điện thoại", "Email", "Số vườn", "Vùng trồng", "Ngày đăng ký", "Trạng thái hồ sơ", "Thao tác"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
                        <tbody className="divide-y">
                            {farmers.map((farmer) => {
                                const state = statuses[farmer.accountStatus] ?? statuses.PENDING;
                                return <tr key={farmer.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-4 font-mono text-xs">{farmer.id.slice(-10).toUpperCase()}</td>
                                    <td className="px-4 py-4 font-semibold">{farmer.fullName || "—"}</td>
                                    <td className="px-4 py-4">{farmer.phone}</td><td className="px-4 py-4">{farmer.email || "—"}</td>
                                    <td className="px-4 py-4 text-center font-semibold">{farmer.farms.length}</td>
                                    <td className="px-4 py-4">{Array.from(new Set(farmer.farms.map((farm) => farm.region?.code).filter(Boolean))).join(", ") || "—"}</td>
                                    <td className="px-4 py-4">{new Date(farmer.createdAt).toLocaleDateString("vi-VN")}</td>
                                    <td className="px-4 py-4"><Badge className={state.className}>{state.label}</Badge></td>
                                    <td className="px-4 py-4"><Button size="sm" variant="outline" onClick={() => setSelected(farmer)}><Eye className="mr-1 h-4 w-4" />Xem hồ sơ</Button></td>
                                </tr>;
                            })}
                            {!loading && farmers.length === 0 && <tr><td colSpan={9} className="py-16 text-center text-slate-500">Không có tài khoản nông dân phù hợp.</td></tr>}
                            {loading && <tr><td colSpan={9} className="py-16 text-center text-slate-500">Đang tải dữ liệu...</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            {selected && <FarmerDetail farmer={selected} onClose={() => setSelected(null)} onAction={handleSimpleAction} onEdit={handleEdit} onDecision={(next) => { setAction(next); setReason(""); setItems([]); }} />}
            {action && selected && <DecisionDialog action={action} reason={reason} setReason={setReason} items={items} setItems={setItems} onClose={() => setAction(null)} onSubmit={() => mutate("PATCH", { userId: selected.id, action, reason, items })} />}
            {createOpen && <CreateFarmerDialog regions={regions} onClose={() => setCreateOpen(false)} onCreated={async () => { setCreateOpen(false); await load(); }} />}
        </main>
    );
}

function Modal({ children, onClose, width = "max-w-4xl" }: { children: React.ReactNode; onClose: () => void; width?: string }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-slate-950/55 p-4 backdrop-blur-[1px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" className={`max-h-[calc(100dvh-2rem)] w-full ${width} overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 shadow-2xl`}>
                {children}
            </div>
        </div>,
        document.body,
    );
}

function FarmerDetail({ farmer, onClose, onAction, onEdit, onDecision }: { farmer: Farmer; onClose: () => void; onAction: (action: string) => void; onEdit: () => void; onDecision: (action: "supplement" | "reject") => void }) {
    return <Modal onClose={onClose}>
        <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-emerald-700">Hồ sơ {farmer.id.slice(-10).toUpperCase()}</p><h2 className="text-2xl font-black">{farmer.fullName}</h2></div><button onClick={onClose}><X /></button></div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border p-4 text-sm"><h3 className="mb-3 font-bold">Thông tin cá nhân</h3><p><b>Điện thoại:</b> {farmer.phone}</p><p><b>Email:</b> {farmer.email || "—"}</p><p><b>Địa chỉ:</b> {[farmer.address, farmer.ward, farmer.district, farmer.province].filter(Boolean).join(", ") || "—"}</p></section>
            <section className="rounded-2xl border p-4 text-sm"><h3 className="mb-3 font-bold">Trạng thái</h3><p><b>Hồ sơ:</b> {statuses[farmer.accountStatus]?.label}</p><p><b>Tài khoản:</b> {farmer.deletedAt ? "Đã xóa mềm" : farmer.isLocked ? "Tạm khóa" : farmer.isApproved ? "Đang hoạt động" : "Chưa kích hoạt"}</p><p><b>Ngày đăng ký:</b> {new Date(farmer.createdAt).toLocaleString("vi-VN")}</p></section>
        </div>
        <section className="mt-5"><h3 className="mb-3 font-bold">Danh sách vườn</h3><div className="space-y-3">{farmer.farms.map((farm) => <div key={farm.id} className="rounded-2xl bg-slate-50 p-4 text-sm"><div className="font-bold">{farm.farmName} · {farm.farmCode}</div><p>{farm.region?.code} - {farm.region?.name}</p><p>{farm.areaSize} ha · {farm.totalTrees} cây · {farm.durianVariety}</p><p>{farm.address}</p><p>Tọa độ: {farm.latitude != null && farm.longitude != null ? `${farm.latitude}, ${farm.longitude}` : "Chưa cung cấp"}</p></div>)}</div></section>
        <section className="mt-5"><h3 className="mb-3 font-bold">Lịch sử xử lý</h3><div className="space-y-2">{farmer.approvalHistories.map((history) => <div key={history.id} className="rounded-xl border p-3 text-sm"><b>{history.action}</b> · {new Date(history.createdAt).toLocaleString("vi-VN")}<p className="text-slate-500">{history.actor.fullName || history.actor.role}{history.reason ? ` — ${history.reason}` : ""}</p></div>)}{farmer.approvalHistories.length === 0 && <p className="text-sm text-slate-500">Chưa có lịch sử xử lý.</p>}</div></section>
        <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
            {!farmer.deletedAt && <Button variant="outline" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Cập nhật thông tin</Button>}
            {!farmer.deletedAt && ["PENDING", "NEEDS_SUPPLEMENT"].includes(farmer.accountStatus) && <><Button onClick={() => onAction("approve")}><CheckCircle2 className="mr-2 h-4 w-4" />Phê duyệt</Button><Button variant="outline" onClick={() => onDecision("supplement")}>Yêu cầu bổ sung</Button><Button variant="outline" className="text-red-600" onClick={() => onDecision("reject")}>Từ chối</Button></>}
            {!farmer.deletedAt && farmer.isApproved && <Button variant="outline" onClick={() => onAction(farmer.isLocked ? "unlock" : "lock")}>{farmer.isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}{farmer.isLocked ? "Mở khóa" : "Tạm khóa"}</Button>}
            {!farmer.deletedAt && <Button variant="outline" className="text-red-600" onClick={() => onAction("soft_delete")}><Trash2 className="mr-2 h-4 w-4" />Xóa mềm</Button>}
            {farmer.deletedAt && <Button onClick={() => onAction("restore")}><ArchiveRestore className="mr-2 h-4 w-4" />Khôi phục</Button>}
        </div>
    </Modal>;
}

function DecisionDialog({ action, reason, setReason, items, setItems, onClose, onSubmit }: { action: "supplement" | "reject"; reason: string; setReason: (value: string) => void; items: string[]; setItems: (value: string[]) => void; onClose: () => void; onSubmit: () => void }) {
    return <Modal onClose={onClose} width="max-w-xl"><h2 className="text-xl font-bold">{action === "supplement" ? "Yêu cầu bổ sung hồ sơ" : "Từ chối hồ sơ"}</h2>
        {action === "supplement" && <div className="mt-4 grid gap-2 sm:grid-cols-2">{supplementOptions.map((option) => <label key={option} className="flex gap-2 rounded-xl border p-3 text-sm"><input type="checkbox" checked={items.includes(option)} onChange={(event) => setItems(event.target.checked ? [...items, option] : items.filter((item) => item !== option))} />{option}</label>)}</div>}
        <div className="mt-4 space-y-2"><Label>{action === "reject" ? "Lý do từ chối (bắt buộc)" : "Nội dung yêu cầu (bắt buộc)"}</Label><textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-28 w-full rounded-2xl border p-3 text-sm" /></div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Hủy</Button><Button disabled={!reason.trim()} onClick={onSubmit}>{action === "supplement" ? "Gửi yêu cầu" : "Xác nhận từ chối"}</Button></div>
    </Modal>;
}

function CreateFarmerDialog({ regions, onClose, onCreated }: { regions: Region[]; onClose: () => void; onCreated: () => void }) {
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [farms, setFarms] = useState([createEmptyFarm()]);

    function updateFarm(index: number, field: keyof CreateFarmInput, value: string) {
        setFarms((current) => current.map((farm, farmIndex) => farmIndex === index ? { ...farm, [field]: value } : farm));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setSubmitting(true);
        const values = Object.fromEntries(new FormData(event.currentTarget));
        try {
            const response = await fetch("/api/region-manager/farmers", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: values.fullName, phone: values.phone, email: values.email, password: values.password,
                    address: values.address, province: values.province, district: values.district, ward: values.ward,
                    farms,
                }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: payload.message, variant: "success" }); await onCreated();
        } catch (error) { toast({ title: "Không thể tạo tài khoản", description: error instanceof Error ? error.message : undefined, variant: "destructive" }); }
        finally { setSubmitting(false); }
    }
    return <Modal onClose={onClose} width="max-w-4xl"><div className="flex justify-between"><div><h2 className="text-2xl font-black">Tạo tài khoản nông dân</h2><p className="text-sm text-slate-500">Tài khoản được kích hoạt ngay và liên kết với vùng phụ trách.</p></div><button onClick={onClose}><X /></button></div>
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên"><Input name="fullName" required /></Field><Field label="Số điện thoại"><Input name="phone" required /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field><Field label="Mật khẩu ban đầu"><Input name="password" required minLength={6} type="password" /></Field>
            <Field label="Địa chỉ cư trú"><Input name="address" /></Field><Field label="Tỉnh/Thành"><Input name="province" /></Field>
            <Field label="Quận/Huyện"><Input name="district" /></Field><Field label="Xã/Phường"><Input name="ward" /></Field>
            <div className="sm:col-span-2 border-t pt-4"><h3 className="font-bold">Thông tin vườn</h3><p className="mt-1 text-sm text-slate-500">Có thể thêm nhiều vườn cho cùng một tài khoản nông dân.</p></div>
            <div className="space-y-4 sm:col-span-2">
                {farms.map((farm, index) => (
                    <section key={farm.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h4 className="font-bold text-slate-900">Vườn {index + 1}</h4>
                            {index > 0 && <Button type="button" size="sm" variant="outline" className="text-red-600" onClick={() => setFarms((current) => current.filter((_, farmIndex) => farmIndex !== index))}><Trash2 className="mr-1 h-4 w-4" />Xóa vườn</Button>}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Tên vườn"><Input value={farm.farmName} onChange={(event) => updateFarm(index, "farmName", event.target.value)} required /></Field>
                            <Field label="Vùng trồng"><select value={farm.growingRegionId} onChange={(event) => updateFarm(index, "growingRegionId", event.target.value)} required className="h-10 w-full rounded-xl border bg-white px-3 text-sm"><option value="">Chọn vùng</option>{regions.map((region) => <option value={region.id} key={region.id}>{region.code} - {region.name}</option>)}</select></Field>
                            <Field label="Diện tích (ha)"><Input value={farm.areaSize} onChange={(event) => updateFarm(index, "areaSize", event.target.value)} type="number" min="0.01" step="0.01" required /></Field>
                            <Field label="Tổng số cây"><Input value={farm.totalTrees} onChange={(event) => updateFarm(index, "totalTrees", event.target.value)} type="number" min="1" required /></Field>
                            <Field label="Giống sầu riêng"><Input value={farm.durianVariety} onChange={(event) => updateFarm(index, "durianVariety", event.target.value)} required /></Field>
                            <Field label="Địa chỉ vườn"><Input value={farm.address} onChange={(event) => updateFarm(index, "address", event.target.value)} required /></Field>
                        </div>
                    </section>
                ))}
                <Button type="button" variant="outline" onClick={() => setFarms((current) => [...current, createEmptyFarm()])}><Plus className="mr-2 h-4 w-4" />Thêm vườn khác</Button>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-3"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button disabled={submitting} type="submit">{submitting ? "Đang tạo..." : "Tạo và kích hoạt"}</Button></div>
        </form>
    </Modal>;
}

type CreateFarmInput = {
    key: string;
    farmName: string;
    growingRegionId: string;
    areaSize: string;
    totalTrees: string;
    durianVariety: string;
    address: string;
};

function createEmptyFarm(): CreateFarmInput {
    return { key: crypto.randomUUID(), farmName: "", growingRegionId: "", areaSize: "", totalTrees: "", durianVariety: "", address: "" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
