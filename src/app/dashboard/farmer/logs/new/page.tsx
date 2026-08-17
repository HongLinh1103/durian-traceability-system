"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import imageCompression from "browser-image-compression";
import { AlertTriangle, Camera, ClipboardPlus, CloudUpload, ImagePlus, Leaf, Mic, MicOff, RefreshCcw, Sprout, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { farmingLogSchema, type FarmingLogInput } from "@/lib/validation";
import { activitiesByStage, growthStages, activityTypes, type GrowthStageLabel } from "@/lib/constants";
import { evaluatePhiSafety, matchProhibitedChemical, type ProhibitedChemicalEntry } from "@/lib/workflow";
import type { OfflineFarmingLogPayload } from "@/lib/offline-farming-logs";
import { formatVietnameseDate, toIsoDate, toIsoDateTime } from "@/lib/date-format";
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";

type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionResultSetLike = { 0?: SpeechRecognitionResultLike };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultSetLike> };

type SpeechRecognitionInstanceLike = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstanceLike;
type FarmOption = { id: string; farmCode: string; farmName: string };
type FarmingLogItem = {
    id: string;
    actionDate: string;
    stage: string;
    activityType: string;
    otherActivity: string | null;
    chemicalName: string | null;
    dosage: string | null;
    phiDays: number | null;
    notes: string | null;
    images: string[];
    isGACCCompliant: boolean;
    createdAt: string;
    farm: { farmCode: string; farmName: string };
};

function buildLogFormData(values: FarmingLogInput, images: File[], isGACCCompliant: boolean) {
    const formData = new FormData();

    formData.append("farmId", values.farmId);
    formData.append("stage", values.stage);
    formData.append("actionDate", toIsoDateTime(values.actionDate, values.actionTime));
    formData.append("activityType", values.activityType);
    formData.append("otherActivity", values.otherActivity ?? "");
    formData.append("chemicalName", values.chemicalName);
    formData.append("dosage", values.dosage);
    formData.append("phiDays", String(values.phiDays));
    formData.append("plannedHarvestDate", values.plannedHarvestDate ? toIsoDate(values.plannedHarvestDate) : "");
    formData.append("notes", values.notes ?? "");
    formData.append("isGACCCompliant", String(isGACCCompliant));

    for (const image of images) {
        formData.append("images", image, image.name);
    }

    return formData;
}

function getSpeechRecognitionConstructor() {
    if (typeof window === "undefined") {
        return null;
    }

    const speechWindow = window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructorLike;
        webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
    };

    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

async function loadOfflineLogsModule() {
    return import("@/lib/offline-farming-logs");
}

function centerPillInScroller(element: HTMLElement) {
    const scroller = element.parentElement;
    if (!scroller) return;

    const targetLeft = element.offsetLeft - (scroller.clientWidth - element.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
}

function scrollPillsHorizontally(event: React.WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const scroller = event.currentTarget;
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    event.preventDefault();
    scroller.scrollLeft += event.deltaY;
}

function beginPillDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const scroller = event.currentTarget;
    scroller.dataset.dragStartX = String(event.clientX);
    scroller.dataset.dragStartScroll = String(scroller.scrollLeft);
    scroller.dataset.dragging = "false";
}

function movePillDrag(event: React.PointerEvent<HTMLDivElement>) {
    const scroller = event.currentTarget;
    if (event.pointerType === "touch" || event.buttons !== 1 || !scroller.dataset.dragStartX) return;
    const distance = event.clientX - Number(scroller.dataset.dragStartX ?? event.clientX);
    if (Math.abs(distance) > 4) scroller.dataset.dragging = "true";
    scroller.scrollLeft = Number(scroller.dataset.dragStartScroll ?? 0) - distance;
}

function endPillDrag(event: React.PointerEvent<HTMLDivElement>) {
    const scroller = event.currentTarget;
    window.setTimeout(() => { scroller.dataset.dragging = "false"; }, 0);
    delete scroller.dataset.dragStartX;
    delete scroller.dataset.dragStartScroll;
}

