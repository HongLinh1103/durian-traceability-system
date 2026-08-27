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
    Lock
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
                return <Sprout className="h-5 w-5 text-emerald-600" />;
            case "HARVEST":
                return <Scissors className="h-5 w-5 text-emerald-600" />;
            case "COLLECTOR_RECEIPT":
                return <Building2 className="h-5 w-5 text-blue-600" />;
            case "PROCESSING_RECEIPT":
                return <Factory className="h-5 w-5 text-blue-600" />;
            case "PROCESSING_PACKAGING":
                return <Snowflake className="h-5 w-5 text-purple-600" />;
            case "EXPORT":
                return <Ship className="h-5 w-5 text-indigo-600" />;
            case "DISTRIBUTION":
            default:
                return <Truck className="h-5 w-5 text-emerald-600" />;
        }
    };

    const getBadgeStyle = (variant: TraceMilestone["badgeVariant"]) => {
        switch (variant) {
            case "purple":
                return "bg-purple-100 text-purple-800 border-purple-200";
            case "blue":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "indigo":
                return "bg-indigo-100 text-indigo-800 border-indigo-200";
            case "amber":
                return "bg-amber-100 text-amber-800 border-amber-200";
            case "emerald":
            default:
                return "bg-emerald-100 text-emerald-800 border-emerald-200";
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white px-4 py-6 text-slate-900 sm:py-10">
            <div className="mx-auto max-w-4xl space-y-6">
                {/* 1. HEADER: PRODUCT & QR BADGE */}
                <header className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-sm sm:p-8 space-y-5">
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
                        <h1 className="text-2xl font-black text-slate-900 sm:text-4xl">
                            {trace.commercialLot.productName}
                        </h1>
                        <p className="mt-2 text-sm text-slate-500 font-medium">
                            Lô xuất bán / thương mại:{" "}
                            <b className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                {trace.commercialLot.lotCode}
                            </b>
                        </p>
                    </div>

                    {!active && (
                        <div
                            className={`rounded-2xl p-4 text-sm font-semibold flex items-center gap-3 border ${
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

                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4 text-xs">
                        <div className="space-y-1">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block">Mã định danh QR</span>
                            <span className="font-mono font-bold text-slate-800 block truncate">{trace.code}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block">Đơn vị phát hành</span>
                            <span className="font-bold text-slate-800 block truncate">{trace.issuer}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block">Khối lượng lô</span>
                            <span className="font-black text-emerald-800 block">
                                {trace.commercialLot.quantity.toLocaleString("vi-VN")} {trace.commercialLot.unit}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block">Điểm đến / Thị trường</span>
                            <span className="font-bold text-slate-800 block truncate">
                                {trace.destination?.country || trace.destination?.name || "Chưa xác định"}
                            </span>
                        </div>
                    </div>
                </header>

                {/* 2. TIMELINE: 4-5 CHÍNH MỐC THEO HÀNH TRÌNH THẬT */}
                <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-2xs">
                                <PackageCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                                    Hành Trình Sản Phẩm
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Minh bạch {trace.milestones.length} mốc chính từ nông trại đến người tiêu dùng
                                </p>
                            </div>
                        </div>

                        {/* Toggle Sort Order Button */}
                        <button
                            type="button"
                            onClick={() => setSortNewestFirst(!sortNewestFirst)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition self-start sm:self-auto"
                        >
                            <ArrowDownUp className="h-3.5 w-3.5 text-emerald-700" />
                            <span>{sortNewestFirst ? "Mới nhất trước (Đang xem)" : "Cũ nhất trước (Đang xem)"}</span>
                        </button>
                    </div>

                    {/* Milestone Cards List */}
                    <div className="relative space-y-6">
                        {displayedMilestones.map((milestone, idx) => {
                            const isProcessing = milestone.type === "PROCESSING_PACKAGING";

                            return (
                                <div
                                    key={milestone.id}
                                    className="relative rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 p-5 sm:p-6 shadow-2xs transition hover:shadow-md space-y-4"
                                >
                                    {/* Card Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">
                                                {getMilestoneIcon(milestone.type)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-400">
                                                        #{sortNewestFirst ? trace.milestones.length - idx : idx + 1}
                                                    </span>
                                                    <h3 className="text-base font-black uppercase text-slate-900 tracking-wide">
                                                        {milestone.title}
                                                    </h3>
                                                </div>
                                                {milestone.subtitle && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {milestone.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                {milestone.dateText}
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-black border ${getBadgeStyle(
                                                    milestone.badgeVariant
                                                )}`}
                                            >
                                                {milestone.badgeText}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Details Table */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        {milestone.fields.map((field, fIdx) => (
                                            <div key={fIdx} className="flex justify-between sm:justify-start gap-2 py-0.5">
                                                <span className="text-slate-500 font-medium w-40 shrink-0">
                                                    {field.label}:
                                                </span>
                                                <span
                                                    className={`break-words text-right sm:text-left ${
                                                        field.highlight
                                                            ? "font-black text-slate-900 text-[13px]"
                                                            : "font-bold text-slate-800"
                                                    }`}
                                                >
                                                    {field.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Optional Substeps for Processing */}
                                    {isProcessing && milestone.substeps && milestone.substeps.length > 0 && (
                                        <div className="pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedProcessing(!expandedProcessing)}
                                                className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition"
                                            >
                                                <span>
                                                    {expandedProcessing
                                                        ? "Thu gọn quy trình chi tiết"
                                                        : `Xem chi tiết quy trình chế biến & đóng gói (${milestone.substeps.length} bước)`}
                                                </span>
                                                {expandedProcessing ? (
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                ) : (
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                )}
                                            </button>

                                            {expandedProcessing && (
                                                <div className="mt-3 rounded-2xl bg-purple-50/50 p-4 border border-purple-100 space-y-2 text-xs">
                                                    <p className="font-bold text-purple-900 uppercase text-[11px] tracking-wider mb-2">
                                                        Quy trình kiểm soát chất lượng mẻ chế biến:
                                                    </p>
                                                    {milestone.substeps.map((step, sIdx) => (
                                                        <div
                                                            key={sIdx}
                                                            className="flex items-center justify-between py-1 border-b border-purple-100/60 last:border-0"
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
                            );
                        })}
                    </div>
                </section>

                {/* 3. QUÁ TRÌNH CANH TÁC TẠI VƯỜN (ACCORDION) */}
                <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-2xs">
                            <Sprout className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
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
                <footer className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 text-center text-xs text-slate-600 space-y-2">
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
