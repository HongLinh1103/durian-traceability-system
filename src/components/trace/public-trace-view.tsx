"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
    CheckCircle2,
    AlertTriangle,
    Sprout,
    Scissors,
    Building2,
    Factory,
    Snowflake,
    Truck,
    Ship,
    MapPin,
    PackageCheck,
    Calendar,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
    ArrowDownUp,
    ExternalLink,
    Lock,
    GitCommit,
    Layers,
    ArrowDown,
    ArrowUp,
    QrCode,
    Download,
    Printer,
    Copy,
    Check,
    Share2,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TraceMilestone } from "@/lib/traceability";

export type PublicTraceData = {
    qrStatus: string;
    code: string;
    publicToken: string;
    issuedAt: string | Date;
    commercialLot: {
        lotCode: string;
        productName: string;
        quantity: number;
        unit: string;
        status: string;
        buyerName?: string | null;
        dispatchedAt?: string | Date | null;
    };
    issuer: string;
    issuerType: string;
    destination: {
        name: string;
        type: string;
        address?: string | null;
        country?: string | null;
    } | null;
    currentStatus: string;
    processingSummary: {
        manufacturedAt: string | Date;
        productName: string;
    } | null;
    shipment: {
        code: string;
        status: string;
        dispatchAt: string | Date;
        receivedAt?: string | Date | null;
        exportInfo?: {
            destinationCountry: string;
            portOfLoading?: string | null;
            containerNumber?: string | null;
            sealNumber?: string | null;
        } | null;
    } | null;
    milestones: TraceMilestone[];
    farms: Array<{
        lotCode: string;
        farmName: string;
        farmCode: string;
        region: { code: string; name: string } | null;
        variety: string;
        harvestedAt: string | Date;
        contributedWeight: number;
        unit: string;
        complianceStatus: string;
        season: string;
        cultivationLogs: Array<{
            stage: string;
            activityType: string;
            actionDate: string | Date;
            notes?: string | null;
        }>;
    }>;
};

const activityLabels: Record<string, string> = {
    BASE_FERTILIZING: "Bón lót",
    PLANTING: "Trồng",
    MULCHING: "Tủ gốc",
    IRRIGATE: "Tưới nước",
    FERTILIZE: "Bón phân hữu cơ / NPK",
    FOLIAR_FERTILIZING: "Phun phân bón lá",
    WEEDING: "Làm cỏ",
    PRUNE: "Tỉa cành / tạo tán",
    SHOOT_MANAGEMENT: "Quản lý đọt",
    WATER_STRESS: "Xiết nước",
    FLOWER_INDUCTION: "Xử lý ra hoa",
    FLOWER_THINNING: "Tỉa bông",
    POLLINATION: "Thụ phấn bổ sung",
    FRUIT_THINNING: "Tỉa trái chọn lọc",
    PEST_INSPECTION: "Kiểm tra sâu bệnh định kỳ",
    TRACK_FRUIT: "Theo dõi phát triển trái",
    SPRAY_PESTICIDE: "Phun thuốc BVTV (GACC Compliant)",
    FRUIT_BAGGING: "Bao trái",
    BRANCH_SUPPORT: "Chống cành neo trái",
    HARVEST: "Thu hoạch đúng độ tuổi",
    FRUIT_GRADING: "Phân loại trái",
    GARDEN_SANITATION: "Vệ sinh vườn sau thu hoạch",
    OTHER: "Hoạt động canh tác khác",
};

