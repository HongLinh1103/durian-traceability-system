"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    CalendarPlus,
    LockKeyhole,
    Unlock,
    AlertCircle,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PestMonitoringTab } from "@/components/farmer/pest-monitoring-tab";
import { CultivationLogsTab } from "@/components/farmer/cultivation-logs-tab";

const STAGES = [
    ["POST_HARVEST_RECOVERY", "Phục hồi sau thu hoạch"],
    ["MAKING_SPROUT", "Làm đọt"],
    ["FLOWER_INDUCTION", "Xử lý ra hoa"],
    ["FLOWERING", "Ra hoa"],
    ["FRUIT_SETTING", "Đậu trái"],
    ["FRUIT_GROWING", "Nuôi trái"],
    ["PRE_HARVEST", "Trước thu hoạch"],
    ["HARVEST", "Thu hoạch"],
] as const;

interface FarmSeasonOption {
    id: string;
    name: string;
    year: number;
    status: string;
    startedAt?: string | null;
    closedAt?: string | null;
    startingStage?: string | null;
    farmingLogs?: Array<{ stage: string }>;
}

interface FarmOption {
    id: string;
    farmName: string;
    farmCode: string;
    regionCode?: string | null;
    regionName?: string | null;
    address?: string | null;
    cropSeasons: FarmSeasonOption[];
}

interface FarmerJournalUnifiedViewProps {
    farms: FarmOption[];
    pageKind: "cultivation" | "pests";
    initialFarmId?: string;
    initialSeasonId?: string;
}

