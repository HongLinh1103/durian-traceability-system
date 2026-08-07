"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { MasterDataTable, type ColumnDef, type PaginationMeta } from "@/components/admin/master-data/master-data-table";
import { ConfirmActionDialog } from "@/components/admin/master-data/confirm-action-dialog";
import { PesticideForm } from "@/components/admin/master-data/pesticide-form";
import { PESTICIDE_CATEGORIES } from "@/lib/validations/master-data";
// Sử dụng type từ enum trong master-data validations
type GaccChemicalStatus = "ALLOWED" | "RESTRICTED" | "PROHIBITED" | "UNKNOWN";

type Pesticide = {
    id: string;
    code: string;
    pesticideName: string | null;
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
    { key: "pesticideName", header: "Hoạt chất/Tên thuốc BVTV", render: (item) => <span className="font-semibold">{item.pesticideName || item.activeIngredient || item.tradeName}</span> },
    { key: "category", header: "Loại thuốc", render: (item) => <span className="text-slate-600">{item.category || "—"}</span> },
];

const INITIAL_PAGINATION: PaginationMeta = { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

export default function PesticidesPage() {
    const { toast } = useToast();
    const [data, setData] = useState<Pesticide[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>(INITIAL_PAGINATION);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<Pesticide | null>(null);
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
    }, [search, categoryFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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

                    <CardTitle className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                        Quản lý danh mục hoạt chất và thuốc BVTV cấm sử dụng
                    </CardTitle>

                </CardHeader>
                <CardContent className="space-y-4">
                    <section className="space-y-3">

                        <PesticideForm
                            key={editingItem?.id ?? "new-prohibited-item"}
                            inline
                            initialData={editingItem ?? undefined}
                            onSuccess={() => { setEditingItem(null); loadData(1); toast({ title: editingItem ? "Đã cập nhật chất cấm" : "Đã ghi nhận chất cấm", variant: "success" }); }}
                            onCancel={() => setEditingItem(null)}
                        />
                    </section>

                    <div className="border-t border-slate-200 pt-6">
                        <h2 className="mb-3 text-xl font-bold text-slate-900">Danh sách các chất cấm đã ghi nhận</h2>
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
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="">Loại: Tất cả</option>
                                {PESTICIDE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <MasterDataTable
                            columns={[
                                ...COLUMNS,
                                {
                                    key: "actions",
                                    header: "Thao tác",
                                    render: (item) => (
                                        <div className="flex items-center gap-2">
                                            <button title="Sửa" onClick={() => { setEditingItem(item); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"><Edit className="h-4 w-4" /></button>
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
                            emptyMessage="Chưa có chất cấm nào được ghi nhận."
                            keyExtractor={(item) => item.id}
                        />
                    </div>
                </CardContent>
            </Card>

            {confirmAction && (
                <ConfirmActionDialog
                    open
                    onClose={() => setConfirmAction(null)}
                    onConfirm={() => handleSoftDelete(confirmAction.item)}
                    title="Xóa chất cấm?"
                    message={`Xóa chất "${confirmAction.item.pesticideName || confirmAction.item.tradeName}" khỏi danh mục cấm?`}
                    confirmLabel="Xóa"
                    variant="danger"
                />
            )}
        </main>
    );
}

