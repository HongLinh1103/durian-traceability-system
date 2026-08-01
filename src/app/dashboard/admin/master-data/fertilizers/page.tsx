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
import { ConfirmActionDialog } from "@/components/admin/master-data/confirm-action-dialog";
import { FertilizerForm } from "@/components/admin/master-data/fertilizer-form";
import { FERTILIZER_TYPES } from "@/lib/validations/master-data";

type Fertilizer = {
    id: string;
    code: string;
    name: string;
    fertilizerType: string | null;
    brand: string | null;
    manufacturer: string | null;
    nutrientComposition: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

const COLUMNS: ColumnDef<Fertilizer>[] = [
    { key: "index", header: "STT", render: (_item, index) => <span className="text-slate-400">{(index + 1)}</span> },
    { key: "code", header: "Mã phân bón", render: (item) => <span className="font-semibold">{item.code}</span> },
    { key: "name", header: "Tên phân bón", render: (item) => <span>{item.name}</span> },
    { key: "fertilizerType", header: "Loại", render: (item) => <span className="text-slate-500">{item.fertilizerType || "—"}</span>, className: "hidden md:table-cell" },
    { key: "brand", header: "Thương hiệu", render: (item) => <span className="text-slate-500">{item.brand || "—"}</span>, className: "hidden lg:table-cell" },
    { key: "manufacturer", header: "SX", render: (item) => <span className="text-slate-500">{item.manufacturer || "—"}</span>, className: "hidden lg:table-cell" },
    { key: "nutrientComposition", header: "Thành phần", render: (item) => <span className="text-slate-500">{item.nutrientComposition || "—"}</span>, className: "hidden lg:table-cell" },
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

export default function FertilizersPage() {
    const { toast } = useToast();
    const [data, setData] = useState<Fertilizer[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>(INITIAL_PAGINATION);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("");
    const [brandFilter, setBrandFilter] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<Fertilizer | null>(null);
    const [viewingItem, setViewingItem] = useState<Fertilizer | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: string; item: Fertilizer } | null>(null);

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
            if (typeFilter) params.set("fertilizerType", typeFilter);
            if (brandFilter) params.set("brand", brandFilter);

            const res = await fetch(`/api/admin/master-data/fertilizers?${params}`);
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
    }, [search, statusFilter, typeFilter, brandFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleActive = async (item: Fertilizer) => {
        try {
            const res = await fetch(`/api/admin/master-data/fertilizers/${item.id}?action=toggle-active`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            toast({ title: json.message || "Đã cập nhật trạng thái", variant: "success" });
            loadData(pagination.page);
        } catch (err) {
            toast({ title: "Thao tác thất bại", description: err instanceof Error ? err.message : "Có lỗi xảy ra", variant: "destructive" });
        }
    };

    const handleSoftDelete = async (item: Fertilizer) => {
        try {
            const res = await fetch(`/api/admin/master-data/fertilizers/${item.id}`, { method: "DELETE" });
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
                        Phân bón
                    </CardTitle>
                    <CardDescription>
                        Quản lý danh mục phân bón sử dụng trong hệ thống. Dữ liệu sẽ hiển thị trong form nhật ký bón phân.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input placeholder="Tìm theo mã, tên, thương hiệu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>
                        <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang sử dụng</option>
                            <option value="inactive">Ngừng sử dụng</option>
                        </select>
                        <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="">Loại: Tất cả</option>
                            {FERTILIZER_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
                        </select>
                        <Input placeholder="Thương hiệu..." value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="w-40" />
                        <Button onClick={() => { setEditingItem(null); setShowForm(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm phân bón
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
                        emptyMessage="Chưa có phân bón nào."
                        keyExtractor={(item) => item.id}
                    />
                </CardContent>
            </Card>

            {showForm && (
                <FertilizerForm
                    initialData={editingItem ?? undefined}
                    onSuccess={() => { setShowForm(false); setEditingItem(null); loadData(1); toast({ title: editingItem ? "Đã cập nhật phân bón" : "Đã thêm phân bón", variant: "success" }); }}
                    onCancel={() => { setShowForm(false); setEditingItem(null); }}
                />
            )}

            {viewingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewingItem(null)}>
                    <div className="mx-4 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900">Chi tiết phân bón</h3>
                        <div className="mt-4 space-y-3">
                            <DetailRow label="Mã phân bón" value={viewingItem.code} />
                            <DetailRow label="Tên phân bón" value={viewingItem.name} />
                            <DetailRow label="Loại phân bón" value={viewingItem.fertilizerType || "—"} />
                            <DetailRow label="Thương hiệu" value={viewingItem.brand || "—"} />
                            <DetailRow label="Nhà sản xuất" value={viewingItem.manufacturer || "—"} />
                            <DetailRow label="Thành phần" value={viewingItem.nutrientComposition || "—"} />
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
                    title={confirmAction.type === "toggle-active" ? (confirmAction.item.isActive ? "Ngừng sử dụng phân bón?" : "Kích hoạt lại phân bón?") : "Xóa phân bón?"}
                    message={confirmAction.type === "delete" ? `Xóa phân bón "${confirmAction.item.name}"? Dữ liệu lịch sử không bị mất.` : confirmAction.item.isActive ? `Ngừng sử dụng phân bón "${confirmAction.item.name}"?` : `Kích hoạt lại phân bón "${confirmAction.item.name}"?`}
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

