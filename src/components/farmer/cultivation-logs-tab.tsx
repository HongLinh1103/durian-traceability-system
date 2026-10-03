"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
    Plus,
    Sprout,
    Loader2,
    X,
    Unlock,
    AlertCircle,
    Pencil,
    Trash2,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useToast } from "@/components/ui/toast";
import { formatVietnameseDateTime } from "@/lib/date-format";

export const activityLabels: Record<string, string> = {
    BASE_FERTILIZING: "Bón phân gốc",
    PLANTING: "Trồng mới",
    MULCHING: "Phủ gốc",
    SPRAY_PESTICIDE: "Phun thuốc BVTV",
    FERTILIZE: "Bón phân",
    FOLIAR_FERTILIZING: "Bón phân qua lá",
    IRRIGATE: "Tưới nước",
    PRUNE: "Cắt tỉa cành",
    WEEDING: "Làm cỏ",
    SHOOT_MANAGEMENT: "Quản lý đọt",
    WATER_STRESS: "Xiết nước",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWER_THINNING: "Tỉa hoa",
    POLLINATION: "Thụ phấn",
    FRUIT_THINNING: "Tỉa trái",
    PEST_INSPECTION: "Kiểm tra sâu bệnh",
    TRACK_FRUIT: "Theo dõi trái",
    FRUIT_BAGGING: "Bao trái",
    BRANCH_SUPPORT: "Chống đỡ cành",
    HARVEST: "Thu hoạch",
    FRUIT_GRADING: "Phân loại trái",
    GARDEN_SANITATION: "Vệ sinh vườn",
    OTHER: "Khác",
};

export const stageLabels: Record<string, string> = {
    POST_HARVEST_RECOVERY: "Phục hồi sau thu hoạch",
    MAKING_SPROUT: "Làm đọt",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWERING: "Ra hoa",
    FRUIT_SETTING: "Đậu trái",
    FRUIT_GROWING: "Nuôi trái",
    PRE_HARVEST: "Trước thu hoạch",
    HARVEST: "Thu hoạch",
};

const STAGE_ORDER = [
    "POST_HARVEST_RECOVERY",
    "MAKING_SPROUT",
    "FLOWER_INDUCTION",
    "FLOWERING",
    "FRUIT_SETTING",
    "FRUIT_GROWING",
    "PRE_HARVEST",
    "HARVEST",
] as const;

export function formatLogDateTime(date: Date | string | number | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatLogDateOnly(date: Date | string | number | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export function formatLogTimeOnly(date: Date | string | number | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}


export function formatPestsDetected(val?: string | null): string {
    if (!val || !val.trim() || val.trim() === "Không phát hiện") {
        return "Không phát hiện";
    }
    const cleaned = val
        .replace(/\s*\([^)]*bẫy[^)]*\)/gi, "")
        .replace(/\s*\([^)]*con\/[^)]*\)/gi, "")
        .replace(/phát hiện bẫy[^\n,]*/gi, "")
        .trim();
    return cleaned || "Không phát hiện";
}

export function renderPestsDetectedCell(
    val?: string | null,
    _onNavigateToPestBook?: (pestName: string) => void
) {
    if (!val || !val.trim() || val.trim() === "Không phát hiện") {
        return <span className="text-slate-500 font-medium text-xs">Không phát hiện</span>;
    }

    return (
        <span className="text-slate-800 font-medium text-xs">
            {val.trim()}
        </span>
    );
}

export interface FarmingLogItem {
    id: string;
    farmId?: string;
    cropSeasonId?: string | null;
    actionDate: string;
    stage: string;
    activityType: string;
    otherActivity?: string | null;
    chemicalName?: string | null;
    materialsUsed?: Array<{ id: string; transactionId: string | null; supplyName: string; quantity: number; unit: string }>;
    dosage?: string | null;
    phiDays?: number | null;
    pestsDetected?: string | null;
    notes?: string | null;
    images: string[];
    isGACCCompliant: boolean;
    createdAt?: string;
    farm?: { id?: string; farmCode: string; farmName: string };
    cropSeason?: { id: string; name: string; year: number; status: string } | null;
}

