"use client";

import { useState } from "react";
import Link from "next/link";
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
    ArrowUp
} from "lucide-react";
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

    const active = trace.qrStatus === "ACTIVE";

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
        <main className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white px-4 py-6 text-slate-900 sm:py-10">
            <div className="mx-auto max-w-3xl space-y-6">
                {/* 1. HEADER: PRODUCT & QR BADGE */}
                <header className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-sm sm:p-8 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-700 text-white font-black text-xs shadow-xs">
                                TV
                            </span>
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                                TRUY XUẤT NGUỒN GỐC NÔNG SẢN
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border ${
                                    active
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : trace.qrStatus === "REVOKED"
                                        ? "bg-red-50 text-red-800 border-red-200"
                                        : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                            >
                                {active ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        MÃ TRUY XUẤT HỢP LỆ
                                    </>
                                ) : trace.qrStatus === "REVOKED" ? (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        MÃ ĐÃ THU HỒI
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        MÃ ĐANG TẠM KHÓA
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                            {trace.commercialLot.productName}
                        </h1>
                        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-medium">
                            Lô xuất bán / thương mại:{" "}
                            <b className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                {trace.commercialLot.lotCode}
                            </b>
                        </p>
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
                <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                    {/* Title & Direction Switch */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition self-start sm:self-auto"
                        >
                            <ArrowDownUp className="h-3.5 w-3.5 text-emerald-700" />
                            <span>{sortNewestFirst ? "Mới nhất trước" : "Cũ nhất trước"}</span>
                        </button>
                    </div>

                    {/* DÂY CHUYỀN LIÊN TỤC (CONTINUOUS CHAIN TRACK) */}
                    <div className="relative pl-7 sm:pl-9 space-y-8 border-l-2 border-emerald-600/80 ml-4 sm:ml-5 py-2">
                        {displayedMilestones.map((milestone, idx) => {
                            const isProcessing = milestone.type === "PROCESSING_PACKAGING";
                            const isLast = idx === displayedMilestones.length - 1;

                            return (
                                <div key={milestone.id} className="relative group">
                                    {/* Circular Node on the Chain */}
                                    <div
                                        className={`absolute -left-[43px] sm:-left-[51px] top-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full shadow-md ring-4 ${getNodeColorClass(
                                            milestone.type
                                        )} transition group-hover:scale-110`}
                                    >
                                        {getMilestoneIcon(milestone.type)}
                                    </div>

                                    {/* Milestone Content */}
                                    <div className="space-y-2">
                                        {/* Milestone Header Line: Title + Date */}
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                                                {milestone.title}
                                            </h3>
                                            <span className="font-mono text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                                                {milestone.dateText}
                                            </span>
                                        </div>

                                        {/* Milestone Fields List (Formatted concisely as requested) */}
                                        <div className="space-y-1.5 text-xs sm:text-sm pl-0.5">
                                            {milestone.fields.map((field, fIdx) => (
                                                <div key={fIdx} className="flex items-start gap-2">
                                                    <span className="text-slate-500 font-medium shrink-0 min-w-[120px] sm:min-w-[150px]">
                                                        {field.label}:
                                                    </span>
                                                    <span
                                                        className={`break-words ${
                                                            field.highlight
                                                                ? "font-black text-slate-900"
                                                                : "font-semibold text-slate-800"
                                                        }`}
                                                    >
                                                        {field.value}
                                                    </span>
                                                </div>
                                            ))}
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
                                                            : `Xem quy trình chế biến / đóng gói (${milestone.substeps.length} bước)`}
                                                    </span>
                                                    {expandedProcessing ? (
                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    )}
                                                </button>

                                                {expandedProcessing && (
                                                    <div className="mt-2.5 rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
                                                        <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2">
                                                            Quy trình kiểm soát chất lượng mẻ:
                                                        </p>
                                                        {milestone.substeps.map((step, sIdx) => (
                                                            <div
                                                                key={sIdx}
                                                                className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0"
                                                            >
                                                                <span className="font-medium text-slate-800">
                                                                    {step.name}
                                                                </span>
                                                                <span className="font-bold text-emerald-700 flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    {step.status}
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
                <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Sprout className="h-5 w-5" />
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
                                                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                    {farm.farmCode}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Vụ: <b>{farm.season}</b> · Giống: <b>{farm.variety}</b> ·{" "}
                                                <b>{farm.cultivationLogs.length}</b> hoạt động đã ghi nhận
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                                Đạt VietGAP
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                                {isExpanded ? "Thu gọn" : "Xem nhật ký"}
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                Lịch sử hoạt động canh tác tại vườn:
                                            </p>
                                            <div className="space-y-2">
                                                {farm.cultivationLogs.map((log, lIdx) => (
                                                    <div
                                                        key={lIdx}
                                                        className="grid grid-cols-[100px_1fr] gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                                                    >
                                                        <time className="font-mono font-semibold text-slate-500">
                                                            {new Date(log.actionDate).toLocaleDateString("vi-VN")}
                                                        </time>
                                                        <div>
                                                            <b className="text-slate-900">
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
                    <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-800 text-sm">
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
