'use client';

import { useMemo, useState } from "react";
import {
    AlertCircle,
    Boxes,
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    FileText,
    HelpCircle,
    Info,
    Layers,
    Loader2,
    Scale,
    Search,
    SlidersHorizontal,
    Trees,
    Truck,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ModalPortal } from "@/components/ui/modal-portal";
import { formatVietnameseDate, formatVietnameseDateTime } from "@/lib/date-format";

export type RawMaterialItem = {
    id: string;
    harvestId?: string;
    rawLotId?: string;
    code: string;
    receiptCode?: string;
    farmName: string;
    regionCode?: string;
    farmerName?: string;
    farmerPhone?: string;
    variety: string;
    harvestDate: string | Date;
    declaredWeight: number; // Nông dân khai báo (kg)
    declaredFruitCount?: number; // Nông dân khai báo (Số lượng trái)
    expectedPricePerKg?: number;
    actualReceivedWeight: number; // Cơ sở thực nhận (kg)
    actualFruitCount?: number; // Cơ sở thực nhận (Số lượng trái)
    weightDifference: number; // Chênh lệch (thực nhận - khai báo) kg
    fruitDifference?: number; // Chênh lệch số lượng trái
    receivedAt?: string | Date | null;
    vehiclePlate?: string;
    condition?: string;
    note?: string;
    status: "WAITING_CONFIRMATION" | "WAITING_RECEIPT" | "RECEIVED" | "WAITING_CLASSIFICATION" | "CLASSIFIED";
    direction: "UNCLASSIFIED" | "FRESH_EXPORT" | "PROCESSING" | "SPLIT";
    freshExportWeight?: number;
    freshExportFruitCount?: number;
    processingWeight?: number;
    processingFruitCount?: number;
    rejectedWeight?: number;
    rejectedFruitCount?: number;
};

