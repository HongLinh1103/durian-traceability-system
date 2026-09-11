"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
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
    Unlock,
    Trash2,
    CheckCircle2,
    Pencil,
    AlertTriangle,
    MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatVietnameseDate } from "@/lib/date-format";
import { formatSeasonName } from "@/lib/crop-season";

const STAGES = [
    { value: "POST_HARVEST_RECOVERY", label: "Phục hồi sau thu hoạch" },
    { value: "MAKING_SPROUT", label: "Làm đọt" },
    { value: "FLOWER_INDUCTION", label: "Xử lý ra hoa" },
    { value: "FLOWERING", label: "Ra hoa" },
    { value: "FRUIT_SETTING", label: "Đậu trái" },
    { value: "FRUIT_GROWING", label: "Nuôi trái" },
    { value: "PRE_HARVEST", label: "Trước thu hoạch" },
    { value: "HARVEST", label: "Thu hoạch" },
] as const;

function formatStageLabel(stage?: string | null): string {
    if (!stage) return "-";
    const found = STAGES.find(
        (s) => s.value === stage || s.label.toLowerCase() === stage.toLowerCase()
    );
    return found ? found.label : stage;
}

const MONITORING_METHOD_OPTIONS = [
    "Quan sát trực tiếp",
    "Kiểm tra bẫy",
    "Kiểm tra bộ phận cây",
    "Phương pháp khác",
];

const TRAP_TYPE_OPTIONS = [
    "Bẫy lồng",
    "Bẫy dính màu vàng",
    "Bẫy dính màu xanh",
    "Bẫy pheromone",
    "Bẫy đèn",
    "Loại khác",
];

interface PestMonitoringTabProps {
    farmId?: string;
    cropSeasonId?: string;
    isSeasonActive?: boolean;
    farmName?: string;
    farmAddress?: string;
    seasonName?: string;
    seasonYear?: number;
    onReopenSeason?: () => void;
    initialSelectedPestName?: string | null;
    onNavigateToCultivation?: (logId?: string) => void;
}

interface PestBookSummary {
    id: string;
    pestName: string;
    scientificName?: string | null;
    trapType?: string | null;
    attractant?: string | null;
    firstDetectedDate?: string | null;
    discoveryStage?: string | null;
    discoverySource?: string | null;
    discoveryLogId?: string | null;
    discoveryLog?: {
        id: string;
        actionDate: string;
        stage: string;
        activityType: string;
        otherActivity?: string | null;
    } | null;
    monitoringMethods?: string[];
    targetPart?: string | null;
    startDate: string;
    checkFrequencyDays: number;
    status: "ACTIVE" | "CLOSED";
    notes?: string | null;
    farm?: {
        id: string;
        farmName: string;
        farmCode: string;
        address?: string | null;
        ward?: string | null;
        district?: string | null;
        province?: string | null;
    };
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
        resultText?: string | null;
    } | null;
    latestTreatment?: {
        id: string;
        treatmentDate: string;
        treatmentType: string;
        productUsed?: string | null;
        dosage?: string | null;
        phiDays?: number | null;
    } | null;
}