export function FarmerJournalUnifiedView({
    farms,
    pageKind = "cultivation",
    initialFarmId,
    initialSeasonId,
}: FarmerJournalUnifiedViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 1. Quản lý Vườn được chọn
    const [selectedFarmId, setSelectedFarmId] = useState<string>(() => {
        if (initialFarmId && farms.some((f) => f.id === initialFarmId)) {
            return initialFarmId;
        }
        return farms[0]?.id || "";
    });

    const currentFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

    // 2. Quản lý Vụ mùa được chọn
    const activeSeason = currentFarm?.cropSeasons.find((s) => s.status === "ACTIVE");
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>(() => {
        if (initialSeasonId && currentFarm?.cropSeasons.some((s) => s.id === initialSeasonId)) {
            return initialSeasonId;
        }
        return activeSeason?.id || currentFarm?.cropSeasons[0]?.id || "";
    });

    const currentSeason = currentFarm?.cropSeasons.find((s) => s.id === selectedSeasonId) || activeSeason || currentFarm?.cropSeasons[0];

    const pagePath = pageKind === "pests" ? "/dashboard/farmer/pest-monitoring" : "/dashboard/farmer/journal/cultivation";

    // Modal tạo vụ mùa mới
    const [showCreateSeasonModal, setShowCreateSeasonModal] = useState(false);
    const [creatingSeason, setCreatingSeason] = useState(false);
    const [newSeasonForm, setNewSeasonForm] = useState({
        targetYear: new Date().getFullYear(),
        startedAt: new Date().toISOString().slice(0, 10),
        startingStage: "POST_HARVEST_RECOVERY",
        notes: "",
    });

    // Modal đóng vụ mùa
    const [showCloseSeasonModal, setShowCloseSeasonModal] = useState(false);
    const [closingSeason, setClosingSeason] = useState(false);
    const [closingNote, setClosingNote] = useState("");

    // Cập nhật URL khi đổi Farm, Season hoặc Tab
    const updateUrl = (fId: string, sId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tab");
        if (fId) params.set("farmId", fId); else params.delete("farmId");
        if (sId) params.set("seasonId", sId); else params.delete("seasonId");
        router.replace(`${pagePath}?${params.toString()}`, { scroll: false });
    };

    const handleFarmChange = (fId: string) => {
        setSelectedFarmId(fId);
        const nextFarm = farms.find((f) => f.id === fId);
        const nextActive = nextFarm?.cropSeasons.find((s) => s.status === "ACTIVE") || nextFarm?.cropSeasons[0];
        const nextSeasonId = nextActive?.id || "";
        setSelectedSeasonId(nextSeasonId);
        updateUrl(fId, nextSeasonId);
    };

    const handleSeasonChange = (sId: string) => {
        setSelectedSeasonId(sId);
        updateUrl(selectedFarmId, sId);
    };

    // Tạo Vụ mùa mới
    const handleCreateSeason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFarmId) return;
        setCreatingSeason(true);
        try {
            const res = await fetch("/api/crop-seasons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "CREATE",
                    farmId: selectedFarmId,
                    targetYear: Number(newSeasonForm.targetYear),
                    startedAt: newSeasonForm.startedAt,
                    startingStage: newSeasonForm.startingStage,
                    notes: newSeasonForm.notes || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setShowCreateSeasonModal(false);
                router.refresh();
            } else {
                alert(data.message || "Không thể bắt đầu vụ mùa mới.");
            }
        } finally {
            setCreatingSeason(false);
        }
    };

    // Đóng Vụ mùa hiện tại
    const handleCloseSeason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSeason?.id) return;
        setClosingSeason(true);
        try {
            const res = await fetch("/api/crop-seasons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "CLOSE",
                    seasonId: currentSeason.id,
                    closingNote: closingNote || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setShowCloseSeasonModal(false);
                setClosingNote("");
                router.refresh();
            } else {
                alert(data.message || "Không thể đóng vụ mùa.");
            }
        } finally {
            setClosingSeason(false);
        }
    };

    // Mở khóa vụ mùa
    const [reopeningSeason, setReopeningSeason] = useState(false);
    const handleReopenSeason = async (seasonId?: string) => {
        const targetId = seasonId || selectedSeasonId;
        if (!targetId) return;
        const targetSeason = currentFarm?.cropSeasons.find((s) => s.id === targetId) || currentSeason;
        const name = targetSeason ? (targetSeason.name ? (targetSeason.name.startsWith("Niên vụ") ? targetSeason.name : `Niên vụ ${targetSeason.name}`) : `Niên vụ ${targetSeason.year - 1}-${targetSeason.year}`) : "vụ mùa";

        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn mở khóa lại ${name} để tiếp tục ghi nhật ký canh tác?`
        );
        if (!confirmed) return;

        setReopeningSeason(true);
        try {
            const res = await fetch("/api/crop-seasons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "REOPEN",
                    seasonId: targetId,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                router.refresh();
            } else {
                alert(data.message || "Không thể mở khóa vụ mùa.");
            }
        } catch (err) {
            console.error("handleReopenSeason error:", err);
            alert("Lỗi kết nối khi mở khóa vụ mùa.");
        } finally {
            setReopeningSeason(false);
        }
    };

    const isSeasonActive = currentSeason?.status === "ACTIVE";

    return (
        <div className="mx-auto w-full max-w-[1800px] space-y-5 px-3 py-5 sm:px-4">
            <header><h1 className="text-2xl font-black text-slate-900">{pageKind === "pests" ? "SỔ THEO DÕI SINH VẬT GÂY HẠI" : "NHẬT KÝ CANH TÁC"}</h1><p className="mt-1 text-sm text-slate-500">{pageKind === "pests" ? "Theo dõi kiểm tra, bẫy và biện pháp xử lý sinh vật gây hại theo từng vườn, niên vụ." : "Ghi nhận và quản lý các hoạt động canh tác theo từng vườn, niên vụ."}</p></header>
            {/* ========================================================================= */}
            {/* HEADER DÙNG CHUNG: VƯỜN & VỤ MÙA */}
            {/* ========================================================================= */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Chọn Vườn */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Vườn trồng</label>
                        <select
                            value={selectedFarmId}
                            onChange={(e) => handleFarmChange(e.target.value)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none"
                        >
                            {farms.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.farmName} ({f.farmCode})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chọn Niên vụ */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Niên vụ</label>
                        <select
                            value={selectedSeasonId}
                            onChange={(e) => handleSeasonChange(e.target.value)}
                            disabled={!currentFarm || currentFarm.cropSeasons.length === 0}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            {currentFarm?.cropSeasons.map((s) => {
                                const cleanName = s.name ? s.name.replace(/^Niên vụ\s*/, "") : `${s.year - 1}-${s.year}`;
                                return (
                                    <option key={s.id} value={s.id}>
                                        {cleanName}
                                    </option>
                                );
                            })}
                            {(!currentFarm || currentFarm.cropSeasons.length === 0) && (
                                <option value="">Chưa có niên vụ nào</option>
                            )}
                        </select>
                    </div>
                </div>

                {/* Trạng thái Vụ mùa hiện tại */}
                {currentSeason ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs sm:text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            {isSeasonActive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Đang canh tác
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                                    Đã đóng
                                </span>
                            )}
                            {!isSeasonActive && (
                                <span className="text-slate-400 text-xs italic">
                                    (Vụ mùa lịch sử - Chế độ chỉ xem)
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {isSeasonActive ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCloseSeasonModal(true)}
                                    className="h-8 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-red-600"
                                >
                                    <LockKeyhole className="mr-1 h-3.5 w-3.5 text-slate-500" />
                                    Đóng vụ
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={reopeningSeason}
                                        onClick={() => handleReopenSeason(currentSeason?.id)}
                                        className="h-8 rounded-xl border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs"
                                    >
                                        <Unlock className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                        {reopeningSeason ? "Đang mở khóa..." : "Mở khóa vụ mùa"}
                                    </Button>

                                    {!currentFarm?.cropSeasons.some((s) => s.status === "ACTIVE") && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => setShowCreateSeasonModal(true)}
                                            className="h-8 rounded-xl bg-brand-600 text-xs font-bold text-white hover:bg-brand-700 shadow-soft"
                                        >
                                            <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                                            Bắt đầu vụ mới
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs sm:text-sm text-amber-900">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                            <span>
                                Vườn <b>{currentFarm?.farmName}</b> hiện chưa có vụ mùa nào đang hoạt động.
                            </span>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowCreateSeasonModal(true)}
                            className="rounded-xl bg-amber-600 text-xs font-bold text-white hover:bg-amber-700"
                        >
                            <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                            Bắt đầu vụ mùa mới
                        </Button>
                    </div>
                )}
            </div>

            {pageKind === "cultivation" && (
                <CultivationLogsTab
                    farmId={selectedFarmId}
                    cropSeasonId={selectedSeasonId}
                    isSeasonActive={isSeasonActive}
                    farmName={currentFarm?.farmName}
                    seasonName={currentSeason?.name}
                    seasonYear={currentSeason?.year}
                    onReopenSeason={() => handleReopenSeason(currentSeason?.id)}
                    onNavigateToPestBook={(pestName) => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("tab");
                        if (selectedFarmId) params.set("farmId", selectedFarmId);
                        if (selectedSeasonId) params.set("seasonId", selectedSeasonId);
                        params.set("pest", pestName);
                        router.push(`/dashboard/farmer/pest-monitoring?${params.toString()}`, { scroll: false });
                    }}
                />
            )}

            {pageKind === "pests" && (
                <PestMonitoringTab
                    farmId={selectedFarmId}
                    cropSeasonId={selectedSeasonId}
                    isSeasonActive={isSeasonActive}
                    farmName={currentFarm?.farmName}
                    farmAddress={currentFarm?.address || undefined}
                    regionCode={currentFarm?.regionCode || undefined}
                    regionName={currentFarm?.regionName || undefined}
                    seasonName={currentSeason?.name}
                    seasonYear={currentSeason?.year}
                    onReopenSeason={() => handleReopenSeason(currentSeason?.id)}
                    initialSelectedPestName={searchParams.get("pest")}
                    onNavigateToCultivation={(logId) => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("tab");
                        params.delete("pest");
                        if (selectedFarmId) params.set("farmId", selectedFarmId);
                        if (selectedSeasonId) params.set("seasonId", selectedSeasonId);
                        if (logId) params.set("logId", logId);
                        router.push(`/dashboard/farmer/journal/cultivation?${params.toString()}`, { scroll: false });
                    }}
                />
            )}

            {/* MODAL: BẮT ĐẦU VỤ MÙA MỚI */}
            {showCreateSeasonModal && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-lg">Bắt đầu vụ mùa mới</h3>
                            <button type="button" onClick={() => setShowCreateSeasonModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSeason} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Vườn</label>
                                <input value={currentFarm?.farmName || ""} disabled className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Năm bắt đầu niên vụ *</label>
                                    <input
                                        type="number"
                                        min={2020}
                                        max={2100}
                                        required
                                        value={newSeasonForm.targetYear}
                                        onChange={(e) => setNewSeasonForm({ ...newSeasonForm, targetYear: Number(e.target.value) })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                    <p className="mt-1 text-[11px] text-slate-400 font-medium">
                                        Niên vụ {newSeasonForm.targetYear}-{Number(newSeasonForm.targetYear) + 1}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Ngày bắt đầu *</label>
                                    <input
                                        type="date"
                                        required
                                        value={newSeasonForm.startedAt}
                                        onChange={(e) => setNewSeasonForm({ ...newSeasonForm, startedAt: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Giai đoạn bắt đầu</label>
                                <select
                                    value={newSeasonForm.startingStage}
                                    onChange={(e) => setNewSeasonForm({ ...newSeasonForm, startingStage: e.target.value })}
                                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none"
                                >
                                    {STAGES.map(([val, label]) => (
                                        <option key={val} value={val}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú</label>
                                <textarea
                                    rows={2}
                                    placeholder="Ghi chú mục tiêu sản lượng, định hướng VietGAP/GACC..."
                                    value={newSeasonForm.notes}
                                    onChange={(e) => setNewSeasonForm({ ...newSeasonForm, notes: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateSeasonModal(false)}
                                    className="flex-1 rounded-2xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={creatingSeason}
                                    className="flex-1 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft"
                                >
                                    {creatingSeason ? "Đang tạo..." : "Bắt đầu vụ mùa"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ĐÓNG VỤ MÙA */}
            {showCloseSeasonModal && (
                <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2 text-slate-900">
                                <LockKeyhole className="h-5 w-5 text-red-600" />
                                <h3 className="font-bold text-lg">Đóng vụ mùa {currentSeason?.name}</h3>
                            </div>
                            <button type="button" onClick={() => setShowCloseSeasonModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCloseSeason} className="space-y-3.5">
                            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 leading-relaxed">
                                <p className="font-bold">Lưu ý khi đóng vụ mùa:</p>
                                <p className="mt-1">
                                    Vụ mùa <b>{currentSeason?.name}</b> của vườn <b>{currentFarm?.farmName}</b> sẽ được chuyển sang trạng thái <b>[Đã đóng]</b>. Sau khi đóng, bạn có thể bắt đầu vụ mùa mới để tiếp tục ghi chép.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú tổng kết vụ (Tùy chọn)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Đánh giá năng suất, hiệu quả, chi phí hoặc lý do đóng vụ..."
                                    value={closingNote}
                                    onChange={(e) => setClosingNote(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCloseSeasonModal(false)}
                                    className="flex-1 rounded-2xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={closingSeason}
                                    className="flex-1 rounded-2xl bg-red-600 text-white hover:bg-red-700 shadow-soft"
                                >
                                    {closingSeason ? "Đang xử lý..." : "Xác nhận đóng vụ"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
