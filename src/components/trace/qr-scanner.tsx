"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader } from "@zxing/browser";
import { AlertCircle, Camera, CameraIcon, ImageUp, Keyboard, Lightbulb, Loader2, RefreshCw, ScanLine, SwitchCamera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ScannerControls = { stop: () => void };
type ScannerState = "idle" | "starting" | "scanning" | "checking" | "error";
type LookupMode = "camera" | "image" | "manual";
type FacingMode = "environment" | "user";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

function extractCode(rawValue: string) {
    const value = rawValue.trim();
    if (!value || value.length > 500) return null;
    try {
        const url = new URL(value);
        const match = url.pathname.match(/^\/trace\/([^/]+)\/?$/u);
        return match ? normalizeCode(decodeURIComponent(match[1])) : null;
    } catch {
        return normalizeCode(value);
    }
}

function normalizeCode(value: string) {
    const code = value.trim().replace(/\s+/gu, "");
    return code && code.length <= 200 && /^[\p{L}\p{N}._-]+$/u.test(code) ? code : null;
}

function cameraError(error: unknown) {
    if (error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name)) {
        return "Không thể truy cập camera. Vui lòng cấp quyền camera trong cài đặt trình duyệt hoặc sử dụng chức năng tải ảnh.";
    }
    if (error instanceof DOMException && ["NotFoundError", "DevicesNotFoundError"].includes(error.name)) {
        return "Thiết bị không hỗ trợ camera hoặc không tìm thấy camera khả dụng.";
    }
    if (!window.isSecureContext) return "Không thể truy cập camera. Vui lòng mở trang bằng HTTPS hoặc sử dụng chức năng tải ảnh.";
    return "Không thể truy cập camera. Vui lòng cấp quyền camera trong cài đặt trình duyệt hoặc sử dụng chức năng tải ảnh.";
}

