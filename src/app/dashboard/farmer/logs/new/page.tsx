"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import imageCompression from "browser-image-compression";
import { AlertTriangle, Camera, CloudUpload, ImagePlus, Leaf, Mic, MicOff, RefreshCcw, Sprout, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { farmingLogSchema, type FarmingLogInput } from "@/lib/validation";
import { growthStages, activityTypes } from "@/lib/constants";
import { evaluatePhiSafety, matchProhibitedChemical, type ProhibitedChemicalEntry } from "@/lib/workflow";
import type { OfflineFarmingLogPayload } from "@/lib/offline-farming-logs";
import { formatVietnameseDate, formatVietnameseDateTime, toIsoDate, toIsoDateTime } from "@/lib/date-format";

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
    chemicalName: string | null;
    dosage: string | null;
    phiDays: number | null;
    notes: string | null;
    images: string[];
    isGACCCompliant: boolean;
    createdAt: string;
    farm: { farmCode: string; farmName: string };
};

const activityLabels: Record<string, string> = {
    SPRAY_PESTICIDE: "Phun thuốc",
    FERTILIZE: "Bón phân",
    IRRIGATE: "Tưới nước",
    WEEDING: "Làm cỏ",
    PRUNE: "Cắt tỉa",
};

const stageLabels: Record<string, string> = {
    MAKING_SPROUT: "Làm đọt",
    FLOWERING: "Ra hoa",
    FRUIT_SETTING: "Đậu trái",
    FRUIT_GROWING: "Nuôi trái",
    HARVEST: "Thu hoạch",
};

function buildLogFormData(values: FarmingLogInput, images: File[], isGACCCompliant: boolean) {
    const formData = new FormData();

    formData.append("farmId", values.farmId);
    formData.append("stage", values.stage);
    formData.append("actionDate", toIsoDateTime(values.actionDate, values.actionTime));
    formData.append("activityType", values.activityType);
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

export default function NewFarmingLogPage() {
    const { toast } = useToast();
    const galleryInputRef = useRef<HTMLInputElement | null>(null);
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
    const [recentLogs, setRecentLogs] = useState<FarmingLogItem[]>([]);
    const [prohibitedEntries, setProhibitedEntries] = useState<ProhibitedChemicalEntry[]>([]);
    const [masterDataLoading, setMasterDataLoading] = useState(true);
    const now = useMemo(() => new Date(), []);

    const form = useForm<FarmingLogInput>({
        resolver: zodResolver(farmingLogSchema),
        defaultValues: {
            stage: growthStages[0],
            activityType: activityTypes[0],
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
    const isSpraying = activityType === activityTypes[0];
    const isFertilizing = activityType === activityTypes[1];

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
                setRecentLogs(payload.data.logs);
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
                const response = await fetch("/api/farming-logs", {
                    method: "POST",
                    body: buildLogFormData(values, attachedImages, payloadIsCompliant),
                });

                if (!response.ok) {
                    throw new Error("Không thể lưu nhật ký lên máy chủ");
                }

                toast({
                    title: isSafeForHarvest ? "Đã lưu nhật ký" : "Cảnh báo dư lượng",
                    description: isSafeForHarvest ? "Nhật ký đã đồng bộ lên máy chủ." : "Nhật ký đã lưu nhưng vẫn cần kiểm tra PHI hoặc chất cấm.",
                    variant: isSafeForHarvest ? "success" : "destructive",
                });
                await loadFarmingData();
            } else {
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
    });

    return (
        <main className="mx-auto min-h-screen max-w-4xl px-3 py-4 sm:px-6 lg:px-8">
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
                    <form className="space-y-6" onSubmit={onSubmit}>
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

                        <div>
                            <Label>Giai đoạn sinh trưởng</Label>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                                {growthStages.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => form.setValue("stage", item, { shouldDirty: true })}
                                        className={`min-h-12 rounded-3xl border px-3 py-3 text-sm font-semibold transition ${form.watch("stage") === item ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700"}`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label>Hoạt động</Label>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {activityTypes.map((activity) => (
                                    <label key={activity} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-3xl border px-4 py-3 ${form.watch("activityType") === activity ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"}`}>
                                        <input type="radio" value={activity} {...form.register("activityType")} className="h-4 w-4 accent-green-600" />
                                        <span className="font-semibold text-slate-700">{activity}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="actionDate">Ngày thực hiện</Label>
                                <Input id="actionDate" type="text" inputMode="numeric" maxLength={10} placeholder="dd/MM/yyyy" {...form.register("actionDate")} />
                                <p className="mt-1 text-xs text-red-600">{form.formState.errors.actionDate?.message}</p>
                            </div>
                            <div>
                                <Label htmlFor="actionTime">Giờ thực hiện</Label>
                                <Input id="actionTime" type="time" step="60" {...form.register("actionTime")} />
                                <p className="mt-1 text-xs text-red-600">{form.formState.errors.actionTime?.message}</p>
                                <p className="mt-1 text-xs text-slate-500">Mặc định là thời gian hiện tại của thiết bị.</p>
                            </div>
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
                            <Input id="plannedHarvestDate" type="text" inputMode="numeric" maxLength={10} placeholder="dd/MM/yyyy" {...form.register("plannedHarvestDate")} />
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

                        <Button type="submit" size="lg" className="w-full">
                            Lưu nhật ký
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

            <Card className="mt-6 border-white/70 shadow-soft">
                <CardHeader>
                    <CardTitle>Nhật ký đã ghi</CardTitle>
                    <CardDescription>
                        Các bản ghi được tải trực tiếp từ database của vườn đang đăng nhập.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {recentLogs.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                            Chưa có nhật ký canh tác nào.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentLogs.map((log) => (
                                <article key={log.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                {activityLabels[log.activityType] ?? log.activityType}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {log.farm.farmCode} · {log.farm.farmName}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-emerald-700">
                                                {formatVietnameseDateTime(new Date(log.actionDate))}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {stageLabels[log.stage] ?? log.stage}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        {log.chemicalName && <Badge className="bg-blue-50 text-blue-700">{log.chemicalName}</Badge>}
                                        {log.dosage && <Badge className="bg-violet-50 text-violet-700">{log.dosage}</Badge>}
                                        {log.phiDays != null && <Badge className="bg-amber-50 text-amber-700">PHI: {log.phiDays} ngày</Badge>}
                                        {log.images.length > 0 && <Badge className="bg-slate-100 text-slate-700">{log.images.length} ảnh</Badge>}
                                        <Badge className={log.isGACCCompliant ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
                                            {log.isGACCCompliant ? "Phù hợp GACC" : "Cần kiểm tra GACC"}
                                        </Badge>
                                    </div>
                                    {log.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{log.notes}</p>}
                                </article>
                            ))}
                        </div>
                    )}
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
