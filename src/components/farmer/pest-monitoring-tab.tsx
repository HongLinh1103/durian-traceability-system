"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Bug,
    Plus,
    Search,
    ArrowLeft,
    Eye,
    Crosshair,
    Activity,
    ShieldAlert,
    Loader2,
    X,
    Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PestMonitoringTabProps {
    farmId?: string;
    cropSeasonId?: string;
    isSeasonActive?: boolean;
    farmName?: string;
    seasonName?: string;
}

interface PestBookSummary {
    id: string;
    pestName: string;
    scientificName?: string | null;
    trapType: string;
    attractant?: string | null;
    startDate: string;
    checkFrequencyDays: number;
    status: "ACTIVE" | "CLOSED";
    notes?: string | null;
    farm?: { id: string; farmName: string; farmCode: string };
    cropSeason?: { id: string; name: string; year: number; status: string };
    trapsCount: number;
    inspectionsCount: number;
    treatmentsCount: number;
    latestInspection?: {
        id: string;
        inspectionDate: string;
        totalPestsCount: number;
        densityLevel?: string | null;
        actionNeeded: boolean;
    } | null;
}

interface TrapItem {
    id: string;
    trapCode: string;
    trapType: string;
    locationName: string;
    latitude?: number | null;
    longitude?: number | null;
    installedDate: string;
    status: "ACTIVE" | "INACTIVE" | "DAMAGED";
    notes?: string | null;
}

interface InspectionItem {
    id: string;
    inspectionDate: string;
    inspectorName: string;
    totalPestsCount: number;
    densityLevel?: string | null;
    weatherCondition?: string | null;
    actionNeeded: boolean;
    actionNote?: string | null;
    images?: string[];
    notes?: string | null;
    items?: Array<{
        id: string;
        trapId: string;
        pestsCount: number;
        baitStatus?: string | null;
        notes?: string | null;
        trap?: {
            trapCode: string;
            trapType?: string;
            locationName: string;
            latitude?: number | null;
            longitude?: number | null;
        };
    }>;
}

interface TreatmentItem {
    id: string;
    treatmentDate: string;
    treatmentType: string;
    productUsed?: string | null;
    dosage?: string | null;
    areaTreated?: string | null;
    resultNotes?: string | null;
    notes?: string | null;
}

interface BookDetailData extends PestBookSummary {
    traps: TrapItem[];
    inspections: InspectionItem[];
    treatments: TreatmentItem[];
    summary: {
        trapsCount: number;
        activeTrapsCount: number;
        inspectionsCount: number;
        totalPestsDetected: number;
        lastInspectionDate?: string | null;
        lastPestDetectedDate?: string | null;
        treatmentsCount: number;
    };
}

