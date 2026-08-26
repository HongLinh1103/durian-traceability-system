"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
    CheckCircle2,
    ShieldCheck,
    Sprout,
    QrCode,
    Truck,
    Factory,
    Store,
    Wifi,
    Battery,
    Signal,
    Leaf,
    MapPin,
    Calendar,
    Sparkles,
    ArrowDown,
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
            width: 320,
            margin: 1,
            color: {
                dark: "#064e3b",
                light: "#ffffff",
            },
        }).then(setQrDataUrl);
    }, []);

    // IntersectionObserver to trigger animation only once
    useEffect(() => {
        const element = sectionRef.current;
        if (!element || hasTriggered) return;

        // Check if user prefers reduced motion
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

                    // Sequence orchestrator
                    // 0.0s - 0.8s: Scan QR
                    setPhase("scanning");

                    // 0.8s - 1.4s: Connect QR to Phone
                    const t1 = setTimeout(() => setPhase("connecting"), 800);

                    // 1.4s - 1.9s: Authenticating on phone
                    const t2 = setTimeout(() => setPhase("authenticating"), 1400);

                    // 1.9s - 2.2s: Authenticated successfully
                    const t3 = setTimeout(() => setPhase("authenticated"), 1900);

                    // 2.2s - 2.5s: Show product details
                    const t4 = setTimeout(() => setPhase("product"), 2200);

                    // 2.5s - 3.7s: Reveal timeline milestones sequentially
                    const t5 = setTimeout(() => setPhase("timeline_1"), 2500);
                    const t6 = setTimeout(() => setPhase("timeline_2"), 2800);
                    const t7 = setTimeout(() => setPhase("timeline_3"), 3100);
                    const t8 = setTimeout(() => setPhase("timeline_4"), 3400);
                    const t9 = setTimeout(() => setPhase("timeline_5"), 3700);
                    const t10 = setTimeout(() => setPhase("completed"), 4000);

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
                rootMargin: "0px 0px -50px 0px",
            }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [hasTriggered]);

    // Helpers to check phase stages
    const isScanning = phase === "scanning";
    const isConnecting = phase === "connecting";
    const isPastConnecting = ![
        "idle",
        "scanning",
        "connecting",
    ].includes(phase);
    const isAuthenticated = ![
        "idle",
        "scanning",
        "connecting",
        "authenticating",
    ].includes(phase);
    const showProduct = ![
        "idle",
        "scanning",
        "connecting",
        "authenticating",
        "authenticated",
    ].includes(phase);

    const showStep1 = [
        "timeline_1",
        "timeline_2",
        "timeline_3",
        "timeline_4",
        "timeline_5",
        "completed",
    ].includes(phase);
    const showStep2 = [
        "timeline_2",
        "timeline_3",
        "timeline_4",
        "timeline_5",
        "completed",
    ].includes(phase);
    const showStep3 = [
        "timeline_3",
        "timeline_4",
        "timeline_5",
        "completed",
    ].includes(phase);
    const showStep4 = [
        "timeline_4",
        "timeline_5",
        "completed",
    ].includes(phase);
    const showStep5 = ["timeline_5", "completed"].includes(phase);

    // Calculate vertical progress line height in phone timeline
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
            className="my-12 overflow-hidden py-4 sm:my-16 sm:py-8 lg:my-20"
        >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                {/* SECTION HEADER */}
                <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Mô phỏng truy xuất nguồn gốc</span>
                    </div>

                    <h2
                        className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Quét một mã. Theo dõi cả hành trình.
                    </h2>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                        Mỗi mã QR kết nối với lịch sử của lô hàng, giúp người dùng theo dõi nguồn nguyên liệu, thu hoạch, thu mua, chế biến và điểm phân phối.
                    </p>
                </div>

                {/* MAIN INTERACTIVE ANIMATION CONTAINER */}
                <div className="relative rounded-[32px] border border-emerald-100 bg-gradient-to-b from-white via-emerald-50/20 to-slate-50 p-5 shadow-soft sm:rounded-[40px] sm:p-8 lg:p-10">
                    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
                        {/* ============================================================== */}
                        {/* LEFT COLUMN: 40% QR ILLUSTRATION                               */}
                        {/* ============================================================== */}
                        <div className="flex flex-col items-center lg:col-span-5 lg:items-end">
                            <div className="relative w-full max-w-[320px] rounded-3xl border border-slate-200 bg-white p-5 shadow-md transition-all duration-500 hover:shadow-lg sm:p-6">
                                {/* Label Top */}
                                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                            <Leaf className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                                            TriViet Trace
                                        </span>
                                    </div>
                                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                        Chuẩn VietGAP
                                    </span>
                                </div>

                                {/* QR Wrapper with Scanner Laser */}
                                <div
                                    className={cn(
                                        "relative aspect-square w-full overflow-hidden rounded-2xl border-2 bg-slate-50 p-3 transition-all duration-500",
                                        isScanning
                                            ? "border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                                            : "border-slate-200"
                                    )}
                                >
                                    {/* 4 Corner Markers */}
                                    <span className="absolute left-2 top-2 h-4 w-4 rounded-tl border-l-2 border-t-2 border-emerald-600" />
                                    <span className="absolute right-2 top-2 h-4 w-4 rounded-tr border-r-2 border-t-2 border-emerald-600" />
                                    <span className="absolute bottom-2 left-2 h-4 w-4 rounded-bl border-b-2 border-l-2 border-emerald-600" />
                                    <span className="absolute bottom-2 right-2 h-4 w-4 rounded-br border-b-2 border-r-2 border-emerald-600" />

                                    {/* QR Image */}
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
                                            <QrCode className="h-24 w-24" />
                                        </div>
                                    )}

                                    {/* Scanner Laser Line (Phase 1) */}
                                    {isScanning && (
                                        <div className="pointer-events-none absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_12px_#10b981] animate-[scan-laser_1.6s_ease-in-out_infinite]" />
                                    )}
                                </div>

                                {/* Product Info under QR */}
                                <div className="mt-4 text-center">
                                    <h3 className="text-base font-black text-slate-900">
                                        Sầu riêng Ri6
                                    </h3>
                                    <p className="font-mono text-xs font-bold text-emerald-700">
                                        TV-DEMO-001
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Tem truy xuất nguồn gốc điện tử
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ============================================================== */}
                        {/* MIDDLE: ANIMATED CONNECTION BRIDGE (Desktop & Mobile)           */}
                        {/* ============================================================== */}
                        <div className="hidden lg:col-span-1 lg:flex lg:items-center lg:justify-center">
                            <div className="relative flex h-12 w-full items-center justify-center">
                                {/* Base line */}
                                <div className="h-[2px] w-full bg-slate-200" />

                                {/* Flowing glowing pulse beam */}
                                {(isConnecting || isPastConnecting) && (
                                    <div
                                        className={cn(
                                            "absolute h-1 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_#10b981] transition-all duration-700",
                                            isConnecting
                                                ? "left-0 w-full animate-pulse"
                                                : "left-0 w-full opacity-60"
                                        )}
                                    />
                                )}

                                {/* Moving Dot */}
                                {isConnecting && (
                                    <div className="absolute h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-[scan-laser_1.2s_linear_infinite]" />
                                )}
                            </div>
                        </div>

                        {/* Mobile connection arrow */}
                        <div className="flex items-center justify-center py-1 lg:hidden">
                            <div
                                className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-500",
                                    isConnecting || isPastConnecting
                                        ? "border-emerald-400 bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                        : "border-slate-200 bg-white text-slate-400"
                                )}
                            >
                                <ArrowDown className="h-4 w-4 animate-bounce" />
                            </div>
                        </div>

                        {/* ============================================================== */}
                        {/* RIGHT COLUMN: 60% SMARTPHONE MOCKUP                            */}
                        {/* ============================================================== */}
                        <div className="lg:col-span-6">
                            <div className="relative mx-auto w-full max-w-[390px] rounded-[42px] border-[7px] border-slate-900 bg-slate-950 p-2 shadow-2xl ring-1 ring-slate-800/60">
                                {/* Dynamic Island / Top Notch */}
                                <div className="absolute left-1/2 top-3.5 z-30 flex h-4 w-28 -translate-x-1/2 items-center justify-center rounded-full bg-slate-900">
                                    <span className="mr-2 h-2 w-2 rounded-full bg-slate-950" />
                                    <span
                                        className={cn(
                                            "h-1.5 w-1.5 rounded-full transition-colors",
                                            isAuthenticated ? "bg-emerald-400" : "bg-slate-700"
                                        )}
                                    />
                                </div>

                                {/* Phone Screen Frame */}
                                <div className="relative flex min-h-[540px] flex-col overflow-hidden rounded-[32px] bg-slate-50 text-slate-900 shadow-inner">
                                    {/* Mobile Status Bar */}
                                    <div className="flex items-center justify-between px-5 pt-3 text-[11px] font-bold text-slate-700">
                                        <span>09:41</span>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Signal className="h-3 w-3" />
                                            <Wifi className="h-3 w-3" />
                                            <Battery className="h-3.5 w-3.5" />
                                        </div>
                                    </div>

                                    {/* Web App Top Navbar */}
                                    <div className="mt-2 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur">
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white">
                                                <Leaf className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="text-xs font-black tracking-tight text-slate-900">
                                                TriViet Trace
                                            </span>
                                        </div>

                                        {isAuthenticated ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 animate-in fade-in zoom-in-90 duration-300">
                                                <Check className="h-3 w-3 text-emerald-700" />
                                                Mã hợp lệ
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                Tra cứu số
                                            </span>
                                        )}
                                    </div>

                                    {/* SCREEN CONTENT BY STAGES */}
                                    <div className="flex flex-1 flex-col p-4">
                                        {/* STATE 1: INITIAL STANDBY / WAITING FOR QR */}
                                        {!isPastConnecting && (
                                            <div className="my-auto flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-300">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100/70 text-emerald-700 ring-1 ring-emerald-200">
                                                    <QrCode className="h-8 w-8" />
                                                </div>
                                                <h4 className="mt-4 text-sm font-black uppercase tracking-wider text-slate-800">
                                                    TRIVIET
                                                </h4>
                                                <p className="text-xs font-semibold text-emerald-700">
                                                    Truy xuất nguồn gốc
                                                </p>
                                                <p className="mt-3 text-xs text-slate-400">
                                                    Đang chờ nhận mã QR...
                                                </p>
                                            </div>
                                        )}

                                        {/* STATE 2: AUTHENTICATING QR */}
                                        {phase === "authenticating" && (
                                            <div className="my-auto flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-300">
                                                <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                                                <p className="mt-4 text-xs font-bold text-slate-700">
                                                    Đang xác thực mã truy xuất...
                                                </p>
                                                <p className="font-mono text-[11px] text-slate-400">
                                                    TV-DEMO-001
                                                </p>
                                            </div>
                                        )}

                                        {/* STATE 3+: PRODUCT CARD & VERTICAL TIMELINE */}
                                        {isPastConnecting && phase !== "authenticating" && (
                                            <div className="space-y-3.5 animate-in fade-in duration-400">
                                                {/* Product Header Card */}
                                                {showProduct && (
                                                    <div className="rounded-2xl border border-emerald-200/80 bg-white p-3.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <h4 className="text-sm font-black text-slate-900">
                                                                    Sầu riêng Ri6
                                                                </h4>
                                                                <p className="mt-0.5 font-mono text-[11px] font-bold text-emerald-700">
                                                                    Mã: TV-DEMO-001
                                                                </p>
                                                            </div>
                                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                                                                Chính hãng
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                                                            <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                                                            <span>Nguồn: Long Khánh, Đồng Nai</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Timeline Heading */}
                                                {showProduct && (
                                                    <div className="flex items-center justify-between pt-1">
                                                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                                            Hành trình sản phẩm
                                                        </p>
                                                        <span className="text-[10px] font-semibold text-emerald-700">
                                                            Mới nhất trước
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Vertical Animated Timeline */}
                                                <div className="relative pl-6 space-y-3 pb-2">
                                                    {/* Vertical Background Line */}
                                                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />

                                                    {/* Animated Drawing Line */}
                                                    <div
                                                        className="absolute left-[11px] top-2 w-0.5 bg-emerald-500 transition-all duration-500"
                                                        style={{ height: timelineLineHeight }}
                                                    />

                                                    {/* 1. Điểm phân phối */}
                                                    {showStep1 && (
                                                        <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <span className="absolute -left-[19px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-white">
                                                                <Store className="h-2.5 w-2.5" />
                                                            </span>
                                                            <div className="rounded-xl border border-emerald-100 bg-white p-2.5 shadow-2xs">
                                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">
                                                                    ĐÃ ĐƯA ĐẾN ĐIỂM PHÂN PHỐI
                                                                </span>
                                                                <p className="mt-0.5 text-xs font-bold text-slate-900">
                                                                    Chợ đầu mối Thủ Đức
                                                                </p>
                                                                <p className="text-[10px] text-slate-500">
                                                                    TP. Hồ Chí Minh
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 2. Chế biến */}
                                                    {showStep2 && (
                                                        <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <span className="absolute -left-[19px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-white">
                                                                <Factory className="h-2.5 w-2.5" />
                                                            </span>
                                                            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">
                                                                        CHẾ BIẾN
                                                                    </span>
                                                                    <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                                                                        QC: Đạt
                                                                    </span>
                                                                </div>
                                                                <p className="mt-0.5 text-xs font-bold text-slate-900">
                                                                    Cơ sở Chế biến Trị An
                                                                </p>
                                                                <p className="text-[10px] text-slate-500">
                                                                    Làm sạch · Tách múi · Đóng gói · Cấp đông
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 3. Vựa thu mua */}
                                                    {showStep3 && (
                                                        <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <span className="absolute -left-[19px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-white">
                                                                <Truck className="h-2.5 w-2.5" />
                                                            </span>
                                                            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">
                                                                        THU MUA
                                                                    </span>
                                                                    <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                                                                        QC: Đạt
                                                                    </span>
                                                                </div>
                                                                <p className="mt-0.5 text-xs font-bold text-slate-900">
                                                                    Vựa Sầu riêng Thành Phát
                                                                </p>
                                                                <p className="text-[10px] text-slate-500">
                                                                    Khối lượng tiếp nhận: 700 kg
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 4. Thu hoạch */}
                                                    {showStep4 && (
                                                        <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <span className="absolute -left-[19px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-white">
                                                                <Calendar className="h-2.5 w-2.5" />
                                                            </span>
                                                            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs">
                                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">
                                                                    THU HOẠCH
                                                                </span>
                                                                <p className="mt-0.5 text-xs font-bold text-slate-900">
                                                                    24/08/2026
                                                                </p>
                                                                <p className="font-mono text-[10px] text-slate-500">
                                                                    Lô: HL-DEMO-001
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 5. Vườn trồng */}
                                                    {showStep5 && (
                                                        <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <span className="absolute -left-[19px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-white">
                                                                <Sprout className="h-2.5 w-2.5" />
                                                            </span>
                                                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 shadow-2xs">
                                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                                                                    NGUỒN GỐC VƯỜN TRỒNG
                                                                </span>
                                                                <p className="mt-0.5 text-xs font-bold text-slate-900">
                                                                    Vườn sầu riêng Minh Phát
                                                                </p>
                                                                <p className="font-mono text-[10px] text-emerald-700">
                                                                    MSVT-DN-LK-001
                                                                </p>
                                                                <p className="text-[10px] text-slate-500">
                                                                    Long Khánh, Đồng Nai · Giống: Ri6
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile Home Bar */}
                                    <div className="mx-auto my-2 h-1 w-28 rounded-full bg-slate-300" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
