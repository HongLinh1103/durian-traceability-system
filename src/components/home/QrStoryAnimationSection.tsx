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
            width: 240,
            margin: 1,
            color: {
                dark: "#064e3b",
                light: "#ffffff",
            },
        }).then(setQrDataUrl);
    }, []);

    // IntersectionObserver to trigger animation only once per load
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

                    // Sequence orchestrator
                    setPhase("scanning");
                    const t1 = setTimeout(() => setPhase("connecting"), 750);
                    const t2 = setTimeout(() => setPhase("authenticating"), 1350);
                    const t3 = setTimeout(() => setPhase("authenticated"), 1800);
                    const t4 = setTimeout(() => setPhase("product"), 2100);
                    const t5 = setTimeout(() => setPhase("timeline_1"), 2400);
                    const t6 = setTimeout(() => setPhase("timeline_2"), 2700);
                    const t7 = setTimeout(() => setPhase("timeline_3"), 3000);
                    const t8 = setTimeout(() => setPhase("timeline_4"), 3300);
                    const t9 = setTimeout(() => setPhase("timeline_5"), 3600);
                    const t10 = setTimeout(() => setPhase("completed"), 3900);

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

    // Phase state helpers
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

    // Timeline progress line height calculation
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
                {/* COMPACT SECTION HEADER */}
                <div className="mx-auto mb-6 max-w-2xl text-center sm:mb-8">
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
                        Mỗi mã QR kết nối với lịch sử của lô hàng, giúp người dùng theo dõi nguồn nguyên liệu, thu hoạch, thu mua, chế biến và điểm phân phối.
                    </p>
                </div>

                {/* COMPACT ANIMATION CARD */}
                <div className="relative mx-auto rounded-[28px] border border-emerald-100/90 bg-gradient-to-b from-white via-emerald-50/20 to-slate-50 p-4 shadow-soft sm:rounded-[34px] sm:p-6 lg:p-7">
                    <div className="grid items-center gap-5 lg:grid-cols-12 lg:gap-6">
                        {/* ============================================================== */}
                        {/* LEFT COLUMN: 40% COMPACT QR ILLUSTRATION                       */}
                        {/* ============================================================== */}
                        <div className="flex flex-col items-center lg:col-span-5 lg:items-end">
                            <div className="relative w-full max-w-[220px] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-300 sm:max-w-[240px] sm:p-4">
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

                                {/* QR Image with Scanner Line */}
                                <div
                                    className={cn(
                                        "relative aspect-square w-full overflow-hidden rounded-xl border-2 bg-slate-50 p-2 transition-all duration-500",
                                        isScanning
                                            ? "border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.25)]"
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

                                    {/* Scanner Laser Beam */}
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
                        {/* MIDDLE: CONNECTING BRIDGE                                      */}
                        {/* ============================================================== */}
                        <div className="hidden lg:col-span-1 lg:flex lg:items-center lg:justify-center">
                            <div className="relative flex h-8 w-full items-center justify-center">
                                <div className="h-[2px] w-full bg-slate-200" />
                                {(isConnecting || isPastConnecting) && (
                                    <div
                                        className={cn(
                                            "absolute h-[3px] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_8px_#10b981] transition-all duration-500",
                                            isConnecting ? "left-0 w-full animate-pulse" : "left-0 w-full opacity-60"
                                        )}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Mobile connection arrow */}
                        <div className="flex items-center justify-center py-0.5 lg:hidden">
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-300",
                                    isConnecting || isPastConnecting
                                        ? "border-emerald-400 bg-emerald-500 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-400"
                                )}
                            >
                                <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
                            </div>
                        </div>

                        {/* ============================================================== */}
                        {/* RIGHT COLUMN: 60% COMPACT SMARTPHONE MOCKUP                    */}
                        {/* ============================================================== */}
                        <div className="lg:col-span-6">
                            <div className="relative mx-auto w-full max-w-[310px] rounded-[36px] border-[6px] border-slate-900 bg-slate-950 p-1.5 shadow-xl sm:max-w-[330px]">
                                {/* Dynamic Island */}
                                <div className="absolute left-1/2 top-3 z-30 flex h-3.5 w-24 -translate-x-1/2 items-center justify-center rounded-full bg-slate-900">
                                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-950" />
                                    <span
                                        className={cn(
                                            "h-1 w-1 rounded-full transition-colors",
                                            isAuthenticated ? "bg-emerald-400" : "bg-slate-700"
                                        )}
                                    />
                                </div>

                                {/* Phone Screen View */}
                                <div className="relative flex min-h-[410px] flex-col overflow-hidden rounded-[28px] bg-slate-50 text-slate-900">
                                    {/* Status Bar */}
                                    <div className="flex items-center justify-between px-4 pt-2.5 text-[10px] font-bold text-slate-700">
                                        <span>09:41</span>
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <Signal className="h-2.5 w-2.5" />
                                            <Wifi className="h-2.5 w-2.5" />
                                            <Battery className="h-3 w-3" />
                                        </div>
                                    </div>

                                    {/* App Header */}
                                    <div className="mt-1.5 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-3.5 py-2 backdrop-blur">
                                        <div className="flex items-center gap-1">
                                            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white">
                                                <Leaf className="h-3 w-3" />
                                            </div>
                                            <span className="text-[11px] font-black tracking-tight text-slate-900">
                                                TriViet Trace
                                            </span>
                                        </div>

                                        {isAuthenticated ? (
                                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                                                <Check className="h-2.5 w-2.5 text-emerald-700" />
                                                Mã hợp lệ
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-semibold text-slate-400">
                                                Tra cứu
                                            </span>
                                        )}
                                    </div>

                                    {/* Content Screen */}
                                    <div className="flex flex-1 flex-col p-3">
                                        {/* State 1: Standby */}
                                        {!isPastConnecting && (
                                            <div className="my-auto flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-700">
                                                    <QrCode className="h-6 w-6" />
                                                </div>
                                                <h4 className="mt-3 text-xs font-black uppercase tracking-wider text-slate-800">
                                                    TRIVIET
                                                </h4>
                                                <p className="text-[11px] font-semibold text-emerald-700">
                                                    Truy xuất nguồn gốc
                                                </p>
                                                <p className="mt-2 text-[10px] text-slate-400">
                                                    Đang chờ nhận mã QR...
                                                </p>
                                            </div>
                                        )}

                                        {/* State 2: Authenticating */}
                                        {phase === "authenticating" && (
                                            <div className="my-auto flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
                                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                                <p className="mt-3 text-[11px] font-bold text-slate-700">
                                                    Đang xác thực mã truy xuất...
                                                </p>
                                                <p className="font-mono text-[10px] text-slate-400">
                                                    TV-DEMO-001
                                                </p>
                                            </div>
                                        )}

                                        {/* State 3+: Product & Timeline */}
                                        {isPastConnecting && phase !== "authenticating" && (
                                            <div className="space-y-2.5 animate-in fade-in duration-300">
                                                {/* Product Header */}
                                                {showProduct && (
                                                    <div className="rounded-xl border border-emerald-200/70 bg-white p-2.5 shadow-2xs">
                                                        <div className="flex items-start justify-between gap-1.5">
                                                            <div>
                                                                <h4 className="text-xs font-black text-slate-900">
                                                                    Sầu riêng Ri6
                                                                </h4>
                                                                <p className="font-mono text-[10px] font-bold text-emerald-700">
                                                                    Mã: TV-DEMO-001
                                                                </p>
                                                            </div>
                                                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
                                                                Chính hãng
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                                                            <MapPin className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                                            <span>Long Khánh, Đồng Nai</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Timeline Heading */}
                                                {showProduct && (
                                                    <div className="flex items-center justify-between px-0.5">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                            Hành trình sản phẩm
                                                        </p>
                                                        <span className="text-[9px] font-semibold text-emerald-700">
                                                            Mới nhất trước
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Vertical Timeline */}
                                                <div className="relative pl-5 space-y-2 pb-1">
                                                    <div className="absolute left-[9px] top-1.5 bottom-1.5 w-0.5 bg-slate-200" />
                                                    <div
                                                        className="absolute left-[9px] top-1.5 w-0.5 bg-emerald-500 transition-all duration-400"
                                                        style={{ height: timelineLineHeight }}
                                                    />

                                                    {/* 1. Điểm phân phối */}
                                                    {showStep1 && (
                                                        <div className="relative animate-in fade-in duration-200">
                                                            <span className="absolute -left-[16px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Store className="h-2 w-2" />
                                                            </span>
                                                            <div className="rounded-lg border border-emerald-100 bg-white p-1.5 shadow-2xs">
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700">
                                                                    ĐÃ ĐƯA ĐẾN ĐIỂM PHÂN PHỐI
                                                                </span>
                                                                <p className="text-[10px] font-bold text-slate-900">
                                                                    Chợ đầu mối Thủ Đức
                                                                </p>
                                                                <p className="text-[9px] text-slate-500">
                                                                    TP. Hồ Chí Minh
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 2. Chế biến */}
                                                    {showStep2 && (
                                                        <div className="relative animate-in fade-in duration-200">
                                                            <span className="absolute -left-[16px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Factory className="h-2 w-2" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700">
                                                                        CHẾ BIẾN
                                                                    </span>
                                                                    <span className="rounded bg-emerald-50 px-1 py-0.2 text-[8px] font-bold text-emerald-700">
                                                                        QC: Đạt
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] font-bold text-slate-900">
                                                                    Cơ sở Chế biến Trị An
                                                                </p>
                                                                <p className="text-[9px] text-slate-500">
                                                                    Làm sạch · Tách múi · Cấp đông
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 3. Vựa thu mua */}
                                                    {showStep3 && (
                                                        <div className="relative animate-in fade-in duration-200">
                                                            <span className="absolute -left-[16px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Truck className="h-2 w-2" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700">
                                                                        THU MUA
                                                                    </span>
                                                                    <span className="rounded bg-emerald-50 px-1 py-0.2 text-[8px] font-bold text-emerald-700">
                                                                        QC: Đạt
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] font-bold text-slate-900">
                                                                    Vựa Sầu riêng Thành Phát
                                                                </p>
                                                                <p className="text-[9px] text-slate-500">
                                                                    Khối lượng: 700 kg
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 4. Thu hoạch */}
                                                    {showStep4 && (
                                                        <div className="relative animate-in fade-in duration-200">
                                                            <span className="absolute -left-[16px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Calendar className="h-2 w-2" />
                                                            </span>
                                                            <div className="rounded-lg border border-slate-100 bg-white p-1.5 shadow-2xs">
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700">
                                                                    THU HOẠCH
                                                                </span>
                                                                <p className="text-[10px] font-bold text-slate-900">
                                                                    24/08/2026
                                                                </p>
                                                                <p className="font-mono text-[9px] text-slate-500">
                                                                    Lô: HL-DEMO-001
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 5. Vườn trồng */}
                                                    {showStep5 && (
                                                        <div className="relative animate-in fade-in duration-200">
                                                            <span className="absolute -left-[16px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                                                                <Sprout className="h-2 w-2" />
                                                            </span>
                                                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-1.5 shadow-2xs">
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-800">
                                                                    NGUỒN GỐC VƯỜN TRỒNG
                                                                </span>
                                                                <p className="text-[10px] font-bold text-slate-900">
                                                                    Vườn sầu riêng Minh Phát
                                                                </p>
                                                                <p className="font-mono text-[9px] text-emerald-700">
                                                                    MSVT-DN-LK-001 · Giống: Ri6
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone Home Indicator */}
                                    <div className="mx-auto my-1.5 h-1 w-20 rounded-full bg-slate-300" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
