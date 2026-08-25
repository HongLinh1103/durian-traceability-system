"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
    Leaf,
    Plus,
    Search,
    Sprout,
    Image as ImageIcon,
    Loader2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export interface FarmingLogItem {
    id: string;
    farmId?: string;
    cropSeasonId?: string | null;
    actionDate: string;
    stage: string;
    activityType: string;
    otherActivity?: string | null;
    chemicalName?: string | null;
    dosage?: string | null;
    phiDays?: number | null;
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
}

export function CultivationLogsTab({
    farmId,
    cropSeasonId,
    isSeasonActive = true,
    farmName,
    seasonName,
    seasonYear,
}: CultivationLogsTabProps) {
    const [logs, setLogs] = useState<FarmingLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStage, setSelectedStage] = useState<string>("ALL");
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Tải danh sách nhật ký canh tác theo Farm và CropSeason
    const loadLogs = useCallback(async () => {
        setLoading(true);
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
                setLogs([]);
            }
        } catch (err) {
            console.error("Lỗi khi tải nhật ký canh tác:", err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [farmId, cropSeasonId]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    // Reset bộ lọc khi đổi mùa vụ
    useEffect(() => {
        setSelectedStage("ALL");
        setSearchQuery("");
    }, [cropSeasonId, farmId]);

    // Lọc theo tìm kiếm và giai đoạn
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            // Lọc giai đoạn
            if (selectedStage !== "ALL" && log.stage !== selectedStage) {
                return false;
            }
            // Lọc từ khóa
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const actName = (
                    log.activityType === "OTHER"
                        ? log.otherActivity || "Khác"
                        : activityLabels[log.activityType] ?? log.activityType
                ).toLowerCase();
                const stageName = (stageLabels[log.stage] ?? log.stage).toLowerCase();
                const chem = (log.chemicalName || "").toLowerCase();
                const notes = (log.notes || "").toLowerCase();
                const farmText = (log.farm?.farmName || "").toLowerCase();

                return (
                    actName.includes(q) ||
                    stageName.includes(q) ||
                    chem.includes(q) ||
                    notes.includes(q) ||
                    farmText.includes(q)
                );
            }
            return true;
        });
    }, [logs, selectedStage, searchQuery]);

    // Thống kê nhanh
    const stats = useMemo(() => {
        const total = logs.length;
        const sprayOrFertilize = logs.filter((l) =>
            ["SPRAY_PESTICIDE", "FERTILIZE", "BASE_FERTILIZING", "FOLIAR_FERTILIZING"].includes(
                l.activityType
            )
        ).length;
        const gaccCompliantCount = logs.filter((l) => l.isGACCCompliant).length;
        const gaccRate = total > 0 ? Math.round((gaccCompliantCount / total) * 100) : 100;

        // Đếm theo từng giai đoạn
        const stageCounts: Record<string, number> = {};
        logs.forEach((l) => {
            stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1;
        });

        return { total, sprayOrFertilize, gaccRate, stageCounts };
    }, [logs]);

    const newLogUrl = farmId
        ? `/dashboard/farmer/logs/new?farmId=${farmId}${
              cropSeasonId ? `&seasonId=${cropSeasonId}` : ""
          }`
        : "/dashboard/farmer/logs/new";

    return (
        <div className="w-full space-y-5">
            {/* Header đồng bộ với các tab */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Leaf className="h-6 w-6 text-brand-600" />
                        NHẬT KÝ CANH TÁC
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Ghi chép các hoạt động chăm sóc, bón phân, tưới nước, tỉa cành và thu hoạch theo tiêu chuẩn VietGAP / GACC
                    </p>
                </div>

                {!isSeasonActive ? (
                    <div className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 shrink-0">
                        <span>🔒 Vụ mùa đã đóng (Chế độ chỉ xem)</span>
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

            {/* Thống kê tóm tắt nhanh vụ mùa */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs">
                    <p className="text-xs font-bold text-slate-400 uppercase">Tổng hoạt động</p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                        {loading ? "..." : `${stats.total} lượt`}
                    </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs">
                    <p className="text-xs font-bold text-slate-400 uppercase">Phun thuốc / Bón phân</p>
                    <p className="mt-1 text-xl font-black text-amber-600">
                        {loading ? "..." : `${stats.sprayOrFertilize} lần`}
                    </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs">
                    <p className="text-xs font-bold text-slate-400 uppercase">Tuân thủ GACC/VietGAP</p>
                    <p className="mt-1 text-xl font-black text-emerald-600">
                        {loading ? "..." : `${stats.gaccRate}%`}
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

            {/* Thanh tìm kiếm & lọc giai đoạn */}
            <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm theo hoạt động, tên vật tư, ghi chú..."
                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="text-xs font-semibold text-slate-500">
                        Hiển thị <b>{filteredLogs.length}</b> / {logs.length} hoạt động
                    </div>
                </div>

                {/* Filter chips theo giai đoạn sinh trưởng */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setSelectedStage("ALL")}
                        className={`whitespace-nowrap rounded-full px-3.5 py-1.5 font-bold transition ${
                            selectedStage === "ALL"
                                ? "bg-brand-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        Tất cả ({logs.length})
                    </button>

                    {STAGE_ORDER.map((st) => {
                        const count = stats.stageCounts[st] || 0;
                        if (count === 0 && selectedStage !== st) return null;
                        const label = stageLabels[st] ?? st;
                        const isSelected = selectedStage === st;
                        return (
                            <button
                                key={st}
                                type="button"
                                onClick={() => setSelectedStage(st)}
                                className={`whitespace-nowrap rounded-full px-3 py-1.5 font-bold transition flex items-center gap-1.5 ${
                                    isSelected
                                        ? "bg-brand-600 text-white shadow-xs"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <span>{label}</span>
                                <span
                                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                                        isSelected
                                            ? "bg-white/20 text-white"
                                            : "bg-slate-100 text-slate-600"
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Danh sách nhật ký canh tác */}
            <Card className="overflow-hidden rounded-[28px] border-slate-200 shadow-sm bg-white">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                        <p className="text-sm font-medium text-slate-500">Đang tải nhật ký canh tác...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <Sprout className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <b className="text-slate-800 text-base">
                            {logs.length === 0
                                ? "Chưa có nhật ký canh tác nào cho vụ mùa này"
                                : "Không tìm thấy nhật ký phù hợp với bộ lọc"}
                        </b>
                        <p className="mt-1 text-xs max-w-sm mx-auto text-slate-400">
                            {logs.length === 0
                                ? isSeasonActive
                                    ? "Bấm 'Ghi nhật ký' ở góc trên để ghi chép hoạt động đầu tiên."
                                    : "Vụ mùa lịch sử này chưa có ghi chép nhật ký nào."
                                : "Thử đổi từ khóa tìm kiếm hoặc chọn 'Tất cả' giai đoạn để xem toàn bộ."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="space-y-3 p-3.5 md:hidden">
                            {filteredLogs.map((log) => {
                                const activityText =
                                    log.activityType === "OTHER"
                                        ? log.otherActivity || "Khác"
                                        : activityLabels[log.activityType] ?? log.activityType;

                                return (
                                    <article
                                        key={log.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <span className="text-xs font-bold text-slate-500">
                                                {formatVietnameseDateTime(log.actionDate)}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800">
                                                {stageLabels[log.stage] ?? log.stage}
                                            </span>
                                        </div>

                                        <dl className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <dt className="text-slate-400">Hoạt động</dt>
                                                <dd className="mt-0.5 font-bold text-slate-900">
                                                    {activityText}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-slate-400">Cách ly (PHI)</dt>
                                                <dd className="mt-0.5 font-semibold text-slate-700">
                                                    {log.phiDays != null && log.phiDays > 0 ? `${log.phiDays} ngày` : "—"}
                                                </dd>
                                            </div>

                                            {log.chemicalName && (
                                                <div className="col-span-2">
                                                    <dt className="text-slate-400">Vật tư sử dụng</dt>
                                                    <dd className="mt-0.5 font-semibold text-slate-900">
                                                        {log.chemicalName}
                                                    </dd>
                                                </div>
                                            )}

                                            {log.dosage && (
                                                <div className="col-span-2">
                                                    <dt className="text-slate-400">Liều lượng</dt>
                                                    <dd className="mt-0.5 font-semibold text-slate-900">
                                                        {log.dosage}
                                                    </dd>
                                                </div>
                                            )}

                                            {log.notes && (
                                                <div className="col-span-2">
                                                    <dt className="text-slate-400">Ghi chú</dt>
                                                    <dd className="mt-0.5 text-slate-600 leading-relaxed">
                                                        {log.notes}
                                                    </dd>
                                                </div>
                                            )}

                                            {log.images && log.images.length > 0 && (
                                                <div className="col-span-2 pt-1">
                                                    <dt className="text-slate-400 mb-1.5 flex items-center gap-1">
                                                        <ImageIcon className="h-3.5 w-3.5" />
                                                        Ảnh đính kèm ({log.images.length})
                                                    </dt>
                                                    <div className="flex flex-wrap gap-2">
                                                        {log.images.map((img, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => setPreviewImage(img)}
                                                                className="relative h-14 w-14 rounded-xl overflow-hidden border border-slate-200 group"
                                                            >
                                                                <img
                                                                    src={img}
                                                                    alt={`Ảnh ${idx + 1}`}
                                                                    className="h-full w-full object-cover group-hover:scale-105 transition"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </dl>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[1060px] table-fixed text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600 border-b border-slate-200">
                                    <tr>
                                        <th className="w-44 px-4 py-3.5">Ngày thực hiện</th>
                                        <th className="w-48 px-4 py-3.5">Giai đoạn</th>
                                        <th className="w-48 px-4 py-3.5">Hoạt động</th>
                                        <th className="w-52 px-4 py-3.5">Vật tư sử dụng</th>
                                        <th className="w-32 px-4 py-3.5">Liều lượng</th>
                                        <th className="w-24 px-3 py-3.5">PHI</th>
                                        <th className="px-4 py-3.5">Ghi chú & Ảnh</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.map((log) => {
                                        const activityText =
                                            log.activityType === "OTHER"
                                                ? log.otherActivity || "Khác"
                                                : activityLabels[log.activityType] ?? log.activityType;

                                        return (
                                            <tr
                                                key={log.id}
                                                className="align-top hover:bg-slate-50/80 transition"
                                            >
                                                <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900 text-xs">
                                                    {formatVietnameseDateTime(log.actionDate)}
                                                </td>
                                                <td className="break-words px-4 py-4 font-semibold text-slate-800 text-xs leading-5">
                                                    {stageLabels[log.stage] ?? log.stage}
                                                </td>
                                                <td className="break-words px-4 py-4 font-bold text-slate-900 text-sm">
                                                    {activityText}
                                                </td>
                                                <td className="break-words px-4 py-4 text-xs font-semibold text-slate-900">
                                                    {log.chemicalName || "—"}
                                                </td>
                                                <td className="break-words px-4 py-4 text-xs font-medium text-slate-700">
                                                    {log.dosage || "—"}
                                                </td>
                                                <td className="px-3 py-4 text-xs font-semibold text-slate-700">
                                                    {log.phiDays != null && log.phiDays > 0 ? (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                                            {log.phiDays} ngày
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="break-words px-4 py-4 text-xs text-slate-600">
                                                    <div className="space-y-1.5">
                                                        <p className="whitespace-pre-wrap">{log.notes || "—"}</p>
                                                        {log.images && log.images.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                                {log.images.map((img, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => setPreviewImage(img)}
                                                                        className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 group"
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
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            {/* Modal phóng to ảnh */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
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
