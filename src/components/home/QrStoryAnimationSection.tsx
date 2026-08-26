"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
    Sprout,
    QrCode,
    Truck,
    Factory,
    Store,
    Wifi,
    Signal,
    Leaf,
    MapPin,
    Calendar,
    Sparkles,
    Loader2,
    Check,
    ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StepPhase =
    | "idle"
    | "scanning"
    | "connecting"
    | "authenticating"
    | "authenticated"
    | "product"
    | "timeline_1"
    | "timeline_2"
    | "timeline_3"
    | "timeline_4"
    | "timeline_5"
    | "completed";

export function QrStoryAnimationSection() {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const [hasTriggered, setHasTriggered] = useState(false);
    const [phase, setPhase] = useState<StepPhase>("idle");
    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    // Generate real QR code image
    useEffect(() => {
        void QRCode.toDataURL("https://triviet.vn/trace/TV-DEMO-001", {
            width: 240,
            margin: 1,
            color: {
                dark: "#064e3b",
                light: "#ffffff",
            },
        }).then(setQrDataUrl);
    }, []);

    // IntersectionObserver to trigger sequence once when in viewport
    useEffect(() => {
        const element = sectionRef.current;
        if (!element || hasTriggered) return;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && !hasTriggered) {
                    setHasTriggered(true);
                    observer.disconnect();

                    if (prefersReducedMotion) {
                        setPhase("completed");
                        return;
                    }

                    // 1. QR scanning line (0.0s - 0.7s)
                    setPhase("scanning");

                    // 2. Data flow from QR to Phone (0.7s - 1.3s)
                    const t1 = setTimeout(() => setPhase("connecting"), 700);

                    // 3. Phone authenticating (1.3s - 1.7s)
                    const t2 = setTimeout(() => setPhase("authenticating"), 1300);

                    // 4. Phone valid badge (1.7s - 1.9s)
                    const t3 = setTimeout(() => setPhase("authenticated"), 1700);

                    // 5. Product info card appears (1.9s - 2.1s)
                    const t4 = setTimeout(() => setPhase("product"), 1900);

                    // 6. Staggered timeline cards (every 200ms from 2.1s)
                    const t5 = setTimeout(() => setPhase("timeline_1"), 2100); // 0.0s
                    const t6 = setTimeout(() => setPhase("timeline_2"), 2300); // 0.2s
                    const t7 = setTimeout(() => setPhase("timeline_3"), 2500); // 0.4s
                    const t8 = setTimeout(() => setPhase("timeline_4"), 2700); // 0.6s
                    const t9 = setTimeout(() => setPhase("timeline_5"), 2900); // 0.8s
                    const t10 = setTimeout(() => setPhase("completed"), 3200);

                    return () => {
                        clearTimeout(t1);
                        clearTimeout(t2);
                        clearTimeout(t3);
                        clearTimeout(t4);
                        clearTimeout(t5);
                        clearTimeout(t6);
                        clearTimeout(t7);
                        clearTimeout(t8);
                        clearTimeout(t9);
                        clearTimeout(t10);
                    };
                }
            },
            {
                threshold: 0.35,
                rootMargin: "0px 0px -40px 0px",
            }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [hasTriggered]);

    // Helpers
    const isScanning = phase === "scanning";
    const isConnecting = phase === "connecting";
    const isPastConnecting = !["idle", "scanning", "connecting"].includes(phase);
    const isAuthenticated = !["idle", "scanning", "connecting", "authenticating"].includes(phase);
    const showProduct = !["idle", "scanning", "connecting", "authenticating", "authenticated"].includes(phase);

    const showStep1 = ["timeline_1", "timeline_2", "timeline_3", "timeline_4", "timeline_5", "completed"].includes(phase);
    const showStep2 = ["timeline_2", "timeline_3", "timeline_4", "timeline_5", "completed"].includes(phase);
    const showStep3 = ["timeline_3", "timeline_4", "timeline_5", "completed"].includes(phase);
    const showStep4 = ["timeline_4", "timeline_5", "completed"].includes(phase);
    const showStep5 = ["timeline_5", "completed"].includes(phase);

    // Height of vertical green line in timeline
    let timelineLineHeight = "0%";
    if (showStep5) timelineLineHeight = "100%";
    else if (showStep4) timelineLineHeight = "80%";
    else if (showStep3) timelineLineHeight = "60%";
    else if (showStep2) timelineLineHeight = "40%";
    else if (showStep1) timelineLineHeight = "20%";

    return (
        <section
            ref={sectionRef}
            aria-label="Minh họa truy xuất nguồn gốc QR"
            className="my-6 overflow-hidden py-2 sm:my-8 sm:py-4"
        >
            <div className="mx-auto max-w-5xl px-3 sm:px-6">
                {/* SECTION HEADER */}
                <div className="mx-auto mb-5 max-w-2xl text-center sm:mb-7">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>Mô phỏng truy xuất nguồn gốc</span>
                    </div>

                    <h2
                        className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl md:text-3xl"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Quét một mã. Theo dõi cả hành trình.
                    </h2>

                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                        Mỗi mã QR kết nối với lịch sử của lô hàng, từ vùng trồng đến điểm phân phối.
                    </p>
                </div>

                {/* ANIMATION CARD CONTAINER */}
                <div className="relative mx-auto rounded-[28px] border border-emerald-100/90 bg-gradient-to-b from-white via-emerald-50/20 to-slate-50 p-4 shadow-soft sm:rounded-[34px] sm:p-6 lg:p-7">
                    <div className="grid items-center gap-4 lg:grid-cols-12 lg:gap-6">
                        {/* ============================================================== */}
                        {/* LEFT COLUMN: QR BADGE ILLUSTRATION                             */}
                        {/* ============================================================== */}
                        <div className="flex flex-col items-center lg:col-span-5 lg:items-end">
                            <div
                                className={cn(
                                    "relative w-full max-w-[210px] rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-500 sm:max-w-[230px] sm:p-4",
                                    isScanning
                                        ? "border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                        : "border-slate-200"
                                )}
                            >
                                {/* Label Top */}
                                <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white">
                                            <Leaf className="h-3 w-3" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                                            TriViet Trace
                                        </span>
                                    </div>
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                        VietGAP
                                    </span>
                                </div>

                                {/* QR Wrapper */}
                                <div
                                    className={cn(
                                        "relative aspect-square w-full overflow-hidden rounded-xl border-2 bg-slate-50 p-2 transition-all duration-500",
                                        isScanning
                                            ? "border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
                                            : "border-slate-200"
                                    )}
                                >
                                    {/* 4 Corner Markers */}
                                    <span className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-tl border-l-2 border-t-2 border-emerald-600" />
                                    <span className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-tr border-r-2 border-t-2 border-emerald-600" />
                                    <span className="absolute bottom-1.5 left-1.5 h-3.5 w-3.5 rounded-bl border-b-2 border-l-2 border-emerald-600" />
                                    <span className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-br border-b-2 border-r-2 border-emerald-600" />

                                    {/* Real QR Graphic */}
                                    {qrDataUrl ? (
                                        <div className="relative h-full w-full">
                                            <Image
                                                src={qrDataUrl}
                                                alt="Mã QR Sầu riêng Ri6 TV-DEMO-001"
                                                fill
                                                unoptimized
                                                className="object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                                            <QrCode className="h-16 w-16" />
                                        </div>
                                    )}

                                    {/* Scanner Laser Beam (0.0s - 0.7s) */}
                                    {isScanning && (
                                        <div className="pointer-events-none absolute inset-x-1.5 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-[scan-laser_1.4s_ease-in-out_infinite]" />
                                    )}
                                </div>

                                {/* Label Bottom */}
                                <div className="mt-2.5 text-center">
                                    <h3 className="text-xs font-black text-slate-900">
                                        Sầu riêng Ri6
                                    </h3>
                                    <p className="font-mono text-[10px] font-bold text-emerald-700">
                                        TV-DEMO-001
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ============================================================== */}
                        {/* MIDDLE: ANIMATED DATA FLOW & STATUS BADGE                      */}
                        {/* ============================================================== */}
                        <div className="hidden lg:col-span-2 lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-2">
                            {/* Status Text Pill */}
                            <div className="flex items-center justify-center transition-all duration-300">
                                {isPastConnecting ? (
                                    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-2xs animate-in fade-in zoom-in-90 duration-300">
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        <span>Đã xác thực</span>
                                    </div>
                                ) : isConnecting || isScanning ? (
                                    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-2xs animate-in fade-in duration-300">
                                        <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                                        <span>Đang truy xuất dữ liệu...</span>
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-medium text-slate-400">
                                        Sẵn sàng
                                    </div>
                                )}
                            </div>

                            {/* Flowing animated connection bar from Left to Right */}
                            <div className="relative flex h-2 w-full items-center overflow-hidden rounded-full bg-slate-200">
                                {(isConnecting || isPastConnecting) && (
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            isConnecting
                                                ? "w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 shadow-[0_0_10px_#10b981] animate-pulse"
                                                : "w-full bg-emerald-500 opacity-70"
                                        )}
                                    />
                                )}
                                {isConnecting && (
                                    <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white to-transparent opacity-80 animate-[scan-laser_1s_linear_infinite]" />
                                )}
                            </div>
                        </div>

                        {/* Mobile connection bar */}
                        <div className="flex flex-col items-center justify-center gap-1.5 py-0.5 lg:hidden">
                            {isPastConnecting ? (
                                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span>Đã xác thực</span>
                                </div>
                            ) : isConnecting || isScanning ? (
                                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                                    <span>Đang truy xuất dữ liệu...</span>
                                </div>
                            ) : null}

                            <div
                                className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300",
                                    isConnecting || isPastConnecting
                                        ? "border-emerald-400 bg-emerald-500 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-400"
                                )}
                            >
                                <ArrowDown className="h-3 w-3 animate-bounce" />
                            </div>
                        </div>

                        {/* ============================================================== */}
                        {/* RIGHT COLUMN: IPHONE 15 PRO MAX (FIXED DIMENSIONS)             */}
                        {/* ============================================================== */}
                        <div className="flex justify-center lg:col-span-5 lg:justify-start">
                            {/* iPhone 15 Pro Max Titanium Chassis - CỐ ĐỊNH CHIỀU CAO */}
                            <div className="relative h-[530px] w-[280px] shrink-0 rounded-[44px] bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-[8px] shadow-[0_20px_50px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-1 ring-slate-700/60 sm:h-[550px] sm:w-[295px]">
                                {/* Physical Side Buttons */}
                                {/* Action Button */}
                                <span className="absolute -left-[10px] top-[88px] h-5 w-[2.5px] rounded-l-sm bg-slate-700" />
                                {/* Volume Up */}
                                <span className="absolute -left-[10px] top-[125px] h-9 w-[2.5px] rounded-l-sm bg-slate-700" />
                                {/* Volume Down */}
                                <span className="absolute -left-[10px] top-[170px] h-9 w-[2.5px] rounded-l-sm bg-slate-700" />
                                {/* Power / Siri Button */}
                                <span className="absolute -right-[10px] top-[135px] h-12 w-[2.5px] rounded-r-sm bg-slate-700" />

                                {/* Screen Bezel */}
                                <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[36px] bg-slate-50 text-slate-900 shadow-inner">
                                    {/* Dynamic Island Pill */}
                                    <div className="absolute left-1/2 top-2 z-30 flex h-[20px] w-[80px] -translate-x-1/2 items-center justify-between rounded-full bg-black px-2 shadow-sm transition-all duration-300">
                                        <span className="h-2 w-2 rounded-full bg-slate-950 ring-1 ring-slate-800" />
                                        <span
                                            className={cn(
                                                "h-1.5 w-1.5 rounded-full transition-all duration-500",
                                                isAuthenticated
                                                    ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                                                    : isScanning || isConnecting
                                                    ? "bg-amber-400 animate-pulse"
                                                    : "bg-slate-900"
                                            )}
                                        />
                                    </div>

                                    {/* TOP SECTION: Status Bar & App Header */}
                                    <div className="shrink-0">
                                        {/* Status Bar */}
                                        <div className="flex items-center justify-between px-4 pt-2.5 text-[10px] font-bold text-slate-700 select-none">
                                            <span>09:41</span>
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Signal className="h-2.5 w-2.5 fill-current" />
                                                <Wifi className="h-2.5 w-2.5" />
                                                <div className="flex h-2.5 w-4.5 items-center rounded-[3px] border border-slate-600 p-0.5">
                                                    <div className="h-full w-full rounded-[1px] bg-slate-700" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* App Header Bar */}
                                        <div className="mt-1.5 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-3.5 py-1.5 backdrop-blur">
                                            <div className="flex items-center gap-1">
                                                <div className="flex h-4 w-4 items-center justify-center rounded bg-emerald-600 text-white">
                                                    <Leaf className="h-2.5 w-2.5" />
                                                </div>
                                                <span className="text-[10px] font-black tracking-tight text-slate-900">
                                                    TriViet Trace
                                                </span>
                                            </div>

                                            {isAuthenticated ? (
                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 animate-in fade-in zoom-in-95 duration-200">
                                                    <Check className="h-2.5 w-2.5 text-emerald-700" />
                                                    Mã hợp lệ
                                                </span>
                                            ) : (
                                                <span className="text-[8px] font-semibold text-slate-400">
                                                    Tra cứu
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* MIDDLE SECTION: Content Body (Fixed Area) */}
                                    <div className="relative flex flex-1 flex-col justify-center overflow-hidden p-2.5">
                                        {/* State 1: Initial Standby */}
                                        {!isPastConnecting && (
                                            <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-700">
                                                    <QrCode className="h-6 w-6" />
                                                </div>
                                                <h4 className="mt-2.5 text-xs font-black uppercase tracking-wider text-slate-800">
                                                    TRIVIET
                                                </h4>
                                                <p className="text-[10px] font-semibold text-emerald-700">
                                                    Truy xuất nguồn gốc
                                                </p>
                                                <p className="mt-1.5 text-[9px] text-slate-400">
                                                    Đang chờ nhận mã QR...
                                                </p>
                                            </div>
                                        )}

                                        {/* State 2: Authenticating */}
                                        {phase === "authenticating" && (
                                            <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
                                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                                <p className="mt-2.5 text-[10px] font-bold text-slate-700">
                                                    Đang xác thực mã truy xuất...
                                                </p>
                                                <p className="font-mono text-[9px] text-slate-400">
                                                    TV-DEMO-001
                                                </p>
                                            </div>
                                        )}

                                        {/* State 3+: Product Card & Staggered Timeline */}
                                        {isPastConnecting && phase !== "authenticating" && (
                                            <div className="flex h-full flex-col justify-between py-0.5 animate-in fade-in duration-300">
                                                {/* Product Header Card */}
                                                {showProduct && (
                                                    <div className="rounded-xl border border-emerald-200/70 bg-white p-2 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <div className="flex items-start justify-between gap-1">
                                                            <div>
                                                                <h4 className="text-[11px] font-black text-slate-900 leading-tight">
                                                                    Sầu riêng Ri6
                                                                </h4>
                                                                <p className="font-mono text-[9px] font-bold text-emerald-700">
                                                                    Mã: TV-DEMO-001
                                                                </p>
                                                            </div>
                                                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
                                                                Chính hãng
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-500">
                                                            <MapPin className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                                            <span>Long Khánh, Đồng Nai</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Timeline Heading */}
                                                {showProduct && (
                                                    <div className="flex items-center justify-between px-0.5 py-0.5">
                                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                                            Hành trình sản phẩm
                                                        </p>
                                                        <span className="text-[8px] font-semibold text-emerald-700">
                                                            Mới nhất trước
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Vertical Timeline with Staggered Cards */}
                                                <div className="relative pl-4 space-y-1">
                                                    {/* Background line */}
                                                    <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-slate-200" />
                                                    {/* Progress line */}
                                                    <div
                                                        className="absolute left-[7px] top-1 w-0.5 bg-emerald-500 transition-all duration-300"
                                                        style={{ height: timelineLineHeight }}
                                                    />

                                                    {/* Card 1: Điểm phân phối (0.0s) */}
                                                    {showStep1 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[13px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Store className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-emerald-100 bg-white p-1 shadow-2xs">
                                                                <span className="text-[7.5px] font-black uppercase tracking-wider text-emerald-700">
                                                                    ĐÃ ĐƯA ĐẾN ĐIỂM PHÂN PHỐI
                                                                </span>
                                                                <p className="text-[9px] font-bold text-slate-900 leading-tight">
                                                                    Chợ đầu mối Thủ Đức
                                                                </p>
                                                                <p className="text-[8px] text-slate-500">
                                                                    TP. Hồ Chí Minh
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card 2: Chế biến (+0.2s) */}
                                                    {showStep2 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[13px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Factory className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[7.5px] font-black uppercase tracking-wider text-emerald-700">
                                                                        CHẾ BIẾN
                                                                    </span>
                                                                    <span className="rounded bg-emerald-50 px-1 py-0.2 text-[7.5px] font-bold text-emerald-700">
                                                                        QC: Đạt
                                                                    </span>
                                                                </div>
                                                                <p className="text-[9px] font-bold text-slate-900 leading-tight">
                                                                    Cơ sở Chế biến Trị An
                                                                </p>
                                                                <p className="text-[8px] text-slate-500">
                                                                    Làm sạch · Tách múi · Cấp đông
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card 3: Vựa thu mua (+0.4s) */}
                                                    {showStep3 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[13px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Truck className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[7.5px] font-black uppercase tracking-wider text-emerald-700">
                                                                        THU MUA
                                                                    </span>
                                                                    <span className="rounded bg-emerald-50 px-1 py-0.2 text-[7.5px] font-bold text-emerald-700">
                                                                        QC: Đạt
                                                                    </span>
                                                                </div>
                                                                <p className="text-[9px] font-bold text-slate-900 leading-tight">
                                                                    Vựa Sầu riêng Thành Phát
                                                                </p>
                                                                <p className="text-[8px] text-slate-500">
                                                                    Khối lượng: 700 kg
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card 4: Thu hoạch (+0.6s) */}
                                                    {showStep4 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[13px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Calendar className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1 shadow-2xs">
                                                                <span className="text-[7.5px] font-black uppercase tracking-wider text-emerald-700">
                                                                    THU HOẠCH
                                                                </span>
                                                                <p className="text-[9px] font-bold text-slate-900 leading-tight">
                                                                    24/08/2026
                                                                </p>
                                                                <p className="font-mono text-[8px] text-slate-500">
                                                                    Lô: HL-DEMO-001
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card 5: Vườn trồng (+0.8s) */}
                                                    {showStep5 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[13px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Sprout className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-1 shadow-2xs">
                                                                <span className="text-[7.5px] font-black uppercase tracking-wider text-emerald-800">
                                                                    NGUỒN GỐC VƯỜN TRỒNG
                                                                </span>
                                                                <p className="text-[9px] font-bold text-slate-900 leading-tight">
                                                                    Vườn sầu riêng Minh Phát
                                                                </p>
                                                                <p className="font-mono text-[8px] text-emerald-700">
                                                                    MSVT-DN-LK-001 · Giống: Ri6
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* BOTTOM SECTION: iPhone Home Bar */}
                                    <div className="shrink-0 pb-1.5 pt-0.5">
                                        <div className="mx-auto h-1 w-20 rounded-full bg-slate-300" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
