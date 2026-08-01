"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Eye, Edit, Ban, CheckCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { MasterDataTable, type ColumnDef, type PaginationMeta } from "@/components/admin/master-data/master-data-table";
import { StatusBadge } from "@/components/admin/master-data/status-badge";
import { GaccStatusBadge } from "@/components/admin/master-data/gacc-status-badge";
import { ConfirmActionDialog } from "@/components/admin/master-data/confirm-action-dialog";
import { PesticideForm } from "@/components/admin/master-data/pesticide-form";
import { GACC_STATUS_OPTIONS, PESTICIDE_CATEGORIES } from "@/lib/validations/master-data";
// Sử dụng type từ enum trong master-data validations
type GaccChemicalStatus = "ALLOWED" | "RESTRICTED" | "PROHIBITED" | "UNKNOWN";

type Pesticide = {
    id: string;
    code: string;
    tradeName: string;
    activeIngredient: string;
    category: string | null;
    manufacturer: string | null;
    registrationNumber: string | null;
    gaccStatus: GaccChemicalStatus;
    phiDays: number | null;
    isActive: boolean;
    notes: string | null;
    sourceReference: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    createdAt: string;
    updatedAt: string;
};

const COLUMNS: ColumnDef<Pesticide>[] = [
    { key: "index", header: "STT", render: (_item, index) => <span className="text-slate-400">{(index + 1)}</span> },
    { key: "code", header: "Mã thuốc", render: (item) => <span className="font-semibold">{item.code}</span> },
    { key: "tradeName", header: "Tên thương mại", render: (item) => <span>{item.tradeName}</span> },
    { key: "activeIngredient", header: "Hoạt chất", render: (item) => <span className="text-slate-500">{item.activeIngredient}</span>, className: "hidden lg:table-cell" },
    { key: "category", header: "Loại", render: (item) => <span className="text-slate-500">{item.category || "—"}</span>, className: "hidden md:table-cell" },
    {
        key: "gaccStatus",
        header: "GACC",
        render: (item) => <GaccStatusBadge status={item.gaccStatus} />,
    },
    {
        key: "phiDays",
        header: "PHI",
        render: (item) => <span>{item.phiDays != null ? `${item.phiDays} ngày` : "—"}</span>,
        className: "hidden lg:table-cell",
    },
    {
        key: "isActive",
        header: "Trạng thái",
        render: (item) => <StatusBadge isActive={item.isActive} />,
    },
    {
        key: "updatedAt",
        header: "Cập nhật",
        render: (item) => <span className="text-slate-500">{new Date(item.updatedAt).toLocaleDateString("vi-VN")}</span>,
        className: "hidden md:table-cell",
    },
];