interface CultivationLogsTabProps {
    farmId?: string;
    cropSeasonId?: string;
    isSeasonActive?: boolean;
    farmName?: string;
    seasonName?: string;
    seasonYear?: number;
    onReopenSeason?: () => void;
    onNavigateToPestBook?: (pestName: string) => void;
}

export function CultivationLogsTab({
    farmId,
    cropSeasonId,
    isSeasonActive = true,
    farmName,
    seasonName,
    seasonYear,
    onReopenSeason,
    onNavigateToPestBook,
}: CultivationLogsTabProps) {
    const [logs, setLogs] = useState<FarmingLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const { toast } = useToast();
    const [editingLog, setEditingLog] = useState<FarmingLogItem | null>(null);
    const [deletingLog, setDeletingLog] = useState<FarmingLogItem | null>(null);
    const [submittingAction, setSubmittingAction] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});

    const [editForm, setEditForm] = useState({
        date: "",
        time: "08:00",
        stage: "POST_HARVEST_RECOVERY",
        activityType: "BASE_FERTILIZING",
        otherActivity: "",
        chemicalName: "",
        dosage: "",
        phiDays: "",
        pestsDetected: "Không phát hiện",
        notes: "",
        isGACCCompliant: true,
        images: [] as string[],
    });

    const handleOpenEdit = (log: FarmingLogItem) => {
        setMaterialQuantities(Object.fromEntries((log.materialsUsed || []).filter(m => m.transactionId).map(m => [m.transactionId!, m.quantity])));
        const d = new Date(log.actionDate);
        const dateStr = !isNaN(d.getTime())
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : "";
        const timeStr = !isNaN(d.getTime())
            ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            : "08:00";

        setEditForm({
            date: dateStr,
            time: timeStr,
            stage: log.stage,
            activityType: log.activityType,
            otherActivity: log.otherActivity || "",
            chemicalName: log.chemicalName || "",
            dosage: log.dosage || "",
            phiDays: log.phiDays != null ? String(log.phiDays) : "",
            pestsDetected: log.pestsDetected || "Không phát hiện",
            notes: log.notes || "",
            isGACCCompliant: log.isGACCCompliant,
            images: log.images || [],
        });
        setEditingLog(log);
    };

    const handleOpenDelete = (log: FarmingLogItem) => {
        setDeletingLog(log);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === "string") {
                    setEditForm((prev) => ({
                        ...prev,
                        images: [...prev.images, reader.result as string],
                    }));
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setEditForm((prev) => ({
            ...prev,
            images: prev.images.filter((_, idx) => idx !== indexToRemove),
        }));
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLog) return;
        setSubmittingAction(true);
        try {
            const fullDateTime = new Date(`${editForm.date}T${editForm.time || "00:00"}:00`).toISOString();
            const res = await fetch(`/api/farming-logs/${editingLog.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    actionDate: fullDateTime,
                    stage: editForm.stage,
                    activityType: editForm.activityType,
                    otherActivity: editForm.activityType === "OTHER" ? editForm.otherActivity : null,
                    chemicalName: editForm.chemicalName,
                    dosage: editForm.dosage,
                    phiDays: editForm.phiDays ? Number(editForm.phiDays) : null,
                    pestsDetected: editForm.pestsDetected,
                    notes: editForm.notes,
                    isGACCCompliant: editForm.isGACCCompliant,
                    images: editForm.images,
                    materialQuantities: Object.entries(materialQuantities).map(([transactionId, quantity]) => ({ transactionId, quantity })),
                }),
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                toast({
                    title: "Thành công",
                    description: "Đã cập nhật nhật ký canh tác thành công.",
                    variant: "success",
                });
                setEditingLog(null);
                await loadLogs();
            } else {
                toast({
                    title: "Lỗi",
                    description: data.error || "Không thể cập nhật nhật ký canh tác.",
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error("Lỗi khi lưu sửa nhật ký:", err);
            toast({
                title: "Lỗi",
                description: "Đã xảy ra lỗi kết nối khi lưu.",
                variant: "destructive",
            });
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingLog) return;
        setSubmittingAction(true);
        try {
            const res = await fetch(`/api/farming-logs/${deletingLog.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                toast({
                    title: "Thành công",
                    description: "Đã xóa nhật ký canh tác thành công.",
                    variant: "success",
                });
                setDeletingLog(null);
                await loadLogs();
            } else {
                toast({
                    title: "Lỗi",
                    description: data.error || "Không thể xóa nhật ký canh tác.",
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error("Lỗi khi xóa nhật ký:", err);
            toast({
                title: "Lỗi",
                description: "Đã xảy ra lỗi kết nối khi xóa.",
                variant: "destructive",
            });
        } finally {
            setSubmittingAction(false);
        }
    };

    // Tải danh sách nhật ký canh tác theo Farm và CropSeason
    const loadLogs = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const params = new URLSearchParams();
            if (farmId) params.set("farmId", farmId);
            if (cropSeasonId) params.set("cropSeasonId", cropSeasonId);

            const res = await fetch(`/api/farming-logs?${params.toString()}`, {
                cache: "no-store",
            });
            if (res.ok) {
                const json = await res.json();
                setLogs(json.data?.logs || []);
            } else {
                const json = await res.json().catch(() => ({}));
                setErrorMessage(json.error || "Không thể tải danh sách nhật ký canh tác.");
                setLogs([]);
            }
        } catch (err) {
            console.error("Lỗi khi tải nhật ký canh tác:", err);
            setErrorMessage("Lỗi kết nối khi tải nhật ký canh tác.");
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [farmId, cropSeasonId]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    // Thống kê nhanh
    const stats = useMemo(() => {
        const total = logs.length;
        const sprayCount = logs.filter(l => l.activityType === "SPRAY_PESTICIDE").length;
        const fertilizeCount = logs.filter(l => ["FERTILIZE", "BASE_FERTILIZING", "FOLIAR_FERTILIZING"].includes(l.activityType)).length;

        // Đếm theo từng giai đoạn
        const stageCounts: Record<string, number> = {};
        logs.forEach((l) => {
            stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1;
        });

        return { total, sprayCount, fertilizeCount, stageCounts };
    }, [logs]);

    const newLogUrl = farmId
        ? `/dashboard/farmer/logs/new?farmId=${farmId}${
              cropSeasonId ? `&seasonId=${cropSeasonId}` : ""
          }`
        : "/dashboard/farmer/logs/new";

    return (
        <div className="w-full space-y-5">
            {/* Thống kê tóm tắt nhanh vụ mùa */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs">
                    <p className="text-xs font-bold text-slate-400 uppercase">Tổng hoạt động</p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                        {loading ? "..." : `${stats.total} lượt`}
                    </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs">
                    <p className="text-xs font-bold text-slate-400 uppercase">Phun thuốc</p>
                    <p className="mt-1 text-xl font-black text-amber-600">
                        {loading ? "..." : `${stats.sprayCount} lần`}
                    </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs">
                    <p className="text-xs font-bold text-slate-400 uppercase">Bón phân</p>
                    <p className="mt-1 text-xl font-black text-emerald-600">
                        {loading ? "..." : `${stats.fertilizeCount} lần`}
                    </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs">
                    <p className="text-xs font-bold text-slate-400 uppercase">Trạng thái vụ</p>
                    <p className="mt-1 text-base font-black text-slate-800 flex items-center gap-1.5">
                        {isSeasonActive ? (
                            <span className="text-emerald-600 font-bold">Đang canh tác</span>
                        ) : (
                            <span className="text-slate-500 font-semibold">Đã đóng sổ</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Thanh công cụ thao tác */}
            <div className="flex items-center justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={exporting || logs.length === 0}
                    onClick={async () => {
                        setExporting(true);
                        try {
                            const { exportCultivationLogsDocx } = await import("@/lib/farmer-docx-export");
                            const farmCode = logs[0]?.farm?.farmCode || "";
                            const regionCode = farmCode ? farmCode.replace(/-F\d+$/, "") : "VN - DNOR - 0269";
                            await exportCultivationLogsDocx({
                                farmName: farmName || logs[0]?.farm?.farmName || "Vườn sầu riêng",
                                regionCode,
                                seasonName: seasonName || logs[0]?.cropSeason?.name || "2025-2026",
                                logs,
                                activityLabels,
                                stageLabels,
                            });
                        } catch (err) {
                            console.error("Export Word error:", err);
                            toast({
                                title: "Lỗi xuất file",
                                description: "Không thể xuất file Word. Vui lòng thử lại.",
                                variant: "destructive",
                            });
                        } finally {
                            setExporting(false);
                        }
                    }}
                    className="rounded-2xl border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                >
                    <FileText className="mr-1.5 h-4 w-4 text-blue-600" />
                    {exporting ? "Đang xuất..." : "Xuất file"}
                </Button>

                {!isSeasonActive ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 shrink-0">
                            <span>🔒 Vụ mùa đã đóng (Chế độ chỉ xem)</span>
                        </div>
                        {onReopenSeason && (
                            <Button
                                type="button"
                                onClick={onReopenSeason}
                                className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs sm:text-sm font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 shrink-0 cursor-pointer"
                            >
                                <Unlock className="mr-1.5 h-4 w-4 text-emerald-600" />
                                Mở khóa vụ mùa
                            </Button>
                        )}
                    </div>
                ) : (
                    <Button
                        asChild
                        className="rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-soft hover:bg-brand-700 shrink-0"
                    >
                        <Link href={newLogUrl}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            Ghi nhật ký
                        </Link>
                    </Button>
                )}
            </div>

            {/* Danh sách nhật ký canh tác */}
            <Card className="overflow-hidden rounded-2xl border border-slate-300 shadow-sm bg-white">
                <div aria-live="polite" className="flex justify-end border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500">
                    <span>Tổng cộng: <b>{logs.length}</b> hoạt động</span>
                </div>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                        <p className="text-sm font-medium text-slate-500">Đang tải nhật ký canh tác...</p>
                    </div>
                ) : errorMessage ? (
                    <div className="py-16 text-center text-slate-500">
                        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
                        <b className="text-rose-700 text-base">{errorMessage}</b>
                        <div className="mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void loadLogs()}
                                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                                Thử lại
                            </Button>
                        </div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <Sprout className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <b className="text-slate-800 text-base">
                            Chưa có nhật ký canh tác nào cho vụ mùa này
                        </b>
                        <p className="mt-1 text-xs max-w-sm mx-auto text-slate-400">
                            {isSeasonActive
                                ? "Bấm 'Ghi nhật ký' ở góc trên để ghi chép hoạt động đầu tiên."
                                : "Vụ mùa lịch sử này chưa có ghi chép nhật ký nào."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1045px] table-fixed border-collapse border border-slate-300 text-left text-xs sm:text-sm">
                                <thead className="bg-slate-100/90 text-xs text-slate-700">
                                    <tr>
                                        <th className="w-[100px] border border-slate-300 px-2.5 py-3 font-semibold text-center align-middle whitespace-nowrap">Ngày thực hiện</th>
                                        <th className="w-[150px] border border-slate-300 px-2.5 py-3 font-semibold text-center align-middle whitespace-nowrap">Giai đoạn</th>
                                        <th className="w-[130px] border border-slate-300 px-2.5 py-3 font-semibold text-center align-middle whitespace-nowrap">Hoạt động</th>
                                        <th className="w-[115px] border border-slate-300 px-2.5 py-3 font-semibold text-center align-middle whitespace-nowrap">SV gây hại</th>
                                        <th className="w-[140px] border border-slate-300 px-2.5 py-3 font-semibold text-center align-middle whitespace-nowrap">Vật tư sử dụng</th>
                                        <th className="w-[140px] border border-slate-300 px-2.5 py-3 font-semibold text-center align-middle whitespace-nowrap">Liều lượng</th>
                                        <th className="w-[60px] border border-slate-300 px-1 py-3 font-semibold text-center align-middle whitespace-nowrap">PHI</th>
                                        <th className="w-[130px] border border-slate-300 px-2.5 py-3 font-semibold text-center align-middle whitespace-nowrap">Ghi chú & Ảnh</th>
                                        <th className="w-[80px] border border-slate-300 px-1 py-3 font-semibold text-center align-middle whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {logs.map((log) => {
                                        const activityText =
                                            log.activityType === "OTHER"
                                                ? log.otherActivity || "Khác"
                                                : activityLabels[log.activityType] ?? log.activityType;

                                        return (
                                            <tr
                                                key={log.id}
                                                className="align-top hover:bg-slate-50/70 transition"
                                            >
                                                <td className="border border-slate-200 px-2.5 py-2.5 text-center">
                                                    <span className="font-semibold text-slate-900 block leading-tight whitespace-nowrap text-xs">
                                                        {formatLogDateOnly(log.actionDate)}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5 whitespace-nowrap">
                                                        {formatLogTimeOnly(log.actionDate)}
                                                    </span>
                                                </td>
                                                <td className="border border-slate-200 px-2.5 py-2.5 font-medium text-slate-800 text-xs leading-snug">
                                                    {stageLabels[log.stage] ?? log.stage}
                                                </td>
                                                <td className="border border-slate-200 px-2.5 py-2.5 font-bold text-slate-900 text-xs leading-snug">
                                                    {activityText}
                                                </td>
                                                <td className="border border-slate-200 break-words px-2.5 py-2.5 font-medium text-slate-800 leading-snug">
                                                    {renderPestsDetectedCell(log.pestsDetected, onNavigateToPestBook)}
                                                </td>
                                                <td className="border border-slate-200 break-words px-2.5 py-2.5 font-semibold text-slate-900 leading-snug">
                                                    {log.chemicalName || "—"}
                                                    {log.materialsUsed?.map(m => <span key={m.id} className="mt-1 block text-xs text-slate-500">Xuất kho: {m.quantity.toLocaleString("vi-VN")} {m.unit} · {m.supplyName}</span>)}
                                                </td>
                                                <td className="border border-slate-200 break-words px-2.5 py-2.5 font-medium text-slate-700 leading-snug">
                                                    {log.dosage || "—"}
                                                </td>
                                                <td className="border border-slate-200 px-1 py-2.5 text-center">
                                                    {log.phiDays != null && log.phiDays > 0 ? (
                                                        <span className="inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 whitespace-nowrap">
                                                            {log.phiDays} ngày
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                                <td className="border border-slate-200 break-words px-2.5 py-2.5 text-slate-600">
                                                    <div className="space-y-1">
                                                        {log.notes ? (
                                                            <p className="line-clamp-2 text-[11px] leading-snug text-slate-600" title={log.notes}>
                                                                {log.notes}
                                                            </p>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                        {log.images && log.images.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 pt-0.5">
                                                                {log.images.map((img, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => setPreviewImage(img)}
                                                                        className="relative h-7 w-7 rounded-md overflow-hidden border border-slate-200 group shrink-0"
                                                                        title="Bấm để xem ảnh phóng to"
                                                                    >
                                                                        <img
                                                                            src={img}
                                                                            alt="Thumbnail"
                                                                            className="h-full w-full object-cover group-hover:scale-110 transition"
                                                                        />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="border border-slate-200 whitespace-nowrap px-1 py-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={!isSeasonActive}
                                                            onClick={() => handleOpenEdit(log)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50/60 text-brand-700 hover:bg-brand-100 hover:text-brand-800 disabled:opacity-40 transition"
                                                            title={isSeasonActive ? "Sửa nhật ký" : "Vụ mùa đã đóng"}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={!isSeasonActive}
                                                            onClick={() => handleOpenDelete(log)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40 transition"
                                                            title={isSeasonActive ? "Xóa nhật ký" : "Vụ mùa đã đóng"}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                )}
            </Card>

            {/* Modal chỉnh sửa nhật ký */}
            {editingLog && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget && !submittingAction) {
                                setEditingLog(null);
                            }
                        }}
                    >
                        <div
                            className="my-auto flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4 bg-white">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                        <Pencil className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">Sửa nhật ký canh tác</h3>
                                        <p className="text-xs text-slate-500">Cập nhật thông tin chi tiết nhật ký hoạt động vườn</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={submittingAction}
                                    onClick={() => setEditingLog(null)}
                                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                                {/* Ngày và giờ thực hiện */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Ngày thực hiện <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="date"
                                            required
                                            value={editForm.date}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Giờ thực hiện
                                        </label>
                                        <Input
                                            type="time"
                                            value={editForm.time}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* Giai đoạn & Hoạt động */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Giai đoạn sinh trưởng <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={editForm.stage}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, stage: e.target.value }))}
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                        >
                                            {STAGE_ORDER.map((stg) => (
                                                <option key={stg} value={stg}>
                                                    {stageLabels[stg] ?? stg}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Hoạt động canh tác <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={editForm.activityType}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, activityType: e.target.value }))}
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                        >
                                            {Object.entries(activityLabels).map(([key, label]) => (
                                                <option key={key} value={key}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Nếu chọn hoạt động Khác */}
                                {editForm.activityType === "OTHER" && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Mô tả hoạt động khác <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            required
                                            placeholder="Nhập tên hoạt động..."
                                            value={editForm.otherActivity}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, otherActivity: e.target.value }))}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                )}

                                {/* Vật tư sử dụng & Liều lượng */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Tên phân bón / thuốc BVTV
                                        </label>
                                        <Input
                                            placeholder="Ví dụ: NPK 20-20-15, Anvil 5SC..."
                                            value={editForm.chemicalName}
                                            readOnly={!!editingLog.materialsUsed?.length}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, chemicalName: e.target.value }))}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Liều lượng
                                        </label>
                                        <Input
                                            placeholder="Ví dụ: 500g/gốc, 200ml/phuy..."
                                            value={editForm.dosage}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, dosage: e.target.value }))}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* Thời gian cách ly PHI & Sinh vật gây hại */}
                                {!!editingLog.materialsUsed?.length && <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                                    <p className="text-sm font-semibold">Vật tư liên kết kho</p>
                                    {editingLog.materialsUsed.filter(m => m.transactionId).map(m => <label key={m.id} className="block text-xs font-medium">
                                        {m.supplyName} — Số lượng xuất ({m.unit})
                                        <Input type="number" min="0.000001" step="any" required value={materialQuantities[m.transactionId!] ?? m.quantity} onChange={e => setMaterialQuantities(previous => ({ ...previous, [m.transactionId!]: Number(e.target.value) }))} className="mt-1" />
                                    </label>)}
                                    <p className="text-xs text-slate-500">Ngày và số lượng xuất kho cập nhật cùng nhật ký. Liều lượng pha/bón được ghi riêng.</p>
                                </div>}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Thời gian cách ly (PHI - ngày)
                                        </label>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder="Số ngày cách ly..."
                                            value={editForm.phiDays}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, phiDays: e.target.value }))}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Sinh vật gây hại phát hiện
                                        </label>
                                        <Input
                                            placeholder="Không phát hiện hoặc tên sâu/bệnh..."
                                            value={editForm.pestsDetected}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, pestsDetected: e.target.value }))}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* Ghi chú */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Ghi chú & Nhận xét
                                    </label>
                                    <Textarea
                                        rows={3}
                                        placeholder="Ghi chú chi tiết về thời tiết, tình trạng cây, lưu ý canh tác..."
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                                        className="rounded-xl"
                                    />
                                </div>

                                {/* Tuân thủ GACC */}
                                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="edit-gacc"
                                        checked={editForm.isGACCCompliant}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, isGACCCompliant: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                    />
                                    <label htmlFor="edit-gacc" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                                        Tuân thủ danh mục quản lý xuất khẩu GACC (không dùng hoạt chất cấm)
                                    </label>
                                </div>

                                {/* Ảnh đính kèm */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Ảnh đính kèm ({editForm.images.length})
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {editForm.images.map((img, idx) => (
                                            <div key={idx} className="relative group h-14 w-14 rounded-xl overflow-hidden border border-slate-200">
                                                <img src={img} alt={`Ảnh ${idx + 1}`} className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(idx)}
                                                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition shadow-sm"
                                                    title="Xóa ảnh này"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-500 hover:text-brand-600 transition">
                                            <Plus className="h-5 w-5" />
                                            <span className="text-[10px] font-bold mt-0.5">Thêm</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                                </div>

                                {/* Nút hành động */}
                                <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 sm:px-6 py-3.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={submittingAction}
                                        onClick={() => setEditingLog(null)}
                                        className="rounded-xl"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submittingAction}
                                        className="rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700"
                                    >
                                        {submittingAction ? (
                                            <>
                                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                Đang lưu...
                                            </>
                                        ) : (
                                            "Lưu thay đổi"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Modal xác nhận xóa nhật ký */}
            {deletingLog && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget && !submittingAction) {
                                setDeletingLog(null);
                            }
                        }}
                    >
                        <div
                            className="my-auto w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                    <Trash2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Xác nhận xóa nhật ký</h3>
                                    <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5 text-slate-700">
                                <p>
                                    <span className="font-bold text-slate-500">Ngày thực hiện: </span>
                                    <span className="font-semibold text-slate-900">{formatLogDateTime(deletingLog.actionDate)}</span>
                                </p>
                                <p>
                                    <span className="font-bold text-slate-500">Giai đoạn: </span>
                                    <span className="font-semibold text-slate-900">{stageLabels[deletingLog.stage] ?? deletingLog.stage}</span>
                                </p>
                                <p>
                                    <span className="font-bold text-slate-500">Hoạt động: </span>
                                    <span className="font-bold text-slate-900">
                                        {deletingLog.activityType === "OTHER"
                                            ? deletingLog.otherActivity || "Khác"
                                            : activityLabels[deletingLog.activityType] ?? deletingLog.activityType}
                                    </span>
                                </p>
                                {deletingLog.chemicalName && (
                                    <p>
                                        <span className="font-bold text-slate-500">Vật tư: </span>
                                        <span className="font-semibold text-slate-900">{deletingLog.chemicalName}</span>
                                    </p>
                                )}
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                                Bạn có chắc chắn muốn xóa bản ghi nhật ký canh tác này? Nếu nhật ký có trừ vật tư tự động, hệ thống sẽ hoàn trả số lượng tương ứng về kho.
                            </p>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={submittingAction}
                                    onClick={() => setDeletingLog(null)}
                                    className="rounded-xl"
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    type="button"
                                    disabled={submittingAction}
                                    onClick={handleConfirmDelete}
                                    className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700"
                                >
                                    {submittingAction ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            Đang xóa...
                                        </>
                                    ) : (
                                        "Xác nhận xóa"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Modal phóng to ảnh */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white p-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewImage(null)}
                            className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <img
                            src={previewImage}
                            alt="Ảnh nhật ký phóng to"
                            className="max-h-[85vh] max-w-full rounded-xl object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
