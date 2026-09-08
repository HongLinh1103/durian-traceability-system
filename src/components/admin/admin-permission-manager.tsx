"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
    ArrowLeft,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Loader2,
    RotateCcw,
    Save,
    Search,
    ShieldCheck,
    LayoutDashboard,
    Sprout,
    Wheat,
    Handshake,
    Boxes,
    Factory,
    Truck,
    QrCode,
    Package,
    Store,
    CircleDollarSign,
    MapPin,
    Users,
    UserCheck,
    Layers,
    BookOpen,
    CheckSquare,
    Square,
    MinusSquare,
    Phone,
    BadgeCheck,
    Plus,
    Trash2,
    UserPlus,
    AlertCircle,
    X,
    Building2,
    Info,
    SlidersHorizontal,
    Sparkles,
    Bell
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    PERMISSION_MODULES,
    getAllSystemPermissionKeys,
    ROLE_TARGET_GROUPS,
    ModuleDef,
    FeatureDef,
    RoleItem,
    RoleAssignedUser,
} from "@/lib/permissions-data";

// Ánh xạ icon cho từng module
function getModuleIcon(iconName: string) {
    switch (iconName) {
        case "LayoutDashboard":
            return <LayoutDashboard className="h-5 w-5 text-indigo-600" />;
        case "Sprout":
            return <Sprout className="h-5 w-5 text-emerald-600" />;
        case "Wheat":
            return <Wheat className="h-5 w-5 text-amber-600" />;
        case "Handshake":
            return <Handshake className="h-5 w-5 text-orange-600" />;
        case "Boxes":
            return <Boxes className="h-5 w-5 text-blue-600" />;
        case "Factory":
            return <Factory className="h-5 w-5 text-purple-600" />;
        case "Truck":
            return <Truck className="h-5 w-5 text-teal-600" />;
        case "QrCode":
            return <QrCode className="h-5 w-5 text-rose-600" />;
        case "Package":
            return <Package className="h-5 w-5 text-amber-700" />;
        case "Store":
            return <Store className="h-5 w-5 text-emerald-700" />;
        case "CircleDollarSign":
            return <CircleDollarSign className="h-5 w-5 text-green-600" />;
        case "MapPin":
            return <MapPin className="h-5 w-5 text-red-600" />;
        case "Users":
            return <Users className="h-5 w-5 text-cyan-600" />;
        case "UserCheck":
            return <UserCheck className="h-5 w-5 text-blue-700" />;
        case "ShieldCheck":
            return <ShieldCheck className="h-5 w-5 text-violet-600" />;
        case "Layers":
            return <Layers className="h-5 w-5 text-yellow-600" />;
        case "BookOpen":
            return <BookOpen className="h-5 w-5 text-sky-600" />;
        case "Bell":
            return <Bell className="h-5 w-5 text-amber-500" />;
        default:
            return <ShieldCheck className="h-5 w-5 text-slate-600" />;
    }
}