export function PestMonitoringTab({
    farmId,
    cropSeasonId,
    isSeasonActive = true,
}: PestMonitoringTabProps) {
    const [books, setBooks] = useState<PestBookSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "CLOSED">("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Selected Book Detail View
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [bookDetail, setBookDetail] = useState<BookDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modals
    const [showCreateBookModal, setShowCreateBookModal] = useState(false);
    const [showAddTrapModal, setShowAddTrapModal] = useState(false);
    const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
    const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form: Create Book
    const [createBookForm, setCreateBookForm] = useState({
        pestName: "",
        scientificName: "",
        trapType: "Bẫy lồng",
        attractant: "Pheromone Methyl Eugenol",
        checkFrequencyDays: 7,
        startDate: new Date().toISOString().split("T")[0],
        notes: "",
        trap1Code: "BAY-01",
        trap1Location: "Khu A",
        trap2Code: "BAY-02",
        trap2Location: "Khu B",
    });

    // Form: Add Trap
    const [trapForm, setTrapForm] = useState({
        trapCode: "",
        trapType: "Bẫy lồng",
        locationName: "",
        latitude: "",
        longitude: "",
        installedDate: new Date().toISOString().split("T")[0],
        status: "ACTIVE",
        notes: "",
    });

    // Form: Add Inspection
    const [inspectionForm, setInspectionForm] = useState({
        inspectionDate: new Date().toISOString().split("T")[0],
        inspectorName: "",
        weatherCondition: "Nắng ráo",
        actionNeeded: false,
        actionNote: "",
        notes: "",
        trapCounts: {} as Record<string, number>,
        trapBaits: {} as Record<string, string>,
    });

    // Form: Add Treatment
    const [treatmentForm, setTreatmentForm] = useState({
        treatmentDate: new Date().toISOString().split("T")[0],
        treatmentType: "Phun bả Protein sinh học",
        productUsed: "",
        dosage: "",
        areaTreated: "Toàn vườn",
        resultNotes: "",
    });

    // Load Books List
    const loadBooks = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (farmId) params.set("farmId", farmId);
            if (cropSeasonId) params.set("cropSeasonId", cropSeasonId);
            if (statusFilter !== "ALL") params.set("status", statusFilter);

            const res = await fetch(`/api/farmer/pest-monitoring?${params.toString()}`, { cache: "no-store" });
            if (res.ok) {
                const json = await res.json();
                setBooks(json.data || []);
            }
        } catch (err) {
            console.error("Error loading pest books:", err);
            setBooks([]);
        } finally {
            setLoading(false);
        }
    }, [farmId, cropSeasonId, statusFilter]);

    // Reset khi thay đổi vườn hoặc mùa vụ
    useEffect(() => {
        setSelectedBookId(null);
        setBookDetail(null);
        setStatusFilter("ALL");
        setSearchQuery("");
    }, [farmId, cropSeasonId]);

    useEffect(() => {
        if (!selectedBookId) {
            void loadBooks();
        }
    }, [loadBooks, selectedBookId]);

    // Load Single Book Detail
    const loadBookDetail = useCallback(async (id: string) => {
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/farmer/pest-monitoring/${id}`, { cache: "no-store" });
            if (res.ok) {
                const json = await res.json();
                setBookDetail(json.data);
                // Pre-populate inspection trap counts
                const initialCounts: Record<string, number> = {};
                const initialBaits: Record<string, string> = {};
                json.data.traps.forEach((t: TrapItem) => {
                    initialCounts[t.id] = 0;
                    initialBaits[t.id] = "Mồi còn tốt";
                });
                setInspectionForm((prev) => ({
                    ...prev,
                    trapCounts: initialCounts,
                    trapBaits: initialBaits,
                }));
            }
        } catch (err) {
            console.error("Error loading book detail:", err);
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    const handleSelectBook = (id: string) => {
        setSelectedBookId(id);
        void loadBookDetail(id);
    };

    const handleBackToList = () => {
        setSelectedBookId(null);
        setBookDetail(null);
        void loadBooks();
    };

    // Submit: Create Book
    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!farmId || !cropSeasonId) {
            alert("Vui lòng chọn Vườn và Vụ mùa trước khi tạo sổ theo dõi.");
            return;
        }
        setSubmitting(true);
        try {
            const initialTraps = [];
            if (createBookForm.trap1Code && createBookForm.trap1Location) {
                initialTraps.push({
                    trapCode: createBookForm.trap1Code.trim(),
                    trapType: createBookForm.trapType,
                    locationName: createBookForm.trap1Location.trim(),
                });
            }
            if (createBookForm.trap2Code && createBookForm.trap2Location) {
                initialTraps.push({
                    trapCode: createBookForm.trap2Code.trim(),
                    trapType: createBookForm.trapType,
                    locationName: createBookForm.trap2Location.trim(),
                });
            }

            const res = await fetch("/api/farmer/pest-monitoring", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    farmId,
                    cropSeasonId,
                    pestName: createBookForm.pestName,
                    scientificName: createBookForm.scientificName || null,
                    trapType: createBookForm.trapType,
                    attractant: createBookForm.attractant || null,
                    checkFrequencyDays: Number(createBookForm.checkFrequencyDays),
                    startDate: createBookForm.startDate,
                    notes: createBookForm.notes || null,
                    initialTraps,
                }),
            });

            if (res.ok) {
                setShowCreateBookModal(false);
                setCreateBookForm({
                    pestName: "",
                    scientificName: "",
                    trapType: "Bẫy lồng",
                    attractant: "Pheromone Methyl Eugenol",
                    checkFrequencyDays: 7,
                    startDate: new Date().toISOString().split("T")[0],
                    notes: "",
                    trap1Code: "BAY-01",
                    trap1Location: "Khu A",
                    trap2Code: "BAY-02",
                    trap2Location: "Khu B",
                });
                await loadBooks();
            } else {
                const json = await res.json();
                alert(json.message || "Không thể tạo sổ theo dõi.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Submit: Add Trap
    const handleAddTrap = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBookId) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/farmer/pest-monitoring/${selectedBookId}/traps`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...trapForm,
                    latitude: trapForm.latitude ? Number(trapForm.latitude) : null,
                    longitude: trapForm.longitude ? Number(trapForm.longitude) : null,
                }),
            });
            if (res.ok) {
                setShowAddTrapModal(false);
                setTrapForm({
                    trapCode: "",
                    trapType: bookDetail?.trapType || "Bẫy lồng",
                    locationName: "",
                    latitude: "",
                    longitude: "",
                    installedDate: new Date().toISOString().split("T")[0],
                    status: "ACTIVE",
                    notes: "",
                });
                await loadBookDetail(selectedBookId);
            } else {
                const json = await res.json();
                alert(json.message || "Không thể thêm bẫy.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Submit: Add Inspection
    const handleAddInspection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBookId || !bookDetail) return;
        setSubmitting(true);
        try {
            const trapItems = bookDetail.traps.map((t) => ({
                trapId: t.id,
                pestsCount: Number(inspectionForm.trapCounts[t.id] || 0),
                baitStatus: inspectionForm.trapBaits[t.id] || "Bình thường",
            }));

            const res = await fetch(`/api/farmer/pest-monitoring/${selectedBookId}/inspections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inspectionDate: inspectionForm.inspectionDate,
                    inspectorName: inspectionForm.inspectorName || "Chủ vườn",
                    weatherCondition: inspectionForm.weatherCondition,
                    actionNeeded: inspectionForm.actionNeeded,
                    actionNote: inspectionForm.actionNote,
                    notes: inspectionForm.notes,
                    trapItems,
                }),
            });
            if (res.ok) {
                setShowAddInspectionModal(false);
                await loadBookDetail(selectedBookId);
            } else {
                const json = await res.json();
                alert(json.message || "Không thể lưu kết quả điều tra.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Submit: Add Treatment
    const handleAddTreatment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBookId) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/farmer/pest-monitoring/${selectedBookId}/treatments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(treatmentForm),
            });
            if (res.ok) {
                setShowAddTreatmentModal(false);
                setTreatmentForm({
                    treatmentDate: new Date().toISOString().split("T")[0],
                    treatmentType: "Phun bả Protein sinh học",
                    productUsed: "",
                    dosage: "",
                    areaTreated: "Toàn vườn",
                    resultNotes: "",
                });
                await loadBookDetail(selectedBookId);
            } else {
                const json = await res.json();
                alert(json.message || "Không thể lưu biện pháp xử lý.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Filter books by search query
    const filteredBooks = books.filter((b) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            b.pestName.toLowerCase().includes(q) ||
            (b.scientificName && b.scientificName.toLowerCase().includes(q)) ||
            b.trapType.toLowerCase().includes(q) ||
            (b.attractant && b.attractant.toLowerCase().includes(q))
        );
    });

    // =========================================================================
    // RENDER: VIEW CHI TIẾT SỔ THEO DÕI
    // =========================================================================
    if (selectedBookId) {
        if (loadingDetail || !bookDetail) {
            return (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    <p className="text-sm font-medium text-slate-500">Đang tải sổ theo dõi...</p>
                </div>
            );
        }

        const summary = bookDetail.summary;

        // Chuẩn bị các dòng theo dõi chi tiết (flatten từ inspections)
        const detailedInspectionRows: Array<{
            id: string;
            inspectionDate: string;
            trapCode: string;
            location: string;
            pestsCount: number;
            inspectorName: string;
            notes: string;
        }> = [];

        // Sắp xếp các đợt điều tra theo thời gian
        const sortedInspections = [...bookDetail.inspections].sort(
            (a, b) => new Date(a.inspectionDate).getTime() - new Date(b.inspectionDate).getTime()
        );

        sortedInspections.forEach((ins) => {
            if (ins.items && ins.items.length > 0) {
                ins.items.forEach((it) => {
                    const trap = bookDetail.traps.find((t) => t.id === it.trapId) || it.trap;
                    const locStr = trap?.latitude && trap?.longitude
                        ? `${trap.latitude.toFixed(7)}, ${trap.longitude.toFixed(7)}`
                        : trap?.locationName || "Vườn trồng";

                    detailedInspectionRows.push({
                        id: it.id,
                        inspectionDate: ins.inspectionDate,
                        trapCode: trap?.trapCode || it.trap?.trapCode || "Bẫy",
                        location: locStr,
                        pestsCount: it.pestsCount,
                        inspectorName: ins.inspectorName,
                        notes: it.notes || it.baitStatus || ins.notes || "",
                    });
                });
            } else {
                detailedInspectionRows.push({
                    id: ins.id,
                    inspectionDate: ins.inspectionDate,
                    trapCode: "Tất cả bẫy",
                    location: bookDetail.farm?.farmName || "Toàn vườn",
                    pestsCount: ins.totalPestsCount,
                    inspectorName: ins.inspectorName,
                    notes: ins.notes || "",
                });
            }
        });

        return (
            <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleBackToList}
                            className="h-10 w-10 rounded-2xl p-0 text-slate-600 hover:bg-slate-50 shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                                    Sổ theo dõi {bookDetail.pestName}
                                </h1>
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                        bookDetail.status === "ACTIVE"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-slate-100 text-slate-600"
                                    }`}
                                >
                                    {bookDetail.status === "ACTIVE" ? "Đang theo dõi" : "Đã đóng"}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {bookDetail.farm?.farmName} • {bookDetail.cropSeason?.year ? `Vụ ${bookDetail.cropSeason.year}` : bookDetail.cropSeason?.name}
                                {bookDetail.scientificName && <span> • <i>{bookDetail.scientificName}</i></span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="rounded-2xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            In sổ
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowAddInspectionModal(true)}
                            className="rounded-2xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-soft"
                        >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Ghi nhận điều tra
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowAddTrapModal(true)}
                            className="rounded-2xl bg-brand-600 text-xs font-bold text-white hover:bg-brand-700 shadow-soft"
                        >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Thêm bẫy
                        </Button>
                    </div>
                </div>

                {/* 4 Thẻ KPI Tóm Tắt */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Crosshair className="h-4 w-4 text-brand-600" />
                            <span>Số lượng bẫy</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-900">{summary.trapsCount}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {summary.activeTrapsCount} bẫy đang hoạt động
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Activity className="h-4 w-4 text-blue-600" />
                            <span>Lần điều tra</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-900">{summary.inspectionsCount}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Gần nhất: {summary.lastInspectionDate ? new Date(summary.lastInspectionDate).toLocaleDateString("vi-VN") : "Chưa có"}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Bug className="h-4 w-4 text-amber-600" />
                            <span>Cá thể phát hiện</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-amber-700">{summary.totalPestsDetected}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Tổng cộng toàn bộ bẫy
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <ShieldAlert className="h-4 w-4 text-purple-600" />
                            <span>Biện pháp xử lý</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-purple-700">{summary.treatmentsCount}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Đã can thiệp xử lý
                        </p>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* BIỂU MẪU SỔ THEO DÕI SINH VẬT GÂY HẠI CHUẨN */}
                {/* ========================================================================= */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm space-y-6">
                    {/* Header Biểu Mẫu */}
                    <div className="text-center border-b border-slate-200 pb-5 space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                            SỔ THEO DÕI SINH VẬT GÂY HẠI
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            (Hệ thống giám sát bẫy dẫn dụ và điều tra dịch hại theo tiêu chuẩn VietGAP / GACC)
                        </p>
                    </div>

                    {/* Thông tin chung của sổ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3.5 gap-x-8 text-sm">
                        <div className="flex items-center justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[140px]">Vườn:</span>
                            <span className="font-semibold text-slate-900">{bookDetail.farm?.farmName}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[140px]">Vụ mùa:</span>
                            <span className="font-semibold text-slate-900">Vụ {bookDetail.cropSeason?.year || 2027}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[140px]">Sinh vật theo dõi:</span>
                            <span className="font-bold text-brand-700">{bookDetail.pestName}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[140px]">Tên khoa học:</span>
                            <span className="font-medium italic text-slate-800">{bookDetail.scientificName || "Bactrocera dorsalis"}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[140px]">Loại bẫy:</span>
                            <span className="font-semibold text-slate-900">{bookDetail.trapType}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[140px]">Chất dẫn dụ:</span>
                            <span className="font-semibold text-slate-900">{bookDetail.attractant || "Pheromone Methyl Eugenol"}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[140px]">Ngày bắt đầu:</span>
                            <span className="font-semibold text-slate-900">{new Date(bookDetail.startDate).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[140px]">Tần suất kiểm tra:</span>
                            <span className="font-bold text-brand-700">{bookDetail.checkFrequencyDays} ngày/lần</span>
                        </div>
                    </div>

                    {/* MỤC 1: DANH SÁCH BẪY */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Crosshair className="h-5 w-5 text-brand-600" />
                                Danh sách bẫy:
                            </h3>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setShowAddTrapModal(true)}
                                className="h-8 rounded-xl bg-brand-600 text-xs font-bold text-white hover:bg-brand-700 shadow-soft"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Thêm bẫy
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 w-14 text-center">STT</th>
                                        <th className="px-4 py-3">Tên bẫy</th>
                                        <th className="px-4 py-3">Vị trí</th>
                                        <th className="px-4 py-3">Ghi chú</th>
                                        <th className="px-4 py-3 text-center w-28">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bookDetail.traps.map((trap, idx) => {
                                        const locStr = trap.latitude && trap.longitude
                                            ? `${trap.latitude.toFixed(7)}, ${trap.longitude.toFixed(7)}${trap.locationName ? ` (${trap.locationName})` : ""}`
                                            : trap.locationName || "-";

                                        return (
                                            <tr key={trap.id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{idx + 1}</td>
                                                <td className="px-4 py-3 font-semibold text-slate-900">
                                                    <span className="font-mono text-brand-700 font-bold mr-1.5">{trap.trapCode}</span>
                                                    <span className="text-slate-600 text-xs">({trap.trapType})</span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-700">{locStr}</td>
                                                <td className="px-4 py-3 text-xs text-slate-500">{trap.notes || "-"}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                        trap.status === "ACTIVE"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-slate-100 text-slate-600"
                                                    }`}>
                                                        {trap.status === "ACTIVE" ? "Đang dùng" : "Đã thu hồi"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {bookDetail.traps.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                                                Chưa có bẫy nào trong sổ. Bấm &quot;Thêm bẫy&quot; để cài đặt bẫy mới.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MỤC 2: BẢNG THEO DÕI CHI TIẾT */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                Bảng Theo dõi chi tiết:
                            </h3>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setShowAddInspectionModal(true)}
                                className="h-8 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-soft"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Ghi nhận điều tra
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">Ngày điều tra</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Bẫy</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Vị trí</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">
                                            Số {bookDetail.pestName.toLowerCase()} thu được
                                        </th>
                                        <th className="px-4 py-3 whitespace-nowrap">Người điều tra</th>
                                        <th className="px-4 py-3">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detailedInspectionRows.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap">
                                                {new Date(row.inspectionDate).toLocaleDateString("vi-VN")}
                                            </td>
                                            <td className="px-4 py-3 font-mono font-bold text-brand-700 text-xs whitespace-nowrap">
                                                {row.trapCode}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                                                {row.location}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold">
                                                <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs ${
                                                    row.pestsCount === 0
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : "bg-red-50 text-red-700 border border-red-200"
                                                }`}>
                                                    {row.pestsCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">
                                                {row.inspectorName}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {row.notes || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                    {detailedInspectionRows.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                                                Chưa có lần điều tra nào. Bấm &quot;Ghi nhận điều tra&quot; để thêm dữ liệu kiểm tra bẫy.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MỤC 3: CÁC BIỆN PHÁP XỬ LÝ ĐÃ THỰC HIỆN */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-purple-600" />
                                Các biện pháp xử lý đã thực hiện:
                            </h3>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setShowAddTreatmentModal(true)}
                                className="h-8 rounded-xl bg-purple-600 text-xs font-bold text-white hover:bg-purple-700 shadow-soft"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Ghi nhận xử lý
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">Ngày xử lý</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Biện pháp</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Thuốc / Chế phẩm</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Liều lượng</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Khu vực / Diện tích</th>
                                        <th className="px-4 py-3">Kết quả / Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bookDetail.treatments.map((tr) => (
                                        <tr key={tr.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap">
                                                {new Date(tr.treatmentDate).toLocaleDateString("vi-VN")}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-purple-700 whitespace-nowrap">
                                                {tr.treatmentType}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-900 whitespace-nowrap">
                                                {tr.productUsed || "Không dùng hóa chất"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                                {tr.dosage || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                                {tr.areaTreated || "Toàn vườn"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {tr.resultNotes || tr.notes || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                    {bookDetail.treatments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                                                Chưa có can thiệp xử lý nào. Mật độ sinh vật gây hại vẫn đang trong ngưỡng an toàn.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* MODAL: THÊM BẪY */}
                {showAddTrapModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-900 text-lg">Thêm bẫy mới</h3>
                                <button type="button" onClick={() => setShowAddTrapModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddTrap} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Mã bẫy *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: BAY-03, BAY-A1..."
                                        value={trapForm.trapCode}
                                        onChange={(e) => setTrapForm({ ...trapForm, trapCode: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Loại bẫy</label>
                                    <input
                                        type="text"
                                        value={trapForm.trapType}
                                        onChange={(e) => setTrapForm({ ...trapForm, trapType: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Vị trí đặt *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: Khu A - Hàng cây 10..."
                                        value={trapForm.locationName}
                                        onChange={(e) => setTrapForm({ ...trapForm, locationName: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Vĩ độ (Lat)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="10.945..."
                                            value={trapForm.latitude}
                                            onChange={(e) => setTrapForm({ ...trapForm, latitude: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Kinh độ (Lng)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="107.238..."
                                            value={trapForm.longitude}
                                            onChange={(e) => setTrapForm({ ...trapForm, longitude: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddTrapModal(false)}
                                        className="flex-1 rounded-2xl"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 rounded-2xl bg-brand-600 text-white hover:bg-brand-700"
                                    >
                                        {submitting ? "Đang lưu..." : "Lưu bẫy"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: GHI NHẬN ĐIỀU TRA */}
                {showAddInspectionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-900 text-lg">Ghi nhận đợt điều tra bẫy</h3>
                                <button type="button" onClick={() => setShowAddInspectionModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddInspection} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Ngày điều tra *</label>
                                        <input
                                            type="date"
                                            required
                                            value={inspectionForm.inspectionDate}
                                            onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionDate: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Người điều tra</label>
                                        <input
                                            type="text"
                                            placeholder="Chủ vườn..."
                                            value={inspectionForm.inspectorName}
                                            onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorName: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Số cá thể đếm theo từng bẫy */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">
                                        Đếm số lượng cá thể phát hiện theo từng bẫy:
                                    </label>
                                    <div className="space-y-2 rounded-2xl bg-slate-50 p-3 border border-slate-200">
                                        {bookDetail.traps.map((t) => (
                                            <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                                                <div>
                                                    <span className="font-mono font-bold text-brand-700">{t.trapCode}</span>
                                                    <span className="text-xs text-slate-500 ml-1.5">({t.locationName})</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={inspectionForm.trapCounts[t.id] ?? 0}
                                                        onChange={(e) =>
                                                            setInspectionForm({
                                                                ...inspectionForm,
                                                                trapCounts: {
                                                                    ...inspectionForm.trapCounts,
                                                                    [t.id]: Number(e.target.value),
                                                                },
                                                            })
                                                        }
                                                        className="h-8 w-20 rounded-xl border border-slate-300 px-2 text-center text-sm font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                                                    />
                                                    <span className="text-xs text-slate-500">cá thể</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={inspectionForm.actionNeeded}
                                            onChange={(e) => setInspectionForm({ ...inspectionForm, actionNeeded: e.target.checked })}
                                            className="h-4 w-4 rounded text-brand-600"
                                        />
                                        <span>Cần biện pháp can thiệp / xử lý khẩn cấp</span>
                                    </label>
                                    {inspectionForm.actionNeeded && (
                                        <input
                                            type="text"
                                            placeholder="Đề xuất biện pháp xử lý (ví dụ: phun bả protein...)"
                                            value={inspectionForm.actionNote}
                                            onChange={(e) => setInspectionForm({ ...inspectionForm, actionNote: e.target.value })}
                                            className="mt-2 h-10 w-full rounded-2xl border border-amber-300 bg-amber-50 px-3 text-sm text-amber-900 focus:border-amber-500 focus:outline-none"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú thêm</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Tình trạng mồi bẫy, sâu bệnh phụ..."
                                        value={inspectionForm.notes}
                                        onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>

                                <div className="flex gap-2 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddInspectionModal(false)}
                                        className="flex-1 rounded-2xl"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 rounded-2xl bg-brand-600 text-white hover:bg-brand-700"
                                    >
                                        {submitting ? "Đang lưu..." : "Lưu đợt điều tra"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: GHI NHẬN XỬ LÝ */}
                {showAddTreatmentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-900 text-lg">Ghi nhận biện pháp xử lý</h3>
                                <button type="button" onClick={() => setShowAddTreatmentModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddTreatment} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Ngày thực hiện *</label>
                                    <input
                                        type="date"
                                        required
                                        value={treatmentForm.treatmentDate}
                                        onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentDate: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Biện pháp can thiệp *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: Phun bả protein, thay mồi bẫy, tỉa cành..."
                                        value={treatmentForm.treatmentType}
                                        onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentType: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tên thuốc / Chế phẩm dùng</label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Bả sinh học SOFRI, Ento-Pro..."
                                        value={treatmentForm.productUsed}
                                        onChange={(e) => setTreatmentForm({ ...treatmentForm, productUsed: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Liều lượng & Khu vực</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="50ml/cây..."
                                            value={treatmentForm.dosage}
                                            onChange={(e) => setTreatmentForm({ ...treatmentForm, dosage: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Toàn vườn / Khu A..."
                                            value={treatmentForm.areaTreated}
                                            onChange={(e) => setTreatmentForm({ ...treatmentForm, areaTreated: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Đánh giá kết quả sau xử lý</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Số lượng cá thể giảm rõ rệt, không phát hiện vết chích mới..."
                                        value={treatmentForm.resultNotes}
                                        onChange={(e) => setTreatmentForm({ ...treatmentForm, resultNotes: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex gap-2 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddTreatmentModal(false)}
                                        className="flex-1 rounded-2xl"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 rounded-2xl bg-brand-600 text-white hover:bg-brand-700"
                                    >
                                        {submitting ? "Đang lưu..." : "Lưu xử lý"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // RENDER: VIEW DANH SÁCH SỔ THEO DÕI (MẶC ĐỊNH)
    // =========================================================================
    return (
        <div className="space-y-5">
            {/* Header Danh Sách */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Bug className="h-6 w-6 text-brand-600" />
                        SỔ THEO DÕI SINH VẬT GÂY HẠI
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Quản lý bẫy dẫn dụ, định kỳ điều tra và kiểm soát dịch hại theo tiêu chuẩn VietGAP / GACC
                    </p>
                </div>

                {!isSeasonActive ? (
                    <div className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 shrink-0">
                        <span>🔒 Vụ mùa đã đóng (Chế độ chỉ xem)</span>
                    </div>
                ) : (
                    <Button
                        type="button"
                        onClick={() => setShowCreateBookModal(true)}
                        className="rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-soft hover:bg-brand-700 shrink-0"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Tạo sổ theo dõi
                    </Button>
                )}
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm theo tên sinh vật, loại bẫy, chất dẫn dụ..."
                        className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div className="flex gap-1.5 text-xs">
                    {(["ACTIVE", "CLOSED", "ALL"] as const).map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`rounded-full px-3.5 py-2 font-bold transition ${
                                statusFilter === st
                                    ? "bg-slate-900 text-white"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {st === "ACTIVE" ? "Đang theo dõi" : st === "CLOSED" ? "Đã đóng" : "Tất cả"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Danh Sách Card */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                </div>
            ) : filteredBooks.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center text-slate-500 shadow-sm">
                    <Bug className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                    <p className="font-bold text-slate-800 text-base">Chưa có sổ theo dõi sinh vật gây hại nào</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Bấm &quot;Tạo sổ theo dõi&quot; để bắt đầu đặt bẫy và ghi nhận điều tra định kỳ cho vụ mùa này.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBooks.map((book) => {
                        const lastIns = book.latestInspection;
                        const hasPest = lastIns && lastIns.totalPestsCount > 0;

                        return (
                            <div
                                key={book.id}
                                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-300 hover:shadow-md transition"
                            >
                                <div className="space-y-3">
                                    {/* Header Card */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-black text-slate-900 text-lg leading-tight">
                                                {book.pestName}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {book.cropSeason?.year ? `Vụ ${book.cropSeason.year}` : book.cropSeason?.name || "Vụ mùa"}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${
                                                book.status === "ACTIVE"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            {book.status === "ACTIVE" ? "Đang theo dõi" : "Đã đóng"}
                                        </span>
                                    </div>

                                    {/* Thông tin bẫy */}
                                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                            <Crosshair className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                                            <span>
                                                {book.trapsCount} bẫy • {book.trapType}
                                            </span>
                                        </div>
                                        {book.attractant && (
                                            <p className="text-slate-500 pl-5">
                                                Chất dẫn dụ: {book.attractant}
                                            </p>
                                        )}
                                    </div>

                                    {/* Lần điều tra gần nhất */}
                                    <div className="space-y-1 text-xs border-t border-slate-100 pt-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Lần điều tra gần nhất:</span>
                                            <span className="font-semibold text-slate-700">
                                                {lastIns ? new Date(lastIns.inspectionDate).toLocaleDateString("vi-VN") : "Chưa kiểm tra"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Kết quả gần nhất:</span>
                                            <span
                                                className={`font-bold ${
                                                    !lastIns
                                                        ? "text-slate-400"
                                                        : hasPest
                                                        ? "text-amber-700"
                                                        : "text-emerald-600"
                                                }`}
                                            >
                                                {!lastIns
                                                    ? "Chưa có dữ liệu"
                                                    : hasPest
                                                    ? `${lastIns.totalPestsCount} cá thể`
                                                    : "Không phát hiện"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action button */}
                                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-end">
                                    <Button
                                        type="button"
                                        onClick={() => handleSelectBook(book.id)}
                                        className="rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-brand-600 w-full sm:w-auto"
                                    >
                                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                                        Xem sổ
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL: TẠO SỔ THEO DÕI */}
            {showCreateBookModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-lg">Tạo sổ theo dõi sinh vật gây hại</h3>
                            <button type="button" onClick={() => setShowCreateBookModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBook} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Tên sinh vật gây hại *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Ruồi đục trái, Rệp sáp, Sâu đục trái..."
                                    value={createBookForm.pestName}
                                    onChange={(e) => setCreateBookForm({ ...createBookForm, pestName: e.target.value })}
                                    className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Tên khoa học (nếu có)</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Bactrocera dorsalis..."
                                    value={createBookForm.scientificName}
                                    onChange={(e) => setCreateBookForm({ ...createBookForm, scientificName: e.target.value })}
                                    className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none italic"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Loại bẫy sử dụng *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Bẫy lồng, bẫy dính vàng..."
                                        value={createBookForm.trapType}
                                        onChange={(e) => setCreateBookForm({ ...createBookForm, trapType: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tần suất kiểm tra (ngày) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={createBookForm.checkFrequencyDays}
                                        onChange={(e) => setCreateBookForm({ ...createBookForm, checkFrequencyDays: Number(e.target.value) })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Chất dẫn dụ / Mồi bẫy</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Pheromone Methyl Eugenol, Keo dính..."
                                    value={createBookForm.attractant}
                                    onChange={(e) => setCreateBookForm({ ...createBookForm, attractant: e.target.value })}
                                    className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>

                            {/* Thiết lập bẫy ban đầu */}
                            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 space-y-2.5">
                                <p className="text-xs font-bold text-slate-700">Tạo nhanh 2 bẫy ban đầu (Tùy chọn):</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <input
                                        type="text"
                                        placeholder="Mã: BAY-01"
                                        value={createBookForm.trap1Code}
                                        onChange={(e) => setCreateBookForm({ ...createBookForm, trap1Code: e.target.value })}
                                        className="h-9 rounded-xl border border-slate-200 px-2.5 bg-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Vị trí: Khu A"
                                        value={createBookForm.trap1Location}
                                        onChange={(e) => setCreateBookForm({ ...createBookForm, trap1Location: e.target.value })}
                                        className="h-9 rounded-xl border border-slate-200 px-2.5 bg-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <input
                                        type="text"
                                        placeholder="Mã: BAY-02"
                                        value={createBookForm.trap2Code}
                                        onChange={(e) => setCreateBookForm({ ...createBookForm, trap2Code: e.target.value })}
                                        className="h-9 rounded-xl border border-slate-200 px-2.5 bg-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Vị trí: Khu B"
                                        value={createBookForm.trap2Location}
                                        onChange={(e) => setCreateBookForm({ ...createBookForm, trap2Location: e.target.value })}
                                        className="h-9 rounded-xl border border-slate-200 px-2.5 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú mục tiêu</label>
                                <textarea
                                    rows={2}
                                    placeholder="Mục tiêu theo dõi, lưu ý đặt bẫy..."
                                    value={createBookForm.notes}
                                    onChange={(e) => setCreateBookForm({ ...createBookForm, notes: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateBookModal(false)}
                                    className="flex-1 rounded-2xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft"
                                >
                                    {submitting ? "Đang tạo..." : "Tạo sổ theo dõi"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