export default function NewFarmingLogPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const galleryInputRef = useRef<HTMLInputElement | null>(null);
    const stageScrollerRef = useRef<HTMLDivElement | null>(null);
    const activityScrollerRef = useRef<HTMLDivElement | null>(null);
    const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const speechRef = useRef<SpeechRecognitionInstanceLike | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [queuedCount, setQueuedCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [attachedImages, setAttachedImages] = useState<File[]>([]);
    const [imageStatus, setImageStatus] = useState<string>("Chưa có ảnh nào");
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [farms, setFarms] = useState<FarmOption[]>([]);
    const [farmsLoading, setFarmsLoading] = useState(true);
    const [prohibitedEntries, setProhibitedEntries] = useState<ProhibitedChemicalEntry[]>([]);
    const [masterDataLoading, setMasterDataLoading] = useState(true);
    const now = useMemo(() => new Date(), []);
    const planId = searchParams.get("planId") ?? "";

    const form = useForm<FarmingLogInput>({
        resolver: zodResolver(farmingLogSchema),
        defaultValues: {
            stage: growthStages[0],
            activityType: activityTypes[0],
            otherActivity: "",
            phiDays: 0,
            isGACCCompliant: true,
            actionDate: formatVietnameseDate(now),
            actionTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
            farmId: "",
            chemicalName: "",
            dosage: "",
            notes: "",
            plannedHarvestDate: formatVietnameseDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
        },
    });

    const chemicalName = form.watch("chemicalName");
    const actionDate = form.watch("actionDate");
    const phiDays = Number(form.watch("phiDays") ?? 0);
    const plannedHarvestDate = form.watch("plannedHarvestDate");
    const stage = form.watch("stage");
    const activityType = form.watch("activityType");
    const availableActivities = activitiesByStage[stage];
    const isSpraying = activityType === "Phun thuốc BVTV";
    const isFertilizing = ["Bón lót", "Bón phân", "Phun phân bón lá"].includes(activityType);

    const selectStage = (nextStage: GrowthStageLabel) => {
        form.setValue("stage", nextStage, { shouldDirty: true, shouldValidate: true });
        if (!activitiesByStage[nextStage].includes(activityType)) {
            form.setValue("activityType", activitiesByStage[nextStage][0], { shouldDirty: true, shouldValidate: true });
        }
    };

    useEffect(() => {
        if (!planId) return;
        const frame = window.requestAnimationFrame(() => {
            for (const scroller of [stageScrollerRef.current, activityScrollerRef.current]) {
                const selected = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');
                if (!scroller || !selected) continue;
                const targetLeft = selected.offsetLeft - (scroller.clientWidth - selected.offsetWidth) / 2;
                scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
            }
        });
        return () => window.cancelAnimationFrame(frame);
    }, [activityType, planId, stage]);

    useEffect(() => {
        let cancelled = false;
        async function loadMasterData() {
            setMasterDataLoading(true);
            try {
                const pesticideResponse = await fetch("/api/master-data/pesticides", { cache: "no-store" });
                const pesticidePayload = await pesticideResponse.json();
                if (!cancelled) {
                    setProhibitedEntries(pesticideResponse.ok && pesticidePayload.success ? pesticidePayload.data : []);
                }
            } finally {
                if (!cancelled) setMasterDataLoading(false);
            }
        }
        void loadMasterData();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        form.setValue("chemicalName", "", { shouldValidate: false });
        if (activityType !== "Khác") {
            form.setValue("otherActivity", "", { shouldValidate: false });
        }
    }, [activityType, form]);

    useEffect(() => {
        if (!isSpraying) {
            form.setValue("phiDays", 0);
        }
        if (!isSpraying && !isFertilizing) {
            form.setValue("dosage", "");
        }
        if (!isSpraying && !isFertilizing) {
            form.setValue("chemicalName", "");
        }
    }, [form, isFertilizing, isSpraying]);

    const prohibitedMatch = useMemo(
        () => isSpraying ? matchProhibitedChemical(chemicalName, prohibitedEntries) : { status: "none" as const },
        [chemicalName, isSpraying, prohibitedEntries],
    );
    const isProhibited = prohibitedMatch.status !== "none";

    const safetyMessage = useMemo(() => {
        if (!isSpraying) {
            return null;
        }
        const result = evaluatePhiSafety({
            sprayDate: toIsoDate(actionDate),
            harvestDate: plannedHarvestDate ? toIsoDate(plannedHarvestDate) : toIsoDate(actionDate),
            phiDays,
        });

        if (result.remainingDays === null) {
            return null;
        }

        if (!result.isSafe) {
            return `Cảnh báo: còn ${result.remainingDays} ngày nữa mới đủ PHI trước ngày thu hoạch dự kiến.`;
        }

        return "Đạt điều kiện PHI theo ngày thu hoạch dự kiến.";
    }, [actionDate, isSpraying, phiDays, plannedHarvestDate]);

    const refreshQueueCount = useCallback(async () => {
        const { listQueuedFarmingLogs } = await loadOfflineLogsModule();
        const queued = await listQueuedFarmingLogs();
        setQueuedCount(queued.length);
    }, []);

    const syncPendingLogs = useCallback(async () => {
        setIsSyncing(true);
        try {
            const { syncQueuedFarmingLogs } = await loadOfflineLogsModule();
            const result = await syncQueuedFarmingLogs();
            setQueuedCount(result.remaining.length);

            if (result.synced > 0) {
                toast({
                    title: "Đã đồng bộ nhật ký ngoại tuyến",
                    description: `Đã đẩy ${result.synced} bản ghi lên máy chủ.`,
                    variant: "success",
                });
            }
        } finally {
            setIsSyncing(false);
        }
    }, [toast]);

    useEffect(() => {
        setVoiceSupported(Boolean(getSpeechRecognitionConstructor()));
        setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);

        const handleOnline = () => {
            setIsOffline(false);
            void syncPendingLogs();
        };

        const handleOffline = () => {
            setIsOffline(true);
        };

        void refreshQueueCount();
        void syncPendingLogs();

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [refreshQueueCount, syncPendingLogs]);

    const loadFarmingData = useCallback(async () => {
        setFarmsLoading(true);
        try {
            const response = await fetch("/api/farming-logs", { cache: "no-store" });
            const payload = await response.json() as {
                ok: boolean;
                data?: { farms: FarmOption[]; logs: FarmingLogItem[] };
            };
            if (response.ok && payload.ok && payload.data) {
                setFarms(payload.data.farms);
                const currentFarmId = form.getValues("farmId");
                if (
                    payload.data.farms[0] &&
                    !payload.data.farms.some((farm) => farm.id === currentFarmId)
                ) {
                    form.setValue("farmId", payload.data.farms[0].id, { shouldValidate: true });
                }
            }
        } finally {
            setFarmsLoading(false);
        }
    }, [form]);

    useEffect(() => {
        let cancelled = false;
        if (!cancelled) void loadFarmingData();
        return () => {
            cancelled = true;
        };
    }, [loadFarmingData]);

    useEffect(() => {
        if (!planId || farmsLoading) return;
        const plannedFarmId = searchParams.get("farmId");
        const plannedStage = searchParams.get("stage") as GrowthStageLabel | null;
        const plannedActivity = searchParams.get("activity");
        const plannedDate = searchParams.get("date");
        const plannedTime = searchParams.get("time");
        if (plannedFarmId && farms.some((farm) => farm.id === plannedFarmId)) form.setValue("farmId", plannedFarmId);
        if (plannedStage && growthStages.includes(plannedStage)) {
            form.setValue("stage", plannedStage);
            if (plannedActivity && activitiesByStage[plannedStage].includes(plannedActivity as never)) form.setValue("activityType", plannedActivity as FarmingLogInput["activityType"]);
        }
        if (plannedDate) form.setValue("actionDate", formatVietnameseDate(new Date(`${plannedDate}T00:00:00`)));
        if (plannedTime) form.setValue("actionTime", plannedTime);
        form.setValue("notes", searchParams.get("notes") ?? "");
        form.setValue("otherActivity", searchParams.get("otherActivity") ?? "");
    }, [farms, farmsLoading, form, planId, searchParams]);

    const handleVoiceToggle = () => {
        const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

        if (!SpeechRecognitionConstructor) {
            toast({
                title: "Không hỗ trợ voice-to-text",
                description: "Trình duyệt này chưa hỗ trợ Web Speech API.",
                variant: "destructive",
            });
            return;
        }

        if (isListening) {
            speechRef.current?.stop();
            return;
        }

        const recognition = new SpeechRecognitionConstructor();
        recognition.lang = "vi-VN";
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
            const transcript = Array.from(event.results)
                .map((result) => result[0]?.transcript ?? "")
                .join(" ")
                .trim();

            if (transcript) {
                const currentNotes = form.getValues("notes") ?? "";
                form.setValue("notes", `${currentNotes} ${transcript}`.trim(), { shouldDirty: true, shouldTouch: true });
            }
        };

        recognition.onerror = () => {
            setIsListening(false);
            speechRef.current = null;
        };

        recognition.onend = () => {
            setIsListening(false);
            speechRef.current = null;
        };

        speechRef.current = recognition;
        setIsListening(true);
        recognition.start();
    };

    const compressAndAttachImages = async (files: FileList | File[] | null) => {
        if (!files?.length) {
            return;
        }

        const compressor = imageCompression;
        const compressedFiles: File[] = [];

        for (const file of Array.from(files)) {
            const compressed = await compressor(file, {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
            });

            const compressedFile = compressed instanceof File ? compressed : new File([compressed as Blob], file.name, { type: file.type });
            compressedFiles.push(compressedFile);
        }

        setAttachedImages((current) => [...current, ...compressedFiles]);
        setImageStatus(`${compressedFiles.length} ảnh đã nén và sẵn sàng lưu`);
        toast({
            title: "Ảnh đã được tối ưu",
            description: "Ảnh được nén phía client để tiết kiệm dữ liệu 3G/4G.",
            variant: "success",
        });
    };

    const stopCamera = useCallback(() => {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = null;
        }
        setCameraOpen(false);
        setCameraLoading(false);
    }, []);

    const handleCameraCapture = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("Trình duyệt này không hỗ trợ camera. Vui lòng dùng Chrome, Edge hoặc Safari phiên bản mới.");
            setCameraOpen(true);
            return;
        }

        setCameraOpen(true);
        setCameraLoading(true);
        setCameraError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });
            cameraStreamRef.current = stream;
            if (cameraVideoRef.current) {
                cameraVideoRef.current.srcObject = stream;
                await cameraVideoRef.current.play();
            }
        } catch (error) {
            setCameraError(
                error instanceof DOMException && error.name === "NotAllowedError"
                    ? "Quyền camera đã bị từ chối. Vui lòng cho phép camera trong cài đặt trình duyệt."
                    : "Không thể mở camera. Hãy kiểm tra webcam hoặc quyền truy cập camera.",
            );
        } finally {
            setCameraLoading(false);
        }
    };

    const captureCameraPhoto = async () => {
        const video = cameraVideoRef.current;
        if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.9),
        );
        if (!blob) return;

        const file = new File([blob], `nhat-ky-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
        });
        stopCamera();
        await compressAndAttachImages([file]);
    };

    useEffect(() => () => {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    }, []);

    const onSubmit = form.handleSubmit(async (values) => {
        try {
            const harvestSafety = evaluatePhiSafety({
                sprayDate: toIsoDate(values.actionDate),
                harvestDate: values.plannedHarvestDate ? toIsoDate(values.plannedHarvestDate) : toIsoDate(values.actionDate),
                phiDays: Number(values.phiDays),
            });
            const isHarvestRequest = values.stage === "Thu hoạch";
            const isSafeForHarvest = !isHarvestRequest || (harvestSafety.isSafe && !isProhibited);
            const payloadIsCompliant = !isProhibited && isSafeForHarvest;

            if (typeof navigator !== "undefined" && navigator.onLine) {
                const formData = buildLogFormData(values, attachedImages, payloadIsCompliant);
                if (planId) formData.append("planId", planId);
                const response = await fetch("/api/farming-logs", {
                    method: "POST",
                    body: formData,
                });
                const responsePayload = await response.json().catch(() => null) as { error?: string } | null;

                if (!response.ok) {
                    toast({
                        title: "Không thể lưu nhật ký",
                        description: responsePayload?.error || "Máy chủ không thể lưu dữ liệu. Vui lòng thử lại.",
                        variant: "destructive",
                    });
                    return;
                }

                toast({
                    title: isSafeForHarvest ? "Đã lưu nhật ký" : "Cảnh báo dư lượng",
                    description: isSafeForHarvest ? "Nhật ký đã đồng bộ lên máy chủ." : "Nhật ký đã lưu nhưng vẫn cần kiểm tra PHI hoặc chất cấm.",
                    variant: isSafeForHarvest ? "success" : "destructive",
                });
                await loadFarmingData();
                if (planId) {
                    window.dispatchEvent(new Event("plans-updated"));
                    router.push("/dashboard/farmer/plans");
                    return;
                }
            } else {
                if (planId) {
                    throw new Error("Cần kết nối Internet để hoàn thành công việc trong kế hoạch.");
                }
                const { queueOfflineFarmingLog } = await loadOfflineLogsModule();
                const offlinePayload: OfflineFarmingLogPayload = {
                    ...values,
                    isGACCCompliant: payloadIsCompliant,
                    images: attachedImages,
                };

                await queueOfflineFarmingLog(offlinePayload);
                await refreshQueueCount();

                toast({
                    title: "Đã lưu ngoại tuyến",
                    description: "Nhật ký đã được lưu vào điện thoại và sẽ tự đồng bộ khi có mạng.",
                    variant: "success",
                });
            }

            form.reset({
                stage: growthStages[0],
                activityType: activityTypes[0],
                otherActivity: "",
                phiDays: 0,
                isGACCCompliant: true,
                actionDate: formatVietnameseDate(new Date()),
                actionTime: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
                farmId: values.farmId,
                chemicalName: "",
                dosage: "",
                notes: "",
                plannedHarvestDate: values.plannedHarvestDate,
            });
            setAttachedImages([]);
            setImageStatus("Chưa có ảnh nào");
        } catch (error) {
            if (planId) {
                toast({
                    title: "Chưa thể hoàn thành kế hoạch",
                    description: error instanceof Error ? error.message : "Vui lòng kiểm tra kết nối và thử lại.",
                    variant: "destructive",
                });
                return;
            }
            try {
                const { queueOfflineFarmingLog } = await loadOfflineLogsModule();
                const offlinePayload: OfflineFarmingLogPayload = {
                    ...values,
                    isGACCCompliant: !isProhibited,
                    images: attachedImages,
                };

                await queueOfflineFarmingLog(offlinePayload);
                await refreshQueueCount();

                toast({
                    title: "Mạng gián đoạn, nhật ký đã lưu offline",
                    description: "Hệ thống sẽ đồng bộ lại khi kết nối Internet trở về.",
                    variant: "success",
                });
                return;
            } catch {
                toast({
                    title: "Không thể lưu nhật ký",
                    description: error instanceof Error ? error.message : "Vui lòng kiểm tra kết nối hoặc thử lại.",
                    variant: "destructive",
                });
            }
        }
    }, (errors) => {
        const firstError = Object.values(errors).find((error) => error?.message);
        toast({
            title: "Chưa thể lưu nhật ký",
            description: typeof firstError?.message === "string" ? firstError.message : "Vui lòng kiểm tra các trường bắt buộc.",
            variant: "destructive",
        });
        window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    });

    return (
        <main className="mx-auto min-h-screen max-w-4xl overflow-x-clip px-3 py-4 sm:px-6 lg:px-8">
            <Card className="overflow-hidden border-white/70 shadow-soft">
                <CardHeader className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                            <Leaf className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                                Nhật ký nông nghiệp mới
                            </CardTitle>
                            <CardDescription>Mobile-first, thao tác nhanh trên điện thoại tại vườn.</CardDescription>
                        </div>
                    </div>

                    <div className={`rounded-3xl p-4 ${isOffline ? "bg-amber-50 text-amber-900" : "bg-brand-50 text-brand-800"}`}>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            {isOffline ? <WifiOff className="h-4 w-4" /> : <CloudUpload className="h-4 w-4" />}
                            {isOffline ? "Đang ngoại tuyến - nhật ký sẽ lưu vào điện thoại" : "Đang trực tuyến - dữ liệu sẽ đồng bộ ngay"}
                        </div>
                        <p className="mt-1 text-sm">
                            {queuedCount > 0 ? `${queuedCount} nhật ký đang chờ đồng bộ.` : "Chưa có nhật ký chờ đồng bộ."}
                            {isSyncing ? " Đang đồng bộ..." : ""}
                        </p>
                    </div>
                </CardHeader>

                <CardContent>
                    <form className="min-w-0 space-y-6" onSubmit={onSubmit}>
                        <div>
                            <Label htmlFor="farmId">Mã MSVT</Label>
                            <select id="farmId" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" {...form.register("farmId")}>
                                {farmsLoading && <option value="">Đang tải danh sách vườn...</option>}
                                {!farmsLoading && farms.length === 0 && <option value="">Chưa có vườn đã được duyệt</option>}
                                {farms.map((farm) => (
                                    <option key={farm.id} value={farm.id}>
                                        {farm.farmCode} · {farm.farmName}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-red-600">{form.formState.errors.farmId?.message}</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="actionDate">Ngày thực hiện</Label>
                                <VietnameseDatePicker id="actionDate" value={toIsoDate(actionDate)} onChange={(value) => form.setValue("actionDate", formatVietnameseDate(new Date(`${value}T00:00:00`)), { shouldDirty: true, shouldValidate: true })} />
                                <p className="mt-1 text-xs text-red-600">{form.formState.errors.actionDate?.message}</p>
                            </div>
                            <div>
                                <Label htmlFor="actionTime">Giờ thực hiện</Label>
                                <Input id="actionTime" type="time" step="60" {...form.register("actionTime")} />
                                <p className="mt-1 text-xs text-red-600">{form.formState.errors.actionTime?.message}</p>
                                <p className="mt-1 text-xs text-slate-500">Mặc định là thời gian hiện tại của thiết bị.</p>
                            </div>
                        </div>

                        {stage === "Trước thu hoạch" && <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                            <div className="flex items-start gap-3"><span className="rounded-2xl bg-white p-3 text-amber-700 shadow-sm"><ClipboardPlus className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Chuẩn bị thu hoạch</h3><p className="mt-1 text-sm leading-6 text-slate-600">Lập kế hoạch thu hoạch và lựa chọn đơn vị thu mua nếu đã có nhu cầu bán.</p></div></div>
                            {form.watch("farmId") ? <Button asChild className="mt-4 w-full sm:w-auto"><Link href={`/harvests/new?gardenId=${encodeURIComponent(form.watch("farmId"))}`}><ClipboardPlus className="mr-2 h-4 w-4" />Tạo phiếu thu hoạch</Link></Button> : <Button disabled className="mt-4 w-full sm:w-auto"><ClipboardPlus className="mr-2 h-4 w-4" />Chọn mã MSVT trước</Button>}
                        </div>}

                        <div className="min-w-0">
                            <Label>Giai đoạn sinh trưởng</Label>
                            <div className="relative w-full min-w-0 max-w-full">
                                <div ref={stageScrollerRef} onWheel={scrollPillsHorizontally} onPointerDown={beginPillDrag} onPointerMove={movePillDrag} onPointerUp={endPillDrag} onPointerCancel={endPillDrag} className="flex w-full cursor-grab touch-pan-x snap-x snap-proximity flex-nowrap gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 pr-16 pt-1 select-none active:cursor-grabbing [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {growthStages.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={(event) => {
                                                if (event.currentTarget.parentElement?.dataset.dragging === "true") return;
                                                selectStage(item);
                                                centerPillInScroller(event.currentTarget);
                                            }}
                                            className={`min-h-12 min-w-[8.5rem] shrink-0 touch-pan-x snap-start whitespace-nowrap rounded-full border px-5 py-3 text-sm font-semibold transition-all ${form.watch("stage") === item ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-200" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"}`}
                                            aria-pressed={form.watch("stage") === item}
                                        >
                                            {item === "Phục hồi sau thu hoạch" ? "Phục hồi" : item}
                                        </button>
                                    ))}
                                </div>
                                <div className="pointer-events-none absolute inset-y-1 right-0 w-10 bg-gradient-to-l from-white via-white/85 to-transparent" aria-hidden="true" />
                            </div>
                        </div>

                        <div className="min-w-0">
                            <Label>Hoạt động</Label>
                            <input type="hidden" {...form.register("activityType")} />
                            <div className="relative w-full min-w-0 max-w-full">
                                <div ref={activityScrollerRef} onWheel={scrollPillsHorizontally} onPointerDown={beginPillDrag} onPointerMove={movePillDrag} onPointerUp={endPillDrag} onPointerCancel={endPillDrag} className="flex w-full cursor-grab touch-pan-x snap-x snap-proximity flex-nowrap gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 pr-16 pt-1 select-none active:cursor-grabbing [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {availableActivities.map((activity) => (
                                    <button
                                        key={activity}
                                        type="button"
                                        onClick={(event) => {
                                            if (event.currentTarget.parentElement?.dataset.dragging === "true") return;
                                            form.setValue("activityType", activity, { shouldDirty: true, shouldValidate: true });
                                            centerPillInScroller(event.currentTarget);
                                        }}
                                        className={`flex min-h-12 min-w-[8.5rem] shrink-0 touch-pan-x snap-start cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 text-sm font-semibold transition-all ${form.watch("activityType") === activity ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-200" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"}`}
                                        aria-pressed={form.watch("activityType") === activity}
                                    >
                                        <span>{activity}</span>
                                    </button>
                                ))}
                                </div>
                                <div className="pointer-events-none absolute inset-y-1 right-0 w-10 bg-gradient-to-l from-white via-white/85 to-transparent" aria-hidden="true" />
                            </div>
                            {activityType === "Khác" && <div className="mt-3">
                                <Label htmlFor="otherActivity">Tên hoạt động khác</Label>
                                <Input id="otherActivity" className="w-full min-w-0" maxLength={120} placeholder="Ví dụ: Kiểm tra độ ẩm đất" {...form.register("otherActivity")} />
                                <p className="mt-1 text-xs text-red-600">{form.formState.errors.otherActivity?.message}</p>
                            </div>}
                        </div>

                        {(isSpraying || isFertilizing) && <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="chemicalName">{isSpraying ? "Tên thuốc" : "Tên phân bón"}</Label>
                                <Input id="chemicalName" placeholder={isSpraying ? "Nhập tên thuốc hoặc hoạt chất đã sử dụng" : "Nhập tên phân bón đã sử dụng"} {...form.register("chemicalName")} />
                                {isSpraying && masterDataLoading && <p className="mt-1 text-xs text-slate-500">Đang tải danh mục cấm để kiểm tra...</p>}
                                <p className="mt-1 text-xs text-red-600">{form.formState.errors.chemicalName?.message}</p>
                                {isSpraying && chemicalName.trim() && !masterDataLoading && <p className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isProhibited ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"}`}>
                                    {isProhibited ? <AlertTriangle className="h-3.5 w-3.5" /> : <Sprout className="h-3.5 w-3.5" />}
                                    {prohibitedMatch.status === "exact" ? "Phát hiện khớp danh mục cấm" : prohibitedMatch.status === "suspected" ? "Nghi ngờ khớp danh mục cấm" : "Chưa phát hiện trong danh mục cấm"}
                                </p>}
                            </div>
                            {(isSpraying || isFertilizing) && <div>
                                <Label htmlFor="dosage">Liều lượng</Label>
                                <Input id="dosage" {...form.register("dosage")} placeholder="Ví dụ: 20ml/bình 16L" />
                                <p className="mt-1 text-xs text-red-600">{form.formState.errors.dosage?.message}</p>
                            </div>}
                            {isSpraying && <div>
                                <Label htmlFor="phiDays">Số ngày cách ly PHI</Label>
                                <Input id="phiDays" type="number" min="0" {...form.register("phiDays")} />
                                <p className="mt-1 text-xs text-red-600">{form.formState.errors.phiDays?.message}</p>
                            </div>}
                        </div>}

                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <Label htmlFor="notes" className="mb-0">
                                    Ghi chú
                                </Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleVoiceToggle} disabled={!voiceSupported}>
                                    {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                                    {isListening ? "Dừng ghi âm" : "Nói để nhập"}
                                </Button>
                            </div>
                            <Textarea id="notes" {...form.register("notes")} placeholder="Bấm micro để nói, hoặc gõ ghi chú ngắn gọn ở đây." />
                        </div>

                        <div>
                            <Label htmlFor="plannedHarvestDate">Ngày thu hoạch dự kiến</Label>
                            <VietnameseDatePicker id="plannedHarvestDate" value={plannedHarvestDate ? toIsoDate(plannedHarvestDate) : ""} onChange={(value) => form.setValue("plannedHarvestDate", formatVietnameseDate(new Date(`${value}T00:00:00`)), { shouldDirty: true, shouldValidate: true })} />
                            <p className="mt-1 text-xs text-red-600">{form.formState.errors.plannedHarvestDate?.message}</p>
                            {safetyMessage ? <p className={`mt-2 rounded-2xl px-4 py-3 text-sm font-medium ${safetyMessage.startsWith("Cảnh báo") ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-800"}`}>{safetyMessage}</p> : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Button type="button" variant="outline" className="w-full" onClick={handleCameraCapture}>
                                <Camera className="mr-2 h-4 w-4" />
                                Chụp ảnh từ camera
                            </Button>
                            <Button type="button" variant="outline" className="w-full" onClick={() => galleryInputRef.current?.click()}>
                                <ImagePlus className="mr-2 h-4 w-4" />
                                Chọn ảnh từ máy
                            </Button>
                        </div>

                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => void compressAndAttachImages(event.target.files)}
                        />

                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Ảnh đính kèm</p>
                                    <p className="text-sm text-slate-500">{imageStatus}</p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setAttachedImages([])} disabled={attachedImages.length === 0}>
                                    Xóa ảnh
                                </Button>
                            </div>
                            {attachedImages.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                    {attachedImages.map((file) => (
                                        <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                            <span className="truncate">{file.name}</span>
                                            <span>{Math.round(file.size / 1024)} KB</span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {isProhibited ? (
                            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                <strong>Cảnh báo: Thuốc hoặc hoạt chất bạn vừa nhập nằm trong danh mục bị cấm sử dụng. Vui lòng kiểm tra lại trước khi lưu nhật ký.</strong>
                                {prohibitedMatch.status === "suspected" ? <p className="mt-1">Hệ thống phát hiện tên gần giống “{prohibitedMatch.matchedValue}”.</p> : null}
                            </div>
                        ) : null}

                        {stage === "Thu hoạch" ? (
                            <div className="rounded-3xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
                                Khi chọn giai đoạn <strong>Thu hoạch</strong>, hệ thống kiểm tra tự động khoảng cách giữa ngày phun gần nhất và ngày thu hoạch dự kiến để xác nhận an toàn thực phẩm.
                            </div>
                        ) : null}

                        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || farmsLoading || farms.length === 0}>
                            {form.formState.isSubmitting ? "Đang lưu..." : "Lưu nhật ký"}
                        </Button>

                        {queuedCount > 0 ? (
                            <Button type="button" variant="outline" className="w-full" onClick={() => void syncPendingLogs()}>
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Đồng bộ {queuedCount} nhật ký đã lưu offline
                            </Button>
                        ) : null}
                    </form>
                </CardContent>
            </Card>

            {cameraOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
                    <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h2 className="font-bold text-slate-900">Chụp ảnh nhật ký</h2>
                                <p className="text-sm text-slate-500">Điện thoại ưu tiên camera sau, laptop sử dụng webcam.</p>
                            </div>
                            <button type="button" onClick={stopCamera} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng camera">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="relative flex min-h-[280px] items-center justify-center bg-black sm:min-h-[420px]">
                            <video
                                ref={cameraVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`max-h-[70vh] w-full object-contain ${cameraError ? "hidden" : ""}`}
                            />
                            {cameraLoading && (
                                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white">
                                    <RefreshCcw className="mr-2 h-5 w-5 animate-spin" />
                                    Đang mở camera...
                                </div>
                            )}
                            {cameraError && (
                                <div className="max-w-md p-6 text-center text-sm text-red-200">
                                    <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
                                    {cameraError}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-4">
                            <Button type="button" variant="outline" onClick={stopCamera}>Hủy</Button>
                            <Button type="button" onClick={() => void captureCameraPhoto()} disabled={cameraLoading || Boolean(cameraError)}>
                                <Camera className="mr-2 h-4 w-4" />
                                Chụp ảnh
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
