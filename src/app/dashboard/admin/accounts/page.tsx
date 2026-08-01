"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Search, UserRound, XCircle, Clock, AlertTriangle, Eye, Loader2, X, Pencil, Trash2, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type AccountUser = {
    id: string;
    phone: string;
    email: string | null;
    fullName: string | null;
    role: string;
    isApproved: boolean;
    isLocked: boolean;
    accountStatus: string;
    address: string | null;
    province: string | null;
    district: string | null;
    ward: string | null;
    registrationName: string | null;
    registeredAreaSize: number | null;
    registeredTotalTrees: number | null;
    registeredDurianVariety: string | null;
    createdAt: string;
    approvedAt: string | null;
    farms: Array<{
        id: string;
        farmCode: string;
        farmName: string;
        areaSize: number;
        totalTrees: number;
        durianVariety: string;
        address: string;
        province: string | null;
        district: string | null;
        ward: string | null;
        areaUnit: string;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        growingRegion: string | null;
        isActive: boolean;
    }>;
    packhouses: Array<{ id: string; packhouseCode: string; packhouseName: string; address: string }>;
    areaManagerApplication: {
        identityNumber: string;
        identityIssuedDate: string;
        identityIssuedPlace: string;
        organizationName: string;
        taxCode: string | null;
        position: string;
        officeProvince: string;
        officeDistrict: string;
        officeWard: string;
        officeDetailedAddress: string;
        managedRegions: unknown;
    } | null;
};

type AccountsResponse = {
    success: boolean;
    data: AccountUser[];
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

const roleLabels: Record<string, string> = {
    FARMER: "Nông dân",
    AREA_MANAGER: "Trưởng BQL Vùng trồng",
    EXPORTER: "Doanh nghiệp Xuất khẩu",
    PACKHOUSE_MANAGER: "Quản lý CSĐG",
    PACKHOUSE_STAFF: "Nhân viên CSĐG",
    ADMIN: "Admin",
};

const statusLabels: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Chờ duyệt", className: "bg-amber-100 text-amber-800 border-amber-200" },
    NEEDS_SUPPLEMENT: { label: "Cần bổ sung", className: "bg-orange-100 text-orange-800 border-orange-200" },
    APPROVED: { label: "Đã duyệt", className: "bg-green-100 text-green-800 border-green-200" },
    REJECTED: { label: "Bị từ chối", className: "bg-red-100 text-red-800 border-red-200" },
};

type ManagedRegion = {
    code?: string;
    name?: string;
    province?: string;
    district?: string;
    ward?: string;
    areaSize?: number;
    durianVarieties?: string[];
};

function getManagedRegions(value: unknown): ManagedRegion[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is ManagedRegion => Boolean(item && typeof item === "object"));
    }
    return value && typeof value === "object" ? [value as ManagedRegion] : [];
}

