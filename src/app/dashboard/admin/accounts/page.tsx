"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Search,
    UserPlus,
    UserCheck,
    Lock,
    Unlock,
    KeyRound,
    Trash2,
    Edit3,
    Eye,
    Shield,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Loader2,
    X,
    Check,
    Building2,
    MapPin,
    Sprout,
    ShieldAlert,
    MoreVertical,
    FileText,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatVietnameseDate } from "@/lib/date-format";

// Định nghĩa kiểu dữ liệu tài khoản
type AdminUser = {
    id: string;
    phone: string;
    email: string | null;
    fullName: string | null;
    avatar: string | null;
    role: string;
    isApproved: boolean;
    isLocked: boolean;
    accountStatus: "PENDING" | "NEEDS_SUPPLEMENT" | "APPROVED" | "REJECTED";
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
        region: { code: string; name: string } | null;
        isActive: boolean;
    }>;
    stores: Array<{
        id: string;
        name: string;
        address: string;
        status: string;
    }>;
    partnerFacility: {
        id: string;
        name: string;
        type: string;
        province: string;
        status: string;
    } | null;
    areaManagerApplication: {
        organizationName: string;
        position: string;
        status: string;
        managedRegions: any;
    } | null;
    approvalHistories: Array<{
        id: string;
        action: string;
        reason: string | null;
        createdAt: string;
        actor: { id: string; fullName: string | null; phone: string; role: string } | null;
    }>;
};

type RoleOption = {
    key: string;
    name: string;
    isSystem: boolean;
    targetGroup?: string;
};

