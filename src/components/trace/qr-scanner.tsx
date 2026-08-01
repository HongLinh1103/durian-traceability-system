"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader } from "@zxing/browser";
import { AlertCircle, Camera, CheckCircle2, Loader2, RefreshCw, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ScannerControls = { stop: () => void };
type ScannerState = "starting" | "scanning" | "success" | "error";

function getTraceDestination(rawValue: string): string | null {
    const value = rawValue.trim();
    if (!value || value.length > 500) return null;

    try {
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin) return null;

        const match = url.pathname.match(/^\/trace\/([^/]+)\/?$/u);
        if (!match) return null;

        const code = decodeURIComponent(match[1]).trim();
        if (!code || code === "scan" || code.length > 200) return null;
        return `/trace/${encodeURIComponent(code)}`;
    } catch {
        return null;
    }
}

function getCameraErrorMessage(error: unknown): string {
    if (!window.isSecureContext) {
        return "Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở trang bằng kết nối an toàn.";
    }
    if (error instanceof DOMException) {
        if (error.name === "NotAllowedError" || error.name === "SecurityError") {
            return "Quyền camera đã bị từ chối. Hãy cho phép camera trong cài đặt trình duyệt rồi thử lại.";
        }
        if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            return "Không tìm thấy camera trên thiết bị.";
        }
        if (error.name === "NotReadableError" || error.name === "TrackStartError") {
            return "Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động.";
        }
        if (error.name === "OverconstrainedError") {
            return "Camera không hỗ trợ cấu hình quét được yêu cầu.";
        }
    }
    return "Không thể mở camera. Hãy kiểm tra quyền truy cập và thử lại.";
}

export function QrScanner() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<ScannerControls | null>(null);
    const navigatingRef = useRef(false);
    const lastInvalidValueRef = useRef("");
    const [state, setState] = useState<ScannerState>("starting");
    const [message, setMessage] = useState("Đang khởi động camera...");
    const [attempt, setAttempt] = useState(0);

    const stopCamera = useCallback(() => {
        controlsRef.current?.stop();
        controlsRef.current = null;
        const stream = videoRef.current?.srcObject;
        if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => track.stop());
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    useEffect(() => {
        let cancelled = false;

        const startScanner = async () => {
            stopCamera();
            navigatingRef.current = false;
            lastInvalidValueRef.current = "";
            setState("starting");
            setMessage("Đang khởi động camera...");

            if (!navigator.mediaDevices?.getUserMedia) {
                setState("error");
                setMessage(
                    window.isSecureContext
                        ? "Trình duyệt hoặc thiết bị này không hỗ trợ truy cập camera."
                        : "Camera chỉ hoạt động trên HTTPS hoặc localhost.",
                );
                return;
            }

            const videoElement = videoRef.current;
            if (!videoElement) return;

            try {
                const reader = new BrowserQRCodeReader();
                const controls = await reader.decodeFromConstraints(
                    {
                        audio: false,
                        video: {
                            facingMode: { ideal: "environment" },
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                        },
                    },
                    videoElement,
                    (result) => {
                        if (!result || cancelled || navigatingRef.current) return;

                        const rawValue = result.getText();
                        const destination = getTraceDestination(rawValue);
                        if (!destination) {
                            if (lastInvalidValueRef.current !== rawValue) {
                                lastInvalidValueRef.current = rawValue;
                                setState("scanning");
                                setMessage("Mã QR không hợp lệ. Vui lòng quét mã truy xuất của Triviet.");
                            }
                            return;
                        }

                        navigatingRef.current = true;
                        setState("success");
                        setMessage("Đã nhận diện mã QR. Đang mở thông tin truy xuất...");
                        stopCamera();
                        router.push(destination);
                    },
                );

                if (cancelled) {
                    controls.stop();
                    return;
                }
                controlsRef.current = controls;
                setState("scanning");
                setMessage("Đưa mã QR vào giữa khung hình để quét tự động.");
            } catch (error) {
                if (!cancelled) {
                    stopCamera();
                    setState("error");
                    setMessage(getCameraErrorMessage(error));
                }
            }
        };

        void startScanner();
        return () => {
            cancelled = true;
            stopCamera();
        };
    }, [attempt, router, stopCamera]);

    return (
        <Card className="overflow-hidden border-slate-200 bg-slate-950">
            <CardHeader className="bg-white">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                        <ScanLine className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Quét mã QR truy xuất</CardTitle>
                        <CardDescription>Camera sẽ tự động nhận diện mã QR của Triviet.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="relative mx-auto aspect-[3/4] max-h-[70vh] w-full overflow-hidden rounded-[28px] bg-black sm:aspect-video">
                    <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        playsInline
                        aria-label="Hình ảnh trực tiếp từ camera để quét mã QR"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/20" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[68%] max-w-72 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.28)]">
                        <span className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-3xl border-l-4 border-t-4 border-emerald-400" />
                        <span className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-3xl border-r-4 border-t-4 border-emerald-400" />
                        <span className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-emerald-400" />
                        <span className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-emerald-400" />
                        {state === "scanning" && (
                            <span className="absolute left-3 right-3 top-1/2 h-0.5 animate-pulse bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.8)]" />
                        )}
                    </div>
                    {state === "starting" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-white">
                            <Loader2 className="h-9 w-9 animate-spin text-emerald-400" />
                            <span className="text-sm font-semibold">Đang yêu cầu quyền camera</span>
                        </div>
                    )}
                </div>

                <div
                    className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${
                        state === "error"
                            ? "bg-red-50 text-red-800"
                            : state === "success"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-slate-800 text-slate-100"
                    }`}
                    role={state === "error" ? "alert" : "status"}
                >
                    {state === "error" ? (
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : state === "success" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : (
                        <Camera className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    )}
                    <span>{message}</span>
                </div>

                {state === "error" && (
                    <Button className="w-full" onClick={() => setAttempt((current) => current + 1)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Thử mở lại camera
                    </Button>
                )}
                <p className="text-center text-xs leading-5 text-slate-400">
                    Camera cần HTTPS khi chạy trên thiết bị thật. Localhost được trình duyệt xem là môi trường an toàn.
                </p>
            </CardContent>
        </Card>
    );
}
