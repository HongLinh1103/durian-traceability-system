"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    Camera,
    Upload,
    Keyboard,
    RefreshCw,
    Flashlight,
    FlashlightOff,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowRight,
    QrCode,
    Sparkles,
    Search,
    ShieldCheck,
    X,
    Maximize2,
    Play,
    Pause,
    HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseTraceCode, playScanSound, triggerScanHaptic } from "@/lib/trace-scanner-utils";

type ScannerTab = "camera" | "upload" | "manual";

type QrTraceScannerProps = {
    className?: string;
    variant?: "card" | "embedded" | "full";
    onScanSuccess?: (code: string) => void;
    autoRedirect?: boolean;
};

const SAMPLE_CODES = [
    { code: "TV-FARMER-DIRECT-DEMO", label: "Nông dân bán trực tiếp", desc: "Sầu riêng Ri6 - Vườn An" },
    { code: "TV-COLLECTOR-RETAIL-DEMO", label: "Vựa thu mua phân phối", desc: "Sầu riêng tươi Dona" },
    { code: "TV-PROCESS-RETAIL-DEMO", label: "Cơ sở chế biến xưởng", desc: "Ri6 cấp đông hộp 500g" },
    { code: "TV-EXPORT-DEMO", label: "Lô xuất khẩu", desc: "Hồ sơ kiểm định xuất khẩu" },
];