interface TrapItem {
    id: string;
    trapCode: string;
    trapType: string;
    attractant?: string | null;
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
    method?: string | null;
    targetPart?: string | null;
    resultText?: string | null;
    totalPestsCount: number;
    densityLevel?: string | null;
    weatherCondition?: string | null;
    actionNeeded: boolean;
    actionNote?: string | null;
    images?: string[];
    notes?: string | null;
    items?: Array<{
        id: string;
        trapId?: string | null;
        method?: string | null;
        targetPart?: string | null;
        resultText?: string | null;
        pestsCount: number;
        baitStatus?: string | null;
        notes?: string | null;
        trap?: {
            trapCode: string;
            trapType?: string;
            attractant?: string | null;
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
    phiDays?: number | null;
    areaTreated?: string | null;
    resultNotes?: string | null;
    notes?: string | null;
    farmingLogId?: string | null;
    farmingLog?: {
        id: string;
        actionDate: string;
        activityType: string;
        chemicalName?: string | null;
        dosage?: string | null;
        phiDays?: number | null;
    } | null;
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
    farmName,
    farmAddress,
    seasonName,
    seasonYear,
    onReopenSeason,
    initialSelectedPestName,
    onNavigateToCultivation,
}: PestMonitoringTabProps) {
    const searchParams = useSearchParams();
    const [books, setBooks] = useState<PestBookSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "CLOSED">("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Selected Book Detail View
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const bookExportRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);
    const [bookDetail, setBookDetail] = useState<BookDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modals
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [showCreateBookModal, setShowCreateBookModal] = useState(false);
    const [showAddTrapModal, setShowAddTrapModal] = useState(false);
    const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
    const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form: Create Book
    const [createBookForm, setCreateBookForm] = useState({
        pestName: "",
        scientificName: "",
        firstDetectedDate: new Date().toISOString().split("T")[0],
        discoveryStage: "FLOWER_INDUCTION",
        discoverySource: "",
        discoveryLogId: "",
        treatmentMethod: "TRAP" as "TRAP" | "SPRAY",
        attractant: "",
        sprayProduct: "",
        sprayPhiDays: "" as number | string,
        monitoringMethods: ["Kiểm tra bẫy"] as string[],
        targetPart: "",
        checkFrequencyDays: "" as number | string,
        notes: "",
        traps: [
            {
                trapCode: "",
                trapType: "Bẫy lồng",
                locationName: "",
                notes: "",
            },
        ] as Array<{
            trapCode: string;
            trapType?: string;
            attractant?: string;
            locationName: string;
            notes?: string;
        }>,
    });

    // Form: Add Trap in Detail View
    const [trapForm, setTrapForm] = useState({
        trapCode: "",
        trapType: "Bẫy lồng",
        attractant: "Pheromone Methyl Eugenol",
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
        inspectorName: "Trần Văn Minh",
        weatherCondition: "Nắng ráo",
        method: "Kiểm tra bẫy",
        targetPart: "",
        resultText: "",
        densityLevel: "Không phát hiện",
        actionNeeded: false,
        actionNote: "",
        notes: "",
        trapCounts: {} as Record<string, number>,
        trapBaits: {} as Record<string, string>,
    });

    // Form: Add Treatment
    const [treatmentForm, setTreatmentForm] = useState({
        treatmentDate: new Date().toISOString().split("T")[0],
        treatmentType: "",
        productUsed: "",
        dosage: "",
        phiDays: "" as string | number,
        areaTreated: "",
        resultNotes: "",
    });

    // Edit / Delete Inspection states
    const [showEditInspectionModal, setShowEditInspectionModal] = useState(false);
    const [deletingInspection, setDeletingInspection] = useState<any | null>(null);
    const [editInspectionForm, setEditInspectionForm] = useState({
        inspectionId: "",
        inspectionDate: new Date().toISOString().split("T")[0],
        inspectorName: "Trần Văn Minh",
        weatherCondition: "Nắng ráo",
        method: "Quan sát trực tiếp",
        targetPart: "",
        resultText: "",
        densityLevel: "Không phát hiện",
        actionNeeded: false,
        actionNote: "",
        notes: "",
        trapCounts: {} as Record<string, number>,
        trapBaits: {} as Record<string, string>,
    });

    // Edit / Delete Treatment states
    const [showEditTreatmentModal, setShowEditTreatmentModal] = useState(false);
    const [deletingTreatment, setDeletingTreatment] = useState<any | null>(null);
    const [editTreatmentForm, setEditTreatmentForm] = useState({
        treatmentId: "",
        treatmentDate: new Date().toISOString().split("T")[0],
        treatmentType: "",
        productUsed: "",
        dosage: "",
        phiDays: "" as string | number,
        areaTreated: "",
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
                const data: BookDetailData = json.data;
                setBookDetail(data);

                // Pre-populate inspection trap counts
                const initialCounts: Record<string, number> = {};
                const initialBaits: Record<string, string> = {};
                data.traps.forEach((t: TrapItem) => {
                    initialCounts[t.id] = 0;
                    initialBaits[t.id] = "Mồi còn tốt";
                });

                const isTrapBook = data.traps.length > 0 || (data.monitoringMethods || []).includes("Kiểm tra bẫy");

                setInspectionForm((prev) => ({
                    ...prev,
                    method: isTrapBook ? "Kiểm tra bẫy" : (data.monitoringMethods?.[0] || "Quan sát trực tiếp"),
                    targetPart: data.targetPart || "",
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

    // Auto-select book if initialSelectedPestName or searchParam "pest" is set
    useEffect(() => {
        const pestParam = initialSelectedPestName || searchParams.get("pest");
        if (pestParam && books.length > 0 && !selectedBookId) {
            const target = books.find(
                (b) => b.pestName.toLowerCase().includes(pestParam.toLowerCase())
            );
            if (target) {
                setSelectedBookId(target.id);
                void loadBookDetail(target.id);
            }
        }
    }, [initialSelectedPestName, searchParams, books, selectedBookId, loadBookDetail]);

    // Handle Toggle Monitoring Method in Create Form
    const handleToggleMethod = (method: string) => {
        setCreateBookForm((prev) => {
            const exists = prev.monitoringMethods.includes(method);
            const next = exists
                ? prev.monitoringMethods.filter((m) => m !== method)
                : [...prev.monitoringMethods, method];
            return { ...prev, monitoringMethods: next };
        });
    };

    // Handle inline trap row updates in Create Book modal
    const handleUpdateTrapRow = (
        index: number,
        field: "trapCode" | "locationName" | "notes",
        value: string
    ) => {
        setCreateBookForm((prev) => {
            const nextTraps = [...prev.traps];
            if (nextTraps[index]) {
                nextTraps[index] = {
                    ...nextTraps[index],
                    [field]: value,
                };
            }
            return { ...prev, traps: nextTraps };
        });
    };

    // Add empty row to trap table in Create Book modal
    const handleAddEmptyTrapRow = () => {
        setCreateBookForm((prev) => ({
            ...prev,
            traps: [
                ...prev.traps,
                {
                    trapCode: "",
                    trapType: "Bẫy lồng",
                    locationName: "",
                    notes: "",
                },
            ],
        }));
    };

    // Remove row from trap table in Create Book modal (or reset if only 1)
    const handleRemoveTrapFromCreateList = (index: number) => {
        setCreateBookForm((prev) => {
            if (prev.traps.length <= 1) {
                return {
                    ...prev,
                    traps: [
                        {
                            trapCode: "",
                            trapType: "Bẫy lồng",
                            locationName: "",
                            notes: "",
                        },
                    ],
                };
            }
            return {
                ...prev,
                traps: prev.traps.filter((_, i) => i !== index),
            };
        });
    };

    // Reset first trap row in Create Book modal
    const handleResetFirstTrapRow = () => {
        setCreateBookForm((prev) => ({
            ...prev,
            traps: [
                {
                    trapCode: "",
                    trapType: "Bẫy lồng",
                    locationName: "",
                    notes: "",
                },
            ],
        }));
    };

    // Submit: Create Book
    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!farmId || !cropSeasonId) {
            alert("Vui lòng chọn Vườn và Vụ mùa trước khi tạo sổ theo dõi.");
            return;
        }
        if (!createBookForm.pestName.trim()) {
            alert("Vui lòng nhập tên sinh vật gây hại.");
            return;
        }

        const isTrap = createBookForm.treatmentMethod === "TRAP";
        if (isTrap) {
            if (!createBookForm.checkFrequencyDays || Number(createBookForm.checkFrequencyDays) < 1) {
                alert("Vui lòng nhập Tần suất kiểm tra (ngày / lần).");
                return;
            }
            const filledTraps = createBookForm.traps.filter(
                (t) => t.trapCode.trim() || t.locationName.trim() || (t.notes && t.notes.trim())
            );
            if (filledTraps.length === 0) {
                alert("Vui lòng nhập thông tin bẫy theo dõi (Mã bẫy và Vị trí).");
                return;
            }
            for (let i = 0; i < filledTraps.length; i++) {
                if (!filledTraps[i].trapCode.trim()) {
                    alert(`Vui lòng nhập Mã bẫy cho hàng ${i + 1}.`);
                    return;
                }
                if (!filledTraps[i].locationName.trim()) {
                    alert(`Vui lòng nhập Vị trí cho bẫy "${filledTraps[i].trapCode}".`);
                    return;
                }
            }
        } else {
            if (!createBookForm.sprayProduct.trim()) {
                alert("Vui lòng nhập tên thuốc sử dụng.");
                return;
            }
            if (createBookForm.sprayPhiDays === "" || Number(createBookForm.sprayPhiDays) < 0) {
                alert("Vui lòng nhập Thời gian cách ly (PHI).");
                return;
            }
            if (!createBookForm.checkFrequencyDays || Number(createBookForm.checkFrequencyDays) < 1) {
                alert("Vui lòng nhập Tần suất kiểm tra (ngày / lần).");
                return;
            }
        }

        setSubmitting(true);
        try {
            const validTraps = isTrap
                ? createBookForm.traps
                    .filter((t) => t.trapCode.trim() && t.locationName.trim())
                    .map((t) => ({
                        trapCode: t.trapCode.trim(),
                        trapType: "Bẫy lồng",
                        attractant: createBookForm.attractant.trim() || null,
                        locationName: t.locationName.trim(),
                        notes: t.notes?.trim() || null,
                    }))
                : [];

            const res = await fetch("/api/farmer/pest-monitoring", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    farmId,
                    cropSeasonId,
                    pestName: createBookForm.pestName.trim(),
                    scientificName: createBookForm.scientificName.trim() || null,
                    firstDetectedDate: createBookForm.firstDetectedDate || null,
                    discoveryStage: createBookForm.discoveryStage || null,
                    discoverySource: null,
                    discoveryLogId: createBookForm.discoveryLogId || null,
                    treatmentMethod: createBookForm.treatmentMethod,
                    treatmentProduct: isTrap ? null : createBookForm.sprayProduct.trim(),
                    treatmentPhi: isTrap ? null : (createBookForm.sprayPhiDays !== "" ? Number(createBookForm.sprayPhiDays) : null),
                    monitoringMethods: isTrap ? ["Kiểm tra bẫy"] : ["Quan sát trực tiếp", "Phun thuốc"],
                    targetPart: createBookForm.targetPart.trim() || null,
                    trapType: isTrap ? "Bẫy lồng" : null,
                    attractant: isTrap ? (createBookForm.attractant.trim() || null) : null,
                    checkFrequencyDays: Number(createBookForm.checkFrequencyDays),
                    startDate: createBookForm.firstDetectedDate || new Date().toISOString().split("T")[0],
                    notes: createBookForm.notes.trim() || null,
                    traps: validTraps,
                }),
            });

            if (res.ok) {
                setShowCreateBookModal(false);
                setCreateBookForm({
                    pestName: "",
                    scientificName: "",
                    firstDetectedDate: new Date().toISOString().split("T")[0],
                    discoveryStage: "FLOWER_INDUCTION",
                    discoverySource: "",
                    discoveryLogId: "",
                    treatmentMethod: "TRAP",
                    attractant: "",
                    sprayProduct: "",
                    sprayPhiDays: "",
                    monitoringMethods: ["Kiểm tra bẫy"],
                    targetPart: "",
                    checkFrequencyDays: "",
                    notes: "",
                    traps: [
                        {
                            trapCode: "",
                            trapType: "Bẫy lồng",
                            locationName: "",
                            notes: "",
                        },
                    ],
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

    // Delete Book
    const handleDeleteBookById = async (bookId: string, bookName: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa "${bookName}" không? Tất cả dữ liệu điều tra, bẫy và lịch sử xử lý của sổ này sẽ bị xóa vĩnh viễn.`)) {
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch(`/api/farmer/pest-monitoring/${bookId}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (res.ok && json.success) {
                alert(json.message || "Đã xóa sổ theo dõi thành công.");
                if (selectedBookId === bookId) {
                    handleBackToList();
                }
                await loadBooks();
            } else {
                alert(json.message || "Không thể xóa sổ theo dõi.");
            }
        } catch (err: any) {
            alert(err.message || "Lỗi khi xóa sổ theo dõi.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBook = async () => {
        if (!selectedBookId) return;
        await handleDeleteBookById(selectedBookId, bookDetail?.pestName || "sổ theo dõi này");
    };

    // Submit: Add Trap in Book Detail
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
                    attractant: bookDetail?.attractant || "Pheromone Methyl Eugenol",
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
            const hasTraps = bookDetail.traps.length > 0;
            let trapItems: any[] = [];

            if (hasTraps) {
                trapItems = bookDetail.traps.map((t) => ({
                    trapId: t.id,
                    pestsCount: Number(inspectionForm.trapCounts[t.id] || 0),
                    baitStatus: inspectionForm.trapBaits[t.id] || "Mồi còn tốt",
                }));
            }

            const res = await fetch(`/api/farmer/pest-monitoring/${selectedBookId}/inspections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inspectionDate: inspectionForm.inspectionDate,
                    inspectorName: inspectionForm.inspectorName || "Trần Văn Minh",
                    method: inspectionForm.method,
                    targetPart: inspectionForm.targetPart || bookDetail.targetPart || null,
                    resultText: inspectionForm.resultText || null,
                    densityLevel: inspectionForm.densityLevel || null,
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
                body: JSON.stringify({
                    treatmentDate: treatmentForm.treatmentDate,
                    treatmentType: treatmentForm.treatmentType,
                    productUsed: treatmentForm.productUsed || null,
                    dosage: treatmentForm.dosage || null,
                    phiDays: treatmentForm.phiDays !== "" ? Number(treatmentForm.phiDays) : null,
                    areaTreated: treatmentForm.areaTreated || null,
                    resultNotes: treatmentForm.resultNotes || null,
                }),
            });
            if (res.ok) {
                setShowAddTreatmentModal(false);
                setTreatmentForm({
                    treatmentDate: new Date().toISOString().split("T")[0],
                    treatmentType: "",
                    productUsed: "",
                    dosage: "",
                    phiDays: "",
                    areaTreated: "",
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

    // Inspection Handlers: Edit & Delete
    const handleOpenEditInspection = (ins: any) => {
        if (!ins) return;
        const trapCounts: Record<string, number> = {};
        const trapBaits: Record<string, string> = {};
        if (ins.items && ins.items.length > 0) {
            ins.items.forEach((it: any) => {
                if (it.trapId) {
                    trapCounts[it.trapId] = it.pestsCount;
                    trapBaits[it.trapId] = it.baitStatus || "Mồi còn tốt";
                }
            });
        }
        setEditInspectionForm({
            inspectionId: ins.id,
            inspectionDate: ins.inspectionDate ? ins.inspectionDate.slice(0, 10) : new Date().toISOString().split("T")[0],
            inspectorName: ins.inspectorName || "Trần Văn Minh",
            weatherCondition: ins.weatherCondition || "Nắng ráo",
            method: ins.method || (bookDetail?.traps?.length ? "Kiểm tra bẫy" : "Quan sát trực tiếp"),
            targetPart: ins.targetPart || ins.items?.[0]?.targetPart || "",
            resultText: ins.resultText || ins.items?.[0]?.resultText || "",
            densityLevel: ins.densityLevel || "Không phát hiện",
            actionNeeded: !!ins.actionNeeded,
            actionNote: ins.actionNote || "",
            notes: ins.notes || "",
            trapCounts,
            trapBaits,
        });
        setShowEditInspectionModal(true);
    };

    const handleUpdateInspection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBookId || !bookDetail) return;
        setSubmitting(true);
        try {
            const hasTraps = bookDetail.traps.length > 0;
            let trapItems: any[] = [];
            if (hasTraps) {
                trapItems = bookDetail.traps.map((t) => ({
                    trapId: t.id,
                    pestsCount: Number(editInspectionForm.trapCounts[t.id] || 0),
                    baitStatus: editInspectionForm.trapBaits[t.id] || "Mồi còn tốt",
                }));
            }

            const res = await fetch(`/api/farmer/pest-monitoring/${selectedBookId}/inspections`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inspectionId: editInspectionForm.inspectionId,
                    inspectionDate: editInspectionForm.inspectionDate,
                    inspectorName: editInspectionForm.inspectorName || "Trần Văn Minh",
                    method: editInspectionForm.method,
                    targetPart: editInspectionForm.targetPart || null,
                    resultText: editInspectionForm.resultText || null,
                    densityLevel: editInspectionForm.densityLevel || null,
                    weatherCondition: editInspectionForm.weatherCondition,
                    actionNeeded: editInspectionForm.actionNeeded,
                    actionNote: editInspectionForm.actionNote,
                    notes: editInspectionForm.notes,
                    trapItems,
                }),
            });
            if (res.ok) {
                setShowEditInspectionModal(false);
                await loadBookDetail(selectedBookId);
            } else {
                const json = await res.json();
                alert(json.message || "Không thể cập nhật đợt điều tra.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenDeleteInspection = (ins: any) => {
        if (!ins) return;
        setDeletingInspection(ins);
    };

    const handleConfirmDeleteInspection = async () => {
        if (!selectedBookId || !deletingInspection) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/farmer/pest-monitoring/${selectedBookId}/inspections?inspectionId=${deletingInspection.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setDeletingInspection(null);
                await loadBookDetail(selectedBookId);
            } else {
                const json = await res.json();
                alert(json.message || "Không thể xóa đợt điều tra.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Treatment Handlers: Edit & Delete
    const handleOpenEditTreatment = (tr: any) => {
        if (!tr) return;
        setEditTreatmentForm({
            treatmentId: tr.id,
            treatmentDate: tr.treatmentDate ? tr.treatmentDate.slice(0, 10) : new Date().toISOString().split("T")[0],
            treatmentType: tr.treatmentType || "",
            productUsed: tr.productUsed || "",
            dosage: tr.dosage || "",
            phiDays: tr.phiDays !== undefined && tr.phiDays !== null ? tr.phiDays : "",
            areaTreated: tr.areaTreated || "",
            resultNotes: tr.resultNotes || tr.notes || "",
        });
        setShowEditTreatmentModal(true);
    };

    const handleUpdateTreatment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBookId || !bookDetail) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/farmer/pest-monitoring/${selectedBookId}/treatments`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    treatmentId: editTreatmentForm.treatmentId,
                    treatmentDate: editTreatmentForm.treatmentDate,
                    treatmentType: editTreatmentForm.treatmentType,
                    productUsed: editTreatmentForm.productUsed || null,
                    dosage: editTreatmentForm.dosage || null,
                    phiDays: editTreatmentForm.phiDays !== "" ? Number(editTreatmentForm.phiDays) : null,
                    areaTreated: editTreatmentForm.areaTreated || null,
                    resultNotes: editTreatmentForm.resultNotes || null,
                }),
            });
            if (res.ok) {
                setShowEditTreatmentModal(false);
                await loadBookDetail(selectedBookId);
            } else {
                const json = await res.json();
                alert(json.message || "Không thể cập nhật biện pháp xử lý.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenDeleteTreatment = (tr: any) => {
        if (!tr) return;
        setDeletingTreatment(tr);
    };

    const handleConfirmDeleteTreatment = async () => {
        if (!selectedBookId || !deletingTreatment) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/farmer/pest-monitoring/${selectedBookId}/treatments?treatmentId=${deletingTreatment.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setDeletingTreatment(null);
                await loadBookDetail(selectedBookId);
            } else {
                const json = await res.json();
                alert(json.message || "Không thể xóa biện pháp xử lý.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Filter books by search query
    const filteredBooks = useMemo(() => {
        return books.filter((b) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            return (
                b.pestName.toLowerCase().includes(q) ||
                (b.scientificName && b.scientificName.toLowerCase().includes(q)) ||
                (b.trapType && b.trapType.toLowerCase().includes(q)) ||
                (b.attractant && b.attractant.toLowerCase().includes(q)) ||
                (b.targetPart && b.targetPart.toLowerCase().includes(q)) ||
                (b.discoverySource && b.discoverySource.toLowerCase().includes(q))
            );
        });
    }, [books, searchQuery]);

    // =========================================================================
    // RENDER: VIEW CHI TIẾT SỔ THEO DÕI
    // =========================================================================
    if (selectedBookId) {
        if (loadingDetail || !bookDetail) {
            return (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    <p className="text-sm font-medium text-slate-500">Đang tải thông tin sổ theo dõi...</p>
                </div>
            );
        }

        const summary = bookDetail.summary;
        const hasTraps = bookDetail.traps.length > 0 || (bookDetail.monitoringMethods || []).includes("Kiểm tra bẫy");

        // Chuẩn bị các dòng theo dõi chi tiết
        const sortedInspections = [...bookDetail.inspections].sort(
            (a, b) => new Date(a.inspectionDate).getTime() - new Date(b.inspectionDate).getTime()
        );

        // Flatten trap inspection rows if trap-based
        const trapInspectionRows: Array<{
            id: string;
            inspection: any;
            inspectionDate: string;
            trapCode: string;
            location: string;
            pestsCount: number;
            inspectorName: string;
            notes: string;
        }> = [];

        if (hasTraps) {
            sortedInspections.forEach((ins) => {
                if (ins.items && ins.items.length > 0) {
                    ins.items.forEach((it) => {
                        const trap = bookDetail.traps.find((t) => t.id === it.trapId) || it.trap;
                        const locStr = trap?.locationName || it.targetPart || "Vườn trồng";

                        trapInspectionRows.push({
                            id: it.id,
                            inspection: ins,
                            inspectionDate: ins.inspectionDate,
                            trapCode: trap?.trapCode || it.trap?.trapCode || it.targetPart || "Bẫy",
                            location: locStr,
                            pestsCount: it.pestsCount,
                            inspectorName: ins.inspectorName,
                            notes: it.notes || it.baitStatus || ins.notes || "-",
                        });
                    });
                } else {
                    trapInspectionRows.push({
                        id: ins.id,
                        inspection: ins,
                        inspectionDate: ins.inspectionDate,
                        trapCode: "Tất cả bẫy",
                        location: bookDetail.farm?.farmName || "Toàn vườn",
                        pestsCount: ins.totalPestsCount,
                        inspectorName: ins.inspectorName,
                        notes: ins.notes || "-",
                    });
                }
            });
        }

        const rawMethods = bookDetail.monitoringMethods && bookDetail.monitoringMethods.length > 0
            ? bookDetail.monitoringMethods
            : hasTraps
                ? ["Kiểm tra bẫy"]
                : ["Phun thuốc"];
        const methodsList = rawMethods.map((m) => (m === "Quan sát trực tiếp" ? "Phun thuốc" : m));

        const farmAddressStr = (() => {
            const addr = (bookDetail.farm?.address || farmAddress || "").trim();
            const ward = (bookDetail.farm?.ward || "").trim();
            const district = (bookDetail.farm?.district || "").trim();
            const province = (bookDetail.farm?.province || "").trim();
            const extra = [ward, district, province].filter(
                (p) => p && !addr.toLowerCase().includes(p.toLowerCase())
            );
            const full = [addr, ...extra].filter(Boolean).join(", ");
            return full || "Chưa cập nhật";
        })();

        const cleanSeasonName = (
            bookDetail.cropSeason?.name ||
            seasonName ||
            (seasonYear ? `${seasonYear - 1}-${seasonYear}` : "2025-2026")
        ).replace(/^Niên vụ\s*/i, "");

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
                            title="Quay lại danh sách sổ"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                                    Sổ theo dõi {bookDetail.pestName}
                                </h1>
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${bookDetail.status === "ACTIVE"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    {bookDetail.status === "ACTIVE" ? "Đang theo dõi" : "Đã đóng"}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                                <span className="font-semibold text-slate-700">{bookDetail.farm?.farmName || farmName}</span>
                                <span>•</span>
                                <span>{bookDetail.cropSeason?.name || seasonName || (seasonYear ? `Niên vụ ${seasonYear - 1}-${seasonYear}` : "Niên vụ 2025-2026")}</span>
                                {farmAddressStr !== "Chưa cập nhật" && (
                                    <>
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-1 text-slate-600">
                                            <MapPin className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                                            <span>{farmAddressStr}</span>
                                        </span>
                                    </>
                                )}
                                {bookDetail.scientificName && (
                                    <span className="italic ml-1">({bookDetail.scientificName})</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={exporting}
                            onClick={async () => {
                                if (!bookExportRef.current) return;
                                setExporting(true);
                                try {
                                    const { exportPestBook, pestBookFilename } = await import("@/lib/export-pest-book");
                                    const exportSeason = formatSeasonName(bookDetail.cropSeason || { name: seasonName || "", year: seasonYear || new Date().getFullYear() });
                                    await exportPestBook(bookExportRef.current, pestBookFilename(bookDetail.pestName, exportSeason));
                                } catch {
                                    window.alert("Không thể xuất sổ Excel. Vui lòng thử lại.");
                                } finally {
                                    setExporting(false);
                                }
                            }}
                            className="rounded-2xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            {exporting ? "Đang xuất..." : "Xuất sổ Excel"}
                        </Button>
                        {isSeasonActive && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleDeleteBook}
                                disabled={submitting}
                                className="rounded-2xl text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Xóa sổ
                            </Button>
                        )}
                    </div>
                </div>

                {/* 4 Thẻ KPI Tóm Tắt (Linh hoạt theo loại bẫy hoặc quan sát trực tiếp) */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    {hasTraps ? (
                        <>
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
                                    Gần nhất: {formatVietnameseDate(summary.lastInspectionDate) || "Chưa có"}
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
                        </>
                    ) : (
                        <>
                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <ShieldAlert className="h-4 w-4 text-purple-600" />
                                    <span>Biện pháp xử lý</span>
                                </div>
                                <p className="mt-2 text-base font-black text-slate-900">{methodsList[0] || "Phun thuốc"}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Biện pháp can thiệp
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                    <span>Lần điều tra</span>
                                </div>
                                <p className="mt-2 text-2xl font-black text-slate-900">{summary.inspectionsCount}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Gần nhất: {formatVietnameseDate(summary.lastInspectionDate) || "Chưa có"}
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <span>Mật độ hiện tại</span>
                                </div>
                                <p className="mt-2 text-base font-black text-emerald-700">Đã kiểm soát</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Trong ngưỡng an toàn
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <ShieldAlert className="h-4 w-4 text-purple-600" />
                                    <span>Số lần can thiệp</span>
                                </div>
                                <p className="mt-2 text-2xl font-black text-purple-700">{summary.treatmentsCount}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Đã can thiệp xử lý
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* ========================================================================= */}
                {/* BIỂU MẪU SỔ THEO DÕI SINH VẬT GÂY HẠI CHUẨN */}
                {/* ========================================================================= */}
                <div ref={bookExportRef} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm space-y-6">
                    {/* Header Biểu Mẫu */}
                    <div className="text-center border-b border-slate-200 pb-5 space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                            SỔ THEO DÕI SINH VẬT GÂY HẠI
                        </h2>

                    </div>

                    {/* Thông tin chung của sổ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3.5 gap-x-8 text-sm">
                        {/* Hàng 1: Vườn & Mã vùng trồng */}
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Vườn:</span>
                            <span className="font-semibold text-slate-900">{bookDetail.farm?.farmName || farmName}</span>
                        </div>
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Mã vùng trồng:</span>
                            <span className="font-semibold text-slate-900">{bookDetail.farm?.farmCode || "Chưa cập nhật"}</span>
                        </div>

                        {/* Hàng 2: Địa chỉ vườn & Niên vụ */}
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Địa chỉ vườn:</span>
                            <span className="font-semibold text-slate-900 break-words">{farmAddressStr}</span>
                        </div>
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Niên vụ:</span>
                            <span className="font-semibold text-slate-900">{cleanSeasonName}</span>
                        </div>

                        {/* Hàng 3: Sinh vật theo dõi & Tên khoa học */}
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Sinh vật theo dõi:</span>
                            <span className="font-bold text-brand-700">{bookDetail.pestName}</span>
                        </div>
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Tên khoa học:</span>
                            <span className="font-medium italic text-slate-800">{bookDetail.scientificName || "-"}</span>
                        </div>

                        {/* Hàng 4: Ngày phát hiện đầu tiên & Giai đoạn cây khi phát hiện */}
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Ngày phát hiện đầu tiên:</span>
                            <span className="font-semibold text-slate-900">
                                {formatVietnameseDate(bookDetail.firstDetectedDate || bookDetail.startDate)}
                            </span>
                        </div>
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Giai đoạn cây khi phát hiện:</span>
                            <span className="font-semibold text-slate-900">
                                {formatStageLabel(bookDetail.discoveryStage)}
                            </span>
                        </div>

                        {/* Hàng 5: Biện pháp xử lý & Tần suất kiểm tra */}
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">
                                {hasTraps ? "Phương pháp theo dõi:" : "Biện pháp xử lý:"}
                            </span>
                            <span className="font-semibold text-slate-900">
                                {methodsList.length > 0 ? methodsList.join(", ") : (hasTraps ? "Kiểm tra bẫy" : "Phun thuốc")}
                            </span>
                        </div>
                        <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Tần suất kiểm tra:</span>
                            <span className="font-bold text-brand-700">{bookDetail.checkFrequencyDays || 7} ngày/lần</span>
                        </div>

                        {/* Thông tin bổ sung cho sổ dạng bẫy (nếu có) */}
                        {hasTraps && (
                            <>
                                <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                                    <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Loại bẫy sử dụng:</span>
                                    <span className="font-semibold text-slate-900">{bookDetail.trapType || bookDetail.traps[0]?.trapType || "Bẫy lồng"}</span>
                                </div>
                                <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2">
                                    <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Chất dẫn dụ:</span>
                                    <span className="font-semibold text-slate-900">{bookDetail.attractant || bookDetail.traps[0]?.attractant || "Pheromone"}</span>
                                </div>
                            </>
                        )}
                        {hasTraps && bookDetail.targetPart && (
                            <div className="flex items-start justify-between sm:justify-start gap-3 border-b border-slate-100 pb-2 md:col-span-2">
                                <span className="font-bold text-slate-700 min-w-[185px] sm:min-w-[210px] shrink-0">Bộ phận theo dõi:</span>
                                <span className="font-semibold text-slate-900">{bookDetail.targetPart}</span>
                            </div>
                        )}
                    </div>

                    {/* MỤC 1: DANH SÁCH BẪY (CHỈ HIỂN THỊ NẾU CÓ BẪY) */}
                    {hasTraps && (
                        <div className="space-y-3 pt-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Crosshair className="h-5 w-5 text-brand-600 shrink-0" />
                                    <span>Danh sách bẫy:</span>
                                </h3>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setShowAddTrapModal(true)}
                                    className="h-8 shrink-0 whitespace-nowrap rounded-xl bg-brand-600 px-3 text-xs font-bold text-white hover:bg-brand-700 shadow-soft"
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5 shrink-0" />
                                    <span>Thêm bẫy</span>
                                </Button>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 w-14 text-center">STT</th>
                                            <th className="px-4 py-3">Mã bẫy</th>
                                            <th className="px-4 py-3">Loại bẫy</th>
                                            <th className="px-4 py-3">Chất dẫn dụ / Mồi bẫy</th>
                                            <th className="px-4 py-3">Vị trí đặt</th>
                                            <th className="px-4 py-3">Ghi chú</th>
                                            <th className="px-4 py-3 text-center w-28">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {bookDetail.traps.map((trap, idx) => {
                                            const locStr = trap.latitude && trap.longitude
                                                ? `${trap.locationName} (${trap.latitude.toFixed(7)}, ${trap.longitude.toFixed(7)})`
                                                : trap.locationName || "-";

                                            return (
                                                <tr key={trap.id} className="hover:bg-slate-50/60">
                                                    <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-mono font-bold text-brand-700 text-xs">
                                                        {trap.trapCode}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-medium text-slate-800">
                                                        {trap.trapType}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-700">
                                                        {trap.attractant || bookDetail.attractant || "-"}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{locStr}</td>
                                                    <td className="px-4 py-3 text-xs text-slate-500">{trap.notes || "-"}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${trap.status === "ACTIVE"
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
                                                <td colSpan={7} className="py-6 text-center text-xs text-slate-400">
                                                    Chưa có bẫy nào trong sổ. Bấm &quot;Thêm bẫy&quot; để cài đặt bẫy mới.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* MỤC 3: CÁC BIỆN PHÁP XỬ LÝ ĐÃ THỰC HIỆN */}
                    <div className="space-y-3 pt-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-purple-600 shrink-0" />
                                <span>CÁC BIỆN PHÁP XỬ LÝ THỰC HIỆN</span>
                            </h3>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setShowAddTreatmentModal(true)}
                                className="h-8 shrink-0 whitespace-nowrap rounded-xl bg-purple-600 px-3 text-xs font-bold text-white hover:bg-purple-700 shadow-soft"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5 shrink-0" />
                                <span>Ghi nhận xử lý</span>
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
                                        <th className="px-4 py-3 whitespace-nowrap text-center">Thời gian cách ly (PHI)</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Khu vực / Diện tích</th>
                                        <th className="px-4 py-3">Kết quả / Ghi chú</th>
                                        <th className="w-[80px] px-2 py-3 text-center whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bookDetail.treatments.map((tr) => (
                                        <tr key={tr.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap">
                                                {formatVietnameseDate(tr.treatmentDate)}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-purple-700 whitespace-nowrap">
                                                {tr.treatmentType}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap">
                                                {tr.productUsed || "Không dùng hóa chất"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                                {tr.dosage || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-center font-bold text-amber-700 whitespace-nowrap">
                                                {tr.phiDays !== undefined && tr.phiDays !== null ? `${tr.phiDays} ngày` : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                                {tr.areaTreated || "Toàn vườn"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                {tr.resultNotes || tr.notes || "-"}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        disabled={!isSeasonActive}
                                                        onClick={() => handleOpenEditTreatment(tr)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-200 bg-purple-50/60 text-purple-700 hover:bg-purple-100 hover:text-purple-800 disabled:opacity-40 transition cursor-pointer"
                                                        title={isSeasonActive ? "Sửa" : "Vụ mùa đã đóng"}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!isSeasonActive}
                                                        onClick={() => handleOpenDeleteTreatment(tr)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40 transition cursor-pointer"
                                                        title={isSeasonActive ? "Xóa" : "Vụ mùa đã đóng"}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {bookDetail.treatments.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-6 text-center text-xs text-slate-400">
                                                Chưa có can thiệp xử lý nào. Mật độ sinh vật gây hại vẫn đang trong ngưỡng an toàn.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MỤC 2: BẢNG THEO DÕI CHI TIẾT */}
                    <div className="space-y-3 pt-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600 shrink-0" />
                                <span>BẢNG THEO DÕI CHI TIẾT</span>
                            </h3>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setShowAddInspectionModal(true)}
                                className="h-8 shrink-0 whitespace-nowrap rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 shadow-soft"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5 shrink-0" />
                                <span>Ghi nhận điều tra</span>
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            {hasTraps ? (
                                // Table theo bẫy (ví dụ Ruồi đục trái: 10 dòng)
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
                                            <th className="px-4 py-3">Ghi chú / Tình trạng mồi</th>
                                            <th className="w-[80px] px-2 py-3 text-center whitespace-nowrap">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {trapInspectionRows.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap">
                                                    {formatVietnameseDate(row.inspectionDate)}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-brand-700 text-xs whitespace-nowrap">
                                                    {row.trapCode}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                                                    {row.location}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold">
                                                    <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs ${row.pestsCount === 0
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : "bg-red-50 text-red-700 border border-red-200"
                                                        }`}>
                                                        {row.pestsCount} cá thể
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">
                                                    {row.inspectorName}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {row.notes}
                                                </td>
                                                <td className="whitespace-nowrap px-2 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            disabled={!isSeasonActive}
                                                            onClick={() => handleOpenEditInspection(row.inspection)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50/60 text-brand-700 hover:bg-brand-100 hover:text-brand-800 disabled:opacity-40 transition cursor-pointer"
                                                            title={isSeasonActive ? "Sửa" : "Vụ mùa đã đóng"}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={!isSeasonActive}
                                                            onClick={() => handleOpenDeleteInspection(row.inspection)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40 transition cursor-pointer"
                                                            title={isSeasonActive ? "Xóa" : "Vụ mùa đã đóng"}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {trapInspectionRows.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                                                    Chưa có lần điều tra nào. Bấm &quot;Ghi nhận điều tra&quot; để thêm dữ liệu kiểm tra bẫy.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                // Table theo dõi trực tiếp
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 whitespace-nowrap">Ngày điều tra</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Kết quả kiểm tra</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Người điều tra</th>
                                            <th className="px-4 py-3">Ghi chú / Đánh giá</th>
                                            <th className="w-[80px] px-2 py-3 text-center whitespace-nowrap">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedInspections.map((ins) => {
                                            const resultStr = ins.resultText || ins.items?.[0]?.resultText || (ins.totalPestsCount > 0 ? `Có phát hiện (${ins.densityLevel || "Nhẹ"})` : "Không phát hiện");

                                            return (
                                                <tr key={ins.id} className="hover:bg-slate-50/60">
                                                    <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap">
                                                        {formatVietnameseDate(ins.inspectionDate)}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-800 whitespace-pre-wrap break-words">
                                                        {resultStr}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">
                                                        {ins.inspectorName}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600">
                                                        {ins.notes || ins.items?.[0]?.notes || "-"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-2 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                disabled={!isSeasonActive}
                                                                onClick={() => handleOpenEditInspection(ins)}
                                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50/60 text-brand-700 hover:bg-brand-100 hover:text-brand-800 disabled:opacity-40 transition cursor-pointer"
                                                                title={isSeasonActive ? "Sửa" : "Vụ mùa đã đóng"}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={!isSeasonActive}
                                                                onClick={() => handleOpenDeleteInspection(ins)}
                                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40 transition cursor-pointer"
                                                                title={isSeasonActive ? "Xóa" : "Vụ mùa đã đóng"}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {sortedInspections.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                                                    Chưa có lần điều tra nào. Bấm &quot;Ghi nhận điều tra&quot; để thêm dữ liệu theo dõi.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* MODAL: THÊM BẪY MỚI TRONG DETAIL */}
                {mounted && showAddTrapModal && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowAddTrapModal(false);
                        }}
                    >
                        <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-100 my-auto">
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
                                <h3 className="font-bold text-slate-900 text-lg">Thêm bẫy mới</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAddTrapModal(false)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                                    title="Đóng modal"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddTrap} className="p-6 space-y-3.5">
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
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Loại bẫy</label>
                                        <select
                                            value={trapForm.trapType}
                                            onChange={(e) => setTrapForm({ ...trapForm, trapType: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        >
                                            {TRAP_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Chất dẫn dụ</label>
                                        <input
                                            type="text"
                                            placeholder="Pheromone..."
                                            value={trapForm.attractant}
                                            onChange={(e) => setTrapForm({ ...trapForm, attractant: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
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
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú</label>
                                    <input
                                        type="text"
                                        placeholder="Chiều cao treo bẫy, hướng gió..."
                                        value={trapForm.notes}
                                        onChange={(e) => setTrapForm({ ...trapForm, notes: e.target.value })}
                                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex gap-2 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddTrapModal(false)}
                                        className="flex-1 rounded-2xl cursor-pointer"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 cursor-pointer"
                                    >
                                        {submitting ? "Đang lưu..." : "Lưu bẫy"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* MODAL: GHI NHẬN ĐIỀU TRA */}
                {mounted && showAddInspectionModal && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowAddInspectionModal(false);
                        }}
                    >
                        <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto border border-slate-100">
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
                                <h3 className="font-bold text-slate-900 text-lg">Ghi nhận đợt điều tra</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAddInspectionModal(false)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                                    title="Đóng modal"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddInspection} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
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

                                    {hasTraps ? (
                                        // Ghi nhận theo từng bẫy
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
                                    ) : (
                                        // Ghi nhận quan sát / kiểm tra trực tiếp
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Kết quả kiểm tra *</label>
                                            <textarea
                                                required
                                                rows={3}
                                                placeholder="Ví dụ: 3–5 con/chồi; 10% lá bị hại; mật độ giảm sau xử lý..."
                                                value={inspectionForm.resultText}
                                                onChange={(e) => setInspectionForm({ ...inspectionForm, resultText: e.target.value })}
                                                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                            />
                                            <p className="mt-1 text-xs text-slate-500">Nhập kết quả tự do, có thể ghi nhiều giá trị trên các dòng riêng.</p>
                                        </div>
                                    )}

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
                                                placeholder="Đề xuất biện pháp xử lý (ví dụ: phun thuốc trừ rầy, phun bả sinh học...)"
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
                                            placeholder="Tình trạng mồi bẫy, mức độ phục hồi của chồi non..."
                                            value={inspectionForm.notes}
                                            onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                                            className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddInspectionModal(false)}
                                        className="flex-1 h-11 rounded-2xl font-bold cursor-pointer hover:bg-slate-100"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-11 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft font-bold cursor-pointer"
                                    >
                                        {submitting ? "Đang lưu..." : "Lưu đợt điều tra"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* MODAL: GHI NHẬN XỬ LÝ (KÈM AUTO-FILL TỪ NHẬT KÝ CANH TÁC) */}
                {mounted && showAddTreatmentModal && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowAddTreatmentModal(false);
                        }}
                    >
                        <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto border border-slate-100">
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">Ghi nhận biện pháp xử lý</h3>
                                    <p className="text-xs text-slate-400">Can thiệp bảo vệ thực vật cho {bookDetail.pestName}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddTreatmentModal(false)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                                    title="Đóng modal"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddTreatment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-3">
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
                                                placeholder="Ví dụ: Phun thuốc BVTV, Phun bả sinh học..."
                                                value={treatmentForm.treatmentType}
                                                onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentType: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Tên thuốc / Chế phẩm sử dụng</label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: Radiant 60SC, Ento-Pro, SOFRI Protein..."
                                            value={treatmentForm.productUsed}
                                            onChange={(e) => setTreatmentForm({ ...treatmentForm, productUsed: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none font-semibold text-slate-900"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Liều lượng</label>
                                            <input
                                                type="text"
                                                placeholder="Ví dụ: 15ml/bình 16L, 50ml/cây..."
                                                value={treatmentForm.dosage}
                                                onChange={(e) => setTreatmentForm({ ...treatmentForm, dosage: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Thời gian cách ly (PHI ngày)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Ví dụ: 3, 7, 14..."
                                                value={treatmentForm.phiDays}
                                                onChange={(e) => setTreatmentForm({ ...treatmentForm, phiDays: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Khu vực / Diện tích xử lý</label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: Toàn vườn, Lô A, 50 gốc..."
                                            value={treatmentForm.areaTreated}
                                            onChange={(e) => setTreatmentForm({ ...treatmentForm, areaTreated: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Đánh giá kết quả sau xử lý</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Ví dụ: Mật độ sâu giảm rõ rệt, không phát hiện vết chích mới..."
                                            value={treatmentForm.resultNotes}
                                            onChange={(e) => setTreatmentForm({ ...treatmentForm, resultNotes: e.target.value })}
                                            className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddTreatmentModal(false)}
                                        className="flex-1 h-11 rounded-2xl font-bold cursor-pointer hover:bg-slate-100"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-11 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft font-bold cursor-pointer"
                                    >
                                        {submitting ? "Đang lưu..." : "Lưu xử lý"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* MODAL: CHỈNH SỬA ĐỢT ĐIỀU TRA */}
                {mounted && showEditInspectionModal && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowEditInspectionModal(false);
                        }}
                    >
                        <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto border border-slate-100">
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">Chỉnh sửa đợt điều tra</h3>
                                    <p className="text-xs text-slate-400">Cập nhật số liệu kiểm tra cho {bookDetail.pestName}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEditInspectionModal(false)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                                    title="Đóng modal"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateInspection} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Ngày điều tra *</label>
                                            <input
                                                type="date"
                                                required
                                                value={editInspectionForm.inspectionDate}
                                                onChange={(e) => setEditInspectionForm({ ...editInspectionForm, inspectionDate: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Người điều tra</label>
                                            <input
                                                type="text"
                                                placeholder="Chủ vườn..."
                                                value={editInspectionForm.inspectorName}
                                                onChange={(e) => setEditInspectionForm({ ...editInspectionForm, inspectorName: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {hasTraps ? (
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
                                                                value={editInspectionForm.trapCounts[t.id] ?? 0}
                                                                onChange={(e) =>
                                                                    setEditInspectionForm({
                                                                        ...editInspectionForm,
                                                                        trapCounts: {
                                                                            ...editInspectionForm.trapCounts,
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
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Mật độ / Kết quả kiểm tra *</label>
                                            <textarea
                                                required
                                                rows={3}
                                                placeholder="Ví dụ: 3–5 con/chồi; 10% lá bị hại; mật độ giảm sau xử lý..."
                                                value={editInspectionForm.resultText}
                                                onChange={(e) => setEditInspectionForm({ ...editInspectionForm, resultText: e.target.value })}
                                                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                            />
                                            <p className="mt-1 text-xs text-slate-500">Nhập kết quả tự do, có thể ghi nhiều giá trị trên các dòng riêng.</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={editInspectionForm.actionNeeded}
                                                onChange={(e) => setEditInspectionForm({ ...editInspectionForm, actionNeeded: e.target.checked })}
                                                className="h-4 w-4 rounded text-brand-600"
                                            />
                                            <span>Cần biện pháp can thiệp / xử lý khẩn cấp</span>
                                        </label>
                                        {editInspectionForm.actionNeeded && (
                                            <input
                                                type="text"
                                                placeholder="Đề xuất biện pháp xử lý..."
                                                value={editInspectionForm.actionNote}
                                                onChange={(e) => setEditInspectionForm({ ...editInspectionForm, actionNote: e.target.value })}
                                                className="mt-2 h-10 w-full rounded-2xl border border-amber-300 bg-amber-50 px-3 text-sm text-amber-900 focus:border-amber-500 focus:outline-none"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú thêm</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Tình trạng mồi bẫy, mức độ phục hồi của chồi non..."
                                            value={editInspectionForm.notes}
                                            onChange={(e) => setEditInspectionForm({ ...editInspectionForm, notes: e.target.value })}
                                            className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowEditInspectionModal(false)}
                                        className="flex-1 h-11 rounded-2xl font-bold cursor-pointer hover:bg-slate-100"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-11 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft font-bold cursor-pointer"
                                    >
                                        {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* MODAL: XÁC NHẬN XÓA ĐỢT ĐIỀU TRA */}
                {mounted && deletingInspection && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget && !submitting) setDeletingInspection(null);
                        }}
                    >
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                    <Trash2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Xác nhận xóa đợt điều tra</h3>
                                    <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5 text-slate-700">
                                <p>
                                    <span className="font-bold text-slate-500">Ngày điều tra: </span>
                                    <span className="font-semibold text-slate-900">{formatVietnameseDate(deletingInspection.inspectionDate)}</span>
                                </p>
                                <p>
                                    <span className="font-bold text-slate-500">Người điều tra: </span>
                                    <span className="font-semibold text-slate-900">{deletingInspection.inspectorName}</span>
                                </p>
                                <p>
                                    <span className="font-bold text-slate-500">Kết quả / Mật độ: </span>
                                    <span className="font-semibold text-slate-900">
                                        {deletingInspection.resultText || (deletingInspection.totalPestsCount > 0 ? `${deletingInspection.totalPestsCount} cá thể` : "Không phát hiện")}
                                    </span>
                                </p>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                                Bạn có chắc chắn muốn xóa bản ghi theo dõi này khỏi sổ sinh vật gây hại?
                            </p>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={submitting}
                                    onClick={() => setDeletingInspection(null)}
                                    className="rounded-xl font-bold cursor-pointer"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    disabled={submitting}
                                    onClick={handleConfirmDeleteInspection}
                                    className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700 cursor-pointer"
                                >
                                    {submitting ? "Đang xóa..." : "Xóa đợt điều tra"}
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* MODAL: CHỈNH SỬA BIỆN PHÁP XỬ LÝ */}
                {mounted && showEditTreatmentModal && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowEditTreatmentModal(false);
                        }}
                    >
                        <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto border border-slate-100">
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">Chỉnh sửa biện pháp xử lý</h3>
                                    <p className="text-xs text-slate-400">Cập nhật can thiệp cho {bookDetail.pestName}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEditTreatmentModal(false)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                                    title="Đóng modal"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateTreatment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Ngày thực hiện *</label>
                                            <input
                                                type="date"
                                                required
                                                value={editTreatmentForm.treatmentDate}
                                                onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, treatmentDate: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Biện pháp can thiệp *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ví dụ: Phun thuốc BVTV, Phun bả sinh học..."
                                                value={editTreatmentForm.treatmentType}
                                                onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, treatmentType: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Tên thuốc / Chế phẩm sử dụng</label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: Radiant 60SC, Ento-Pro, SOFRI Protein..."
                                            value={editTreatmentForm.productUsed}
                                            onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, productUsed: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none font-semibold text-slate-900"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Liều lượng</label>
                                            <input
                                                type="text"
                                                placeholder="Ví dụ: 15ml/bình 16L, 50ml/cây..."
                                                value={editTreatmentForm.dosage}
                                                onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, dosage: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Thời gian cách ly (PHI ngày)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Ví dụ: 3, 7, 14..."
                                                value={editTreatmentForm.phiDays}
                                                onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, phiDays: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Khu vực / Diện tích xử lý</label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: Toàn vườn, Lô A, 50 gốc..."
                                            value={editTreatmentForm.areaTreated}
                                            onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, areaTreated: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Đánh giá kết quả sau xử lý</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Ví dụ: Mật độ sâu giảm rõ rệt, không phát hiện vết chích mới..."
                                            value={editTreatmentForm.resultNotes}
                                            onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, resultNotes: e.target.value })}
                                            className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowEditTreatmentModal(false)}
                                        className="flex-1 h-11 rounded-2xl font-bold cursor-pointer hover:bg-slate-100"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-11 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft font-bold cursor-pointer"
                                    >
                                        {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* MODAL: XÁC NHẬN XÓA BIỆN PHÁP XỬ LÝ */}
                {mounted && deletingTreatment && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget && !submitting) setDeletingTreatment(null);
                        }}
                    >
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                    <Trash2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Xác nhận xóa biện pháp xử lý</h3>
                                    <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5 text-slate-700">
                                <p>
                                    <span className="font-bold text-slate-500">Ngày xử lý: </span>
                                    <span className="font-semibold text-slate-900">{formatVietnameseDate(deletingTreatment.treatmentDate)}</span>
                                </p>
                                <p>
                                    <span className="font-bold text-slate-500">Biện pháp: </span>
                                    <span className="font-bold text-purple-700">{deletingTreatment.treatmentType}</span>
                                </p>
                                {deletingTreatment.productUsed && (
                                    <p>
                                        <span className="font-bold text-slate-500">Thuốc / Chế phẩm: </span>
                                        <span className="font-semibold text-slate-900">{deletingTreatment.productUsed}</span>
                                    </p>
                                )}
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                                Bạn có chắc chắn muốn xóa bản ghi can thiệp xử lý này khỏi sổ sinh vật gây hại?
                            </p>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={submitting}
                                    onClick={() => setDeletingTreatment(null)}
                                    className="rounded-xl font-bold cursor-pointer"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    disabled={submitting}
                                    onClick={handleConfirmDeleteTreatment}
                                    className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700 cursor-pointer"
                                >
                                    {submitting ? "Đang xóa..." : "Xóa biện pháp xử lý"}
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
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
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 shrink-0">
                            <span>🔒 Vụ mùa đã đóng (Chế độ chỉ xem)</span>
                        </div>
                        {onReopenSeason && (
                            <Button
                                type="button"
                                onClick={onReopenSeason}
                                className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs sm:text-sm font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 shrink-0"
                            >
                                <Unlock className="mr-1.5 h-4 w-4 text-emerald-600" />
                                Mở khóa vụ mùa
                            </Button>
                        )}
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
                        placeholder="Tìm kiếm sinh vật, phương pháp, loại bẫy..."
                        className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                    />
                </div>

                <div className="flex gap-1.5 text-xs">
                    {(["ACTIVE", "CLOSED", "ALL"] as const).map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`rounded-full px-3.5 py-2 font-bold transition ${statusFilter === st
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
                        Bấm &quot;Tạo sổ theo dõi&quot; để thiết lập phương pháp theo dõi và ghi nhận điều tra định kỳ.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBooks.map((book) => {
                        const lastIns = book.latestInspection;
                        const lastTrt = book.latestTreatment;
                        const isTrapBased = book.trapsCount > 0 || (book.monitoringMethods || []).includes("Kiểm tra bẫy");
                        const rawMethods = book.monitoringMethods && book.monitoringMethods.length > 0
                            ? book.monitoringMethods
                            : isTrapBased
                                ? ["Kiểm tra bẫy"]
                                : ["Phun thuốc"];
                        const methods = rawMethods.map((m) => (m === "Quan sát trực tiếp" ? "Phun thuốc" : m));

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
                                            {book.scientificName && (
                                                <p className="text-xs italic text-slate-500 mt-0.5">
                                                    {book.scientificName}
                                                </p>
                                            )}
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">
                                                {book.cropSeason?.name || seasonName || (seasonYear ? `Niên vụ ${seasonYear - 1}-${seasonYear}` : "Niên vụ 2025-2026")}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${book.status === "ACTIVE"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {book.status === "ACTIVE" ? "Đang theo dõi" : "Đã đóng"}
                                        </span>
                                    </div>

                                    {/* Thông tin phát hiện ban đầu */}
                                    <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="text-slate-400">Phát hiện đầu tiên:</span>
                                            <span className="font-semibold text-slate-800">
                                                {formatVietnameseDate(book.firstDetectedDate || book.startDate)}
                                            </span>
                                        </div>
                                        {book.discoveryStage && (
                                            <div className="flex items-center justify-between text-slate-600">
                                                <span className="text-slate-400">Giai đoạn cây:</span>
                                                <span className="font-medium text-slate-800">
                                                    {formatStageLabel(book.discoveryStage)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="text-slate-400">{isTrapBased ? "Phương pháp:" : "Biện pháp:"}</span>
                                            <div className="flex flex-wrap gap-1 justify-end">
                                                {methods.map((m) => (
                                                    <span
                                                        key={m}
                                                        className="inline-flex items-center rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200"
                                                    >
                                                        {m}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {isTrapBased ? (
                                            <div className="pt-1 border-t border-slate-200/60 flex items-center gap-1.5 font-bold text-brand-700">
                                                <Crosshair className="h-3.5 w-3.5 shrink-0" />
                                                <span>
                                                    {book.trapsCount} bẫy • {book.trapType || "Bẫy lồng"}
                                                    {book.attractant ? ` (${book.attractant})` : ""}
                                                </span>
                                            </div>
                                        ) : book.targetPart ? (
                                            <div className="pt-1 border-t border-slate-200/60 text-slate-600">
                                                <span className="text-slate-400">Bộ phận theo dõi: </span>
                                                <span className="font-semibold text-slate-800">
                                                    {book.targetPart}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Lần điều tra & Biện pháp gần nhất */}
                                    <div className="space-y-1.5 text-xs border-t border-slate-100 pt-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Lần kiểm tra gần nhất:</span>
                                            <span className="font-semibold text-slate-700">
                                                {lastIns ? formatVietnameseDate(lastIns.inspectionDate) : "Chưa kiểm tra"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Kết quả gần nhất:</span>
                                            <span
                                                className={`font-bold ${!lastIns
                                                    ? "text-slate-400"
                                                    : lastIns.totalPestsCount > 0
                                                        ? "text-amber-700"
                                                        : "text-emerald-600"
                                                    }`}
                                            >
                                                {!lastIns
                                                    ? "Chưa có dữ liệu"
                                                    : isTrapBased
                                                        ? (lastIns.totalPestsCount > 0 ? `${lastIns.totalPestsCount} cá thể` : "0 cá thể")
                                                        : (lastIns.resultText || (lastIns.totalPestsCount > 0 ? "Có phát hiện" : "Không phát hiện"))}
                                            </span>
                                        </div>
                                        {lastTrt && (
                                            <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                                                <span className="text-slate-400">Xử lý gần nhất:</span>
                                                <span className="font-medium text-purple-700 truncate max-w-[170px]" title={lastTrt.treatmentType}>
                                                    {lastTrt.productUsed || lastTrt.treatmentType}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action button */}
                                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-end gap-2">
                                    {isSeasonActive && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteBookById(book.id, book.pestName);
                                            }}
                                            disabled={submitting}
                                            className="h-9 px-3 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-bold"
                                            title="Xóa sổ theo dõi này"
                                        >
                                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                                            Xóa sổ
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        onClick={() => handleSelectBook(book.id)}
                                        className="rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-brand-600 w-full sm:w-auto shadow-xs h-9"
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

            {/* ========================================================================= */}
            {/* MODAL: TẠO SỔ THEO DÕI SINH VẬT GÂY HẠI CHUẨN MỚI */}
            {/* ========================================================================= */}
            {mounted && showCreateBookModal && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowCreateBookModal(false);
                    }}
                >
                    <div className="relative w-full max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto border border-slate-100">
                        {/* Header cố định ở đỉnh modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 sm:px-8 py-4 sm:py-5 bg-white shrink-0">
                            <div>
                                <h3 className="font-black text-slate-900 text-lg sm:text-xl uppercase tracking-tight">
                                    TẠO SỔ THEO DÕI SINH VẬT GÂY HẠI
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {farmName} • {seasonName || (seasonYear ? `Niên vụ ${seasonYear - 1}-${seasonYear}` : "Niên vụ 2025-2026")}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateBookModal(false)}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                                title="Đóng modal"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form với vùng thân cuộn độc lập ở giữa, thanh cuộn không chạm góc bo */}
                        <form onSubmit={handleCreateBook} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 sm:py-6 space-y-6 custom-scrollbar">
                                {/* KHỐI 1: THÔNG TIN THEO DÕI */}
                                <div className="space-y-3">
                                    <div className="border-b border-slate-100 pb-1.5">
                                        <h4 className="text-xs font-black uppercase text-brand-700 tracking-wider">
                                            THÔNG TIN THEO DÕI
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Niên vụ *</label>
                                            <input
                                                type="text"
                                                disabled
                                                value={seasonName || (seasonYear ? `Niên vụ ${seasonYear - 1}-${seasonYear}` : "Niên vụ 2025-2026")}
                                                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Sinh vật gây hại *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ví dụ: Ruồi đục trái, Rầy xanh..."
                                                value={createBookForm.pestName}
                                                onChange={(e) => setCreateBookForm({ ...createBookForm, pestName: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none font-bold text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Tên khoa học</label>
                                            <input
                                                type="text"
                                                placeholder="Bactrocera dorsalis..."
                                                value={createBookForm.scientificName}
                                                onChange={(e) => setCreateBookForm({ ...createBookForm, scientificName: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none italic"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Ngày phát hiện đầu tiên *</label>
                                            <input
                                                type="date"
                                                required
                                                value={createBookForm.firstDetectedDate}
                                                onChange={(e) => setCreateBookForm({ ...createBookForm, firstDetectedDate: e.target.value })}
                                                className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-sm focus:border-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Giai đoạn cây khi phát hiện *</label>
                                        <select
                                            value={createBookForm.discoveryStage}
                                            onChange={(e) => setCreateBookForm({ ...createBookForm, discoveryStage: e.target.value })}
                                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm focus:border-brand-500 focus:outline-none"
                                        >
                                            {STAGES.map((st) => (
                                                <option key={st.value} value={st.value}>
                                                    {st.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* KHỐI 2: BIỆN PHÁP XỬ LÝ */}
                                <div className="space-y-4 pt-2">
                                    <div className="border-b border-slate-100 pb-1.5">
                                        <h4 className="text-xs font-black uppercase text-brand-700 tracking-wider">
                                            BIỆN PHÁP XỬ LÝ
                                        </h4>
                                    </div>

                                    {/* 2 lựa chọn: Đặt bẫy hoặc Phun thuốc */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCreateBookForm((prev) => ({
                                                    ...prev,
                                                    treatmentMethod: "TRAP",
                                                    monitoringMethods: ["Kiểm tra bẫy"],
                                                }))
                                            }
                                            className={`flex items-center justify-between rounded-2xl border p-3 text-left transition cursor-pointer ${createBookForm.treatmentMethod === "TRAP"
                                                ? "border-brand-600 bg-brand-50/80 text-brand-900 ring-2 ring-brand-500/20 shadow-xs"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xl">🪤</span>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">Đặt bẫy</div>
                                                    <div className="text-[11px] font-medium text-slate-500">Giám sát & bắt bằng bẫy</div>
                                                </div>
                                            </div>
                                            <span
                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${createBookForm.treatmentMethod === "TRAP"
                                                    ? "border-brand-600 bg-brand-600"
                                                    : "border-slate-300 bg-white"
                                                    }`}
                                            >
                                                {createBookForm.treatmentMethod === "TRAP" && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                                )}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCreateBookForm((prev) => ({
                                                    ...prev,
                                                    treatmentMethod: "SPRAY",
                                                    monitoringMethods: ["Quan sát trực tiếp", "Phun thuốc"],
                                                }))
                                            }
                                            className={`flex items-center justify-between rounded-2xl border p-3 text-left transition cursor-pointer ${createBookForm.treatmentMethod === "SPRAY"
                                                ? "border-brand-600 bg-brand-50/80 text-brand-900 ring-2 ring-brand-500/20 shadow-xs"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xl">🧴</span>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">Phun thuốc</div>
                                                    <div className="text-[11px] font-medium text-slate-500">Xử lý thuốc BVTV / sinh học</div>
                                                </div>
                                            </div>
                                            <span
                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${createBookForm.treatmentMethod === "SPRAY"
                                                    ? "border-brand-600 bg-brand-600"
                                                    : "border-slate-300 bg-white"
                                                    }`}
                                            >
                                                {createBookForm.treatmentMethod === "SPRAY" && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                                )}
                                            </span>
                                        </button>
                                    </div>

                                    {/* NẾU CHỌN ĐẶT BẪY */}
                                    {createBookForm.treatmentMethod === "TRAP" && (
                                        <div className="space-y-4 pt-1">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                                        Chất dẫn dụ
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ví dụ: Pheromone Methyl Eugenol..."
                                                        value={createBookForm.attractant}
                                                        onChange={(e) =>
                                                            setCreateBookForm({ ...createBookForm, attractant: e.target.value })
                                                        }
                                                        className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                                        Tần suất kiểm tra *
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            required
                                                            placeholder="Ví dụ: 7"
                                                            value={createBookForm.checkFrequencyDays}
                                                            onChange={(e) =>
                                                                setCreateBookForm({
                                                                    ...createBookForm,
                                                                    checkFrequencyDays: e.target.value,
                                                                })
                                                            }
                                                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-3.5 pr-24 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                                                        />
                                                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                                            ngày / lần
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bảng danh sách bẫy theo dõi (STT, Mã bẫy, Vị trí, Ghi chú) */}
                                            <div className="space-y-2 pt-1">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                                    <h4 className="text-xs font-black uppercase text-brand-700 tracking-wider">
                                                        BẢNG DANH SÁCH BẪY THEO DÕI
                                                    </h4>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleAddEmptyTrapRow}
                                                        className="h-8 rounded-xl bg-brand-600 px-3 text-xs font-bold text-white hover:bg-brand-700 shadow-2xs cursor-pointer"
                                                    >
                                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                                        Thêm bẫy
                                                    </Button>
                                                </div>

                                                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                                                            <tr>
                                                                <th className="px-3 py-2.5 text-center w-12">STT</th>
                                                                <th className="px-3 py-2.5 w-36">Mã bẫy *</th>
                                                                <th className="px-3 py-2.5 w-2/5 min-w-[200px]">Vị trí *</th>
                                                                <th className="px-3 py-2.5 min-w-[180px]">Ghi chú</th>
                                                                <th className="px-3 py-2.5 text-center w-14">Xóa</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {createBookForm.traps.map((trap, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                                    <td className="px-3 py-2 text-center font-bold text-slate-500">
                                                                        {idx + 1}
                                                                    </td>
                                                                    <td className="p-1.5 w-36">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Ví dụ: BAY-01"
                                                                            value={trap.trapCode}
                                                                            onChange={(e) =>
                                                                                handleUpdateTrapRow(idx, "trapCode", e.target.value)
                                                                            }
                                                                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-brand-700 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:outline-none bg-white font-mono"
                                                                        />
                                                                    </td>
                                                                    <td className="p-1.5">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Ví dụ: Khu A - hàng 10"
                                                                            value={trap.locationName}
                                                                            onChange={(e) =>
                                                                                handleUpdateTrapRow(idx, "locationName", e.target.value)
                                                                            }
                                                                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none bg-white"
                                                                        />
                                                                    </td>
                                                                    <td className="p-1.5">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Ghi chú bẫy..."
                                                                            value={trap.notes || ""}
                                                                            onChange={(e) =>
                                                                                handleUpdateTrapRow(idx, "notes", e.target.value)
                                                                            }
                                                                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-600 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none bg-white"
                                                                        />
                                                                    </td>
                                                                    <td className="p-1.5 text-center">
                                                                        {createBookForm.traps.length > 1 ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveTrapFromCreateList(idx)}
                                                                                className="text-red-500 hover:text-red-700 p-2 rounded-xl hover:bg-red-50 cursor-pointer transition inline-flex items-center justify-center"
                                                                                title="Xóa hàng bẫy này"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleResetFirstTrapRow()}
                                                                                className="text-slate-300 hover:text-slate-500 p-2 rounded-xl hover:bg-slate-100 cursor-pointer transition inline-flex items-center justify-center"
                                                                                title="Xóa trắng hàng này"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* NẾU CHỌN PHUN THUỐC */}
                                    {createBookForm.treatmentMethod === "SPRAY" && (
                                        <div className="space-y-3 pt-1">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                                    Tên thuốc sử dụng *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Ví dụ: Radiant 60SC, Abamectin 3.6EC, Karate 2.5EC..."
                                                    value={createBookForm.sprayProduct}
                                                    onChange={(e) =>
                                                        setCreateBookForm({ ...createBookForm, sprayProduct: e.target.value })
                                                    }
                                                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                                        Thời gian cách ly (PHI) *
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            required
                                                            placeholder="Ví dụ: 7 hoặc 14"
                                                            value={createBookForm.sprayPhiDays}
                                                            onChange={(e) =>
                                                                setCreateBookForm({
                                                                    ...createBookForm,
                                                                    sprayPhiDays: e.target.value,
                                                                })
                                                            }
                                                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-3.5 pr-16 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                                                        />
                                                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                                            ngày
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                                        Tần suất kiểm tra *
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            required
                                                            placeholder="Ví dụ: 7"
                                                            value={createBookForm.checkFrequencyDays}
                                                            onChange={(e) =>
                                                                setCreateBookForm({
                                                                    ...createBookForm,
                                                                    checkFrequencyDays: e.target.value,
                                                                })
                                                            }
                                                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-3.5 pr-24 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                                                        />
                                                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                                            ngày / lần
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú mục tiêu theo dõi</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Mục tiêu theo dõi, lưu ý điều kiện thời tiết hoặc ngưỡng can thiệp..."
                                            value={createBookForm.notes}
                                            onChange={(e) => setCreateBookForm({ ...createBookForm, notes: e.target.value })}
                                            className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer cố định ở đáy modal */}
                            <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/90 px-6 sm:px-8 py-4 sm:py-5 shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateBookModal(false)}
                                    className="flex-1 h-11 rounded-2xl font-bold cursor-pointer hover:bg-slate-100"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 h-11 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft font-bold cursor-pointer"
                                >
                                    {submitting ? "Đang tạo sổ..." : "Tạo sổ theo dõi"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