const roleLabels: Record<string, { label: string; className: string }> = {
    ADMIN: { label: "Quản trị viên", className: "bg-rose-50 text-rose-700 border-rose-200" },
    FARMER: { label: "Nông dân", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    AREA_MANAGER: { label: "Trưởng ban vùng", className: "bg-blue-50 text-blue-700 border-blue-200" },
    STORE_OWNER: { label: "Cửa hàng vật tư", className: "bg-teal-50 text-teal-700 border-teal-200" },
    COLLECTOR: { label: "Vựa thu mua", className: "bg-amber-50 text-amber-700 border-amber-200" },
    PROCESSING_FACILITY: { label: "Cơ sở chế biến", className: "bg-purple-50 text-purple-700 border-purple-200" },
};

const userTypeLabels: Record<string, string> = {
    FARMER: "Nông dân",
    AREA_MANAGER: "Trưởng ban QL vùng",
    STORE_OWNER: "Cửa hàng vật tư",
    COLLECTOR: "Vựa thu mua",
    PROCESSING_FACILITY: "Cơ sở chế biến",
    ADMIN: "Quản trị viên",
};

export default function AdminAccountsPage() {
    // 1. STATE DỮ LIỆU CHÍNH
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [rolesList, setRolesList] = useState<RoleOption[]>([]);
    const [loading, setLoading] = useState(true);

    // 4 Thẻ KPI số lượng
    const [kpis, setKpis] = useState({
        totalAccounts: 0,
        pendingCount: 0,
        activeCount: 0,
        lockedCount: 0,
    });

    // Phân trang
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });

    // Bộ lọc & Tab
    const [activeTab, setActiveTab] = useState<"all" | "PENDING" | "ACTIVE" | "LOCKED">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    // Toast
    const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // 2. STATE CÁC MODAL
    // Modal Tạo tài khoản
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        fullName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    // Modal Xem hồ sơ & Duyệt (Approval Detail)
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [userToReview, setUserToReview] = useState<AdminUser | null>(null);
    const [reviewReasonInput, setReviewReasonInput] = useState("");
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

    // Modal Chỉnh sửa thông tin
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState({
        fullName: "",
        phone: "",
        email: "",
        role: "FARMER",
        organization: "",
        address: "",
        province: "",
        district: "",
        ward: "",
    });
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    // Modal Đặt lại mật khẩu
    const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
    const [userToResetPwd, setUserToResetPwd] = useState<AdminUser | null>(null);
    const [newPasswordInput, setNewPasswordInput] = useState("");
    const [isSubmittingResetPwd, setIsSubmittingResetPwd] = useState(false);

    // Modal Xác nhận xóa
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    // 3. TẢI DANH SÁCH ROLE ĐỂ PHỤC VỤ DROPDOWN
    const loadRolesList = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/roles");
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setRolesList(
                    data.data.map((r: any) => ({
                        key: r.key,
                        name: r.name,
                        isSystem: r.isSystem,
                        targetGroup: r.targetGroup,
                    })),
                );
            }
        } catch (err) {
            console.error("loadRolesList error:", err);
        }
    }, []);

    useEffect(() => {
        void loadRolesList();
    }, [loadRolesList]);

    // 4. TẢI DANH SÁCH TÀI KHOẢN
    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: "20",
            });

            // Lọc theo tab hoặc trạng thái
            if (activeTab === "all") {
                params.set("status", "all");
            } else {
                params.set("status", activeTab);
            }

            // Lọc theo vai trò (Role)
            if (roleFilter !== "all") {
                params.set("role", roleFilter);
            }

            // Tìm kiếm
            if (searchTerm.trim()) {
                params.set("search", searchTerm.trim());
            }

            const res = await fetch(`/api/admin/users?${params.toString()}`);
            const payload = await res.json();

            if (payload.success) {
                setUsers(payload.data);
                setPagination(payload.pagination);
                if (payload.kpis) {
                    setKpis(payload.kpis);
                }
            } else {
                showToast(payload.message || "Không thể tải danh sách tài khoản.", "error");
            }
        } catch (err) {
            console.error("loadUsers error:", err);
            showToast("Lỗi kết nối khi tải danh sách người dùng.", "error");
        } finally {
            setLoading(false);
        }
    }, [page, activeTab, roleFilter, searchTerm]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    // Chuyển tab
    const handleTabChange = (tab: "all" | "PENDING" | "ACTIVE" | "LOCKED") => {
        setActiveTab(tab);
        setPage(1);
    };

    // 5. CÁC THAO TÁC PHÊ DUYỆT TÀI KHOẢN
    const handleApproveUser = async (userId: string, note?: string) => {
        setIsSubmittingApproval(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: note || "Admin phê duyệt kích hoạt tài khoản" }),
            });
            const payload = await res.json();
            if (payload.success) {
                showToast(payload.message || "Đã phê duyệt tài khoản.");
                setApprovalModalOpen(false);
                await loadUsers();
            } else {
                showToast(payload.message || "Không thể phê duyệt.", "error");
            }
        } catch (err) {
            showToast("Lỗi phê duyệt tài khoản.", "error");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const handleRejectUser = async (userId: string, reason: string) => {
        if (!reason.trim()) {
            showToast("Vui lòng nhập lý do từ chối.", "error");
            return;
        }
        setIsSubmittingApproval(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: reason.trim() }),
            });
            const payload = await res.json();
            if (payload.success) {
                showToast(payload.message || "Đã từ chối tài khoản.");
                setApprovalModalOpen(false);
                await loadUsers();
            } else {
                showToast(payload.message || "Không thể từ chối.", "error");
            }
        } catch (err) {
            showToast("Lỗi khi từ chối tài khoản.", "error");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const handleRequestSupplement = async (userId: string, reason: string) => {
        if (!reason.trim()) {
            showToast("Vui lòng nhập nội dung cần bổ sung.", "error");
            return;
        }
        setIsSubmittingApproval(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/request-supplement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: reason.trim() }),
            });
            const payload = await res.json();
            if (payload.success) {
                showToast(payload.message || "Đã gửi yêu cầu bổ sung hồ sơ.");
                setApprovalModalOpen(false);
                await loadUsers();
            } else {
                showToast(payload.message || "Không thể gửi yêu cầu.", "error");
            }
        } catch (err) {
            showToast("Lỗi gửi yêu cầu bổ sung hồ sơ.", "error");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    // 6. THAO TÁC KHÓA / MỞ KHÓA
    const handleToggleLock = async (user: AdminUser) => {
        const action = user.isLocked ? "unlock" : "lock";
        const confirmMsg = user.isLocked
            ? `Bạn có chắc muốn mở khóa cho tài khoản "${user.fullName || user.phone}"?`
            : `Bạn có chắc muốn khóa tài khoản "${user.fullName || user.phone}"? Người dùng sẽ không thể đăng nhập.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/admin/users/${user.id}/${action}`, { method: "POST" });
            const payload = await res.json();
            if (payload.success) {
                showToast(payload.message || (user.isLocked ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản."));
                await loadUsers();
            } else {
                showToast(payload.message || "Không thể thực hiện thao tác.", "error");
            }
        } catch {
            showToast("Lỗi kết nối máy chủ.", "error");
        }
    };

    // 7. THAO TÁC GÁN VAI TRÒ (ROLE ASSIGNMENT)
    // 7. THAO TÁC TẠO TÀI KHOẢN MỚI
    const handleOpenCreateModal = () => {
        setNewUserForm({
            fullName: "",
            phone: "",
            email: "",
            password: "",
            confirmPassword: "",
        });
        setCreateModalOpen(true);
    };

    const handleCreateUser = async () => {
        if (!newUserForm.fullName.trim() || !newUserForm.phone.trim() || !newUserForm.password.trim()) {
            showToast("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Mật khẩu.", "error");
            return;
        }

        if (newUserForm.password !== newUserForm.confirmPassword) {
            showToast("Mật khẩu xác nhận không khớp.", "error");
            return;
        }

        if (newUserForm.password.length < 6) {
            showToast("Mật khẩu phải có ít nhất 6 ký tự.", "error");
            return;
        }

        setIsSubmittingCreate(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: newUserForm.fullName.trim(),
                    phone: newUserForm.phone.trim(),
                    email: newUserForm.email.trim() || undefined,
                    password: newUserForm.password,
                    role: "FARMER",
                    status: "APPROVED",
                }),
            });
            const payload = await res.json();
            if (payload.success) {
                showToast(`Đã tạo tài khoản "${payload.data.fullName}" thành công.`);
                setCreateModalOpen(false);
                await loadUsers();
            } else {
                showToast(payload.message || "Không thể tạo tài khoản.", "error");
            }
        } catch {
            showToast("Lỗi khi gửi yêu cầu tạo tài khoản.", "error");
        } finally {
            setIsSubmittingCreate(false);
        }
    };

    // 8. THAO TÁC CHỈNH SỬA THÔNG TIN TÀI KHOẢN
    const handleOpenEditModal = (user: AdminUser) => {
        setUserToEdit(user);
        setEditForm({
            fullName: user.fullName || "",
            phone: user.phone || "",
            email: user.email || "",
            role: user.role || "FARMER",
            organization: user.registrationName || "",
            address: user.address || "",
            province: user.province || "",
            district: user.district || "",
            ward: user.ward || "",
        });
        setEditModalOpen(true);
    };

    const handleSaveEditUser = async () => {
        if (!userToEdit) return;
        if (!editForm.fullName.trim() || !editForm.phone.trim()) {
            showToast("Họ tên và Số điện thoại là bắt buộc.", "error");
            return;
        }

        setIsSubmittingEdit(true);
        try {
            const res = await fetch(`/api/admin/users/${userToEdit.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: editForm.fullName.trim(),
                    phone: editForm.phone.trim(),
                    email: editForm.email.trim() || null,
                    role: editForm.role,
                    registrationName: editForm.organization.trim() || null,
                    address: editForm.address.trim() || null,
                    province: editForm.province.trim() || null,
                    district: editForm.district.trim() || null,
                    ward: editForm.ward.trim() || null,
                }),
            });
            const payload = await res.json();
            if (payload.success) {
                showToast("Cập nhật thông tin tài khoản thành công.");
                setEditModalOpen(false);
                await loadUsers();
            } else {
                showToast(payload.message || "Không thể cập nhật.", "error");
            }
        } catch {
            showToast("Lỗi khi cập nhật tài khoản.", "error");
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    // 10. THAO TÁC ĐẶT LẠI MẬT KHẨU
    const handleOpenResetPwd = (user: AdminUser) => {
        setUserToResetPwd(user);
        setNewPasswordInput("");
        setResetPwdModalOpen(true);
    };

    const handleSaveResetPwd = async () => {
        if (!userToResetPwd) return;
        if (!newPasswordInput || newPasswordInput.length < 6) {
            showToast("Mật khẩu mới phải từ 6 ký tự trở lên.", "error");
            return;
        }

        setIsSubmittingResetPwd(true);
        try {
            const res = await fetch(`/api/admin/users/${userToResetPwd.id}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword: newPasswordInput }),
            });
            const payload = await res.json();
            if (payload.success) {
                showToast("Đặt lại mật khẩu thành công.");
                setResetPwdModalOpen(false);
            } else {
                showToast(payload.message || "Không thể đặt lại mật khẩu.", "error");
            }
        } catch {
            showToast("Lỗi khi đặt lại mật khẩu.", "error");
        } finally {
            setIsSubmittingResetPwd(false);
        }
    };

    // 11. THAO TÁC XÓA TÀI KHOẢN
    const handleOpenDelete = (user: AdminUser) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsSubmittingDelete(true);
        try {
            const res = await fetch(`/api/admin/users/${userToDelete.id}`, { method: "DELETE" });
            const payload = await res.json();
            if (payload.success) {
                showToast(payload.message || "Đã xóa tài khoản.");
                setDeleteModalOpen(false);
                await loadUsers();
            } else {
                showToast(payload.message || "Không thể xóa tài khoản.", "error");
            }
        } catch {
            showToast("Lỗi khi xóa tài khoản.", "error");
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    // Helper render trạng thái
    const renderStatusBadge = (user: AdminUser) => {
        if (user.isLocked) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                    <Lock className="h-3 w-3" />
                    Đã khóa
                </span>
            );
        }

        switch (user.accountStatus) {
            case "PENDING":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="h-3 w-3" />
                        Chờ duyệt
                    </span>
                );
            case "NEEDS_SUPPLEMENT":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                        <AlertTriangle className="h-3 w-3" />
                        Cần bổ sung
                    </span>
                );
            case "APPROVED":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Đang hoạt động
                    </span>
                );
            case "REJECTED":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <XCircle className="h-3 w-3" />
                        Bị từ chối
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {user.accountStatus}
                    </span>
                );
        }
    };

    return (
        <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 sm:px-6">
            {/* TOAST THÔNG BÁO */}
            {toastMessage && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium transition-all ${
                        toastMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : "bg-rose-50 text-rose-900 border-rose-200"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* HEADER TRANG */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Quản trị hệ thống · Tài khoản</p>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">Quản lý tài khoản</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý người dùng, trạng thái phê duyệt hồ sơ và phân bổ vai trò trong toàn hệ thống.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleOpenCreateModal}
                        className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm gap-2 shadow-sm h-11 px-4 transition-all"
                    >
                        <UserPlus className="h-4 w-4" />
                        Tạo tài khoản mới
                    </Button>
                </div>
            </header>

            {/* 4 THẺ KPI PHÍA TRÊN (THIẾT KẾ NHỎ GỌN) */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition hover:shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Tổng tài khoản</span>
                        <div className="rounded-lg p-1.5 bg-blue-50 text-blue-700">
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="mt-1 text-xl font-black text-slate-900">
                        {kpis.totalAccounts.toLocaleString("vi-VN")}
                    </p>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/20 p-3 shadow-xs transition hover:shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-amber-800">Chờ duyệt</span>
                        <div className="rounded-lg p-1.5 bg-amber-100/80 text-amber-700">
                            <Clock className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="mt-1 text-xl font-black text-amber-700">
                        {kpis.pendingCount.toLocaleString("vi-VN")}
                    </p>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/20 p-3 shadow-xs transition hover:shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-emerald-800">Đang hoạt động</span>
                        <div className="rounded-lg p-1.5 bg-emerald-100/80 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="mt-1 text-xl font-black text-emerald-700">
                        {kpis.activeCount.toLocaleString("vi-VN")}
                    </p>
                </div>

                <div className="rounded-xl border border-rose-200/80 bg-rose-50/20 p-3 shadow-xs transition hover:shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-rose-800">Đã khóa</span>
                        <div className="rounded-lg p-1.5 bg-rose-100/80 text-rose-700">
                            <Lock className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="mt-1 text-xl font-black text-rose-700">
                        {kpis.lockedCount.toLocaleString("vi-VN")}
                    </p>
                </div>
            </section>

            {/* BỘ LỌC & TÌM KIẾM */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                {/* 4 Tabs trạng thái */}
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => handleTabChange("all")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === "all"
                                ? "bg-brand-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                    >
                        Tất cả ({kpis.totalAccounts})
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("PENDING")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            activeTab === "PENDING"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-amber-700 hover:bg-amber-50"
                        }`}
                    >
                        <span>Chờ duyệt</span>
                        {kpis.pendingCount > 0 && (
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    activeTab === "PENDING" ? "bg-white text-amber-700" : "bg-amber-100 text-amber-800"
                                }`}
                            >
                                {kpis.pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("ACTIVE")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === "ACTIVE"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-emerald-700 hover:bg-emerald-50"
                        }`}
                    >
                        Đang hoạt động ({kpis.activeCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("LOCKED")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === "LOCKED"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-rose-700 hover:bg-rose-50"
                        }`}
                    >
                        Đã khóa ({kpis.lockedCount})
                    </button>
                </div>

                {/* Các bộ lọc dropdown & input */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8 relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Tìm kiếm theo họ tên, số điện thoại hoặc email..."
                            className="pl-9 h-10 rounded-xl text-xs bg-white border-slate-200 focus-visible:ring-brand-500"
                        />
                    </div>

                    <div className="sm:col-span-4">
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="all">-- Lọc theo vai trò (Role) --</option>
                            {rolesList.map((r) => (
                                <option key={r.key} value={r.key}>
                                    {r.name} ({r.key})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {/* BẢNG TÀI KHOẢN */}
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-brand-600 animate-spin mb-3" />
                        <p className="text-xs text-slate-500 font-medium">Đang tải dữ liệu tài khoản...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">Không tìm thấy tài khoản nào</p>
                        <p className="text-xs text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Người dùng</th>
                                    <th className="py-3.5 px-3">Tài khoản</th>
                                    <th className="py-3.5 px-3">Vai trò</th>
                                    <th className="py-3.5 px-3">Trạng thái</th>
                                    <th className="py-3.5 px-3">Ngày tạo</th>
                                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => {
                                    const roleBadge = roleLabels[u.role] || {
                                        label: u.role,
                                        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
                                    };

                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Người dùng: Avatar + Họ tên */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
                                                        {(u.fullName || u.phone).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                                                            {u.fullName || "Chưa đặt tên"}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                                            {u.email || u.phone}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tài khoản: SĐT / Username */}
                                            <td className="py-3 px-3 font-mono font-medium text-slate-700">{u.phone}</td>

                                            {/* Vai trò (Role) - Không dùng badge, hiển thị text thuần */}
                                            <td className="py-3 px-3">
                                                <span className="font-semibold text-slate-800 text-xs">
                                                    {roleBadge.label}
                                                </span>
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="py-3 px-3 whitespace-nowrap">{renderStatusBadge(u)}</td>

                                            {/* Ngày tạo */}
                                            <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500">
                                                {formatVietnameseDate(u.createdAt)}
                                            </td>

                                            {/* Thao tác (đã xóa thao tác gán vai trò) */}
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Nút Xem hồ sơ & duyệt nếu là PENDING */}
                                                    {(u.accountStatus === "PENDING" ||
                                                        u.accountStatus === "NEEDS_SUPPLEMENT") && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setUserToReview(u);
                                                                setReviewReasonInput("");
                                                                setApprovalModalOpen(true);
                                                            }}
                                                            className="h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold gap-1"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            Xem hồ sơ
                                                        </Button>
                                                    )}

                                                    {/* Xem hồ sơ thường */}
                                                    {u.accountStatus !== "PENDING" &&
                                                        u.accountStatus !== "NEEDS_SUPPLEMENT" && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setUserToReview(u);
                                                                    setApprovalModalOpen(true);
                                                                }}
                                                                className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                                                title="Xem chi tiết hồ sơ"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}

                                                    {/* Sửa thông tin */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenEditModal(u)}
                                                        className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                                        title="Chỉnh sửa thông tin"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>

                                                    {/* Đặt lại mật khẩu */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenResetPwd(u)}
                                                        className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                                        title="Đặt lại mật khẩu"
                                                    >
                                                        <KeyRound className="h-3.5 w-3.5" />
                                                    </Button>

                                                    {/* Khóa / Mở khóa */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleToggleLock(u)}
                                                        className={`h-7 w-7 p-0 rounded-lg ${
                                                            u.isLocked
                                                                ? "text-emerald-600 hover:bg-emerald-50"
                                                                : "text-amber-600 hover:bg-amber-50"
                                                        }`}
                                                        title={u.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                                                    >
                                                        {u.isLocked ? (
                                                            <Unlock className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Lock className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>

                                                    {/* Xóa tài khoản */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenDelete(u)}
                                                        className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:bg-rose-50"
                                                        title="Xóa tài khoản"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Phân trang */}
                {pagination.totalPages > 1 && (
                    <div className="p-3 border-t bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
                        <div>
                            Hiển thị {(page - 1) * pagination.pageSize + 1} -{" "}
                            {Math.min(page * pagination.pageSize, pagination.totalItems)} trong tổng số{" "}
                            <strong>{pagination.totalItems}</strong> tài khoản
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="h-7 px-2 text-xs"
                            >
                                Trước
                            </Button>
                            <span className="px-2 font-medium">
                                Trang {page} / {pagination.totalPages}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={page >= pagination.totalPages}
                                className="h-7 px-2 text-xs"
                            >
                                Sau
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            {/* MODAL 1: TẠO TÀI KHOẢN MỚI */}
            {createModalOpen && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[28px] bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                    <UserPlus className="h-5 w-5 text-brand-600" />
                                    Tạo tài khoản mới
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Admin khởi tạo tài khoản người dùng trực tiếp
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="py-4 space-y-4 text-xs">
                            {/* PHẦN 1: THÔNG TIN NGƯỜI DÙNG */}
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-1">
                                    Thông tin người dùng
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Họ và tên *</Label>
                                    <Input
                                        value={newUserForm.fullName}
                                        onChange={(e) =>
                                            setNewUserForm({ ...newUserForm, fullName: e.target.value })
                                        }
                                        placeholder="Nguyễn Văn A"
                                        className="h-10 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Số điện thoại *</Label>
                                    <Input
                                        value={newUserForm.phone}
                                        onChange={(e) =>
                                            setNewUserForm({ ...newUserForm, phone: e.target.value })
                                        }
                                        placeholder="0912345678"
                                        className="h-10 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Email</Label>
                                    <Input
                                        type="email"
                                        value={newUserForm.email}
                                        onChange={(e) =>
                                            setNewUserForm({ ...newUserForm, email: e.target.value })
                                        }
                                        placeholder="nguyenvana@gmail.com (không bắt buộc)"
                                        className="h-10 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                    />
                                </div>
                            </div>

                            {/* PHẦN 2: THÔNG TIN ĐĂNG NHẬP & MẬT KHẨU */}
                            <div className="space-y-3 pt-2">
                                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-1">
                                    Thông tin đăng nhập & Mật khẩu
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
                                    Tài khoản đăng nhập: <strong className="text-slate-900 font-mono">{newUserForm.phone || "Số điện thoại"}</strong>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Mật khẩu *</Label>
                                    <Input
                                        type="password"
                                        value={newUserForm.password}
                                        onChange={(e) =>
                                            setNewUserForm({ ...newUserForm, password: e.target.value })
                                        }
                                        placeholder="Tối thiểu 6 ký tự"
                                        className="h-10 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu *</Label>
                                    <Input
                                        type="password"
                                        value={newUserForm.confirmPassword}
                                        onChange={(e) =>
                                            setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })
                                        }
                                        placeholder="Nhập lại mật khẩu"
                                        className="h-10 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setCreateModalOpen(false)}
                                disabled={isSubmittingCreate}
                                className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs h-10 px-4"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateUser}
                                disabled={isSubmittingCreate}
                                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs gap-1.5 shadow-sm h-10 px-4 transition-all"
                            >
                                {isSubmittingCreate ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Check className="h-3.5 w-3.5" />
                                )}
                                Tạo tài khoản
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: XEM HỒ SƠ & PHÊ DUYỆT (APPROVAL DETAIL) */}
            {approvalModalOpen && userToReview && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-[28px] bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-brand-600" />
                                    Hồ sơ đăng ký tài khoản
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Chi tiết hồ sơ, thông tin đơn vị và quyết định phê duyệt
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setApprovalModalOpen(false)}
                                className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="py-4 space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
                            {/* Trạng thái hiện tại */}
                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                                <span className="font-semibold text-slate-700">Trạng thái hồ sơ:</span>
                                {renderStatusBadge(userToReview)}
                            </div>

                            {/* Thông tin người dùng */}
                            <div className="space-y-2">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                                    Thông tin người dùng
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-slate-500">Họ và tên:</span>
                                        <div className="font-semibold text-slate-900">
                                            {userToReview.fullName || "Chưa cung cấp"}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Số điện thoại:</span>
                                        <div className="font-semibold text-slate-900">{userToReview.phone}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Email:</span>
                                        <div className="font-semibold text-slate-900">
                                            {userToReview.email || "Chưa cung cấp"}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Vai trò đăng ký:</span>
                                        <div className="font-semibold text-emerald-700">
                                            {userTypeLabels[userToReview.role] || userToReview.role}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-500">Địa chỉ liên hệ:</span>
                                        <div className="font-semibold text-slate-900">
                                            {[userToReview.address, userToReview.ward, userToReview.district, userToReview.province]
                                                .filter(Boolean)
                                                .join(", ") || "Chưa cung cấp"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin đơn vị / Vườn / Cơ sở */}
                            <div className="space-y-2 pt-2">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                                    Thông tin đơn vị / Vườn trồng
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <span className="text-slate-500">Tên đơn vị / Cơ sở / Vườn:</span>
                                        <div className="font-semibold text-slate-900">
                                            {userToReview.registrationName ||
                                                userToReview.partnerFacility?.name ||
                                                userToReview.stores?.[0]?.name ||
                                                "Chưa cập nhật"}
                                        </div>
                                    </div>

                                    {/* Nếu có dữ liệu vườn sầu riêng (Farmer) */}
                                    {userToReview.role === "FARMER" && (
                                        <>
                                            <div>
                                                <span className="text-slate-500">Diện tích canh tác:</span>
                                                <div className="font-semibold text-slate-900">
                                                    {userToReview.registeredAreaSize ||
                                                        userToReview.farms?.[0]?.areaSize ||
                                                        "-"} (ha)
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Tổng số cây:</span>
                                                <div className="font-semibold text-slate-900">
                                                    {userToReview.registeredTotalTrees ||
                                                        userToReview.farms?.[0]?.totalTrees ||
                                                        "-"} cây
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Giống sầu riêng:</span>
                                                <div className="font-semibold text-slate-900">
                                                    {userToReview.registeredDurianVariety ||
                                                        userToReview.farms?.[0]?.durianVariety ||
                                                        "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Vùng trồng liên kết:</span>
                                                <div className="font-semibold text-slate-900">
                                                    {userToReview.farms?.[0]?.region?.name || "Chưa gán vùng"}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Lịch sử xử lý phê duyệt trước đó */}
                            {userToReview.approvalHistories && userToReview.approvalHistories.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                                        Lịch sử xử lý hồ sơ
                                    </div>
                                    <div className="space-y-1.5">
                                        {userToReview.approvalHistories.map((hist) => (
                                            <div
                                                key={hist.id}
                                                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-start justify-between gap-2"
                                            >
                                                <div>
                                                    <span className="font-semibold text-slate-800">
                                                        {hist.action === "APPROVE"
                                                            ? "Phê duyệt kích hoạt"
                                                            : hist.action === "REJECT"
                                                            ? "Từ chối hồ sơ"
                                                            : "Yêu cầu bổ sung"}
                                                    </span>
                                                    {hist.reason && (
                                                        <div className="text-slate-600 italic mt-0.5">"{hist.reason}"</div>
                                                    )}
                                                </div>
                                                <div className="text-right text-slate-400 shrink-0">
                                                    {formatVietnameseDate(hist.createdAt)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ô nhập ghi chú / lý do xử lý */}
                            {(userToReview.accountStatus === "PENDING" ||
                                userToReview.accountStatus === "NEEDS_SUPPLEMENT") && (
                                <div className="space-y-1.5 pt-2">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Nội dung xử lý / Ghi chú / Lý do (nếu yêu cầu bổ sung hoặc từ chối)
                                    </Label>
                                    <textarea
                                        value={reviewReasonInput}
                                        onChange={(e) => setReviewReasonInput(e.target.value)}
                                        placeholder="Ví dụ: Vui lòng bổ sung giấy chứng nhận VietGAP hoặc giấy phép kinh doanh..."
                                        rows={2}
                                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Các nút hành động dứt khoát */}
                        <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setApprovalModalOpen(false)}
                                disabled={isSubmittingApproval}
                                className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs h-9 px-4"
                            >
                                Đóng
                            </Button>

                            {(userToReview.accountStatus === "PENDING" ||
                                userToReview.accountStatus === "NEEDS_SUPPLEMENT") && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRequestSupplement(userToReview.id, reviewReasonInput)}
                                        disabled={isSubmittingApproval}
                                        className="rounded-xl text-xs font-semibold text-orange-700 border-orange-200 hover:bg-orange-50 h-9 px-3.5"
                                    >
                                        Yêu cầu bổ sung
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRejectUser(userToReview.id, reviewReasonInput)}
                                        disabled={isSubmittingApproval}
                                        className="rounded-xl text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 h-9 px-3.5"
                                    >
                                        Từ chối
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleApproveUser(userToReview.id, reviewReasonInput)}
                                        disabled={isSubmittingApproval}
                                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1 shadow-sm h-9 px-4"
                                    >
                                        {isSubmittingApproval ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                        Phê duyệt tài khoản
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: CHỈNH SỬA THÔNG TIN */}
            {editModalOpen && userToEdit && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[28px] bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                <Edit3 className="h-5 w-5 text-brand-600" />
                                Chỉnh sửa thông tin
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 py-4 text-xs">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Họ và tên *</Label>
                                <Input
                                    value={editForm.fullName}
                                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                    className="h-9 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Số điện thoại *</Label>
                                <Input
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="h-9 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Email</Label>
                                <Input
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="h-9 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Vai trò (Role) *</Label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                >
                                    {rolesList.map((r) => (
                                        <option key={r.key} value={r.key}>
                                            {r.name} ({r.key})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Đơn vị / Cơ sở</Label>
                                <Input
                                    value={editForm.organization}
                                    onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                                    className="h-9 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Địa chỉ</Label>
                                <Input
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    className="h-9 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditModalOpen(false)}
                                disabled={isSubmittingEdit}
                                className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs h-9 px-4"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveEditUser}
                                disabled={isSubmittingEdit}
                                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs gap-1.5 shadow-sm h-9 px-4"
                            >
                                {isSubmittingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 5: ĐẶT LẠI MẬT KHẨU */}
            {resetPwdModalOpen && userToResetPwd && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-[28px] bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                <KeyRound className="h-5 w-5 text-brand-600" />
                                Đặt lại mật khẩu
                            </h3>
                            <button
                                type="button"
                                onClick={() => setResetPwdModalOpen(false)}
                                className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 py-4 text-xs">
                            <p className="text-slate-600 leading-relaxed">
                                Đặt lại mật khẩu mới cho tài khoản{" "}
                                <strong>{userToResetPwd.fullName || userToResetPwd.phone}</strong>.
                            </p>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Mật khẩu mới *</Label>
                                <Input
                                    type="password"
                                    value={newPasswordInput}
                                    onChange={(e) => setNewPasswordInput(e.target.value)}
                                    placeholder="Tối thiểu 6 ký tự"
                                    className="h-9 rounded-xl text-xs border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setResetPwdModalOpen(false)}
                                disabled={isSubmittingResetPwd}
                                className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs h-9 px-4"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveResetPwd}
                                disabled={isSubmittingResetPwd}
                                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs gap-1.5 shadow-sm h-9 px-4"
                            >
                                {isSubmittingResetPwd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                                Cập nhật mật khẩu
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 6: XÁC NHẬN XÓA TÀI KHOẢN */}
            {deleteModalOpen && userToDelete && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-[28px] bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="p-2 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa tài khoản</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Bạn có chắc chắn muốn xóa tài khoản{" "}
                                <strong>{userToDelete.fullName || userToDelete.phone}</strong>?
                            </p>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={isSubmittingDelete}
                                className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs h-9 px-4"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleConfirmDelete}
                                disabled={isSubmittingDelete}
                                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shadow-sm h-9 px-4"
                            >
                                {isSubmittingDelete ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Xóa tài khoản
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