export function QrTraceScanner({
    className,
    variant = "card",
    onScanSuccess,
    autoRedirect = true,
}: QrTraceScannerProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ScannerTab>("camera");

    // Camera states
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [hasTorch, setHasTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

    // Upload states
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isDecodingImage, setIsDecodingImage] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Manual input states
    const [manualCode, setManualCode] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Result & feedback state
    const [detectedCode, setDetectedCode] = useState<string | null>(null);
    const [lookupResult, setLookupResult] = useState<{
        publicToken: string;
        productName?: string;
        lotCode?: string;
        issuerName?: string;
    } | null>(null);

    // Refs
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
    const activeStreamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const isScanningLockedRef = useRef(false);

    // Stop camera and release tracks
    const stopCamera = useCallback(() => {
        if (scannerControlsRef.current) {
            try {
                scannerControlsRef.current.stop();
            } catch {
                // ignore
            }
            scannerControlsRef.current = null;
        }
        if (activeStreamRef.current) {
            try {
                activeStreamRef.current.getTracks().forEach((track) => track.stop());
            } catch {
                // ignore
            }
            activeStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        setTorchOn(false);
        setHasTorch(false);
    }, []);

    // Handle successful scan/input
    const handleCodeDetected = useCallback(
        async (rawText: string) => {
            if (isScanningLockedRef.current) return;
            const parsed = parseTraceCode(rawText);
            if (!parsed) return;

            isScanningLockedRef.current = true;
            setDetectedCode(parsed);
            playScanSound();
            triggerScanHaptic();

            if (onScanSuccess) {
                onScanSuccess(parsed);
            }

            // Quick lookup verification
            try {
                const res = await fetch(`/api/trace/lookup?code=${encodeURIComponent(parsed)}`);
                const payload = await res.json();
                if (payload.success && payload.data) {
                    setLookupResult(payload.data);
                }
            } catch {
                // silent
            }

            if (autoRedirect) {
                setTimeout(() => {
                    stopCamera();
                    router.push(`/trace/${encodeURIComponent(parsed)}`);
                }, 900);
            }
        },
        [autoRedirect, onScanSuccess, router, stopCamera]
    );

    // Start ZXing Camera scanner
    const startCamera = useCallback(async () => {
        if (typeof window === "undefined") return;
        stopCamera();
        setCameraLoading(true);
        setCameraError(null);
        isScanningLockedRef.current = false;

        try {
            // Import ZXing browser dynamically
            const { BrowserQRCodeReader } = await import("@zxing/browser");
            const codeReader = new BrowserQRCodeReader();

            // Enumerate devices to allow selection
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoInputs = devices.filter((d) => d.kind === "videoinput");
                    setVideoDevices(videoInputs);
                } catch {
                    // ignore
                }
            }

            if (!videoRef.current) {
                setCameraLoading(false);
                return;
            }

            let constraints: MediaStreamConstraints;
            if (selectedDeviceId) {
                constraints = {
                    video: {
                        deviceId: { exact: selectedDeviceId },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                };
            } else {
                constraints = {
                    video: {
                        facingMode: { ideal: facingMode },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                };
            }

            // Get stream to check torch and ensure video plays
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            activeStreamRef.current = stream;

            // Check torch capability
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as { torch?: boolean };
                setHasTorch(Boolean(capabilities.torch));
            }

            const controls = await codeReader.decodeFromStream(
                stream,
                videoRef.current,
                (result, error) => {
                    if (result && !isScanningLockedRef.current) {
                        void handleCodeDetected(result.getText());
                    }
                    if (error) {
                        // Continuously scanning; errors on non-detected frames are normal.
                    }
                }
            );

            scannerControlsRef.current = controls;
            setIsCameraActive(true);
            setCameraLoading(false);
        } catch (err: unknown) {
            console.error("Camera start error:", err);
            setCameraLoading(false);
            setIsCameraActive(false);

            const errStr = String(err);
            if (errStr.includes("NotAllowedError") || errStr.includes("Permission denied")) {
                setCameraError("Vui lòng cấp quyền truy cập Camera trên trình duyệt để quét mã QR.");
            } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFoundError")) {
                setCameraError("Không tìm thấy thiết bị Camera trên máy hoặc điện thoại.");
            } else if (errStr.includes("NotReadableError") || errStr.includes("TrackStartError")) {
                setCameraError("Camera đang được sử dụng bởi ứng dụng khác. Vui lòng tắt bớt và thử lại.");
            } else {
                setCameraError("Không thể kích hoạt Camera. Vui lòng thử nhập mã hoặc tải ảnh QR lên.");
            }
        }
    }, [facingMode, handleCodeDetected, selectedDeviceId, stopCamera]);

    // Toggle torch/flashlight
    const toggleTorch = async () => {
        if (!activeStreamRef.current) return;
        const track = activeStreamRef.current.getVideoTracks()[0];
        if (!track) return;
        try {
            const nextState = !torchOn;
            await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
                advanced: [{ torch: nextState }],
            });
            setTorchOn(nextState);
        } catch (e) {
            console.warn("Torch failed:", e);
        }
    };

    // Toggle camera front/back
    const toggleFacingMode = () => {
        setSelectedDeviceId("");
        setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    };

    // Switch active tab
    const handleTabChange = (tab: ScannerTab) => {
        setActiveTab(tab);
        setDetectedCode(null);
        setLookupResult(null);
        isScanningLockedRef.current = false;
        if (tab !== "camera") {
            stopCamera();
        }
    };

    // Initialize or cleanup camera when tab changes
    useEffect(() => {
        if (activeTab === "camera") {
            void startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [activeTab, facingMode, selectedDeviceId, startCamera, stopCamera]);

    // Handle Image file decode
    const processImageFile = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            setUploadError("Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP).");
            return;
        }

        setUploadError(null);
        setIsDecodingImage(true);
        setDetectedCode(null);
        isScanningLockedRef.current = false;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            setUploadedImage(dataUrl);

            try {
                const { BrowserQRCodeReader } = await import("@zxing/browser");
                const codeReader = new BrowserQRCodeReader();

                // Create an Image element in memory
                const img = new window.Image();
                img.src = dataUrl;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                let textResult: string | null = null;

                // Pass 1: Direct decode
                try {
                    const result = await codeReader.decodeFromImageElement(img);
                    textResult = result.getText();
                } catch {
                    // Pass 2: Canvas preprocessing fallback with grayscale / contrast
                    try {
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            canvas.width = img.naturalWidth || img.width;
                            canvas.height = img.naturalHeight || img.height;
                            ctx.drawImage(img, 0, 0);

                            // Apply contrast enhancement
                            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const data = imgData.data;
                            for (let i = 0; i < data.length; i += 4) {
                                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                                const threshold = avg > 128 ? 255 : 0;
                                data[i] = threshold;
                                data[i + 1] = threshold;
                                data[i + 2] = threshold;
                            }
                            ctx.putImageData(imgData, 0, 0);
                            const res2 = codeReader.decodeFromCanvas(canvas);
                            textResult = res2.getText();
                        }
                    } catch {
                        // Pass 2 failed too
                    }
                }

                setIsDecodingImage(false);

                if (textResult) {
                    void handleCodeDetected(textResult);
                } else {
                    setUploadError("Không phát hiện được mã QR trong ảnh. Vui lòng chụp rõ nét hơn hoặc cắt gần mã QR.");
                }
            } catch (err) {
                console.error("Decode image error:", err);
                setIsDecodingImage(false);
                setUploadError("Không thể đọc mã QR từ ảnh này. Vui lòng thử ảnh khác.");
            }
        };
        reader.onerror = () => {
            setIsDecodingImage(false);
            setUploadError("Lỗi khi tải tệp ảnh.");
        };
        reader.readAsDataURL(file);
    };

    // Drag and Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            void processImageFile(e.dataTransfer.files[0]);
        }
    };

    // Clipboard paste listener (Ctrl+V anywhere in upload/manual tab)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (activeTab === "upload" && e.clipboardData?.files?.length) {
                const file = e.clipboardData.files[0];
                if (file && file.type.startsWith("image/")) {
                    void processImageFile(file);
                }
            } else if (activeTab === "manual" && e.clipboardData) {
                const text = e.clipboardData.getData("text");
                if (text) {
                    setManualCode(text.trim());
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => {
            window.removeEventListener("paste", handlePaste);
        };
    }, [activeTab]);

    // Manual code submit
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = parseTraceCode(manualCode);
        if (!clean) {
            setSearchError("Vui lòng nhập mã truy xuất hoặc dán link QR.");
            return;
        }

        setSearchError(null);
        setIsSearching(true);

        try {
            const res = await fetch(`/api/trace/lookup?code=${encodeURIComponent(clean)}`);
            const payload = await res.json();
            setIsSearching(false);

            if (payload.success && payload.data) {
                void handleCodeDetected(clean);
            } else {
                setSearchError(payload.message || "Không tìm thấy mã truy xuất này trong hệ thống.");
            }
        } catch {
            setIsSearching(false);
            // Even if network fails, proceed to trace page
            void handleCodeDetected(clean);
        }
    };

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-[28px] border border-emerald-900/20 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white shadow-2xl transition-all sm:rounded-[36px]",
                variant === "card" && "p-4 sm:p-6 md:p-8",
                variant === "full" && "mx-auto max-w-4xl p-5 sm:p-8 md:p-10",
                variant === "embedded" && "p-4 sm:p-6",
                className
            )}
        >
            {/* Header / Intro */}
            <div className="mb-6 flex flex-col gap-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" />
                        Truy xuất nguồn gốc TriViet
                    </span>
                    <span className="hidden text-xs text-slate-400 sm:inline-flex sm:items-center sm:gap-1">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Chứng nhận VietGAP & GACC
                    </span>
                </div>
                <h2
                    className="text-xl font-black tracking-tight text-white sm:text-2xl md:text-3xl"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    Quét mã QR & Tra cứu sản phẩm
                </h2>
                <p className="text-xs text-emerald-100/70 sm:text-sm">
                    Sử dụng camera điện thoại / máy tính, tải ảnh QR hoặc nhập mã để kiểm tra hành trình nông sản.
                </p>
            </div>

            {/* Mode Tabs */}
            <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl bg-white/5 p-1.5 backdrop-blur">
                <button
                    type="button"
                    onClick={() => handleTabChange("camera")}
                    className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all sm:text-sm",
                        activeTab === "camera"
                            ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <Camera className="h-4 w-4 shrink-0" />
                    <span>Camera</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange("upload")}
                    className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all sm:text-sm",
                        activeTab === "upload"
                            ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <Upload className="h-4 w-4 shrink-0" />
                    <span>Tải ảnh QR</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange("manual")}
                    className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all sm:text-sm",
                        activeTab === "manual"
                            ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <Keyboard className="h-4 w-4 shrink-0" />
                    <span>Nhập mã</span>
                </button>
            </div>

            {/* Tab 1: Live Camera Scanner */}
            {activeTab === "camera" && (
                <div className="space-y-4">
                    <div className="relative mx-auto aspect-square max-h-[380px] w-full max-w-[380px] overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-black/60 shadow-inner sm:max-h-[420px] sm:max-w-[420px]">
                        {/* Video Preview Element */}
                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                        />

                        {/* Scanner Viewfinder Overlay */}
                        {isCameraActive && !detectedCode && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                                {/* Dimmed dark border vignette */}
                                <div className="absolute inset-0 bg-black/30" />

                                {/* Target Frame */}
                                <div className="relative h-48 w-48 rounded-2xl border border-white/20 sm:h-56 sm:w-56">
                                    {/* 4 Corner Markers */}
                                    <span className="absolute -left-1 -top-1 h-6 w-6 rounded-tl-xl border-l-4 border-t-4 border-emerald-400" />
                                    <span className="absolute -right-1 -top-1 h-6 w-6 rounded-tr-xl border-r-4 border-t-4 border-emerald-400" />
                                    <span className="absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
                                    <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-br-xl border-b-4 border-r-4 border-emerald-400" />

                                    {/* Laser scanning beam */}
                                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[scan-laser_2.2s_ease-in-out_infinite]" />
                                </div>
                            </div>
                        )}

                        {/* Loading Spinner */}
                        {cameraLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 p-4 text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                                <p className="text-sm font-medium text-slate-200">Đang khởi động Camera...</p>
                                <p className="text-xs text-slate-400">Vui lòng chấp nhận quyền truy cập camera nếu trình duyệt hỏi.</p>
                            </div>
                        )}

                        {/* Camera Error Message */}
                        {cameraError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 p-6 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-bold text-red-300">{cameraError}</p>
                                <div className="flex flex-wrap justify-center gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        onClick={() => void startCamera()}
                                        className="h-9 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500"
                                    >
                                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                        Thử lại
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleTabChange("upload")}
                                        className="h-9 rounded-xl border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
                                    >
                                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                                        Tải ảnh thay thế
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Top Controls Overlay on Video */}
                        {isCameraActive && (
                            <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 rounded-full bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur">
                                    <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                                    <span>Đang quét</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasTorch && (
                                        <button
                                            type="button"
                                            onClick={() => void toggleTorch()}
                                            aria-label="Bật/tắt đèn flash"
                                            className={cn(
                                                "flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-all",
                                                torchOn
                                                    ? "bg-amber-400 text-slate-950"
                                                    : "bg-slate-950/60 text-white hover:bg-slate-900"
                                            )}
                                        >
                                            {torchOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={toggleFacingMode}
                                        aria-label="Đổi camera trước/sau"
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur transition hover:bg-slate-900"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Success Overlay Animation */}
                        {detectedCode && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-950/90 p-6 text-center backdrop-blur-sm animate-in fade-in zoom-in-95">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/50">
                                    <CheckCircle2 className="h-8 w-8 animate-bounce" />
                                </div>
                                <h3 className="text-lg font-black text-white">Quét thành công!</h3>
                                <p className="font-mono text-xs font-bold text-emerald-300">{detectedCode}</p>
                                {lookupResult?.productName && (
                                    <p className="mt-1 text-xs text-white/90">
                                        <b>{lookupResult.productName}</b>
                                        {lookupResult.lotCode && ` (${lookupResult.lotCode})`}
                                    </p>
                                )}
                                <p className="text-[11px] text-emerald-200/70">Đang chuyển đến trang chi tiết...</p>
                            </div>
                        )}
                    </div>

                    {/* Camera Device Selector & Tips */}
                    <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-400 sm:flex-row">
                        <div className="flex items-center gap-2">
                            {videoDevices.length > 1 && (
                                <select
                                    value={selectedDeviceId}
                                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                                    className="rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-200 backdrop-blur focus:outline-none"
                                >
                                    <option value="">Camera mặc định</option>
                                    {videoDevices.map((dev, idx) => (
                                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                                            {dev.label || `Camera ${idx + 1}`}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button
                                type="button"
                                onClick={() => (isCameraActive ? stopCamera() : void startCamera())}
                                className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-white/20"
                            >
                                {isCameraActive ? (
                                    <>
                                        <Pause className="h-3 w-3 text-amber-400" /> Tạm dừng
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-3 w-3 text-emerald-400" /> Tiếp tục quét
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-center sm:text-right">
                            Căn chỉnh mã QR vào giữa khung vuông để quét tự động.
                        </p>
                    </div>
                </div>
            )}

            {/* Tab 2: Upload Image */}
            {activeTab === "upload" && (
                <div className="space-y-4">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition-all",
                            isDragging
                                ? "border-emerald-400 bg-emerald-950/40 shadow-inner"
                                : "border-emerald-500/30 bg-slate-900/60 hover:border-emerald-400/60 hover:bg-slate-900/90"
                        )}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    void processImageFile(e.target.files[0]);
                                }
                            }}
                        />

                        {isDecodingImage ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
                                <p className="text-sm font-semibold text-slate-200">Đang nhận diện mã QR từ ảnh...</p>
                            </div>
                        ) : uploadedImage ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-white/20 shadow-md">
                                    <Image
                                        src={uploadedImage}
                                        alt="Ảnh QR tải lên"
                                        fill
                                        unoptimized
                                        className="object-cover"
                                    />
                                </div>
                                <p className="text-xs text-slate-400">Nhấp vào đây hoặc kéo thả ảnh khác để đổi ảnh</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                                    <Upload className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">Kéo thả ảnh QR hoặc nhấp để chọn tệp</p>
                                    <p className="text-xs text-slate-400">
                                        Hỗ trợ PNG, JPG, JPEG, WEBP. Hoặc bấm <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px] font-mono">Ctrl + V</kbd> để dán ảnh.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="mt-2 h-9 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow hover:bg-emerald-500"
                                >
                                    Chọn ảnh từ máy
                                </Button>
                            </div>
                        )}
                    </div>

                    {uploadError && (
                        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs font-semibold text-red-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{uploadError}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Manual Input */}
            {activeTab === "manual" && (
                <div className="space-y-5">
                    <form onSubmit={handleManualSubmit} className="space-y-3">
                        <label className="block text-xs font-bold text-slate-300">
                            Nhập mã truy xuất, mã lô hoặc dán đường dẫn QR:
                        </label>
                        <div className="relative flex items-center">
                            <div className="pointer-events-none absolute left-3.5 text-slate-400">
                                <QrCode className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => {
                                    setManualCode(e.target.value);
                                    setSearchError(null);
                                }}
                                placeholder="Ví dụ: TV-FARMER-DIRECT-DEMO hoặc https://triviet.vn/trace/..."
                                className="w-full rounded-2xl border border-white/10 bg-slate-900/90 py-3.5 pl-11 pr-24 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                            />
                            {manualCode && (
                                <button
                                    type="button"
                                    onClick={() => setManualCode("")}
                                    className="absolute right-24 p-1 text-slate-400 hover:text-white"
                                    aria-label="Xóa nội dung nhập"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                            <Button
                                type="submit"
                                disabled={isSearching || !manualCode.trim()}
                                className="absolute right-1.5 h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                                {isSearching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Search className="mr-1.5 h-3.5 w-3.5" /> Tra cứu
                                    </>
                                )}
                            </Button>
                        </div>

                        {searchError && (
                            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs font-semibold text-red-300">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{searchError}</span>
                            </div>
                        )}
                    </form>

                    {/* Quick Demo Suggestions */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            Hoặc thử nhanh với các mã mẫu trên hệ thống:
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {SAMPLE_CODES.map((item) => (
                                <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => {
                                        setManualCode(item.code);
                                        void handleCodeDetected(item.code);
                                    }}
                                    className="group flex flex-col items-start rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-left transition hover:border-emerald-500/40 hover:bg-emerald-950/30"
                                >
                                    <span className="font-mono text-xs font-black text-emerald-300 group-hover:text-emerald-200">
                                        {item.code}
                                    </span>
                                    <span className="mt-0.5 text-[11px] font-semibold text-slate-200">
                                        {item.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Highlights & Privacy Note */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Dữ liệu minh bạch được đồng bộ từ nhật ký canh tác & kiểm định GACC.</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Hỗ trợ mọi loại tem QR xuất khẩu & nội địa</span>
                </div>
            </div>
        </div>
    );
}