const INITIAL_PAGINATION: PaginationMeta = { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

export default function PesticidesPage() {
    const { toast } = useToast();
    const [data, setData] = useState<Pesticide[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>(INITIAL_PAGINATION);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [gaccFilter, setGaccFilter] = useState<string>("");
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<Pesticide | null>(null);
    const [viewingItem, setViewingItem] = useState<Pesticide | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: string; item: Pesticide } | null>(null);

    const loadData = useCallback(async (page: number = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: "20",
                sortBy: "updatedAt",
                sortOrder: "desc",
            });
            if (search.trim()) params.set("search", search.trim());
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (gaccFilter) params.set("gaccStatus", gaccFilter);
            if (categoryFilter) params.set("category", categoryFilter);

            const res = await fetch(`/api/admin/master-data/pesticides?${params}`);
            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.message || "Không thể tải dữ liệu");
            }

            setData(json.data);
            setPagination(json.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    }, [search, statusFilter, gaccFilter, categoryFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleActive = async (item: Pesticide) => {
        try {
            const res = await fetch(`/api/admin/master-data/pesticides/${item.id}?action=toggle-active`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            toast({ title: json.message || "Đã cập nhật trạng thái", variant: "success" });
            loadData(pagination.page);
        } catch (err) {
            toast({ title: "Thao tác thất bại", description: err instanceof Error ? err.message : "Có lỗi xảy ra", variant: "destructive" });
        }
    };

    const handleSoftDelete = async (item: Pesticide) => {
        try {
            const res = await fetch(`/api/admin/master-data/pesticides/${item.id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            toast({ title: json.message || "Đã xóa", variant: "success" });
            loadData(pagination.page);
        } catch (err) {
            toast({ title: "Xóa thất bại", description: err instanceof Error ? err.message : "Có lỗi xảy ra", variant: "destructive" });
        }
    };

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <Badge className="w-fit">ADMIN · Danh mục dùng chung</Badge>
                    <CardTitle className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                        Thuốc bảo vệ thực vật
                    </CardTitle>
                    <CardDescription>
                        Quản lý danh mục thuốc BVTV. Xác định trạng thái GACC (Được phép, Hạn chế, Bị cấm, Chưa xác định).
                        Thuốc bị cấm sẽ không hiển thị trong form tạo nhật ký mới.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Tìm theo mã, tên, hoạt chất..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang sử dụng</option>
                            <option value="inactive">Ngừng sử dụng</option>
                        </select>
                        <select
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            value={gaccFilter}
                            onChange={(e) => setGaccFilter(e.target.value)}
                        >
                            <option value="">GACC: Tất cả</option>
                            {GACC_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <select
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">Loại: Tất cả</option>
                            {PESTICIDE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <Button onClick={() => { setEditingItem(null); setShowForm(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm thuốc
                        </Button>
                    </div>

                    <MasterDataTable
                        columns={[
                            ...COLUMNS,
                            {
                                key: "actions",
                                header: "Thao tác",
                                render: (item) => (
                                    <div className="flex items-center gap-2">
                                        <button title="Xem" onClick={() => setViewingItem(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye className="h-4 w-4" /></button>
                                        <button title="Sửa" onClick={() => { setEditingItem(item); setShowForm(true); }} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"><Edit className="h-4 w-4" /></button>
                                        <button title={item.isActive ? "Ngừng sử dụng" : "Kích hoạt"} onClick={() => setConfirmAction({ type: "toggle-active", item })} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50">{item.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</button>
                                        <button title="Xóa" onClick={() => setConfirmAction({ type: "delete", item })} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                ),
                                className: "text-right",
                            },
                        ]}
                        data={data}
                        isLoading={isLoading}
                        error={error}
                        pagination={pagination}
                        onPageChange={(page) => loadData(page)}
                        emptyMessage="Chưa có thuốc BVTV nào."
                        keyExtractor={(item) => item.id}
                    />
                </CardContent>
            </Card>

            {showForm && (
                <PesticideForm
                    initialData={editingItem ?? undefined}
                    onSuccess={() => { setShowForm(false); setEditingItem(null); loadData(1); toast({ title: editingItem ? "Đã cập nhật thuốc BVTV" : "Đã thêm thuốc BVTV", variant: "success" }); }}
                    onCancel={() => { setShowForm(false); setEditingItem(null); }}
                />
            )}

            {viewingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewingItem(null)}>
                    <div className="mx-4 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900">Chi tiết thuốc BVTV</h3>
                        <div className="mt-4 space-y-3">
                            <DetailRow label="Mã thuốc" value={viewingItem.code} />
                            <DetailRow label="Tên thương mại" value={viewingItem.tradeName} />
                            <DetailRow label="Hoạt chất" value={viewingItem.activeIngredient} />
                            <DetailRow label="Loại thuốc" value={viewingItem.category || "—"} />
                            <DetailRow label="Nhà sản xuất" value={viewingItem.manufacturer || "—"} />
                            <DetailRow label="Số đăng ký" value={viewingItem.registrationNumber || "—"} />
                            <DetailRow label="Trạng thái GACC" value={GACC_STATUS_OPTIONS.find(o => o.value === viewingItem.gaccStatus)?.label ?? viewingItem.gaccStatus} />
                            <DetailRow label="PHI" value={viewingItem.phiDays != null ? `${viewingItem.phiDays} ngày` : "—"} />
                            <DetailRow label="Nguồn tham chiếu" value={viewingItem.sourceReference || "—"} />
                            <DetailRow label="Ghi chú" value={viewingItem.notes || "—"} />
                            <DetailRow label="Trạng thái" value={viewingItem.isActive ? "Đang sử dụng" : "Ngừng sử dụng"} />
                        </div>
                        <div className="mt-6 flex justify-end"><Button variant="outline" onClick={() => setViewingItem(null)}>Đóng</Button></div>
                    </div>
                </div>
            )}

            {confirmAction && (
                <ConfirmActionDialog
                    open
                    onClose={() => setConfirmAction(null)}
                    onConfirm={() => confirmAction.type === "toggle-active" ? handleToggleActive(confirmAction.item) : handleSoftDelete(confirmAction.item)}
                    title={
                        confirmAction.type === "toggle-active"
                            ? confirmAction.item.isActive ? "Ngừng sử dụng thuốc?" : "Kích hoạt lại thuốc?"
                            : "Xóa thuốc BVTV?"
                    }
                    message={
                        confirmAction.type === "delete"
                            ? `Xóa thuốc "${confirmAction.item.tradeName}"? Dữ liệu lịch sử không bị mất.`
                            : confirmAction.item.isActive
                                ? `Ngừng sử dụng thuốc "${confirmAction.item.tradeName}"? Thuốc sẽ không xuất hiện trong form mới.`
                                : `Kích hoạt lại thuốc "${confirmAction.item.tradeName}"?`
                    }
                    confirmLabel={confirmAction.type === "toggle-active" ? (confirmAction.item.isActive ? "Ngừng sử dụng" : "Kích hoạt") : "Xóa"}
                    variant={confirmAction.type === "delete" ? "danger" : "warning"}
                />
            )}
        </main>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-500">{label}</span>
            <span className="text-sm text-slate-900">{value}</span>
        </div>
    );
}

