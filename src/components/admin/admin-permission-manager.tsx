"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
    CheckSquare,
    Square,
    MinusSquare,
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
    Bell,
    ChevronDown,
    ChevronRight,
    Loader2,
    Plus,
    RotateCcw,
    Save,
    Trash2,
    Edit3,
    AlertCircle,
    X,
    Check,
    ShieldAlert,
    ChevronUp,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    PERMISSION_MODULES,
    getAllSystemPermissionKeys,
    ROLE_TARGET_GROUPS,
    ModuleDef,
    FeatureDef,
    PermissionActionDef,
    RoleItem,
    generateRoleKeyFromName,
} from "@/lib/permissions-data";

// Ánh xạ icon cho từng phân hệ nghiệp vụ
function getModuleIcon(iconName: string) {
    switch (iconName) {
        case "LayoutDashboard":
            return <LayoutDashboard className="h-5 w-5 text-emerald-600" />;
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

export function AdminPermissionManager() {
    // 1. STATE DỮ LIỆU
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoleKey, setSelectedRoleKey] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"info" | "permissions">("permissions");

    // Tìm kiếm
    const [roleSearch, setRoleSearch] = useState("");
    const [featureSearch, setFeatureSearch] = useState("");

    // Cây phân hệ (Mở rộng / Thu gọn)
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    // Quyền đang chỉnh sửa (Draft permissions)
    const [editingPermissions, setEditingPermissions] = useState<Set<string>>(new Set());
    const [initialPermissions, setInitialPermissions] = useState<Set<string>>(new Set());

    // Trạng thái thao tác API
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Modal Tạo vai trò mới
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleKey, setNewRoleKey] = useState("");
    const [newRoleTargetGroup, setNewRoleTargetGroup] = useState<string>("Cơ sở chế biến");
    const [newRoleDesc, setNewRoleDesc] = useState("");
    const [copyFromRole, setCopyFromRole] = useState<string>("");
    const [isCreatingRole, setIsCreatingRole] = useState(false);

    // Modal Chỉnh sửa vai trò
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRoleName, setEditRoleName] = useState("");
    const [editRoleDesc, setEditRoleDesc] = useState("");
    const [editRoleTargetGroup, setEditRoleTargetGroup] = useState("");
    const [isEditingRole, setIsEditingRole] = useState(false);

    // Modal Xóa vai trò
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isDeletingRole, setIsDeletingRole] = useState(false);

    // Toast helper
    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // 2. TẢI DỮ LIỆU BAN ĐẦU
    const loadRoles = useCallback(async (selectKeyAfterLoad?: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/roles");
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setRoles(data.data);
                const targetKey = selectKeyAfterLoad || selectedRoleKey || data.data[0]?.key || "ADMIN";
                const activeRole = data.data.find((r: RoleItem) => r.key === targetKey) || data.data[0];
                if (activeRole) {
                    setSelectedRoleKey(activeRole.key);
                    const perms = new Set<string>(activeRole.permissions || []);
                    setEditingPermissions(new Set(perms));
                    setInitialPermissions(new Set(perms));
                }
            } else {
                showToast(data.message || "Không thể tải danh sách vai trò", "error");
            }
        } catch (err) {
            console.error("loadRoles error:", err);
            showToast("Lỗi kết nối khi tải danh mục vai trò.", "error");
        } finally {
            setLoading(false);
        }
    }, [selectedRoleKey]);

    useEffect(() => {
        void loadRoles();
    }, []);

    // Vai trò hiện đang được chọn
    const selectedRole = useMemo(() => {
        return roles.find((r) => r.key === selectedRoleKey) || roles[0] || null;
    }, [roles, selectedRoleKey]);

    // Khi đổi selectedRoleKey, đồng bộ draft permissions
    const handleSelectRole = (key: string) => {
        if (key === selectedRoleKey) return;
        if (isDirty) {
            const confirmLeave = window.confirm("Bạn có các thay đổi chưa lưu trên vai trò hiện tại. Tiếp tục chuyển vai trò sẽ hủy các thay đổi này?");
            if (!confirmLeave) return;
        }
        setSelectedRoleKey(key);
        const target = roles.find((r) => r.key === key);
        if (target) {
            const perms = new Set<string>(target.permissions || []);
            setEditingPermissions(new Set(perms));
            setInitialPermissions(new Set(perms));
        }
    };

    // Kiểm tra có thay đổi chưa lưu hay không
    const isDirty = useMemo(() => {
        if (editingPermissions.size !== initialPermissions.size) return true;
        for (const p of editingPermissions) {
            if (!initialPermissions.has(p)) return true;
        }
        return false;
    }, [editingPermissions, initialPermissions]);

    // Phân loại vai trò: Hệ thống và Tùy chỉnh
    const { systemRoles, customRoles } = useMemo(() => {
        const query = roleSearch.trim().toLowerCase();
        const filtered = roles.filter((r) => {
            if (!query) return true;
            return (
                r.name.toLowerCase().includes(query) ||
                r.key.toLowerCase().includes(query) ||
                r.description.toLowerCase().includes(query)
            );
        });

        return {
            systemRoles: filtered.filter((r) => r.isSystem),
            customRoles: filtered.filter((r) => !r.isSystem),
        };
    }, [roles, roleSearch]);

    // Lọc danh sách Module & Feature theo từ khóa tìm kiếm chức năng
    const filteredModules = useMemo(() => {
        const q = featureSearch.trim().toLowerCase();
        if (!q) return PERMISSION_MODULES;

        return PERMISSION_MODULES.map((mod) => {
            const modMatches =
                mod.name.toLowerCase().includes(q) ||
                mod.title.toLowerCase().includes(q) ||
                mod.description.toLowerCase().includes(q);

            if (mod.isSingleEntity) {
                const singleFeat = mod.features[0];
                if (!singleFeat) return null;
                if (modMatches) return mod;

                const matchedActions: Record<string, PermissionActionDef> = {};
                for (const [actionKey, actionDef] of Object.entries(singleFeat.actions)) {
                    if (!actionDef) continue;
                    if (
                        actionDef.label.toLowerCase().includes(q) ||
                        actionDef.key.toLowerCase().includes(q) ||
                        (actionDef.description && actionDef.description.toLowerCase().includes(q))
                    ) {
                        matchedActions[actionKey] = actionDef;
                    }
                }

                if (Object.keys(matchedActions).length > 0) {
                    return {
                        ...mod,
                        features: [
                            {
                                ...singleFeat,
                                actions: matchedActions,
                            },
                        ],
                    };
                }
                return null;
            }

            const matchedFeatures = mod.features.map((feat) => {
                const featMatches =
                    modMatches ||
                    feat.name.toLowerCase().includes(q) ||
                    (feat.description && feat.description.toLowerCase().includes(q));

                if (featMatches) return feat;

                const matchedActions: Record<string, PermissionActionDef> = {};
                for (const [actionKey, actionDef] of Object.entries(feat.actions)) {
                    if (!actionDef) continue;
                    if (
                        actionDef.label.toLowerCase().includes(q) ||
                        actionDef.key.toLowerCase().includes(q) ||
                        (actionDef.description && actionDef.description.toLowerCase().includes(q))
                    ) {
                        matchedActions[actionKey] = actionDef;
                    }
                }

                if (Object.keys(matchedActions).length > 0) {
                    return {
                        ...feat,
                        actions: matchedActions,
                    };
                }
                return null;
            }).filter((f): f is FeatureDef => f !== null);

            if (matchedFeatures.length > 0) {
                return {
                    ...mod,
                    features: matchedFeatures,
                };
            }
            return null;
        }).filter((mod): mod is ModuleDef => mod !== null);
    }, [featureSearch]);

    // Trạng thái expand ban đầu của tất cả module
    useEffect(() => {
        if (PERMISSION_MODULES.length > 0 && Object.keys(expandedModules).length === 0) {
            const initial: Record<string, boolean> = {};
            PERMISSION_MODULES.forEach((m) => {
                initial[m.id] = true;
            });
            setExpandedModules(initial);
        }
    }, [expandedModules]);

    // 3. LOGIC TRI-STATE CHO CÂY PHÂN QUYỀN (Module -> Feature -> Action)

    // Lấy tất cả permission keys thuộc một Feature
    const getFeatureKeys = (feature: FeatureDef): string[] => {
        return Object.values(feature.actions)
            .map((a) => a?.key)
            .filter((k): k is string => Boolean(k));
    };

    // Lấy tất cả permission keys thuộc một Module
    const getModuleKeys = (module: ModuleDef): string[] => {
        return module.features.flatMap((f) => getFeatureKeys(f));
    };

    // Kiểm tra trạng thái tri-state của Feature
    const getFeatureCheckState = (feature: FeatureDef): "none" | "partial" | "all" => {
        const keys = getFeatureKeys(feature);
        if (keys.length === 0) return "none";
        const granted = keys.filter((k) => editingPermissions.has(k)).length;
        if (granted === 0) return "none";
        if (granted === keys.length) return "all";
        return "partial";
    };

    // Kiểm tra trạng thái tri-state của Module
    const getModuleCheckState = (module: ModuleDef): "none" | "partial" | "all" => {
        const keys = getModuleKeys(module);
        if (keys.length === 0) return "none";
        const granted = keys.filter((k) => editingPermissions.has(k)).length;
        if (granted === 0) return "none";
        if (granted === keys.length) return "all";
        return "partial";
    };

    // Trạng thái của "Chọn tất cả" toàn hệ thống
    const allSystemKeys = useMemo(() => getAllSystemPermissionKeys(), []);
    const globalCheckState = useMemo<"none" | "partial" | "all">(() => {
        if (allSystemKeys.length === 0) return "none";
        const granted = allSystemKeys.filter((k) => editingPermissions.has(k)).length;
        if (granted === 0) return "none";
        if (granted === allSystemKeys.length) return "all";
        return "partial";
    }, [allSystemKeys, editingPermissions]);

    // Toggle một action riêng lẻ
    const handleToggleAction = (actionKey: string) => {
        setEditingPermissions((prev) => {
            const next = new Set(prev);
            if (next.has(actionKey)) {
                next.delete(actionKey);
            } else {
                next.add(actionKey);
            }
            return next;
        });
    };

    // Toggle một Feature (Chức năng)
    const handleToggleFeature = (feature: FeatureDef) => {
        const keys = getFeatureKeys(feature);
        const state = getFeatureCheckState(feature);
        setEditingPermissions((prev) => {
            const next = new Set(prev);
            if (state === "all") {
                keys.forEach((k) => next.delete(k));
            } else {
                keys.forEach((k) => next.add(k));
            }
            return next;
        });
    };

    // Toggle một Module (Phân hệ)
    const handleToggleModule = (module: ModuleDef) => {
        const keys = getModuleKeys(module);
        const state = getModuleCheckState(module);
        setEditingPermissions((prev) => {
            const next = new Set(prev);
            if (state === "all") {
                keys.forEach((k) => next.delete(k));
            } else {
                keys.forEach((k) => next.add(k));
            }
            return next;
        });
    };

    // Toggle Chọn tất cả / Bỏ chọn tất cả
    const handleToggleAll = () => {
        setEditingPermissions((prev) => {
            if (globalCheckState === "all") {
                return new Set();
            } else {
                return new Set(allSystemKeys);
            }
        });
    };

    // Mở rộng tất cả / Thu gọn tất cả
    const handleExpandAll = (expanded: boolean) => {
        const next: Record<string, boolean> = {};
        PERMISSION_MODULES.forEach((m) => {
            next[m.id] = expanded;
        });
        setExpandedModules(next);
    };

    // 4. THAO TÁC LƯU, HỦY VÀ KHÔI PHỤC QUYỀN
    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setIsSaving(true);
        try {
            const permsArray = Array.from(editingPermissions);
            const res = await fetch(`/api/admin/roles/${selectedRole.key}/permissions`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permissions: permsArray }),
            });
            const payload = await res.json();
            if (payload.success) {
                setInitialPermissions(new Set(permsArray));
                // Cập nhật lại trong state roles
                setRoles((prev) =>
                    prev.map((r) =>
                        r.key === selectedRole.key
                            ? {
                                  ...r,
                                  permissions: permsArray,
                                  stats: {
                                      ...r.stats,
                                      totalGranted: permsArray.length,
                                  },
                              }
                            : r,
                    ),
                );
                showToast(`Đã lưu thành công ${permsArray.length} quyền cho vai trò ${selectedRole.name}.`);
            } else {
                showToast(payload.message || "Không thể lưu phân quyền.", "error");
            }
        } catch (err) {
            console.error("handleSavePermissions error:", err);
            showToast("Lỗi khi lưu phân quyền.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        setEditingPermissions(new Set(initialPermissions));
        showToast("Đã hoàn nguyên các thay đổi chưa lưu.");
    };

    const handleResetToDefault = async () => {
        if (!selectedRole) return;
        const confirmReset = window.confirm(
            `Bạn có chắc chắn muốn khôi phục quyền của vai trò "${selectedRole.name}" về thiết lập mặc định của hệ thống?`,
        );
        if (!confirmReset) return;

        setIsResetting(true);
        try {
            const res = await fetch(`/api/admin/roles/${selectedRole.key}/reset`, {
                method: "POST",
            });
            const payload = await res.json();
            if (payload.success) {
                const defaultPerms = payload.data.permissions || [];
                setEditingPermissions(new Set(defaultPerms));
                setInitialPermissions(new Set(defaultPerms));
                setRoles((prev) =>
                    prev.map((r) =>
                        r.key === selectedRole.key
                            ? {
                                  ...r,
                                  permissions: defaultPerms,
                                  stats: {
                                      ...r.stats,
                                      totalGranted: defaultPerms.length,
                                  },
                              }
                            : r,
                    ),
                );
                showToast(`Đã khôi phục ${defaultPerms.length} quyền mặc định cho vai trò.`);
            } else {
                showToast(payload.message || "Không thể khôi phục quyền mặc định.", "error");
            }
        } catch (err) {
            console.error("handleResetToDefault error:", err);
            showToast("Lỗi khi khôi phục quyền mặc định.", "error");
        } finally {
            setIsResetting(false);
        }
    };

    // 5. THAO TÁC TẠO VAI TRÒ MỚI
    const handleOpenCreateModal = () => {
        setNewRoleName("");
        setNewRoleKey("");
        setNewRoleTargetGroup("Cơ sở chế biến");
        setNewRoleDesc("");
        setCopyFromRole("");
        setCreateModalOpen(true);
    };

    const handleNameChangeForNewRole = (name: string) => {
        setNewRoleName(name);
        setNewRoleKey(generateRoleKeyFromName(name));
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) {
            showToast("Vui lòng nhập tên vai trò.", "error");
            return;
        }

        setIsCreatingRole(true);
        try {
            const res = await fetch("/api/admin/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roleName: newRoleName.trim(),
                    roleKey: newRoleKey.trim() || undefined,
                    roleDescription: newRoleDesc.trim() || undefined,
                    targetGroup: newRoleTargetGroup,
                    copyFromRole: copyFromRole || undefined,
                }),
            });
            const payload = await res.json();
            if (payload.success) {
                showToast(`Đã tạo vai trò "${payload.data.name}" thành công.`);
                setCreateModalOpen(false);
                await loadRoles(payload.data.key);
            } else {
                showToast(payload.message || "Không thể tạo vai trò.", "error");
            }
        } catch (err) {
            console.error("handleCreateRole error:", err);
            showToast("Lỗi khi tạo vai trò mới.", "error");
        } finally {
            setIsCreatingRole(false);
        }
    };

    // 6. THAO TÁC CHỈNH SỬA VAI TRÒ TÙY CHỈNH
    const handleOpenEditModal = () => {
        if (!selectedRole) return;
        setEditRoleName(selectedRole.name);
        setEditRoleDesc(selectedRole.description);
        setEditRoleTargetGroup(selectedRole.targetGroup || "Cơ sở chế biến");
        setEditModalOpen(true);
    };

    const handleSaveRoleInfo = async () => {
        if (!selectedRole) return;
        if (!editRoleName.trim()) {
            showToast("Tên vai trò không được để trống.", "error");
            return;
        }

        setIsEditingRole(true);
        try {
            const res = await fetch(`/api/admin/roles/${selectedRole.key}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editRoleName.trim(),
                    description: editRoleDesc.trim(),
                    targetGroup: editRoleTargetGroup,
                }),
            });
            const payload = await res.json();
            if (payload.success) {
                showToast("Cập nhật thông tin vai trò thành công.");
                setEditModalOpen(false);
                setRoles((prev) =>
                    prev.map((r) =>
                        r.key === selectedRole.key
                            ? {
                                  ...r,
                                  name: editRoleName.trim(),
                                  description: editRoleDesc.trim(),
                                  targetGroup: editRoleTargetGroup,
                              }
                            : r,
                    ),
                );
            } else {
                showToast(payload.message || "Không thể cập nhật vai trò.", "error");
            }
        } catch (err) {
            console.error("handleSaveRoleInfo error:", err);
            showToast("Lỗi khi cập nhật vai trò.", "error");
        } finally {
            setIsEditingRole(false);
        }
    };

    // 7. THAO TÁC XÓA VAI TRÒ TÙY CHỈNH
    const handleDeleteRole = async () => {
        if (!selectedRole || selectedRole.isSystem) return;
        setIsDeletingRole(true);
        try {
            const res = await fetch(`/api/admin/roles/${selectedRole.key}`, {
                method: "DELETE",
            });
            const payload = await res.json();
            if (payload.success) {
                showToast(`Đã xóa vai trò "${selectedRole.name}".`);
                setDeleteModalOpen(false);
                await loadRoles("ADMIN");
            } else {
                showToast(payload.message || "Không thể xóa vai trò.", "error");
            }
        } catch (err) {
            console.error("handleDeleteRole error:", err);
            showToast("Lỗi khi xóa vai trò.", "error");
        } finally {
            setIsDeletingRole(false);
        }
    };

    return (
        <div className="space-y-6 pb-24">
            {/* TOAST THÔNG BÁO */}
            {toastMessage && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg border text-sm font-medium transition-all ${
                        toastMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : "bg-rose-50 text-rose-900 border-rose-200"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* TIÊU ĐỀ TRANG */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">Quản trị hệ thống · Phân quyền</p>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">Phân quyền vai trò</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý danh mục vai trò hệ thống, tạo vai trò tùy chỉnh và phân quyền chức năng theo cây nghiệp vụ.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleOpenCreateModal}
                        className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm gap-2 shadow-sm h-11 px-4 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Tạo vai trò mới
                    </Button>
                </div>
            </header>

            {/* BỐ CỤC CHÍNH MASTER-DETAIL (2 CỘT) */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[24px] border border-slate-200">
                    <Loader2 className="h-8 w-8 text-brand-600 animate-spin mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Đang tải ma trận phân quyền hệ thống...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* CỘT TRÁI (MASTER): DANH SÁCH VAI TRÒ (4 CỘT) */}
                    <div className="lg:col-span-4 bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        {/* Header cột trái */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Danh sách vai trò ({roles.length})
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleOpenCreateModal}
                                    className="h-7 px-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 text-xs font-semibold rounded-lg"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Thêm vai trò
                                </Button>
                            </div>
                            <div className="relative">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={roleSearch}
                                    onChange={(e) => setRoleSearch(e.target.value)}
                                    placeholder="Tìm vai trò..."
                                    className="pl-9 h-10 rounded-xl text-xs bg-white border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>
                        </div>

                        {/* Danh sách cuộn vai trò */}
                        <div className="divide-y divide-slate-100 max-h-[calc(100vh-280px)] overflow-y-auto">
                            {/* NHÓM VAI TRÒ HỆ THỐNG */}
                            <div className="p-2.5">
                                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    Vai trò hệ thống ({systemRoles.length})
                                </div>
                                <div className="space-y-1 mt-1">
                                    {systemRoles.map((role) => {
                                        const isSelected = role.key === selectedRoleKey;
                                        return (
                                            <button
                                                key={role.key}
                                                type="button"
                                                onClick={() => handleSelectRole(role.key)}
                                                className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-2 border ${
                                                    isSelected
                                                        ? "bg-brand-50/80 border-brand-200 shadow-xs"
                                                        : "hover:bg-slate-50 border-transparent text-slate-700"
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`font-semibold text-sm truncate ${
                                                                isSelected ? "text-brand-950 font-bold" : "text-slate-800"
                                                            }`}
                                                        >
                                                            {role.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[11px] font-mono uppercase ${isSelected ? "text-brand-700 font-semibold" : "text-slate-500"}`}>
                                                            {role.key}
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-[11px] text-slate-500">
                                                            {role.stats?.userCount ?? role.assignedUsers?.length ?? 0} tài khoản
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                                    Hệ thống
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* NHÓM VAI TRÒ TÙY CHỈNH */}
                            <div className="p-2.5">
                                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Vai trò tùy chỉnh ({customRoles.length})</span>
                                </div>
                                <div className="space-y-1 mt-1">
                                    {customRoles.length === 0 ? (
                                        <div className="px-3 py-4 text-center text-xs text-slate-400">
                                            Chưa có vai trò tùy chỉnh. Bấm "+ Thêm vai trò" để tạo mới.
                                        </div>
                                    ) : (
                                        customRoles.map((role) => {
                                            const isSelected = role.key === selectedRoleKey;
                                            return (
                                                <button
                                                    key={role.key}
                                                    type="button"
                                                    onClick={() => handleSelectRole(role.key)}
                                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-2 border ${
                                                        isSelected
                                                            ? "bg-brand-50/80 border-brand-200 shadow-xs"
                                                            : "hover:bg-slate-50 border-transparent text-slate-700"
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`font-semibold text-sm truncate ${
                                                                    isSelected ? "text-brand-950 font-bold" : "text-slate-800"
                                                                }`}
                                                            >
                                                                {role.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[11px] font-mono uppercase ${isSelected ? "text-brand-700 font-semibold" : "text-slate-500"}`}>
                                                                {role.key}
                                                            </span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-[11px] text-slate-500">
                                                                {role.stats?.userCount ?? role.assignedUsers?.length ?? 0} tài khoản
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                                        Tùy chỉnh
                                                    </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI (DETAIL): CHI TIẾT VAI TRÒ (8 CỘT) */}
                    <div className="lg:col-span-8 space-y-4">
                        {selectedRole ? (
                            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                                {/* Header chi tiết vai trò */}
                                <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-brand-50/20 via-white to-slate-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h2 className="text-xl font-bold text-slate-900">{selectedRole.name}</h2>
                                            <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                                                {selectedRole.key}
                                            </span>
                                            {selectedRole.isSystem ? (
                                                <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg">
                                                    Vai trò hệ thống
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                                                    Vai trò tùy chỉnh
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 max-w-2xl">{selectedRole.description}</p>
                                    </div>

                                    {/* Tabs chuyển đổi: [Phân quyền] [Thông tin] */}
                                    <div className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("permissions")}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                activeTab === "permissions"
                                                    ? "bg-white text-brand-700 shadow-xs"
                                                    : "text-slate-600 hover:text-slate-900 font-medium"
                                            }`}
                                        >
                                            Phân quyền ({editingPermissions.size})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("info")}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                activeTab === "info"
                                                    ? "bg-white text-brand-700 shadow-xs"
                                                    : "text-slate-600 hover:text-slate-900 font-medium"
                                            }`}
                                        >
                                            Thông tin vai trò
                                        </button>
                                    </div>
                                </div>

                                {/* NỘI DUNG TAB 1: THÔNG TIN VAI TRÒ */}
                                {activeTab === "info" && (
                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                                                <div className="text-xs font-medium text-slate-500">Tên vai trò</div>
                                                <div className="text-sm font-semibold text-slate-900">{selectedRole.name}</div>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                                                <div className="text-xs font-medium text-slate-500">Mã vai trò (Key)</div>
                                                <div className="text-sm font-mono font-bold text-brand-700">{selectedRole.key}</div>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                                                <div className="text-xs font-medium text-slate-500">Nhóm đối tượng</div>
                                                <div className="text-sm font-semibold text-slate-900">
                                                    {selectedRole.targetGroup || "Toàn hệ thống"}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                                                <div className="text-xs font-medium text-slate-500">Loại vai trò</div>
                                                <div className="text-sm font-semibold text-slate-900">
                                                    {selectedRole.isSystem ? "Vai trò mặc định hệ thống" : "Vai trò tùy chỉnh"}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                                                <div className="text-xs font-medium text-slate-500">Số tài khoản đang sử dụng</div>
                                                <div className="text-sm font-bold text-emerald-700">
                                                    {selectedRole.stats?.userCount ?? selectedRole.assignedUsers?.length ?? 0} người dùng
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                                                <div className="text-xs font-medium text-slate-500">Số quyền đang được cấp</div>
                                                <div className="text-sm font-bold text-brand-700">
                                                    {editingPermissions.size} / {allSystemKeys.length} quyền
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                                                <div className="text-xs font-medium text-slate-500">Mô tả chức năng</div>
                                                <div className="text-sm text-slate-800 leading-relaxed">
                                                    {selectedRole.description || "Chưa có mô tả chi tiết."}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hành động quản trị vai trò */}
                                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                            {selectedRole.isSystem ? (
                                                <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                                                    <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                                                    <span>Đây là vai trò hệ thống cốt lõi. Không thể xóa hoặc thay đổi mã định danh.</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        onClick={handleOpenEditModal}
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-xl border-slate-200 gap-1.5 text-xs font-semibold hover:bg-slate-50"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        Chỉnh sửa thông tin
                                                    </Button>
                                                    <Button
                                                        onClick={() => setDeleteModalOpen(true)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-xl gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Xóa vai trò này
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* NỘI DUNG TAB 2: CÂY PHÂN QUYỀN (PHÂN HỆ -> CHỨC NĂNG -> HÀNH ĐỘNG) */}
                                {activeTab === "permissions" && (
                                    <div className="p-5 sm:p-6 space-y-4">
                                        {/* Thanh công cụ phân quyền */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                                            {/* Ô tìm chức năng */}
                                            <div className="relative flex-1 max-w-md">
                                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input
                                                    value={featureSearch}
                                                    onChange={(e) => setFeatureSearch(e.target.value)}
                                                    placeholder="Tìm chức năng / phân hệ..."
                                                    className="pl-9 h-9 text-xs bg-white rounded-xl border-slate-200 focus-visible:ring-brand-500"
                                                />
                                            </div>

                                            {/* Thao tác chọn nhanh */}
                                            <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                                                <button
                                                    type="button"
                                                    onClick={handleToggleAll}
                                                    className="flex items-center gap-1.5 hover:text-brand-600 font-semibold cursor-pointer transition-colors"
                                                >
                                                    {globalCheckState === "all" ? (
                                                        <CheckSquare className="h-4 w-4 text-emerald-600 fill-emerald-50" />
                                                    ) : globalCheckState === "partial" ? (
                                                        <MinusSquare className="h-4 w-4 text-brand-600 fill-brand-50" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-slate-400" />
                                                    )}
                                                    <span>Chọn tất cả</span>
                                                </button>

                                                <span className="text-slate-300">|</span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleExpandAll(true)}
                                                    className="hover:text-brand-600 font-medium cursor-pointer transition-colors"
                                                >
                                                    Mở rộng tất cả
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleExpandAll(false)}
                                                    className="hover:text-brand-600 font-medium cursor-pointer transition-colors"
                                                >
                                                    Thu gọn tất cả
                                                </button>
                                            </div>
                                        </div>

                                        {/* CÂY PHÂN QUYỀN 3 CẤP */}
                                        <div className="space-y-3">
                                            {filteredModules.map((module) => {
                                                const isExpanded = expandedModules[module.id] ?? true;
                                                const moduleState = getModuleCheckState(module);
                                                const modKeys = getModuleKeys(module);
                                                const grantedModCount = modKeys.filter((k) => editingPermissions.has(k)).length;

                                                return (
                                                    <div
                                                        key={module.id}
                                                        className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs"
                                                    >
                                                        {/* CẤP 1: PHÂN HỆ (MODULE) */}
                                                        <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 select-none">
                                                            <div className="flex items-center gap-2.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setExpandedModules((prev) => ({
                                                                            ...prev,
                                                                            [module.id]: !isExpanded,
                                                                        }))
                                                                    }
                                                                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-200/60 transition-colors"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    )}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleModule(module)}
                                                                    className="flex items-center gap-2 text-left cursor-pointer group"
                                                                >
                                                                    {moduleState === "all" ? (
                                                                        <CheckSquare className="h-4 w-4 text-emerald-600 fill-emerald-50 shrink-0" />
                                                                    ) : moduleState === "partial" ? (
                                                                        <MinusSquare className="h-4 w-4 text-brand-600 fill-brand-50 shrink-0" />
                                                                    ) : (
                                                                        <Square className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-slate-600" />
                                                                    )}

                                                                    <div className="flex items-center gap-2">
                                                                        {getModuleIcon(module.iconName)}
                                                                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                                                                            {module.name}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            </div>

                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-slate-500 font-medium">
                                                                    {grantedModCount} / {modKeys.length} quyền
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* CẤP 2 & 3: CHỨC NĂNG VÀ HÀNH ĐỘNG */}
                                                        {isExpanded && (
                                                            module.isSingleEntity ? (
                                                                /* CẤP 2-TẦNG: TRỰC TIẾP CÁC HÀNH ĐỘNG (KHÔNG LẶP CẤP CON) */
                                                                <div className="p-4 bg-slate-50/30">
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                                        {Object.values(module.features[0]?.actions || {})
                                                                            .filter((a): a is PermissionActionDef => Boolean(a?.key))
                                                                            .map((action) => {
                                                                                const isChecked = editingPermissions.has(action.key);
                                                                                return (
                                                                                    <label
                                                                                        key={action.key}
                                                                                        onClick={() => handleToggleAction(action.key)}
                                                                                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                                                                                            isChecked
                                                                                                ? "bg-brand-50/80 border-brand-200 text-brand-950 font-semibold shadow-xs"
                                                                                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/60"
                                                                                        }`}
                                                                                    >
                                                                                        {isChecked ? (
                                                                                            <CheckSquare className="h-4 w-4 text-brand-600 shrink-0" />
                                                                                        ) : (
                                                                                            <Square className="h-4 w-4 text-slate-400 shrink-0" />
                                                                                        )}
                                                                                        <span className="font-medium truncate" title={action.description || action.label}>
                                                                                            {action.label}
                                                                                        </span>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* CẤP 3-TẦNG: CÓ CẤP CHỨC NĂNG CON */
                                                                <div className="divide-y divide-slate-100 p-2.5 space-y-1">
                                                                    {module.features.map((feature) => {
                                                                        const featState = getFeatureCheckState(feature);
                                                                        const featActions = Object.values(feature.actions).filter(
                                                                            (a): a is PermissionActionDef => Boolean(a?.key),
                                                                        );

                                                                        return (
                                                                            <div
                                                                                key={feature.id}
                                                                                className="p-3 rounded-xl hover:bg-slate-50/60 transition-colors"
                                                                            >
                                                                                {/* Header Cấp 2: Chức năng */}
                                                                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleToggleFeature(feature)}
                                                                                        className="flex items-center gap-2 text-left cursor-pointer group"
                                                                                    >
                                                                                        {featState === "all" ? (
                                                                                            <CheckSquare className="h-4 w-4 text-emerald-600 fill-emerald-50 shrink-0" />
                                                                                        ) : featState === "partial" ? (
                                                                                            <MinusSquare className="h-4 w-4 text-brand-600 fill-brand-50 shrink-0" />
                                                                                        ) : (
                                                                                            <Square className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-slate-600" />
                                                                                        )}
                                                                                        <div>
                                                                                            <div className="font-bold text-xs text-slate-800">
                                                                                                {feature.name}
                                                                                            </div>
                                                                                            {feature.description && (
                                                                                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                                                                                    {feature.description}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </button>
                                                                                </div>

                                                                                {/* Cấp 3: Các hành động (Checkboxes ngắn gọn) */}
                                                                                <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-2 border-t border-dashed border-slate-100">
                                                                                    {featActions.map((action) => {
                                                                                        const isChecked = editingPermissions.has(action.key);

                                                                                        return (
                                                                                            <label
                                                                                                key={action.key}
                                                                                                onClick={() => handleToggleAction(action.key)}
                                                                                                className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                                                                                                    isChecked
                                                                                                        ? "bg-brand-50/70 border-brand-200 text-brand-950 font-semibold shadow-xs"
                                                                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/60"
                                                                                                }`}
                                                                                            >
                                                                                                {isChecked ? (
                                                                                                    <CheckSquare className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                                                                                                ) : (
                                                                                                    <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                                                )}
                                                                                                <span className="truncate" title={action.description || action.label}>
                                                                                                    {action.label}
                                                                                                </span>
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white p-12 text-center rounded-[24px] border border-slate-200 shadow-sm">
                                <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-600">Vui lòng chọn vai trò để quản lý phân quyền.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STICKY FOOTER: XUẤT HIỆN KHI CÓ THAY ĐỔI CHƯA LƯU */}
            {isDirty && selectedRole && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-amber-900 font-medium text-xs sm:text-sm">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span>
                            Bạn có thay đổi chưa lưu trên vai trò <strong>{selectedRole.name}</strong> ({editingPermissions.size} quyền).
                        </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetToDefault}
                            disabled={isResetting || isSaving}
                            className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5"
                        >
                            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                            Khôi phục mặc định
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDiscardChanges}
                            disabled={isSaving || isResetting}
                            className="rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                            Hủy thay đổi
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSavePermissions}
                            disabled={isSaving || isResetting}
                            className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs gap-1.5 shadow-sm h-9 px-4 transition-all"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5" />
                                    Lưu thay đổi
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* MODAL: TẠO VAI TRÒ MỚI */}
            {createModalOpen && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[28px] bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                <Plus className="h-4 w-4 text-brand-600" />
                                TẠO VAI TRÒ MỚI
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Tên vai trò *</Label>
                                <Input
                                    value={newRoleName}
                                    onChange={(e) => handleNameChangeForNewRole(e.target.value)}
                                    placeholder="Ví dụ: Nhân viên QC, Nhân viên kho..."
                                    className="h-10 text-xs rounded-xl border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Mã vai trò (Key)</Label>
                                <Input
                                    value={newRoleKey}
                                    onChange={(e) => setNewRoleKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                                    placeholder="Tự sinh từ tên vai trò (VD: QC_STAFF)"
                                    className="h-10 font-mono text-xs uppercase rounded-xl border-slate-200 focus-visible:ring-brand-500"
                                />
                                <span className="text-[10px] text-slate-500">Mã vai trò viết hoa không dấu, không thể thay đổi sau khi tạo.</span>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Nhóm đối tượng</Label>
                                <select
                                    value={newRoleTargetGroup}
                                    onChange={(e) => setNewRoleTargetGroup(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                >
                                    {ROLE_TARGET_GROUPS.map((tg) => (
                                        <option key={tg} value={tg}>
                                            {tg}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Mô tả vai trò</Label>
                                <textarea
                                    value={newRoleDesc}
                                    onChange={(e) => setNewRoleDesc(e.target.value)}
                                    placeholder="Mô tả trách nhiệm và nghiệp vụ của vai trò..."
                                    rows={2}
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Sao chép quyền từ vai trò có sẵn</Label>
                                <select
                                    value={copyFromRole}
                                    onChange={(e) => setCopyFromRole(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                >
                                    <option value="">-- Để trống (Không sao chép) --</option>
                                    {roles.map((r) => (
                                        <option key={r.key} value={r.key}>
                                            {r.name} ({r.permissions?.length || 0} quyền)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCreateModalOpen(false)}
                                disabled={isCreatingRole}
                                className="rounded-xl border-slate-200 text-xs font-semibold h-10 px-4"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateRole}
                                disabled={isCreatingRole}
                                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs h-10 px-4 gap-1.5 shadow-sm transition-all"
                            >
                                {isCreatingRole ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                Tạo vai trò
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CHỈNH SỬA THÔNG TIN VAI TRÒ */}
            {editModalOpen && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[28px] bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-base">CHỈNH SỬA VAI TRÒ</h3>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Tên vai trò *</Label>
                                <Input
                                    value={editRoleName}
                                    onChange={(e) => setEditRoleName(e.target.value)}
                                    className="h-10 text-xs rounded-xl border-slate-200 focus-visible:ring-brand-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Nhóm đối tượng</Label>
                                <select
                                    value={editRoleTargetGroup}
                                    onChange={(e) => setEditRoleTargetGroup(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                >
                                    {ROLE_TARGET_GROUPS.map((tg) => (
                                        <option key={tg} value={tg}>
                                            {tg}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Mô tả vai trò</Label>
                                <textarea
                                    value={editRoleDesc}
                                    onChange={(e) => setEditRoleDesc(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditModalOpen(false)}
                                disabled={isEditingRole}
                                className="rounded-xl border-slate-200 text-xs font-semibold h-10 px-4"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveRoleInfo}
                                disabled={isEditingRole}
                                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs h-10 px-4 gap-1.5 shadow-sm transition-all"
                            >
                                {isEditingRole ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Lưu thông tin
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: XÁC NHẬN XÓA VAI TRÒ */}
            {deleteModalOpen && selectedRole && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-[28px] bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa vai trò</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Bạn có chắc chắn muốn xóa vai trò <strong>{selectedRole.name}</strong> ({selectedRole.key}) khỏi hệ thống? Thao tác này không thể hoàn tác.
                            </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={isDeletingRole}
                                className="rounded-xl border-slate-200 text-xs font-semibold h-10 px-4"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleDeleteRole}
                                disabled={isDeletingRole}
                                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 px-4 gap-1.5 shadow-sm transition-all"
                            >
                                {isDeletingRole ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Xóa vĩnh viễn
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