export function PublicTraceView({ trace }: { trace: PublicTraceData }) {
    const [sortNewestFirst, setSortNewestFirst] = useState(true);
    const [expandedProcessing, setExpandedProcessing] = useState(false);
    const [expandedFarmIndex, setExpandedFarmIndex] = useState<number | null>(0);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [showQrCard, setShowQrCard] = useState(false);

    const active = trace.qrStatus === "ACTIVE";

    useEffect(() => {
        const fullUrl = typeof window !== "undefined"
            ? window.location.href
            : `https://triviet.vn/trace/${trace.publicToken}`;

        QRCode.toDataURL(fullUrl, {
            width: 512,
            margin: 2,
            color: {
                dark: "#064e3b",
                light: "#ffffff",
            },
            errorCorrectionLevel: "H",
        })
            .then((url) => setQrDataUrl(url))
            .catch((err) => console.error("Error generating QR:", err));
    }, [trace.publicToken]);

    const handleCopyUrl = async () => {
        try {
            const url = typeof window !== "undefined" ? window.location.href : `https://triviet.vn/trace/${trace.publicToken}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    const handleDownloadQr = () => {
        if (!qrDataUrl) return;
        const link = document.createElement("a");
        link.href = qrDataUrl;
        link.download = `QR_${trace.commercialLot.lotCode}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintQr = () => {
        const printWindow = window.open("", "_blank", "width=600,height=750");
        if (!printWindow) {
            alert("Vui lòng cho phép popup trình duyệt để in mã QR");
            return;
        }

        const issuedDateStr = trace.issuedAt
            ? new Date(trace.issuedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
            : new Date().toLocaleDateString("vi-VN");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>In Tem QR - ${trace.commercialLot.lotCode}</title>
                <style>
                    @page { size: A5 portrait; margin: 12mm; }
                    body {
                        font-family: Arial, sans-serif;
                        color: #1e293b;
                        background: #ffffff;
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .label-card {
                        width: 100%;
                        max-width: 440px;
                        border: 2px solid #064e3b;
                        border-radius: 16px;
                        padding: 24px;
                        text-align: center;
                        box-sizing: border-box;
                    }
                    .header-logo {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 6px;
                    }
                    .logo-box {
                        background: #064e3b;
                        color: #ffffff;
                        font-weight: 900;
                        font-size: 14px;
                        padding: 4px 8px;
                        border-radius: 6px;
                    }
                    .header-title {
                        font-size: 13px;
                        font-weight: 800;
                        color: #064e3b;
                        text-transform: uppercase;
                    }
                    .main-title {
                        font-size: 18px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 4px 0;
                        text-transform: uppercase;
                    }
                    .sub-title { font-size: 12px; color: #64748b; margin-bottom: 12px; }
                    .qr-container {
                        background: #fff;
                        border: 1.5px solid #cbd5e1;
                        border-radius: 14px;
                        padding: 12px;
                        display: inline-block;
                        margin-bottom: 12px;
                    }
                    .qr-image { width: 220px; height: 220px; display: block; }
                    .token-code {
                        font-family: monospace;
                        font-size: 12px;
                        font-weight: bold;
                        color: #064e3b;
                        background: #f0fdf4;
                        padding: 4px 10px;
                        border-radius: 6px;
                        display: inline-block;
                        margin-bottom: 14px;
                        border: 1px dashed #86efac;
                    }
                    .info-table {
                        width: 100%;
                        border-collapse: collapse;
                        text-align: left;
                        font-size: 12px;
                        margin-bottom: 14px;
                        border-top: 1px solid #e2e8f0;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .info-table td { padding: 6px 4px; }
                    .info-table td.label { color: #64748b; font-weight: 600; width: 40%; }
                    .info-table td.val { color: #0f172a; font-weight: 700; }
                    .footer-note { font-size: 11px; color: #064e3b; font-weight: 600; margin-top: 8px; }
                </style>
            </head>
            <body>
                <div class="label-card">
                    <div class="header-logo">
                        <span class="logo-box">TriViet</span>
                        <span class="header-title">Hệ Thống Truy Xuất Nguồn Gốc</span>
                    </div>
                    <div class="main-title">${trace.commercialLot.productName}</div>
                    <div class="sub-title">Mã lô: <b>${trace.commercialLot.lotCode}</b></div>
                    <div class="qr-container">
                        <img src="${qrDataUrl}" alt="Mã QR" class="qr-image" />
                    </div>
                    <div><span class="token-code">MÃ ĐỊNH DANH: ${trace.publicToken}</span></div>
                    <table class="info-table">
                        <tr><td class="label">Sản phẩm:</td><td class="val">${trace.commercialLot.productName}</td></tr>
                        <tr><td class="label">Mã lô hàng:</td><td class="val">${trace.commercialLot.lotCode}</td></tr>
                        <tr><td class="label">Khối lượng:</td><td class="val">${trace.commercialLot.quantity.toLocaleString("vi-VN")} ${trace.commercialLot.unit}</td></tr>
                        <tr><td class="label">Đơn vị phát hành:</td><td class="val">${trace.issuer}</td></tr>
                        <tr><td class="label">Ngày phát hành:</td><td class="val">${issuedDateStr}</td></tr>
                    </table>
                    <div class="footer-note">📱 Dùng camera điện thoại hoặc Zalo quét mã để xem toàn bộ nhật ký canh tác.</div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    };

    // Sorted milestones based on user toggle preference
    const displayedMilestones = sortNewestFirst
        ? [...trace.milestones].reverse()
        : [...trace.milestones];

    const getMilestoneIcon = (type: TraceMilestone["type"]) => {
        switch (type) {
            case "SEASON":
                return <Sprout className="h-4 w-4 text-white" />;
            case "HARVEST":
                return <Scissors className="h-4 w-4 text-white" />;
            case "COLLECTOR_RECEIPT":
                return <Building2 className="h-4 w-4 text-white" />;
            case "PROCESSING_RECEIPT":
                return <Factory className="h-4 w-4 text-white" />;
            case "PROCESSING_PACKAGING":
                return <Snowflake className="h-4 w-4 text-white" />;
            case "EXPORT":
                return <Ship className="h-4 w-4 text-white" />;
            case "DISTRIBUTION":
            default:
                return <Truck className="h-4 w-4 text-white" />;
        }
    };

    const getNodeColorClass = (type: TraceMilestone["type"]) => {
        switch (type) {
            case "EXPORT":
                return "bg-indigo-700 ring-indigo-100";
            case "PROCESSING_PACKAGING":
                return "bg-purple-700 ring-purple-100";
            case "COLLECTOR_RECEIPT":
            case "PROCESSING_RECEIPT":
                return "bg-blue-700 ring-blue-100";
            case "HARVEST":
                return "bg-emerald-700 ring-emerald-100";
            case "SEASON":
            default:
                return "bg-emerald-800 ring-emerald-100";
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white px-3 sm:px-4 py-4 sm:py-10 text-slate-900 overflow-x-hidden">
            <div className="mx-auto max-w-3xl space-y-6 min-w-0">
                {/* 1. HEADER: PRODUCT & QR BADGE */}
                <header className="rounded-3xl border border-emerald-200/80 bg-white p-5 shadow-sm sm:p-8 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-700 text-white font-black text-xs shadow-xs shrink-0">
                                TV
                            </span>
                            <span className="text-xs font-black uppercase tracking-[0.1em] text-emerald-800 whitespace-nowrap">
                                TRUY XUẤT NGUỒN GỐC
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border whitespace-nowrap shrink-0 ${
                                    active
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : trace.qrStatus === "REVOKED"
                                        ? "bg-red-50 text-red-800 border-red-200"
                                        : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                            >
                                {active ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span className="whitespace-nowrap">MÃ TRUY XUẤT HỢP LỆ</span>
                                    </>
                                ) : trace.qrStatus === "REVOKED" ? (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                                        <span className="whitespace-nowrap">MÃ ĐÃ THU HỒI</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                        <span className="whitespace-nowrap">MÃ ĐANG TẠM KHÓA</span>
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                            {trace.commercialLot.productName}
                        </h1>
                        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
                            <span className="whitespace-nowrap">Lô xuất bán / thương mại:</span>
                            <b className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 whitespace-nowrap shrink-0 inline-block">
                                {trace.commercialLot.lotCode}
                            </b>
                        </p>
                    </div>

                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 text-xs">
                        <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100 sm:bg-transparent sm:p-0 sm:border-0 min-w-0">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Mã định danh QR</span>
                            <span className="font-mono font-bold text-slate-800 block truncate" title={trace.code}>{trace.code}</span>
                        </div>
                        <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100 sm:bg-transparent sm:p-0 sm:border-0 min-w-0">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Đơn vị phát hành</span>
                            <span className="font-bold text-slate-800 block truncate" title={trace.issuer}>{trace.issuer}</span>
                        </div>
                        <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100 sm:bg-transparent sm:p-0 sm:border-0 min-w-0">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Khối lượng lô</span>
                            <span className="font-black text-emerald-800 block truncate">
                                {trace.commercialLot.quantity.toLocaleString("vi-VN")} {trace.commercialLot.unit}
                            </span>
                        </div>
                        <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100 sm:bg-transparent sm:p-0 sm:border-0 min-w-0">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Điểm đến / Thị trường</span>
                            <span className="font-bold text-slate-800 block truncate" title={trace.destination?.country || trace.destination?.name || trace.commercialLot.buyerName || ""}>
                                {trace.destination?.country && !["việt nam", "vietnam", "vn"].includes(trace.destination.country.toLowerCase())
                                    ? trace.destination.country
                                    : trace.destination?.name || trace.commercialLot.buyerName || "Chợ đầu mối Nông sản Thủ Đức"}
                            </span>
                        </div>
                    </div>

                    {/* QR Code Action Box */}
                    <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-slate-50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 w-full sm:w-auto">
                            {qrDataUrl ? (
                                <div className="rounded-2xl bg-white p-2 border border-emerald-200 shadow-xs shrink-0">
                                    <img
                                        src={qrDataUrl}
                                        alt={`QR - ${trace.commercialLot.lotCode}`}
                                        className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-lg shrink-0"
                                    />
                                </div>
                            ) : (
                                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-white text-emerald-700 border border-emerald-200 shrink-0">
                                    <QrCode className="h-10 w-10 text-emerald-600 shrink-0" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-800 tracking-wide whitespace-nowrap">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span className="whitespace-nowrap">Mã QR Định Danh</span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                    Quét bằng Camera hoặc Zalo để xác thực nguồn gốc sầu riêng.
                                </p>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap shrink-0 inline-block">
                                        Token: {trace.publicToken}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                onClick={handleDownloadQr}
                                disabled={!qrDataUrl}
                                size="sm"
                                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 px-2.5 sm:px-3.5 gap-1.5 shadow-xs whitespace-nowrap justify-center"
                            >
                                <Download className="h-3.5 w-3.5 shrink-0" />
                                <span className="whitespace-nowrap">Tải QR</span>
                            </Button>

                            <Button
                                type="button"
                                onClick={handlePrintQr}
                                disabled={!qrDataUrl}
                                size="sm"
                                className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs h-9 px-2.5 sm:px-3.5 gap-1.5 shadow-xs whitespace-nowrap justify-center"
                            >
                                <Printer className="h-3.5 w-3.5 shrink-0" />
                                <span className="whitespace-nowrap">In Tem</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCopyUrl}
                                size="sm"
                                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 px-2.5 sm:px-3.5 gap-1.5 whitespace-nowrap justify-center"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                                <span className="whitespace-nowrap">{copied ? "Đã chép" : "Sao chép"}</span>
                            </Button>
                        </div>
                    </div>

                    {!active && (
                        <div
                            className={`rounded-2xl p-4 text-xs font-semibold flex items-center gap-3 border ${
                                trace.qrStatus === "REVOKED"
                                    ? "bg-red-50 text-red-800 border-red-200"
                                    : "bg-amber-50 text-amber-900 border-amber-200"
                            }`}
                        >
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span>
                                {trace.qrStatus === "REVOKED"
                                    ? "Mã truy xuất đã bị thu hồi do sản phẩm không còn hiệu lực lưu hành."
                                    : "Mã truy xuất đang tạm khóa để đối soát kiểm định chất lượng."}
                            </span>
                        </div>
                    )}
                </header>

                {/* 2. DÂY CHUYỀN HÀNH TRÌNH SẢN PHẨM (PIPELINE SUPPLY CHAIN) */}
                <section className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-8 shadow-sm space-y-6 overflow-hidden">
                    {/* Title & Direction Switch */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide">
                                HÀNH TRÌNH SẢN PHẨM
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Dây chuyền truy xuất nguồn gốc liên tục từ vùng sản xuất đến điểm tiêu thụ
                            </p>
                        </div>

                        {/* Toggle Sort Order Button */}
                        <button
                            type="button"
                            onClick={() => setSortNewestFirst(!sortNewestFirst)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition self-start sm:self-auto shrink-0"
                        >
                            <ArrowDownUp className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <span>{sortNewestFirst ? "Mới nhất trước" : "Cũ nhất trước"}</span>
                        </button>
                    </div>

                    {/* DÂY CHUYỀN LIÊN TỤC (CONTINUOUS CHAIN TRACK) */}
                    <div className="max-w-4xl py-1 min-w-0">
                        {displayedMilestones.map((milestone, idx) => {
                            const isProcessing = milestone.type === "PROCESSING_PACKAGING";
                            const isLast = idx === displayedMilestones.length - 1;

                            return (
                                <div
                                    key={milestone.id}
                                    className={`group grid grid-cols-[2.75rem_minmax(0,1fr)] sm:grid-cols-[3.5rem_minmax(0,1fr)] min-w-0 ${
                                        isLast ? "" : "pb-7 sm:pb-9"
                                    }`}
                                >
                                    {/* Dedicated timeline column: the node never shares space with text. */}
                                    <div className="relative flex justify-center">
                                        {!isLast && (
                                            <span className="absolute left-1/2 top-9 bottom-0 w-0.5 -translate-x-1/2 bg-emerald-600/70" />
                                        )}
                                        <div
                                            className={`relative z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full shadow-md ring-4 ${getNodeColorClass(
                                                milestone.type
                                            )} transition group-hover:scale-105`}
                                        >
                                            {getMilestoneIcon(milestone.type)}
                                        </div>
                                    </div>

                                    {/* Milestone Content */}
                                    <div
                                        className={`min-w-0 pl-2 sm:pl-3 ${
                                            isLast ? "" : "border-b border-slate-200/80 pb-7 sm:pb-9"
                                        }`}
                                    >
                                        {/* Milestone Header Line: Title + Date */}
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 min-w-0">
                                            <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 break-words leading-tight">
                                                {milestone.title}
                                            </h3>
                                            <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap self-start shrink-0">
                                                {milestone.dateText}
                                            </span>
                                        </div>

                                        {/* Milestone Fields List */}
                                        <div className="mt-3 grid gap-2.5 text-xs sm:text-sm min-w-0">
                                            {milestone.fields.map((field, fIdx) => {
                                                const isQc = field.label.toUpperCase().includes("QC");
                                                return (
                                                    <div key={fIdx} className="grid gap-0.5 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-x-3 min-w-0">
                                                        <span className="text-slate-500 font-medium text-xs leading-5">
                                                            {field.label}
                                                        </span>
                                                        {isQc ? (
                                                            <span className="inline-flex w-fit items-start gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-800 border border-emerald-200 break-words max-w-full">
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                                                                <span className="break-words">{field.value}</span>
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={`break-words text-xs sm:text-sm min-w-0 ${
                                                                    field.highlight
                                                                        ? "font-black text-slate-900"
                                                                        : "font-semibold text-slate-800"
                                                                }`}
                                                            >
                                                                {field.value}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Expandable Substeps for Processing */}
                                        {isProcessing && milestone.substeps && milestone.substeps.length > 0 && (
                                            <div className="pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedProcessing(!expandedProcessing)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                                                >
                                                    <span>
                                                        {expandedProcessing
                                                            ? "Thu gọn quy trình"
                                                            : `Xem quy trình chế biến (${milestone.substeps.length} bước)`}
                                                    </span>
                                                    {expandedProcessing ? (
                                                        <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                                                    ) : (
                                                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                                    )}
                                                </button>

                                                {expandedProcessing && (
                                                    <div className="mt-2.5 rounded-2xl bg-slate-50 p-3 sm:p-4 border border-slate-200 space-y-2 text-xs overflow-hidden">
                                                        <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2">
                                                            Quy trình kiểm soát chất lượng mẻ:
                                                        </p>
                                                        {milestone.substeps.map((step, sIdx) => (
                                                            <div
                                                                key={sIdx}
                                                                className="flex flex-wrap items-center justify-between py-1.5 border-b border-slate-200/60 last:border-0 gap-2"
                                                            >
                                                                <span className="font-medium text-slate-800 break-words text-xs">
                                                                    {step.name}
                                                                </span>
                                                                <span className="font-bold text-emerald-700 flex items-center gap-1 whitespace-nowrap shrink-0 text-xs">
                                                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                                    <span>{step.status}</span>
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 3. QUÁ TRÌNH CANH TÁC TẠI VƯỜN (ACCORDION) */}
                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                            <Sprout className="h-5 w-5 shrink-0" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                                Quá Trình Canh Tác Nông Trại
                            </h2>
                            <p className="text-xs text-slate-500">
                                Nhật ký chăm sóc, bón phân, phòng trừ dịch hại theo tiêu chuẩn VietGAP & GACC
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {trace.farms.map((farm, farmIdx) => {
                            const isExpanded = expandedFarmIndex === farmIdx;

                            return (
                                <div
                                    key={farm.lotCode}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 transition shadow-2xs hover:border-emerald-300"
                                >
                                    <div
                                        onClick={() => setExpandedFarmIndex(isExpanded ? null : farmIdx)}
                                        className="cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-900 text-sm">
                                                    {farm.farmName}
                                                </h3>
                                                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 whitespace-nowrap shrink-0">
                                                    {farm.farmCode}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Vụ: <b className="whitespace-nowrap">{farm.season}</b> · Giống: <b className="whitespace-nowrap">{farm.variety}</b> ·{" "}
                                                <b className="whitespace-nowrap">{farm.cultivationLogs.length}</b> hoạt động đã ghi nhận
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 whitespace-nowrap shrink-0">
                                                Đạt VietGAP
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 whitespace-nowrap shrink-0">
                                                <span className="whitespace-nowrap">{isExpanded ? "Thu gọn" : "Xem nhật ký"}</span>
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4 shrink-0" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 shrink-0" />
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 whitespace-nowrap">
                                                Lịch sử hoạt động canh tác tại vườn:
                                            </p>
                                            <div className="space-y-2">
                                                {farm.cultivationLogs.map((log, lIdx) => (
                                                    <div
                                                        key={lIdx}
                                                        className="grid grid-cols-[85px_1fr] sm:grid-cols-[100px_1fr] gap-2.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                                                    >
                                                        <time className="font-mono font-semibold text-slate-500 whitespace-nowrap shrink-0">
                                                            {new Date(log.actionDate).toLocaleDateString("vi-VN")}
                                                        </time>
                                                        <div>
                                                            <b className="text-slate-900 block">
                                                                {activityLabels[log.activityType] || "Hoạt động canh tác"}
                                                            </b>
                                                            {log.notes && (
                                                                <p className="text-slate-600 mt-0.5 font-medium">
                                                                    {log.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {!farm.cultivationLogs.length && (
                                                    <p className="text-xs text-slate-400 py-3 text-center">
                                                        Chưa có nhật ký canh tác công khai.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 4. CAM KẾT BẢO MẬT & MINH BẠCH */}
                <footer className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 text-center text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-800 text-sm whitespace-nowrap">
                        <Lock className="h-4 w-4 text-emerald-700" />
                        <span>Chính Sách Bảo Mật & Minh Bạch Chuỗi Cung Ứng TriViet</span>
                    </div>
                    <p className="max-w-2xl mx-auto leading-relaxed text-slate-500 text-[11px]">
                        Hệ thống TriViet cam kết bảo mật thông tin định danh cá nhân của người nông dân (không công khai số điện thoại, CCCD, địa chỉ nhà riêng). Mọi dữ liệu về nguồn gốc vùng trồng, quy trình canh tác, chứng nhận kiểm định QC và xuất khẩu đều được xác thực theo chuẩn mã QR chống giả.
                    </p>
                </footer>
            </div>
        </main>
    );
}