async function readJsonResponse(response: Response) {
    const text = await response.text();
    if (!text.trim()) throw new Error(`Máy chủ không trả về dữ liệu (HTTP ${response.status}).`);
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Phản hồi từ máy chủ không hợp lệ (HTTP ${response.status}).`);
    }
}

export function AdminPermissionManager() {
    const router = useRouter();

    // Dữ liệu chính
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [allUsers, setAllUsers] = useState<RoleAssignedUser[]>([]);
    const [selectedRoleKey, setSelectedRoleKey] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"info" | "permissions" | "accounts">("permissions");

    // Phân quyền đang thao tác (working copy)
    const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);

    // Form thông tin Role (working copy cho tab Info)
    const [roleInfoForm, setRoleInfoForm] = useState<{
        name: string;
        description: string;
        targetGroup: string;
        status: "ACTIVE" | "INACTIVE";
    }>({
        name: "",
        description: "",
        targetGroup: "Cơ sở chế biến",
        status: "ACTIVE",
    });

    // Tìm kiếm & Bộ lọc
    const [searchRoleQuery, setSearchRoleQuery] = useState("");
    const [searchFeatureQuery, setSearchFeatureQuery] = useState("");
    const [searchAccountQuery, setSearchAccountQuery] = useState("");
    const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

    // Modals & States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedUserIdsToAssign, setSelectedUserIdsToAssign] = useState<string[]>([]);
    const [assignModalSearch, setAssignModalSearch] = useState("");

    const [newRoleForm, setNewRoleForm] = useState({
        roleName: "",
        roleKey: "",
        roleDescription: "",
        targetGroup: "Cơ sở chế biến",
        copyFromRole: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Lấy toàn bộ keys của hệ thống
    const allSystemKeys = useMemo(() => getAllSystemPermissionKeys(), []);

    // Tải dữ liệu từ API
    const loadData = useCallback(async (preferredKey?: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/permissions", { cache: "no-store" });
            const json = await readJsonResponse(res);
            if (!res.ok || !json.success) {
                throw new Error(json.message || "Không thể tải danh mục phân quyền.");
            }

            const rolesList: RoleItem[] = json.data?.roles || [];
            const usersList: RoleAssignedUser[] = json.data?.users || [];
            setRoles(rolesList);
            setAllUsers(usersList);

            // Chọn vai trò mặc định
            const targetKey =
                preferredKey ||
                selectedRoleKey ||
                (rolesList.some((r) => r.key === "PROCESSING_STAFF") ? "PROCESSING_STAFF" : rolesList[0]?.key || "");

            if (targetKey) {
                const targetRole = rolesList.find((r) => r.key === targetKey) || rolesList[0];
                if (targetRole) {
                    setSelectedRoleKey(targetRole.key);
                    setCurrentPermissions([...targetRole.permissions]);
                    setRoleInfoForm({
                        name: targetRole.name,
                        description: targetRole.description,
                        targetGroup: targetRole.targetGroup,
                        status: targetRole.status,
                    });
                }
            }
        } catch (error: any) {
            setMessage({
                text: error?.message || "Có lỗi xảy ra khi kết nối máy chủ.",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    }, [selectedRoleKey]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // Vai trò đang được chọn
    const selectedRole = useMemo(() => {
        return roles.find((r) => r.key === selectedRoleKey);
    }, [roles, selectedRoleKey]);

    // Đếm số thay đổi chưa lưu giữa working copy và saved permissions
    const unsavedChangesCount = useMemo(() => {
        if (!selectedRole) return 0;
        const origSet = new Set(selectedRole.permissions);
        const currSet = new Set(currentPermissions);
        let diff = 0;
        for (const p of currSet) {
            if (!origSet.has(p)) diff++;
        }
        for (const p of origSet) {
            if (!currSet.has(p)) diff++;
        }
        return diff;
    }, [selectedRole, currentPermissions]);

    const hasUnsavedChanges = unsavedChangesCount > 0;

    // Chọn Role khác từ Sidebar
    function handleSelectRole(key: string) {
        if (key === selectedRoleKey) return;

        if (hasUnsavedChanges) {
            if (!window.confirm("Bạn có các thay đổi quyền chưa lưu cho vai trò hiện tại. Bạn có muốn chuyển sang vai trò khác và hủy thay đổi này không?")) {
                return;
            }
        }

        setSelectedRoleKey(key);
        setMessage(null);
        const target = roles.find((r) => r.key === key);
        if (target) {
            setCurrentPermissions([...target.permissions]);
            setRoleInfoForm({
                name: target.name,
                description: target.description,
                targetGroup: target.targetGroup,
                status: target.status,
            });
        }
    }

    // Toggle một permission key đơn lẻ
    function togglePermission(key: string) {
        setCurrentPermissions((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    }

    // Toggle tất cả các actions của 1 Feature
    function toggleFeature(feature: FeatureDef) {
        const featureKeys = Object.values(feature.actions)
            .map((act) => act?.key)
            .filter((k): k is string => Boolean(k));
        if (featureKeys.length === 0) return;

        const allActive = featureKeys.every((k) => currentPermissions.includes(k));
        if (allActive) {
            setCurrentPermissions((prev) => prev.filter((k) => !featureKeys.includes(k)));
        } else {
            setCurrentPermissions((prev) => Array.from(new Set([...prev, ...featureKeys])));
        }
    }

    // Toggle tất cả các actions của 1 Module
    function toggleModule(mod: ModuleDef) {
        const moduleKeys: string[] = [];
        for (const feat of mod.features) {
            for (const act of Object.values(feat.actions)) {
                if (act?.key) moduleKeys.push(act.key);
            }
        }
        if (moduleKeys.length === 0) return;

        const allActive = moduleKeys.every((k) => currentPermissions.includes(k));
        if (allActive) {
            setCurrentPermissions((prev) => prev.filter((k) => !moduleKeys.includes(k)));
        } else {
            setCurrentPermissions((prev) => Array.from(new Set([...prev, ...moduleKeys])));
        }
    }

    // Khôi phục quyền về mặc định của Role
    async function handleResetToDefault() {
        if (!selectedRole) return;
        if (!window.confirm(`Khôi phục toàn bộ quyền của vai trò "${selectedRole.name}" về giá trị mặc định của hệ thống?`)) {
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/permissions/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roleKey: selectedRole.key }),
            });
            const json = await readJsonResponse(res);
            if (!res.ok || !json.success) throw new Error(json.message || "Lỗi khi khôi phục quyền mặc định.");

            const newPerms = json.data?.permissions || [];
            setCurrentPermissions([...newPerms]);
            setMessage({
                text: json.message || `Đã khôi phục quyền mặc định của vai trò ${selectedRole.name}.`,
                type: "success",
            });
            await loadData(selectedRole.key);
        } catch (err: any) {
            setMessage({ text: err?.message || "Lỗi khi khôi phục quyền.", type: "error" });
        } finally {
            setSaving(false);
        }
    }

    // Hủy thay đổi chưa lưu
    function handleDiscardChanges() {
        if (!selectedRole) return;
        setCurrentPermissions([...selectedRole.permissions]);
        setMessage({ text: "Đã hủy các thay đổi quyền chưa lưu.", type: "success" });
    }

    // Lưu phân quyền Role
    async function handleSavePermissions() {
        if (!selectedRole) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roleKey: selectedRole.key,
                    permissions: currentPermissions,
                }),
            });
            const json = await readJsonResponse(res);
            if (!res.ok || !json.success) throw new Error(json.message || "Lỗi khi lưu phân quyền.");

            setMessage({
                text: json.message || `Đã lưu thành công phân quyền cho vai trò "${selectedRole.name}".`,
                type: "success",
            });
            await loadData(selectedRole.key);
        } catch (err: any) {
            setMessage({ text: err?.message || "Lỗi khi lưu quyền.", type: "error" });
        } finally {
            setSaving(false);
        }
    }

    // Lưu thông tin Role (Tab Thông tin)
    async function handleSaveRoleInfo(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedRole) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update_role_info",
                    roleKey: selectedRole.key,
                    roleName: roleInfoForm.name,
                    roleDescription: roleInfoForm.description,
                    targetGroup: roleInfoForm.targetGroup,
                    status: roleInfoForm.status,
                }),
            });
            const json = await readJsonResponse(res);
            if (!res.ok || !json.success) throw new Error(json.message || "Lỗi khi cập nhật thông tin vai trò.");

            setMessage({ text: "Đã cập nhật thông tin vai trò thành công!", type: "success" });
            await loadData(selectedRole.key);
        } catch (err: any) {
            setMessage({ text: err?.message || "Lỗi khi lưu thông tin vai trò.", type: "error" });
        } finally {
            setSaving(false);
        }
    }

    // Xóa Role tùy chỉnh
    async function handleDeleteRole() {
        if (!selectedRole || selectedRole.isSystem) return;
        if (!window.confirm(`Bạn có chắc chắn muốn xóa vai trò tùy chỉnh "${selectedRole.name}" (${selectedRole.key})? Hành động này không thể hoàn tác.`)) {
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/permissions?roleKey=${encodeURIComponent(selectedRole.key)}`, {
                method: "DELETE",
            });
            const json = await readJsonResponse(res);
            if (!res.ok || !json.success) throw new Error(json.message || "Lỗi khi xóa vai trò.");

            setMessage({ text: json.message || "Đã xóa vai trò thành công.", type: "success" });
            await loadData("ADMIN");
        } catch (err: any) {
            setMessage({ text: err?.message || "Lỗi khi xóa vai trò.", type: "error" });
        } finally {
            setSaving(false);
        }
    }

    // Gán tài khoản vào Role
    async function handleConfirmAssignUsers() {
        if (!selectedRole || selectedUserIdsToAssign.length === 0) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "assign_users",
                    roleKey: selectedRole.key,
                    userIds: selectedUserIdsToAssign,
                }),
            });
            const json = await readJsonResponse(res);
            if (!res.ok || !json.success) throw new Error(json.message || "Lỗi khi gán tài khoản.");

            setMessage({ text: `Đã gán thành công ${selectedUserIdsToAssign.length} tài khoản vào vai trò ${selectedRole.name}.`, type: "success" });
            setIsAssignModalOpen(false);
            setSelectedUserIdsToAssign([]);
            await loadData(selectedRole.key);
        } catch (err: any) {
            setMessage({ text: err?.message || "Lỗi khi gán tài khoản.", type: "error" });
        } finally {
            setSaving(false);
        }
    }

    // Gỡ tài khoản khỏi Role
    async function handleRemoveUser(user: RoleAssignedUser) {
        if (!selectedRole) return;
        if (!window.confirm(`Gỡ tài khoản ${user.fullName} (${user.phone}) khỏi vai trò ${selectedRole.name}?`)) {
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "remove_user",
                    roleKey: selectedRole.key,
                    userId: user.id,
                }),
            });
            const json = await readJsonResponse(res);
            if (!res.ok || !json.success) throw new Error(json.message || "Lỗi khi gỡ tài khoản.");

            setMessage({ text: `Đã gỡ tài khoản ${user.fullName} khỏi vai trò ${selectedRole.name}.`, type: "success" });
            await loadData(selectedRole.key);
        } catch (err: any) {
            setMessage({ text: err?.message || "Lỗi khi gỡ tài khoản.", type: "error" });
        } finally {
            setSaving(false);
        }
    }

    // Tạo Role mới từ Modal
    async function handleCreateRoleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!newRoleForm.roleName.trim()) {
            alert("Vui lòng nhập tên vai trò.");
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/permissions/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRoleForm),
            });
            const json = await readJsonResponse(res);
            if (!res.ok || !json.success) throw new Error(json.message || "Lỗi khi tạo vai trò mới.");

            const createdRoleKey = json.data?.key || json.data?.role?.key;
            setMessage({ text: `Đã tạo vai trò "${newRoleForm.roleName}" thành công!`, type: "success" });
            setIsCreateModalOpen(false);
            setNewRoleForm({
                roleName: "",
                roleKey: "",
                roleDescription: "",
                targetGroup: "Cơ sở chế biến",
                copyFromRole: "",
            });
            await loadData(createdRoleKey);
        } catch (err: any) {
            setMessage({ text: err?.message || "Lỗi khi tạo vai trò.", type: "error" });
        } finally {
            setSaving(false);
        }
    }

    // Điều khiển mở rộng / thu gọn tree
    function toggleCollapseModule(modId: string) {
        setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
    }

    const isAllExpanded = Object.keys(collapsedModules).length === 0;

    function handleToggleExpandAll() {
        if (isAllExpanded) {
            // Thu gọn tất cả
            const collapsed: Record<string, boolean> = {};
            for (const m of PERMISSION_MODULES) collapsed[m.id] = true;
            setCollapsedModules(collapsed);
        } else {
            // Mở rộng tất cả
            setCollapsedModules({});
        }
    }

    // Chọn tất cả / Bỏ chọn tất cả quyền
    const isAllPermissionsSelected = currentPermissions.length >= allSystemKeys.length;

    function handleToggleSelectAll() {
        if (isAllPermissionsSelected) {
            setCurrentPermissions([]);
        } else {
            setCurrentPermissions([...allSystemKeys]);
        }
    }

    // Lọc danh sách Roles ở Sidebar
    const filteredSystemRoles = useMemo(() => {
        const q = searchRoleQuery.trim().toLowerCase();
        return roles.filter((r) => r.isSystem && (!q || r.name.toLowerCase().includes(q) || r.key.toLowerCase().includes(q)));
    }, [roles, searchRoleQuery]);

    const filteredCustomRoles = useMemo(() => {
        const q = searchRoleQuery.trim().toLowerCase();
        return roles.filter((r) => !r.isSystem && (!q || r.name.toLowerCase().includes(q) || r.key.toLowerCase().includes(q)));
    }, [roles, searchRoleQuery]);

    // Lọc Module & Feature cho Tab Phân quyền
    const filteredTreeModules = useMemo(() => {
        const q = searchFeatureQuery.trim().toLowerCase();
        if (!q) return PERMISSION_MODULES;

        return PERMISSION_MODULES.filter((mod) => {
            const modMatch = mod.name.toLowerCase().includes(q) || mod.title.toLowerCase().includes(q);
            if (modMatch) return true;
            return mod.features.some((feat) => {
                const featMatch = feat.name.toLowerCase().includes(q) || feat.description.toLowerCase().includes(q) || feat.group?.toLowerCase().includes(q);
                const actMatch = Object.values(feat.actions).some(
                    (act) => act?.label.toLowerCase().includes(q) || act?.key.toLowerCase().includes(q)
                        || act?.routes.some((route) => `${route.method || ""} ${route.path} ${route.operation || ""}`.toLowerCase().includes(q))
                );
                return featMatch || actMatch;
            });
        }).map((mod) => {
            const matchedFeatures = mod.features.filter((feat) => {
                const featMatch = feat.name.toLowerCase().includes(q) || feat.description.toLowerCase().includes(q) || feat.group?.toLowerCase().includes(q);
                const actMatch = Object.values(feat.actions).some(
                    (act) => act?.label.toLowerCase().includes(q) || act?.key.toLowerCase().includes(q)
                        || act?.routes.some((route) => `${route.method || ""} ${route.path} ${route.operation || ""}`.toLowerCase().includes(q))
                );
                return featMatch || actMatch || mod.name.toLowerCase().includes(q);
            });
            return {
                ...mod,
                features: matchedFeatures.length > 0 ? matchedFeatures : mod.features,
            };
        });
    }, [searchFeatureQuery]);

    // Lọc tài khoản thuộc Role (Tab Tài khoản)
    const assignedAccounts = useMemo(() => {
        if (!selectedRole) return [];
        const q = searchAccountQuery.trim().toLowerCase();
        return selectedRole.assignedUsers.filter((u) => {
            if (!q) return true;
            return (
                u.fullName.toLowerCase().includes(q) ||
                u.phone.includes(q) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.organization && u.organization.toLowerCase().includes(q))
            );
        });
    }, [selectedRole, searchAccountQuery]);

    // Danh sách tài khoản có thể gán vào Role (chưa thuộc Role này)
    const assignableUsers = useMemo(() => {
        if (!selectedRole) return [];
        const assignedIds = new Set(selectedRole.assignedUsers.map((u) => u.id));
        const q = assignModalSearch.trim().toLowerCase();
        return allUsers.filter((u) => {
            if (assignedIds.has(u.id)) return false;
            if (!q) return true;
            return (
                u.fullName.toLowerCase().includes(q) ||
                u.phone.includes(q) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.organization && u.organization.toLowerCase().includes(q))
            );
        });
    }, [selectedRole, allUsers, assignModalSearch]);

    return (
        <div className="mx-auto max-w-[1536px] space-y-6 pb-24">
            {/* 1. Header Trang */}
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                        aria-label="Quay lại"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                Phân Quyền Hệ Thống
                            </h1>
                            <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800 border border-emerald-200">
                                Role-Centric
                            </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            Quản lý vai trò, quyền truy cập và tài khoản được gán.
                        </p>
                    </div>
                </div>

                {/* Quick Info tổng thể */}
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm text-right">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tổng số vai trò
                        </span>
                        <span className="text-lg font-black text-slate-800">
                            {roles.length} <span className="text-xs font-semibold text-slate-500">vai trò</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Thông báo Alert */}
            {message && (
                <div
                    className={`flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold shadow-sm transition ${
                        message.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {message.type === "success" ? (
                            <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        )}
                        <span>{message.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMessage(null)}
                        className="text-xs font-bold underline hover:opacity-80 ml-4"
                    >
                        Đóng
                    </button>
                </div>
            )}

            {/* Loading Spinner chính */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-28">
                    <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
                    <p className="mt-4 text-sm font-bold text-slate-600">Đang tải danh mục vai trò và phân quyền...</p>
                </div>
            )}

            {/* Bố cục Role-Centric 2 Cột (Sidebar Trái - Workspace Phải) */}
            {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* CỘT TRÁI: SIDEBAR DANH SÁCH VAI TRÒ */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-4">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                            {/* Tiêu đề sidebar & Nút tạo Role */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    Vai Trò
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-bold shadow-sm transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Tạo Role mới
                                </button>
                            </div>

                            {/* Ô tìm kiếm vai trò */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchRoleQuery}
                                    onChange={(e) => setSearchRoleQuery(e.target.value)}
                                    placeholder="Tìm vai trò..."
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-emerald-500 focus:bg-white"
                                />
                                {searchRoleQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchRoleQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Danh sách Roles cuộn */}
                            <div className="space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                                {/* NHÓM 1: ROLE HỆ THỐNG */}
                                <div>
                                    <div className="mb-2 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                        <span>Role Hệ Thống</span>
                                        <span className="text-[10px] font-bold text-slate-400">({filteredSystemRoles.length})</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {filteredSystemRoles.map((role) => {
                                            const isSelected = selectedRoleKey === role.key;
                                            return (
                                                <button
                                                    key={role.key}
                                                    type="button"
                                                    onClick={() => handleSelectRole(role.key)}
                                                    className={`w-full text-left rounded-2xl p-3 transition border relative group ${
                                                        isSelected
                                                            ? "border-emerald-600 bg-emerald-50/70 shadow-sm"
                                                            : "border-transparent bg-slate-50 hover:bg-slate-100/80 hover:border-slate-200"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`font-black text-sm truncate ${isSelected ? "text-emerald-900" : "text-slate-900"}`}>
                                                                    {role.name}
                                                                </span>
                                                            </div>
                                                            <div className="mt-0.5 text-[11px] font-semibold text-slate-400 truncate">
                                                                {role.key}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-xs font-black text-emerald-700">
                                                                {role.stats.totalGranted} <span className="text-[10px] font-semibold text-slate-400">quyền</span>
                                                            </div>
                                                            <div className="text-[11px] font-bold text-slate-500">
                                                                {role.stats.userCount} <span className="text-[10px] font-medium text-slate-400">TK</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-600" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                        {filteredSystemRoles.length === 0 && (
                                            <div className="text-xs text-slate-400 italic px-2 py-1">
                                                Không tìm thấy vai trò hệ thống nào.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* NHÓM 2: ROLE TÙY CHỈNH */}
                                <div>
                                    <div className="mb-2 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                        <span>Role Tùy Chỉnh</span>
                                        <span className="text-[10px] font-bold text-slate-400">({filteredCustomRoles.length})</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {filteredCustomRoles.map((role) => {
                                            const isSelected = selectedRoleKey === role.key;
                                            return (
                                                <button
                                                    key={role.key}
                                                    type="button"
                                                    onClick={() => handleSelectRole(role.key)}
                                                    className={`w-full text-left rounded-2xl p-3 transition border relative group ${
                                                        isSelected
                                                            ? "border-emerald-600 bg-emerald-50/70 shadow-sm"
                                                            : "border-transparent bg-slate-50 hover:bg-slate-100/80 hover:border-slate-200"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`font-black text-sm truncate ${isSelected ? "text-emerald-900" : "text-slate-900"}`}>
                                                                    {role.name}
                                                                </span>
                                                                <span className="rounded bg-indigo-100 px-1 py-0.2 text-[9px] font-bold text-indigo-700 shrink-0">
                                                                    Tùy chỉnh
                                                                </span>
                                                            </div>
                                                            <div className="mt-0.5 text-[11px] font-semibold text-slate-400 truncate">
                                                                {role.key}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-xs font-black text-emerald-700">
                                                                {role.stats.totalGranted} <span className="text-[10px] font-semibold text-slate-400">quyền</span>
                                                            </div>
                                                            <div className="text-[11px] font-bold text-slate-500">
                                                                {role.stats.userCount} <span className="text-[10px] font-medium text-slate-400">TK</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-600" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                        {filteredCustomRoles.length === 0 && (
                                            <div className="text-xs text-slate-400 italic px-2 py-2 text-center bg-slate-50 rounded-xl">
                                                Chưa có vai trò tùy chỉnh. Nhấn [+ Tạo Role mới] để tạo.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI: CHI TIẾT VAI TRÒ ĐƯỢC CHỌN (WORKSPACE) */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-5">
                        {selectedRole ? (
                            <>
                                {/* Header Vai trò được chọn */}
                                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                                    {selectedRole.name}
                                                </h2>
                                                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 border border-slate-200">
                                                    {selectedRole.key}
                                                </span>
                                                <span className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800 border border-purple-200">
                                                    {selectedRole.targetGroup}
                                                </span>
                                                <span
                                                    className={`rounded-md px-2.5 py-1 text-xs font-bold border ${
                                                        selectedRole.status === "ACTIVE"
                                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                            : "bg-slate-100 text-slate-600 border-slate-200"
                                                    }`}
                                                >
                                                    {selectedRole.status === "ACTIVE" ? "Đang sử dụng" : "Ngưng sử dụng"}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-500 max-w-2xl font-medium">
                                                {selectedRole.description || "Chưa có mô tả chi tiết cho vai trò này."}
                                            </p>
                                        </div>

                                        {/* Thống kê quyền & Tài khoản */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 px-4 py-2.5 text-center">
                                                <div className="text-xs font-bold text-emerald-800">Quyền cấp</div>
                                                <div className="text-xl font-black text-emerald-700">
                                                    {currentPermissions.length}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-blue-50 border border-blue-200/80 px-4 py-2.5 text-center">
                                                <div className="text-xs font-bold text-blue-800">Tài khoản gán</div>
                                                <div className="text-xl font-black text-blue-700">
                                                    {selectedRole.assignedUsers.length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3 Tab Điều hướng chính */}
                                    <div className="mt-6 flex items-center gap-2 border-b border-slate-100 pb-0">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("info")}
                                            className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition border-b-2 ${
                                                activeTab === "info"
                                                    ? "border-emerald-600 text-emerald-700"
                                                    : "border-transparent text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            <Info className="h-4 w-4" />
                                            Thông tin
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("permissions")}
                                            className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition border-b-2 ${
                                                activeTab === "permissions"
                                                    ? "border-emerald-600 text-emerald-700"
                                                    : "border-transparent text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            <SlidersHorizontal className="h-4 w-4" />
                                            Phân quyền
                                            <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                                                {currentPermissions.length}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("accounts")}
                                            className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition border-b-2 ${
                                                activeTab === "accounts"
                                                    ? "border-emerald-600 text-emerald-700"
                                                    : "border-transparent text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            <Users className="h-4 w-4" />
                                            Tài khoản
                                            <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-bold text-blue-800">
                                                {selectedRole.assignedUsers.length}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* TAB 1: THÔNG TIN ROLE */}
                                {activeTab === "info" && (
                                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <form onSubmit={handleSaveRoleInfo} className="space-y-6 max-w-2xl">
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                                                    Tên Role <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={roleInfoForm.name}
                                                    onChange={(e) => setRoleInfoForm((prev) => ({ ...prev, name: e.target.value }))}
                                                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                                                        Mã Role (Role Key)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        disabled
                                                        value={selectedRole.key}
                                                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-mono font-bold text-slate-500 outline-none cursor-not-allowed"
                                                    />
                                                    <p className="mt-1 text-[11px] text-slate-400 font-medium">
                                                        {selectedRole.isSystem ? "Mã vai trò hệ thống cố định" : "Mã định danh không thể thay đổi sau khi tạo"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                                                        Nhóm đối tượng
                                                    </label>
                                                    <select
                                                        value={roleInfoForm.targetGroup}
                                                        onChange={(e) => setRoleInfoForm((prev) => ({ ...prev, targetGroup: e.target.value }))}
                                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500"
                                                    >
                                                        {ROLE_TARGET_GROUPS.map((tg) => (
                                                            <option key={tg} value={tg}>
                                                                {tg}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                                                    Mô tả vai trò
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={roleInfoForm.description}
                                                    onChange={(e) => setRoleInfoForm((prev) => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Mô tả phạm vi trách nhiệm và công việc của vai trò..."
                                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                                                    Trạng thái hoạt động
                                                </label>
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                                                        <input
                                                            type="radio"
                                                            name="status"
                                                            value="ACTIVE"
                                                            checked={roleInfoForm.status === "ACTIVE"}
                                                            onChange={() => setRoleInfoForm((prev) => ({ ...prev, status: "ACTIVE" }))}
                                                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                        Đang sử dụng
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                                                        <input
                                                            type="radio"
                                                            name="status"
                                                            value="INACTIVE"
                                                            checked={roleInfoForm.status === "INACTIVE"}
                                                            onChange={() => setRoleInfoForm((prev) => ({ ...prev, status: "INACTIVE" }))}
                                                            className="h-4 w-4 text-slate-600 focus:ring-slate-500"
                                                        />
                                                        Ngưng sử dụng
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                                                {!selectedRole.isSystem ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleDeleteRole}
                                                        disabled={saving}
                                                        className="rounded-xl border-rose-300 bg-rose-50 text-rose-700 font-bold hover:bg-rose-100"
                                                    >
                                                        <Trash2 className="mr-1.5 h-4 w-4" />
                                                        Xóa Role
                                                    </Button>
                                                ) : (
                                                    <div className="text-xs text-slate-400 italic">
                                                        * Role hệ thống không thể xóa
                                                    </div>
                                                )}

                                                <Button
                                                    type="submit"
                                                    disabled={saving}
                                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 shadow-sm"
                                                >
                                                    {saving ? (
                                                        <>
                                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                            Đang lưu...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="mr-1.5 h-4 w-4" />
                                                            Lưu thay đổi
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* TAB 2: PHÂN QUYỀN (PERMISSION TREE 3 TẦNG) */}
                                {activeTab === "permissions" && (
                                    <div className="space-y-4">
                                        {/* Toolbar gọn gàng theo yêu cầu */}
                                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                            {/* Ô Tìm chức năng */}
                                            <div className="relative flex-1 max-w-sm">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={searchFeatureQuery}
                                                    onChange={(e) => setSearchFeatureQuery(e.target.value)}
                                                    placeholder="Tìm chức năng..."
                                                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-emerald-500 focus:bg-white"
                                                />
                                                {searchFeatureQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearchFeatureQuery("")}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Các nút hành động theo format chuẩn người dùng yêu cầu: [Khôi phục mặc định] [Mở rộng tất cả] [Chọn tất cả] */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleResetToDefault}
                                                    disabled={saving}
                                                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                                                    title="Khôi phục các quyền theo thiết lập mặc định của vai trò này"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                                                    Khôi phục mặc định
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleToggleExpandAll}
                                                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                                                >
                                                    {isAllExpanded ? (
                                                        <>
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                            Thu gọn tất cả
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                            Mở rộng tất cả
                                                        </>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleToggleSelectAll}
                                                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition border ${
                                                        isAllPermissionsSelected
                                                            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                                    }`}
                                                >
                                                    <CheckSquare className="h-3.5 w-3.5" />
                                                    {isAllPermissionsSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Thống kê theo Role: ví dụ "28 quyền đang được cấp" */}
                                        <div className="flex items-center justify-between px-2">
                                            <div className="text-sm font-bold text-slate-700">
                                                <span className="font-black text-emerald-600 text-base">{currentPermissions.length} quyền</span> đang được cấp cho vai trò này
                                            </div>
                                            {searchFeatureQuery && (
                                                <div className="text-xs text-slate-400 font-semibold">
                                                    Đang lọc theo: &quot;{searchFeatureQuery}&quot;
                                                </div>
                                            )}
                                        </div>

                                        {/* TREE CHECKBOX 3 TẦNG: Phân hệ -> Chức năng -> Quyền thao tác */}
                                        <div className="space-y-4">
                                            {filteredTreeModules.map((mod) => {
                                                const isCollapsed = !!collapsedModules[mod.id];

                                                // Tính quyền trong module
                                                const modKeys: string[] = [];
                                                for (const f of mod.features) {
                                                    for (const a of Object.values(f.actions)) {
                                                        if (a?.key) modKeys.push(a.key);
                                                    }
                                                }
                                                const modGrantedCount = modKeys.filter((k) => currentPermissions.includes(k)).length;
                                                const isModAllGranted = modKeys.length > 0 && modGrantedCount === modKeys.length;

                                                return (
                                                    <div
                                                        key={mod.id}
                                                        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:border-slate-300"
                                                    >
                                                        {/* TẦNG 1: PHÂN HỆ (MODULE) */}
                                                        <div
                                                            onClick={() => toggleCollapseModule(mod.id)}
                                                            className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50/70 hover:bg-slate-50 transition cursor-pointer select-none border-b border-slate-100"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    type="button"
                                                                    className="text-slate-400 hover:text-slate-700 transition"
                                                                    aria-label="Thu gọn/mở rộng phân hệ"
                                                                >
                                                                    {isCollapsed ? (
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
                                                                    {getModuleIcon(mod.iconName)}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-slate-900 text-sm tracking-wide">
                                                                            {mod.name}
                                                                        </span>
                                                                        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                                                                            — {mod.title}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 line-clamp-1">
                                                                        {mod.description}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Thống kê quyền module & nút toggle module */}
                                                            <div className="flex items-center gap-3 ml-auto">
                                                                <span
                                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                                                                        modGrantedCount > 0
                                                                            ? "bg-emerald-100 text-emerald-800"
                                                                            : "bg-slate-200 text-slate-600"
                                                                    }`}
                                                                >
                                                                    {modGrantedCount}/{modKeys.length} quyền
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleModule(mod);
                                                                    }}
                                                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold border transition ${
                                                                        isModAllGranted
                                                                            ? "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                                                    }`}
                                                                >
                                                                    {isModAllGranted ? "Bỏ chọn phân hệ" : "Chọn cả phân hệ"}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* NỘI DUNG TẦNG 2 & TẦNG 3 (KHI MỞ RỘNG) */}
                                                        {!isCollapsed && (
                                                            <div className="divide-y divide-slate-100 p-2 sm:p-4 space-y-4">
                                                                {mod.features.map((feature, featureIndex) => {
                                                                    const featureActions = Object.values(feature.actions).filter(Boolean);
                                                                    const featKeys = featureActions.map((a) => a!.key);
                                                                    const featGrantedCount = featKeys.filter((k) => currentPermissions.includes(k)).length;
                                                                    const isFeatAllGranted = featKeys.length > 0 && featGrantedCount === featKeys.length;
                                                                    const isFeatPartial = featGrantedCount > 0 && featGrantedCount < featKeys.length;

                                                                    return (
                                                                        <div key={feature.id} className="pt-3 first:pt-0">
                                                                            {feature.group && feature.group !== mod.features[featureIndex - 1]?.group && (
                                                                                <h3 className="mb-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-extrabold tracking-wide text-emerald-800 sm:text-sm">
                                                                                    {feature.group}
                                                                                </h3>
                                                                            )}
                                                                            <div className={feature.group ? "ml-2 border-l-2 border-emerald-100 pl-3 sm:ml-4 sm:pl-4" : undefined}>
                                                                            {/* TẦNG 2: CHỨC NĂNG (FEATURE) */}
                                                                            <div className="flex items-start justify-between gap-3 mb-2.5">
                                                                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => toggleFeature(feature)}
                                                                                        className="text-slate-600 hover:text-emerald-700 transition"
                                                                                        title="Chọn/Bỏ chọn tất cả quyền của chức năng này"
                                                                                    >
                                                                                        {isFeatAllGranted ? (
                                                                                            <CheckSquare className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                                                                                        ) : isFeatPartial ? (
                                                                                            <MinusSquare className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                                                                                        ) : (
                                                                                            <Square className="h-4 w-4 text-slate-300 hover:text-slate-400" />
                                                                                        )}
                                                                                    </button>
                                                                                    <span
                                                                                        onClick={() => toggleFeature(feature)}
                                                                                        className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-emerald-700 transition"
                                                                                    >
                                                                                        {feature.name}
                                                                                    </span>
                                                                                    {feature.menuPath && (
                                                                                        <span className="break-all rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-500">
                                                                                            {feature.menuPath}
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                <span className="text-xs font-bold text-slate-400">
                                                                                    {featGrantedCount}/{featKeys.length}
                                                                                </span>
                                                                            </div>

                                                                            {/* TẦNG 3: QUYỀN THAO TÁC (ACTIONS) */}
                                                                            <div className="grid grid-cols-2 gap-2 pl-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                                                                {featureActions.map((action) => {
                                                                                    if (!action) return null;
                                                                                    const isGranted = currentPermissions.includes(action.key);

                                                                                    return (
                                                                                        <button
                                                                                            key={action.key}
                                                                                            type="button"
                                                                                            onClick={() => togglePermission(action.key)}
                                                                                            className={`flex min-w-0 items-center gap-2 rounded-xl p-2.5 text-left border transition group ${
                                                                                                isGranted
                                                                                                    ? "border-emerald-200 bg-emerald-50/60 text-emerald-950 font-bold"
                                                                                                    : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
                                                                                            }`}
                                                                                            title={`Mã quyền: ${action.key}`}
                                                                                        >
                                                                                            <span
                                                                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                                                                                    isGranted
                                                                                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                                                                                        : "border-slate-300 bg-white group-hover:border-slate-400"
                                                                                                }`}
                                                                                            >
                                                                                                {isGranted && <Check className="h-3 w-3 stroke-[3]" />}
                                                                                            </span>
                                                                                            <span className="min-w-0 flex-1 text-xs font-semibold leading-snug">
                                                                                                {action.label}
                                                                                            </span>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {filteredTreeModules.length === 0 && (
                                                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">
                                                    Không tìm thấy chức năng hoặc quyền nào khớp với từ khóa &quot;{searchFeatureQuery}&quot;.
                                                </div>
                                            )}
                                        </div>

                                        {/* Thanh trạng thái thay đổi chưa lưu (Floating Sticky Bar) */}
                                        {hasUnsavedChanges && (
                                            <div className="sticky bottom-4 z-30 flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
                                                        <Sparkles className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-amber-900">
                                                            Có {unsavedChangesCount} thay đổi chưa lưu
                                                        </div>
                                                        <div className="text-xs text-amber-700">
                                                            Đừng quên lưu quyền để cập nhật phân quyền mới cho vai trò này.
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleDiscardChanges}
                                                        disabled={saving}
                                                        className="rounded-xl border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50"
                                                    >
                                                        Hủy
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={handleSavePermissions}
                                                        disabled={saving}
                                                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 shadow-sm"
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                                Đang lưu...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save className="mr-1.5 h-4 w-4" />
                                                                Lưu quyền
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 3: TÀI KHOẢN THUỘC ROLE */}
                                {activeTab === "accounts" && (
                                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                                        {/* Header tab & Toolbar */}
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
                                            <div>
                                                <div className="flex items-center gap-2.5">
                                                    <h3 className="text-lg font-black text-slate-900 uppercase">
                                                        Tài Khoản Thuộc Role
                                                    </h3>
                                                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                                                        {selectedRole.assignedUsers.length} tài khoản
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Danh sách các tài khoản người dùng đang được áp dụng quyền hạn của vai trò này.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2.5">
                                                {/* Ô tìm kiếm tài khoản */}
                                                <div className="relative w-64">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={searchAccountQuery}
                                                        onChange={(e) => setSearchAccountQuery(e.target.value)}
                                                        placeholder="Tìm tên, số điện thoại..."
                                                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-emerald-500 focus:bg-white"
                                                    />
                                                </div>

                                                <Button
                                                    type="button"
                                                    onClick={() => setIsAssignModalOpen(true)}
                                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 shadow-sm"
                                                >
                                                    <UserPlus className="mr-1.5 h-4 w-4" />
                                                    Gán tài khoản
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Danh sách các tài khoản */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            {assignedAccounts.map((acc) => (
                                                <div
                                                    key={acc.id}
                                                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-slate-50 hover:border-slate-300"
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-base shadow-sm">
                                                            {acc.fullName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-extrabold text-slate-900 text-sm truncate">
                                                                    {acc.fullName}
                                                                </h4>
                                                            </div>
                                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500 font-medium">
                                                                <span className="flex items-center gap-1 font-mono">
                                                                    <Phone className="h-3 w-3 text-slate-400" />
                                                                    {acc.phone}
                                                                </span>
                                                                {acc.organization && (
                                                                    <span className="flex items-center gap-1 text-slate-600 truncate">
                                                                        <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                                                        {acc.organization}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveUser(acc)}
                                                        className="shrink-0 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5 transition"
                                                    >
                                                        Gỡ khỏi Role
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {assignedAccounts.length === 0 && (
                                            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                                                <Users className="mx-auto h-8 w-8 text-slate-400" />
                                                <p className="mt-2 text-sm font-bold text-slate-600">
                                                    Chưa có tài khoản nào thuộc vai trò này.
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Nhấn &quot;+ Gán tài khoản&quot; để cấp vai trò cho người dùng trong hệ thống.
                                                </p>
                                                <Button
                                                    type="button"
                                                    onClick={() => setIsAssignModalOpen(true)}
                                                    className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                                >
                                                    <UserPlus className="mr-1.5 h-4 w-4" />
                                                    Gán tài khoản ngay
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
                                <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
                                <h3 className="mt-3 text-lg font-bold text-slate-700">Chọn một vai trò từ danh sách</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Vui lòng chọn vai trò ở cột bên trái để bắt đầu quản lý thông tin, phân quyền và tài khoản.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 1: TẠO ROLE MỚI */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                                    <Plus className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">
                                    Tạo Vai Trò Tùy Chỉnh
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRoleSubmit} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    Tên vai trò <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Nhân viên tiếp nhận, Nhân viên xuất hàng..."
                                    value={newRoleForm.roleName}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setNewRoleForm((prev) => ({
                                            ...prev,
                                            roleName: name,
                                        }));
                                    }}
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Nhóm đối tượng
                                    </label>
                                    <select
                                        value={newRoleForm.targetGroup}
                                        onChange={(e) => setNewRoleForm((prev) => ({ ...prev, targetGroup: e.target.value }))}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
                                    >
                                        {ROLE_TARGET_GROUPS.map((tg) => (
                                            <option key={tg} value={tg}>
                                                {tg}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Sao chép quyền từ
                                    </label>
                                    <select
                                        value={newRoleForm.copyFromRole}
                                        onChange={(e) => setNewRoleForm((prev) => ({ ...prev, copyFromRole: e.target.value }))}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
                                    >
                                        <option value="">Không sao chép (Trống)</option>
                                        {roles.map((r) => (
                                            <option key={r.key} value={r.key}>
                                                {r.name} ({r.key})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    Mô tả vai trò
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Mô tả tóm tắt nhiệm vụ của vai trò..."
                                    value={newRoleForm.roleDescription}
                                    onChange={(e) => setNewRoleForm((prev) => ({ ...prev, roleDescription: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="rounded-xl border-slate-200 text-slate-700 font-bold"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            Đang tạo...
                                        </>
                                    ) : (
                                        "Tạo vai trò"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: GÁN TÀI KHOẢN VÀO ROLE */}
            {isAssignModalOpen && selectedRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">
                                    Gán Tài Khoản Vào Role
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Chọn tài khoản để gán vào vai trò <span className="font-bold text-emerald-700">{selectedRole.name}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAssignModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Ô tìm kiếm tài khoản */}
                        <div className="py-3 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={assignModalSearch}
                                    onChange={(e) => setAssignModalSearch(e.target.value)}
                                    placeholder="Tìm theo tên, số điện thoại, đơn vị..."
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-emerald-500 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* Danh sách tài khoản khả dụng */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
                            {assignableUsers.map((user) => {
                                const isChecked = selectedUserIdsToAssign.includes(user.id);
                                return (
                                    <label
                                        key={user.id}
                                        className={`flex items-center justify-between gap-3 p-3 rounded-2xl cursor-pointer transition ${
                                            isChecked ? "bg-emerald-50/70 border border-emerald-200" : "hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    setSelectedUserIdsToAssign((prev) =>
                                                        prev.includes(user.id)
                                                            ? prev.filter((id) => id !== user.id)
                                                            : [...prev, user.id]
                                                    );
                                                }}
                                                className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                            />
                                            <div className="min-w-0">
                                                <div className="font-extrabold text-sm text-slate-900 truncate">
                                                    {user.fullName}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                    {user.phone} {user.organization ? `· ${user.organization}` : ""}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                            {user.role}
                                        </span>
                                    </label>
                                );
                            })}

                            {assignableUsers.length === 0 && (
                                <div className="py-8 text-center text-xs text-slate-400 italic">
                                    Không tìm thấy tài khoản khả dụng nào phù hợp.
                                </div>
                            )}
                        </div>

                        {/* Footer modal */}
                        <div className="pt-4 flex items-center justify-between border-t border-slate-100 shrink-0">
                            <span className="text-xs font-bold text-slate-600">
                                Đã chọn: <span className="text-emerald-700 font-black">{selectedUserIdsToAssign.length}</span> tài khoản
                            </span>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="rounded-xl border-slate-200 text-slate-700 font-bold"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    disabled={saving || selectedUserIdsToAssign.length === 0}
                                    onClick={handleConfirmAssignUsers}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            Đang gán...
                                        </>
                                    ) : (
                                        `Gán ${selectedUserIdsToAssign.length} tài khoản`
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
