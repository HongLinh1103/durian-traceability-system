"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    ShieldCheck,
    Check,
    X,
    RotateCcw,
    Search,
    History,
    Eye,
    Save,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Lock,
    CheckCircle2,
    XCircle,
    PlusCircle,
    UserPlus,
    SlidersHorizontal,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    SYSTEM_ROLES,
    PERMISSION_MODULES,
    DEFAULT_ROLE_PERMISSIONS,
    SystemRoleDef,
    ModuleDef,
    ActionType,
    calculateRolePermissionStats,
    generateRoleKeyFromName
} from "@/lib/permissions-data";

export function AdminPermissionManager() {
    // 1. Core States
    const [rolesList, setRolesList] = useState<SystemRoleDef[]>(SYSTEM_ROLES);
    const [selectedRoleKey, setSelectedRoleKey] = useState<string>("COLLECTOR");
    const [roleConfigs, setRoleConfigs] = useState<Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[] }>>({});
    const [savedRoleConfigs, setSavedRoleConfigs] = useState<Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[] }>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [resetting, setResetting] = useState<boolean>(false);

    // 2. UI & Filter States
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [previewDrawerOpen, setPreviewDrawerOpen] = useState<boolean>(false);
    const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
    const [confirmSaveDialogOpen, setConfirmSaveDialogOpen] = useState<boolean>(false);
    const [confirmResetDialogOpen, setConfirmResetDialogOpen] = useState<boolean>(false);

    // 3. New Role Modal States
    const [createRoleModalOpen, setCreateRoleModalOpen] = useState<boolean>(false);
    const [newRoleName, setNewRoleName] = useState<string>("");
    const [newRoleDescription, setNewRoleDescription] = useState<string>("");
    const [creatingRole, setCreatingRole] = useState<boolean>(false);
    const [createRoleError, setCreateRoleError] = useState<string>("");

    // 4. Audit Log States
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [historyFilterRole, setHistoryFilterRole] = useState<string>("");

    // Load initial permissions configuration from API
    const loadPermissions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/permissions");
            const json = await res.json();
            if (json.success && json.data) {
                if (json.data.roles && json.data.roles.length > 0) {
                    setRolesList(json.data.roles);
                }

                const configs: Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[] }> = {};
                for (const [key, val] of Object.entries(json.data.roleConfigs as Record<string, any>)) {
                    configs[key] = {
                        moduleEnabled: val.moduleEnabled || {},
                        permissions: val.permissions || [],
                    };
                }
                setRoleConfigs(configs);
                setSavedRoleConfigs(JSON.parse(JSON.stringify(configs)));
                if (json.data.auditLogs) {
                    setAuditLogs(json.data.auditLogs);
                }

                // Expand all modules by default for easy viewing and customization
                const initialExpanded: Record<string, boolean> = {};
                PERMISSION_MODULES.forEach(mod => {
                    initialExpanded[mod.id] = true;
                });
                setExpandedModules(initialExpanded);
            }
        } catch (err) {
            console.error("Error loading permissions:", err);
            // Fallback to local defaults
            const fallback: Record<string, { moduleEnabled: Record<string, boolean>; permissions: string[] }> = {};
            for (const [key, val] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
                fallback[key] = {
                    moduleEnabled: val.moduleEnabled,
                    permissions: val.permissions,
                };
            }
            setRoleConfigs(fallback);
            setSavedRoleConfigs(JSON.parse(JSON.stringify(fallback)));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadPermissions();
    }, [loadPermissions]);

    // Current Role metadata
    const currentRole = useMemo(() => {
        return rolesList.find(r => r.key === selectedRoleKey) || rolesList[0] || {
            key: selectedRoleKey,
            name: selectedRoleKey,
            description: "",
            badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
    }, [rolesList, selectedRoleKey]);

    // Current Role active configuration
    const currentConfig = useMemo(() => {
        return roleConfigs[selectedRoleKey] || DEFAULT_ROLE_PERMISSIONS[selectedRoleKey] || {
            moduleEnabled: {},
            permissions: [],
        };
    }, [roleConfigs, selectedRoleKey]);

    const currentSavedConfig = useMemo(() => {
        return savedRoleConfigs[selectedRoleKey] || DEFAULT_ROLE_PERMISSIONS[selectedRoleKey] || {
            moduleEnabled: {},
            permissions: [],
        };
    }, [savedRoleConfigs, selectedRoleKey]);

    // Calculate changes count
    const unsavedChanges = useMemo(() => {
        const changes: { type: "ADD" | "REMOVE" | "MODULE_TOGGLE"; key: string; label?: string }[] = [];

        // Check moduleEnabled changes
        for (const mod of PERMISSION_MODULES) {
            const currentVal = currentConfig.moduleEnabled[mod.id] ?? true;
            const savedVal = currentSavedConfig.moduleEnabled[mod.id] ?? true;
            if (currentVal !== savedVal) {
                changes.push({
                    type: "MODULE_TOGGLE",
                    key: mod.id,
                    label: `Phân hệ ${mod.name}: ${currentVal ? "BẬT" : "TẮT"}`,
                });
            }
        }

        // Check added permissions
        const currentPermsSet = new Set(currentConfig.permissions);
        const savedPermsSet = new Set(currentSavedConfig.permissions);

        for (const p of currentConfig.permissions) {
            if (!savedPermsSet.has(p)) {
                changes.push({ type: "ADD", key: p });
            }
        }

        for (const p of currentSavedConfig.permissions) {
            if (!currentPermsSet.has(p)) {
                changes.push({ type: "REMOVE", key: p });
            }
        }

        return changes;
    }, [currentConfig, currentSavedConfig]);

    // Calculate real-time stats for all roles
    const roleStatsMap = useMemo(() => {
        const stats: Record<string, { totalGranted: number; totalAvailable: number; perModuleStats: any }> = {};
        for (const role of rolesList) {
            const cfg = roleConfigs[role.key] || DEFAULT_ROLE_PERMISSIONS[role.key] || { moduleEnabled: {}, permissions: [] };
            stats[role.key] = calculateRolePermissionStats(role.key, cfg.permissions, cfg.moduleEnabled);
        }
        return stats;
    }, [roleConfigs, rolesList]);

    // Auto expand accordion if search matches
    useEffect(() => {
        if (!searchQuery.trim()) return;
        const q = searchQuery.toLowerCase().trim();
        const newExpanded: Record<string, boolean> = { ...expandedModules };

        PERMISSION_MODULES.forEach(mod => {
            const matchMod = mod.name.toLowerCase().includes(q) || mod.title.toLowerCase().includes(q);
            const matchFeat = mod.features.some(f =>
                f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
            );
            if (matchMod || matchFeat) {
                newExpanded[mod.id] = true;
            }
        });
        setExpandedModules(newExpanded);
    }, [searchQuery]);

    // Change Selected Role
    function handleSelectRole(newRoleKey: string) {
        if (newRoleKey === selectedRoleKey) return;
        setSelectedRoleKey(newRoleKey);
    }

    // Toggle Permission Checkbox
    function handleTogglePermission(permKey: string) {
        const currentPerms = currentConfig.permissions;
        const hasPerm = currentPerms.includes(permKey);
        const nextPerms = hasPerm
            ? currentPerms.filter(p => p !== permKey)
            : [...currentPerms, permKey];

        setRoleConfigs(prev => ({
            ...prev,
            [selectedRoleKey]: {
                ...currentConfig,
                permissions: nextPerms,
            },
        }));
    }

    // Toggle entire module on/off
    function handleToggleModuleEnabled(moduleId: string, enabled: boolean) {
        const nextModuleEnabled = {
            ...currentConfig.moduleEnabled,
            [moduleId]: enabled,
        };

        setRoleConfigs(prev => ({
            ...prev,
            [selectedRoleKey]: {
                ...currentConfig,
                moduleEnabled: nextModuleEnabled,
            },
        }));
    }

    // Select all permissions in a module
    function handleSelectAllInModule(moduleDef: ModuleDef, selectAll: boolean) {
        const modulePermKeys: string[] = [];
        for (const feat of moduleDef.features) {
            for (const act of Object.values(feat.actions)) {
                if (act?.key) modulePermKeys.push(act.key);
            }
        }

        let nextPerms = [...currentConfig.permissions];
        if (selectAll) {
            // Add all missing keys
            for (const k of modulePermKeys) {
                if (!nextPerms.includes(k)) nextPerms.push(k);
            }
        } else {
            // Remove all keys
            nextPerms = nextPerms.filter(k => !modulePermKeys.includes(k));
        }

        setRoleConfigs(prev => ({
            ...prev,
            [selectedRoleKey]: {
                ...currentConfig,
                moduleEnabled: {
                    ...currentConfig.moduleEnabled,
                    [moduleDef.id]: true, // ensure module is turned on when selecting all
                },
                permissions: nextPerms,
            },
        }));
    }

    // Discard unsaved changes
    function handleDiscardChanges() {
        setRoleConfigs(prev => ({
            ...prev,
            [selectedRoleKey]: JSON.parse(JSON.stringify(currentSavedConfig)),
        }));
    }

    // Save changes to API & DB
    async function handleSavePermissions() {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roleKey: selectedRoleKey,
                    moduleEnabled: currentConfig.moduleEnabled,
                    permissions: currentConfig.permissions,
                    changes: unsavedChanges,
                    changeSummary: `Cập nhật ${unsavedChanges.length} quyền cho vai trò ${currentRole.name}`,
                }),
            });

            const json = await res.json();
            if (json.success) {
                setSavedRoleConfigs(prev => ({
                    ...prev,
                    [selectedRoleKey]: JSON.parse(JSON.stringify(currentConfig)),
                }));
                setConfirmSaveDialogOpen(false);
                void loadPermissions(); // reload audit logs & stats
            } else {
                alert(json.message || "Lỗi khi lưu phân quyền");
            }
        } catch (err) {
            console.error("Save error:", err);
            alert("Lỗi kết nối máy chủ");
        } finally {
            setSaving(false);
        }
    }

    // Reset Role to System Defaults
    async function handleResetToDefault() {
        setResetting(true);
        try {
            const res = await fetch("/api/admin/permissions/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roleKey: selectedRoleKey }),
            });

            const json = await res.json();
            if (json.success && json.data) {
                setRoleConfigs(prev => ({
                    ...prev,
                    [selectedRoleKey]: {
                        moduleEnabled: json.data.moduleEnabled,
                        permissions: json.data.permissions,
                    },
                }));
                setSavedRoleConfigs(prev => ({
                    ...prev,
                    [selectedRoleKey]: {
                        moduleEnabled: json.data.moduleEnabled,
                        permissions: json.data.permissions,
                    },
                }));
                setConfirmResetDialogOpen(false);
                void loadPermissions();
            } else {
                alert(json.message || "Lỗi khi khôi phục quyền mặc định");
            }
        } catch (err) {
            console.error("Reset error:", err);
            alert("Lỗi kết nối khi khôi phục");
        } finally {
            setResetting(false);
        }
    }

    // Create New Custom Role
    async function handleCreateNewRole(e: React.FormEvent) {
        e.preventDefault();
        if (!newRoleName.trim()) {
            setCreateRoleError("Vui lòng nhập tên vai trò");
            return;
        }

        setCreatingRole(true);
        setCreateRoleError("");

        try {
            const res = await fetch("/api/admin/permissions/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roleName: newRoleName.trim(),
                    roleDescription: newRoleDescription.trim(),
                }),
            });

            const json = await res.json();
            if (json.success && json.data) {
                const newRole = json.data.role;
                const newConfig = json.data.config;

                // Update roles list
                setRolesList(prev => {
                    if (prev.some(r => r.key === newRole.key)) return prev;
                    return [...prev, newRole];
                });

                // Update configs
                setRoleConfigs(prev => ({
                    ...prev,
                    [newRole.key]: {
                        moduleEnabled: newConfig.moduleEnabled,
                        permissions: newConfig.permissions,
                    },
                }));
                setSavedRoleConfigs(prev => ({
                    ...prev,
                    [newRole.key]: {
                        moduleEnabled: newConfig.moduleEnabled,
                        permissions: newConfig.permissions,
                    },
                }));

                // Auto-select the newly created role
                setSelectedRoleKey(newRole.key);
                setNewRoleName("");
                setNewRoleDescription("");
                setCreateRoleModalOpen(false);
                void loadPermissions();
            } else {
                setCreateRoleError(json.message || "Không thể tạo vai trò mới");
            }
        } catch (err: any) {
            console.error("Create role error:", err);
            setCreateRoleError("Lỗi kết nối khi tạo vai trò");
        } finally {
            setCreatingRole(false);
        }
    }

    // Filtered modules based on search query
    const filteredModules = useMemo(() => {
        if (!searchQuery.trim()) return PERMISSION_MODULES;
        const q = searchQuery.toLowerCase().trim();

        return PERMISSION_MODULES.filter(mod => {
            const matchMod = mod.name.toLowerCase().includes(q) || mod.title.toLowerCase().includes(q) || mod.description.toLowerCase().includes(q);
            const matchFeat = mod.features.some(f =>
                f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
            );
            return matchMod || matchFeat;
        });
    }, [searchQuery]);

    // Filtered audit logs
    const filteredAuditLogs = useMemo(() => {
        if (!historyFilterRole) return auditLogs;
        return auditLogs.filter(l => l.roleKey === historyFilterRole);
    }, [auditLogs, historyFilterRole]);

    const currentStats = roleStatsMap[selectedRoleKey] || { totalGranted: 0, totalAvailable: 0, perModuleStats: {} };

    return (
        <div className="space-y-6 pb-28">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-6 sm:p-8 text-white shadow-xl">
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                QUẢN TRỊ HỆ THỐNG · PHÂN QUYỀN VAI TRÒ
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Phân Quyền Hệ Thống
                        </h1>
                        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
                            Quản lý quyền truy cập chức năng và quyền thao tác (Xem, Tạo, Sửa, Xóa, Xác nhận, Xuất) theo từng phân hệ cho từng vai trò người dùng.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            type="button"
                            onClick={() => setPreviewDrawerOpen(true)}
                            className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl px-4 h-10 text-xs gap-1.5 backdrop-blur-md border border-white/10 shadow-sm"
                        >
                            <Eye className="h-3.5 w-3.5 text-emerald-300" />
                            Xem trước quyền
                        </Button>

                        <Button
                            type="button"
                            onClick={() => setHistoryModalOpen(true)}
                            className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl px-4 h-10 text-xs gap-1.5 backdrop-blur-md border border-white/10 shadow-sm"
                        >
                            <History className="h-3.5 w-3.5 text-amber-300" />
                            Lịch sử thay đổi
                        </Button>
                    </div>
                </div>
            </div>

            {/* SECTION 01: CHỌN VAI TRÒ CẤU HÌNH (Dropdown & Tạo thêm role mới) */}
            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                            01
                        </span>
                        <div>
                            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                                Chọn vai trò cấu hình
                            </h2>
                            <p className="text-xs text-slate-500">
                                Chọn vai trò từ danh sách hoặc tạo thêm vai trò mới để bắt đầu thiết lập quyền
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dropdown Selector, Create Role Button & Search */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Role Dropdown */}
                    <div className="md:col-span-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                            <select
                                value={selectedRoleKey}
                                onChange={(e) => handleSelectRole(e.target.value)}
                                className="w-full appearance-none rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 px-4 py-2.5 text-xs font-black text-emerald-950 focus:border-emerald-600 focus:bg-white focus:outline-none h-11 pr-10 cursor-pointer transition shadow-2xs"
                            >
                                {rolesList.map((role) => {
                                    const stats = roleStatsMap[role.key] || { totalGranted: 0, totalAvailable: 0 };
                                    return (
                                        <option key={role.key} value={role.key} className="bg-white text-slate-900 py-1 font-bold">
                                            {role.name} ({role.key}) · Đã cấp {stats.totalGranted}/{stats.totalAvailable} quyền
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-emerald-700" />
                        </div>

                        {/* Button Tạo Thêm Role Mới */}
                        <Button
                            type="button"
                            onClick={() => {
                                setCreateRoleError("");
                                setCreateRoleModalOpen(true);
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl px-4 h-11 text-xs gap-1.5 shrink-0 shadow-sm"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Tạo thêm role mới
                        </Button>
                    </div>

                    {/* Quick Search across features */}
                    <div className="md:col-span-6 relative">
                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm chức năng, phân hệ cần phân quyền..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 py-2.5 text-xs font-medium focus:border-emerald-500 focus:bg-white focus:outline-none h-11"
                        />
                    </div>
                </div>
            </section>

            {/* SECTION 02: CẤU HÌNH PHÂN QUYỀN CHI TIẾT */}
            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm space-y-5">
                {/* Role Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-emerald-900/5 border border-emerald-100 p-4 rounded-2xl">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                Đang cấu hình quyền cho:
                            </span>
                            <span className="text-base font-black text-emerald-950">
                                {currentRole.name.toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${currentRole.badgeColor || "bg-emerald-100 text-emerald-800"}`}>
                                {currentRole.key}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600">
                            {currentRole.description || `Vai trò ${currentRole.name}`} · Đã cấp <b>{currentStats.totalGranted}</b> / {currentStats.totalAvailable} quyền
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmResetDialogOpen(true)}
                            className="rounded-xl text-xs font-bold gap-1.5 h-8 border-slate-300 text-slate-700 hover:text-rose-700 hover:border-rose-300"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Khôi phục mặc định
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setPreviewDrawerOpen(true)}
                            className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold h-8 gap-1.5"
                        >
                            <Eye className="h-3 w-3" />
                            Xem trước
                        </Button>
                    </div>
                </div>

                {/* Modules Accordion List */}
                <div className="space-y-3.5">
                    {filteredModules.map((mod) => {
                        const isExpanded = !!expandedModules[mod.id];
                        const isModuleEnabled = currentConfig.moduleEnabled[mod.id] ?? true;
                        const modStats = currentStats.perModuleStats[mod.id] || { granted: 0, total: 0 };

                        return (
                            <div
                                key={mod.id}
                                className={`rounded-2xl border transition overflow-hidden ${
                                    !isModuleEnabled
                                        ? "border-slate-200 bg-slate-50/60 opacity-80"
                                        : isExpanded
                                        ? "border-emerald-200 bg-white shadow-xs"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                            >
                                {/* Accordion Header */}
                                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer flex-1"
                                        onClick={() => {
                                            setExpandedModules(prev => ({
                                                ...prev,
                                                [mod.id]: !prev[mod.id],
                                            }));
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        <div className="space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                                    {mod.name}
                                                </h3>
                                                <span className="text-xs font-semibold text-slate-500">
                                                    — {mod.title}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 line-clamp-1">
                                                {mod.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Header Controls & Toggle */}
                                    <div className="flex items-center gap-3 shrink-0 pl-10 sm:pl-0">
                                        {/* Master Module Access Switch */}
                                        <label className="flex items-center gap-2 cursor-pointer py-1 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 transition">
                                            <input
                                                type="checkbox"
                                                checked={isModuleEnabled}
                                                onChange={(e) => handleToggleModuleEnabled(mod.id, e.target.checked)}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                            />
                                            <span className="text-xs font-bold text-slate-800">
                                                Cho phép truy cập phân hệ
                                            </span>
                                        </label>

                                        {/* Counter Badge */}
                                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                                            !isModuleEnabled
                                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                                : modStats.granted > 0
                                                ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                        }`}>
                                            {modStats.granted} / {modStats.total} quyền
                                        </span>
                                    </div>
                                </div>

                                {/* Accordion Body */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-4 sm:p-5 space-y-4 bg-slate-50/30">
                                        {/* Module Disabled Notice */}
                                        {!isModuleEnabled && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-100/90 p-3 text-xs text-slate-600 flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                                                <span>
                                                    Phân hệ <b>{mod.name}</b> đang bị <b>TẮT</b>. Toàn bộ tính năng và menu tương ứng sẽ bị ẩn khỏi vai trò {currentRole.name}.
                                                </span>
                                            </div>
                                        )}

                                        {/* Module Toolbar: Select all / Deselect all */}
                                        <div className="flex items-center justify-between text-xs pt-1">
                                            <span className="font-bold text-slate-600">
                                                Danh sách tính năng & ma trận hành vi:
                                            </span>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={!isModuleEnabled}
                                                    onClick={() => handleSelectAllInModule(mod, true)}
                                                    className="font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-40 disabled:pointer-events-none hover:underline"
                                                >
                                                    Chọn tất cả phân hệ
                                                </button>
                                                <span className="text-slate-300">|</span>
                                                <button
                                                    type="button"
                                                    disabled={!isModuleEnabled}
                                                    onClick={() => handleSelectAllInModule(mod, false)}
                                                    className="font-bold text-slate-500 hover:text-rose-700 disabled:opacity-40 disabled:pointer-events-none hover:underline"
                                                >
                                                    Bỏ chọn tất cả
                                                </button>
                                            </div>
                                        </div>

                                        {/* Desktop Matrix Table (>= md screens) */}
                                        <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b">
                                                    <tr>
                                                        <th className="px-4 py-3 min-w-[220px]">Chức năng</th>
                                                        <th className="px-3 py-3 text-center w-16">Xem</th>
                                                        <th className="px-3 py-3 text-center w-16">Tạo</th>
                                                        <th className="px-3 py-3 text-center w-16">Sửa</th>
                                                        <th className="px-3 py-3 text-center w-16">Xóa</th>
                                                        <th className="px-3 py-3 text-center w-20">Xác nhận</th>
                                                        <th className="px-3 py-3 text-center w-20">Xuất file</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {mod.features.map((feat) => {
                                                        const actionsList: ActionType[] = ["view", "create", "edit", "delete", "approve", "export"];

                                                        return (
                                                            <tr key={feat.id} className="hover:bg-slate-50/70 transition">
                                                                {/* Feature Name & Description */}
                                                                <td className="px-4 py-3">
                                                                    <div className="font-bold text-slate-900 text-xs">
                                                                        {feat.name}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-500 leading-snug">
                                                                        {feat.description}
                                                                    </div>
                                                                </td>

                                                                {/* Action Checkboxes or '—' */}
                                                                {actionsList.map((actionName) => {
                                                                    const actionDef = feat.actions[actionName];

                                                                    if (!actionDef) {
                                                                        return (
                                                                            <td
                                                                                key={actionName}
                                                                                className="px-3 py-3 text-center text-slate-300 font-bold text-base select-none"
                                                                                title="Hành vi không tồn tại cho tính năng này"
                                                                            >
                                                                                —
                                                                            </td>
                                                                        );
                                                                    }

                                                                    const isChecked = isModuleEnabled && currentConfig.permissions.includes(actionDef.key);

                                                                    return (
                                                                        <td key={actionName} className="px-3 py-3 text-center">
                                                                            <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    disabled={!isModuleEnabled}
                                                                                    onChange={() => handleTogglePermission(actionDef.key)}
                                                                                    title={`${actionDef.label} (${actionDef.key})`}
                                                                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                                                                />
                                                                            </label>
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Feature Card Block Layout (< md screens) */}
                                        <div className="block md:hidden space-y-3">
                                            {mod.features.map((feat) => {
                                                const actionsList: { key: ActionType; label: string }[] = [
                                                    { key: "view", label: "Xem" },
                                                    { key: "create", label: "Tạo" },
                                                    { key: "edit", label: "Sửa" },
                                                    { key: "delete", label: "Xóa" },
                                                    { key: "approve", label: "Xác nhận" },
                                                    { key: "export", label: "Xuất file" },
                                                ];

                                                return (
                                                    <div key={feat.id} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-xs">{feat.name}</h4>
                                                            <p className="text-[11px] text-slate-500">{feat.description}</p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                                                            {actionsList.map(({ key: actionName, label }) => {
                                                                const actionDef = feat.actions[actionName];
                                                                if (!actionDef) return null;

                                                                const isChecked = isModuleEnabled && currentConfig.permissions.includes(actionDef.key);

                                                                return (
                                                                    <button
                                                                        key={actionName}
                                                                        type="button"
                                                                        disabled={!isModuleEnabled}
                                                                        onClick={() => handleTogglePermission(actionDef.key)}
                                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                                                                            isChecked
                                                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                                                        } disabled:opacity-40 disabled:pointer-events-none`}
                                                                    >
                                                                        {isChecked && <Check className="h-3 w-3" />}
                                                                        <span>{label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* MODAL: TẠO THÊM ROLE MỚI */}
            {createRoleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden my-8 border border-slate-200">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                                    <UserPlus className="h-5 w-5 text-emerald-300" />
                                </div>
                                <div>
                                    <h3 className="font-black text-base text-white">
                                        Tạo Vai Trò Người Dùng Mới
                                    </h3>
                                    <p className="text-xs text-emerald-200">
                                        Nhập tên vai trò để khởi tạo và phân quyền
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateRoleModalOpen(false)}
                                className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleCreateNewRole} className="p-6 space-y-4 text-xs">
                            {createRoleError && (
                                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 font-bold">
                                    ❌ {createRoleError}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="block font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                                    Tên vai trò mới <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    placeholder="Ví dụ: Kỹ sư nông nghiệp, Nhân viên QC..."
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none h-10"
                                    autoFocus
                                    required
                                />
                                {newRoleName.trim() && (
                                    <p className="text-[11px] text-slate-500 font-mono">
                                        Mã định danh hệ thống (Role Key): <b className="text-emerald-800">{generateRoleKeyFromName(newRoleName)}</b>
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                                    Mô tả vai trò (Tùy chọn)
                                </label>
                                <textarea
                                    value={newRoleDescription}
                                    onChange={(e) => setNewRoleDescription(e.target.value)}
                                    placeholder="Mô tả phạm vi trách nhiệm và công việc của vai trò này..."
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none resize-none"
                                />
                            </div>

                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-900 text-[11px] leading-relaxed">
                                💡 Sau khi tạo, hệ thống sẽ tự động chọn vai trò mới này trong khung để bạn trực tiếp tích chọn các phân hệ và quyền cần cấp.
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCreateRoleModalOpen(false)}
                                    className="rounded-xl text-xs font-bold h-9 px-4 border-slate-200 text-slate-700"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={creatingRole || !newRoleName.trim()}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold h-9 px-5 gap-1.5"
                                >
                                    {creatingRole ? "Đang tạo..." : "Tạo vai trò & Phân quyền"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* STICKY SAVE BAR (Thanh Lưu Cố Định Ở Dưới) */}
            {unsavedChanges.length > 0 && (
                <aside aria-label="Thanh lưu thay đổi phân quyền" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 z-40 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="rounded-2xl bg-slate-950 text-white p-4 shadow-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 backdrop-blur-lg">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
                                <AlertTriangle className="h-4 w-4" />
                            </span>
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold text-white">
                                    Bạn có <span className="text-amber-400 font-black">{unsavedChanges.length} thay đổi</span> chưa lưu
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Vai trò đang chỉnh: <b>{currentRole.name}</b>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleDiscardChanges}
                                className="text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl h-9 px-3"
                            >
                                Hủy bỏ
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setConfirmSaveDialogOpen(true)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs h-9 px-4 gap-1.5 shadow-md"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>
                </aside>
            )}

            {/* CONFIRM SAVE DIALOG */}
            {confirmSaveDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                                <Save className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-base">
                                    Xác nhận lưu thay đổi quyền?
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Cập nhật phân quyền cho vai trò <b>{currentRole.name}</b>
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                            Bạn đang chuẩn bị lưu <b>{unsavedChanges.length} thay đổi quyền</b> cho vai trò <b>{currentRole.name}</b>. Quyền mới sẽ có hiệu lực ngay lập tức khi người dùng thuộc vai trò này truy cập hệ thống.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setConfirmSaveDialogOpen(false)}
                                className="rounded-xl text-xs font-bold h-9 px-4 border-slate-200 text-slate-700"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                disabled={saving}
                                onClick={handleSavePermissions}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold h-9 px-5 gap-1.5"
                            >
                                {saving ? "Đang lưu..." : "Xác nhận & Lưu"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM RESET DIALOG */}
            {confirmResetDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
                                <RotateCcw className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-base">
                                    Khôi phục quyền mặc định?
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Thiết lập lại quyền chuẩn cho vai trò <b>{currentRole.name}</b>
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                            Hành động này sẽ hủy bỏ mọi tùy chỉnh phân quyền hiện tại và đưa vai trò <b>{currentRole.name}</b> về cấu hình phân quyền chuẩn ban đầu của hệ thống.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setConfirmResetDialogOpen(false)}
                                className="rounded-xl text-xs font-bold h-9 px-4 border-slate-200 text-slate-700"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                disabled={resetting}
                                onClick={handleResetToDefault}
                                className="bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold h-9 px-5 gap-1.5"
                            >
                                {resetting ? "Đang khôi phục..." : "Xác nhận khôi phục"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* PERMISSION PREVIEW DRAWER (Slide-over Drawer) */}
            {previewDrawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs">
                    <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-6 text-white flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md">
                                    MÔ PHỎNG TRẢI NGHIỆM GIAO DIỆN
                                </span>
                                <h3 className="text-lg font-black tracking-tight text-white">
                                    Quyền của vai trò: {currentRole.name}
                                </h3>
                                <p className="text-xs text-emerald-200">
                                    Cấu hình các menu hiển thị và hành động được phép thao tác
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewDrawerOpen(false)}
                                className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                            {/* Accessible Menu Hierarchy */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <h4 className="font-black text-slate-900 uppercase tracking-wide text-xs">
                                        Menu được phép truy cập
                                    </h4>
                                </div>

                                <div className="space-y-2">
                                    {PERMISSION_MODULES.map((mod) => {
                                        const isModuleEnabled = currentConfig.moduleEnabled[mod.id] ?? true;
                                        if (!isModuleEnabled) return null;

                                        const accessibleFeatures = mod.features.filter(f => {
                                            return Object.values(f.actions).some(act =>
                                                act && currentConfig.permissions.includes(act.key)
                                            );
                                        });

                                        if (accessibleFeatures.length === 0) return null;

                                        return (
                                            <div key={mod.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-2">
                                                <div className="flex items-center justify-between font-black text-emerald-950 text-xs">
                                                    <span>{mod.name}</span>
                                                    <span className="text-[10px] font-semibold text-emerald-700">
                                                        {accessibleFeatures.length} chức năng
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5 pl-3 border-l-2 border-emerald-300">
                                                    {accessibleFeatures.map(feat => {
                                                        const grantedActionLabels: string[] = [];
                                                        if (feat.actions.view && currentConfig.permissions.includes(feat.actions.view.key)) grantedActionLabels.push("Xem");
                                                        if (feat.actions.create && currentConfig.permissions.includes(feat.actions.create.key)) grantedActionLabels.push("Tạo");
                                                        if (feat.actions.edit && currentConfig.permissions.includes(feat.actions.edit.key)) grantedActionLabels.push("Sửa");
                                                        if (feat.actions.delete && currentConfig.permissions.includes(feat.actions.delete.key)) grantedActionLabels.push("Xóa");
                                                        if (feat.actions.approve && currentConfig.permissions.includes(feat.actions.approve.key)) grantedActionLabels.push("Xác nhận");
                                                        if (feat.actions.export && currentConfig.permissions.includes(feat.actions.export.key)) grantedActionLabels.push("Xuất báo cáo");

                                                        return (
                                                            <div key={feat.id} className="bg-white p-2.5 rounded-xl border border-emerald-100 space-y-1">
                                                                <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                                                                    <span>{feat.name}</span>
                                                                    {feat.menuPath && (
                                                                        <code className="text-[10px] text-slate-400 font-mono">
                                                                            {feat.menuPath}
                                                                        </code>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 pt-0.5">
                                                                    {grantedActionLabels.map(act => (
                                                                        <span
                                                                            key={act}
                                                                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200"
                                                                        >
                                                                            {act}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Inaccessible / Blocked Modules */}
                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-slate-400" />
                                    <h4 className="font-black text-slate-700 uppercase tracking-wide text-xs">
                                        Phân hệ bị ẩn / Khóa truy cập
                                    </h4>
                                </div>

                                <div className="space-y-1.5">
                                    {PERMISSION_MODULES.map((mod) => {
                                        const isModuleEnabled = currentConfig.moduleEnabled[mod.id] ?? true;
                                        if (isModuleEnabled) return null;

                                        return (
                                            <div
                                                key={mod.id}
                                                className="rounded-xl border border-slate-200 bg-slate-100/80 p-2.5 flex items-center justify-between text-slate-500 font-medium"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>{mod.name} — {mod.title}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                    ĐÃ TẮT
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 bg-slate-50 border-t flex items-center justify-end">
                            <Button
                                type="button"
                                onClick={() => setPreviewDrawerOpen(false)}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-6"
                            >
                                Đóng xem trước
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* AUDIT / CHANGE HISTORY MODAL */}
            {historyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden my-8 border border-slate-200">
                        {/* Modal Top */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                                    <History className="h-5 w-5 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-white">
                                        Lịch Sử Phân Quyền Hệ Thống
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Ghi nhận nhật ký thay đổi phân quyền của các vai trò
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHistoryModalOpen(false)}
                                className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                            {/* Filter Bar */}
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-slate-600">Lọc theo vai trò:</span>
                                <select
                                    value={historyFilterRole}
                                    onChange={(e) => setHistoryFilterRole(e.target.value)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                >
                                    <option value="">Tất cả vai trò</option>
                                    {rolesList.map(r => (
                                        <option key={r.key} value={r.key}>{r.name} ({r.key})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Logs Table */}
                            <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b">
                                        <tr>
                                            <th className="px-3 py-2.5 whitespace-nowrap">Thời gian</th>
                                            <th className="px-3 py-2.5 whitespace-nowrap">Người thực hiện</th>
                                            <th className="px-3 py-2.5 whitespace-nowrap">Vai trò</th>
                                            <th className="px-3 py-2.5">Nội dung thay đổi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredAuditLogs.map((log, idx) => (
                                            <tr key={log.id || idx} className="hover:bg-slate-50">
                                                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                                                    {new Date(log.createdAt).toLocaleString("vi-VN")}
                                                </td>
                                                <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                                                    {log.actorName || "Admin"}
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <span className="font-black text-[10px] uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                                                        {log.roleKey}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-700 font-medium leading-relaxed">
                                                    {log.changeSummary || "Cập nhật phân quyền"}
                                                </td>
                                            </tr>
                                        ))}

                                        {filteredAuditLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-slate-400">
                                                    Chưa có lịch sử thay đổi phân quyền nào.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t flex items-center justify-end">
                            <Button
                                type="button"
                                onClick={() => setHistoryModalOpen(false)}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-6"
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
