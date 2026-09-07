"use client";

import { useEffect, useMemo, useState } from "react";
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
    Sparkles,
    CheckSquare,
    Square,
    Filter,
    ExternalLink,
    HelpCircle,
    User,
    Phone,
    Mail,
    BadgeCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    PERMISSION_MODULES,
    DEFAULT_ROLE_PERMISSIONS,
    getAllSystemPermissionKeys,
    ModuleDef,
    FeatureDef,
    ActionType
} from "@/lib/permissions-data";

type Account = {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    role: string;
    roleLabel: string;
    accountStatus: string;
    permissions: string[];
    defaultPermissions: string[];
    isDefault: boolean;
};

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
        default:
            return <ShieldCheck className="h-5 w-5 text-slate-600" />;
    }
}

const ACTION_COLUMNS: { type: ActionType; header: string; subHeader: string }[] = [
    { type: "view", header: "XEM", subHeader: "VIEW" },
    { type: "create", header: "TẠO", subHeader: "CREATE" },
    { type: "edit", header: "SỬA", subHeader: "EDIT" },
    { type: "delete", header: "XÓA", subHeader: "DELETE" },
    { type: "approve", header: "DUYỆT", subHeader: "APPROVE" },
    { type: "export", header: "XUẤT", subHeader: "EXPORT" },
];

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
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [permissions, setPermissions] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("ALL");
    const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Lấy toàn bộ danh sách tất cả các permission key trong hệ thống
    const allSystemKeys = useMemo(() => getAllSystemPermissionKeys(), []);

    async function load(preferredId = selectedId) {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/permissions", { cache: "no-store" });
            const json = await readJsonResponse(response);
            if (!response.ok || !json.success) throw new Error(json.message || "Không thể tải danh sách tài khoản.");
            setAccounts(json.data);
            const targetId = preferredId || (json.data.length > 0 ? json.data[0].id : "");
            if (targetId) {
                const account = json.data.find((item: Account) => item.id === targetId);
                if (account) {
                    setSelectedId(account.id);
                    setPermissions(account.permissions || []);
                }
            }
        } catch (error) {
            setMessage({
                text: error instanceof Error ? error.message : "Có lỗi xảy ra khi tải dữ liệu.",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const selected = useMemo(() => accounts.find((item) => item.id === selectedId), [accounts, selectedId]);

    // Chọn tài khoản khác
    function chooseAccount(id: string) {
        setSelectedId(id);
        setMessage(null);
        const account = accounts.find((item) => item.id === id);
        if (account) {
            setPermissions(account.permissions || []);
        }
    }

    // Toggle một action key đơn lẻ
    function togglePermission(key: string) {
        setPermissions((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    }

    // Toggle tất cả các actions của 1 tính năng (Feature)
    function toggleFeature(feature: FeatureDef) {
        const featureKeys = Object.values(feature.actions)
            .map((act) => act?.key)
            .filter((k): k is string => Boolean(k));
        if (featureKeys.length === 0) return;

        const allActive = featureKeys.every((k) => permissions.includes(k));
        if (allActive) {
            // Tắt hết
            setPermissions((prev) => prev.filter((k) => !featureKeys.includes(k)));
        } else {
            // Bật hết
            setPermissions((prev) => Array.from(new Set([...prev, ...featureKeys])));
        }
    }

    // Toggle tất cả các actions của 1 phân hệ (Module)
    function toggleModule(mod: ModuleDef) {
        const moduleKeys: string[] = [];
        for (const feat of mod.features) {
            for (const act of Object.values(feat.actions)) {
                if (act?.key) moduleKeys.push(act.key);
            }
        }
        if (moduleKeys.length === 0) return;

        const allActive = moduleKeys.every((k) => permissions.includes(k));
        if (allActive) {
            setPermissions((prev) => prev.filter((k) => !moduleKeys.includes(k)));
        } else {
            setPermissions((prev) => Array.from(new Set([...prev, ...moduleKeys])));
        }
    }

    // Áp dụng quyền mặc định theo vai trò của tài khoản
    function applyRoleDefault() {
        if (!selected) return;
        const defaultPerms = selected.defaultPermissions || DEFAULT_ROLE_PERMISSIONS[selected.role]?.permissions || [];
        setPermissions([...defaultPerms]);
        setMessage({
            text: `Đã áp dụng mẫu quyền mặc định của vai trò ${selected.roleLabel}.`,
            type: "success",
        });
    }

    // Chọn tất cả các quyền hệ thống
    function selectAllPermissions() {
        setPermissions([...allSystemKeys]);
    }

    // Bỏ chọn tất cả
    function deselectAllPermissions() {
        setPermissions([]);
    }

    // Thu gọn / Mở rộng module
    function toggleCollapseModule(moduleId: string) {
        setCollapsedModules((prev) => ({
            ...prev,
            [moduleId]: !prev[moduleId],
        }));
    }

    function expandAllModules() {
        setCollapsedModules({});
    }

    function collapseAllModules() {
        const collapsed: Record<string, boolean> = {};
        for (const mod of PERMISSION_MODULES) {
            collapsed[mod.id] = true;
        }
        setCollapsedModules(collapsed);
    }

    // Lưu hoặc Reset quyền
    async function handleSave() {
        if (!selected) return;
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch("/api/admin/permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selected.id, permissions }),
            });
            const json = await readJsonResponse(response);
            if (!response.ok || !json.success) throw new Error(json.message || "Không thể lưu quyền.");
            setMessage({ text: json.message || "Đã lưu phân quyền tài khoản thành công!", type: "success" });
            await load(selected.id);
        } catch (error) {
            setMessage({
                text: error instanceof Error ? error.message : "Có lỗi xảy ra khi lưu quyền.",
                type: "error",
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleResetToDefault() {
        if (!selected) return;
        if (!window.confirm(`Bạn có chắc chắn muốn khôi phục quyền mặc định theo vai trò cho tài khoản ${selected.fullName}?`)) {
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch(`/api/admin/permissions?userId=${encodeURIComponent(selected.id)}`, {
                method: "DELETE",
            });
            const json = await readJsonResponse(response);
            if (!response.ok || !json.success) throw new Error(json.message || "Không thể khôi phục quyền.");
            setMessage({ text: json.message || "Đã khôi phục quyền mặc định thành công!", type: "success" });
            await load(selected.id);
        } catch (error) {
            setMessage({
                text: error instanceof Error ? error.message : "Có lỗi xảy ra khi khôi phục quyền.",
                type: "error",
            });
        } finally {
            setSaving(false);
        }
    }

    // Lọc các Module và Feature theo từ khóa tìm kiếm và bộ lọc Module
    const filteredModules = useMemo(() => {
        const q = query.trim().toLowerCase();
        return PERMISSION_MODULES.filter((mod) => {
            if (selectedModuleFilter !== "ALL" && mod.id !== selectedModuleFilter) {
                return false;
            }
            if (!q) return true;

            const modMatch = mod.name.toLowerCase().includes(q) || mod.title.toLowerCase().includes(q);
            if (modMatch) return true;

            return mod.features.some((feat) => {
                const featMatch = feat.name.toLowerCase().includes(q) || feat.description.toLowerCase().includes(q);
                const actionMatch = Object.values(feat.actions).some((act) => act?.label.toLowerCase().includes(q) || act?.key.toLowerCase().includes(q));
                return featMatch || actionMatch;
            });
        }).map((mod) => {
            if (!q) return mod;
            const matchedFeatures = mod.features.filter((feat) => {
                const featMatch = feat.name.toLowerCase().includes(q) || feat.description.toLowerCase().includes(q);
                const actionMatch = Object.values(feat.actions).some((act) => act?.label.toLowerCase().includes(q) || act?.key.toLowerCase().includes(q));
                return featMatch || actionMatch || mod.name.toLowerCase().includes(q);
            });
            return {
                ...mod,
                features: matchedFeatures.length > 0 ? matchedFeatures : mod.features,
            };
        });
    }, [query, selectedModuleFilter]);

    // Thống kê số quyền đã cấp cho tài khoản đang chọn
    const grantedTotalCount = permissions.length;

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-slate-900">Phân Quyền Tài Khoản</h1>
                            <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                                17 Module Chuẩn
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">
                            Chọn tài khoản người dùng và thiết lập chi tiết ma trận quyền truy cập theo từng phân hệ và chức năng.
                        </p>
                    </div>
                </div>

                {/* Nút hành động nhanh phía trên */}
                {selected && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            onClick={handleResetToDefault}
                            disabled={saving}
                            variant="outline"
                            size="sm"
                            className="h-10 rounded-xl border-amber-300 bg-amber-50 font-bold text-amber-800 hover:bg-amber-100"
                        >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Khôi phục mặc định
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="h-10 rounded-xl bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-1.5 h-4 w-4" />
                                    Lưu phân quyền
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Thông báo kết quả */}
            {message && (
                <div
                    className={`flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold shadow-sm transition ${
                        message.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {message.type === "success" ? (
                            <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                            <ShieldCheck className="h-5 w-5 text-rose-600 shrink-0" />
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

            {/* Khu vực chọn tài khoản */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-6 md:grid-cols-12 items-center">
                    <div className="md:col-span-5">
                        <label htmlFor="permission-account" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                            1. Chọn tài khoản cần phân quyền
                        </label>
                        <div className="relative">
                            <select
                                id="permission-account"
                                value={selectedId}
                                onChange={(e) => chooseAccount(e.target.value)}
                                disabled={loading}
                                className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                            >
                                <option value="">{loading ? "Đang tải danh sách tài khoản..." : "-- Chọn tài khoản --"}</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.fullName} · {acc.phone} ({acc.roleLabel}) {acc.isDefault ? "[Mặc định]" : "[Tùy chỉnh]"}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    {/* Chi tiết tài khoản đang chọn */}
                    {selected ? (
                        <div className="md:col-span-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-lg shadow-sm">
                                    {selected.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-slate-900">{selected.fullName}</h3>
                                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                                            {selected.roleLabel}
                                        </span>
                                        {selected.isDefault ? (
                                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                                                Quyền vai trò
                                            </span>
                                        ) : (
                                            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">
                                                Cấu hình riêng
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5 text-slate-400" /> {selected.phone}
                                        </span>
                                        {selected.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-3.5 w-3.5 text-slate-400" /> {selected.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-500">Quyền kích hoạt</div>
                                <div className="text-lg font-black text-emerald-600">
                                    {grantedTotalCount} <span className="text-xs font-semibold text-slate-400">/ {allSystemKeys.length}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="md:col-span-7 flex items-center gap-2 text-sm text-slate-400 italic">
                            <HelpCircle className="h-4 w-4" /> Vui lòng chọn một tài khoản để bắt đầu cấu hình ma trận quyền.
                        </div>
                    )}
                </div>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="mt-3 text-sm font-semibold text-slate-500">Đang tải dữ liệu quyền hệ thống...</p>
                </div>
            )}

            {!loading && selected && (
                <div className="space-y-4">
                    {/* Thanh điều khiển lọc & Quick Actions */}
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                        {/* Ô tìm kiếm */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Tìm phân hệ, chức năng hoặc hành động..."
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                                >
                                    Xóa
                                </button>
                            )}
                        </div>

                        {/* Các nút thao tác nhanh */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={applyRoleDefault}
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            >
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                Mặc định vai trò
                            </button>
                            <button
                                type="button"
                                onClick={selectAllPermissions}
                                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                            >
                                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                                Chọn tất cả
                            </button>
                            <button
                                type="button"
                                onClick={deselectAllPermissions}
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            >
                                <Square className="h-3.5 w-3.5 text-slate-400" />
                                Bỏ chọn tất cả
                            </button>
                            <button
                                type="button"
                                onClick={expandAllModules}
                                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                title="Mở rộng tất cả module"
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                                Mở rộng
                            </button>
                            <button
                                type="button"
                                onClick={collapseAllModules}
                                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                title="Thu gọn tất cả module"
                            >
                                <ChevronUp className="h-3.5 w-3.5" />
                                Thu gọn
                            </button>
                        </div>
                    </div>

                    {/* Filter Pills Module */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                        <button
                            type="button"
                            onClick={() => setSelectedModuleFilter("ALL")}
                            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                selectedModuleFilter === "ALL"
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            Tất cả ({PERMISSION_MODULES.length})
                        </button>
                        {PERMISSION_MODULES.map((mod) => {
                            const isSelected = selectedModuleFilter === mod.id;
                            return (
                                <button
                                    key={mod.id}
                                    type="button"
                                    onClick={() => setSelectedModuleFilter(mod.id)}
                                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                        isSelected
                                            ? "bg-emerald-700 text-white shadow-sm"
                                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    {mod.name}
                                </button>
                            );
                        })}
                    </div>

                    {/* BẢNG MA TRẬN PHÂN QUYỀN (17 Modules) */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-black uppercase tracking-wider text-slate-700">
                                        <th className="py-4 pl-6 pr-4 min-w-[340px]">
                                            PHÂN HỆ & CHỨC NĂNG (MODULE & FEATURE)
                                        </th>
                                        {ACTION_COLUMNS.map((col) => (
                                            <th
                                                key={col.type}
                                                className="py-4 px-3 text-center min-w-[100px] border-l border-slate-200/70"
                                            >
                                                <span className="block font-black text-slate-800">{col.header}</span>
                                                <span className="block text-[10px] font-semibold text-slate-400">{col.subHeader}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredModules.map((mod, modIdx) => {
                                        const isCollapsed = !!collapsedModules[mod.id];

                                        // Thống kê số quyền đã bật trong module này
                                        const modActionKeys: string[] = [];
                                        for (const f of mod.features) {
                                            for (const a of Object.values(f.actions)) {
                                                if (a?.key) modActionKeys.push(a.key);
                                            }
                                        }
                                        const modActiveCount = modActionKeys.filter((k) => permissions.includes(k)).length;
                                        const isAllModActive = modActionKeys.length > 0 && modActiveCount === modActionKeys.length;

                                        return (
                                            <div key={mod.id} className="contents">
                                                {/* Header Row của Module */}
                                                <tr className="bg-slate-100/75 hover:bg-slate-100 transition border-t-2 border-slate-200">
                                                    <td
                                                        colSpan={1}
                                                        className="py-3.5 pl-6 pr-4 cursor-pointer select-none"
                                                        onClick={() => toggleCollapseModule(mod.id)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                className="text-slate-400 hover:text-slate-700"
                                                                aria-label="Toggle module"
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
                                                                    <span className="text-xs font-black text-slate-400">
                                                                        #{String(modIdx + 1).padStart(2, "0")}
                                                                    </span>
                                                                    <span className="font-black text-slate-900 text-sm tracking-wide">
                                                                        {mod.name}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500 font-medium">
                                                                        — {mod.title}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-400 line-clamp-1">
                                                                    {mod.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Các cột actions ở dòng module: hiển thị badge & nút bật toàn bộ module */}
                                                    <td colSpan={6} className="py-2.5 px-4 text-right border-l border-slate-200/50">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                                                Đã cấp: {modActiveCount}/{modActionKeys.length} quyền
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleModule(mod);
                                                                }}
                                                                className={`rounded-lg px-2.5 py-1 text-xs font-bold border transition ${
                                                                    isAllModActive
                                                                        ? "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                                                }`}
                                                            >
                                                                {isAllModActive ? "Tắt cả module" : "Bật cả module"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Các Feature Rows */}
                                                {!isCollapsed &&
                                                    mod.features.map((feature) => {
                                                        const featureKeys = Object.values(feature.actions)
                                                            .map((a) => a?.key)
                                                            .filter((k): k is string => Boolean(k));
                                                        const featActiveCount = featureKeys.filter((k) => permissions.includes(k)).length;
                                                        const isAllFeatActive = featureKeys.length > 0 && featActiveCount === featureKeys.length;

                                                        return (
                                                            <tr
                                                                key={feature.id}
                                                                className="hover:bg-slate-50/80 transition group"
                                                            >
                                                                {/* Tên & mô tả Feature */}
                                                                <td className="py-3.5 pl-12 pr-4">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => toggleFeature(feature)}
                                                                                    className="text-left font-bold text-slate-800 hover:text-emerald-700 transition"
                                                                                    title="Nhấn để bật/tắt toàn bộ hành vi của tính năng này"
                                                                                >
                                                                                    {feature.name}
                                                                                </button>
                                                                                {feature.menuPath && (
                                                                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                                                                                        {feature.menuPath}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                                                                                {feature.description}
                                                                            </p>
                                                                        </div>

                                                                        {featureKeys.length > 1 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleFeature(feature)}
                                                                                className={`opacity-0 group-hover:opacity-100 shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded transition ${
                                                                                    isAllFeatActive
                                                                                        ? "text-rose-600 hover:bg-rose-50"
                                                                                        : "text-emerald-600 hover:bg-emerald-50"
                                                                                }`}
                                                                            >
                                                                                {isAllFeatActive ? "Tắt hết" : "Bật hết"}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* 6 Cột Actions (VIEW, CREATE, EDIT, DELETE, APPROVE, EXPORT) */}
                                                                {ACTION_COLUMNS.map((col) => {
                                                                    const actionDef = feature.actions[col.type];
                                                                    if (!actionDef) {
                                                                        // Không áp dụng action này -> hiển thị dấu '—'
                                                                        return (
                                                                            <td
                                                                                key={col.type}
                                                                                className="py-3 px-3 text-center border-l border-slate-100 text-slate-300 font-bold select-none text-base"
                                                                            >
                                                                                —
                                                                            </td>
                                                                        );
                                                                    }

                                                                    const isChecked = permissions.includes(actionDef.key);

                                                                    return (
                                                                        <td
                                                                            key={col.type}
                                                                            className="py-3 px-3 text-center border-l border-slate-100"
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => togglePermission(actionDef.key)}
                                                                                title={`${actionDef.label} (${actionDef.key})`}
                                                                                className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl transition group/btn ${
                                                                                    isChecked
                                                                                        ? "bg-emerald-50 text-emerald-800"
                                                                                        : "hover:bg-slate-100 text-slate-400"
                                                                                }`}
                                                                            >
                                                                                <span
                                                                                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                                                                                        isChecked
                                                                                            ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                                                                                            : "border-slate-300 bg-white group-hover/btn:border-slate-400"
                                                                                    }`}
                                                                                >
                                                                                    {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                                                </span>
                                                                                <span
                                                                                    className={`mt-1 block max-w-[85px] truncate text-[10px] font-semibold ${
                                                                                        isChecked
                                                                                            ? "text-emerald-700 font-bold"
                                                                                            : "text-slate-400"
                                                                                    }`}
                                                                                >
                                                                                    {actionDef.label.split(" ")[0]}
                                                                                </span>
                                                                            </button>
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                            </div>
                                        );
                                    })}

                                    {filteredModules.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-sm text-slate-500 font-semibold">
                                                Không tìm thấy phân hệ hoặc chức năng nào khớp với từ khóa "{query}".
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Thanh hành động dính phía dưới (Sticky Footer) */}
                    <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold">Tài khoản đang cấu hình</div>
                                <div className="font-extrabold text-slate-900 text-sm">
                                    {selected.fullName} · {selected.roleLabel}
                                    <span className="ml-2 font-bold text-emerald-600">
                                        ({grantedTotalCount} quyền đã chọn)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                onClick={handleResetToDefault}
                                disabled={saving}
                                variant="outline"
                                className="h-11 rounded-xl border-amber-300 bg-amber-50 font-bold text-amber-800 hover:bg-amber-100"
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset về mặc định
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="h-11 rounded-xl bg-emerald-600 px-6 font-extrabold text-white shadow-md hover:bg-emerald-700"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Lưu phân quyền
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