export function QrScanner() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<ScannerControls | null>(null);
    const processingRef = useRef(false);
    const [mode, setMode] = useState<LookupMode>("camera");
    const [state, setState] = useState<ScannerState>("idle");
    const [message, setMessage] = useState("Chọn “Bắt đầu quét” để cấp quyền và mở camera.");
    const [manualCode, setManualCode] = useState("");
    const [cameraAttempt, setCameraAttempt] = useState(0);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [facingMode, setFacingMode] = useState<FacingMode>("environment");
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [dragging, setDragging] = useState(false);

    const stopCamera = useCallback(() => {
        controlsRef.current?.stop();
        controlsRef.current = null;
        const stream = videoRef.current?.srcObject;
        if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setTorchOn(false);
        setTorchSupported(false);
    }, []);

    const validateAndOpen = useCallback(async (rawValue: string) => {
        const code = extractCode(rawValue);
        if (!code) {
            setState("error");
            setMessage("Mã QR không hợp lệ hoặc không thuộc hệ thống.");
            processingRef.current = false;
            return;
        }
        stopCamera();
        setState("checking");
        setMessage("Đã nhận diện mã QR. Đang kiểm tra thông tin...");
        try {
            const response = await fetch(`/api/trace/${encodeURIComponent(code)}`, { cache: "no-store" });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                const fallback = response.status === 404
                    ? "Không tìm thấy thông tin truy xuất cho mã này."
                    : response.status === 410
                        ? "Mã truy xuất đã hết hiệu lực hoặc đã bị thu hồi."
                        : "Mã QR không hợp lệ hoặc không thuộc hệ thống.";
                throw new Error(payload?.message || fallback);
            }
            router.push(`/trace/${encodeURIComponent(code)}`);
        } catch (error) {
            setState("error");
            setMessage(error instanceof TypeError ? "Không thể kết nối đến hệ thống. Vui lòng thử lại." : error instanceof Error ? error.message : "Không thể kết nối đến hệ thống. Vui lòng thử lại.");
            processingRef.current = false;
        }
    }, [router, stopCamera]);

    useEffect(() => {
        if (!cameraEnabled || mode !== "camera") return;
        let cancelled = false;
        const start = async () => {
            stopCamera();
            processingRef.current = false;
            setState("starting");
            setMessage("Đang khởi động camera...");
            if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
                setState("error");
                setMessage("Thiết bị không hỗ trợ camera hoặc không tìm thấy camera khả dụng.");
                return;
            }
            try {
                const reader = new BrowserQRCodeReader();
                const controls = await reader.decodeFromConstraints(
                    { audio: false, video: { facingMode: { ideal: facingMode } } },
                    videoRef.current,
                    (result) => {
                        if (!result || cancelled || processingRef.current) return;
                        processingRef.current = true;
                        controlsRef.current?.stop();
                        void validateAndOpen(result.getText());
                    },
                );
                if (cancelled) return controls.stop();
                controlsRef.current = controls;
                const stream = videoRef.current?.srcObject;
                const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined;
                const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean } | undefined;
                setTorchSupported(Boolean(capabilities?.torch));
                setState("scanning");
                setMessage("Đưa mã QR vào giữa khung và giữ thiết bị ổn định.");
            } catch (error) {
                if (!cancelled) {
                    setState("error");
                    setMessage(cameraError(error));
                }
            }
        };
        void start();
        return () => {
            cancelled = true;
            stopCamera();
        };
    }, [cameraAttempt, cameraEnabled, facingMode, mode, stopCamera, validateAndOpen]);

    function selectMode(nextMode: LookupMode) {
        stopCamera();
        setCameraEnabled(false);
        processingRef.current = false;
        setMode(nextMode);
        setState("idle");
        setMessage(nextMode === "camera" ? "Chọn “Bắt đầu quét” để cấp quyền và mở camera." : nextMode === "image" ? "Chọn, chụp hoặc kéo thả ảnh QR vào khu vực bên dưới." : "Nhập mã truy xuất để kiểm tra thông tin nguồn gốc.");
    }

    async function toggleTorch() {
        const stream = videoRef.current?.srcObject;
        const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined;
        if (!track || !torchSupported) return;
        const nextValue = !torchOn;
        try {
            await track.applyConstraints({ advanced: [{ torch: nextValue } as MediaTrackConstraintSet] });
            setTorchOn(nextValue);
        } catch {
            setTorchSupported(false);
            setMessage("Camera hiện tại không hỗ trợ bật đèn flash.");
        }
    }

    async function scanImageFile(file?: File) {
        if (!file) return;
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
            setState("error");
            setMessage("Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG.");
            return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            setState("error");
            setMessage("Ảnh vượt quá dung lượng tối đa 10 MB.");
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setState("checking");
        setMessage("Đang đọc mã QR trong ảnh...");
        try {
            const result = await new BrowserQRCodeReader().decodeFromImageUrl(objectUrl);
            await validateAndOpen(result.getText());
        } catch {
            setState("error");
            setMessage("Không tìm thấy mã QR trong ảnh. Vui lòng chọn ảnh rõ hơn hoặc thử quét bằng camera.");
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    function chooseImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        void scanImageFile(file);
    }

    function dropImage(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        setDragging(false);
        void scanImageFile(event.dataTransfer.files?.[0]);
    }

    function submitManual(event: FormEvent) {
        event.preventDefault();
        const code = normalizeCode(manualCode);
        if (!code) {
            setState("error");
            setMessage("Mã QR không hợp lệ hoặc không thuộc hệ thống.");
            return;
        }
        setManualCode(code);
        void validateAndOpen(code);
    }

    const tabs: Array<{ id: LookupMode; label: string; icon: typeof Camera }> = [
        { id: "camera", label: "Quét bằng camera", icon: Camera },
        { id: "image", label: "Tải ảnh QR", icon: ImageUp },
        { id: "manual", label: "Nhập mã thủ công", icon: Keyboard },
    ];

    return <Card className="overflow-hidden rounded-[28px] border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
            <div role="tablist" aria-label="Cách tra cứu mã QR" className="grid gap-2 rounded-2xl bg-slate-100 p-1.5 sm:grid-cols-3">
                {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={mode === tab.id} onClick={() => selectMode(tab.id)} className={cn("flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition", mode === tab.id ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}><tab.icon className="h-4 w-4" />{tab.label}</button>)}
            </div>

            <div className="mt-6">
                {mode === "camera" && <div className="space-y-4">
                    {!cameraEnabled ? <div className="rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/60 px-5 py-12 text-center"><CameraIcon className="mx-auto h-12 w-12 text-emerald-600" /><p className="mt-4 font-semibold text-slate-800">Sử dụng camera để quét trực tiếp mã QR</p><p className="mt-1 text-sm text-slate-500">Trình duyệt sẽ yêu cầu quyền truy cập camera.</p><Button className="mt-5" onClick={() => setCameraEnabled(true)}>Bắt đầu quét</Button></div> : <>
                        <div className="relative mx-auto aspect-[3/4] max-h-[65vh] overflow-hidden rounded-[24px] bg-black sm:aspect-video"><video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" /><div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[62%] max-w-64 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.42)]" />{state === "starting" && <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white"><Loader2 className="mr-2 h-6 w-6 animate-spin" />Đang khởi động camera...</div>}</div>
                        <p className="text-center text-sm font-medium text-slate-600">Đưa mã QR vào giữa khung và giữ thiết bị ổn định.</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Button type="button" variant="outline" disabled={!torchSupported || state !== "scanning"} onClick={() => void toggleTorch()}><Lightbulb className="mr-2 h-4 w-4" />{torchOn ? "Tắt flash" : "Bật flash"}</Button><Button type="button" variant="outline" onClick={() => setFacingMode((value) => value === "environment" ? "user" : "environment")}><SwitchCamera className="mr-2 h-4 w-4" />Đổi camera</Button><Button type="button" variant="outline" onClick={() => { stopCamera(); setCameraEnabled(false); setState("idle"); setMessage("Camera đã dừng."); }}><X className="mr-2 h-4 w-4" />Dừng</Button><Button type="button" variant="outline" onClick={() => setCameraAttempt((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Thử lại</Button></div>
                    </>}
                </div>}

                {mode === "image" && <label onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={dropImage} className={cn("flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition", dragging ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50")}><ImageUp className="h-12 w-12 text-emerald-600" /><p className="mt-4 text-lg font-bold text-slate-800">Chọn, chụp hoặc kéo thả ảnh QR</p><p className="mt-2 text-sm text-slate-500">Hỗ trợ JPG, JPEG, PNG · Tối đa 10 MB</p><span className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Chọn ảnh</span><input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={chooseImage} /></label>}

                {mode === "manual" && <form onSubmit={submitManual} className="mx-auto max-w-xl space-y-4 rounded-3xl bg-slate-50 p-5 sm:p-8"><div><label htmlFor="trace-code" className="text-sm font-bold text-slate-800">Nhập mã truy xuất</label><p className="mt-1 text-sm text-slate-500">Có thể nhập mã truy xuất, mã lô hàng, mã lô thu hoạch hoặc mã sản phẩm được hệ thống hỗ trợ.</p></div><Input id="trace-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Nhập mã truy xuất" autoComplete="off" /><Button type="submit" className="w-full" disabled={!manualCode.trim() || state === "checking"}>Tra cứu</Button></form>}
            </div>

            <div aria-live="polite" className={cn("mt-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm", state === "error" ? "bg-red-50 text-red-700" : state === "checking" || state === "starting" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800")}>{state === "error" ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> : state === "checking" || state === "starting" ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" /> : <ScanLine className="mt-0.5 h-5 w-5 shrink-0" />}<span>{message}</span></div>
        </CardContent>
    </Card>;
}
