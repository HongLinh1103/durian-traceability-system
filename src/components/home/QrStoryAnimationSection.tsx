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
            <div className="mx-auto max-w-5xl px-2.5 sm:px-6">
                {/* SECTION HEADER */}
                <div className="mx-auto mb-4 max-w-2xl text-center sm:mb-7">
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

                {/* ANIMATION CARD CONTAINER (LUÔN TRÌNH BÀY THEO HÀNG NGANG TRÊN CẢ MOBILE & DESKTOP) */}
                <div className="relative mx-auto rounded-[24px] border border-emerald-100/90 bg-gradient-to-b from-white via-emerald-50/20 to-slate-50 p-2.5 shadow-soft sm:rounded-[34px] sm:p-6 lg:p-7">
                    <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 lg:grid lg:grid-cols-12 lg:gap-6">
                        {/* ============================================================== */}
                        {/* LEFT: QR BADGE ILLUSTRATION                                   */}
                        {/* ============================================================== */}
                        <div className="flex shrink-0 flex-col items-center w-[112px] sm:w-[170px] lg:w-auto lg:col-span-5 lg:items-end">
                            <div
                                className={cn(
                                    "relative w-full max-w-[112px] sm:max-w-[170px] lg:max-w-[230px] rounded-2xl border bg-white p-2 sm:p-3.5 lg:p-4 shadow-sm transition-all duration-500",
                                    isScanning
                                        ? "border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                        : "border-slate-200"
                                )}
                            >
                                {/* Label Top */}
                                <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 pb-1 sm:mb-2.5 sm:pb-2">
                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                        <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-600 text-white sm:h-5 sm:w-5">
                                            <Leaf className="h-2 w-2 sm:h-3 sm:w-3" />
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-900 sm:text-[11px]">
                                            TriViet
                                        </span>
                                    </div>
                                    <span className="rounded bg-emerald-50 px-1 py-0.5 text-[7px] font-bold text-emerald-700 sm:px-1.5 sm:text-[9px]">
                                        VietGAP
                                    </span>
                                </div>

                                {/* QR Wrapper */}
                                <div
                                    className={cn(
                                        "relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-slate-50 p-1 transition-all duration-500 sm:rounded-xl sm:p-2",
                                        isScanning
                                            ? "border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
                                            : "border-slate-200"
                                    )}
                                >
                                    {/* 4 Corner Markers */}
                                    <span className="absolute left-1 top-1 h-2.5 w-2.5 rounded-tl border-l-2 border-t-2 border-emerald-600 sm:left-1.5 sm:top-1.5 sm:h-3.5 sm:w-3.5" />
                                    <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-tr border-r-2 border-t-2 border-emerald-600 sm:right-1.5 sm:top-1.5 sm:h-3.5 sm:w-3.5" />
                                    <span className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-bl border-b-2 border-l-2 border-emerald-600 sm:bottom-1.5 sm:left-1.5 sm:h-3.5 sm:w-3.5" />
                                    <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-br border-b-2 border-r-2 border-emerald-600 sm:bottom-1.5 sm:right-1.5 sm:h-3.5 sm:w-3.5" />

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
                                            <QrCode className="h-10 w-10 sm:h-16 sm:w-16" />
                                        </div>
                                    )}

                                    {/* Scanner Laser Beam (0.0s - 0.7s) */}
                                    {isScanning && (
                                        <div className="pointer-events-none absolute inset-x-1 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-[scan-laser_1.4s_ease-in-out_infinite] sm:inset-x-1.5" />
                                    )}
                                </div>

                                {/* Label Bottom */}
                                <div className="mt-1.5 text-center sm:mt-2.5">
                                    <h3 className="truncate text-[9px] font-black text-slate-900 sm:text-xs">
                                        Sầu riêng Ri6
                                    </h3>
                                    <p className="font-mono text-[8px] font-bold text-emerald-700 sm:text-[10px]">
                                        TV-DEMO-001
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ============================================================== */}
                        {/* MIDDLE: ANIMATED DATA FLOW & STATUS BEAM (HORIZONTAL)          */}
                        {/* ============================================================== */}
                        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 w-[20px] sm:w-[42px] lg:col-span-2 lg:w-full">
                            {/* Status Text Pill (Tablet & Desktop) */}
                            <div className="hidden sm:flex items-center justify-center transition-all duration-300">
                                {isPastConnecting ? (
                                    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 shadow-2xs lg:text-[10px]">
                                        <Check className="h-2.5 w-2.5 text-emerald-600 lg:h-3 lg:w-3" />
                                        <span className="hidden lg:inline">Đã xác thực</span>
                                    </div>
                                ) : isConnecting || isScanning ? (
                                    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[9px] font-bold text-emerald-700 shadow-2xs lg:text-[10px]">
                                        <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-600 lg:h-3 lg:w-3" />
                                        <span className="hidden lg:inline">Đang truy xuất...</span>
                                    </div>
                                ) : (
                                    <div className="text-[9px] font-medium text-slate-400">
                                        Sẵn sàng
                                    </div>
                                )}
                            </div>

                            {/* Flowing animated horizontal connection bar */}
                            <div className="relative flex h-1.5 w-full items-center overflow-hidden rounded-full bg-slate-200 sm:h-2">
                                {(isConnecting || isPastConnecting) && (
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            isConnecting
                                                ? "w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 shadow-[0_0_8px_#10b981] animate-pulse"
                                                : "w-full bg-emerald-500 opacity-70"
                                        )}
                                    />
                                )}
                                {isConnecting && (
                                    <div className="absolute inset-y-0 w-4 bg-gradient-to-r from-transparent via-white to-transparent opacity-80 animate-[scan-laser_1s_linear_infinite] sm:w-8" />
                                )}
                            </div>
                        </div>

                        {/* ============================================================== */}
                        {/* RIGHT: IPHONE 15 PRO MAX (FIXED RATIO FOR ALL SCREENS)         */}
                        {/* ============================================================== */}
                        <div className="flex shrink-0 justify-center lg:col-span-5 lg:justify-start">
                            {/* iPhone 15 Pro Max Chassis - KÍCH THƯỚC CỐ ĐỊNH, KHÔNG CO DÃN */}
                            <div className="relative h-[450px] w-[195px] shrink-0 rounded-[34px] bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-[6px] shadow-[0_15px_35px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-1 ring-slate-700/60 sm:h-[500px] sm:w-[245px] sm:rounded-[40px] sm:p-[7px] lg:h-[550px] lg:w-[295px] lg:rounded-[44px] lg:p-[8px]">
                                {/* Physical Side Buttons */}
                                <span className="absolute -left-[6px] top-[75px] h-4 w-[2px] rounded-l-sm bg-slate-700 sm:-left-[8px] sm:top-[88px] sm:h-5 sm:w-[2.5px]" />
                                <span className="absolute -left-[6px] top-[105px] h-7 w-[2px] rounded-l-sm bg-slate-700 sm:-left-[8px] sm:top-[125px] sm:h-9 sm:w-[2.5px]" />
                                <span className="absolute -left-[6px] top-[140px] h-7 w-[2px] rounded-l-sm bg-slate-700 sm:-left-[8px] sm:top-[170px] sm:h-9 sm:w-[2.5px]" />
                                <span className="absolute -right-[6px] top-[115px] h-10 w-[2px] rounded-r-sm bg-slate-700 sm:-right-[8px] sm:top-[135px] sm:h-12 sm:w-[2.5px]" />

                                {/* Screen Bezel */}
                                <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] bg-slate-50 text-slate-900 shadow-inner sm:rounded-[34px] lg:rounded-[36px]">
                                    {/* Dynamic Island Pill */}
                                    <div className="absolute left-1/2 top-1.5 z-30 flex h-[16px] w-[64px] -translate-x-1/2 items-center justify-between rounded-full bg-black px-1.5 shadow-sm transition-all duration-300 sm:top-2 sm:h-[20px] sm:w-[80px] sm:px-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-950 ring-1 ring-slate-800 sm:h-2 sm:w-2" />
                                        <span
                                            className={cn(
                                                "h-1 w-1 rounded-full transition-all duration-500 sm:h-1.5 sm:w-1.5",
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
                                        <div className="flex items-center justify-between px-3 pt-2 text-[8px] font-bold text-slate-700 select-none sm:px-4 sm:pt-2.5 sm:text-[10px]">
                                            <span>09:41</span>
                                            <div className="flex items-center gap-1 text-slate-600 sm:gap-1.5">
                                                <Signal className="h-2 w-2 fill-current sm:h-2.5 sm:w-2.5" />
                                                <Wifi className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                                <div className="flex h-2 w-3.5 items-center rounded-[2px] border border-slate-600 p-0.5 sm:h-2.5 sm:w-4.5">
                                                    <div className="h-full w-full rounded-[1px] bg-slate-700" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* App Header Bar */}
                                        <div className="mt-1 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-2.5 py-1 backdrop-blur sm:mt-1.5 sm:px-3.5 sm:py-1.5">
                                            <div className="flex items-center gap-1">
                                                <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-600 text-white sm:h-4 sm:w-4">
                                                    <Leaf className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                                </div>
                                                <span className="text-[9px] font-black tracking-tight text-slate-900 sm:text-[10px]">
                                                    TriViet Trace
                                                </span>
                                            </div>

                                            {isAuthenticated ? (
                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[7.5px] font-bold text-emerald-800 animate-in fade-in zoom-in-95 duration-200 sm:px-2 sm:text-[9px]">
                                                    <Check className="h-2 w-2 text-emerald-700 sm:h-2.5 sm:w-2.5" />
                                                    Hợp lệ
                                                </span>
                                            ) : (
                                                <span className="text-[7.5px] font-semibold text-slate-400 sm:text-[8px]">
                                                    Tra cứu
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* MIDDLE SECTION: Content Body (Fixed Area) */}
                                    <div className="relative flex flex-1 flex-col justify-center overflow-hidden p-2 sm:p-2.5">
                                        {/* State 1: Initial Standby */}
                                        {!isPastConnecting && (
                                            <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-700 sm:h-12 sm:w-12">
                                                    <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
                                                </div>
                                                <h4 className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-800 sm:text-xs">
                                                    TRIVIET
                                                </h4>
                                                <p className="text-[9px] font-semibold text-emerald-700 sm:text-[10px]">
                                                    Truy xuất nguồn gốc
                                                </p>
                                                <p className="mt-1 text-[8px] text-slate-400 sm:text-[9px]">
                                                    Đang chờ nhận mã QR...
                                                </p>
                                            </div>
                                        )}

                                        {/* State 2: Authenticating */}
                                        {phase === "authenticating" && (
                                            <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
                                                <Loader2 className="h-6 w-6 animate-spin text-emerald-600 sm:h-8 sm:w-8" />
                                                <p className="mt-2 text-[9px] font-bold text-slate-700 sm:text-[10px]">
                                                    Đang xác thực mã...
                                                </p>
                                                <p className="font-mono text-[8px] text-slate-400 sm:text-[9px]">
                                                    TV-DEMO-001
                                                </p>
                                            </div>
                                        )}

                                        {/* State 3+: Product Card & Staggered Timeline */}
                                        {isPastConnecting && phase !== "authenticating" && (
                                            <div className="flex h-full flex-col justify-between py-0.5 animate-in fade-in duration-300">
                                                {/* Product Header Card */}
                                                {showProduct && (
                                                    <div className="rounded-xl border border-emerald-200/70 bg-white p-1.5 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200 sm:p-2">
                                                        <div className="flex items-start justify-between gap-1">
                                                            <div>
                                                                <h4 className="text-[10px] font-black leading-tight text-slate-900 sm:text-[11px]">
                                                                    Sầu riêng Ri6
                                                                </h4>
                                                                <p className="font-mono text-[8px] font-bold text-emerald-700 sm:text-[9px]">
                                                                    Mã: TV-DEMO-001
                                                                </p>
                                                            </div>
                                                            <span className="rounded bg-emerald-50 px-1 py-0.5 text-[7px] font-bold text-emerald-700 sm:px-1.5 sm:text-[8px]">
                                                                Chính hãng
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 flex items-center gap-0.5 text-[8px] text-slate-500 sm:text-[9px]">
                                                            <MapPin className="h-2 w-2 text-emerald-600 shrink-0 sm:h-2.5 sm:w-2.5" />
                                                            <span className="truncate">Long Khánh, Đồng Nai</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Timeline Heading */}
                                                {showProduct && (
                                                    <div className="flex items-center justify-between px-0.5 py-0.5">
                                                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-500 sm:text-[9px]">
                                                            Hành trình sản phẩm
                                                        </p>
                                                        <span className="text-[7px] font-semibold text-emerald-700 sm:text-[8px]">
                                                            Mới nhất trước
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Vertical Timeline with Staggered Cards */}
                                                <div className="relative space-y-1 pl-3.5 sm:pl-4">
                                                    {/* Background line */}
                                                    <div className="absolute left-[6px] top-1 bottom-1 w-0.5 bg-slate-200 sm:left-[7px]" />
                                                    {/* Progress line */}
                                                    <div
                                                        className="absolute left-[6px] top-1 w-0.5 bg-emerald-500 transition-all duration-300 sm:left-[7px]"
                                                        style={{ height: timelineLineHeight }}
                                                    />

                                                    {/* Card 1: Điểm phân phối (0.0s) */}
                                                    {showStep1 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[11px] top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white sm:-left-[13px] sm:h-3 sm:w-3">
                                                                <Store className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-emerald-100 bg-white p-1 shadow-2xs">
                                                                <span className="text-[7px] font-black uppercase tracking-wider text-emerald-700 sm:text-[7.5px]">
                                                                    ĐÃ ĐẾN ĐIỂM PHÂN PHỐI
                                                                </span>
                                                                <p className="truncate text-[8px] font-bold leading-tight text-slate-900 sm:text-[9px]">
                                                                    Chợ đầu mối Thủ Đức
                                                                </p>
                                                                <p className="text-[7px] text-slate-500 sm:text-[8px]">
                                                                    TP. Hồ Chí Minh
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card 2: Chế biến (+0.2s) */}
                                                    {showStep2 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[11px] top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white sm:-left-[13px] sm:h-3 sm:w-3">
                                                                <Factory className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[7px] font-black uppercase tracking-wider text-emerald-700 sm:text-[7.5px]">
                                                                        CHẾ BIẾN
                                                                    </span>
                                                                    <span className="rounded bg-emerald-50 px-1 text-[7px] font-bold text-emerald-700">
                                                                        QC: Đạt
                                                                    </span>
                                                                </div>
                                                                <p className="truncate text-[8px] font-bold leading-tight text-slate-900 sm:text-[9px]">
                                                                    Cơ sở Chế biến Trị An
                                                                </p>
                                                                <p className="truncate text-[7px] text-slate-500 sm:text-[8px]">
                                                                    Tách múi · Cấp đông
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card 3: Vựa thu mua (+0.4s) */}
                                                    {showStep3 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[11px] top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white sm:-left-[13px] sm:h-3 sm:w-3">
                                                                <Truck className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[7px] font-black uppercase tracking-wider text-emerald-700 sm:text-[7.5px]">
                                                                        THU MUA
                                                                    </span>
                                                                    <span className="rounded bg-emerald-50 px-1 text-[7px] font-bold text-emerald-700">
                                                                        QC: Đạt
                                                                    </span>
                                                                </div>
                                                                <p className="truncate text-[8px] font-bold leading-tight text-slate-900 sm:text-[9px]">
                                                                    Vựa Sầu riêng Thành Phát
                                                                </p>
                                                                <p className="text-[7px] text-slate-500 sm:text-[8px]">
                                                                    Khối lượng: 700 kg
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card 4: Thu hoạch (+0.6s) */}
                                                    {showStep4 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[11px] top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white sm:-left-[13px] sm:h-3 sm:w-3">
                                                                <Calendar className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1 shadow-2xs">
                                                                <span className="text-[7px] font-black uppercase tracking-wider text-emerald-700 sm:text-[7.5px]">
                                                                    THU HOẠCH
                                                                </span>
                                                                <p className="text-[8px] font-bold leading-tight text-slate-900 sm:text-[9px]">
                                                                    24/08/2026
                                                                </p>
                                                                <p className="font-mono text-[7px] text-slate-500 sm:text-[8px]">
                                                                    Lô: HL-DEMO-001
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card 5: Vườn trồng (+0.8s) */}
                                                    {showStep5 && (
                                                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="absolute -left-[11px] top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white sm:-left-[13px] sm:h-3 sm:w-3">
                                                                <Sprout className="h-1.5 w-1.5" />
                                                            </span>
                                                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-1 shadow-2xs">
                                                                <span className="text-[7px] font-black uppercase tracking-wider text-emerald-800 sm:text-[7.5px]">
                                                                    VƯỜN TRỒNG
                                                                </span>
                                                                <p className="truncate text-[8px] font-bold leading-tight text-slate-900 sm:text-[9px]">
                                                                    Vườn Minh Phát
                                                                </p>
                                                                <p className="font-mono text-[7px] text-emerald-700 sm:text-[8px]">
                                                                    MSVT-DN-LK-001
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* BOTTOM SECTION: iPhone Home Bar */}
                                    <div className="shrink-0 pb-1 pt-0.5 sm:pb-1.5">
                                        <div className="mx-auto h-1 w-16 rounded-full bg-slate-300 sm:w-20" />
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