export default function AdminAccountsPage() {
    const { toast } = useToast();
    const [accounts, setAccounts] = useState<AccountUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<{ userId: string; fullName: string | null } | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedAccount, setSelectedAccount] = useState<AccountUser | null>(null);
    const [editingAccount, setEditingAccount] = useState<AccountUser | null>(null);

    const loadAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: "20",
                status: statusFilter,
            });
            if (search.trim()) params.set("search", search.trim());

            const response = await fetch(`/api/admin/accounts?${params}`);
            const payload = (await response.json()) as AccountsResponse;

            if (payload.success) {
                setAccounts(payload.data);
                setPagination(payload.pagination);
            }
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        void loadAccounts();
    }, [loadAccounts]);

    const handleApprove = async (userId: string) => {
        setProcessingId(userId);
        try {
            const response = await fetch("/api/admin/accounts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action: "approve" }),
            });

            const payload = await response.json();
            if (!payload.success) throw new Error(payload.message);

            toast({ title: "Phê duyệt thành công", description: payload.message, variant: "success" });
            await loadAccounts();
        } catch (error) {
            toast({
                title: "Phê duyệt thất bại",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        setProcessingId(rejectModal.userId);
        try {
            const response = await fetch("/api/admin/accounts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: rejectModal.userId,
                    action: "reject",
                    reason: rejectReason.trim() || "Không đáp ứng yêu cầu đăng ký.",
                }),
            });

            const payload = await response.json();
            if (!payload.success) throw new Error(payload.message);

            toast({ title: "Đã từ chối", description: payload.message, variant: "success" });
            setRejectModal(null);
            setRejectReason("");
            await loadAccounts();
        } catch (error) {
            toast({
                title: "Thất bại",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleSupplement = async (userId: string) => {
        const reason = window.prompt("Nhập nội dung hồ sơ cần bổ sung:");
        if (!reason?.trim()) return;
        setProcessingId(userId);
        try {
            const response = await fetch("/api/admin/accounts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action: "supplement", reason: reason.trim() }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: "Đã yêu cầu bổ sung", description: payload.message, variant: "success" });
            await loadAccounts();
        } catch (error) {
            toast({ title: "Không thể gửi yêu cầu", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    const mutateAccount = async (method: "PATCH" | "DELETE", body: Record<string, unknown>) => {
        const accountId = String(body.userId);
        setProcessingId(accountId);
        try {
            const response = await fetch("/api/admin/accounts", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: payload.message, variant: "success" });
            setEditingAccount(null);
            await loadAccounts();
        } catch (error) {
            toast({ title: "Không thể thực hiện thao tác", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Badge className="w-fit">ADMIN · Quản lý tài khoản</Badge>
                            <CardTitle className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                                Phê duyệt tài khoản
                            </CardTitle>
                            <CardDescription>
                                Quản lý và phê duyệt tài khoản người dùng đăng ký mới.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-700">
                            <Clock className="h-5 w-5" />
                            <span className="text-sm font-semibold">
                                {pagination.totalItems} tài khoản {statusFilter === "PENDING" ? "chờ duyệt" : ""}
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Tìm kiếm tên, số điện thoại, email..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            {["PENDING", "NEEDS_SUPPLEMENT", "APPROVED", "REJECTED", "all"].map((s) => (
                                <Button
                                    key={s}
                                    variant={statusFilter === s ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => { setStatusFilter(s); setPage(1); }}
                                >
                                    {s === "PENDING" ? "Chờ duyệt" : s === "NEEDS_SUPPLEMENT" ? "Cần bổ sung" : s === "APPROVED" ? "Đã duyệt" : s === "REJECTED" ? "Từ chối" : "Tất cả"}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
                            ))}
                        </div>
                    ) : accounts.length === 0 ? (
                        /* Empty State */
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
                            <UserRound className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-4 text-lg font-semibold text-slate-700">Không có tài khoản nào</p>
                            <p className="text-sm text-slate-500">
                                {statusFilter === "PENDING"
                                    ? "Chưa có tài khoản mới đăng ký cần phê duyệt."
                                    : "Không tìm thấy tài khoản phù hợp."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-5 py-3">Họ tên</th>
                                            <th className="px-5 py-3">Số điện thoại</th>
                                            <th className="px-5 py-3">Vai trò</th>
                                            <th className="px-5 py-3">Trạng thái</th>
                                            <th className="px-5 py-3 text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {accounts.map((account) => {
                                            const statusInfo = statusLabels[account.accountStatus] ?? statusLabels.PENDING;
                                            return (
                                                <tr key={account.id} className="transition hover:bg-slate-50">
                                                    <td className="px-5 py-4">
                                                        <p className="font-semibold text-slate-900">{account.fullName || "Chưa có tên"}</p>
                                                        <p className="mt-0.5 text-xs text-slate-500">{account.email || "Chưa có email"}</p>
                                                    </td>
                                                    <td className="px-5 py-4 font-medium text-slate-700">{account.phone}</td>
                                                    <td className="px-5 py-4"><Badge className="bg-brand-100 text-brand-800">{roleLabels[account.role] ?? account.role}</Badge></td>
                                                    <td className="px-5 py-4"><Badge className={statusInfo.className}>{statusInfo.label}</Badge></td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <IconAction label="Xem chi tiết" onClick={() => setSelectedAccount(account)}><Eye className="h-4 w-4" /></IconAction>
                                                            <IconAction label="Sửa tài khoản" onClick={() => setEditingAccount(account)}><Pencil className="h-4 w-4" /></IconAction>
                                                            <IconAction label={account.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"} disabled={processingId === account.id} onClick={() => void mutateAccount("PATCH", { userId: account.id, action: account.isLocked ? "unlock" : "lock" })}>
                                                                {account.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                                            </IconAction>
                                                            <IconAction label="Xóa tài khoản" tone="danger" disabled={processingId === account.id} onClick={() => { if (window.confirm(`Bạn có chắc muốn xóa tài khoản ${account.fullName || account.phone}?`)) void mutateAccount("DELETE", { userId: account.id }); }}><Trash2 className="h-4 w-4" /></IconAction>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Trước
                            </Button>
                            <span className="px-4 text-sm text-slate-600">
                                Trang {pagination.page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Sau
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedAccount && (
                <AccountDetailModal
                    account={selectedAccount}
                    processing={processingId === selectedAccount.id}
                    onClose={() => setSelectedAccount(null)}
                    onApprove={() => void handleApprove(selectedAccount.id)}
                    onSupplement={() => void handleSupplement(selectedAccount.id)}
                    onReject={() => {
                        setRejectModal({ userId: selectedAccount.id, fullName: selectedAccount.fullName });
                        setSelectedAccount(null);
                    }}
                />
            )}

            {editingAccount && (
                <EditAccountModal
                    account={editingAccount}
                    processing={processingId === editingAccount.id}
                    onClose={() => setEditingAccount(null)}
                    onSubmit={(values) => void mutateAccount("PATCH", { userId: editingAccount.id, action: "update", ...values })}
                />
            )}

            {/* Reject Confirmation Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-full bg-red-50 p-2 text-red-600">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Từ chối tài khoản</h3>
                        </div>

                        <p className="text-sm text-slate-600">
                            Bạn có chắc muốn từ chối tài khoản của <strong>{rejectModal.fullName}</strong>?
                        </p>

                        <div className="mt-4 space-y-2">
                            <Label htmlFor="rejectReason">Lý do từ chối</Label>
                            <textarea
                                id="rejectReason"
                                className="min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                                placeholder="Nhập lý do từ chối (bắt buộc)..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="destructive"
                                disabled={processingId === rejectModal.userId || !rejectReason.trim()}
                                onClick={() => void handleReject()}
                            >
                                {processingId === rejectModal.userId ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : null}
                                Xác nhận từ chối
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function AccountDetailModal({
    account,
    processing,
    onClose,
    onApprove,
    onSupplement,
    onReject,
}: {
    account: AccountUser;
    processing: boolean;
    onClose: () => void;
    onApprove: () => void;
    onSupplement: () => void;
    onReject: () => void;
}) {
    const statusInfo = statusLabels[account.accountStatus] ?? statusLabels.PENDING;
    const managedRegions = getManagedRegions(account.areaManagerApplication?.managedRegions);
    const primaryRegion = managedRegions[0];
    const displayAddress = account.address || (account.areaManagerApplication
        ? [
            account.areaManagerApplication.officeDetailedAddress,
            account.areaManagerApplication.officeWard,
            account.areaManagerApplication.officeDistrict,
            account.areaManagerApplication.officeProvince,
        ].filter(Boolean).join(", ")
        : null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-brand-100 text-brand-800">{roleLabels[account.role] ?? account.role}</Badge>
                            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                        </div>
                        <h2 className="mt-3 text-2xl font-black text-slate-900">{account.fullName || "Chưa có tên"}</h2>
                        <p className="text-sm text-slate-500">{account.phone}{account.email ? ` · ${account.email}` : ""}</p>
                    </div>
                    <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}><X className="h-5 w-5" /></button>
                </div>

                <section className="mt-6 grid gap-x-6 gap-y-3 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <p><span className="text-slate-500">Họ tên:</span><strong className="ml-1">{account.fullName || "—"}</strong></p>
                    <p><span className="text-slate-500">Điện thoại:</span><strong className="ml-1">{account.phone}</strong></p>
                    <p><span className="text-slate-500">Email:</span><strong className="ml-1">{account.email || "—"}</strong></p>
                    <p className="sm:col-span-2"><span className="text-slate-500">Địa chỉ:</span><strong className="ml-1">{displayAddress || "—"}</strong></p>
                    <p><span className="text-slate-500">Ngày đăng ký:</span><strong className="ml-1">{new Date(account.createdAt).toLocaleDateString("vi-VN")}</strong></p>
                    <p><span className="text-slate-500">Ngày duyệt tài khoản:</span><strong className="ml-1">{account.approvedAt ? new Date(account.approvedAt).toLocaleDateString("vi-VN") : "Chưa duyệt"}</strong></p>
                </section>

                {account.role === "AREA_MANAGER" && account.areaManagerApplication && (
                    <section className="mt-4 rounded-2xl border border-slate-200 p-5 text-sm">
                        <h3 className="font-bold text-slate-900">Thông tin Trưởng ban và vùng phụ trách</h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <p><span className="text-slate-500">Tổ chức/HTX:</span> {account.areaManagerApplication.organizationName}</p>
                            <p><span className="text-slate-500">Chức vụ:</span> {account.areaManagerApplication.position}</p>
                            <p><span className="text-slate-500">Mã số thuế:</span> {account.areaManagerApplication.taxCode || "—"}</p>
                            <p><span className="text-slate-500">CCCD/CMND:</span> {account.areaManagerApplication.identityNumber}</p>
                            <p><span className="text-slate-500">Ngày cấp:</span> {new Date(account.areaManagerApplication.identityIssuedDate).toLocaleDateString("vi-VN")}</p>
                            <p><span className="text-slate-500">Nơi cấp:</span> {account.areaManagerApplication.identityIssuedPlace}</p>
                            <p className="sm:col-span-2"><span className="text-slate-500">Vùng phụ trách:</span> {managedRegions.map((region) => [region.code, region.name].filter(Boolean).join(" - ")).join(", ") || "—"}</p>
                            <p><span className="text-slate-500">Quy mô:</span> {primaryRegion?.areaSize != null ? `${primaryRegion.areaSize} ha` : "—"}</p>
                            <p className="sm:col-span-2"><span className="text-slate-500">Giống chủ lực:</span> {primaryRegion?.durianVarieties?.join(", ") || "—"}</p>
                        </div>
                    </section>
                )}

                {account.farms.length > 0 && (
                    <section className="mt-4">
                        <h3 className="mb-3 font-bold text-slate-900">Danh sách vườn</h3>
                        <div className="space-y-3">{account.farms.map((farm) => (
                            <div key={farm.id} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-950">
                                <strong>{farm.farmCode} · {farm.farmName}</strong>
                                <p className="mt-1">{farm.address} · {farm.growingRegion || "Chưa phân vùng"}</p>
                                <p>{farm.areaSize} ha · {farm.totalTrees} cây · Giống {farm.durianVariety}</p>
                            </div>
                        ))}</div>
                    </section>
                )}

                {["PENDING", "NEEDS_SUPPLEMENT"].includes(account.accountStatus) && (
                    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-5">
                        <Button disabled={processing} onClick={onApprove}>{processing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}Duyệt</Button>
                        <Button variant="outline" disabled={processing} onClick={onSupplement}><AlertTriangle className="mr-1 h-4 w-4" />Yêu cầu bổ sung</Button>
                        <Button variant="destructive" disabled={processing} onClick={onReject}><XCircle className="mr-1 h-4 w-4" />Từ chối</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function IconAction({ label, children, onClick, disabled = false, tone = "default" }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "default" | "danger" }) {
    return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`rounded-lg border p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${tone === "danger" ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>{children}</button>;
}

function EditAccountModal({ account, processing, onClose, onSubmit }: { account: AccountUser; processing: boolean; onClose: () => void; onSubmit: (values: { fullName: string; phone: string; email: string; address: string }) => void }) {
    const [fullName, setFullName] = useState(account.fullName || "");
    const [phone, setPhone] = useState(account.phone);
    const [email, setEmail] = useState(account.email || "");
    const [address, setAddress] = useState(account.address || "");
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <form className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onSubmit={(event) => { event.preventDefault(); onSubmit({ fullName: fullName.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() }); }}>
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Sửa tài khoản</h2><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="edit-full-name">Họ tên</Label><Input id="edit-full-name" required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="edit-phone">Số điện thoại</Label><Input id="edit-phone" required value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="edit-email">Email</Label><Input id="edit-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="edit-address">Địa chỉ</Label><Input id="edit-address" value={address} onChange={(event) => setAddress(event.target.value)} /></div>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button type="submit" disabled={processing || !fullName.trim() || !phone.trim()}>{processing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Lưu thay đổi</Button></div>
        </form>
    </div>;
}