export function ProcessingRawMaterialsView({ initialItems }: { initialItems: RawMaterialItem[] }) {
    const { toast } = useToast();
    const [items, setItems] = useState<RawMaterialItem[]>(initialItems);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [varietyFilter, setVarietyFilter] = useState<string>("ALL");

    // Modal 0: XÁC NHẬN PHIẾU THU HOẠCH (Bước đầu tiên khi Nông dân gửi phiếu)
    const [confirmingItem, setConfirmingItem] = useState<RawMaterialItem | null>(null);
    const [confirmNoteInput, setConfirmNoteInput] = useState<string>("");
    const [submittingConfirm, setSubmittingConfirm] = useState(false);

    // Modal 1: TIẾP NHẬN HÀNG (Cân thực tế)
    const [receivingItem, setReceivingItem] = useState<RawMaterialItem | null>(null);
    const [actualWeightInput, setActualWeightInput] = useState<number | string>("");
    const [actualFruitCountInput, setActualFruitCountInput] = useState<number | string>("");
    const [unitPriceInput, setUnitPriceInput] = useState<number | string>("");
    const [receivedAtInput, setReceivedAtInput] = useState<string>("");
    const [truckPlateInput, setTruckPlateInput] = useState<string>("");
    const [conditionInput, setConditionInput] = useState<string>("Đạt chuẩn tươi mới, gai xanh cứng, cuống tươi");
    const [receiveNoteInput, setReceiveNoteInput] = useState<string>("");
    const [submittingReceive, setSubmittingReceive] = useState(false);

    // Modal 2: PHÂN LOẠI LÔ
    const [classifyingItem, setClassifyingItem] = useState<RawMaterialItem | null>(null);
    const [freshWeightInput, setFreshWeightInput] = useState<number | string>("");
    const [freshFruitCountInput, setFreshFruitCountInput] = useState<number | string>("");
    const [procWeightInput, setProcWeightInput] = useState<number | string>("");
    const [procFruitCountInput, setProcFruitCountInput] = useState<number | string>("");
    const [rejectWeightInput, setRejectWeightInput] = useState<number | string>("");
    const [rejectFruitCountInput, setRejectFruitCountInput] = useState<number | string>("");
    const [classifyNoteInput, setClassifyNoteInput] = useState("");
    const [submittingClassify, setSubmittingClassify] = useState(false);

    // KPIs
    const kpis = useMemo(() => {
        const waitingConfirmation = items.filter((i) => i.status === "WAITING_CONFIRMATION").length;
        const waitingReceipt = items.filter((i) => i.status === "WAITING_RECEIPT").length;
        const waitingClassification = items.filter((i) => i.status === "WAITING_CLASSIFICATION" || (i.status === "RECEIVED" && i.direction === "UNCLASSIFIED")).length;
        const classified = items.filter((i) => i.status === "CLASSIFIED" || i.direction !== "UNCLASSIFIED").length;
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayWeight = items
            .filter((i) => {
                if (!i.receivedAt) return false;
                try {
                    return new Date(i.receivedAt).toISOString().slice(0, 10) === todayStr;
                } catch {
                    return false;
                }
            })
            .reduce((sum, i) => sum + (i.actualReceivedWeight || 0), 0);

        return { waitingConfirmation, waitingReceipt, waitingClassification, classified, todayWeight };
    }, [items]);

    // Handler: Open Confirm Modal
    const handleOpenConfirm = (item: RawMaterialItem) => {
        setConfirmingItem(item);
        setConfirmNoteInput("Cơ sở Chế biến Sầu riêng Trị An xác nhận tiếp nhận nguồn nguyên liệu theo kế hoạch thu hoạch của Farm.");
    };

    // Handler: Confirm Harvest Ticket
    const handleConfirmHarvest = async () => {
        if (!confirmingItem) return;
        const harvestId = confirmingItem.harvestId || confirmingItem.id.replace("harvest-", "");
        setSubmittingConfirm(true);

        try {
            const res = await fetch(`/api/harvests/${harvestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "CONFIRM",
                    note: confirmNoteInput || "Cơ sở chế biến xác nhận phiếu thu hoạch.",
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Không thể xác nhận phiếu thu hoạch.");
            }

            toast({
                title: "Xác nhận phiếu thành công",
                description: `Đã xác nhận phiếu ${confirmingItem.code} từ ${confirmingItem.farmName}. Phiếu đã chuyển sang trạng thái Chờ tiếp nhận.`,
                variant: "success",
            });

            setItems((prev) =>
                prev.map((i) =>
                    i.id === confirmingItem.id
                        ? {
                            ...i,
                            status: "WAITING_RECEIPT",
                            note: confirmNoteInput || i.note,
                        }
                        : i
                )
            );

            setConfirmingItem(null);
        } catch (err: any) {
            toast({ title: "Lỗi xác nhận", description: err.message || "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setSubmittingConfirm(false);
        }
    };

    // Handler: Reject Harvest Ticket
    const handleRejectHarvest = async () => {
        if (!confirmingItem) return;
        const reason = window.prompt("Vui lòng nhập lý do từ chối phiếu thu hoạch này:");
        if (reason === null) return;
        if (!reason.trim()) {
            toast({ title: "Thiếu lý do", description: "Vui lòng nhập lý do từ chối.", variant: "destructive" });
            return;
        }

        const harvestId = confirmingItem.harvestId || confirmingItem.id.replace("harvest-", "");
        setSubmittingConfirm(true);

        try {
            const res = await fetch(`/api/harvests/${harvestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "REJECT",
                    reason: reason.trim(),
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Không thể từ chối phiếu thu hoạch.");
            }

            toast({
                title: "Đã từ chối phiếu",
                description: `Đã từ chối tiếp nhận phiếu ${confirmingItem.code}.`,
                variant: "default",
            });

            setItems((prev) => prev.filter((i) => i.id !== confirmingItem.id));
            setConfirmingItem(null);
        } catch (err: any) {
            toast({ title: "Lỗi từ chối", description: err.message || "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setSubmittingConfirm(false);
        }
    };

    // Filter items
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = item.code.toLowerCase().includes(q) || (item.receiptCode && item.receiptCode.toLowerCase().includes(q));
                const matchFarm = item.farmName.toLowerCase().includes(q) || (item.farmerName && item.farmerName.toLowerCase().includes(q)) || (item.regionCode && item.regionCode.toLowerCase().includes(q));
                const matchVariety = item.variety.toLowerCase().includes(q);
                if (!matchCode && !matchFarm && !matchVariety) return false;
            }
            if (dateFilter) {
                const dateToCheck = item.receivedAt || item.harvestDate;
                if (!dateToCheck) return false;
                try {
                    if (new Date(dateToCheck).toISOString().slice(0, 10) !== dateFilter) return false;
                } catch {
                    return false;
                }
            }
            if (statusFilter !== "ALL") {
                if (statusFilter === "WAITING_CONFIRMATION" && item.status !== "WAITING_CONFIRMATION") return false;
                if (statusFilter === "WAITING_RECEIPT" && item.status !== "WAITING_RECEIPT") return false;
                if (statusFilter === "WAITING_CLASSIFICATION" && item.status !== "WAITING_CLASSIFICATION" && !(item.status === "RECEIVED" && item.direction === "UNCLASSIFIED")) return false;
                if (statusFilter === "CLASSIFIED" && item.status !== "CLASSIFIED" && item.direction === "UNCLASSIFIED") return false;
            }
            if (varietyFilter !== "ALL") {
                const v = item.variety.toLowerCase();
                if (varietyFilter === "Ri6" && !v.includes("ri6")) return false;
                if (varietyFilter === "Monthong" && !v.includes("monthong") && !v.includes("dona")) return false;
                if (varietyFilter === "Khác" && (v.includes("ri6") || v.includes("monthong") || v.includes("dona"))) return false;
            }
            return true;
        });
    }, [items, searchQuery, dateFilter, statusFilter, varietyFilter]);

    // Handler: Open Receive Drawer
    const handleOpenReceive = (item: RawMaterialItem) => {
        setReceivingItem(item);
        setActualWeightInput(item.actualReceivedWeight || item.declaredWeight || "");
        setActualFruitCountInput(item.actualFruitCount || item.declaredFruitCount || (item.declaredWeight ? Math.round(item.declaredWeight / 3) : ""));
        setUnitPriceInput(item.expectedPricePerKg || 85000);
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setReceivedAtInput(localIso);
        setTruckPlateInput(item.vehiclePlate || "51D-123.45");
        setConditionInput("Đạt chuẩn tươi mới, gai xanh cứng, cuống tươi");
        setReceiveNoteInput("");
    };

    // Live difference in Receive Modal
    const liveDiff = useMemo(() => {
        if (!receivingItem) return 0;
        const actual = Number(actualWeightInput) || 0;
        return actual - receivingItem.declaredWeight;
    }, [receivingItem, actualWeightInput]);

    // Live fruit difference in Receive Modal
    const liveFruitDiff = useMemo(() => {
        if (!receivingItem || !receivingItem.declaredFruitCount) return 0;
        const actual = Number(actualFruitCountInput) || 0;
        return actual - receivingItem.declaredFruitCount;
    }, [receivingItem, actualFruitCountInput]);

    // Handler: Confirm Receive
    const handleConfirmReceive = async () => {
        if (!receivingItem) return;
        const actualWeight = Number(actualWeightInput);
        const actualFruitCount = Number(actualFruitCountInput);
        if (!actualWeight || actualWeight <= 0) {
            toast({ title: "Khối lượng không hợp lệ", description: "Vui lòng nhập khối lượng thực nhận lớn hơn 0.", variant: "destructive" });
            return;
        }
        if (!actualFruitCount || actualFruitCount <= 0) {
            toast({ title: "Số lượng trái không hợp lệ", description: "Vui lòng nhập số lượng trái thực nhận lớn hơn 0.", variant: "destructive" });
            return;
        }

        const harvestId = receivingItem.harvestId || receivingItem.id.replace("harvest-", "");
        setSubmittingReceive(true);

        try {
            const res = await fetch(`/api/harvests/${harvestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "RECEIVE",
                    receivedWeight: actualWeight,
                    fruitCount: actualFruitCount,
                    receivedAt: receivedAtInput ? new Date(receivedAtInput).toISOString() : new Date().toISOString(),
                    weightDifferenceReason: liveDiff !== 0 ? `Chênh lệch ${liveDiff > 0 ? "+" : ""}${liveDiff} kg so với khai báo` : undefined,
                    note: `${conditionInput} | Số trái: ${actualFruitCount} | Xe: ${truckPlateInput} | Đơn giá: ${unitPriceInput ? `${Number(unitPriceInput).toLocaleString("vi-VN")} đ/kg` : "—"}${receiveNoteInput ? ` | ${receiveNoteInput}` : ""}`,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Không thể xác nhận tiếp nhận lô hàng.");
            }

            toast({
                title: "Tiếp nhận hàng thành công",
                description: `Đã tiếp nhận ${actualWeight.toLocaleString("vi-VN")} kg (${actualFruitCount.toLocaleString("vi-VN")} trái) từ ${receivingItem.farmName}. Chuyển sang bước Phân loại.`,
                variant: "success",
            });

            // Update local state: Transition to WAITING_CLASSIFICATION
            setItems((prev) =>
                prev.map((i) =>
                    i.id === receivingItem.id
                        ? {
                            ...i,
                            actualReceivedWeight: actualWeight,
                            actualFruitCount,
                            weightDifference: actualWeight - i.declaredWeight,
                            fruitDifference: i.declaredFruitCount ? actualFruitCount - i.declaredFruitCount : undefined,
                            receivedAt: receivedAtInput ? new Date(receivedAtInput) : new Date(),
                            vehiclePlate: truckPlateInput,
                            condition: conditionInput,
                            status: "WAITING_CLASSIFICATION",
                            direction: "UNCLASSIFIED",
                        }
                        : i
                )
            );

            setReceivingItem(null);
        } catch (err: any) {
            toast({ title: "Lỗi tiếp nhận", description: err.message || "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setSubmittingReceive(false);
        }
    };

    // Handler: Open Classify Drawer
    const handleOpenClassify = (item: RawMaterialItem) => {
        setClassifyingItem(item);
        const totalW = item.actualReceivedWeight || item.declaredWeight || 0;
        const totalF = item.actualFruitCount || item.declaredFruitCount || (totalW > 0 ? Math.round(totalW / 3) : 0);

        if (item.freshExportWeight !== undefined || item.processingWeight !== undefined) {
            setFreshWeightInput(item.freshExportWeight || 0);
            setProcWeightInput(item.processingWeight || 0);
            setRejectWeightInput(item.rejectedWeight || Math.max(0, totalW - ((item.freshExportWeight || 0) + (item.processingWeight || 0))));
            setFreshFruitCountInput(item.freshExportFruitCount !== undefined ? item.freshExportFruitCount : Math.round((item.freshExportWeight || 0) / 3));
            setProcFruitCountInput(item.processingFruitCount !== undefined ? item.processingFruitCount : Math.round((item.processingWeight || 0) / 3));
            setRejectFruitCountInput(item.rejectedFruitCount !== undefined ? item.rejectedFruitCount : Math.max(0, totalF - (((item.freshExportFruitCount || Math.round((item.freshExportWeight || 0) / 3))) + ((item.processingFruitCount || Math.round((item.processingWeight || 0) / 3))))));
        } else {
            // Default: 75% Fresh Export, 23% Processing, 2% Reject
            const freshW = Math.round(totalW * 0.75);
            const procW = Math.round(totalW * 0.23);
            const rejW = Math.max(0, totalW - (freshW + procW));
            setFreshWeightInput(freshW);
            setProcWeightInput(procW);
            setRejectWeightInput(rejW);

            const freshF = Math.round(totalF * 0.75);
            const procF = Math.round(totalF * 0.23);
            const rejF = Math.max(0, totalF - (freshF + procF));
            setFreshFruitCountInput(freshF);
            setProcFruitCountInput(procF);
            setRejectFruitCountInput(rejF);
        }
        setClassifyNoteInput("");
    };

    // Live Classification Validation (both weight and fruit count)
    const classificationValidation = useMemo(() => {
        if (!classifyingItem) return { totalInput: 0, currentSum: 0, diff: 0, isValid: false, fresh: 0, proc: 0, rej: 0, totalFruits: 0, currentFruitSum: 0, fruitDiff: 0, freshF: 0, procF: 0, rejF: 0, isWeightValid: false, isFruitValid: true };
        const totalInput = classifyingItem.actualReceivedWeight || classifyingItem.declaredWeight || 0;
        const totalFruits = classifyingItem.actualFruitCount || classifyingItem.declaredFruitCount || 0;

        const fresh = Number(freshWeightInput) || 0;
        const proc = Number(procWeightInput) || 0;
        const rej = Number(rejectWeightInput) || 0;
        const currentSum = fresh + proc + rej;
        const diff = Number((currentSum - totalInput).toFixed(2));
        const isWeightValid = Math.abs(diff) <= 0.01 && currentSum > 0;

        const freshF = Number(freshFruitCountInput) || 0;
        const procF = Number(procFruitCountInput) || 0;
        const rejF = Number(rejectFruitCountInput) || 0;
        const currentFruitSum = freshF + procF + rejF;
        const fruitDiff = totalFruits > 0 ? currentFruitSum - totalFruits : 0;
        const isFruitValid = totalFruits > 0 ? fruitDiff === 0 : currentFruitSum > 0;

        const isValid = isWeightValid && isFruitValid;

        return {
            totalInput,
            currentSum,
            diff,
            fresh,
            proc,
            rej,
            totalFruits,
            currentFruitSum,
            fruitDiff,
            freshF,
            procF,
            rejF,
            isWeightValid,
            isFruitValid,
            isValid,
        };
    }, [classifyingItem, freshWeightInput, procWeightInput, rejectWeightInput, freshFruitCountInput, procFruitCountInput, rejectFruitCountInput]);

    // Handler: Confirm Classification
    const handleConfirmClassify = async () => {
        if (!classifyingItem) return;
        const { totalInput, currentSum, diff, isValid, fresh = 0, proc = 0, rej = 0, totalFruits, currentFruitSum, fruitDiff, freshF = 0, procF = 0, rejF = 0 } = classificationValidation;

        if (!isValid) {
            let msg = "";
            if (Math.abs(diff) > 0.01) {
                msg = `Tổng 3 phần (${currentSum.toLocaleString("vi-VN")} kg) phải bằng đúng khối lượng thực nhận (${totalInput.toLocaleString("vi-VN")} kg). Chênh lệch: ${diff > 0 ? `+${diff}` : diff} kg.`;
            } else if (totalFruits > 0 && fruitDiff !== 0) {
                msg = `Tổng số lượng trái (${currentFruitSum.toLocaleString("vi-VN")} trái) phải bằng đúng số lượng trái thực nhận (${totalFruits.toLocaleString("vi-VN")} trái). Chênh lệch: ${fruitDiff > 0 ? `+${fruitDiff}` : fruitDiff} trái.`;
            } else {
                msg = "Vui lòng kiểm tra lại khối lượng và số lượng trái phân loại.";
            }
            toast({
                title: "Dữ liệu phân loại chưa khớp",
                description: msg,
                variant: "destructive",
            });
            return;
        }

        setSubmittingClassify(true);
        const lotId = classifyingItem.rawLotId || classifyingItem.id;

        try {
            const res = await fetch(`/api/processing/raw-materials/${lotId}/classify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    freshExportWeight: fresh,
                    freshExportFruitCount: freshF,
                    processingWeight: proc,
                    processingFruitCount: procF,
                    rejectedWeight: rej,
                    rejectedFruitCount: rejF,
                    note: classifyNoteInput,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Không thể lưu phân loại.");
            }

            toast({
                title: "Phân loại thành công",
                description: `Đã phân loại ${totalInput.toLocaleString("vi-VN")} kg (Trái tươi: ${fresh} kg / ${freshF} trái, Chế biến: ${proc} kg / ${procF} trái, Loại bỏ: ${rej} kg / ${rejF} trái). Dữ liệu đã chuyển sang Chế biến & Đóng gói.`,
                variant: "success",
            });

            // Update local state to CLASSIFIED
            setItems((prev) =>
                prev.map((i) =>
                    i.id === classifyingItem.id
                        ? {
                            ...i,
                            freshExportWeight: fresh,
                            freshExportFruitCount: freshF,
                            processingWeight: proc,
                            processingFruitCount: procF,
                            rejectedWeight: rej,
                            rejectedFruitCount: rejF,
                            direction: fresh > 0 && proc > 0 ? "SPLIT" : fresh > 0 ? "FRESH_EXPORT" : "PROCESSING",
                            status: "CLASSIFIED",
                        }
                        : i
                )
            );

            // Sync with localStorage so page 3 (Chế biến & Đóng gói) instantly has this classified lot!
            try {
                const existing = JSON.parse(localStorage.getItem("processing_classified_lots") || "[]");
                const lotEntry = {
                    id: classifyingItem.rawLotId || classifyingItem.id,
                    code: classifyingItem.receiptCode || classifyingItem.code,
                    farmName: classifyingItem.farmName,
                    freshExportWeight: fresh,
                    freshExportFruitCount: freshF,
                    processingWeight: proc,
                    processingFruitCount: procF,
                    rejectedWeight: rej,
                    rejectedFruitCount: rejF,
                    status: "CLASSIFIED",
                    classifiedAt: new Date().toISOString(),
                };
                const filtered = existing.filter((x: any) => x.id !== lotEntry.id);
                localStorage.setItem("processing_classified_lots", JSON.stringify([...filtered, lotEntry]));
            } catch { }

            setClassifyingItem(null);
        } catch (err: any) {
            toast({ title: "Lỗi phân loại", description: err.message || "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setSubmittingClassify(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Cơ sở chế biến</span>
                <span>/</span>
                <span className="text-emerald-700 font-bold">Tiếp nhận & Phân loại</span>
            </nav>

            {/* Header + KPIs */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Tiếp nhận & Phân loại</h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                        Đây là trang đầu tiên của nghiệp vụ tiếp nhận nông sản từ Phiếu thu hoạch của Farm, đối soát khối lượng thực nhận và phân chia nhánh Trái tươi xuất khẩu hoặc Chuyển chế biến.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                        <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                            <ClipboardCheck className="h-4 w-4 shrink-0" />
                            <span>Chờ xác nhận</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-indigo-900">{kpis.waitingConfirmation}</p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>Chờ tiếp nhận</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-amber-900">{kpis.waitingReceipt}</p>
                    </div>

                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                        <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider">
                            <SlidersHorizontal className="h-4 w-4 shrink-0" />
                            <span>Chờ phân loại</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-sky-900">{kpis.waitingClassification}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>Đã phân loại</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-emerald-900">{kpis.classified}</p>
                    </div>

                    <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-200 bg-emerald-600 text-white p-4 shadow-soft">
                        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider">
                            <Boxes className="h-4 w-4 shrink-0" />
                            <span>Tổng nhận hôm nay</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white">
                            {kpis.todayWeight.toLocaleString("vi-VN")} kg
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm mã phiếu / Farm / Vùng trồng..."
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        />
                    </div>
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="WAITING_CONFIRMATION">Chờ xác nhận phiếu</option>
                            <option value="WAITING_RECEIPT">Chờ tiếp nhận</option>
                            <option value="WAITING_CLASSIFICATION">Chờ phân loại</option>
                            <option value="CLASSIFIED">Đã phân loại</option>
                        </select>
                    </div>
                    <div>
                        <select
                            value={varietyFilter}
                            onChange={(e) => setVarietyFilter(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        >
                            <option value="ALL">Tất cả giống sầu riêng</option>
                            <option value="Ri6">Sầu riêng Ri6</option>
                            <option value="Monthong">Sầu riêng Monthong / Dona</option>
                            <option value="Khác">Giống khác</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table: Mã phiếu | Farm/Vùng trồng | Ngày thu hoạch | Giống | Trạng thái | Thao tác */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                            <tr>
                                <th className="px-5 py-4 whitespace-nowrap">Mã phiếu</th>
                                <th className="px-5 py-4 whitespace-nowrap">Farm / Vùng trồng</th>
                                <th className="px-5 py-4 whitespace-nowrap">Ngày thu hoạch</th>
                                <th className="px-5 py-4 whitespace-nowrap">Giống</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái</th>
                                <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredItems.map((item) => {
                                const isWaitingConfirmation = item.status === "WAITING_CONFIRMATION";
                                const isWaitingReceipt = item.status === "WAITING_RECEIPT";
                                const isClassified = item.status === "CLASSIFIED" || item.direction !== "UNCLASSIFIED";
                                const isWaitingClassification = !isWaitingConfirmation && !isWaitingReceipt && !isClassified;

                                return (
                                    <tr key={item.id} className="h-14 hover:bg-slate-50/70 transition">
                                        {/* Mã phiếu */}
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <span className="font-mono font-bold text-slate-900 text-xs">{item.receiptCode || item.code}</span>
                                        </td>

                                        {/* Farm / Vùng trồng */}
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{item.farmName}</p>
                                            {item.regionCode && (
                                                <p className="text-[11px] text-emerald-700 font-semibold">{item.regionCode}</p>
                                            )}
                                        </td>

                                        {/* Ngày thu hoạch */}
                                        <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">
                                            {formatVietnameseDate(item.harvestDate) || "—"}
                                        </td>

                                        {/* Giống */}
                                        <td className="px-5 py-3 whitespace-nowrap text-xs font-bold text-slate-700">
                                            {item.variety}
                                        </td>

                                        {/* Trạng thái */}
                                        <td className="px-5 py-3 text-center whitespace-nowrap">
                                            {isWaitingConfirmation ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                                                    <ClipboardCheck className="h-3 w-3" />
                                                    Chờ xác nhận
                                                </span>
                                            ) : isWaitingReceipt ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                                    <Clock className="h-3 w-3" />
                                                    Chờ tiếp nhận
                                                </span>
                                            ) : isWaitingClassification ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                                                    <SlidersHorizontal className="h-3 w-3" />
                                                    Chờ phân loại
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Đã phân loại
                                                </span>
                                            )}
                                        </td>

                                        {/* Thao tác */}
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            {isWaitingConfirmation ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenConfirm(item)}
                                                    className="h-8 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-soft"
                                                >
                                                    <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                                                    Xác nhận phiếu
                                                </Button>
                                            ) : isWaitingReceipt ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenReceive(item)}
                                                    className="h-8 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                                >
                                                    <Scale className="mr-1 h-3.5 w-3.5" />
                                                    Tiếp nhận
                                                </Button>
                                            ) : isWaitingClassification ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenClassify(item)}
                                                    className="h-8 rounded-xl bg-sky-600 text-xs font-bold text-white hover:bg-sky-700 shadow-soft"
                                                >
                                                    <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                                                    Phân loại
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenClassify(item)}
                                                    variant="outline"
                                                    className="h-8 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Xem / Đổi phân loại
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                                        Không tìm thấy phiếu thu hoạch nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL XÁC NHẬN PHIẾU THU HOẠCH TỪ NÔNG DÂN (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {confirmingItem && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                                        <ClipboardCheck className="h-3.5 w-3.5" />
                                        Tiếp nhận yêu cầu từ Nông dân
                                    </span>
                                    <h2 className="text-xl font-black text-slate-900">XÁC NHẬN PHIẾU THU HOẠCH</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setConfirmingItem(null)}
                                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                                {/* Thông tin chi tiết phiếu thu hoạch */}
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                                            <FileText className="h-4 w-4 text-indigo-600" />
                                            Thông tin kế hoạch thu hoạch & giao hàng
                                        </span>
                                        <span className="rounded-full bg-indigo-100 border border-indigo-300 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                                            Chờ xác nhận
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Mã phiếu</span>
                                            <span className="font-mono font-bold text-slate-900">{confirmingItem.code}</span>
                                        </div>
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Farm / Nhà vườn</span>
                                            <span className="font-bold text-slate-900 truncate block">{confirmingItem.farmName}</span>
                                            {confirmingItem.regionCode && (
                                                <span className="text-[10px] text-slate-500 font-mono">MSVT: {confirmingItem.regionCode}</span>
                                            )}
                                        </div>
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Nông dân / SĐT</span>
                                            <span className="font-semibold text-slate-800 truncate block">{confirmingItem.farmerName || "—"}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{confirmingItem.farmerPhone || "—"}</span>
                                        </div>
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Giống sầu riêng</span>
                                            <span className="font-bold text-emerald-800">{confirmingItem.variety}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 pt-1">
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Ngày dự kiến thu hoạch</span>
                                            <span className="font-bold text-slate-800">
                                                {formatVietnameseDate(confirmingItem.harvestDate) || "—"}
                                            </span>
                                        </div>
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Sản lượng dự kiến</span>
                                            <span className="font-black text-indigo-700 text-sm">
                                                {confirmingItem.declaredWeight.toLocaleString("vi-VN")} kg
                                                {confirmingItem.declaredFruitCount ? ` (~${confirmingItem.declaredFruitCount} trái)` : ""}
                                            </span>
                                        </div>
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80 col-span-2 sm:col-span-1">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Đơn giá dự kiến / đề xuất</span>
                                            <span className="font-bold text-amber-700">
                                                {confirmingItem.expectedPricePerKg
                                                    ? `${confirmingItem.expectedPricePerKg.toLocaleString("vi-VN")} đ/kg`
                                                    : "Thương lượng khi nhập"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ghi chú phản hồi xác nhận từ cơ sở chế biến */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-700">
                                        Ghi chú xác nhận / Phản hồi cho nông hộ:
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={confirmNoteInput}
                                        onChange={(e) => setConfirmNoteInput(e.target.value)}
                                        placeholder="Nhập ghi chú phản hồi, thời gian đón hàng hoặc hướng dẫn vận chuyển..."
                                        className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none ring-2 ring-indigo-500/10"
                                    />
                                    <p className="text-[11px] text-slate-500 italic">
                                        Khi xác nhận, phiếu sẽ chuyển sang trạng thái <strong>Chờ tiếp nhận</strong> để xưởng tiến hành cân đo thực nhận và phân loại theo quy trình.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5 sm:p-6 bg-slate-50/50 rounded-b-3xl">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRejectHarvest}
                                    disabled={submittingConfirm}
                                    className="rounded-2xl h-11 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                                >
                                    Từ chối phiếu
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setConfirmingItem(null)}
                                    disabled={submittingConfirm}
                                    className="rounded-2xl h-11 border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Đóng
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleConfirmHarvest}
                                    disabled={submittingConfirm}
                                    className="rounded-2xl h-11 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-soft px-5"
                                >
                                    {submittingConfirm ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    ) : (
                                        <ClipboardCheck className="h-4 w-4 mr-1.5" />
                                    )}
                                    Xác nhận phiếu thu hoạch
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL 1: TIẾP NHẬN HÀNG (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {receivingItem && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Quy trình xưởng</span>
                                    <h2 className="text-xl font-black text-slate-900">TIẾP NHẬN HÀNG TỪ FARM</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReceivingItem(null)}
                                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                                {/* KHU VỰC 1: THÔNG TIN GỐC TỪ PHIẾU THU HOẠCH (CHẾ ĐỘ CHỈ ĐỌC - READ ONLY) */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                            <FileText className="h-4 w-4 text-slate-500" />
                                            Thông tin gốc từ Phiếu thu hoạch (Chỉ đọc)
                                        </span>
                                        <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                            Đã đối soát
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Mã phiếu</span>
                                            <span className="font-mono font-bold text-slate-900">{receivingItem.code}</span>
                                        </div>
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Farm / Nhà vườn</span>
                                            <span className="font-bold text-slate-900 truncate block">{receivingItem.farmName}</span>
                                        </div>
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Nông dân / SĐT</span>
                                            <span className="font-semibold text-slate-800 truncate block">{receivingItem.farmerName || "—"}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{receivingItem.farmerPhone || "—"}</span>
                                        </div>
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Giống sầu riêng</span>
                                            <span className="font-bold text-emerald-800">{receivingItem.variety}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* KHU VỰC 2: FORM NHẬP LIỆU TIẾP NHẬN THỰC TẾ (CÓ KL KHAI BÁO VÀ KL THỰC NHẬN) */}
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                        <Scale className="h-4 w-4 text-emerald-700" />
                                        Số liệu cân thực tế & đối soát tiếp nhận
                                    </span>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {/* Khối lượng khai báo ban đầu (Read-only reference) */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Khối lượng khai báo (kg) <span className="text-slate-400 font-normal">(từ phiếu Farm)</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={receivingItem.declaredWeight}
                                                    readOnly
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 font-mono text-xs font-bold text-slate-800 cursor-not-allowed focus:outline-none"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">kg</span>
                                            </div>
                                            <p className="mt-1 text-[10px] text-slate-500 italic">KL nông dân cân tại vườn khi giao</p>
                                        </div>

                                        {/* Khối lượng thực nhận tại trạm xưởng */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Khối lượng thực nhận (kg) <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={actualWeightInput}
                                                    onChange={(e) => setActualWeightInput(e.target.value)}
                                                    placeholder="Nhập KL cân tại cổng xưởng..."
                                                    className="h-10 w-full rounded-xl border border-emerald-400 bg-white px-3 font-mono text-xs font-bold text-emerald-900 focus:border-emerald-600 focus:outline-none ring-2 ring-emerald-500/20"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">kg</span>
                                            </div>
                                            <p className="mt-1 text-[10px] text-emerald-700 font-medium">KL cân thực tế khi dỡ hàng xuống kho xưởng</p>
                                        </div>
                                    </div>

                                    {/* Số lượng trái & Chênh lệch */}
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Số lượng trái thực nhận (trái) <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={actualFruitCountInput}
                                                    onChange={(e) => setActualFruitCountInput(e.target.value)}
                                                    placeholder="Nhập số lượng trái đếm được..."
                                                    className="h-10 w-full rounded-xl border border-emerald-400 bg-white px-3 font-mono text-xs font-bold text-emerald-900 focus:border-emerald-600 focus:outline-none"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">trái</span>
                                            </div>
                                            <p className="mt-1 text-[10px] text-slate-500">Đếm thực tế lúc bốc dỡ vào kho (khai báo: {receivingItem.declaredFruitCount || "—"})</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Đánh giá chênh lệch khối lượng</label>
                                            <div className={`h-10 rounded-xl px-3 flex items-center justify-between border text-xs font-bold ${Math.abs(liveDiff) === 0
                                                    ? "bg-slate-100 border-slate-200 text-slate-700"
                                                    : liveDiff < 0
                                                        ? "bg-amber-50 border-amber-300 text-amber-800"
                                                        : "bg-emerald-50 border-emerald-300 text-emerald-800"
                                                }`}>
                                                <span>Chênh lệch:</span>
                                                <span>
                                                    {liveDiff > 0 ? `+${liveDiff.toLocaleString("vi-VN")} kg` : `${liveDiff.toLocaleString("vi-VN")} kg`}
                                                    {receivingItem.declaredWeight > 0 && ` (${((liveDiff / receivingItem.declaredWeight) * 100).toFixed(1)}%)`}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[10px] text-slate-400">Dung sai cho phép vận chuyển thường &lt; 2%</p>
                                        </div>
                                    </div>

                                    {/* Ngày tiếp nhận & Ghi chú */}
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Ngày giờ tiếp nhận</label>
                                            <input
                                                type="datetime-local"
                                                value={receivedAtInput}
                                                onChange={(e) => setReceivedAtInput(e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú tiếp nhận</label>
                                            <input
                                                type="text"
                                                value={receiveNoteInput}
                                                onChange={(e) => setReceiveNoteInput(e.target.value)}
                                                placeholder="Tình trạng xe, hao hụt nếu có..."
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-2 border-t border-slate-100 p-5 sm:p-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setReceivingItem(null)}
                                    className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleConfirmReceive}
                                    disabled={submittingReceive}
                                    className="flex-1 rounded-2xl h-11 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                >
                                    {submittingReceive ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận tiếp nhận"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}


            {/* MODAL 2: PHÂN LOẠI LÔ (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {classifyingItem && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">Quy trình phân loại</span>
                                    <h2 className="text-xl font-black text-slate-900">PHÂN LOẠI LÔ NGUYÊN LIỆU</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setClassifyingItem(null)}
                                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
                                {/* Lot Summary */}
                                <div className="rounded-2xl bg-slate-50 p-4 space-y-1.5 text-xs text-slate-700 border border-slate-200">
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Mã phiếu / Mã lô:</span>
                                        <span className="font-mono font-bold text-slate-900">{classifyingItem.receiptCode || classifyingItem.code}</span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span className="text-slate-500">Farm / Vườn:</span>
                                        <span className="font-bold text-slate-800">{classifyingItem.farmName}</span>
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2 mt-1">
                                        <div>
                                            <span className="text-slate-500 block text-[11px]">Khối lượng thực nhận:</span>
                                            <span className="font-black text-emerald-700 text-sm">
                                                {(classifyingItem.actualReceivedWeight || classifyingItem.declaredWeight || 0).toLocaleString("vi-VN")} kg
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-[11px]">Số lượng trái thực nhận:</span>
                                            <span className="font-black text-emerald-700 text-sm">
                                                {(classifyingItem.actualFruitCount || classifyingItem.declaredFruitCount || Math.round((classifyingItem.actualReceivedWeight || classifyingItem.declaredWeight || 0) / 3)).toLocaleString("vi-VN")} trái
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3 Classification Inputs (Khối lượng + Số lượng trái) */}
                                <div className="space-y-3 pt-1">
                                    <label className="block text-xs font-black uppercase tracking-wide text-slate-800">
                                        Phân chia khối lượng & số lượng trái (3 phần)
                                    </label>

                                    {/* Phần 1: Trái tươi */}
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                                <span>📦 1. Trái tươi</span>
                                            </label>
                                            <span className="text-[10px] text-emerald-700 font-bold">Chuyển đóng gói</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="block text-[11px] font-semibold text-emerald-900 mb-1">Khối lượng (kg) *</span>
                                                <input
                                                    type="number"
                                                    value={freshWeightInput}
                                                    onChange={(e) => setFreshWeightInput(e.target.value)}
                                                    placeholder="Ví dụ: 1800"
                                                    className="h-10 w-full rounded-xl border border-emerald-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-[11px] font-semibold text-emerald-900 mb-1">Số lượng (trái) *</span>
                                                <input
                                                    type="number"
                                                    value={freshFruitCountInput}
                                                    onChange={(e) => setFreshFruitCountInput(e.target.value)}
                                                    placeholder="Ví dụ: 600"
                                                    className="h-10 w-full rounded-xl border border-emerald-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phần 2: Chế biến khác */}
                                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                                <span>⚙️ 2. Chế biến khác</span>
                                            </label>
                                            <span className="text-[10px] text-indigo-700 font-bold">Bóc múi, cấp đông</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="block text-[11px] font-semibold text-indigo-900 mb-1">Khối lượng (kg) *</span>
                                                <input
                                                    type="number"
                                                    value={procWeightInput}
                                                    onChange={(e) => setProcWeightInput(e.target.value)}
                                                    placeholder="Ví dụ: 620"
                                                    className="h-10 w-full rounded-xl border border-indigo-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-[11px] font-semibold text-indigo-900 mb-1">Số lượng (trái) *</span>
                                                <input
                                                    type="number"
                                                    value={procFruitCountInput}
                                                    onChange={(e) => setProcFruitCountInput(e.target.value)}
                                                    placeholder="Ví dụ: 200"
                                                    className="h-10 w-full rounded-xl border border-indigo-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phần 3: Không đạt / loại bỏ */}
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                                                <span>🗑️ 3. Không đạt / loại bỏ</span>
                                            </label>
                                            <span className="text-[10px] text-rose-700 font-bold">Lọc bỏ / hư hại</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="block text-[11px] font-semibold text-rose-900 mb-1">Khối lượng (kg) *</span>
                                                <input
                                                    type="number"
                                                    value={rejectWeightInput}
                                                    onChange={(e) => setRejectWeightInput(e.target.value)}
                                                    placeholder="Ví dụ: 40"
                                                    className="h-10 w-full rounded-xl border border-rose-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-rose-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-[11px] font-semibold text-rose-900 mb-1">Số lượng (trái) *</span>
                                                <input
                                                    type="number"
                                                    value={rejectFruitCountInput}
                                                    onChange={(e) => setRejectFruitCountInput(e.target.value)}
                                                    placeholder="Ví dụ: 20"
                                                    className="h-10 w-full rounded-xl border border-rose-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-rose-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ghi chú */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú phân loại</label>
                                        <input
                                            type="text"
                                            value={classifyNoteInput}
                                            onChange={(e) => setClassifyNoteInput(e.target.value)}
                                            placeholder="Nhập ghi chú nếu có..."
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* BẢNG KIỂM TRA TỔNG (VALIDATION BOX) */}
                                <div className={`rounded-2xl p-4 border transition ${classificationValidation.isValid ? "border-emerald-300 bg-emerald-50/70" : "border-rose-300 bg-rose-50/70"}`}>
                                    <div className="space-y-2 text-xs">
                                        {/* Khối lượng */}
                                        <div className="flex justify-between items-center font-medium">
                                            <span className="text-slate-600">Khối lượng:</span>
                                            <span className="font-mono">
                                                Tổng 3 phần: <strong className={classificationValidation.isWeightValid ? "text-emerald-700" : "text-rose-700"}>{classificationValidation.currentSum.toLocaleString("vi-VN")} kg</strong> / Thực nhận: <strong>{classificationValidation.totalInput.toLocaleString("vi-VN")} kg</strong>
                                            </span>
                                        </div>

                                        {/* Số lượng trái */}
                                        <div className="flex justify-between items-center font-medium border-t border-slate-200/60 pt-1.5">
                                            <span className="text-slate-600">Số lượng trái:</span>
                                            <span className="font-mono">
                                                Tổng 3 phần: <strong className={classificationValidation.isFruitValid ? "text-emerald-700" : "text-rose-700"}>{classificationValidation.currentFruitSum.toLocaleString("vi-VN")} trái</strong> / Thực nhận: <strong>{classificationValidation.totalFruits.toLocaleString("vi-VN")} trái</strong>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs">
                                        {classificationValidation.isValid ? (
                                            <p className="flex items-center gap-1.5 font-bold text-emerald-800">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <span>Khối lượng và số lượng trái khớp chính xác 100%. Lô hợp lệ sẽ chuyển sang Chế biến & Đóng gói.</span>
                                            </p>
                                        ) : (
                                            <p className="flex items-center gap-1.5 font-bold text-rose-800">
                                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                                <span>
                                                    {!classificationValidation.isWeightValid && `Khối lượng chưa khớp (${classificationValidation.diff > 0 ? `vượt +${classificationValidation.diff}` : `thiếu ${classificationValidation.diff}`} kg). `}
                                                    {!classificationValidation.isFruitValid && `Số lượng trái chưa khớp (${classificationValidation.fruitDiff > 0 ? `vượt +${classificationValidation.fruitDiff}` : `thiếu ${classificationValidation.fruitDiff}`} trái).`}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-2 border-t border-slate-100 p-5 sm:p-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setClassifyingItem(null)}
                                    className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleConfirmClassify}
                                    disabled={submittingClassify || !classificationValidation.isValid}
                                    className="flex-1 rounded-2xl h-11 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft disabled:opacity-50"
                                >
                                    {submittingClassify ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận phân loại"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

