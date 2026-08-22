"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    CloudSun,
    Leaf,
    Bug,
    CalendarPlus,
    LockKeyhole,
    AlertCircle,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeatherJournal } from "@/components/weather/weather-journal";
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
    address?: string | null;
    cropSeasons: FarmSeasonOption[];
}

interface FarmerJournalUnifiedViewProps {
    farms: FarmOption[];
    initialActiveTab: "weather" | "cultivation" | "pests";
    initialFarmId?: string;
    initialSeasonId?: string;
    cultivationContent?: React.ReactNode;
}

export function FarmerJournalUnifiedView({
    farms,
    initialActiveTab = "weather",
    initialFarmId,
    initialSeasonId,
    cultivationContent,
}: FarmerJournalUnifiedViewProps) {
    const router = useRouter();
    const pathname = usePathname();
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

    // 3. Quản lý Tab chính (Thời tiết | Canh tác | Sinh vật gây hại)
    const [activeTab, setActiveTab] = useState<"weather" | "cultivation" | "pests">(initialActiveTab);

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
    const updateUrl = (tab: string, fId: string, sId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        if (fId) params.set("farmId", fId);
        if (sId) params.set("seasonId", sId);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleFarmChange = (fId: string) => {
        setSelectedFarmId(fId);
        const nextFarm = farms.find((f) => f.id === fId);
        const nextActive = nextFarm?.cropSeasons.find((s) => s.status === "ACTIVE") || nextFarm?.cropSeasons[0];
        const nextSeasonId = nextActive?.id || "";
        setSelectedSeasonId(nextSeasonId);
        updateUrl(activeTab, fId, nextSeasonId);
    };

    const handleSeasonChange = (sId: string) => {
        setSelectedSeasonId(sId);
        updateUrl(activeTab, selectedFarmId, sId);
    };

    const handleTabChange = (tab: "weather" | "cultivation" | "pests") => {
        setActiveTab(tab);
        updateUrl(tab, selectedFarmId, selectedSeasonId);
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

    const isSeasonActive = currentSeason?.status === "ACTIVE";

    return (
        <div className="mx-auto w-full max-w-[1800px] space-y-5 px-3 py-5 sm:px-4">
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

                    {/* Chọn Vụ mùa */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Vụ mùa</label>
                        <select
                            value={selectedSeasonId}
                            onChange={(e) => handleSeasonChange(e.target.value)}
                            disabled={!currentFarm || currentFarm.cropSeasons.length === 0}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            {currentFarm?.cropSeasons.map((s) => (
                                <option key={s.id} value={s.id}>
                                    Vụ {s.year}
                                </option>
                            ))}
                            {(!currentFarm || currentFarm.cropSeasons.length === 0) && (
                                <option value="">Chưa có vụ mùa nào</option>
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
                            {currentSeason.startedAt && (
                                <span className="text-slate-500 text-xs">
                                    Bắt đầu: {new Date(currentSeason.startedAt).toLocaleDateString("vi-VN")}
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
                                !currentFarm?.cropSeasons.some((s) => s.status === "ACTIVE") && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setShowCreateSeasonModal(true)}
                                        className="h-8 rounded-xl bg-brand-600 text-xs font-bold text-white hover:bg-brand-700 shadow-soft"
                                    >
                                        <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                                        Bắt đầu vụ mới
                                    </Button>
                                )
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

            {/* ========================================================================= */}
            {/* THANH 3 TAB CHÍNH: THỜI TIẾT | CANH TÁC | SINH VẬT GÂY HẠI */}
            {/* ========================================================================= */}
            <nav className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:gap-2 sm:rounded-3xl sm:p-2" aria-label="Loại nhật ký">
                {[
                    { id: "weather", label: "Thời tiết", icon: CloudSun },
                    { id: "cultivation", label: "Canh tác", icon: Leaf },
                    { id: "pests", label: "Sinh vật gây hại", icon: Bug },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleTabChange(tab.id as any)}
                            className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-bold leading-tight transition sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
                                isActive
                                    ? "bg-brand-600 text-white shadow-soft"
                                    : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* ========================================================================= */}
            {/* NỘI DUNG TỪNG TAB */}
            {/* ========================================================================= */}
            {activeTab === "weather" && (
                <WeatherJournal defaultFarmId={selectedFarmId} />
            )}

            {activeTab === "cultivation" && (
                <CultivationLogsTab
                    farmId={selectedFarmId}
                    cropSeasonId={selectedSeasonId}
                    isSeasonActive={isSeasonActive}
                    farmName={currentFarm?.farmName}
                    seasonName={currentSeason?.name}
                    seasonYear={currentSeason?.year}
                />
            )}

            {activeTab === "pests" && (
                <PestMonitoringTab
                    farmId={selectedFarmId}
                    cropSeasonId={selectedSeasonId}
                    isSeasonActive={isSeasonActive}
                    farmName={currentFarm?.farmName}
                    seasonName={currentSeason?.name}
                />
            )}

            {/* MODAL: BẮT ĐẦU VỤ MÙA MỚI */}
            {showCreateSeasonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
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
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Năm vụ mùa *</label>
                                    <input
                                        type="number"
                                        min={2020}
                                        max={2100}
                                        required
                                        value={newSeasonForm.targetYear}
                                        onChange={(e) => setNewSeasonForm({ ...newSeasonForm, targetYear: Number(e.target.value) })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
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
